<?php

namespace App\Http\Controllers\Api\Auth;


use App\Services\Notifications\MailService;
use App\Events\NotificationUpdated;
use App\Http\Controllers\Api\ApiController;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Database\QueryException;
use Exception;
use App\Events\UserUpdated;

class AuthController extends ApiController
{
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'strUserName' => ['required', 'string', 'max:255'],
            'strPassword' => ['required', 'string', 'min:6'],
        ], [
            'strUserName.required' => 'Username is required',
            'strPassword.required' => 'Password is required',
            'strPassword.min'      => 'Password must be at least 6 characters',
        ]);

        $user = User::whereRaw('BINARY strUserName = ?', [$validated['strUserName']])
            ->where('cStatus', 'A')
            ->first();

        if (!$user) {
            return response()->json(['success' => false, 'message' => 'username_error'], 404);
        }

        if (!Hash::check($validated['strPassword'], $user->strPassword)) {
            self::record([
                'nUserId'           => $user->nUserId,
                'strTitle'          => 'Failed sign-in attempt',
                'strNotification'   => 'There was a failed sign-in attempt on your account from '
                    . self::deviceLabel($request) . '.',
                'cNotificationType' => 'S', // Security
                'cCategory'         => 'A', // auth
                'strData'           => self::deviceData($request),
                'dtNotifiedAt'      => now(),
            ]);

            return response()->json(['success' => false, 'message' => 'password_error'], 401);
        }

        // Multi-device sessions: a new login mints a NEW token and must
        // NOT revoke the tokens of other devices that are still signed
        // in. (Password reset + account deactivation still revoke all.)
        $token = $user->createToken(self::deviceLabel($request))->plainTextToken;

        $user->update([
            'bIsActive'  => 0,
            'dtLoggedIn' => now(),
            'dtLastSeen' => now(), // first heartbeat — the prune command reads this
        ]);
        broadcast(new UserUpdated('status_changed', $user->nUserId))->toOthers();

        self::record([
            'nUserId'           => $user->nUserId,
            'strTitle'          => 'Successful login',
            // Timestamp is NOT embedded here — tblnotifications.dtNotifiedAt
            // carries it and the feed UI renders the full date on the row.
            'strNotification'   => 'Successful login from '
                . self::locationLabel($request)
                . ' (' . $request->ip() . ') using '
                . Str::limit((string) $request->userAgent(), 250),
            'cNotificationType' => 'I', // Info
            'cCategory'         => 'A', // auth
            'strData'           => self::deviceData($request),
            'dtNotifiedAt'      => now(),
        ]);

        return response()->json([
            'success' => true,
            'user'    => $user,
            'token'   => $token,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nUserId' => ['required', 'integer'],
        ]);

        $user = User::find($validated['nUserId']);
        if ($user) {
            // Revoke only the token of the device sending this logout —
            // sessions on other devices must keep working.
            $request->user()?->currentAccessToken()?->delete();
            $user->update([
                'bIsActive'  => 1,
                'dtLoggedIn' => now(),
            ]);
            broadcast(new UserUpdated('status_changed', $user->nUserId))->toOthers();

            self::record([
                'nUserId'           => $user->nUserId,
                'strTitle'          => 'Signed out',
                'strNotification'   => 'You signed out of your account from '
                    . self::deviceLabel($request) . '.',
                'cNotificationType' => 'I', // Info
                'cCategory'         => 'A', // auth
                'strData'           => self::deviceData($request),
                'dtNotifiedAt'      => now(),
            ]);
        }

        return response()->json(['success' => true, 'message' => 'Logged out successfully']);
    }

    // ── Presence (heartbeat) ─────────────────────────────────────────────────
    /**
     * POST /auth/heartbeat — the browser pings this every 30s while the
     * session is alive. dtLastSeen is what lets the prune command tell
     * "app still open" (ping seconds ago) apart from "browser vanished"
     * (nothing for minutes). The write is throttled to once per 20s so
     * several open tabs don't stamp the row 20 times a minute.
     *
     * A user the prune command already flipped offline comes back
     * online here — with one broadcast so lists live-update.
     */
    public function heartbeat(Request $request): JsonResponse
    {
        $user = $request->user();

        $staleStamp = !$user->dtLastSeen
            || $user->dtLastSeen->diffInSeconds(now()) >= 20;

        if ($staleStamp) {
            $wasOffline = (int) $user->bIsActive !== 0;

            $user->update([
                'dtLastSeen' => now(),
                'bIsActive'  => 0,
            ]);

            if ($wasOffline) {
                broadcast(new UserUpdated('status_changed', $user->nUserId));
            }
        }

        return response()->json(['success' => true]);
    }

    /**
     * POST /auth/offline — the "goodbye ping". Fired with a keepalive
     * fetch on pagehide, it flips the user offline the instant the tab
     * closes instead of waiting for the prune command. Harmless when the
     * browser was reloaded: the next heartbeat returns them right away.
     */
    public function goOffline(Request $request): JsonResponse
    {
        $user = $request->user();

        if ((int) $user->bIsActive !== 1) {
            $user->update(['bIsActive' => 1]);
            broadcast(new UserUpdated('status_changed', $user->nUserId));
        }

        return response()->json(['success' => true]);
    }

    // ── Auth notifications ───────────────────────────────────────────────────
    /**
     * The place the sign-in came from, shown in the login notification —
     * "Successful login from Unknown (180.191.80.219) using …".
     *
     * No IP-to-location service is wired up yet, so every login reads
     * "Unknown" until one is added; real IP + user agent still identify
     * the session in strData and the message itself.
     */
    private static function locationLabel(Request $request): string
    {
        return 'Unknown';
    }

    /**
     * A human-readable device label from the user agent —
     * "Chrome on Windows". Used directly in the notification text.
     */
    private static function deviceLabel(Request $request): string
    {
        $ua = (string) $request->userAgent();

        $browser = match (true) {
            str_contains($ua, 'Edg/') || str_contains($ua, 'Edge') => 'Edge',
            str_contains($ua, 'OPR/') || str_contains($ua, 'Opera') => 'Opera',
            str_contains($ua, 'Chrome') => 'Chrome',
            str_contains($ua, 'Firefox') => 'Firefox',
            str_contains($ua, 'Safari') => 'Safari',
            default => 'Browser',
        };

        $os = match (true) {
            str_contains($ua, 'Windows') => 'Windows',
            str_contains($ua, 'Android') => 'Android',
            str_contains($ua, 'iPhone') || str_contains($ua, 'iPad') => 'iOS',
            str_contains($ua, 'Mac OS X') || str_contains($ua, 'Macintosh') => 'macOS',
            str_contains($ua, 'Linux') => 'Linux',
            default => 'an unknown device',
        };

        return $os === 'an unknown device' ? $os : "{$browser} on {$os}";
    }

    /**
     * The flexible device fingerprint stored beside every auth event.
     * Kept short so it always fits the longtext column even when a
     * browser sends an unusually long UA string.
     */
    private static function deviceData(Request $request): array
    {
        return [
            'ip'     => $request->ip(),
            'device' => Str::limit((string) $request->userAgent(), 250),
            'label'  => self::deviceLabel($request),
        ];
    }

    /**
     * Best-effort notification insert — an auth event already happened,
     * so a failed write (or a dead broadcaster) must never break the
     * response. Failures land in the log via report(). The row is
     * broadcast so every other signed-in device updates its badge live.
     */
    private static function record(array $attributes): void
    {
        try {
            $notification = Notification::create($attributes);
            broadcast(new NotificationUpdated(
                'created',
                $notification->nUserId,
                $notification->toArray(),
            ));
        } catch (Exception $e) {
            report($e);
        }
    }

    public function verifyPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'strPassword' => 'required|string',
        ]);

        $user = $request->user();

        if (!$user || !Hash::check($validated['strPassword'], $user->strPassword)) {
            return response()->json([
                'success' => false,
                'message' => 'Incorrect password.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Password verified.',
        ]);
    }

    public function checkUsername(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'strUserName' => 'required|string|max:50',
        ]);

        $exists = User::whereRaw('BINARY strUserName = ?', [$validated['strUserName']])
            ->where('cStatus', 'A')
            ->exists();

        return response()->json(['exists' => $exists]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'strUserName' => 'required|string|max:50',
            'strEmail'    => 'required|email|max:100',
        ]);

        $user = User::whereRaw('BINARY strUserName = ?', [$validated['strUserName']])
            ->where('strEmail', $validated['strEmail'])
            ->where('cStatus', 'A')
            ->first();

        if (!$user) {
            return response()->json([
                'message' => 'This email is not registered to the provided username.',
            ], 404);
        }

        $token = Str::random(64);
        cache()->put("password_reset_{$token}", $user->nUserId, now()->addMinutes(60));

        $resetUrl = config('app.frontend_url')
            . '/reset-password?token=' . $token
            . '&username=' . urlencode($user->strUserName);

        $sent = app(MailService::class)->forgotPassword($user, $resetUrl);

        if (!$sent) {
            return response()->json([
                'message' => 'Failed to send reset email. Please try again.',
            ], 500);
        }

        return response()->json([
            'message' => 'Password reset link sent to your email.',
        ]);
    }

    public function validateResetToken(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => 'required|string',
        ]);

        $userId = cache()->get("password_reset_{$validated['token']}");

        if (!$userId) {
            return response()->json(['valid' => false, 'message' => 'Token is invalid or expired.'], 400);
        }

        return response()->json(['valid' => true]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token'        => 'required|string',
            'strPassword'  => 'required|string|min:6|confirmed',
        ]);

        $userId = cache()->get("password_reset_{$validated['token']}");

        if (!$userId) {
            return response()->json(['message' => 'This reset link is invalid or has expired.'], 400);
        }

        $user = User::find($userId);
        if (!$user) {
            return response()->json(['message' => 'User not found.'], 404);
        }

        $user->update(['strPassword' => Hash::make($validated['strPassword'])]);
        $user->tokens()->delete();
        cache()->forget("password_reset_{$validated['token']}");

        return response()->json(['message' => 'Password has been reset successfully.']);
    }

    // ── Register ──────────────────────────────────────────────────────────────
    /**
     * Self-registration used by the public register page.
     *
     * The `users` resource lives behind auth:sanctum, so a guest cannot create
     * an account through it — this endpoint verifies the emailed OTP and
     * creates the user in one call. The account is created For Approval (P);
     * an admin activates it from the user list.
     *
     * POST /auth/register
     * Body: { strFName, strMName, strLName, strNickName, cSex, strPhoneNo,
     *         strEmail, strUserName, strPassword, otp }
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'strFName'    => 'required|string|max:50',
            'strMName'    => 'nullable|string|max:50',
            'strLName'    => 'required|string|max:50',
            'strNickName' => 'nullable|string|max:20',
            'cSex'        => 'required|string|in:M,F',
            // tblusers columns are strPhoneNo varchar(20) / strEmail varchar(50)
            'strPhoneNo'  => 'nullable|string|max:20',
            'strEmail'    => 'required|email|max:50',
            'strUserName' => 'required|string|max:50',
            'strPassword' => 'required|string|min:6',
            'otp'         => 'required|string|size:6',
        ], [
            'strFName.required'    => 'First name is required.',
            'strLName.required'    => 'Last name is required.',
            'cSex.required'        => 'Please select your sex.',
            'cSex.in'              => 'Please select your sex.',
            'strEmail.required'    => 'Email address is required.',
            'strEmail.email'       => 'Please enter a valid email address.',
            'strUserName.required' => 'Username is required.',
            'strPassword.required' => 'Password is required.',
            'strPassword.min'      => 'Password must be at least 6 characters.',
            'otp.required'         => 'Verification code is required.',
            'otp.size'             => 'Verification code must be 6 digits.',
        ]);

        $email     = $validated['strEmail'];
        $cacheKey  = "reg_otp_{$email}";
        $storedOtp = cache()->get($cacheKey);

        if (!$storedOtp) {
            return response()->json([
                'message' => 'OTP has expired. Please request a new one.',
            ], 422);
        }

        if ($storedOtp !== $validated['otp']) {
            return response()->json([
                'message' => 'Invalid OTP. Please try again.',
            ], 422);
        }

        // Duplicate checks run before the OTP is consumed so a retry with the
        // same code still works after fixing the details.
        if (User::whereRaw('BINARY strUserName = ?', [$validated['strUserName']])->exists()) {
            return response()->json(['message' => 'This username already exists.'], 409);
        }

        if (User::where('strEmail', $email)->exists()) {
            return response()->json(['message' => 'This email already exists.'], 409);
        }

        // Consume OTP so it cannot be reused.
        cache()->forget($cacheKey);

        try {
            $user = User::create([
                'strFName'    => $validated['strFName'],
                'strMName'    => $validated['strMName'] ?? '',
                'strLName'    => $validated['strLName'],
                'strNickName' => $validated['strNickName'] ?? '',
                'cSex'        => $validated['cSex'],
                'strPhoneNo'  => $validated['strPhoneNo'] ?? '',
                'strEmail'    => $email,
                'strUserName' => $validated['strUserName'],
                'strPassword' => Hash::make($validated['strPassword']),
                'cUserType'   => 'V',
                'cStatus'     => 'P', // status_user: For Approval
            ]);
        } catch (QueryException $e) {
            return response()->json(['message' => 'This username or email already exists.'], 409);
        }

        // Broadcasting is best-effort — a Pusher hiccup must not fail a
        // registration whose row was already written.
        try {
            broadcast(new UserUpdated('created', $user->nUserId))->toOthers();
        } catch (Exception $e) {
            report($e);
        }

        return response()->json([
            'message' => __('messages.create_success', ['name' => 'User']),
            'user'    => $user,
        ], 201);
    }

    // ── OTP: Send ─────────────────────────────────────────────────────────────
    /**
     * Generate a 6-digit OTP, store it in cache keyed by email,
     * and send it via email. Called during registration step 2 → 3.
     *
     * POST /auth/send-otp
     * Body: { strEmail, strUserName }
     */
    public function sendOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'strEmail'    => 'required|email|max:100',
            'strUserName' => 'nullable|string|max:50',
        ]);

        $email = $validated['strEmail'];

        // Generate a cryptographically random 6-digit OTP
        $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        // Store OTP in cache for 10 minutes, keyed by email
        // Format: "reg_otp_{email}" → otp string
        cache()->put("reg_otp_{$email}", $otp, now()->addMinutes(10));

        $sent = app(MailService::class)->sendOtp($email, $otp);

        if (!$sent) {
            return response()->json([
                'message' => 'Failed to send OTP. Please try again.',
            ], 500);
        }

        return response()->json([
            'message' => 'OTP sent successfully.',
        ]);
    }

    // ── OTP: Verify ───────────────────────────────────────────────────────────
    /**
     * Validate the OTP submitted by the user against the cached value.
     *
     * POST /auth/verify-otp
     * Body: { strEmail, otp }
     */
    public function verifyOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'strEmail' => 'required|email|max:100',
            'otp'      => 'required|string|size:6',
        ]);

        $email      = $validated['strEmail'];
        $cacheKey   = "reg_otp_{$email}";
        $storedOtp  = cache()->get($cacheKey);

        if (!$storedOtp) {
            return response()->json([
                'valid'   => false,
                'message' => 'OTP has expired. Please request a new one.',
            ], 422);
        }

        if ($storedOtp !== $validated['otp']) {
            return response()->json([
                'valid'   => false,
                'message' => 'Invalid OTP. Please try again.',
            ], 422);
        }

        // Consume OTP so it cannot be reused
        cache()->forget($cacheKey);

        return response()->json([
            'valid'   => true,
            'message' => 'OTP verified successfully.',
        ]);
    }
}
