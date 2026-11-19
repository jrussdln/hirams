<?php

namespace App\Http\Controllers\Api;

use App\Events\NotificationUpdated;
use App\Models\Notification;
use App\Models\NotificationRead;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The signed-in user's notification feed.
 *
 * GET  /notifications            — latest 50 visible rows + the unread count
 * PUT  /notifications/{id}/read  — mark one row read for this user
 * PUT  /notifications/read-all   — mark every visible row read for this user
 * DELETE /notifications/{id}     — remove one row for this user
 *
 * Visibility is audience-based (tblnotifications.cAudience):
 *   U — nUserId matches the signed-in user
 *   R — cTargetRole matches the signed-in user's cUserType
 *   A — visible to everyone
 *
 * Read/dismiss state lives in tblnotificationreads. Every write is scoped
 * to the signed-in user, so an id belonging to someone else behaves like
 * any other missing row, and shared role notifications keep independent
 * read state per user.
 */
class NotificationController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            $notifications = Notification::query()
                ->visibleTo($user)
                ->whereDoesntHave('reads', function (Builder $q) use ($user) {
                    $q->where('nUserId', $user->nUserId)
                        ->where('bIsDismissed', 1);
                })
                ->with(['reads' => function ($q) use ($user) {
                    $q->where('nUserId', $user->nUserId);
                }])
                ->orderByDesc('dtNotifiedAt')
                ->orderByDesc('nNotificationId')
                ->limit(50)
                ->get()
                ->map(fn (Notification $notification) => $this->applyReadState($notification, $user->nUserId));

            return response()->json([
                'data'        => $notifications,
                'unreadCount' => Notification::query()
                    ->visibleTo($user)
                    ->whereDoesntHave('reads', function (Builder $q) use ($user) {
                        $q->where('nUserId', $user->nUserId)
                            ->where(function (Builder $q) {
                                $q->where('bIsRead', 1)
                                    ->orWhere('bIsDismissed', 1);
                            });
                    })
                    ->count(),
            ]);
        } catch (\Exception $e) {
            return $this->handleException($e, 'read_failed', 'Notification');
        }
    }

    public function markRead(Request $request, $id): JsonResponse
    {
        try {
            $user = $request->user();

            $notification = Notification::query()
                ->visibleTo($user)
                ->where('nNotificationId', $id)
                ->first();

            if (!$notification) {
                return $this->notFound('Notification');
            }

            $read = NotificationRead::updateOrCreate(
                [
                    'nNotificationId' => $notification->nNotificationId,
                    'nUserId'         => $user->nUserId,
                ],
                [
                    'bIsRead'  => 1,
                    'dtReadAt' => now(),
                ],
            );

            $notification->setAttribute('bIsRead', true);
            $notification->setAttribute('bIsDismissed', (bool) $read->bIsDismissed);
            $notification->setAttribute('dtReadAt', $read->dtReadAt);

            broadcast(new NotificationUpdated('read', $user->nUserId, $notification->toArray()));

            return $this->ok(__('messages.update_success', ['name' => 'Notification']), [
                'data' => $notification,
            ]);
        } catch (\Exception $e) {
            return $this->handleException($e, 'update_failed', 'Notification');
        }
    }

    public function markAllRead(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $now = now();

            Notification::query()
                ->visibleTo($user)
                ->whereDoesntHave('reads', function (Builder $q) use ($user) {
                    $q->where('nUserId', $user->nUserId)
                        ->where('bIsDismissed', 1);
                })
                ->select('nNotificationId')
                ->chunkById(500, function ($notifications) use ($user, $now) {
                    $rows = $notifications->map(fn (Notification $notification) => [
                        'nNotificationId' => $notification->nNotificationId,
                        'nUserId'         => $user->nUserId,
                        'bIsRead'         => 1,
                        'dtReadAt'        => $now,
                    ])->all();

                    NotificationRead::upsert(
                        $rows,
                        ['nNotificationId', 'nUserId'],
                        ['bIsRead', 'dtReadAt'],
                    );
                });

            broadcast(new NotificationUpdated('read_all', $user->nUserId));

            return $this->ok(__('messages.update_success', ['name' => 'Notification']));
        } catch (\Exception $e) {
            return $this->handleException($e, 'update_failed', 'Notification');
        }
    }

    public function destroy(Request $request, $id): JsonResponse
    {
        try {
            $user = $request->user();

            $notification = Notification::query()
                ->visibleTo($user)
                ->where('nNotificationId', $id)
                ->first();

            if (!$notification) {
                return $this->notFound('Notification');
            }

            if ($notification->cAudience === 'U') {
                // A direct row belongs to this user alone — remove it.
                $notification->delete();
            } else {
                // Shared role/all rows are dismissed per user, never deleted
                // for everyone by one recipient.
                NotificationRead::updateOrCreate(
                    [
                        'nNotificationId' => $notification->nNotificationId,
                        'nUserId'         => $user->nUserId,
                    ],
                    ['bIsDismissed' => 1],
                );
            }

            broadcast(new NotificationUpdated('deleted', $user->nUserId, $notification->toArray()));

            return $this->ok(__('messages.delete_success', ['name' => 'Notification']));
        } catch (\Exception $e) {
            return $this->handleException($e, 'delete_failed', 'Notification');
        }
    }

    /**
     * Copy the signed-in user's read row onto the model as bIsRead /
     * bIsDismissed / dtReadAt, then hide the internal relation so it does
     * not leak into the JSON feed.
     */
    private function applyReadState(Notification $notification, int $userId): Notification
    {
        $read = $notification->reads->first(
            fn (NotificationRead $read) => (int) $read->nUserId === (int) $userId,
        );

        $notification->setAttribute('bIsRead', (bool) ($read?->bIsRead ?? false));
        $notification->setAttribute('bIsDismissed', (bool) ($read?->bIsDismissed ?? false));
        $notification->setAttribute('dtReadAt', $read?->dtReadAt);
        $notification->unsetRelation('reads');

        return $notification;
    }
}
