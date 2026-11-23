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

    /**
     * Batch form of sync(): the same status rule for MANY orders with only
     * two queries (one for the orders + their items, one for the stock
     * totals) and a single bulk write. Used by a receive/deliver batch that
     * can touch several POs of one transaction.
     */
    public function syncMany(array $poIds, string $receivedStatus, string $deliveredStatus, string $paidStatus): void
    {
        $ids = array_values(array_unique(array_map('intval', $poIds)));
        if (!$ids) return;

        $pos = PurchaseOrder::with('purchaseOrderOptions.purchaseOption')
            ->whereIn('nPurchaseOrderId', $ids)
            ->get();
        if ($pos->isEmpty()) return;

        $itemIds = $pos->flatMap(fn($po) => $po->purchaseOrderOptions->pluck('purchaseOption'))
            ->filter()
            ->pluck('nPurchaseItemId')
            ->filter()
            ->unique()
            ->values();
        if ($itemIds->isEmpty()) return;

        $totals = Inventory::whereIn('nPurchaseItemId', $itemIds)
            ->whereIn('cStatus', ['A'])
            ->selectRaw('nPurchaseItemId,
                SUM(CASE WHEN nQuantity > 0 THEN nQuantity ELSE 0 END) AS received,
                ABS(SUM(CASE WHEN nQuantity < 0 THEN nQuantity ELSE 0 END)) AS delivered')
            ->groupBy('nPurchaseItemId')
            ->get()
            ->keyBy('nPurchaseItemId');

        $cancelled = (string) (array_search(
            'Cancelled',
            config('mappings.item_purchasing_status', []),
            true
        ) ?: '');

        $updates = [];
        foreach ($pos as $po) {
            // A cancelled order stays cancelled — same guard as sync().
            if ($cancelled !== '' && (string) $po->nStatus === $cancelled) continue;

            $items = $po->purchaseOrderOptions->pluck('purchaseOption')->filter();
            if ($items->isEmpty()) continue;

            $allReceived = $allDelivered = true;
            foreach ($items as $item) {
                $t = $totals->get($item->nPurchaseItemId);
                if ((int) ($t->received ?? 0) < (int) $item->nQuantity) $allReceived = false;
                if ((int) ($t->delivered ?? 0) < (int) $item->nQuantity) $allDelivered = false;
            }

            $status = match (true) {
                $allDelivered => $deliveredStatus,
                $allReceived  => $receivedStatus,
                default       => $paidStatus,
            };
            if ((string) $po->nStatus !== (string) $status) {
                $updates[] = [
                    'nPurchaseOrderId' => $po->nPurchaseOrderId,
                    'nStatus'          => $status,
                ];
            }
        }

        if ($updates) {
            PurchaseOrder::upsert($updates, ['nPurchaseOrderId'], ['nStatus']);
        }
    }
}