<?php

namespace App\Http\Controllers\Api\Auth;

use App\Events\UserUpdated;
use App\Http\Controllers\Api\ApiController;
use App\Models\User;
use App\Services\Notifications\AuthNotificationService;
use App\Services\Auth\PasswordResetService;
use App\Services\Auth\RegistrationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

/**
 * Thin HTTP layer for the auth endpoints: it validates the request
 * shape, delegates the work to the auth services, and maps the result
 * to a response. All real behaviour lives in app/Services/Auth:
 *
 * - AuthNotificationService — tblnotifications rows for every auth
 *   event (login / failed attempt / sign-out / reset link) plus the
 *   device fingerprint phrasing and the 3-failures streak.
 * - PasswordResetService    — reset tokens in cache, the reset mail and
 *   the password write.
 * - RegistrationService     — the OTP flow and account creation.
 */
class AuthController extends ApiController
{
    public function __construct(
        private readonly AuthNotificationService $notifications,
        private readonly PasswordResetService $passwordReset,
        private readonly RegistrationService $registration,
    ) {}

    /**
     * POST /auth/login
     * Body: { strUserName, strPassword }
     */
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
            // Records the per-attempt row, counts the consecutive-failure
            // streak (alerting once every 3), and never throws.
            $this->notifications->recordFailedAttempt($user, $request);

            return response()->json(['success' => false, 'message' => 'password_error'], 401);
        }

        // Multi-device sessions: a new login mints a NEW token and must
        // NOT revoke the tokens of other devices that are still signed
        // in. (Password reset + account deactivation still revoke all.)
        $token = $user->createToken($this->notifications->deviceLabel($request))->plainTextToken;

        $user->update([
            'bIsActive'  => 0,
            'dtLoggedIn' => now(),
            'dtLastSeen' => now(), // first heartbeat — the prune command reads this
        ]);
        broadcast(new UserUpdated('status_changed', $user->nUserId))->toOthers();

        // Posts the "Successful login" row and clears the failure streak.
        $this->notifications->recordSuccessfulLogin($user, $request);

        return response()->json([
            'success' => true,
            'user'    => $user,
            'token'   => $token,
        ]);
    }

    /**
     * POST /auth/logout
     * Body: { nUserId }
     */
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

            $this->notifications->recordSignedOut($user, $request);
        }

        return response()->json(['success' => true, 'message' => 'Logged out successfully']);
    }

    // ── Force sign-out ───────────────────────────────────────────────────────
    /**
     * POST /auth/logout-all — management only.
     *
     * Revokes the Sanctum token of every user currently marked online
     * (bIsActive = 0), flips them offline and broadcasts status_changed so
     * the user lists live-update. The caller's own session is kept — the
     * management user pressing the button is not kicked.
     *
     * Returns the number of sessions that were ended.
     */
    public function logoutAll(Request $request): JsonResponse
    {
        // The same two user types the client gates this on: the first two
        // keys of config('mappings.user_types') (e.g. Management, General Manager).
        $types = array_keys(config('mappings.user_types', []));
        $managementTypes = array_slice($types, 0, 2);
        $callerType = (string) ($request->user()->cUserType ?? '');
        if (!in_array($callerType, $managementTypes, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Only management can log out all online users.',
            ], 403);
        }

        $online = User::where('bIsActive', 0)
            ->where('nUserId', '!=', $request->user()->nUserId)
            ->get();

        $by = $request->user();
        foreach ($online as $user) {
            // A Sanctum token stands on its own, so removing it is what
            // actually ends the session — the client is kicked to the
            // login page on its next API call (401).
            $user->tokens()->delete();
            $user->update([
                'bIsActive'  => 1,
                'dtLoggedIn' => now(),
            ]);
            // They find out why they were suddenly signed out — the row is
            // in their feed, waiting for them at the next sign-in.
            $this->notifications->recordForceLogout($user, $by, $request);
            broadcast(new UserUpdated('status_changed', $user->nUserId))->toOthers();
        }

        return response()->json([
            'success' => true,
            'count'   => $online->count(),
        ]);
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

    // ── Checks ───────────────────────────────────────────────────────────────
    /**
     * POST /auth/verify-password — re-entry confirmation for sensitive
     * actions (used by the settings Account tab).
     * Body: { strPassword }
     */
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

    /**
     * POST /auth/check-username — availability check for the register form.
     * Body: { strUserName }
     */
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

    // ── Password reset ───────────────────────────────────────────────────────
    /**
     * POST /auth/forgot-password — email a reset link.
     * Body: { strUserName, strEmail }
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'strUserName' => 'required|string|max:50',
            'strEmail'    => 'required|email|max:100',
        ]);

        $result = $this->passwordReset->forgotPassword(
            $validated['strUserName'],
            $validated['strEmail'],
        );

        return response()->json(['message' => $result['message']], $result['status']);
    }

    /**
     * POST /auth/validate-reset-token — page-load check for reset-password.
     * Body: { token }
     */
    public function validateResetToken(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => 'required|string',
        ]);

        if (!$this->passwordReset->validateResetToken($validated['token'])) {
            return response()->json(['valid' => false, 'message' => 'Token is invalid or expired.'], 400);
        }

        return response()->json(['valid' => true]);
    }

    /**
     * POST /auth/reset-password — consume the token and set the password.
     * Body: { token, strPassword, strPassword_confirmation }
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token'        => 'required|string',
            'strPassword'  => 'required|string|min:6|confirmed',
        ]);

        $result = $this->passwordReset->resetPassword(
            $validated['token'],
            $validated['strPassword'],
        );

        return response()->json(['message' => $result['message']], $result['status']);
    }

    // ── Register ─────────────────────────────────────────────────────────────
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

        $result = $this->registration->register($validated);

        if (!$result['ok']) {
            return response()->json(['message' => $result['message']], $result['status']);
        }

        return response()->json([
            'message' => $result['message'],
            'user'    => $result['user'],
        ], $result['status']);
    }

    // ── OTP: Send ─────────────────────────────────────────────────────────────
    /**
     * Email a 6-digit OTP. Called during registration step 2 → 3.
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

        $result = $this->registration->sendOtp($validated['strEmail']);

        return response()->json(['message' => $result['message']], $result['status']);
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

        $result = $this->registration->verifyOtp($validated['strEmail'], $validated['otp']);

        return response()->json([
            'valid'   => $result['valid'],
            'message' => $result['message'],
        ], $result['status']);
    }
}
