<?php

namespace App\Services\Masters;

use App\Events\TransactionUpdated;
use App\Events\ClientUpdated;
use App\Models\Client;
use App\Models\Transactions;
use App\Services\CrudService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection as SupportCollection;
use RuntimeException;

/**
 * Client CRUD + the client-specific active list.
 */
class ClientService extends CrudService
{
    protected string $entityName = 'Client';
    protected string $primaryKey = 'nClientId';
    protected array  $searchable = ['strClientName', 'strAddress', 'strContactPerson'];
    protected array  $defaultSort = ['strClientName', 'asc'];

    protected function modelClass(): string
    {
        return Client::class;
    }

    protected function eventClass(): ?string
    {
        return ClientUpdated::class;
    }

    /**
     * The listing carries how many transactions each client holds — the UI
     * swaps Delete for Transfer on the clients that have any.
     */
    public function search(?string $term = null): Builder
    {
        return parent::search($term)->withCount('transactions');
    }

    /**
     * Clients whose status is the first code in `mappings.status_client`.
     */
    public function activeClients()
    {
        $statusCodes = array_keys(config('mappings.status_client'));

        return $this->newQuery()
            ->where('cStatus', $statusCodes[0])
            ->orderBy('strClientName', 'asc')
            ->get();
    }

    /**
     * The status code that marks a client ACTIVE.
     */
    public function activeStatusCode(): string
    {
        $statusCodes = array_keys(config('mappings.status_client'));

        return (string) ($statusCodes[0] ?? '');
    }

    /**
     * TRUE when the client still carries transactions — such a client
     * cannot be deleted, it has to be transferred first.
     */
    public function hasTransactions(int $id): bool
    {
        return Transactions::where('nClientId', $id)->exists();
    }

    /**
     * The transactions that name a client, newest first.
     *
     * @return SupportCollection<int, array>
     */
    public function clientTransactions(int $clientId): SupportCollection
    {
        return Transactions::with(['latestHistory'])
            ->withCount('transactionItems')
            ->where('nClientId', $clientId)
            ->orderByDesc('nTransactionId')
            ->get()
            ->map(fn ($transaction) => $this->formatTransaction($transaction));
    }

    /**
     * Moves transactions from one client to another.
     *
     * The destination must be an ACTIVE client — an inactive one would only
     * move the problem. Nothing else on the transaction changes: its items,
     * prices, JEV and purchase orders all stay exactly as they are; only
     * the client it belongs to moves.
     *
     * @param  array<int>  $transactionIds  the transactions to move — empty
     *                                       means ALL of the client's.
     * @return int  the number of transactions that moved.
     */
    public function transferTransactions(int $clientId, int $targetClientId, array $transactionIds = []): int
    {
        $target = $this->find($targetClientId);

        if ((string) $target->cStatus !== $this->activeStatusCode()) {
            throw new RuntimeException('The destination client must be an active client.');
        }

        if ($targetClientId === $clientId) {
            throw new RuntimeException('The destination client must be different from the client being transferred.');
        }

        $query = Transactions::where('nClientId', $clientId);

        if ($transactionIds !== []) {
            $query->whereIn('nTransactionId', $transactionIds);
        }

        $transactions = $query->get();

        $moved = 0;

        foreach ($transactions as $transaction) {
            $transaction->update(['nClientId' => $targetClientId]);

            broadcast(new TransactionUpdated(
                'updated',
                (int) $transaction->nTransactionId,
                null
            ))->toOthers();

            $moved++;
        }

        return $moved;
    }

    /**
     * One transaction, flattened for the transfer modal.
     */
    private function formatTransaction(Transactions $transaction): array
    {
        $status = $transaction->latestHistory?->nStatus;

        $statusLabels = config('mappings.status_transaction', []);
        $statusLabel  = $status !== null
            ? ($statusLabels[(string) $status] ?? null)
            : null;

        return [
            'nTransactionId'    => $transaction->nTransactionId,
            'strCode'           => $transaction->strCode,
            'strTitle'          => $transaction->strTitle,
            'strRefNumber'      => $transaction->strRefNumber,
            'cItemType'         => $transaction->cItemType,
            'cProcMode'         => $transaction->cProcMode,
            'dTotalABC'         => $transaction->dTotalABC,
            'dtDocSubmission'   => $transaction->dtDocSubmission,
            'dtAODueDate'       => $transaction->dtAODueDate,
            'current_status'    => $status,
            'current_status_label' => $statusLabel,
            'items_count'       => (int) $transaction->transaction_items_count,
        ];
    }
}
