<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * tblnotifications — the in-app notification feed.
 *
 * A row is addressed to one of three audiences:
 *   U — one user (nUserId is set)
 *   R — every user whose tblusers.cUserType matches cTargetRole
 *   A — every user
 *
 * Read/dismiss state is NOT stored here. tblnotificationreads holds one
 * row per (notification, user) and is the single source of truth for
 * bIsRead, dtReadAt and bIsDismissed. The controller loads that relation
 * for the signed-in user when it builds the feed.
 */
class Notification extends Model
{
    protected $table = 'tblnotifications';
    protected $primaryKey = 'nNotificationId';

    protected $fillable = [
        'nUserId',
        'cAudience',       // U = user, R = role, A = all users
        'cTargetRole',     // tblusers.cUserType when cAudience = R
        'strTitle',
        'strNotification',
        'cNotificationType', // status_notif_type: I, W, S
        'cCategory',         // status_notif_category: A, B
        'nReferenceId',
        'bIsActionRequired',
        'strRoute',
        'strData',
        'nCreatedBy',
        'dtNotifiedAt',
    ];

    protected $casts = [
        'bIsActionRequired' => 'boolean',
        // Computed by the controller from tblnotificationreads.
        'bIsRead'           => 'boolean',
        'bIsDismissed'      => 'boolean',
        'dtReadAt'          => 'datetime',
        'dtNotifiedAt'      => 'datetime',
        'strData'           => 'array',
    ];

    public $timestamps = false;

    /**
     * Per-user read/dismiss state for this notification.
     */
    public function reads(): HasMany
    {
        return $this->hasMany(NotificationRead::class, 'nNotificationId', 'nNotificationId');
    }

    /**
     * Rows the given user is allowed to see:
     *   - direct rows addressed to them,
     *   - role rows addressed to their cUserType,
     *   - rows addressed to everyone.
     */
    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        return $query->where(function (Builder $q) use ($user) {
            $q->where(function (Builder $q) use ($user) {
                $q->where('cAudience', 'U')
                    ->where('nUserId', $user->nUserId);
            })->orWhere(function (Builder $q) use ($user) {
                $q->where('cAudience', 'R')
                    ->where('cTargetRole', $user->cUserType);
            })->orWhere('cAudience', 'A');
        });
    }
}
