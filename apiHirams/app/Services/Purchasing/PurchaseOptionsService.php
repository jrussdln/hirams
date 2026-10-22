<?php

namespace App\Services\Purchasing;

use App\Events\OptionUpdated;
use App\Helpers\FormulaHelper;
use App\Models\PurchaseOptions;
use App\Models\Supplier;
use App\Models\TransactionItems;
use App\Services\CrudService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection as SupportCollection;
use Illuminate\Support\Facades\DB;

/**
 * Purchase option CRUD + the option-specific helpers extracted from
 * PurchaseOptionsController.
 */
class PurchaseOptionsService extends CrudService
{
    protected string $entityName = 'Purchase Option';
    protected string $primaryKey = 'nPurchaseItemId';

    protected function modelClass(): string
    {
        return PurchaseOptions::class;
    }

    protected function eventClass(): ?string
    {
        return OptionUpdated::class;
    }

    /**
     * OptionUpdated takes FOUR arguments (action, purchase item id,
     * transaction item id, transaction id) while the base broadcast() only
     * forwards the primary key — so the event has to be constructed here.
     */
    protected function broadcast(string $action, $reference): void
    {
        $option = $reference instanceof Model
            ? $reference
            : $this->newQuery()->findOrFail((int) $reference);

        $item = TransactionItems::findOrFail($option->nTransactionItemId);

        broadcast(new OptionUpdated($action, $option->nPurchaseItemId, $item->nTransactionItemId, $item->nTransactionId))->toOthers();
    }

    /**
     * Reproduces the original store(): build the model row from the validated
     * payload (request keys → table columns), then broadcast.
     */
    public function create(array $data): PurchaseOptions
    {
        $purchaseOption = PurchaseOptions::create([
            'nTransactionItemId'      => $data['nTransactionItemId'],
            'nSupplierId'             => $data['nSupplierId'] ?? null,
            'nSupplierContactId'      => $data['nSupplierContactId'] ?? null,
            'nQuantity'               => $data['quantity'],
            'strUOM'                  => $data['uom'],
            'strBrand'                => $data['brand'] ?? null,
            'strModel'                => $data['model'] ?? null,
            'strSpecs'                => $data['specs'] ?? null,
            'dUnitPrice'              => $data['unitPrice'],
            // The EWT is DERIVED from the line's EWT type (and from the
            // supplier's flags when the type is the default) — it is not
            // stored, the model computes it.
            'cEWTType'                => $data['cEWTType'] ?? null,
            'bIncluded'               => $data['bIncluded'] ?? 1,
            'bAddOn'                  => $data['bAddOn'] ?? 0,
            'dtCanvass'               => now(),
            'dPurchaseUnitPrice'      => $data['dPurchaseUnitPrice'] ?? null,
            'bPurchaseIncluded'       => $data['bPurchaseIncluded'] ?? null,
            'cPurchaseUnitPriceStatus' => $data['cPurchaseUnitPriceStatus'] ?? null,
        ]);

        $this->broadcast('created', $purchaseOption);

        return $purchaseOption;
    }

    /**
     * Nullable fields keep their previous value when absent from the payload,
     * matching the original controller's `?? $purchaseOption->...` fallbacks.
     */
    public function update(int $id, array $data): PurchaseOptions
    {
        $purchaseOption = $this->find($id);

        // cEWTType is special: NULL is a MEANINGFUL value (it means
        // "Default"), so "present but null" must reset the line back to the
        // default formula — only an absent key keeps the current type.
        $ewtType = array_key_exists('cEWTType', $data)
            ? $data['cEWTType']
            : $purchaseOption->cEWTType;

        // ── The FOR PURCHASE stage: an INCLUDED option's price is LOCKED ──
        // dUnitPrice is the CANVASSED price — the one the transaction was
        // priced with — so it must not move behind the transaction's back.
        // The new price is recorded as a PENDING purchase price instead
        // (dPurchaseUnitPrice + cPurchaseUnitPriceStatus = 'P'); it only
        // counts once it is approved ('A').
        // The canvass date (dtCanvass) is left exactly as it is — for now.
        if ($this->locksUnitPrice($purchaseOption) && array_key_exists('unitPrice', $data)) {
            $newPrice = $data['unitPrice'];

            if ($newPrice !== null && (float) $newPrice !== (float) $purchaseOption->getRawOriginal('dUnitPrice')) {
                $purchaseOption->update([
                    'dPurchaseUnitPrice'       => $newPrice,
                    'cPurchaseUnitPriceStatus' => PurchaseOptions::purchasePriceStatus()['pending'],
                ]);
            }

            // dUnitPrice stays exactly as it was canvassed.
            unset($data['unitPrice']);
        }

        $purchaseOption->update([
            'nSupplierId'        => $data['nSupplierId']        ?? $purchaseOption->nSupplierId,
            'nQuantity'          => $data['quantity']            ?? $purchaseOption->nQuantity,
            'strUOM'             => $data['uom']                 ?? $purchaseOption->strUOM,
            'strBrand'           => $data['brand']               ?? $purchaseOption->strBrand,
            'strModel'           => $data['model']               ?? $purchaseOption->strModel,
            'strSpecs'           => $data['specs']               ?? $purchaseOption->strSpecs,
            // The RAW canvassed price — never the effective one, or a
            // pending purchase price would be written over it.
            'dUnitPrice'         => $data['unitPrice']           ?? $purchaseOption->getRawOriginal('dUnitPrice'),
            // The EWT itself is derived (the model computes it) — only the
            // TYPE is stored.
            'cEWTType'           => $ewtType,
            'bIncluded'          => $data['bIncluded']           ?? $purchaseOption->bIncluded,
            'bAddOn'             => $data['bAddOn']               ?? $purchaseOption->bAddOn,
            'nSupplierContactId' => $data['nSupplierContactId']  ?? $purchaseOption->nSupplierContactId, // ← fixed
            'bPurchaseIncluded'  => $data['bPurchaseIncluded']   ?? $purchaseOption->bPurchaseIncluded,
        ]);

        $this->broadcast('updated', $purchaseOption);

        return $purchaseOption;
    }

    /**
     * TRUE when the option's unit price must NOT move: the transaction is
     * at the FOR PURCHASE stage and the option is part of the item's
     * selection (bIncluded).
     *
     * The canvassed price is what the transaction was priced with — at the
     * purchase stage the price is renegotiated, but the old one stays on
     * the record (see update()).
     */
    private function locksUnitPrice(PurchaseOptions $option): bool
    {
        // Only an option that is part of the item's selection is locked.
        if ((int) $option->bIncluded !== 1) {
            return false;
        }

        $forPurchase = $this->transactionStatusCode('For Purchase/Delivery');
        if ($forPurchase === '') {
            return false;
        }

        $transaction = $option->transactionItem?->transaction;
        if (!$transaction) {
            return false;
        }

        // The transaction's current status lives on its LATEST history row.
        $currentStatus = $transaction->latestHistory?->nStatus;

        return (string) $currentStatus === $forPurchase;
    }

    /**
     * A transaction status code, looked up BY NAME in config/mappings.php.
     */
    private function transactionStatusCode(string $label): string
    {
        $map = config('mappings.status_transaction', []);

        return (string) (array_search($label, $map, true) ?: '');
    }

    /**
     * The transaction item row must be loaded BEFORE the option is deleted —
     * the broadcast needs its transaction id (same order as the original
     * destroy(), which CrudService::delete() would not preserve).
     */
    public function delete(int $id): PurchaseOptions
    {
        $option = $this->find($id);
        $item = TransactionItems::findOrFail($option->nTransactionItemId);
        $option->delete();

        broadcast(new OptionUpdated('deleted', $id, $item->nTransactionItemId, $item->nTransactionId))->toOthers();

        return $option;
    }

    public function updateSpecs(int $id, array $data): PurchaseOptions
    {
        $purchaseOption = $this->find($id);
        $purchaseOption->update([
            'strSpecs' => $data['specs'] ?? $purchaseOption->strSpecs,
        ]);

        $this->broadcast('specs_updated', $purchaseOption);

        return $purchaseOption;
    }

    /**
     * @return SupportCollection<int, array>
     */
    public function byItem(int $itemId): SupportCollection
    {
        return $this->newQuery()
            // The EWT is derived from the supplier and the transaction's
            // item type — load both, or every row costs two queries.
            ->with(['supplier', 'transactionItem.transaction'])
            ->where('nTransactionItemId', $itemId)
            ->orderBy('bAddOn', 'asc')
            ->orderBy('bIncluded', 'desc')
            ->get()
            ->map(fn($option) => $this->formatOption($option));
    }

    /**
     * @return SupportCollection<int, array>
     */
    public function addOnsByItem(int $itemId): SupportCollection
    {
        return $this->newQuery()
            // The EWT is derived from the supplier and the transaction's
            // item type — load both, or every row costs two queries.
            ->with(['supplier', 'transactionItem.transaction'])
            ->where('nTransactionItemId', $itemId)
            ->where('bAddOn', 1)
            ->get()
            ->map(fn($option) => $this->formatOption($option));
    }

    /**
     * EWT depends on the supplier's VAT / EWT flags, so the supplier row is
     * loaded here before delegating to the formula helper.
     *
     * The line's EWT TYPE (cEWTType) wins over the supplier's flags: it is
     * the per-line bypass of the default matrix.
     */
    public function calculateEWT(array $validated): float
    {
        $supplier = Supplier::findOrFail($validated['nSupplierId']);

        return FormulaHelper::calculateEWT(
            $validated['quantity'],
            $validated['unitPrice'],
            $supplier,
            $validated['cItemType'],
            $validated['cEWTType'] ?? null
        );
    }

    /**
     * The purchase options that match a brand / model / item name.
     *
     * NOTE the return type: mapping an Eloquent collection to plain arrays
     * hands back a SUPPORT collection (Eloquent's map() drops to base as
     * soon as the items are no longer models) — so the signature below is
     * the support one. Declaring it as the Eloquent collection made every
     * call throw a TypeError, and the endpoint answered with a 500 — which
     * the modal reads as "no results found".
     *
     * @return \Illuminate\Support\Collection<int, array>
     */
    public function suggestions(array $validated): SupportCollection
    {
        $search     = trim($validated['search']);
        $supplierId = $validated['supplierId'] ?? null;

        $query = $this->newQuery()
            // The EWT is derived from the supplier and the transaction's
            // item type — load both, or every row costs two queries.
            ->with(['supplier', 'transactionItem.transaction'])
            ->where(function ($q) use ($search) {
                $q->where('strBrand', 'LIKE', "%{$search}%")
                    ->orWhere('strModel', 'LIKE', "%{$search}%");
            });

        // Hard-filter to the selected supplier when one is provided
        if ($supplierId) {
            $query->where('nSupplierId', $supplierId);
        }

        return $query
            ->orderBy('dtCanvass', 'desc')   // most recent first
            ->limit(10)
            ->get()
            ->map(fn($option) => [
                'brand'        => $option->strBrand,
                'model'        => $option->strModel,
                'nSupplierId'  => $option->nSupplierId,
                'supplierName' => $option->supplier?->strSupplierName ?? null,
                'supplierNickName' => $option->supplier?->strSupplierNickName ?? null,
                'quantity'     => $option->nQuantity,
                'uom'          => $option->strUOM,
                'unitPrice'    => $option->dUnitPrice,
                'ewt'          => $option->dEWT,
                'cEWTType'     => $option->cEWTType,
                'specs'        => $option->strSpecs,
                'dtCanvass'    => $option->dtCanvass,
            ])
            // Deduplicate by brand+model+supplierId combo
            ->unique(fn($s) => implode('|', [$s['brand'], $s['model'], $s['nSupplierId']]))
            ->values();
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private function formatOption($option): array
    {
        return [
            'id'                 => $option->nPurchaseItemId,
            'nPurchaseItemId'  => $option->nPurchaseItemId,
            'nTransactionItemId' => $option->nTransactionItemId,
            'nSupplierId'        => $option->nSupplierId,
            'supplierName'       => $option->supplier?->strSupplierName ?? null,
            'supplierNickName'   => $option->supplier?->strSupplierNickName ?? null,
            'nQuantity'          => $option->nQuantity,
            'strUOM'             => $option->strUOM,
            'strBrand'           => $option->strBrand,
            'strModel'           => $option->strModel,
            'strSpecs'           => $option->strSpecs,
            'dUnitPrice'         => $option->dUnitPrice,
            'dEWT'               => $option->dEWT,
            'cEWTType'           => $option->cEWTType,
            'strProductCode'     => $option->strProductCode,
            'bIncluded'          => (bool) $option->bIncluded,
            'bPurchaseIncluded'  => (bool) $option->bPurchaseIncluded,  // ← ADD
            'bAddOn'             => (bool) $option->bAddOn,
            'nSupplierContactId' => $option->nSupplierContactId,
            'dtCanvass'          => $option->dtCanvass,
            'dPurchaseUnitPrice'       => $option->dPurchaseUnitPrice,        // ← ADD
            'cPurchaseUnitPriceStatus' => $option->cPurchaseUnitPriceStatus,  // ← ADD
            // ← ADD (also missing)
        ];
    }

    // -------------------------------------------------------------------------
    // Purchase item history reads (moved from PurchaseItemHistoryService)
    // -------------------------------------------------------------------------

    private function historyStatusCodes(): array
    {
        return [
            'for_approval' => '120',
            'for_payment'  => '130',
            'delivered'    => '160',
            'cancelled'    => '170',
        ];
    }

    /**
     * Latest history row per purchase item; a For Payment ('130') row whose
     * voucher was cancelled (cStatus 'X') falls back to For Approval ('120').
     *
     * @param  array  $itemIds  the validated `nPurchaseItemId` array.
     * @return \Illuminate\Support\Collection
     */
    public function latestHistories(array $itemIds)
    {
        $codes = $this->historyStatusCodes();

        return DB::table('tblpurchaseitemhistories')
            ->join('tblpurchaseorder_items', 'tblpurchaseitemhistories.nPurchaseOrder_ItemId', '=', 'tblpurchaseorder_items.nPurchaseOrder_ItemId')
            ->join('tblpurchaseorders', 'tblpurchaseorder_items.nPurchaseOrderId', '=', 'tblpurchaseorders.nPurchaseOrderId')
            ->whereIn('tblpurchaseorder_items.nPurchaseItemId', $itemIds)
            ->select([
                'tblpurchaseitemhistories.nPurchaseItemHistoryId',
                'tblpurchaseitemhistories.nPurchaseOrder_ItemId',
                'tblpurchaseorder_items.nPurchaseItemId',
                'tblpurchaseorder_items.nPurchaseOrderId',
                'tblpurchaseitemhistories.nStatus',
                'tblpurchaseorders.nStatus as po_nStatus',
                'tblpurchaseitemhistories.nUserId',
                'tblpurchaseitemhistories.dtOccur',
            ])
            ->orderByDesc('tblpurchaseitemhistories.dtOccur')
            ->get()
            ->groupBy('nPurchaseItemId')
            ->map(function ($group) use ($codes) {
                $latest = $group->first();

                // If status = For Payment ('130') but voucher cancelled -> fallback to For Approval ('120')
                if ((string)$latest->nStatus === (string)$codes['for_payment']) {
                    $voucherStatus = DB::table('tblvoucher_suppliers')
                        ->join('tblvouchers', 'tblvoucher_suppliers.nVoucherId', '=', 'tblvouchers.nVoucherId')
                        ->where('tblvoucher_suppliers.nPurchaseOrderId', $latest->nPurchaseOrderId)
                        ->value('tblvouchers.cStatus');

                    if ((string)$voucherStatus === 'X') {
                        $latest->nStatus = $codes['for_approval'];
                    }
                }
                return $latest;
            })
            ->values();
    }

    /**
     * Every history row for one purchase option, with the user's names.
     */
    public function allOptionHistory(int $nPurchaseItemId)
    {
        return DB::table('tblpurchaseitemhistories')
            ->join('tblpurchaseorder_items', 'tblpurchaseitemhistories.nPurchaseOrder_ItemId', '=', 'tblpurchaseorder_items.nPurchaseOrder_ItemId')
            ->join('tblpurchaseorders', 'tblpurchaseorder_items.nPurchaseOrderId', '=', 'tblpurchaseorders.nPurchaseOrderId')
            ->leftJoin('tblusers', 'tblpurchaseitemhistories.nUserId', '=', 'tblusers.nUserId')
            ->where('tblpurchaseorder_items.nPurchaseItemId', $nPurchaseItemId)
            ->select([
                'tblpurchaseitemhistories.nPurchaseItemHistoryId',
                'tblpurchaseitemhistories.nPurchaseOrder_ItemId',
                'tblpurchaseorder_items.nPurchaseItemId',
                'tblpurchaseitemhistories.nStatus',
                'tblpurchaseorders.nStatus as po_nStatus',
                'tblpurchaseitemhistories.nUserId',
                'tblpurchaseitemhistories.dtOccur',
                'tblusers.strFName', 'tblusers.strMName', 'tblusers.strLName', 'tblusers.strNickName', 'tblusers.strProfileImage',
            ])
            ->orderByDesc('tblpurchaseitemhistories.dtOccur')
            ->get();
    }
}
