<?php

namespace App\Services\Notifications;

use App\Events\NotificationUpdated;
use App\Models\Notification;
use App\Models\User;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Every auth-event notification in tblnotifications lives here.
 *
 * The device fingerprint phrasing ("…from Unknown (180.191.80.219) using
 * Mozilla/5.0 …") AND the consecutive-failure streak that raises the
 * "Repeated failed sign-ins" warning both belong to this layer, so the
 * controller only reports that an event happened — never how the text is
 * written or how noisy it should be.
 *
 * Every write is best-effort via record(): an auth event already
 * happened, so a failed insert (or a dead broadcaster) must never break
 * the response — failures land in the log via report().
 */
class AuthNotificationService
{
    /** A streak dies this many minutes after the last failure. */
    private const STREAK_TTL_MINUTES = 15;

    /** Failure count that triggers the repeated-failures warning. */
    private const STREAK_LIMIT = 3;

    /**
     * "Successful login from …" — also ends the failure streak, so a later
     * wrong password starts counting from 1 again.
     */
    public function recordSuccessfulLogin(User $user, Request $request): void
    {
        cache()->forget("failed_logins_{$user->nUserId}");

        $this->record([
            'nUserId'           => $user->nUserId,
            'strTitle'          => 'Successful login',
            // Timestamp is NOT embedded — tblnotifications.dtNotifiedAt
            // carries it and the feed UI renders the full date on the row.
            'strNotification'   => 'Successful login from '
                . $this->originLabel($request),
            'cNotificationType' => 'I', // Info
            'cCategory'         => 'A', // auth
            'strData'           => $this->deviceData($request),
            'dtNotifiedAt'      => now(),
        ]);
    }

    /**
     * One "Failed sign-in attempt" row per wrong password; on the 3rd
     * consecutive failure an additional "Repeated failed sign-ins"
     * warning fires and the streak resets — so every wave of 3 alerts
     * exactly once, with no spam on attempts 4, 5, … .
     */
    public function recordFailedAttempt(User $user, Request $request): void
    {
        $streakKey = "failed_logins_{$user->nUserId}";
        $attempts = (int) cache()->get($streakKey, 0) + 1;
        cache()->put(
            $streakKey,
            $attempts,
            now()->addMinutes(self::STREAK_TTL_MINUTES),
        );

        $this->record([
            'nUserId'           => $user->nUserId,
            'strTitle'          => 'Failed sign-in attempt',
            'strNotification'   => 'There was a failed sign-in attempt on your account from '
                . $this->originLabel($request) . '.',
            'cNotificationType' => 'S', // Security
            'cCategory'         => 'A', // auth
            'strData'           => $this->deviceData($request),
            'dtNotifiedAt'      => now(),
        ]);

        if ($attempts >= self::STREAK_LIMIT) {
            $this->record([
                'nUserId'           => $user->nUserId,
                'strTitle'          => 'Repeated failed sign-ins',
                'strNotification'   => 'There have been ' . $attempts
                    . ' failed sign-in attempts in a row on your account from '
                    . $this->originLabel($request) . '. '
                    . 'If this was not you, change your password right away.',
                'cNotificationType' => 'S', // Security
                'cCategory'         => 'A', // auth
                'strData'           => $this->deviceData($request),
                'dtNotifiedAt'      => now(),
            ]);
            cache()->forget($streakKey);
        }
    }

    public function recordSignedOut(User $user, Request $request): void
    {
        $this->record([
            'nUserId'           => $user->nUserId,
            'strTitle'          => 'Signed out',
            'strNotification'   => 'You signed out of your account from '
                . $this->originLabel($request) . '.',
            'cNotificationType' => 'I', // Info
            'cCategory'         => 'A', // auth
            'strData'           => $this->deviceData($request),
            'dtNotifiedAt'      => now(),
        ]);
    }

    /**
     * The forgot-password page has NO signed-in session, so this row is
     * only visible once the user signs back in — it documents that the
     * reset email left the system, matching the link's token TTL.
     */
    public function recordResetLinkSent(User $user): void
    {
        $this->record([
            'nUserId'           => $user->nUserId,
            'strTitle'          => 'Password reset link sent',
            'strNotification'   => 'A password reset link was sent to your email '
                . '(' . $user->strEmail . '). The link expires after an hour.',
            'cNotificationType' => 'I', // Info
            'cCategory'         => 'A', // auth
            'strData'           => [
                'email'            => $user->strEmail,
                'expiresInMinutes' => 60,
            ],
            'dtNotifiedAt'      => now(),
        ]);
    }

    /**
     * A human-readable device label from the user agent — "Chrome on
     * Windows". Also used as the Sanctum token name for the device.
     */
    public function deviceLabel(Request $request): string
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
     * The shared tail phrase for every auth notification — written once so
     * all of them read exactly the same way.
     */
    private function originLabel(Request $request): string
    {
        return $this->locationLabel($request)
            . ' (' . $request->ip() . ') using '
            . Str::limit((string) $request->userAgent(), 250);
    }

    /**
     * The place the sign-in came from. No IP-to-location service is wired
     * up yet, so everything reads "Unknown" until one is added; real IP +
     * user agent still identify the session in strData and the message.
     */
    private function locationLabel(Request $request): string
    {
        return 'Unknown';
    }

    /**
     * The flexible device fingerprint stored beside every auth event.
     * Kept short so it always fits the longtext column even when a
     * browser sends an unusually long UA string.
     */
    private function deviceData(Request $request): array
    {
        return [
            'ip'     => $request->ip(),
            'device' => Str::limit((string) $request->userAgent(), 250),
            'label'  => $this->deviceLabel($request),
        ];
    }

    /**
     * Best-effort notification insert. The row is broadcast so every
     * OTHER signed-in device updates its badge live.
     */
    private function record(array $attributes): void
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
}
