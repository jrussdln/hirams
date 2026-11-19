<?php

namespace App\Services\Notifications;

use App\Events\NotificationUpdated;
use App\Models\Notification;
use App\Models\User;
use InvalidArgumentException;

/**
 * Entry point for writing notifications that are not tied to an auth
 * event (those live in AuthNotificationService).
 *
 * The three audience helpers mirror tblnotifications.cAudience:
 *   sendToUser() — cAudience U, one nUserId
 *   sendToRole() — cAudience R, one cTargetRole
 *   sendToAll()  — cAudience A, visible to every user
 *
 * Only the U variant is addressed to a single user; the R and A rows are
 * shared, so their read/dismiss state is per user in tblnotificationreads.
 */
class NotificationService
{
    /**
     * Send a notification to one specific user.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function sendToUser(User $user, array $attributes): Notification
    {
        return $this->send($attributes, 'U', $user->nUserId, null);
    }

    /**
     * Send a notification to every user whose cUserType matches $role.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function sendToRole(string $role, array $attributes): Notification
    {
        $role = strtoupper(trim($role));

        if (!array_key_exists($role, config('mappings.user_types', []))) {
            throw new InvalidArgumentException("Unknown user role [{$role}].");
        }

        return $this->send($attributes, 'R', null, $role);
    }

    /**
     * Send a notification to every user.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function sendToAll(array $attributes): Notification
    {
        return $this->send($attributes, 'A', null, null);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function send(
        array $attributes,
        string $audience,
        ?int $userId,
        ?string $targetRole,
    ): Notification {
        $notification = Notification::create(array_merge([
            'cNotificationType' => 'I',
            'cCategory'         => 'B',
            'bIsActionRequired' => 0,
            'dtNotifiedAt'      => now(),
        ], $attributes, [
            'nUserId'     => $userId,
            'cAudience'   => $audience,
            'cTargetRole' => $targetRole,
        ]));

        // Shared rows carry no personal payload in the public broadcast —
        // every client only needs the signal to refetch its own feed.
        $payload = $audience === 'U' ? $notification->toArray() : null;

        broadcast(new NotificationUpdated(
            'created',
            $userId,
            $payload,
            $audience,
            $targetRole,
        ));

        return $notification;
    }
}
// CREATE TABLE tblnotifications (
//   nNotificationId     BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
//   nUserId             BIGINT(20) UNSIGNED NULL,
//   cAudience           CHAR(1) NOT NULL DEFAULT 'U' COMMENT 'U=user, R=role, A=all',
//   cTargetRole         CHAR(1) NULL COMMENT 'tblusers.cUserType when cAudience=R',
//   strTitle            VARCHAR(150) NOT NULL,
//   strNotification     VARCHAR(500) NOT NULL,
//   cNotificationType   CHAR(1) NOT NULL,
//   cCategory           CHAR(1) NOT NULL,
//   strReferenceType    VARCHAR(30) NULL,
//   nReferenceId        BIGINT(20) UNSIGNED NULL,
//   bIsActionRequired   TINYINT(1) NOT NULL DEFAULT 0,
//   strRoute            VARCHAR(255) NULL,
//   strData             LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
//   nCreatedBy          BIGINT(20) UNSIGNED NULL,
//   dtNotifiedAt        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
//   PRIMARY KEY (nNotificationId),
//   KEY idx_user_feed (nUserId, dtNotifiedAt),
//   KEY idx_audience_role (cAudience, cTargetRole, dtNotifiedAt),
//   KEY idx_reference (strReferenceType, nReferenceId),
//   KEY idx_created_by (nCreatedBy),
//   CONSTRAINT chk_notif_audience CHECK (
//       (cAudience = 'U' AND nUserId IS NOT NULL AND cTargetRole IS NULL)
//    OR (cAudience = 'R' AND nUserId IS NULL     AND cTargetRole IS NOT NULL)
//    OR (cAudience = 'A' AND nUserId IS NULL     AND cTargetRole IS NULL)
//   )
// ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

// CREATE TABLE tblnotificationreads (
//   nNotificationReadId BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
//   nNotificationId     BIGINT(20) UNSIGNED NOT NULL,
//   nUserId             BIGINT(20) UNSIGNED NOT NULL,
//   bIsRead             TINYINT(1) NOT NULL DEFAULT 0,
//   bIsDismissed        TINYINT(1) NOT NULL DEFAULT 0,
//   dtReadAt            DATETIME NULL,
//   PRIMARY KEY (nNotificationReadId),
//   UNIQUE KEY uq_notification_user (nNotificationId, nUserId),
//   KEY idx_user_unread (nUserId, bIsRead, bIsDismissed),
//   CONSTRAINT fk_notifread_notification
//       FOREIGN KEY (nNotificationId) REFERENCES tblnotifications (nNotificationId)
//       ON DELETE CASCADE
// ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;