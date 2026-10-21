<?php

namespace App\Services\Purchasing;

use App\Events\InventoryUpdated;
use App\Models\Inventory;
use App\Models\PurchaseOptions;
use App\Services\CrudService;
use Illuminate\Support\Collection;

/**
 * Inventory records: CRUD, listing/aggregation, per-item history, receipt
 * suggestions and bulk status flips. The posting side (bulk receive/deliver
 * batches and JEV linking) lives in InventoryMovementService.
 */
class InventoryService extends CrudService
{
    protected string $entityName = 'Inventory';
    protected string $primaryKey = 'nInventoryId';

    protected function modelClass(): string
    {
        return Inventory::class;
    }

    protected function eventClass(): ?string
    {
        return InventoryUpdated::class;
    }

    /**
     * index() — every inventory row, newest first, optionally scoped to a
     * single purchase item (null means no filter).
     */
    public function listFor($nPurchaseItemId = null): Collection
    {
        $query = $this->newQuery();

        if ($nPurchaseItemId !== null) {
            $query->where('nPurchaseItemId', $nPurchaseItemId);
        }

        return $query->orderBy('dtLog', 'desc')->get();
    }

    /**
     * store() — validated data with dtLog defaulting to now().
     */
    public function create(array $data): Inventory
    {
        $data['dtLog'] = $data['dtLog'] ?? now();

        return parent::create($data);
    }

    /**
     * adjustQuantity() — increment / decrement (floored at 0) / set, then
     * stamp dtLog and broadcast the adjustment.
     */
    public function adjustQuantity(int $id, array $data): Inventory
    {
        $inventory = $this->find($id);

        switch ($data['operation']) {
            case 'increment':
                $inventory->nQuantity += $data['nQuantity'];
                break;
            case 'decrement':
                $inventory->nQuantity = max(0, $inventory->nQuantity - $data['nQuantity']);
                break;
            case 'set':
                $inventory->nQuantity = $data['nQuantity'];
                break;
        }

        $inventory->dtLog = now();
        $inventory->save();
        $inventory->refresh();
        $this->broadcast('quantity_adjusted', $inventory->nInventoryId);

        return $inventory;
    }

    /**
     * getInventory() — grouped display rows per purchase item: pending rows
     * as-is, approved rows aggregated into Stock (S) + Delivered (D), and
     * cancelled rows as-is.
     */
    public function summary(): Collection
    {
        return $this->newQuery()
            ->with([
                'purchaseOption.supplier',
                'purchaseOption.transactionItem.transaction.client',
                'purchaseOption.transactionItem.transaction.company',
                // The PO a batch was bought on — the items header card
                // prints it.
                'purchaseOption.purchaseOrderOption.purchaseOrder',
                'serialNumbers',
            ])
            ->orderByDesc('dtLog')
            ->get()
            ->groupBy('nPurchaseItemId')
            ->flatMap(function ($group) {

                $pendingRows   = $group->where('cStatus', 'P');
                $approvedGroup = $group->where('cStatus', 'A');
                $cancelledRows = $group->where('cStatus', 'C');   // ← add this

                // ─── PENDING ITEMS → Return DIRECTLY as "P" status ───
                $pendingEntries = [];
                if ($pendingRows->isNotEmpty()) {
                    foreach ($pendingRows as $pendingRow) {
                        $pendingEntries[] = [
                            'nInventoryId'        => $pendingRow->nInventoryId,
                            'nInventoryIds'       => [$pendingRow->nInventoryId],
                            'nPurchaseItemId'     => $pendingRow->nPurchaseItemId,
                            'nJEVId'              => $pendingRow->nJEVId, // ← NEW
                            // Every distinct JEV stamped on the rows behind
                            // this display row — an aggregate can carry one
                            'nJEVIds'             => array_values(array_filter([$pendingRow->nJEVId], fn($id) => $id !== null)),
                            'dtLog'               => $pendingRow->dtLog,
                            'nQuantity'           => $pendingRow->nQuantity,
                            'cStatus'             => 'P',
                            'purchaseOption'      => $pendingRow->purchaseOption,
                            'strSupplierNickName' => $pendingRow->purchaseOption?->supplier?->strSupplierNickName ?? '—',
                            'strClientNickName'   => $pendingRow->purchaseOption?->transactionItem?->transaction?->client?->strClientNickName ?? '—',
                            'strCompanyNickName'  => $pendingRow->purchaseOption?->transactionItem?->transaction?->company?->strCompanyNickName ?? '—',
                            'strPurchaseOrderNo'  => $pendingRow->purchaseOption?->purchaseOrderOption?->purchaseOrder?->strPurchaseOrderNo ?? '—',
                            // The PO's id — the items table links the PO code
                            // to the PO in Item Purchasing.
                            'nPurchaseOrderId'    => $pendingRow->purchaseOption?->purchaseOrderOption?->purchaseOrder?->nPurchaseOrderId ?? null,
                            'serialNumbers'       => $pendingRow->serialNumbers->pluck('strSerialNumber')->filter()->values(),
                        ];
                    }
                }
                $cancelledEntries = [];
                foreach ($cancelledRows as $cancelledRow) {
                    $cancelledEntries[] = [
                        'nInventoryId'        => $cancelledRow->nInventoryId,
                        'nInventoryIds'       => [$cancelledRow->nInventoryId],
                        'nPurchaseItemId'     => $cancelledRow->nPurchaseItemId,
                        'nJEVId'              => $cancelledRow->nJEVId, // ← NEW
                        'nJEVIds'             => array_values(array_filter([$cancelledRow->nJEVId], fn($id) => $id !== null)),
                        'dtLog'               => $cancelledRow->dtLog,
                        'nQuantity'           => $cancelledRow->nQuantity,
                        'cStatus'             => 'C',
                        'purchaseOption'      => $cancelledRow->purchaseOption,
                        'strSupplierNickName' => $cancelledRow->purchaseOption?->supplier?->strSupplierNickName ?? '—',
                        'strClientNickName'   => $cancelledRow->purchaseOption?->transactionItem?->transaction?->client?->strClientNickName ?? '—',
                        'strCompanyNickName'  => $cancelledRow->purchaseOption?->transactionItem?->transaction?->company?->strCompanyNickName ?? '—',
                        'strPurchaseOrderNo'  => $cancelledRow->purchaseOption?->purchaseOrderOption?->purchaseOrder?->strPurchaseOrderNo ?? '—',
                        'nPurchaseOrderId'    => $cancelledRow->purchaseOption?->purchaseOrderOption?->purchaseOrder?->nPurchaseOrderId ?? null,
                        'serialNumbers'       => $cancelledRow->serialNumbers->pluck('strSerialNumber')->filter()->values(),
                    ];
                }
                // ─── APPROVED ITEMS → Calculate Stock(S) + Delivered(D) ───
                $approvedEntries = [];
                if ($approvedGroup->isNotEmpty()) {
                    $totalPositive = $approvedGroup->where('nQuantity', '>', 0)->sum('nQuantity');
                    $totalNegative = $approvedGroup->where('nQuantity', '<', 0)->sum('nQuantity');
                    $first = $approvedGroup->first();

                    $sharedMeta = [
                        'nPurchaseItemId'   => $first->nPurchaseItemId,
                        'dtLog'               => $first->dtLog,
                        'purchaseOption'      => $first->purchaseOption,
                        'strSupplierNickName' => $first->purchaseOption?->supplier?->strSupplierNickName ?? '—',
                        'strClientNickName'   => $first->purchaseOption?->transactionItem?->transaction?->client?->strClientNickName ?? '—',
                        'strCompanyNickName'  => $first->purchaseOption?->transactionItem?->transaction?->company?->strCompanyNickName ?? '—',
                        'strPurchaseOrderNo'  => $first->purchaseOption?->purchaseOrderOption?->purchaseOrder?->strPurchaseOrderNo ?? '—',
                        'nPurchaseOrderId'    => $first->purchaseOption?->purchaseOrderOption?->purchaseOrder?->nPurchaseOrderId ?? null,
                    ];

                    // Stock (S) = positive balance
                    $stockQty = $totalPositive + $totalNegative;
                    if ($stockQty > 0) {
                        $positiveRows = $approvedGroup->where('nQuantity', '>', 0);
                        $stockSerials = $positiveRows->flatMap(fn($r) => $r->serialNumbers)->pluck('strSerialNumber')->filter()->values();
                        $approvedEntries[] = array_merge($sharedMeta, [
                            'nInventoryId'   => $positiveRows->first()->nInventoryId,
                            'nInventoryIds'  => $positiveRows->pluck('nInventoryId')->values(),
                            'nJEVId'         => $positiveRows->first()->nJEVId, // ← NEW
                            // Every distinct JEV behind this aggregate —
                            // the rows it sums can span more than one JEV
                            'nJEVIds'        => $positiveRows->pluck('nJEVId')->filter()->unique()->values(),
                            'nQuantity'      => $stockQty,
                            'cStatus'        => 'S',
                            'serialNumbers'  => $stockSerials,
                        ]);
                    }

                    // Delivered (D) = absolute negative total
                    if ($totalNegative < 0) {
                        $negativeRows = $approvedGroup->where('nQuantity', '<', 0);
                        $deliveredSerials = $negativeRows->flatMap(fn($r) => $r->serialNumbers)->pluck('strSerialNumber')->filter()->values();
                        $approvedEntries[] = array_merge($sharedMeta, [
                            'nInventoryId'   => $negativeRows->first()->nInventoryId,
                            'nInventoryIds'  => $negativeRows->pluck('nInventoryId')->values(),
                            'nJEVId'         => $negativeRows->first()->nJEVId, // ← NEW
                            // A delivery is linked to MORE than its own 'D'
                            // JEV: the same batch was booked in through the
                            // purchase's 'R' (Received Purchases) JEV. Every
                            // distinct JEV of the WHOLE purchase item is
                            // listed, oldest first (received → delivered).
                            'nJEVIds'        => $group->pluck('nJEVId')->filter()->unique()->sort()->values(),
                            'nQuantity'      => abs($totalNegative),
                            'cStatus'        => 'D',
                            'serialNumbers'  => $deliveredSerials,
                        ]);
                    }
                }

                // ✅ Return: PENDING + STOCK + DELIVERED + CANCELLED all SEPARATE
                return array_merge($pendingEntries, $approvedEntries, $cancelledEntries);
            })
            ->values();
    }

    /**
     * history() — one purchase item's rows, newest first, with serials.
     */
    public function history(int $nPurchaseItemId): Collection
    {
        return $this->newQuery()
            ->with('serialNumbers')
            ->where('nPurchaseItemId', $nPurchaseItemId)
            ->orderByDesc('dtLog')
            ->orderByDesc('nInventoryId')
            ->get()
            ->map(function ($row) {
                return [
                    'nInventoryId'      => $row->nInventoryId,
                    'nQuantity'         => $row->nQuantity,
                    'nJEVId'            => $row->nJEVId, // ← NEW
                    'dtLog'             => $row->dtLog,
                    'strReceiptNumber'  => $row->strReceiptNumber,
                    'cStatus'           => $row->cStatus,
                    'serialNumbers'     => $row->serialNumbers
                        ->pluck('strSerialNumber')
                        ->filter()
                        ->values(),
                ];
            });
    }

    /**
     * historyBulk() — many purchase items in one query (replaces N history()
     * calls), grouped by purchase item.
     */
    public function historyBulk(array $ids): Collection
    {
        return $this->newQuery()
            ->with('serialNumbers')
            ->whereIn('nPurchaseItemId', $ids)
            ->orderByDesc('dtLog')->orderByDesc('nInventoryId')
            ->get()
            ->groupBy('nPurchaseItemId')
            ->map(fn($g) => $g->map(fn($r) => [
                'nInventoryId'     => $r->nInventoryId,
                'nQuantity'        => $r->nQuantity,
                'nJEVId'           => $r->nJEVId,
                'dtLog'            => $r->dtLog,
                'strReceiptNumber' => $r->strReceiptNumber,
                'cStatus'          => $r->cStatus,
                'serialNumbers'    => $r->serialNumbers->pluck('strSerialNumber')->filter()->values(),
            ])->values());
    }

    /**
     * Most recent delivered receipt number, optionally scoped to a supplier.
     * Used only to power the "suggested next receipt no." placeholder.
     */
    public function latestDeliveredReceipt($nSupplierId = null): ?Inventory
    {
        $query = $this->newQuery()
            ->where('nQuantity', '<', 0)
            ->whereIn('cStatus', ['A', 'P']);  // ✅ Include A + P

        if (!empty($nSupplierId)) {
            $query->whereHas('purchaseOption', function ($q) use ($nSupplierId) {
                $q->where('nSupplierId', $nSupplierId);
            });
        }

        return $query
            ->orderByDesc('dtLog')
            ->orderByDesc('nInventoryId')
            ->first();
    }

    /**
     * Next receipt number for the deliver form of ONE card (one transaction).
     *
     *   L = most recent delivered receipt anywhere that carries a number
     *   · L belongs to this card AND was written today → reuse L (same card,
     *     same day → the rest of the card's items share the number)
     *   · otherwise → L + 1 (prefix and zero padding preserved)
     *
     * The card check is what keeps two cards open on the same day from
     * handing out the same number.
     *
     * Accepts nTransactionId directly, or nPurchaseItemId to resolve it from.
     *
     * @return array{latest: ?Inventory, reuse: bool, next: ?string}
     */
    public function suggestedDeliveredReceipt(array $validated): array
    {
        $transactionId = $validated['nTransactionId'] ?? null;
        if (empty($transactionId) && !empty($validated['nPurchaseItemId'])) {
            $transactionId = PurchaseOptions::where('nPurchaseItemId', $validated['nPurchaseItemId'])
                ->value('nTransactionItemId');
        }

        $cardItemIds = $transactionId
            ? PurchaseOptions::where('nTransactionItemId', $transactionId)->pluck('nPurchaseItemId')
            : collect();

        // L — latest delivered receipt that actually has a number on it.
        $latest = $this->newQuery()
            ->where('nQuantity', '<', 0)
            ->whereIn('cStatus', ['A', 'P'])
            ->whereNotNull('strReceiptNumber')
            ->where('strReceiptNumber', '!=', '')
            ->orderByDesc('dtLog')
            ->orderByDesc('nInventoryId')
            ->first();

        // Nothing delivered yet → no base to inherit from: leave the field
        // empty (it stays required, so the user types the first number).
        if (!$latest) {
            return ['latest' => null, 'reuse' => false, 'next' => null];
        }

        $reuse = $cardItemIds->contains((int) $latest->nPurchaseItemId)
            && $latest->dtLog
            && $latest->dtLog->isToday();

        return [
            'latest' => $latest,
            'reuse'  => $reuse,
            'next'   => $reuse
                ? null
                : $this->incrementReceiptNumber($latest->strReceiptNumber),
        ];
    }

    /**
     * "OR-0000012" → "OR-0000013" — the prefix and the width of the digits are
     * kept, so "RR-2025-0009" comes out as "RR-2025-0010".
     * A value that does not end in digits is returned untouched: the field is
     * required either way, so the user just types the next number themselves.
     */
    private function incrementReceiptNumber(string $receipt): string
    {
        $receipt = trim($receipt);
        if (!preg_match('/^(.*?)(\d+)$/', $receipt, $m)) return $receipt;

        $prefix = $m[1];
        $digits = $m[2];
        $next   = (string) ((int) $digits + 1);

        // 0000012 → 0000013 (same width), 999 → 1000 (grows when it must)
        if (strlen($next) < strlen($digits)) {
            $next = str_pad($next, strlen($digits), '0', STR_PAD_LEFT);
        }

        return $prefix . $next;
    }

    /**
     * bulkUpdateStatus() — flip many inventory rows at once (JEV finalize /
     * undo).
     */
    public function bulkUpdateStatus(array $ids, string $status): void
    {
        $this->newQuery()->whereIn('nInventoryId', $ids)->update(['cStatus' => $status]);
        $this->broadcast('bulk_status', $ids[0]);
    }
}
