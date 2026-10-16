<?php

namespace App\Services\Vouchers;

use App\Events\InventoryUpdated;
use App\Events\PurchaseOrderUpdated;
use App\Events\VoucherUpdated;
use App\Models\Inventory;
use App\Models\Jev;
use App\Models\PurchaseOrder;
use App\Models\Voucher;
use App\Models\VoucherAssignee;
use App\Models\VoucherSupplier;
use App\Services\CrudService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Voucher CRUD plus every side effect a voucher can raise: the JEV it is
 * issued against, the stock posted under that JEV, and the purchase orders it
 * pays.
 *
 * The inventory / JEV / PO helpers were moved verbatim from the old
 * VoucherController — including their DB transactions, comments and the exact
 * points where each broadcast fires.
 */
class VoucherService extends CrudService
{
    protected string $entityName  = 'Voucher';
    protected string $primaryKey  = 'nVoucherId';
    protected array  $searchable  = [];
    protected array  $defaultSort = ['nVoucherId', 'desc'];

    protected function modelClass(): string
    {
        return Voucher::class;
    }

    protected function eventClass(): ?string
    {
        return VoucherUpdated::class;
    }

    /* --------------------------------------------------------------------- */
    /* Reading                                                                */
    /* --------------------------------------------------------------------- */

    /**
     * index(): the eager-loaded voucher list with the assigned AO's user id
     * flattened onto every row.
     *
     * @return Collection<int, Voucher>
     */
    public function listVouchers(): Collection
    {
        $vouchers = Voucher::with([
            'jev',
            'company',
            'supplier:nSupplierId,strSupplierNickName,strSupplierName,strTIN,strAddress',
            'voucher_suppliers.purchase_order.purchaseOrderOptions.purchaseOption.transactionItem.transaction.company',
            'voucher_assignees.assignee',
        ])->orderByDesc('nVoucherId')->get();
        // Flatten the assigned AO's user id onto each voucher.
        // All PO's on a voucher share the same assignee, so the first non-null wins.
        $vouchers->each(function ($voucher) {
            $nAssignedUserId = null;

            foreach ($voucher->voucher_suppliers as $vs) {
                $nAssignedUserId = $vs->purchase_order
                    ?->purchaseOrderOptions?->first()
                    ?->purchaseOption
                    ?->transactionItem
                    ?->transaction
                    ?->nAssignedAO;

                if ($nAssignedUserId !== null) {
                    break;
                }
            }

            $voucher->nAssignedUserId = $nAssignedUserId;
        });

        return $vouchers;
    }

    /**
     * show(): one voucher with the full relation chain.
     */
    public function show(string $id): Voucher
    {
        return Voucher::with([
            'jev',
            'voucher_assignees.assignee',
            'voucher_assignees.company',
            'voucher_suppliers.purchase_order.purchaseOrderOptions.purchaseOption.transactionItem.transaction.company', // ← add full chain
        ])->findOrFail($id);
    }

    /* --------------------------------------------------------------------- */
    /* Writing                                                                */
    /* --------------------------------------------------------------------- */

    /**
     * createJev(): raises the JEV and links it to the voucher inside one
     * transaction, then announces it.
     *
     * Returns null when the voucher already carries a JEV — the old
     * controller turned that into the 422 "JEV already exists." response.
     */
    public function createJev(string $id): ?Jev
    {
        $voucher = Voucher::findOrFail($id);
        if ($voucher->nJEVId) {
            return null;
        }

        $result = DB::transaction(function () use ($voucher) {
            $jev = Jev::create([
                'strJEVNumber' => Jev::generateNumber(),   // ← add
                'cJEVLinkType' => request()->input('cJEVLinkType'),
                'dtOccur'      => now(),
                'cStatus'      => 'P',
            ]);

            $voucher->nJEVId = $jev->nJEVId;
            $voucher->save();
            return $jev;
        });

        $this->broadcast('jev_created', $voucher);

        return $result;
    }

    /**
     * store(): the DV number is generated under a row lock, then the linked
     * purchase orders and assignee lines are attached (the children are
     * created outside the numbering transaction, exactly as before).
     */
    public function store(array $data): Voucher
    {
        $voucher = DB::transaction(function () use ($data) {
            $year   = date('Y');
            $prefix = 'DV' . $year . '-';

            $last = Voucher::where('strNumber', 'like', $prefix . '%')
                ->lockForUpdate()
                ->orderByDesc('strNumber')
                ->first();

            $nextSeq   = $last ? (int) substr($last->strNumber, strlen($prefix)) + 1 : 1;
            $strNumber = $prefix . str_pad($nextSeq, 4, '0', STR_PAD_LEFT);

            return Voucher::create([
                'strTitle'      => $data['strTitle'] ?? null,
                'cType'         => $data['cType'] ?? null,
                'nTypeId'       => $data['nTypeId'] ?? null,
                'strNumber'     => $strNumber,
                'cStatus'       => $data['cStatus'] ?? 'A',
                'nCompanyId'    => $data['nCompanyId'] ?? null,
                'cPaymentTerms' => $data['cPaymentTerms'] ?? null, // ← add
                'nJEVId'        => $data['nJEVId'] ?? null,
                'dtCreated'     => now(),
            ]);
        });
        foreach ($data['nPurchaseOrderIds'] ?? [] as $poId) {
            VoucherSupplier::create([
                'nVoucherId'       => $voucher->nVoucherId,
                'nPurchaseOrderId' => $poId,
            ]);
        }

        // In store() — creating first particular:
        foreach ($data['assignees'] ?? [] as $a) {
            VoucherAssignee::create([
                'nVoucherId'    => $voucher->nVoucherId,
                // ❌ REMOVED nCompanyId — ONLY on Voucher now
                'nAssigneeId'   => $a['nAssigneeId'] ?? null,
                'strParticular' => $a['strParticular'] ?? null,
                'nQuantity'     => $a['nQuantity'] ?? 1,
                'strUOM'        => $a['strUOM'] ?? null,
                'dAmount'       => $a['dAmount'] ?? 0,
                'dEWT'          => $a['dEWT'] ?? 0,
            ]);
        }

        $this->broadcast('created', $voucher);

        return $voucher;
    }

    /**
     * update(): the same field map the old controller applied, including the
     * "fall back to what is already stored" columns.
     */
    public function update(int|string $id, array $data): Voucher
    {
        $voucher = Voucher::findOrFail($id);
        $voucher->update([
            'strTitle'      => $data['strTitle'] ?? null,
            'cType'         => $data['cType'] ?? null,
            'nTypeId'       => $data['nTypeId'] ?? null,
            'strNumber'     => $data['strNumber'] ?? null,
            'cStatus'       => $data['cStatus'] ?? null,
            'nCompanyId'    => $data['nCompanyId'] ?? $voucher->nCompanyId,
            'cPaymentTerms' => $data['cPaymentTerms'] ?? $voucher->cPaymentTerms, // ← add
            'nJEVId'        => $data['nJEVId'] ?? $voucher->nJEVId,
            'dtCreated'     => $data['dtCreated'] ?? null,
        ]);
        $this->broadcast('updated', $voucher);

        return $voucher;
    }

    /**
     * destroy(): delete the voucher, then announce it.
     */
    public function destroy(string $id): Voucher
    {
        $voucher   = Voucher::findOrFail($id);
        $voucherId = $voucher->nVoucherId;
        $voucher->delete();

        $this->broadcast('deleted', $voucherId);

        return $voucher;
    }

    /**
     * updateStatus() flow, moved verbatim: flips the status, runs the
     * inventory side effects, unwinds the JEV / stock / POs on a cancel, then
     * announces everything AFTER the transaction has committed.
     *
     * (Named changeStatus() because CrudService::updateStatus(int, string)
     * has an incompatible signature — and a different contract.)
     */
    public function changeStatus(Request $request, string $id): Voucher
    {
        $voucher        = Voucher::findOrFail($id);
        $previousStatus = $voucher->cStatus;

        $insertInventory = filter_var(
            $request->input('insertInventory'),
            FILTER_VALIDATE_BOOLEAN
        );
        $removeInventory = filter_var(
            $request->input('removeInventory'),
            FILTER_VALIDATE_BOOLEAN
        );

        // Every code this needs comes from config/mappings.php — the same file
        // MappingController hands the frontend — so the API and the UI can
        // never drift apart. A failed lookup comes back as `false`.
        $codes = $this->statusCodes();

        // What a cancel produces, collected here so it is only announced AFTER
        // the transaction commits — a rolled-back change must not be pushed to
        // the other views.
        $inventoryCancelId = null;
        $movedPOIds        = [];

        DB::transaction(function () use (
            $voucher,
            $request,
            $insertInventory,
            $removeInventory,
            $codes,
            &$inventoryCancelId,
            &$movedPOIds
        ) {
            $voucher->cStatus = $request->cStatus;
            $voucher->save();

            if ($insertInventory) {
                $this->receiveInventoryForVoucher($voucher);
            }
            if ($removeInventory) {
                $this->removeInventoryForVoucher($voucher);
            }

            // Cancelling a voucher voids everything it raised:
            //   · the JEV it was issued against,
            //   · the stock posted under that JEV,
            //   · and — supplier vouchers only — the purchase orders it was
            //     paying, which go back to For Payment so the cart can be
            //     processed again.
            if ($codes['voucherCancelled'] !== false
                && (string) $request->cStatus === (string) $codes['voucherCancelled']
            ) {
                $jevCancelled = $this->cancelJevForVoucher(
                    $voucher,
                    (string) $codes['voucherCancelled'],
                    (string) $codes['jevCancelled']
                );

                // Only the rows of a JEV we just took down — a JEV still held
                // alive by another voucher keeps its stock.
                if ($jevCancelled) {
                    $inventoryCancelId = $this->cancelInventoryForVoucher(
                        $voucher,
                        (string) $codes['inventoryCancelled']
                    );
                }

                if ((string) $voucher->cType === (string) $codes['supplierType']) {
                    $movedPOIds = $this->returnPOsToForPayment(
                        $voucher,
                        (string) $codes['forPayment'],
                        (string) $codes['poCancelled']
                    );
                }
            }
        });

        $this->broadcast('status_changed', $voucher);

        if ($inventoryCancelId) {
            broadcast(new InventoryUpdated('cancelled', $inventoryCancelId))->toOthers();
        }

        foreach ($movedPOIds as $poId) {
            broadcast(new PurchaseOrderUpdated('status_updated', $poId, (string) $codes['forPayment']))->toOthers();
        }

        // ── Sync linked Purchase Orders' nStatus based on paid/unpaid toggle ──
        // Frontend passes the actual status codes it already has via useKeysLabels,
        // so this stays in sync even if the codes ever change.
        $poStatusForPaymentKey  = $request->input('forPaymentKey');
        $poStatusPendingRcptKey = $request->input('pendingReceiptKey');
        $voucherPaidKey         = $request->input('voucherPaidKey');

        if ($poStatusForPaymentKey !== null && $poStatusPendingRcptKey !== null) {
            $targetPOStatus = (string) $request->cStatus === (string) $voucherPaidKey
                ? $poStatusPendingRcptKey  // Paid → move PO to Pending Receipt
                : $poStatusForPaymentKey;  // Unpaid → move PO back to For Payment

            $linkedPOIds = VoucherSupplier::where('nVoucherId', $voucher->nVoucherId)
                ->pluck('nPurchaseOrderId');

            if ($linkedPOIds->isNotEmpty()) {
                PurchaseOrder::whereIn('nPurchaseOrderId', $linkedPOIds)
                    ->update(['nStatus' => $targetPOStatus]);

                foreach ($linkedPOIds as $poId) {
                    broadcast(new PurchaseOrderUpdated('status_updated', $poId, $targetPOStatus))->toOthers();
                }
            }
        }

        return $voucher;
    }

    /* --------------------------------------------------------------------- */
    /* Inventory / JEV / PO side effects (moved verbatim from the controller) */
    /* --------------------------------------------------------------------- */

    private function receiveInventoryForVoucher(Voucher $voucher): void
    {
        $voucher->loadMissing('voucher_suppliers.purchase_order.purchaseOrderOptions.purchaseOption');
        $now = now();

        foreach ($voucher->voucher_suppliers as $vs) {
            foreach ($vs->purchase_order?->purchaseOrderOptions ?? [] as $poOption) {
                $opt = $poOption->purchaseOption;
                if (!$opt) continue;

                // Skip if this voucher's JEV already created the row (re-marking as paid)
                $exists = Inventory::where('nPurchaseItemId', $opt->nPurchaseItemId)
                    ->where('nJEVId', $voucher->nJEVId)
                    ->where('cStatus', 'A')
                    ->exists();
                if ($exists) continue;

                Inventory::create([
                    'nPurchaseItemId' => $opt->nPurchaseItemId,
                    'nJEVId'          => $voucher->nJEVId,
                    'nQuantity'       => (int) $opt->nQuantity,
                    'cStatus'         => 'A',
                    'dtLog'           => $now,
                ]);
            }
        }
    }

    private function removeInventoryForVoucher(Voucher $voucher): void
    {
        if (!$voucher->nJEVId) return;

        $rows = Inventory::where('nJEVId', $voucher->nJEVId)
            ->where('cStatus', 'A')
            ->where('nQuantity', '>', 0)
            ->get(['nInventoryId', 'nPurchaseItemId']);

        if ($rows->isEmpty()) return;

        // Don't pull stock out from under items that were already delivered
        $alreadyDelivered = Inventory::whereIn('nPurchaseItemId', $rows->pluck('nPurchaseItemId')->unique())
            ->where('nQuantity', '<', 0)
            ->whereIn('cStatus', ['A', 'P'])
            ->exists();

        if ($alreadyDelivered) {
            throw ValidationException::withMessages([
                'inventory' => 'Cannot mark as unpaid: some of this stock was already delivered.',
            ]);
        }

        Inventory::whereIn('nInventoryId', $rows->pluck('nInventoryId'))->delete();
    }

    /**
     * Cancelling a voucher takes the JEV raised for it down with it — the
     * entries only make sense while the voucher that justifies them exists,
     * and leaving the JEV Active/Pending would keep a dead journal on the
     * books (it would still show up as the voucher's JEV everywhere else).
     *
     * tblvouchers points at tbljevs, so one JEV can be shared by more than one
     * voucher: it is only cancelled once no other LIVE voucher still points at
     * it — the same "only when nothing else needs it" rule
     * PurchaseOrderController::cancelInventoryForPOs() applies to stock.
     *
     * Returns true when the JEV is this voucher's to unwind — it was
     * cancelled here, or already was — and false when it is left alone. The
     * caller uses that to decide whether the stock behind it may go too.
     */
    private function cancelJevForVoucher(
        Voucher $voucher,
        string $voucherCancelledKey,
        string $jevCancelledKey
    ): bool {
        if (!$voucher->nJEVId || $jevCancelledKey === '') return false;

        $stillInUse = Voucher::where('nJEVId', $voucher->nJEVId)
            ->where('nVoucherId', '!=', $voucher->nVoucherId)
            ->where(fn ($q) => $q->where('cStatus', '!=', $voucherCancelledKey)
                ->orWhereNull('cStatus'))
            ->exists();

        if ($stillInUse) return false;

        Jev::where('nJEVId', $voucher->nJEVId)
            ->where(fn ($q) => $q->where('cStatus', '!=', $jevCancelledKey)
                ->orWhereNull('cStatus'))
            ->update(['cStatus' => $jevCancelledKey]);

        return true;
    }

    /**
     * The voucher's stock goes down with it: every inventory row raised under
     * its JEV flips to Cancelled. All of the JEV's rows move together — the
     * receipts it created and any delivery that inherited the same journal —
     * so an item is never left holding half of an entry. Nothing is deleted,
     * so the receipt history survives with a Cancelled stamp and the batch can
     * be received again later.
     *
     * Rows are found by nJEVId (inventory carries no voucher column), which is
     * why this only ever runs for a JEV the caller just cancelled — batches
     * with nJEVId still null belong to the purchase order, not the voucher.
     *
     * Returns the id of the row that changed (for broadcasting), or null when
     * there was nothing to cancel.
     */
    private function cancelInventoryForVoucher(Voucher $voucher, string $cancelledKey): ?int
    {
        if (!$voucher->nJEVId || $cancelledKey === '') return null;

        $rows = Inventory::where('nJEVId', $voucher->nJEVId)
            ->where(fn ($q) => $q->where('cStatus', '!=', $cancelledKey)
                ->orWhereNull('cStatus'))
            ->get(['nInventoryId']);

        if ($rows->isEmpty()) return null;

        Inventory::whereIn('nInventoryId', $rows->pluck('nInventoryId'))
            ->update(['cStatus' => $cancelledKey]);

        return (int) $rows->first()->nInventoryId;
    }

    /**
     * A supplier voucher exists to pay its purchase orders, so cancelling it
     * hands them back: every linked PO returns to "For Payment" and waits to be
     * paid again. A PO the user already cancelled by hand stays Cancelled, and
     * one already sitting on For Payment is not touched — so an unpaid voucher
     * cancelling changes nothing.
     *
     * Returns the ids that actually moved so changeStatus() can announce them
     * once the transaction has committed.
     */
    private function returnPOsToForPayment(
        Voucher $voucher,
        string $forPaymentKey,
        string $poCancelledKey
    ): array {
        if ($forPaymentKey === '') return [];

        $linkedPOIds = VoucherSupplier::where('nVoucherId', $voucher->nVoucherId)
            ->pluck('nPurchaseOrderId')
            ->filter()
            ->unique()
            ->values();

        if ($linkedPOIds->isEmpty()) return [];

        $toMove = PurchaseOrder::whereIn('nPurchaseOrderId', $linkedPOIds)
            ->where('nStatus', '!=', $forPaymentKey)
            ->when(
                $poCancelledKey !== '',
                fn ($q) => $q->where('nStatus', '!=', $poCancelledKey)
            )
            ->pluck('nPurchaseOrderId');

        if ($toMove->isEmpty()) return [];

        PurchaseOrder::whereIn('nPurchaseOrderId', $toMove)
            ->update(['nStatus' => $forPaymentKey]);

        return $toMove->values()->all();
    }

    /**
     * The status codes this flow reacts to, pulled straight from
     * config/mappings.php — the file /mappings serves to the frontend, so the
     * API and the UI can never disagree about what a code means. A lookup that
     * fails comes back as `false` and every caller guards for it.
     */
    private function statusCodes(): array
    {
        return [
            'voucherCancelled'   => array_search('Cancelled', config('mappings.voucher_status', []), true),
            'jevCancelled'       => array_search('Cancelled', config('mappings.jev_status', []), true),
            'inventoryCancelled' => array_search('Cancelled', config('mappings.inventory_status', []), true),
            'forPayment'         => array_search('For Payment', config('mappings.item_purchasing_status', []), true),
            'poCancelled'        => array_search('Cancelled', config('mappings.item_purchasing_status', []), true),
            'supplierType'       => array_search('Supplier', config('mappings.voucher_type', []), true),
        ];
    }
}
