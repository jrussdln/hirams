<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * tblnotificationreads — one row per notification/user pair.
 *
 * This is the single source of truth for whether a notification is read
 * or dismissed. A missing row means "unread, visible". Rows are written
 * lazily by the NotificationController when the user opens, reads or
 * dismisses a notification.
 */
class NotificationRead extends Model
{
    protected $table = 'tblnotificationreads';
    protected $primaryKey = 'nNotificationReadId';

    protected $fillable = [
        'nNotificationId',
        'nUserId',
        'bIsRead',
        'bIsDismissed',
        'dtReadAt',
    ];

    protected $casts = [
        'bIsRead'      => 'boolean',
        'bIsDismissed' => 'boolean',
        'dtReadAt'     => 'datetime',
    ];

    public $timestamps = false;

    public function notification(): BelongsTo
    {
        return $this->belongsTo(Notification::class, 'nNotificationId', 'nNotificationId');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'nUserId', 'nUserId');
    }
}
