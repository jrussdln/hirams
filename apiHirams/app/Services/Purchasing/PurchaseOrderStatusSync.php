<?php

namespace App\Services\Purchasing;

use App\Models\Inventory;
use App\Models\PurchaseOrder;

class PurchaseOrderStatusSync
{
    public function sync(int $poId, string $receivedStatus, string $deliveredStatus, string $paidStatus): void
    {
        $po = PurchaseOrder::with('purchaseOrderOptions.purchaseOption')->findOrFail($poId);

        // A CANCELLED purchase order stays cancelled. This routine re-derives
        // the status from the stock, so without the guard a receipt or a
        // delivery booked against a cancelled order would bring it back to
        // life (and the status it was cancelled from).
        $cancelled = (string) (array_search(
            'Cancelled',
            config('mappings.item_purchasing_status', []),
            true
        ) ?: '');
        if ($cancelled !== '' && (string) $po->nStatus === $cancelled) {
            return;
        }

        $items = $po->purchaseOrderOptions->pluck('purchaseOption')->filter();
        if ($items->isEmpty()) return;

        $totals = Inventory::whereIn('nPurchaseItemId', $items->pluck('nPurchaseItemId'))
            ->whereIn('cStatus', ['A'])
            ->selectRaw('nPurchaseItemId,
                SUM(CASE WHEN nQuantity > 0 THEN nQuantity ELSE 0 END) AS received,
                ABS(SUM(CASE WHEN nQuantity < 0 THEN nQuantity ELSE 0 END)) AS delivered')
            ->groupBy('nPurchaseItemId')
            ->get()
            ->keyBy('nPurchaseItemId');

        $allReceived = $allDelivered = true;
        foreach ($items as $item) {
            $t = $totals->get($item->nPurchaseItemId);
            if ((int) ($t->received ?? 0)  < (int) $item->nQuantity) $allReceived  = false;
            if ((int) ($t->delivered ?? 0) < (int) $item->nQuantity) $allDelivered = false;
        }

        $po->nStatus = match (true) {
            $allDelivered => $deliveredStatus,
            $allReceived  => $receivedStatus,
            default       => $paidStatus,
        };
        $po->save();
    }
}