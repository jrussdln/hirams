<?php

namespace App\Services\Transactions;

use App\Events\TransactionUpdated;
use App\Models\ItemPricings;
use App\Models\Jev;
use App\Models\PricingSet;
use App\Models\PurchaseOptions;
use App\Models\TransactionHistory;
use App\Models\TransactionItems;
use App\Models\Transactions;
use Illuminate\Support\Facades\DB;

/**
 * Write side of TransactionController: store / update / destroy and JEV
 * creation, moved verbatim (broadcast calls and their position in the flow
 * are unchanged).
 *
 * Deliberately NOT extending CrudService: CrudService::create() broadcasts
 * straight after the insert, but a transaction must write its '100' history
 * row first; and CrudService::delete(): Model cannot express the 409
 * "still has linked records" outcome this delete must return. The generic
 * contracts therefore do not genuinely fit here.
 */
class TransactionService
{
    /**
     * Create a transaction + its initial '100' (Draft) history row, then
     * broadcast — history first, broadcast second, exactly as before.
     */
    public function create(array $data): Transactions
    {
        $transaction = Transactions::create($data);

        TransactionHistory::create([
            'nTransactionId' => $transaction->nTransactionId,
            'dtOccur'        => now(),
            'nStatus'        => '100',
            'nUserId'        => $data['nUserId'],
            'strRemarks'     => null,
        ]);

        broadcast(new TransactionUpdated('created', $transaction->nTransactionId))->toOthers();

        return $transaction;
    }

    public function update(int $id, array $data): Transactions
    {
        $transaction = Transactions::findOrFail($id);
        $transaction->update($data);

        broadcast(new TransactionUpdated('updated', $transaction->nTransactionId))->toOthers();

        return $transaction;
    }

    /**
     * Delete a transaction unless it still has linked items, pricing sets,
     * item pricings or purchase options.
     *
     * Returns null when the delete is blocked — the controller answers 409.
     */
    public function delete(int $id): ?Transactions
    {
        $transaction = Transactions::findOrFail($id);

        $hasItems = TransactionItems::where('nTransactionId', $transaction->nTransactionId)->exists();
        $hasPricingSets = PricingSet::where('nTransactionId', $transaction->nTransactionId)->exists();

        $hasItemPricings = ItemPricings::whereHas('transactionItem', fn($q) => $q->where('nTransactionId', $transaction->nTransactionId))
            ->orWhereHas('pricingSet', fn($q) => $q->where('nTransactionId', $transaction->nTransactionId))
            ->exists();

        $hasPurchaseOptions = PurchaseOptions::whereHas('transactionItem', fn($q) => $q->where('nTransactionId', $transaction->nTransactionId))
            ->exists();

        if ($hasItems || $hasPricingSets || $hasItemPricings || $hasPurchaseOptions) {
            return null;
        }

        $transaction->delete();
        broadcast(new TransactionUpdated('deleted', $id))->toOthers();

        return $transaction;
    }

    /**
     * Create the transaction's JEV (or return the existing one) inside a DB
     * transaction with the transaction row locked for update.
     */
    public function createJev(int $id): ?Jev
    {
        return DB::transaction(function () use ($id) {
            $txn = Transactions::lockForUpdate()->findOrFail($id);

            // already has one? return it, never create a second
            if ($txn->nJEVId) {
                return Jev::with('entries.journal_account.parent')->find($txn->nJEVId);
            }

            $new = Jev::create([
                'strJEVNumber' => Jev::generateNumber(),   // ← add
                'cJEVLinkType' => 'C',
                'dtOccur'      => now(),
                'cStatus'      => 'P',
            ]);

            $txn->nJEVId = $new->nJEVId;
            $txn->save();

            return Jev::with('entries.journal_account.parent')->find($new->nJEVId);
        });
    }
}
