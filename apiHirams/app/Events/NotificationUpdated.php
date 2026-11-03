<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Live sync for the notification feed.
 *
 * Fired by writes to tblnotifications so every signed-in device
 * updates its bell badge / list without waiting for the next fetch:
 *
 *   - 'created'  — a new row (payload carries the full notification)
 *   - 'read'     — one row marked read (payload carries the row)
 *   - 'read_all' — every row of the user read (payload is null)
 *   - 'deleted'  — one row removed (payload is null)
 */
class NotificationUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly string $action,   // 'created' | 'read' | 'read_all' | 'deleted'
        public readonly int    $userId,
        public readonly ?array $notification = null,
    ) {}

    public function broadcastOn(): array
    {
        return [new Channel('notifications')];
    }

    public function broadcastAs(): string
    {
        return 'notification.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'action'       => $this->action,
            'userId'       => $this->userId,
            'notification' => $this->notification,
        ];
    }
}
