<?php

namespace App\Http\Controllers\Api\Purchasing;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\PurchaseOrderOption\LatestPurchaseOrderOptionsHistoryRequest;
use App\Http\Requests\PurchaseOrderOption\AddToCartPurchaseOrderOptionRequest;
use App\Http\Requests\PurchaseOrderOption\RemoveFromCartPurchaseOrderOptionRequest;
use App\Services\Purchasing\PurchaseOptionsService;
use App\Services\Purchasing\PurchaseOrderOptionService;
use Exception;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class PurchaseOrderOptionsController extends ApiController
{
    public function __construct(
        private readonly PurchaseOrderOptionService $service,
        private readonly PurchaseOptionsService $purchaseOptionsService,
    ) {
    }

    /**
     * Validation moved to AddToCartPurchaseOrderOptionRequest, which
     * reproduces the old catch(Exception) 500 envelope byte-for-byte — the
     * try/catch below stays so lookup/DB failures keep their original
     * envelopes (404 / rollback + 500).
     */
    public function addToCart(AddToCartPurchaseOrderOptionRequest $request): JsonResponse
    {
        try {
            $result = $this->service->addToCart($request->validated());

            if ($result['status'] === 403) {
                return response()->json(['message' => 'Unauthorized. Not the assigned Account Officer.'], 403);
            }

            return response()->json(['message' => 'Added to cart successfully.', 'purchaseOrder' => $result['purchaseOrderOption']], 201);
        } catch (ModelNotFoundException) {
            return response()->json(['message' => 'Purchase option or transaction not found.'], 404);
        } catch (Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to add to cart.', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Validation moved to RemoveFromCartPurchaseOrderOptionRequest, which
     * reproduces the old catch(Exception) 500 envelope byte-for-byte — the
     * try/catch below stays so lookup/DB failures keep their original
     * envelopes (404 / rollback + 500).
     */
    public function removeFromCart(RemoveFromCartPurchaseOrderOptionRequest $request): JsonResponse
    {
        try {
            $result = $this->service->removeFromCart($request->validated());

            if ($result['status'] === 403) {
                return response()->json(['message' => 'Unauthorized. Not the assigned Account Officer.'], 403);
            }

            if ($result['status'] === 404) {
                return response()->json(['message' => $result['message']], 404);
            }

            return response()->json(['message' => 'Removed from cart successfully.'], 200);
        } catch (ModelNotFoundException) {
            return response()->json(['message' => 'Purchase option or transaction not found.'], 404);
        } catch (Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to remove from cart.', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Latest history per purchase item.
     * (moved from PurchaseItemHistoryController)
     */
    public function latestPurchaseOrderOptionsHistory(LatestPurchaseOrderOptionsHistoryRequest $request): JsonResponse
    {
        try {
            $histories = $this->purchaseOptionsService->latestHistories($request->validated('nPurchaseItemId'));

            return response()->json(['message' => 'Latest histories retrieved successfully.', 'histories' => $histories]);
        } catch (Exception $e) {
            return response()->json(['message' => 'Failed to retrieve histories.', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * All history rows for one purchase option.
     * (moved from PurchaseItemHistoryController)
     */
    public function allOptionHistory(int $nPurchaseItemId): JsonResponse
    {
        try {
            $records = $this->purchaseOptionsService->allOptionHistory($nPurchaseItemId);

            return $records->isEmpty()
                ? response()->json(['message' => 'No history found for this option.', 'histories' => []], 404)
                : response()->json(['message' => 'All histories retrieved successfully.', 'histories' => $records]);
        } catch (Exception $e) {
            return response()->json(['message' => 'Failed to retrieve histories.', 'error' => $e->getMessage()], 500);
        }
    }
}
