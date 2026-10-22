<?php

namespace App\Services\Purchasing;

use App\Events\InventoryUpdated;
use App\Events\JevUpdated;
use App\Events\PurchaseOrderUpdated;
use App\Events\VoucherUpdated;
use App\Models\Inventory;
use App\Models\Jev;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderOption;
use App\Models\SerialNumber;
use App\Models\Voucher;
use App\Models\VoucherSupplier;
use App\Services\CrudService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

/**
 * Purchase order logic extracted from PurchaseOrderController.
 *
 * The generic CrudService broadcast() forwards a single id and excludes the
 * sender; PurchaseOrderUpdated takes an optional third argument and none of
 * the original broadcasts excluded the sender — so broadcast() is overridden
 * below to keep both behaviours.
 */
class PurchaseOrderService extends CrudService
{
    protected string $entityName = 'Purchase Order';
    protected string $primaryKey = 'nPurchaseOrderId';

    protected function modelClass(): string
    {
        return PurchaseOrder::class;
    }

    protected function eventClass(): ?string
    {
        return PurchaseOrderUpdated::class;
    }

    // ─── Status Code Helpers ──────────────────────────────────────
    private function statusCodes(): array
    {
        return [
            'cart'            => '110',
            'for_approval'    => '120',
            'for_payment'     => '130',
            'pending_receipt' => '140',
            'for_delivery'    => '150',
            'delivered'       => '160',
            'cancelled'       => '170',
            'removed'         => '100',
        ];
    }

    /**
     * The voucher / journal status codes a PO cancellation needs.
     *
     * They are looked up BY NAME in config/mappings.php — the same file the
     * MappingController hands to the frontend — so the API and the UI can
     * never drift apart.
     *
     * (Do NOT hard-code these letters: the old 'O' = Open came from the
     * retired `cart_status` mapping and is not a voucher status at all —
     * using it left every Active and Paid voucher alive when its PO was
     * cancelled.)
     */
    private function financeCodes(): array
    {
        $voucherStatus = config('mappings.voucher_status', []);
        $jevStatus     = config('mappings.jev_status', []);

        return [
            'voucherCancelled' => (string) (array_search('Cancelled', $voucherStatus, true) ?: ''),
            'jevCancelled'     => (string) (array_search('Cancelled', $jevStatus, true) ?: ''),
        ];
    }

    /**
     * Create the next PO number under a row lock; new POs start as Cart.
     * (Named createPurchaseOrder() because CrudService::create() requires
     * a $data argument.)
     */
    public function createPurchaseOrder(): PurchaseOrder
    {
        $purchaseOrder = DB::transaction(function () {
            $year    = now()->format('Y');
            $prefix  = 'PO' . $year . '-';
            $last    = PurchaseOrder::where('strPurchaseOrderNo', 'LIKE', $prefix . '%')
                ->lockForUpdate()
                ->orderBy('strPurchaseOrderNo', 'desc')
                ->first();
            $nextSeq = $last
                ? (int)substr($last->strPurchaseOrderNo, strlen($prefix)) + 1
                : 1;
            $sequence = str_pad($nextSeq, 4, '0', STR_PAD_LEFT);

            // ✅ New PO defaults to Cart status
            return PurchaseOrder::create([
                'strPurchaseOrderNo' => $prefix . $sequence,
                'nStatus'            => $this->statusCodes()['cart'], // '110'
            ]);
        });

        $this->broadcast('created', $purchaseOrder);

        return $purchaseOrder;
    }

    /**
     * Every PO with its full option graph, each option decorated with the
     * inventory received / delivered stats.
     *
     * @return Collection<int, PurchaseOrder>
     */
    public function allPurchaseOrders(): Collection
    {
        $purchaseOrders = $this->newQuery()->with([
            'purchaseOrderOptions.purchaseOption.transactionItem.transaction.user',
            'purchaseOrderOptions.purchaseOption.transactionItem.transaction.company',
            'purchaseOrderOptions.purchaseOption.transactionItem.transaction.client', // ← add this
            'purchaseOrderOptions.purchaseOption.supplier',
            'purchaseOrderOptions.purchaseOption.supplierContact',
        ])->get();

        $purchaseOrders->each(
            fn($po) =>
            $po->purchaseOrderOptions->each(
                fn($poOption) =>
                $this->attachInventoryStats($poOption)
            )
        );

        return $purchaseOrders;
    }

    // ✅ nStatus lives directly on PurchaseOrder now — no history table involved
    public function updateCartStatus(array $validated): PurchaseOrder
    {
        $codes = $this->statusCodes();
        $purchaseOrder = $this->newQuery()->with('purchaseOrderOptions.purchaseOption')->findOrFail($validated['nPurchaseOrderId']);

        $isCancelling = (string) $validated['nStatus'] === (string) $codes['cancelled'];

        // Which POs go down with this one. Only the PO itself: a cancel
        // never takes a sibling order down with it.
        $idsToCancel = collect([(int) $purchaseOrder->nPurchaseOrderId]);

        // ✅ A PO can be cancelled at any stage. What goes down with it
        // depends on what it raised:
        //   • Cart / For Approval — nothing else exists yet
        //   • For Payment / Pending Receipt — the voucher and the JEV
        //   • For Delivery / Delivered — the voucher, the JEV and the stock
        // The blocks below take each of those down with the order.

        // ✅ Update PO status directly
        $purchaseOrder->nStatus = $validated['nStatus'];
        // ✅ The moment the order went down — a cancelled card says WHEN.
        if ($isCancelling && !$purchaseOrder->dtCancelled) {
            $purchaseOrder->dtCancelled = now();
        }
        $purchaseOrder->save();

        $this->broadcast('status_updated', $purchaseOrder, $validated['nStatus']);

        // ✅ If Cancelled → propagate to all items (unset inclusion, cancel linked vouchers)
        if ($isCancelling) {
            $finance = $this->financeCodes();
            $voucherCancelledCode = $finance['voucherCancelled'];
            $jevCancelledCode     = $finance['jevCancelled'];

            foreach ($idsToCancel as $poId) {
                $po = $poId === (int) $purchaseOrder->nPurchaseOrderId
                    ? $purchaseOrder
                    : $this->newQuery()->with('purchaseOrderOptions.purchaseOption')->find($poId);
                if (!$po) continue;

                // The originating PO is already at the new status above.
                if ((string) $po->nStatus !== (string) $codes['cancelled']) {
                    $po->nStatus = $codes['cancelled'];
                    if (!$po->dtCancelled) {
                        $po->dtCancelled = now();
                    }
                    $po->save();
                    $this->broadcast('status_updated', $po, $codes['cancelled']);
                }

                foreach ($po->purchaseOrderOptions as $poOption) {
                    if ($poOption->purchaseOption) {
                        $poOption->purchaseOption->bPurchaseIncluded = 0;
                        $poOption->purchaseOption->save();
                    }
                }

                // Cancel linked vouchers
                $linkedVouchers = VoucherSupplier::with('voucher')
                    ->where('nPurchaseOrderId', $po->nPurchaseOrderId)
                    ->get();

                foreach ($linkedVouchers as $vs) {
                    // A voucher that is not already cancelled goes down with the
                    // PO — Active ('A'), Closed ('C') and Paid ('P') alike.
                    // Only Cancelled ('X') is final.
                    if (!$vs->voucher) {
                        continue;
                    }

                    if ((string) $vs->voucher->cStatus === $voucherCancelledCode) {
                        continue;
                    }

                    $vs->voucher->cStatus = $voucherCancelledCode;
                    $vs->voucher->save();
                    broadcast(new VoucherUpdated('status_changed', $vs->voucher->nVoucherId));

                    // Also cancel the associated JEV if the voucher has one.
                    // A journal can be shared by more than one voucher, so it
                    // only goes down once no OTHER live voucher still points
                    // at it.
                    if ($vs->voucher->nJEVId) {
                        // The RELATION, not the journal: `jev()` hands back
                        // the BelongsTo itself, so reading cStatus off it
                        // would blow up on a property that does not exist
                        // there. The attribute resolves the journal (or
                        // null when it is already gone).
                        $jev = $vs->voucher->jev;

                        $stillInUse = $jev ? Voucher::where('nJEVId', $vs->voucher->nJEVId)
                            ->where('nVoucherId', '!=', $vs->voucher->nVoucherId)
                            ->where(fn($q) => $q->where('cStatus', '!=', $voucherCancelledCode)
                                ->orWhereNull('cStatus'))
                            ->exists() : false;

                        if ($jev && !$stillInUse && (string) $jev->cStatus !== $jevCancelledCode) {
                            $jev->cStatus = $jevCancelledCode;
                            $jev->save();
                            // The JEV screen listens on its OWN channel — a
                            // voucher event would never reach it.
                            broadcast(new JevUpdated('updated', $jev->nJEVId));
                        }
                    }
                }
            }

            // ✅ Received stock / delivered rows must not outlive the PO.
            $this->cancelInventoryForPOs($idsToCancel, $codes['cancelled']);
        }

        return $purchaseOrder;
    }

    /**
     * @return Collection<int, PurchaseOrder>
     */
    public function updateCartStatusBulk(array $validated): Collection
    {
        $purchaseOrders = PurchaseOrder::whereIn('nPurchaseOrderId', $validated['nPurchaseOrderIds'])->get();

        $codes = $this->statusCodes();

        DB::transaction(function () use ($purchaseOrders, $validated, $codes) {
            $isCancelling = (string) $validated['nStatus'] === (string) $codes['cancelled'];
            foreach ($purchaseOrders as $po) {
                // ✅ Update PO nStatus directly, no per-item history rows
                $po->nStatus = $validated['nStatus'];
                // ✅ The moment the order went down — a cancelled card says WHEN.
                if ($isCancelling && !$po->dtCancelled) {
                    $po->dtCancelled = now();
                }
                $po->save();

                $this->broadcast('status_synced', $po);
            }

            // ✅ Cancelling POs takes their received / delivered stock with them.
            if ((string) $validated['nStatus'] === (string) $codes['cancelled']) {
                $this->cancelInventoryForPOs(
                    $purchaseOrders->pluck('nPurchaseOrderId'),
                    $codes['cancelled']
                );
            }
        });

        return $purchaseOrders;
    }

    // ✅ UPDATED — removed dtProceedToPayment
    public function proceedToPODetails(array $validated): PurchaseOrder
    {
        $po = $this->find((int) $validated['nPurchaseOrderId']);
        $po->strShippingDetails = $validated['strShippingDetails'];
        $po->cPaymentTerms      = $validated['cPaymentTerms'];
        // The freight charge — null/empty means "none on this PO".
        $po->dFreight           = isset($validated['dFreight']) && $validated['dFreight'] !== ''
            ? (float) $validated['dFreight']
            : null;
        $po->save();

        $this->broadcast('payment_updated', $po);

        return $po;
    }

    /**
     * The FREIGHT charge on the PO — the one field the Freight / EWT editor
     * owns on the purchase order itself.
     */
    public function updateFreight(array $validated): PurchaseOrder
    {
        $po = $this->find((int) $validated['nPurchaseOrderId']);
        // An empty field means "no freight on this PO" (null, not 0).
        $po->dFreight = isset($validated['dFreight']) && $validated['dFreight'] !== ''
            ? (float) $validated['dFreight']
            : null;
        $po->save();

        $this->broadcast('updated', $po);

        return $po;
    }

    /**
     * @return Collection<int, PurchaseOrder>
     */
    public function bySupplier($supplierId): Collection
    {
        return $this->newQuery()->with('purchaseOrderOptions.purchaseOption.transactionItem.transaction')
            ->whereHas('purchaseOrderOptions.purchaseOption', fn($q) => $q->where('nSupplierId', $supplierId))
            ->orderByDesc('nPurchaseOrderId')
            ->get();
    }

    private function attachInventoryStats($poOption): void
    {
        $nPurchaseItemId = $poOption->purchaseOption?->nPurchaseItemId;
        if (!$nPurchaseItemId) return;

        $receivedRows = Inventory::where('nPurchaseItemId', $nPurchaseItemId)
            ->where('nQuantity', '>', 0)
            ->whereIn('cStatus', ['A', 'P'])
            ->orderBy('dtLog', 'asc')
            ->get();

        $deliveredRows = Inventory::where('nPurchaseItemId', $nPurchaseItemId)
            ->where('nQuantity', '<', 0)
            ->whereIn('cStatus', ['A', 'P'])
            ->orderBy('dtLog', 'asc')
            ->get();

        $poOption->purchaseOption->setAttribute('nInventoryQty', $receivedRows->sum('nQuantity'));
        $poOption->purchaseOption->setAttribute('nInventoryId', $receivedRows->first()?->nInventoryId);
        $poOption->purchaseOption->setAttribute('nDeliveredQty', abs($deliveredRows->sum('nQuantity')));
        $poOption->purchaseOption->setAttribute('nDeliveredInventoryId', $deliveredRows->first()?->nInventoryId);
        $isStatus = fn($status) => fn($r) => trim((string) $r->cStatus) === $status;

        $poOption->purchaseOption->setAttribute('nApprovedReceivedQty',  $receivedRows->filter($isStatus('A'))->sum('nQuantity'));
        $poOption->purchaseOption->setAttribute('nPendingReceivedQty',   $receivedRows->filter($isStatus('P'))->sum('nQuantity'));
        $poOption->purchaseOption->setAttribute('nApprovedDeliveredQty', abs($deliveredRows->filter($isStatus('A'))->sum('nQuantity')));
        $poOption->purchaseOption->setAttribute('nPendingDeliveredQty',  abs($deliveredRows->filter($isStatus('P'))->sum('nQuantity')));

        // The journals that closed this line — an APPROVED inventory row is
        // a row a JEV was already raised for, so its JEV is named on the
        // (locked) edit notice. One list per direction: the receive form
        // names the Received Purchases JEV, the deliver form the Delivered
        // Items one.
        $approvedReceived = $receivedRows->filter($isStatus('A'))->filter(fn($r) => $r->nJEVId != null);
        $approvedDelivered = $deliveredRows->filter($isStatus('A'))->filter(fn($r) => $r->nJEVId != null);
        $jevIds = $approvedReceived->pluck('nJEVId')
            ->merge($approvedDelivered->pluck('nJEVId'))
            ->filter()
            ->unique()
            ->values();
        $jevNumbers = $jevIds->isNotEmpty()
            ? Jev::whereIn('nJEVId', $jevIds)->pluck('strJEVNumber', 'nJEVId')
            : collect();

        $jevList = fn($rows) => $rows->pluck('nJEVId')
            ->unique()
            ->values()
            ->map(fn($id) => [
                'id' => $id,
                'number' => (string) ($jevNumbers[$id] ?? ''),
            ])
            ->filter(fn($j) => $j['number'] !== '')
            ->values()
            ->all();

        $poOption->purchaseOption->setAttribute('approvedReceivedJevs', $jevList($approvedReceived));
        $poOption->purchaseOption->setAttribute('approvedDeliveredJevs', $jevList($approvedDelivered));
        $receivedSerials = $receivedRows->pluck('nInventoryId')->filter();
        $deliveredSerials = $deliveredRows->pluck('nInventoryId')->filter();

        $poOption->purchaseOption->setAttribute(
            'receivedSerialNumbers',
            $receivedSerials->isNotEmpty() ? SerialNumber::whereIn('nInventoryId', $receivedSerials)->orderBy('dtLog')->pluck('strSerialNumber') : []
        );
        $poOption->purchaseOption->setAttribute(
            'deliveredSerialNumbers',
            $deliveredSerials->isNotEmpty() ? SerialNumber::whereIn('nInventoryId', $deliveredSerials)->orderBy('dtLog')->pluck('strSerialNumber') : []
        );
    }

    /**
     * Cancel the inventory sitting behind these POs: every received (positive)
     * and delivered (negative) row flips to cStatus "C", and the JEVs that were
     * posted from those rows go down with them.
     *
     * One purchase item can sit on several POs, so an item is only touched once
     * EVERY PO holding it is cancelled — a shared item a live PO still needs
     * keeps its stock. Same rule for JEVs: a voucher JEV posts several items at
     * once, so it is only cancelled when no live row is left on it.
     *
     * Returns the id of the first inventory row cancelled (for broadcasting),
     * or null when there was nothing to cancel.
     */
    private function cancelInventoryForPOs($poIds, string $cancelledCode): ?int
    {
        $poIds = collect($poIds)->filter()->unique()->values();
        if ($poIds->isEmpty()) return null;

        $firstCancelled = DB::transaction(function () use ($poIds, $cancelledCode) {
            $purchaseItemIds = PurchaseOrderOption::whereIn('nPurchaseOrderId', $poIds)
                ->pluck('nPurchaseItemId')
                ->filter()
                ->unique()
                ->values();

            if ($purchaseItemIds->isEmpty()) return null;

            // Items still held by a PO that is NOT cancelled → leave them alone.
            $liveItemIds = PurchaseOrderOption::whereIn('nPurchaseItemId', $purchaseItemIds)
                ->whereHas('purchaseOrder', fn($q) => $q->where('nStatus', '!=', $cancelledCode))
                ->pluck('nPurchaseItemId');

            $rows = Inventory::whereIn('nPurchaseItemId', $purchaseItemIds->diff($liveItemIds))
                ->where(fn($q) => $q->where('cStatus', '!=', 'C')->orWhereNull('cStatus'))
                ->get(['nInventoryId', 'nJEVId']);

            if ($rows->isEmpty()) return null;

            Inventory::whereIn('nInventoryId', $rows->pluck('nInventoryId'))
                ->update(['cStatus' => 'C']);

            $jevIds = $rows->pluck('nJEVId')->filter()->unique()->values();
            $cancelledJevIds = collect();
            if ($jevIds->isNotEmpty()) {
                $liveJevIds = Inventory::whereIn('nJEVId', $jevIds)
                    ->where(fn($q) => $q->where('cStatus', '!=', 'C')->orWhereNull('cStatus'))
                    ->pluck('nJEVId')
                    ->unique();

                $cancelledJevIds = $jevIds->diff($liveJevIds)->values();

                Jev::whereIn('nJEVId', $cancelledJevIds)
                    ->where(fn($q) => $q->where('cStatus', '!=', 'C')->orWhereNull('cStatus'))
                    ->update(['cStatus' => 'C']);
            }

            return [
                'inventoryId' => (int) $rows->first()->nInventoryId,
                'jevIds'      => $cancelledJevIds,
            ];
        });

        if ($firstCancelled) {
            broadcast(new InventoryUpdated('cancelled', $firstCancelled['inventoryId']));

            // The journals that went down with the stock — the JEV screen
            // listens on its own channel, so it has to be told.
            foreach ($firstCancelled['jevIds'] as $jevId) {
                broadcast(new JevUpdated('updated', (int) $jevId));
            }
        }

        return $firstCancelled['inventoryId'] ?? null;
    }

    /**
     * The original controller broadcast PurchaseOrderUpdated directly (never
     * via broadcast()->toOthers()), and status_updated carries the new status
     * as an optional third argument.
     */
    protected function broadcast(string $action, $reference, ?string $newStatus = null): void
    {
        $id = $reference instanceof Model ? $reference->{$this->primaryKey} : $reference;

        broadcast(new PurchaseOrderUpdated($action, (int) $id, $newStatus));
    }
}
