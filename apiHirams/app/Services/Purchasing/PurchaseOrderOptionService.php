<?php

namespace App\Services\Purchasing;

use App\Events\PurchaseOrderOptionUpdated;
use App\Events\PurchaseOrderUpdated;
use App\Models\PurchaseOptions;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderOption;
use App\Models\TransactionItems;
use App\Models\Transactions;
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

        // Permissions
        if (!$validated['isManagement'] && (int)$validated['nUserId'] !== (int)$transaction->nAssignedAO) {
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

        if (!$validated['isManagement'] && (int)$validated['nUserId'] !== (int)$transaction->nAssignedAO) {
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
}
