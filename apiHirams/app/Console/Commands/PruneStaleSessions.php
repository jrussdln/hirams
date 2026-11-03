<?php

namespace App\Console\Commands;

use App\Events\UserUpdated;
use App\Models\User;
use Illuminate\Console\Command;

/**
 * sessions:prune-stale
 *
 * Flips users offline when their browser stopped saying "I'm alive".
 * While a tab is open, the frontend pings POST /auth/heartbeat every
 * 30s, which stamps tblusers.dtLastSeen. A session whose last stamp is
 * older than the staleness window has no running app (crash, force-quit,
 * Wi-Fi drop) — no logout request fires in those cases, so silence is
 * the only signal there is.
 *
 * Runs every minute via the scheduler (routes/console.php); during dev
 * keep it fed with `php artisan schedule:work`.
 */
class PruneStaleSessions extends Command
{
    /**
     * A session is offline once its last heartbeat is older than this.
     * Four missed beats = gone for sure (the goodbye ping covers the
     * graceful cases) and safely above the 30s ping interval.
     */
    const STALE_AFTER_SECONDS = 120;

    protected $signature = 'sessions:prune-stale';

    protected $description = 'Flip users offline when their heartbeat has been silent for 2 minutes';

    public function handle(): int
    {
        $cutoff = now()->subSeconds(self::STALE_AFTER_SECONDS);

        $stale = User::where('bIsActive', 0)
            ->whereNotNull('dtLastSeen')
            ->where('dtLastSeen', '<', $cutoff)
            ->get();

        foreach ($stale as $user) {
            $user->update(['bIsActive' => 1]);
            broadcast(new UserUpdated('status_changed', $user->nUserId));
            // NOTE: deliberately NOT revoking tokens here — a suspended
            // laptop (lid close) goes silent for minutes but its tab is
            // still alive; its heartbeat will come back and flag the
            // session online again. Revoking would log it out for no
            // reason. Token expiry is handled elsewhere (reset, idle).
        }

        if ($stale->isNotEmpty()) {
            $this->info("Marked {$stale->count()} user(s) offline (no heartbeat for "
                . self::STALE_AFTER_SECONDS . "s): "
                . $stale->implode('nUserId', ', '));
        } else {
            $this->info('No stale sessions.');
        }

        return self::SUCCESS;
    }
}
