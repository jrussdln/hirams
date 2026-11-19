<?php

namespace App\Services\Notifications;

use App\Events\NotificationUpdated;
use App\Models\Client;
use App\Models\Notification;
use App\Models\User;
use Exception;
use Illuminate\Support\Collection;

/**
 * Client approval notifications.
 *
 * A client submitted with status P ("For Approval") sends a shared role
 * notification to every Management role. Approving it (P → A) or deleting
 * the pending request sends a direct notification back to the user who
 * submitted it.
 *
 * There is no created-by column on tblclients, so the submitted notification
 * itself carries the submitter in nCreatedBy. The decision handlers read that
 * back from the role rows before clearing them.
 */
class ClientNotificationService
{
    private const REFERENCE_TYPE = 'client';

    private const EVENT_SUBMITTED = 'client_submitted';
    private const EVENT_APPROVED  = 'client_approved';
    private const EVENT_DELETED   = 'client_deleted';

    public function __construct(
        private readonly NotificationService $notifications,
    ) {
    }

    /**
     * Procurement submitted a client — alert every Management role.
     */
    public function notifySubmitted(Client $client, ?User $actor): void
    {
        if (!$actor || !$this->isPending($client)) {
            return;
        }

        $this->bestEffort(function () use ($client, $actor) {
            $clientName = $this->clientName($client);
            $actorName  = $this->userName($actor);

            foreach ($this->managementRoles() as $role) {
                $this->notifications->sendToRole($role, [
                    'strTitle'           => 'Client approval required',
                    'strNotification'    => "{$actorName} added a new client, {$clientName}, and it is waiting for your approval.",
                    'cNotificationType'  => 'W', // Warning / action needed
                    'cCategory'          => 'C', // client
                    'nReferenceId'       => $client->nClientId,
                    'bIsActionRequired'  => 1,
                    'strRoute'           => '/client?status=' . $this->statusCode('For Approval', 'P'),
                    'strData'            => [
                        'event'           => self::EVENT_SUBMITTED,
                        'clientId'        => (int) $client->nClientId,
                        'clientName'      => $client->strClientName,
                        'clientNickName'  => $client->strClientNickName,
                        'submittedBy'     => (int) $actor->nUserId,
                        'submittedByName' => $actorName,
                    ],
                    'nCreatedBy'         => $actor->nUserId,
                ]);
            }
        });
    }

    /**
     * Management approved the pending client.
     */
    public function notifyApproved(Client $client, ?User $actor): void
    {
        $this->notifyDecision($client, $actor, self::EVENT_APPROVED);
    }

    /**
     * Management deleted the pending request instead of approving it.
     */
    public function notifyDeleted(Client $client, ?User $actor): void
    {
        $this->notifyDecision($client, $actor, self::EVENT_DELETED);
    }

    private function notifyDecision(Client $client, ?User $actor, string $event): void
    {
        $pending     = $this->pendingNotifications($client);
        $submitterId = $pending->first()?->nCreatedBy;

        // Skip the echo when the same user submitted and decided the request.
        if ($submitterId && (!$actor || (int) $submitterId !== (int) $actor->nUserId)) {
            $submitter = User::find((int) $submitterId);

            if ($submitter) {
                $this->bestEffort(fn () => $this->notifications->sendToUser(
                    $submitter,
                    $this->decisionPayload($client, $actor, $event),
                ));
            }
        }

        // The request has been handled, so the shared "approval required"
        // rows should leave every Management feed.
        $this->bestEffort(fn () => $this->clearPending($pending));
    }

    /**
     * The direct notification sent back to the user who submitted the client.
     *
     * @return array<string, mixed>
     */
    private function decisionPayload(Client $client, ?User $actor, string $event): array
    {
        $approved   = $event === self::EVENT_APPROVED;
        $clientName = $this->clientName($client);
        $actorName  = $this->userName($actor);

        return [
            'strTitle'          => $approved ? 'Client approved' : 'Client request deleted',
            'strNotification'   => $approved
                ? "Your client request for {$clientName} was approved by {$actorName}."
                : "Your client request for {$clientName} was deleted by {$actorName}.",
            'cNotificationType' => $approved ? 'I' : 'W', // info / warning
            'cCategory'         => 'C', // client
            'nReferenceId'      => $client->nClientId,
            'bIsActionRequired' => 0,
            'strRoute'          => $approved
                ? '/client?status=' . $this->statusCode('Active', 'A')
                : '/client?status=' . $this->statusCode('For Approval', 'P'),
            'strData'           => [
                'event'         => $event,
                'clientId'      => (int) $client->nClientId,
                'clientName'    => $client->strClientName,
                'clientNickName' => $client->strClientNickName,
                'decidedBy'     => $actor?->nUserId,
                'decidedByName' => $actorName,
            ],
            'nCreatedBy'        => $actor?->nUserId,
        ];
    }

    /**
     * The shared role rows created when this client was submitted.
     *
     * @return Collection<int, Notification>
     */
    private function pendingNotifications(Client $client): Collection
    {
        return Notification::query()
            ->where('nReferenceId', $client->nClientId)
            ->where('cAudience', 'R')
            ->whereIn('cTargetRole', $this->managementRoles())
            ->whereNotNull('nCreatedBy')
            ->get()
            ->filter(
                fn (Notification $notification) =>
                    ($notification->strData['event'] ?? null) === self::EVENT_SUBMITTED
            )
            ->values();
    }

    /**
     * Remove the handled request rows and tell matching Management clients
     * to refresh their feeds.
     *
     * @param  Collection<int, Notification>  $pending
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
     * Roles the frontend groups under isManagement (M + G).
     *
     * @return array<int, string>
     */
    private function managementRoles(): array
    {
        $roles = (array) config('mappings.management_roles', ['M', 'G']);

        return array_values(array_unique(array_filter(array_map('strval', $roles))));
    }

    private function isPending(Client $client): bool
    {
        return (string) $client->cStatus === $this->statusCode('For Approval', 'P');
    }

    private function statusCode(string $label, string $fallback): string
    {
        $code = array_search($label, config('mappings.status_client', []), true);

        return $code !== false ? (string) $code : $fallback;
    }

    private function clientName(Client $client): string
    {
        return trim((string) $client->strClientNickName)
            ?: trim((string) $client->strClientName)
            ?: 'this client';
    }

    private function userName(?User $user): string
    {
        if (!$user) {
            return 'Management';
        }

        return trim((string) $user->strNickName)
            ?: trim(trim((string) $user->strFName) . ' ' . trim((string) $user->strLName))
            ?: 'Management';
    }

    private function bestEffort(callable $callback): void
    {
        try {
            $callback();
        } catch (Exception $e) {
            // A notification failure must never break the client action.
            report($e);
        }
    }
}
