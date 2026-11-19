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
 * Fired by writes to tblnotifications / tblnotificationreads so every
 * matching signed-in device updates its bell badge / list without waiting
 * for the next fetch:
 *
 *   - 'created'  — a new row (payload carries the full notification only
 *                  for audience U; shared R/A rows send null)
 *   - 'read'     — one row marked read (payload carries the row)
 *   - 'read_all' — every row of the user read (payload is null)
 *   - 'deleted'  — one row removed (payload is null)
 *
 * For 'created' events the audience tells the client whether to refetch:
 *   - U: userId is the recipient
 *   - R: userId is null, targetRole is the matching cUserType
 *   - A: userId is null, targetRole is null, every client refetches
 */
class NotificationUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly string  $action,   // 'created' | 'read' | 'read_all' | 'deleted'
        public readonly ?int    $userId,
        public readonly ?array  $notification = null,
        public readonly ?string $audience = null,     // U | R | A
        public readonly ?string $targetRole = null,   // cUserType when audience = R
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
            'audience'     => $this->audience,
            'targetRole'   => $this->targetRole,
            'notification' => $this->notification,
        ];
    }
}
