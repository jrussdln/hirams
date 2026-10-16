<?php

namespace App\Services\Notifications;

use App\Mail\OtpMail;
use App\Mail\ResetPasswordMail;
use App\Models\User;
use Exception;
use Illuminate\Support\Facades\Mail;

/**
 * Outbound mail for the auth flows.
 *
 * Formerly `Http\Controllers\Api\SendEmailController` — it was never routed and
 * took plain arguments rather than a Request, so it belongs in the service layer.
 */
class MailService
{
    /**
     * Send password reset link email.
     */
    public function forgotPassword(User $user, string $resetUrl): bool
    {
        try {
            Mail::to($user->strEmail)->send(new ResetPasswordMail($user, $resetUrl));

            return true;
        } catch (Exception $e) {
            report($e);

            return false;
        }
    }

    /**
     * Send a 6-digit OTP for registration email verification.
     */
    public function sendOtp(string $email, string $otp): bool
    {
        try {
            Mail::to($email)->send(new OtpMail($otp));

            return true;
        } catch (Exception $e) {
            report($e);

            return false;
        }
    }
}
