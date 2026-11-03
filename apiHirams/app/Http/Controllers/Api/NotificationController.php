<?php

namespace App\Http\Controllers\Api;

use App\Events\NotificationUpdated;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * The signed-in user's notification feed.
 *
 * GET  /notifications            — latest 50 rows + the unread count
 * PUT  /notifications/{id}/read  — mark one row read (dtReadAt stamped)
 * PUT  /notifications/read-all   — mark every row of the user read
 * DELETE /notifications/{id}     — remove one row
 *
 * Every write is scoped to the signed-in user: an id belonging to someone
 * else behaves like any other missing row.
 */
class NotificationController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        try {
            $userId = $request->user()->nUserId;

            $notifications = Notification::where('nUserId', $userId)
                ->orderByDesc('nNotificationId')
                ->limit(50)
                ->get();

            return response()->json([
                'data'        => $notifications,
                'unreadCount' => Notification::where('nUserId', $userId)
                    ->where('bIsRead', 0)
                    ->count(),
            ]);
        } catch (\Exception $e) {
            return $this->handleException($e, 'read_failed', 'Notification');
        }
    }

    public function markRead(Request $request, $id): JsonResponse
    {
        try {
            $notification = Notification::where('nNotificationId', $id)
                ->where('nUserId', $request->user()->nUserId)
                ->first();

            if (!$notification) {
                return $this->notFound('Notification');
            }

            $notification->update([
                'bIsRead'  => 1,
                'dtReadAt' => now(),
            ]);
            broadcast(new NotificationUpdated('read', $notification->nUserId, $notification->toArray()));

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
            $userId = $request->user()->nUserId;

            DB::table('tblnotifications')
                ->where('nUserId', $userId)
                ->where('bIsRead', 0)
                ->update([
                    'bIsRead'  => 1,
                    'dtReadAt' => now(),
                ]);
            broadcast(new NotificationUpdated('read_all', $userId));

            return $this->ok(__('messages.update_success', ['name' => 'Notification']));
        } catch (\Exception $e) {
            return $this->handleException($e, 'update_failed', 'Notification');
        }
    }

    public function destroy(Request $request, $id): JsonResponse
    {
        try {
            $userId = $request->user()->nUserId;

            $notification = Notification::where('nNotificationId', $id)
                ->where('nUserId', $userId)
                ->first();

            if (!$notification) {
                return $this->notFound('Notification');
            }

            $notification->delete();
            broadcast(new NotificationUpdated('deleted', $userId, $notification->toArray()));

            return $this->ok(__('messages.delete_success', ['name' => 'Notification']));
        } catch (\Exception $e) {
            return $this->handleException($e, 'delete_failed', 'Notification');
        }
    }
}
