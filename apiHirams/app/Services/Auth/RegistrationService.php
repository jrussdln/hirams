<?php

namespace App\Services\Auth;

use App\Events\UserUpdated;
use App\Models\User;
use App\Services\Notifications\MailService;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Hash;
use Exception;

/**
 * Self-registration flow: OTP minting/verification in cache, the OTP
 * mail, and creating the For-Approval account. Validation of the
 * request shape stays in the controller — this service receives clean
 * arguments and decides the outcome.
 */
class RegistrationService
{
    /** OTPs expire 10 minutes after they are emailed. */
    private const OTP_TTL_MINUTES = 10;

    public function __construct(
        private readonly MailService $mail,
    ) {}

    /**
     * Generate a cryptographically random 6-digit OTP, store it in cache
     * keyed by email, and email it. Used in registration step 2 → 3.
     *
     * @return array{ok: bool, status: int, message: string}
     */
    public function sendOtp(string $email): array
    {
        // str_pad keeps codes like 000412 six digits wide.
        $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        cache()->put(
            "reg_otp_{$email}",
            $otp,
            now()->addMinutes(self::OTP_TTL_MINUTES),
        );

        if (!$this->mail->sendOtp($email, $otp)) {
            return [
                'ok' => false,
                'status' => 500,
                'message' => 'Failed to send OTP. Please try again.',
            ];
        }

        return [
            'ok' => true,
            'status' => 200,
            'message' => 'OTP sent successfully.',
        ];
    }

    /**
     * Check the submitted OTP against the cached one and consume it on
     * success, so a verified code cannot be re-verified later.
     *
     * @return array{valid: bool, status: int, message: string}
     */
    public function verifyOtp(string $email, string $otp): array
    {
        $cacheKey  = "reg_otp_{$email}";
        $storedOtp = cache()->get($cacheKey);

        if (!$storedOtp) {
            return [
                'valid' => false,
                'status' => 422,
                'message' => 'OTP has expired. Please request a new one.',
            ];
        }

        if ($storedOtp !== $otp) {
            return [
                'valid' => false,
                'status' => 422,
                'message' => 'Invalid OTP. Please try again.',
            ];
        }

        // Consume OTP so it cannot be reused.
        cache()->forget($cacheKey);

        return [
            'valid' => true,
            'status' => 200,
            'message' => 'OTP verified successfully.',
        ];
    }

    /**
     * Create the account: duplicate checks, OTP consumption, user row
     * (For Approval — status P) and a best-effort live broadcast.
     *
     * @param  array<string, mixed>  $data  validated request fields
     * @return array{ok: bool, status: int, message: string, user: ?User}
     */
    public function register(array $data): array
    {
        $email    = $data['strEmail'];
        $cacheKey = "reg_otp_{$email}";
        $storedOtp = cache()->get($cacheKey);

        if (!$storedOtp) {
            return [
                'ok' => false,
                'status' => 422,
                'message' => 'OTP has expired. Please request a new one.',
                'user' => null,
            ];
        }

        if ($storedOtp !== $data['otp']) {
            return [
                'ok' => false,
                'status' => 422,
                'message' => 'Invalid OTP. Please try again.',
                'user' => null,
            ];
        }

        // Duplicate checks run before the OTP is consumed so a retry with
        // the same code still works after fixing the details.
        if (User::whereRaw('BINARY strUserName = ?', [$data['strUserName']])->exists()) {
            return [
                'ok' => false,
                'status' => 409,
                'message' => 'This username already exists.',
                'user' => null,
            ];
        }

        if (User::where('strEmail', $email)->exists()) {
            return [
                'ok' => false,
                'status' => 409,
                'message' => 'This email already exists.',
                'user' => null,
            ];
        }

        // Consume OTP so it cannot be reused.
        cache()->forget($cacheKey);

        try {
            $user = User::create([
                'strFName'    => $data['strFName'],
                'strMName'    => $data['strMName'] ?? '',
                'strLName'    => $data['strLName'],
                'strNickName' => $data['strNickName'] ?? '',
                'cSex'        => $data['cSex'],
                // tblusers columns: strPhoneNo varchar(20) / strEmail varchar(50)
                'strPhoneNo'  => $data['strPhoneNo'] ?? '',
                'strEmail'    => $email,
                'strUserName' => $data['strUserName'],
                'strPassword' => Hash::make($data['strPassword']),
                'cUserType'   => 'V',
                'cStatus'     => 'P', // status_user: For Approval
            ]);
        } catch (QueryException) {
            return [
                'ok' => false,
                'status' => 409,
                'message' => 'This username or email already exists.',
                'user' => null,
            ];
        }

        // Broadcasting is best-effort — a Pusher hiccup must not fail a
        // registration whose row was already written.
        try {
            broadcast(new UserUpdated('created', $user->nUserId))->toOthers();
        } catch (Exception $e) {
            report($e);
        }

        return [
            'ok' => true,
            'status' => 201,
            'message' => __('messages.create_success', ['name' => 'User']),
            'user' => $user,
        ];
    }
}
