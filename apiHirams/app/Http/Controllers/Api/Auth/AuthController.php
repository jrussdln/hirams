<?php

namespace App\Http\Controllers\Api\Auth;


use App\Services\Notifications\MailService;
use App\Http\Controllers\Api\ApiController;
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
            return response()->json(['success' => false, 'message' => 'password_error'], 401);
        }

        $user->tokens()->delete();
        $token = $user->createToken('auth_token')->plainTextToken;

        $user->update([
            'bIsActive'  => 0,
            'dtLoggedIn' => now(),
        ]);
        broadcast(new UserUpdated('status_changed', $user->nUserId))->toOthers();
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
            $user->tokens()->delete();
            $user->update([
                'bIsActive'  => 1,
                'dtLoggedIn' => now(),
            ]);
            broadcast(new UserUpdated('status_changed', $user->nUserId))->toOthers();
        }

        return response()->json(['success' => true, 'message' => 'Logged out successfully']);
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
