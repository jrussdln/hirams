<?php

namespace App\Http\Controllers\Api\Purchasing;

use App\Events\PurchaseOrderUpdated;
use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\PurchaseOrder\ProceedToPODetailsRequest;
use App\Http\Requests\PurchaseOrder\SyncPurchaseOrderStatusRequest;
use App\Http\Requests\PurchaseOrder\UpdateCartStatusBulkRequest;
use App\Http\Requests\PurchaseOrder\UpdateCartStatusRequest;
use App\Services\Purchasing\PurchaseOrderService;
use App\Services\Purchasing\PurchaseOrderStatusSync;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PurchaseOrderController extends ApiController
{
    public function __construct(private readonly PurchaseOrderService $service)
    {
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $purchaseOrder = $this->service->createPurchaseOrder();

            return response()->json([
                'message'       => 'Purchase Order created successfully.',
                'purchaseOrder' => $purchaseOrder,
            ], 201);
        } catch (Exception $e) {
            return response()->json(['message' => 'Failed to create Purchase Order.', 'error' => $e->getMessage()], 500);
        }
    }

    public function getAllPurchaseOrders(): JsonResponse
    {
        try {
            $purchaseOrders = $this->service->allPurchaseOrders();

            return response()->json([
                'message'        => 'Purchase orders retrieved successfully.',
                'purchaseOrders' => $purchaseOrders,
            ]);
        } catch (Exception $e) {
            return response()->json(['message' => 'Failed to retrieve purchase orders.', 'error' => $e->getMessage()], 500);
        }
    }

    // ✅ nStatus lives directly on PurchaseOrder now — no history table involved
    public function updateCartStatus(UpdateCartStatusRequest $request): JsonResponse
    {
        try {
            $purchaseOrder = $this->service->updateCartStatus($request->validated());

            return response()->json([
                'message'       => 'Status updated successfully.',
                'purchaseOrder' => $purchaseOrder,
            ]);
        } catch (Exception $e) {
            return response()->json(['message' => 'Failed to update status.', 'error' => $e->getMessage()], 500);
        }
    }

    public function updateCartStatusBulk(UpdateCartStatusBulkRequest $request): JsonResponse
    {
        try {
            $purchaseOrders = $this->service->updateCartStatusBulk($request->validated());

            return response()->json([
                'message' => 'Purchase order statuses updated successfully.',
                'updated' => $purchaseOrders->pluck('nPurchaseOrderId'),
            ]);
        } catch (Exception $e) {
            return response()->json(['message' => 'Failed to update statuses.', 'error' => $e->getMessage()], 500);
        }
    }

    // ✅ UPDATED — removed dtProceedToPayment
    public function proceedToPODetails(ProceedToPODetailsRequest $request): JsonResponse
    {
        try {
            $po = $this->service->proceedToPODetails($request->validated());

            return response()->json([
                'message'       => 'Purchase order details updated successfully.',
                'purchaseOrder' => $po,
            ]);
        } catch (Exception $e) {
            return response()->json(['message' => 'Failed to update details.', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * The freight charge on the PO — owned by the Freight / EWT editor.
     */
    public function updateFreight(Request $request, int $id): JsonResponse
    {
        try {
            $validated = $request->validate([
                'dFreight' => 'nullable|numeric|min:0',
            ]);
            $validated['nPurchaseOrderId'] = $id;

            $po = $this->service->updateFreight($validated);

            return response()->json([
                'message'       => 'Freight updated successfully.',
                'purchaseOrder' => $po,
            ]);
        } catch (Exception $e) {
            return response()->json(['message' => 'Failed to update freight.', 'error' => $e->getMessage()], 500);
        }
    }

    public function getBySupplier(Request $request): JsonResponse
    {
        try {
            if (!$supplierId = $request->query('nSupplierId')) {
                return response()->json(['message' => 'Supplier ID is required.'], 400);
            }

            $pos = $this->service->bySupplier($supplierId);

            return response()->json(['message' => 'Purchase orders retrieved successfully.', 'data' => $pos]);
        } catch (Exception $e) {
            return response()->json(['message' => 'Failed to retrieve purchase orders.', 'error' => $e->getMessage()], 500);
        }
    }

    // ✅ Sync PO status based on inventory received/delivered totals for a given item.
    //    nStatus now lives on the PO itself (shared across all its items), so this
    //    updates the PO's nStatus directly instead of writing per-item history rows.
    public function syncPurchaseOrderStatus(SyncPurchaseOrderStatusRequest $request): JsonResponse
    {
        try {
            $validated = $request->validated();

            app(PurchaseOrderStatusSync::class)->sync(
                (int) $validated['nPurchaseOrderId'],
                $validated['nReceivedStatus'],
                $validated['nDeliveredStatus'],
                $validated['nPaidStatus'],
            );

            broadcast(new PurchaseOrderUpdated('status_synced', $validated['nPurchaseOrderId']));

            return response()->json(['message' => 'Purchase order status synced.']);
        } catch (Exception $e) {
            return response()->json(['message' => 'Failed to sync status.', 'error' => $e->getMessage()], 500);
        }
    }
}
