<?php

namespace App\Services\Purchasing;

use App\Events\InventoryUpdated;
use App\Events\PurchaseOrderUpdated;
use App\Models\Inventory;
use App\Models\Jev;
use App\Models\PurchaseOptions;
use App\Models\PurchaseOrderOption;
use App\Models\SerialNumber;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Posting stock movements: bulk receive/deliver batches (with serial numbers
 * and PO status re-sync) and linking JEVs to pending inventory rows.
 */
class InventoryMovementService
{
    /**
     * Create pending inventory rows (+ serial numbers) for a receive/deliver
     * batch, then re-evaluate and broadcast the status of every purchase
     * order holding a touched item.
     *
     * @return array<int, int> created inventory ids
     */
    public function bulkReceiveDeliver(array $v): array
    {
        $sign    = $v['mode'] === 'receive' ? 1 : -1;
        $itemIds = collect($v['items'])->pluck('nPurchaseItemId')->unique()->values();

        $createdIds = DB::transaction(function () use ($v, $sign, $itemIds) {
            // One query for current totals of every affected item
            $totals = Inventory::whereIn('nPurchaseItemId', $itemIds)
                ->whereIn('cStatus', ['A', 'P'])
                ->selectRaw('nPurchaseItemId,
                SUM(CASE WHEN nQuantity > 0 THEN nQuantity ELSE 0 END) AS received,
                ABS(SUM(CASE WHEN nQuantity < 0 THEN nQuantity ELSE 0 END)) AS delivered')
                ->groupBy('nPurchaseItemId')
                ->lockForUpdate()
                ->get()->keyBy('nPurchaseItemId');

            // Delivered totals are already in $totals (approved + pending),
            // same figures the UI shows as "To Deliver".

            $ordered = PurchaseOptions::whereIn('nPurchaseItemId', $itemIds)
                ->pluck('nQuantity', 'nPurchaseItemId');

            $now = now();
            $ids = [];
            $snRows = [];

            foreach ($v['items'] as $it) {
                $pid = $it['nPurchaseItemId'];
                $qty = (int) $it['nQuantity'];
                $t   = $totals->get($pid);
                $rec = (int) ($t->received ?? 0);
                $del = (int) ($t->delivered ?? 0);

                if ($sign === 1) {
                    if ($rec + $qty > (int) ($ordered[$pid] ?? 0)) {
                        throw ValidationException::withMessages(["items" => "Item {$pid}: receiving {$qty} exceeds the ordered quantity."]);
                    }
                } else {
                    // Deliverable = received (approved + pending) − delivered,
                    // so goods already on hand can go out before approval.
                    $free = $rec - $del;
                    if ($qty > $free) {
                        throw ValidationException::withMessages(["items" => "Item {$pid}: only {$free} left to deliver."]);
                    }
                }

                $inv = Inventory::create([
                    'nPurchaseItemId'  => $pid,
                    'nQuantity'        => $sign * $qty,
                    'strReceiptNumber' =>
                        ($it['strReceiptNumber'] ?? '') !== ''
                            ? trim($it['strReceiptNumber'])
                            : null,   // optional
                    'cStatus'          => 'P',
                    'dtLog'            => $now,
                ]);
                $ids[] = $inv->nInventoryId;

                foreach ($it['serials'] ?? [] as $sn) {
                    $snRows[] = [
                        'nInventoryId'    => $inv->nInventoryId,
                        'strSerialNumber' => $sn,
                        'dtLog'           => $now,
                    ];
                }
            }

            // One INSERT for all serial numbers
            foreach (array_chunk($snRows, 500) as $chunk) {
                SerialNumber::insert($chunk);
            }

            return $ids;
        });

        // One delivery can be split over several purchase items (one per
        // supplier entry), so every PO holding a touched item has to be
        // re-evaluated — not only the PO the request came from.
        $syncPoIds = [];
        if (
            !empty($v['nReceivedStatus']) &&
            !empty($v['nDeliveredStatus']) &&
            !empty($v['nPaidStatus'])
        ) {
            if (!empty($v['nPurchaseOrderId'])) {
                $syncPoIds[] = (int) $v['nPurchaseOrderId'];
            }
            foreach (
                PurchaseOrderOption::whereIn('nPurchaseItemId', $itemIds)->pluck('nPurchaseOrderId') as $poId
            ) {
                $syncPoIds[] = (int) $poId;
            }
            $syncPoIds = array_values(array_unique($syncPoIds));
        }

        foreach ($syncPoIds as $poId) {
            app(PurchaseOrderStatusSync::class)->sync(
                $poId,
                $v['nReceivedStatus'],
                $v['nDeliveredStatus'],
                $v['nPaidStatus']
            );
        }

        // ONE broadcast for the whole batch
        broadcast(new InventoryUpdated('bulk_' . $v['mode'], $createdIds[0]))->toOthers();
        foreach ($syncPoIds as $poId) {
            broadcast(new PurchaseOrderUpdated('status_synced', $poId))->toOthers();
        }

        return $createdIds;
    }

    /**
     * Create a JEV for all pending (cStatus = 'P') received inventory rows
     * belonging to a purchase item, and stamp its nJEVId onto those rows.
     *
     * @return array{jev: Jev, updatedIds: \Illuminate\Support\Collection}
     */
    public function createJevForPending(int $nPurchaseItemId): array
    {
        $result = DB::transaction(function () use ($nPurchaseItemId) {
            // Only rows that are: this item, pending, RECEIVED (positive qty),
            // and not already linked to a JEV
            $pendingRows = Inventory::where('nPurchaseItemId', $nPurchaseItemId)
                ->where('cStatus', 'P')
                ->where('nQuantity', '>', 0)
                ->whereNull('nJEVId')
                ->get();

            if ($pendingRows->isEmpty()) {
                throw new Exception('No pending received batches to attach to a JEV.');
            }

            $jev = Jev::create([
                'strJEVNumber' => Jev::generateNumber(),   // ← add
                'cJEVLinkType' => 'R',
                'dtOccur'      => now(),
                'cStatus'      => 'P',
            ]);

            Inventory::whereIn('nInventoryId', $pendingRows->pluck('nInventoryId'))
                ->update(['nJEVId' => $jev->nJEVId]);

            return ['jev' => $jev, 'updatedIds' => $pendingRows->pluck('nInventoryId')];
        });

        broadcast(new InventoryUpdated('jev_created', $nPurchaseItemId))->toOthers();

        return $result;
    }

    /**
     * Same as createJevForPending(), for delivered (negative qty) rows.
     *
     * @return array{jev: Jev, updatedIds: \Illuminate\Support\Collection}
     */
    public function createJevForPendingDelivered(int $nPurchaseItemId): array
    {
        $result = DB::transaction(function () use ($nPurchaseItemId) {
            $pendingRows = Inventory::where('nPurchaseItemId', $nPurchaseItemId)
                ->where('cStatus', 'P')
                ->where('nQuantity', '<', 0)   // ← delivered rows are negative
                ->whereNull('nJEVId')
                ->get();

            if ($pendingRows->isEmpty()) {
                throw new Exception('No pending delivered batches to attach to a JEV.');
            }

            $jev = Jev::create([
                'strJEVNumber' => Jev::generateNumber(),   // ← add
                'cJEVLinkType' => 'D',
                'dtOccur'      => now(),
                'cStatus'      => 'P',
            ]);

            Inventory::whereIn('nInventoryId', $pendingRows->pluck('nInventoryId'))
                ->update(['nJEVId' => $jev->nJEVId]);

            return ['jev' => $jev, 'updatedIds' => $pendingRows->pluck('nInventoryId')];
        });

        broadcast(new InventoryUpdated('jev_created', $nPurchaseItemId))->toOthers();

        return $result;
    }

    /**
     * Create one JEV per purchase item for all of its pending, unlinked rows
     * (received or delivered, chosen by $v['type']).
     *
     * @return array<int, array{nPurchaseItemId: int|string, nJEVId: int|string, updatedIds: \Illuminate\Support\Collection}>
     */
    public function bulkCreateJev(array $v): array
    {
        $isReceived = $v['type'] === 'received';

        $created = DB::transaction(function () use ($v, $isReceived) {
            // One query for every pending, unlinked row across all items
            $rows = Inventory::whereIn('nPurchaseItemId', $v['nPurchaseItemIds'])
                ->where('cStatus', 'P')
                ->where('nQuantity', $isReceived ? '>' : '<', 0)
                ->whereNull('nJEVId')
                ->lockForUpdate()
                ->get(['nInventoryId', 'nPurchaseItemId'])
                ->groupBy('nPurchaseItemId');

            if ($rows->isEmpty()) {
                throw new Exception('No pending batches to attach to a JEV.');
            }

            $now = now();
            $result = [];

            foreach ($rows as $purchaseItemId => $group) {
                $jev = Jev::create([
                    'strJEVNumber' => Jev::generateNumber(),   // ← add
                    'cJEVLinkType' => $isReceived ? 'R' : 'D',
                    'dtOccur'      => $now,
                    'cStatus'      => 'P',
                ]);

                Inventory::whereIn('nInventoryId', $group->pluck('nInventoryId'))
                    ->update(['nJEVId' => $jev->nJEVId]);

                $result[] = [
                    'nPurchaseItemId' => $purchaseItemId,
                    'nJEVId'          => $jev->nJEVId,
                    'updatedIds'      => $group->pluck('nInventoryId')->values(),
                ];
            }

            return $result;
        });

        broadcast(new InventoryUpdated('jev_created', $created[0]['nPurchaseItemId']))->toOthers();

        return $created;
    }
}
