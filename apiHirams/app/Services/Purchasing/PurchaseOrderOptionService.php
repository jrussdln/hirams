<?php

namespace App\Services\Purchasing;

use App\Events\PurchaseOrderOptionUpdated;
use App\Events\PurchaseOrderUpdated;
use App\Models\PurchaseOptions;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderOption;
use App\Models\TransactionItems;
use App\Models\Transactions;
use App\Models\User;
use App\Services\CrudService;
use Illuminate\Support\Facades\DB;

/**
 * Cart operations for purchase order options.
 *
 * The cart broadcasts carry extra payload arguments (purchaseOrderOptionId,
 * purchaseOrderId, purchaseOptionId, transactionId), so CrudService's 2-arg
 * broadcast() cannot build them — eventClass() stays null and each method
 * broadcasts explicitly, exactly as the old controller did.
 */
class PurchaseOrderOptionService extends CrudService
{
    protected string $entityName = 'PurchaseOrderOption';
    protected string $primaryKey = 'nPurchaseOrder_ItemId';

    protected function modelClass(): string
    {
        return PurchaseOrderOption::class;
    }

    private function statusCodes(): array
    {
        return [
            'cart'      => '110',
            'cancelled' => '170',
            'removed'   => '100',
        ];
    }

    /**
     * Add a purchase option to the open cart PO (creating the PO when needed).
     *
     * @param  array  $validated  the validated addToCart payload.
     * @return array{status: int, purchaseOrderOption?: PurchaseOrderOption}
     *         201 with the created row, or 403 when the caller is neither
     *         management nor the assigned Account Officer.
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException when the
     *         option / transaction item / transaction does not exist.
     */
    public function addToCart(array $validated): array
    {
        $codes = $this->statusCodes();

        // Get linked records
        $purchaseOption   = PurchaseOptions::where('nPurchaseItemId', $validated['nPurchaseItemId'])->firstOrFail();
        $transactionItem  = TransactionItems::where('nTransactionItemId', $purchaseOption->nTransactionItemId)->firstOrFail();
        $transaction      = Transactions::where('nTransactionId', $transactionItem->nTransactionId)->firstOrFail();

        // Permissions — management, the assigned AO, or the AOTL.
        if (!$this->canCart($validated, $transaction)) {
            return ['status' => 403];
        }

        DB::beginTransaction();

        // ✅ Find open PO directly via PurchaseOrder.nStatus (no history table)
        $existingOpenPO = PurchaseOrder::join('tblpurchaseorder_items', 'tblpurchaseorders.nPurchaseOrderId', '=', 'tblpurchaseorder_items.nPurchaseOrderId')
            ->join('tblpurchaseitems', 'tblpurchaseorder_items.nPurchaseItemId', '=', 'tblpurchaseitems.nPurchaseItemId')
            ->join('tbltransactionitems', 'tblpurchaseitems.nTransactionItemId', '=', 'tbltransactionitems.nTransactionItemId')
            ->join('tbltransactions', 'tbltransactionitems.nTransactionId', '=', 'tbltransactions.nTransactionId')
            ->where('tblpurchaseorders.nStatus', $codes['cart'])
            ->where('tblpurchaseitems.nSupplierId', $purchaseOption->nSupplierId)
            ->where('tbltransactions.nCompanyId', $transaction->nCompanyId)
            ->where('tbltransactions.nAssignedAO', $transaction->nAssignedAO)
            ->select('tblpurchaseorders.nPurchaseOrderId')
            ->lockForUpdate()
            ->first();

        $createPO = function () use ($codes) {
            $year    = now()->format('Y');
            $prefix  = 'PO' . $year . '-';
            $last    = PurchaseOrder::where('strPurchaseOrderNo', 'LIKE', "$prefix%")->orderByDesc('strPurchaseOrderNo')->lockForUpdate()->first();
            $nextSeq = $last ? ((int)substr($last->strPurchaseOrderNo, strlen($prefix)) + 1) : 1;
            return PurchaseOrder::create([
                'strPurchaseOrderNo' => $prefix . str_pad($nextSeq, 4, '0', STR_PAD_LEFT),
                'nStatus'            => $codes['cart'],
            ]);
        };

        $poId = $existingOpenPO?->nPurchaseOrderId ?? $createPO()->nPurchaseOrderId;

        // ✅ Create PO Option only — status lives on the PO, no history row needed
        $poOption = PurchaseOrderOption::create([
            'nPurchaseOrderId' => $poId,
            'nPurchaseItemId'  => $validated['nPurchaseItemId'],
            'dtAddedToCart'    => now(),
        ]);

        DB::commit();

        broadcast(new PurchaseOrderOptionUpdated('added_to_cart', $poOption->nPurchaseOrder_ItemId, $poId, $validated['nPurchaseItemId'], $transactionItem->nTransactionId));
        broadcast(new PurchaseOrderUpdated('updated', $poId));

        return ['status' => 201, 'purchaseOrderOption' => $poOption];
    }

    /**
     * Remove a purchase option from its cart PO (deleting the PO when empty).
     *
     * @param  array  $validated  the validated removeFromCart payload.
     * @return array{status: int, message?: string}
     *         200 on success, 403 when the caller is neither management nor
     *         the assigned Account Officer, 404 (with the exact legacy
     *         message) when the option is not in any cart.
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException when the
     *         option / transaction item / transaction does not exist.
     */
    public function removeFromCart(array $validated): array
    {
        // Verify item exists + permissions
        $purchaseOption  = PurchaseOptions::where('nPurchaseItemId', $validated['nPurchaseItemId'])->firstOrFail();
        $transactionItem = TransactionItems::where('nTransactionItemId', $purchaseOption->nTransactionItemId)->firstOrFail();
        $transaction     = Transactions::where('nTransactionId', $transactionItem->nTransactionId)->firstOrFail();

        // Permissions — management, the assigned AO, or the AOTL.
        if (!$this->canCart($validated, $transaction)) {
            return ['status' => 403];
        }

        // ✅ Find the PO option directly — no history lookup needed
        $poOption = PurchaseOrderOption::where('nPurchaseItemId', $validated['nPurchaseItemId'])->first();

        if (!$poOption) {
            return ['status' => 404, 'message' => 'No active cart entry found for this option.'];
        }

        $purchaseOrderId = $poOption->nPurchaseOrderId;

        DB::beginTransaction();

        // Delete option record
        $poOption->delete();

        // Delete PO if empty
        $remaining = PurchaseOrderOption::where('nPurchaseOrderId', $purchaseOrderId)->count();
        $poDeleted = $remaining === 0;
        if ($poDeleted) {
            PurchaseOrder::where('nPurchaseOrderId', $purchaseOrderId)->delete();
        }

        DB::commit();

        broadcast(new PurchaseOrderOptionUpdated('removed_from_cart', $poOption->nPurchaseOrder_ItemId, $purchaseOrderId, $validated['nPurchaseItemId'], $transactionItem->nTransactionId));
        broadcast(new PurchaseOrderUpdated($poDeleted ? 'deleted' : 'updated', $purchaseOrderId));

        return ['status' => 200];
    }

    /**
     * The cart stages a purchase order must be in to receive a moved item.
     */
    private const MOVABLE_STATUSES = ['110', '120', '130']; // Cart · For Approval · For Payment

    /**
     * Who may cart-operate (targets + move): management, the Account
     * Officer the transaction is assigned to, or the Account Officer
     * Team Leader — user type 'X' (config mappings.user_types).
     */
    private function canCart(array $validated, Transactions $transaction): bool
    {
        if (!empty($validated['isManagement'])) {
            return true;
        }
        if ((int) $validated['nUserId'] === (int) $transaction->nAssignedAO) {
            return true;
        }

        return User::find($validated['nUserId'])?->cUserType === 'X';
    }

    /**
     * The other cart-stage POs one item can move to: orders that carry the
     * SAME transaction — which pins the same company and Account Officer —
     * and whose lines sit on the SAME supplier. Both filters ride on the
     * PO's own items, because a purchase order keeps no supplier or
     * transaction of its own; it is only what its lines make it.
     *
     * @return array{status: int, targets?: array<int, array<string, mixed>>}
     *         200 with the candidate POs (number, status stamp, line count
     *         and running total), or 403 when the caller is neither
     *         management nor the assigned Account Officer.
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException when the
     *         option / transaction item / transaction does not exist.
     */
    public function moveTargets(int $nPurchaseItemId, array $params): array
    {
        $purchaseOption  = PurchaseOptions::where('nPurchaseItemId', $nPurchaseItemId)->firstOrFail();
        $transactionItem = TransactionItems::where('nTransactionItemId', $purchaseOption->nTransactionItemId)->firstOrFail();
        $transaction     = Transactions::where('nTransactionId', $transactionItem->nTransactionId)->firstOrFail();

        if (!$this->canCart($params, $transaction)) {
            return ['status' => 403];
        }

        // The PO the item currently sits on can never be its own target.
        $sourcePoId = (int) PurchaseOrderOption::where('nPurchaseItemId', $nPurchaseItemId)->value('nPurchaseOrderId');

        $targets = PurchaseOrder::query()
            ->whereIn('nStatus', self::MOVABLE_STATUSES)
            ->where('nPurchaseOrderId', '!=', $sourcePoId)
            ->whereExists(function ($query) use ($purchaseOption, $transaction) {
                $query->selectRaw(1)
                    ->from('tblpurchaseorder_items as i2')
                    ->join('tblpurchaseitems as o2', 'o2.nPurchaseItemId', '=', 'i2.nPurchaseItemId')
                    ->join('tbltransactionitems as ti2', 'ti2.nTransactionItemId', '=', 'o2.nTransactionItemId')
                    ->join('tbltransactions as t2', 't2.nTransactionId', '=', 'ti2.nTransactionId')
                    ->whereColumn('i2.nPurchaseOrderId', 'tblpurchaseorders.nPurchaseOrderId')
                    ->where('o2.nSupplierId', $purchaseOption->nSupplierId)
                    ->where('t2.nTransactionId', $transaction->nTransactionId)
                    ->where('t2.nCompanyId', $transaction->nCompanyId)
                    ->where('t2.nAssignedAO', $transaction->nAssignedAO);
            })
            ->withCount('purchaseOrderOptions')
            ->orderByDesc('strPurchaseOrderNo')
            ->get();

        // The runnings per PO — lines and the same qty × unit-price total
        // the cards print (freight excluded; it stays with its own order).
        // The APPROVED purchase price counts (dPurchaseUnitPrice while the
        // status is 'A') — the raw canvassed column is only a fallback, so
        // the totals match what the accessor prices every other read with.
        $amounts = PurchaseOrderOption::query()
            ->join('tblpurchaseitems as o', 'o.nPurchaseItemId', '=', 'tblpurchaseorder_items.nPurchaseItemId')
            ->whereIn('tblpurchaseorder_items.nPurchaseOrderId', $targets->modelKeys())
            ->groupBy('tblpurchaseorder_items.nPurchaseOrderId')
            ->selectRaw(
                "tblpurchaseorder_items.nPurchaseOrderId, COUNT(*) as lineCount, "
                . "SUM(o.nQuantity * CASE WHEN o.cPurchaseUnitPriceStatus = 'A' "
                . "AND o.dPurchaseUnitPrice IS NOT NULL AND o.dPurchaseUnitPrice <> '' "
                . "THEN o.dPurchaseUnitPrice ELSE o.dUnitPrice END) as totalAmount",
            )
            ->get()
            ->keyBy('nPurchaseOrderId');

        $statusLabels = config('mappings.item_purchasing_status', []);

        return [
            'status'  => 200,
            'targets' => $targets->map(function (PurchaseOrder $po) use ($amounts, $statusLabels) {
                $stats = $amounts->get($po->nPurchaseOrderId);

                return [
                    'nPurchaseOrderId'   => (int) $po->nPurchaseOrderId,
                    'strPurchaseOrderNo' => $po->strPurchaseOrderNo,
                    'nStatus'            => $po->nStatus,
                    'statusLabel'        => $statusLabels[$po->nStatus] ?? '',
                    'lineCount'          => (int) ($stats->lineCount ?? $po->purchase_order_options_count),
                    'totalAmount'        => (float) ($stats->totalAmount ?? 0),
                ];
            })->all(),
        ];
    }

    /**
     * Move an item — together with its PO line — to ANOTHER cart-stage PO
     * of the same transaction · company · supplier · Account Officer.
     * The "transfer instead of delete" of the cart: the old line keeps its
     * quantities and prices, and a source PO emptied by the move is deleted
     * exactly as removeFromCart deletes it.
     *
     * @return array{status: int, message?: string}
     *         200 on success; 403 for a non-management outsider; 404 when
     *         the item has no cart entry or the receiving PO does not
     *         exist; 422 when the receiving PO is refused (own PO, wrong
     *         stage, or a different deal / supplier).
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException when the
     *         option / transaction item / transaction does not exist.
     */
    public function move(array $validated): array
    {
        $purchaseOption  = PurchaseOptions::where('nPurchaseItemId', $validated['nPurchaseItemId'])->firstOrFail();
        $transactionItem = TransactionItems::where('nTransactionItemId', $purchaseOption->nTransactionItemId)->firstOrFail();
        $transaction     = Transactions::where('nTransactionId', $transactionItem->nTransactionId)->firstOrFail();

        if (!$this->canCart($validated, $transaction)) {
            return ['status' => 403];
        }

        $poOption = PurchaseOrderOption::where('nPurchaseItemId', $validated['nPurchaseItemId'])->first();

        if (!$poOption) {
            return ['status' => 404, 'message' => 'No active cart entry found for this item.'];
        }

        $sourcePoId = (int) $poOption->nPurchaseOrderId;
        $targetPoId = (int) $validated['nTargetPurchaseOrderId'];

        if ($targetPoId === $sourcePoId) {
            return ['status' => 422, 'message' => 'The item is already on that purchase order.'];
        }

        $target = PurchaseOrder::find($targetPoId);
        if (!$target) {
            return ['status' => 404, 'message' => 'Receiving purchase order not found.'];
        }

        if (!in_array((string) $target->nStatus, self::MOVABLE_STATUSES, true)) {
            return ['status' => 422, 'message' => 'Items can only move to a Cart, For Approval or For Payment purchase order.'];
        }

        // The receiving PO must carry the same deal — same transaction
        // (company · Account Officer ride on it) and the same supplier.
        $sameDeal = PurchaseOrder::query()
            ->join('tblpurchaseorder_items as i2', 'i2.nPurchaseOrderId', '=', 'tblpurchaseorders.nPurchaseOrderId')
            ->join('tblpurchaseitems as o2', 'o2.nPurchaseItemId', '=', 'i2.nPurchaseItemId')
            ->join('tbltransactionitems as ti2', 'ti2.nTransactionItemId', '=', 'o2.nTransactionItemId')
            ->join('tbltransactions as t2', 't2.nTransactionId', '=', 'ti2.nTransactionId')
            ->where('tblpurchaseorders.nPurchaseOrderId', $targetPoId)
            ->where('o2.nSupplierId', $purchaseOption->nSupplierId)
            ->where('t2.nTransactionId', $transaction->nTransactionId)
            ->exists();

        if (!$sameDeal) {
            return ['status' => 422, 'message' => 'Items can only move to a purchase order from the same transaction · company · supplier · Account Officer.'];
        }

        DB::beginTransaction();

        // The same PO line, the same purchase item — only the order it
        // sits under changes; quantities and prices travel untouched.
        $poOption->nPurchaseOrderId = $targetPoId;
        $poOption->dtAddedToCart = now();
        $poOption->save();

        $sourceEmpty = PurchaseOrderOption::where('nPurchaseOrderId', $sourcePoId)->count() === 0;
        if ($sourceEmpty) {
            PurchaseOrder::where('nPurchaseOrderId', $sourcePoId)->delete();
        }

        DB::commit();

        // To the listeners this reads like a removal from the old order
        // (the item list refetches either way), plus an update on the
        // receiving one.
        broadcast(new PurchaseOrderOptionUpdated('removed_from_cart', $poOption->nPurchaseOrder_ItemId, $sourcePoId, $validated['nPurchaseItemId'], $transactionItem->nTransactionId));
        broadcast(new PurchaseOrderUpdated($sourceEmpty ? 'deleted' : 'updated', $sourcePoId));
        broadcast(new PurchaseOrderUpdated('updated', $targetPoId));

        return ['status' => 200];
    }
}
