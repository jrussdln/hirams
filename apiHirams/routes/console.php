<?php

use App\Console\Commands\PruneStaleSessions;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Presence: users whose heartbeat went silent have no running browser
// (crash / force-quit / network drop) — flip them offline every minute.
Schedule::command(PruneStaleSessions::class)->everyMinute();
