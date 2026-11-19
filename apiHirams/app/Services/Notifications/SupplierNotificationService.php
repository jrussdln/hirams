<?php

namespace App\Services\Notifications;

use App\Events\NotificationUpdated;
use App\Models\Notification;
use App\Models\Supplier;
use App\Models\User;
use Exception;
use Illuminate\Support\Collection;

/**
 * Supplier approval notifications.
 *
 * A supplier submitted with status P ("For Approval") sends a shared role
 * notification to every Finance and Management role. Approving it (P → A)
 * or deleting the pending request sends a direct notification back to the
 * user who submitted it.
 */
class SupplierNotificationService
{
    private const REFERENCE_TYPE = 'supplier';

    private const EVENT_SUBMITTED = 'supplier_submitted';
    private const EVENT_APPROVED  = 'supplier_approved';
    private const EVENT_DELETED   = 'supplier_deleted';

    public function __construct(
        private readonly NotificationService $notifications,
    ) {
    }

    /**
     * Account Officer submitted a supplier — alert Finance and Management roles.
     */
    public function notifySubmitted(Supplier $supplier, ?User $actor): void
    {
        if (!$actor || !$this->isPending($supplier)) {
            return;
        }

        $this->bestEffort(function () use ($supplier, $actor) {
            $supplierName = $this->supplierName($supplier);
            $actorName    = $this->userName($actor);

            foreach ($this->approvalRoles() as $role) {
                $this->notifications->sendToRole($role, [
                    'strTitle'           => 'Supplier approval required',
                    'strNotification'    => "{$actorName} added a new supplier, {$supplierName}, and it is waiting for your approval.",
                    'cNotificationType'  => 'W', // Warning / action needed
                    'cCategory'          => 'D', // supplier
                    'nReferenceId'       => $supplier->nSupplierId,
                    'bIsActionRequired'  => 1,
                    'strRoute'           => '/supplier?status=' . $this->statusCode('For Approval', 'P'),
                    'strData'            => [
                        'event'           => self::EVENT_SUBMITTED,
                        'supplierId'      => (int) $supplier->nSupplierId,
                        'supplierName'    => $supplier->strSupplierName,
                        'supplierNickName' => $supplier->strSupplierNickName,
                        'submittedBy'     => (int) $actor->nUserId,
                        'submittedByName' => $actorName,
                    ],
                    'nCreatedBy'         => $actor->nUserId,
                ]);
            }
        });
    }

    /**
     * Finance/Management approved the pending supplier.
     */
    public function notifyApproved(Supplier $supplier, ?User $actor): void
    {
        $this->notifyDecision($supplier, $actor, self::EVENT_APPROVED);
    }

    /**
     * Finance/Management deleted the pending request instead of approving it.
     */
    public function notifyDeleted(Supplier $supplier, ?User $actor): void
    {
        $this->notifyDecision($supplier, $actor, self::EVENT_DELETED);
    }

    private function notifyDecision(Supplier $supplier, ?User $actor, string $event): void
    {
        $pending     = $this->pendingNotifications($supplier);
        $submitterId = $pending->first()?->nCreatedBy;

        // Skip the echo when the same user submitted and decided the request.
        if ($submitterId && (!$actor || (int) $submitterId !== (int) $actor->nUserId)) {
            $submitter = User::find((int) $submitterId);

            if ($submitter) {
                $this->bestEffort(fn () => $this->notifications->sendToUser(
                    $submitter,
                    $this->decisionPayload($supplier, $actor, $event),
                ));
            }
        }

        // The request has been handled, so the shared "approval required"
        // rows should leave every Finance/Management feed.
        $this->bestEffort(fn () => $this->clearPending($pending));
    }

    /**
     * The direct notification sent back to the user who submitted the supplier.
     */
    private function decisionPayload(Supplier $supplier, ?User $actor, string $event): array
    {
        $approved   = $event === self::EVENT_APPROVED;
        $supplierName = $this->supplierName($supplier);
        $actorName    = $this->userName($actor);

        return [
            'strTitle'          => $approved ? 'Supplier approved' : 'Supplier request deleted',
            'strNotification'   => $approved
                ? "Your supplier request for {$supplierName} was approved by {$actorName}."
                : "Your supplier request for {$supplierName} was deleted by {$actorName}.",
            'cNotificationType' => $approved ? 'I' : 'W', // info / warning
            'cCategory'         => 'D', // supplier
            'nReferenceId'      => $supplier->nSupplierId,
            'bIsActionRequired' => 0,
            'strRoute'          => $approved
                ? '/supplier?status=' . $this->statusCode('Active', 'A')
                : '/supplier?status=' . $this->statusCode('For Approval', 'P'),
            'strData'           => [
                'event'         => $event,
                'supplierId'    => (int) $supplier->nSupplierId,
                'supplierName'  => $supplier->strSupplierName,
                'supplierNickName' => $supplier->strSupplierNickName,
                'decidedBy'     => $actor?->nUserId,
                'decidedByName' => $actorName,
            ],
            'nCreatedBy'        => $actor?->nUserId,
        ];
    }

    /**
     * The shared role rows created when this supplier was submitted.
     */
    private function pendingNotifications(Supplier $supplier): Collection
    {
        return Notification::query()
            ->where('nReferenceId', $supplier->nSupplierId)
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

    /**
     * Remove the handled request rows and tell matching Finance/Management
     * clients to refresh their feeds.
     */
    private function clearPending(Collection $pending): void
    {
        if ($pending->isEmpty()) {
            return;
        }

        $roles = $pending->pluck('cTargetRole')->filter()->unique()->values();

        Notification::query()
            ->whereIn('nNotificationId', $pending->pluck('nNotificationId'))
            ->delete();

        foreach ($roles as $role) {
            try {
                broadcast(new NotificationUpdated(
                    'deleted',
                    null,
                    null,
                    'R',
                    (string) $role,
                ));
            } catch (Exception $e) {
                report($e);
            }
        }
    }

    /**
     * Roles the frontend groups under supplier_approval_roles (M + F).
     */
    private function approvalRoles(): array
    {
        $roles = (array) config('mappings.supplier_approval_roles', ['M', 'F']);

        return array_values(array_unique(array_filter(array_map('strval', $roles))));
    }

    private function isPending(Supplier $supplier): bool
    {
        return (string) $supplier->cStatus === $this->statusCode('For Approval', 'P');
    }

    private function statusCode(string $label, string $fallback): string
    {
        $code = array_search($label, config('mappings.status_user', []), true);

        return $code !== false ? (string) $code : $fallback;
    }

    private function supplierName(Supplier $supplier): string
    {
        return trim((string) $supplier->strSupplierNickName)
            ?: trim((string) $supplier->strSupplierName)
            ?: 'this supplier';
    }

    private function userName(?User $user): string
    {
        if (!$user) {
            return 'Management/Finance';
        }

        return trim((string) $user->strNickName)
            ?: trim(trim((string) $user->strFName) . ' ' . trim((string) $user->strLName))
            ?: 'Management/Finance';
    }

    private function bestEffort(callable $callback): void
    {
        try {
            $callback();
        } catch (Exception $e) {
            // A notification failure must never break the supplier action.
            report($e);
        }
    }
}
