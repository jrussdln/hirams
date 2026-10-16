<?php

namespace App\Services\Masters;

use App\Events\PricingSetUpdated;
use App\Helpers\FormulaHelper;
use App\Models\ItemPricings;
use App\Models\PricingSet;
use App\Models\Transactions;
use App\Services\CrudService;
use Illuminate\Support\Facades\DB;

/**
 * Pricing set CRUD + the computed price table and the choose() toggle.
 *
 * PricingSetUpdated carries the transaction id and the loaded pricing set,
 * so the broadcasts are issued inline instead of through CrudService's
 * (action, id) convention — eventClass() is intentionally left null.
 */
class PricingSetService extends CrudService
{
    protected string $entityName  = 'Pricing Set';
    protected string $primaryKey  = 'nPricingSetId';
    protected array  $searchable  = ['strName'];
    protected array  $defaultSort = ['bChosen', 'desc'];

    protected function modelClass(): string
    {
        return PricingSet::class;
    }

    /**
     * Listing with itemPricing counts and the computed price columns.
     */
    public function listing($transactionId = null)
    {
        $query = $this->newQuery()->withCount('itemPricings');

        if ($transactionId) {
            $query->where('nTransactionId', $transactionId);
        }

        $pricingSets = $query->orderByDesc('bChosen')
            ->orderByDesc('nPricingSetId')
            ->get();

        $this->appendPriceSetTable($pricingSets);

        return $pricingSets;
    }

    /**
     * Single pricing set with its item pricings loaded (show()).
     */
    public function findWithItems(int $id): PricingSet
    {
        return PricingSet::with('itemPricings')->findOrFail($id);
    }

    public function create(array $data): PricingSet
    {
        $pricingSet = PricingSet::create([
            'nTransactionId' => $data['nTransactionId'],
            'strName'        => $data['strName'],
        ]);

        // ✅ Broadcast with full data
        broadcast(new PricingSetUpdated(
            'created',
            $pricingSet->nPricingSetId,
            $pricingSet->nTransactionId,
            $pricingSet->load('itemPricings')
        ))->toOthers();

        return $pricingSet;
    }

    public function update(int $id, array $data): PricingSet
    {
        $pricingSet = $this->find($id);
        $pricingSet->update($data);

        // ✅ Broadcast with fresh full data
        broadcast(new PricingSetUpdated(
            'updated',
            $pricingSet->nPricingSetId,
            $pricingSet->nTransactionId,
            $pricingSet->fresh('itemPricings')
        ))->toOthers();

        return $pricingSet;
    }

    public function delete(int $id): PricingSet
    {
        $pricingSet = $this->find($id);
        $pricingSet->delete();

        // ✅ Broadcast deletion
        broadcast(new PricingSetUpdated(
            'deleted',
            $pricingSet->nPricingSetId,
            $pricingSet->nTransactionId,
            null
        ))->toOthers();

        return $pricingSet;
    }

    /**
     * Toggle the chosen set for the transaction inside a transaction.
     */
    public function choose(int $id): PricingSet
    {
        $pricingSet = $this->find($id);

        DB::transaction(function () use ($pricingSet) {
            if ($pricingSet->bChosen == 1) {
                $pricingSet->update(['bChosen' => 0]);
            } else {
                PricingSet::where('nTransactionId', $pricingSet->nTransactionId)
                    ->update(['bChosen' => 0]);
                $pricingSet->update(['bChosen' => 1]);
            }
        });

        $freshSet = $pricingSet->fresh('itemPricings');

        // ✅ Broadcast with fresh data after choose
        broadcast(new PricingSetUpdated(
            'chosen',
            $freshSet->nPricingSetId,
            $freshSet->nTransactionId,
            $freshSet
        ))->toOthers();

        return $freshSet;
    }

    /**
     * Append the computed item/price columns to every pricing set row.
     */
    private function appendPriceSetTable($pricingSets)
    {
        foreach ($pricingSets as &$pricingSet) {
            $transaction  = Transactions::with('transactionItems')->find($pricingSet->nTransactionId);
            $itemsWithABC = $transaction?->transactionItems->filter(fn($i) => $i->dUnitABC !== null) ?? collect();

            $totalABC = $transaction?->dTotalABC !== null
                ? (float) $transaction->dTotalABC
                : $itemsWithABC->sum('dUnitABC');

            $pricedCount = ItemPricings::where('nPricingSetId', $pricingSet->nPricingSetId)
                ->whereNotNull('dUnitSellingPrice')
                ->where('dUnitSellingPrice', '>', 0)
                ->count();

            $pricingSet->item              = $pricedCount . '/' . ($transaction?->transactionItems->count() ?? 0);
            $pricingSet->totalSellingPrice = FormulaHelper::calculateTotalSellingPrice($pricingSet->nPricingSetId);
            $pricingSet->totalABC          = $totalABC;
            $pricingSet->diveAmount        = $totalABC - $pricingSet->totalSellingPrice;
            $pricingSet->divePercentage    = $totalABC > 0
                ? round(($pricingSet->diveAmount / $totalABC) * 100, 2) . '%'
                : '0.00%';
        }
    }
}
