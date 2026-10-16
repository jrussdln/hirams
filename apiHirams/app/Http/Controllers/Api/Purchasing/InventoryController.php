<?php

namespace App\Http\Controllers\Api\Purchasing;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Inventory\AdjustQuantityInventoryRequest;
use App\Http\Requests\Inventory\BulkCreateJevRequest;
use App\Http\Requests\Inventory\BulkReceiveDeliverRequest;
use App\Http\Requests\Inventory\BulkUpdateStatusInventoryRequest;
use App\Http\Requests\Inventory\CreateJevForPendingDeliveredRequest;
use App\Http\Requests\Inventory\CreateJevForPendingRequest;
use App\Http\Requests\Inventory\InventoryHistoryBulkRequest;
use App\Http\Requests\Inventory\InventoryHistoryRequest;
use App\Http\Requests\Inventory\LatestDeliveredReceiptRequest;
use App\Http\Requests\Inventory\StoreInventoryRequest;
use App\Http\Requests\Inventory\SuggestedDeliveredReceiptRequest;
use App\Http\Requests\Inventory\UpdateInventoryRequest;
use App\Services\Purchasing\InventoryMovementService;
use App\Services\Purchasing\InventoryService;
use Exception;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class InventoryController extends ApiController
{
    public function __construct(
        private readonly InventoryService $service,
        private readonly InventoryMovementService $movement,
    ) {
    }

    /**
     * Get all inventory records with optional purchase option filter
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $inventories = $this->service->listFor(
                $request->filled('nPurchaseItemId') ? $request->nPurchaseItemId : null
            );

            return response()->json([
                'message'     => __('messages.retrieve_success', ['name' => 'Inventory']),
                'inventories' => $inventories,
            ]);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Inventory');
        }
    }

    /**
     * Get a single inventory record by ID
     */
    public function show(int $id): JsonResponse
    {
        try {
            $inventory = $this->service->find($id);

            return response()->json([
                'message'   => __('messages.retrieve_success', ['name' => 'Inventory']),
                'inventory' => $inventory,
            ]);
        } catch (ModelNotFoundException) {
            return $this->notFound('Inventory');
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Inventory');
        }
    }

    /**
     * Create a new inventory record
     */
    public function store(StoreInventoryRequest $request): JsonResponse
    {
        try {
            $inventory = $this->service->create($request->validated());

            return response()->json([
                'message'   => __('messages.create_success', ['name' => 'Inventory']),
                'inventory' => $inventory,
            ], 201);
        } catch (QueryException $e) {
            return $this->handleDuplicateEntry($e);
        } catch (Exception $e) {
            return $this->handleException($e, 'create_failed', 'Inventory');
        }
    }

    /**
     * Update an existing inventory record
     */
    public function update(UpdateInventoryRequest $request, int $id): JsonResponse
    {
        try {
            $inventory = $this->service->update($id, $request->validated());

            return response()->json([
                'message'   => __('messages.update_success', ['name' => 'Inventory']),
                'inventory' => $inventory,
            ]);
        } catch (ModelNotFoundException) {
            return $this->notFound('Inventory');
        } catch (Exception $e) {
            return $this->handleException($e, 'update_failed', 'Inventory');
        }
    }

    /**
     * Delete an inventory record
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $inventory = $this->service->delete($id);

            return response()->json([
                'message'          => __('messages.delete_success', ['name' => 'Inventory']),
                'deleted_inventory' => $inventory,
            ]);
        } catch (ModelNotFoundException) {
            return $this->notFound('Inventory');
        } catch (Exception $e) {
            return $this->handleException($e, 'delete_failed', 'Inventory');
        }
    }

    /**
     * Adjust inventory quantity (increment or decrement)
     */
    public function adjustQuantity(AdjustQuantityInventoryRequest $request, int $id): JsonResponse
    {
        try {
            $inventory = $this->service->adjustQuantity($id, $request->validated());

            return response()->json([
                'message'   => __('messages.update_success', ['name' => 'Inventory Quantity']),
                'inventory' => $inventory,
            ]);
        } catch (ModelNotFoundException) {
            return $this->notFound('Inventory');
        } catch (Exception $e) {
            return $this->handleException($e, 'update_failed', 'Inventory Quantity');
        }
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private function handleDuplicateEntry(QueryException $e): JsonResponse
    {
        if ($e->errorInfo[1] == 1062) {
            return response()->json(['message' => 'Duplicate inventory record already exists.'], 409);
        }
        throw $e;
    }

    public function getInventory(): JsonResponse
    {
        try {
            $inventories = $this->service->summary();

            return response()->json([
                'message'     => __('messages.retrieve_success', ['name' => 'Inventory']),
                'inventories' => $inventories,
            ]);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Inventory');
        }
    }

    public function history(InventoryHistoryRequest $request): JsonResponse
    {
        try {
            $rows = $this->service->history($request->validated('nPurchaseItemId'));

            return response()->json([
                'message' => __('messages.retrieve_success', ['name' => 'Inventory History']),
                'rows'    => $rows,
            ]);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Inventory History');
        }
    }

    /**
     * Get the most recent delivered receipt number, optionally scoped to a supplier.
     * Used only to power the "suggested next receipt no." placeholder.
     */
    public function latestDeliveredReceipt(LatestDeliveredReceiptRequest $request): JsonResponse
    {
        try {
            $validated = $request->validated();

            $latest = $this->service->latestDeliveredReceipt($validated['nSupplierId'] ?? null);

            return response()->json([
                'message'         => __('messages.retrieve_success', ['name' => 'Latest Receipt']),
                'strReceiptNumber' => $latest?->strReceiptNumber,
                'dtLog'            => $latest?->dtLog,
            ]);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Latest Receipt');
        }
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
     */
    public function suggestedDeliveredReceipt(SuggestedDeliveredReceiptRequest $request): JsonResponse
    {
        try {
            $result = $this->service->suggestedDeliveredReceipt($request->validated());

            // Nothing delivered yet → no base to inherit from: leave the field
            // empty (it stays required, so the user types the first number).
            if ($result['latest'] === null) {
                return response()->json([
                    'message'         => __('messages.retrieve_success', ['name' => 'Suggested Receipt']),
                    'strReceiptNumber' => null,
                    'source'          => null,
                ]);
            }

            $latest = $result['latest'];

            return response()->json([
                'message'          => __('messages.retrieve_success', ['name' => 'Suggested Receipt']),
                'strReceiptNumber' => $result['reuse']
                    ? $latest->strReceiptNumber
                    : $result['next'],
                'source'           => $result['reuse'] ? 'reuse' : 'next',
                'basedOn'          => $latest->strReceiptNumber,
            ]);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Suggested Receipt');
        }
    }

    /**
     * Create a JEV for all pending (cStatus = 'P') received inventory rows
     * belonging to a purchase item, and stamp its nJEVId onto those rows.
     */
    public function createJevForPending(CreateJevForPendingRequest $request): JsonResponse
    {
        try {
            $result = $this->movement->createJevForPending($request->validated('nPurchaseItemId'));

            return response()->json([
                'message'    => 'JEV created and linked to pending inventory.',
                'jev'        => $result['jev'],
                'updatedIds' => $result['updatedIds'],
            ], 201);
        } catch (Exception $e) {
            return $this->handleException($e, 'create_failed', 'JEV');
        }
    }

    public function createJevForPendingDelivered(CreateJevForPendingDeliveredRequest $request): JsonResponse
    {
        try {
            $result = $this->movement->createJevForPendingDelivered($request->validated('nPurchaseItemId'));

            return response()->json([
                'message'    => 'JEV created and linked to pending delivered inventory.',
                'jev'        => $result['jev'],
                'updatedIds' => $result['updatedIds'],
            ], 201);
        } catch (Exception $e) {
            return $this->handleException($e, 'create_failed', 'JEV');
        }
    }

    public function bulkReceiveDeliver(BulkReceiveDeliverRequest $request): JsonResponse
    {
        try {
            $createdIds = $this->movement->bulkReceiveDeliver($request->validated());

            return response()->json([
                'message'    => 'Inventory recorded.',
                'created'    => count($createdIds),
                'inventoryIds' => $createdIds,
            ], 201);
        } catch (ValidationException $e) {
            return response()->json(['message' => 'Validation failed', 'errors' => $e->errors()], 422);
        } catch (Exception $e) {
            return $this->handleException($e, 'create_failed', 'Inventory');
        }
    }

    /** History for many items in one query (replaces N getHistory calls) */
    public function historyBulk(InventoryHistoryBulkRequest $request): JsonResponse
    {
        $rows = $this->service->historyBulk($request->validated('ids'));

        return response()->json(['rows' => $rows]);
    }

    /** Flip many inventory rows at once (JEV finalize / undo) */
    public function bulkUpdateStatus(BulkUpdateStatusInventoryRequest $request): JsonResponse
    {
        $v = $request->validated();

        $this->service->bulkUpdateStatus($v['ids'], $v['cStatus']);

        return response()->json(['message' => 'Updated.', 'updated' => count($v['ids'])]);
    }

    public function bulkCreateJev(BulkCreateJevRequest $request): JsonResponse
    {
        try {
            $created = $this->movement->bulkCreateJev($request->validated());

            return response()->json([
                'message' => 'JEVs created and linked.',
                'created' => $created,
            ], 201);
        } catch (Exception $e) {
            return $this->handleException($e, 'create_failed', 'JEV');
        }
    }
}
