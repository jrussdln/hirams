<?php

namespace App\Services\Purchasing;

use App\Events\ItemPricingUpdated;
use App\Helpers\FormulaHelper;
use App\Models\ItemPricings;
use App\Models\PricingSet;
use App\Models\TransactionItems;
use App\Services\CrudService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Item pricing logic extracted from ItemPricingController.
 *
 * ItemPricingUpdated is (action, pricing set id, transaction id, item price
 * id) — the base broadcast() forwards a single id, so it is overridden here
 * to resolve the pricing set's transaction id exactly like the original
 * controller did (including using `find()`, whose null result reproduces the
 * original Error → 500 behaviour when the pricing set row is missing).
 */
class ItemPricingService extends CrudService
{
    protected string $entityName = 'Item Pricing';
    protected string $primaryKey = 'nItemPriceId';

    protected function modelClass(): string
    {
        return ItemPricings::class;
    }

    protected function eventClass(): ?string
    {
        return ItemPricingUpdated::class;
    }

    protected function broadcast(string $action, $reference): void
    {
        if (! $reference instanceof ItemPricings) {
            return;
        }

        $pricingSet = PricingSet::find($reference->nPricingSetId);

        broadcast(new ItemPricingUpdated($action, $reference->nPricingSetId, $pricingSet->nTransactionId, $reference->nItemPriceId))->toOthers();
    }

    /* ─────────────────────────────────────────────────────────────────
       INDEX
    ───────────────────────────────────────────────────────────────── */

    public function index(Request $request): Collection
    {
        if ($request->has('pricing_set_id')) {
            $pricingSetId     = $request->pricing_set_id;
            $pricingSet       = PricingSet::findOrFail($pricingSetId);
            $transactionItems = TransactionItems::where('nTransactionId', $pricingSet->nTransactionId)
                ->orderBy('nItemNumber')
                ->get();
            $existingPricings = $this->newQuery()->with(['pricingSet', 'transactionItem'])
                ->where('nPricingSetId', $pricingSetId)
                ->get()
                ->keyBy('nTransactionItemId');

            return $transactionItems->map(function ($item) use ($pricingSetId, $existingPricings) {
                $pricing = $existingPricings->get($item->nTransactionItemId);
                return [
                    'nItemPriceId'       => $pricing?->nItemPriceId ?? null,
                    'nPricingSetId'      => $pricingSetId,
                    'nTransactionItemId' => $item->nTransactionItemId,
                    'dUnitSellingPrice' => $pricing?->dUnitSellingPrice !== null
                        ? number_format((float) $pricing->dUnitSellingPrice, 2, '.', '')
                        : null,
                    'bPricingLocked'     => $pricing?->bPricingLocked ?? null,
                    'suggestivePrice'    => FormulaHelper::calculateSuggestivePrice($item->nTransactionItemId),
                    'tax'                => FormulaHelper::calculateTax($item->nTransactionItemId, $pricingSetId),
                ];
            });
        }

        $query = $this->newQuery()->with(['pricingSet', 'transactionItem']);

        if ($request->has('transaction_item_id')) {
            $query->where('nTransactionItemId', $request->transaction_item_id);
        }
        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->whereHas('transactionItem', function ($q) use ($search) {
                $q->where('strItemDescription', 'like', "%{$search}%");
            });
        }

        $query->orderBy(
            $request->get('sort_by', 'nItemPriceId'),
            $request->get('sort_order', 'desc')
        );

        $itemPricings = $query->get();
        $this->appendItemPricingsTable($itemPricings);

        return $itemPricings;
    }

    public function show($id): ItemPricings
    {
        return $this->newQuery()->with(['pricingSet', 'transactionItem'])
            ->findOrFail($id);
    }

    /* ─────────────────────────────────────────────────────────────────
       TAX
    ───────────────────────────────────────────────────────────────── */

    public function calculateTax(int $transactionItemId, int $pricingSetId, ?float $overrideUnitSellingPrice = null): float
    {
        return FormulaHelper::calculateTax(
            $transactionItemId,
            $pricingSetId,
            $overrideUnitSellingPrice
        );
    }

    /* ─────────────────────────────────────────────────────────────────
       STORE
    ───────────────────────────────────────────────────────────────── */

    /**
     * The duplicate-combination guard the controllers 409 on.
     * Pass $exceptItemPriceId to ignore one row (update semantics).
     */
    public function existsForCombination(int $pricingSetId, int $transactionItemId, ?int $exceptItemPriceId = null): bool
    {
        return $this->newQuery()
            ->where('nPricingSetId', $pricingSetId)
            ->where('nTransactionItemId', $transactionItemId)
            ->when($exceptItemPriceId !== null, fn($q) => $q->where('nItemPriceId', '!=', $exceptItemPriceId))
            ->exists();
    }

    public function create(array $data): ItemPricings
    {
        DB::beginTransaction();

        $itemPricing = ItemPricings::create([
            'nPricingSetId'      => $data['nPricingSetId'],
            'nTransactionItemId' => $data['nTransactionItemId'],
            'dUnitSellingPrice'  => $data['dUnitSellingPrice'],
            'bPricingLocked'     => $data['bPricingLocked'] ?? 0,
        ]);

        DB::commit();

        $this->broadcast('created', $itemPricing);

        return $itemPricing;
    }

    /* ─────────────────────────────────────────────────────────────────
       UPDATE
    ───────────────────────────────────────────────────────────────── */

    /**
     * The original broadcasts 'lock_toggled' (not 'updated') after every
     * successful update.
     */
    public function update(int $id, array $data): ItemPricings
    {
        $itemPricing = $this->find($id);

        DB::beginTransaction();
        $itemPricing->update($data);
        DB::commit();

        $this->broadcast('lock_toggled', $itemPricing);

        return $itemPricing;
    }

    /* ─────────────────────────────────────────────────────────────────
       DESTROY
    ───────────────────────────────────────────────────────────────── */

    public function delete(int $id): ItemPricings
    {
        $itemPricing = $this->find($id);

        DB::beginTransaction();
        $itemPricing->delete();
        DB::commit();

        $this->broadcast('deleted', $itemPricing);

        return $itemPricing;
    }

    /* ─────────────────────────────────────────────────────────────────
       BULK STORE  — matches frontend payload:
         { nPricingSetId, items: [{ nTransactionItemId, nItemPriceId, dUnitSellingPrice }] }
    ───────────────────────────────────────────────────────────────── */

    /**
     * @return array<int, array{nItemPriceId: mixed, nTransactionItemId: mixed}>
     */
    public function bulkStore(array $data): array
    {
        DB::beginTransaction();

        $results = [];

        foreach ($data['items'] as $item) {
            $price = ($item['dUnitSellingPrice'] !== null && $item['dUnitSellingPrice'] !== '')
                ? $item['dUnitSellingPrice']
                : 0; // ← treat empty/null as 0 instead of crashing

            $existing = !empty($item['nItemPriceId'])
                ? ItemPricings::find($item['nItemPriceId'])
                : ItemPricings::where('nPricingSetId', $data['nPricingSetId'])
                ->where('nTransactionItemId', $item['nTransactionItemId'])
                ->first();

            if ($existing) {
                $existing->update([
                    'dUnitSellingPrice' => $price,
                ]);
                $results[] = [
                    'nItemPriceId'       => $existing->nItemPriceId,
                    'nTransactionItemId' => $existing->nTransactionItemId,
                ];
            } else {
                $created = ItemPricings::create([
                    'nPricingSetId'      => $data['nPricingSetId'],
                    'nTransactionItemId' => $item['nTransactionItemId'],
                    'dUnitSellingPrice'  => $price,
                    'bPricingLocked'     => 0,
                ]);
                $results[] = [
                    'nItemPriceId'       => $created->nItemPriceId,
                    'nTransactionItemId' => $created->nTransactionItemId,
                ];
            }
        }

        DB::commit();
        $pricingSet = PricingSet::find($data['nPricingSetId']);
        broadcast(new ItemPricingUpdated('bulk_saved', $data['nPricingSetId'], $pricingSet->nTransactionId))->toOthers();

        return $results;
    }

    /* ─────────────────────────────────────────────────────────────────
       GET / DELETE BY PRICING SET
    ───────────────────────────────────────────────────────────────── */

    public function byPricingSet($pricingSetId): Collection
    {
        return $this->newQuery()->with(['transactionItem'])
            ->where('nPricingSetId', $pricingSetId)
            ->orderBy('nTransactionItemId')
            ->get();
    }

    public function deleteByPricingSet($pricingSetId): int
    {
        DB::beginTransaction();
        $count = $this->newQuery()->where('nPricingSetId', $pricingSetId)->delete();
        DB::commit();

        return $count;
    }

    /* ─────────────────────────────────────────────────────────────────
       PRIVATE HELPERS
    ───────────────────────────────────────────────────────────────── */

    private function appendItemPricingsTable($itemPricings): void
    {
        foreach ($itemPricings as $itemPricing) {
            $itemPricing->suggestivePrice = FormulaHelper::calculateSuggestivePrice($itemPricing->nTransactionItemId);
            $itemPricing->tax             = FormulaHelper::calculateTax($itemPricing->nTransactionItemId, $itemPricing->nPricingSetId);
        }
    }
}
