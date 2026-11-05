<?php

namespace App\Services\Auth;

use App\Models\User;
use App\Services\Notifications\AuthNotificationService;
use App\Services\Notifications\MailService;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * The password-reset flow: token minting/verification in cache, the
 * reset mail, the password write itself, and the "link sent"
 * notification. Validation of the request shape stays in the controller
 * — this service receives clean arguments and decides the outcome.
 */
class PasswordResetService
{
    /** Reset tokens expire after an hour of the email being sent. */
    private const TOKEN_TTL_MINUTES = 60;

    public function __construct(
        private readonly MailService $mail,
        private readonly AuthNotificationService $notifications,
    ) {}

    /**
     * Mint a reset token, email its signed link, and note it in the feed.
     *
     * @return array{ok: bool, status: int, message: string}
     */
    public function forgotPassword(string $username, string $email): array
    {
        $user = User::whereRaw('BINARY strUserName = ?', [$username])
            ->where('strEmail', $email)
            ->where('cStatus', 'A')
            ->first();

        if (!$user) {
            return [
                'ok' => false,
                'status' => 404,
                'message' => 'This email is not registered to the provided username.',
            ];
        }

        $token = Str::random(64);
        cache()->put(
            "password_reset_{$token}",
            $user->nUserId,
            now()->addMinutes(self::TOKEN_TTL_MINUTES),
        );

        $resetUrl = config('app.frontend_url')
            . '/reset-password?token=' . $token
            . '&username=' . urlencode($user->strUserName);

        if (!$this->mail->forgotPassword($user, $resetUrl)) {
            return [
                'ok' => false,
                'status' => 500,
                'message' => 'Failed to send reset email. Please try again.',
            ];
        }

        $this->notifications->recordResetLinkSent($user);

        return [
            'ok' => true,
            'status' => 200,
            'message' => 'Password reset link sent to your email.',
        ];
    }

    /** A reset token is valid while it still lives in cache. */
    public function validateResetToken(string $token): bool
    {
        return (bool) cache()->get("password_reset_{$token}");
    }

    /**
     * Consume the reset token: write the new password, revoke every
     * session, and burn the token so it cannot be used again.
     *
     * @return array{ok: bool, status: int, message: string}
     */
    public function resetPassword(string $token, string $password): array
    {
        $userId = cache()->get("password_reset_{$token}");

        if (!$userId) {
            return [
                'ok' => false,
                'status' => 400,
                'message' => 'This reset link is invalid or has expired.',
            ];
        }

        $user = User::find($userId);
        if (!$user) {
            return [
                'ok' => false,
                'status' => 404,
                'message' => 'User not found.',
            ];
        }

        $user->update(['strPassword' => Hash::make($password)]);
        $user->tokens()->delete();
        cache()->forget("password_reset_{$token}");

        return [
            'ok' => true,
            'status' => 200,
            'message' => 'Password has been reset successfully.',
        ];
    }
}
