<?php

namespace App\Services\Notifications;

use App\Events\NotificationUpdated;
use App\Models\Notification;
use App\Models\PurchaseOrder;
use App\Models\User;
use Exception;
use Illuminate\Support\Collection;

/**
 * Purchase Order approval notifications.
 *
 * A PO submitted to "For Approval" sends a shared role notification
 * to Finance and Management roles.
 */
class PurchaseOrderNotificationService
{
    private const REFERENCE_TYPE = 'purchase_order';
    private const EVENT_SUBMITTED = 'po_submitted';

    private const EVENT_APPROVED  = 'po_approved';
    private const EVENT_DELETED   = 'po_deleted';

    public function __construct(
        private readonly NotificationService $notifications,
    ) {
    }

    /**
     * Account Officer moved PO to "For Approval" — alert Finance and Management.
     */
    public function notifySubmitted(PurchaseOrder $po, ?User $actor): void
    {
        if (!$actor) {
            return;
        }

        $this->bestEffort(function () use ($po, $actor) {
            $actorName = $this->userName($actor);

            foreach ($this->approvalRoles() as $role) {
                $this->notifications->sendToRole($role, [
                    'strTitle'           => 'PO approval required',
                    'strNotification'    => "{$actorName} submitted a new Purchase Order ({$po->strPurchaseOrderNo}) for approval.",
                    'cNotificationType'  => 'W',
                    'cCategory'          => 'E', // cart/po
                    'nReferenceId'       => $po->nPurchaseOrderId,
                    'bIsActionRequired'  => 1,
                    'strRoute'           => '/purchase-order?status=120',
                    'strData'            => [
                        'event'           => self::EVENT_SUBMITTED,
                        'poId'            => (int) $po->nPurchaseOrderId,
                        'poNumber'        => $po->strPurchaseOrderNo,
                        'submittedBy'     => (int) $actor->nUserId,
                        'submittedByName' => $actorName,
                    ],
                    'nCreatedBy'         => $actor->nUserId,
                ]);
            }
        });
    }

    /**
     * Management/Finance approved the PO.
     */
    public function notifyApproved(PurchaseOrder $po, ?User $actor): void
    {
        $this->notifyDecision($po, $actor, self::EVENT_APPROVED);
    }

    private function notifyDecision(PurchaseOrder $po, ?User $actor, string $event): void
    {
        // Need to find who submitted the PO. Since tblpurchaseorders doesn't have a 
        // created_by column, we look at the submitted notification we just cleared 
        // or check the history if available. Assuming the submitter is carried
        // in the notification data.
        $pending = $this->pendingNotifications($po);
        $submitterId = $pending->first()?->nCreatedBy;

        if ($submitterId && (!$actor || (int) $submitterId !== (int) $actor->nUserId)) {
            $submitter = User::find((int) $submitterId);
            if ($submitter) {
                $this->bestEffort(fn () => $this->notifications->sendToUser(
                    $submitter,
                    $this->decisionPayload($po, $actor, $event),
                ));
            }
        }

        $this->bestEffort(fn () => $this->clearPending($pending));
    }

    private function decisionPayload(PurchaseOrder $po, ?User $actor, string $event): array
    {
        $approved = $event === self::EVENT_APPROVED;
        $actorName = $this->userName($actor);

        return [
            'strTitle'          => $approved ? 'PO approved' : 'PO request deleted',
            'strNotification'   => $approved
                ? "Your Purchase Order ({$po->strPurchaseOrderNo}) was approved by {$actorName}."
                : "Your Purchase Order ({$po->strPurchaseOrderNo}) was deleted by {$actorName}.",
            'cNotificationType' => $approved ? 'I' : 'W',
            'cCategory'         => 'E',
            'nReferenceId'      => $po->nPurchaseOrderId,
            'bIsActionRequired' => 0,
            'strRoute'          => '/purchase-order?status=' . ($approved ? '130' : '120'),
            'strData'           => [
                'event'         => $event,
                'poId'          => (int) $po->nPurchaseOrderId,
                'poNumber'      => $po->strPurchaseOrderNo,
                'decidedBy'     => $actor?->nUserId,
                'decidedByName' => $actorName,
            ],
            'nCreatedBy'        => $actor?->nUserId,
        ];
    }

    private function pendingNotifications(PurchaseOrder $po): Collection
    {
        return Notification::query()
            ->where('nReferenceId', $po->nPurchaseOrderId)
            ->where('cAudience', 'R')
            ->whereIn('cTargetRole', $this->approvalRoles())
            ->whereNotNull('nCreatedBy')
            ->get()
            ->filter(
                fn (Notification $notification) =>
                    ($notification->strData['event'] ?? null) === self::EVENT_SUBMITTED
            )
            ->values();
    }

    private function clearPending(Collection $pending): void
    {
        if ($pending->isEmpty()) return;
        $roles = $pending->pluck('cTargetRole')->filter()->unique()->values();
        Notification::query()->whereIn('nNotificationId', $pending->pluck('nNotificationId'))->delete();
        foreach ($roles as $role) {
            try {
                broadcast(new NotificationUpdated('deleted', null, null, 'R', (string) $role));
            } catch (Exception $e) { report($e); }
        }
    }

    private function approvalRoles(): array
    {
        return ['M', 'F', 'G']; // Management, Finance, General Manager
    }

    private function userName(?User $user): string
    {
        if (!$user) return 'Management/Finance';
        return trim((string) $user->strNickName) 
            ?: trim(trim((string) $user->strFName) . ' ' . trim((string) $user->strLName)) 
            ?: 'Management/Finance';
    }

    private function bestEffort(callable $callback): void
    {
        try {
            $callback();
        } catch (Exception $e) {
            report($e);
        }
    }
}
