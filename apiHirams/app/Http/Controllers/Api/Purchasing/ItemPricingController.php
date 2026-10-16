<?php

namespace App\Http\Controllers\Api\Purchasing;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\ItemPricing\BulkStoreItemPricingRequest;
use App\Http\Requests\ItemPricing\GetTaxItemPricingRequest;
use App\Http\Requests\ItemPricing\StoreItemPricingRequest;
use App\Http\Requests\ItemPricing\UpdateItemPricingRequest;
use App\Services\Purchasing\ItemPricingService;
use Exception;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ItemPricingController extends ApiController
{
    public function __construct(private readonly ItemPricingService $service)
    {
    }

    /* ─────────────────────────────────────────────────────────────────
       INDEX
    ───────────────────────────────────────────────────────────────── */

    public function index(Request $request)
    {
        try {
            $itemPricings = $this->service->index($request);

            return response()->json([
                'success'      => true,
                'message'      => 'Item pricings retrieved successfully',
                'itemPricings' => $itemPricings,
            ], 200);
        } catch (Exception $e) {
            $this->service->logError($e);
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve item pricings',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }
    /* ─────────────────────────────────────────────────────────────────
   GET TAX FOR ITEM
   Returns only the computed tax for a single transaction item
   within a pricing set.

   GET /item-pricings/tax?transaction_item_id=X&pricing_set_id=Y
───────────────────────────────────────────────────────────────── */

    public function getTax(GetTaxItemPricingRequest $request): JsonResponse
    {
        try {
            $tax = $this->service->calculateTax(
                (int) $request->transaction_item_id,
                (int) $request->pricing_set_id,
                $request->has('unit_selling_price')
                    ? (float) $request->unit_selling_price
                    : null,               // ← pass through; null = use saved price
            );

            return response()->json([
                'success'             => true,
                'message'             => 'Tax calculated successfully',
                'transaction_item_id' => (int) $request->transaction_item_id,
                'pricing_set_id'      => (int) $request->pricing_set_id,
                'tax'                 => $tax,
            ]);
        } catch (Exception $e) {
            $this->service->logError($e);
            return response()->json([
                'success' => false,
                'message' => 'Failed to calculate tax',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }
    /* ─────────────────────────────────────────────────────────────────
       STORE
    ───────────────────────────────────────────────────────────────── */

    public function store(StoreItemPricingRequest $request)
    {
        try {
            $validated = $request->validated();

            $exists = $this->service->existsForCombination($validated['nPricingSetId'], $validated['nTransactionItemId']);

            if ($exists) {
                return response()->json([
                    'success' => false,
                    'message' => 'Item pricing already exists for this combination',
                ], 409);
            }

            $itemPricing = $this->service->create($validated);

            return response()->json([
                'success'     => true,
                'message'     => 'Item pricing created successfully',
                'itemPricing' => $itemPricing->load(['pricingSet', 'transactionItem']),
            ], 201);
        } catch (Exception $e) {
            DB::rollBack();
            $this->service->logError($e);
            return response()->json([
                'success' => false,
                'message' => 'Failed to create item pricing',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /* ─────────────────────────────────────────────────────────────────
       SHOW
    ───────────────────────────────────────────────────────────────── */

    public function show($id)
    {
        try {
            $itemPricing = $this->service->show($id);

            return response()->json([
                'success'     => true,
                'message'     => 'Item pricing retrieved successfully',
                'itemPricing' => $itemPricing,
            ], 200);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Item pricing not found',
            ], 404);
        } catch (Exception $e) {
            $this->service->logError($e);
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve item pricing',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /* ─────────────────────────────────────────────────────────────────
       UPDATE
    ───────────────────────────────────────────────────────────────── */

    public function update(UpdateItemPricingRequest $request, $id)
    {
        try {
            $itemPricing = $this->service->find((int) $id);

            if ($request->has('nPricingSetId') || $request->has('nTransactionItemId')) {
                $pricingSetId      = $request->nPricingSetId      ?? $itemPricing->nPricingSetId;
                $transactionItemId = $request->nTransactionItemId ?? $itemPricing->nTransactionItemId;

                $exists = $this->service->existsForCombination($pricingSetId, $transactionItemId, (int) $id);

                if ($exists) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Item pricing already exists for this combination',
                    ], 409);
                }
            }

            $itemPricing = $this->service->update((int) $id, $request->only([
                'nPricingSetId',
                'nTransactionItemId',
                'dUnitSellingPrice',
                'bPricingLocked',
            ]));

            return response()->json([
                'success'     => true,
                'message'     => 'Item pricing updated successfully',
                'itemPricing' => $itemPricing->fresh(['pricingSet', 'transactionItem']),
            ], 200);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Item pricing not found',
            ], 404);
        } catch (Exception $e) {
            DB::rollBack();
            $this->service->logError($e);
            return response()->json([
                'success' => false,
                'message' => 'Failed to update item pricing',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /* ─────────────────────────────────────────────────────────────────
       DESTROY
    ───────────────────────────────────────────────────────────────── */

    public function destroy($id)
    {
        try {
            $this->service->delete((int) $id);

            return response()->json([
                'success' => true,
                'message' => 'Item pricing deleted successfully',
            ], 200);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Item pricing not found',
            ], 404);
        } catch (Exception $e) {
            DB::rollBack();
            $this->service->logError($e);
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete item pricing',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /* ─────────────────────────────────────────────────────────────────
       BULK STORE  — matches frontend payload:
         { nPricingSetId, items: [{ nTransactionItemId, nItemPriceId, dUnitSellingPrice }] }
    ───────────────────────────────────────────────────────────────── */

    public function bulkStore(BulkStoreItemPricingRequest $request)
    {
        try {
            $results = $this->service->bulkStore($request->validated());

            return response()->json([
                'success'      => true,
                'message'      => 'Bulk item pricings saved successfully',
                'itemPricings' => $results,
            ], 200);
        } catch (Exception $e) {
            DB::rollBack();
            $this->service->logError($e);
            return response()->json([
                'success' => false,
                'message' => 'Failed to process bulk item pricings',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /* ─────────────────────────────────────────────────────────────────
       GET BY PRICING SET
    ───────────────────────────────────────────────────────────────── */

    public function getByPricingSet($pricingSetId)
    {
        try {
            $itemPricings = $this->service->byPricingSet($pricingSetId);

            return response()->json([
                'success'      => true,
                'message'      => 'Item pricings retrieved successfully',
                'itemPricings' => $itemPricings,
            ], 200);
        } catch (Exception $e) {
            $this->service->logError($e);
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve item pricings',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /* ─────────────────────────────────────────────────────────────────
       DELETE BY PRICING SET
    ───────────────────────────────────────────────────────────────── */

    public function deleteByPricingSet($pricingSetId)
    {
        try {
            $count = $this->service->deleteByPricingSet($pricingSetId);

            return response()->json([
                'success'       => true,
                'message'       => 'Item pricings deleted successfully',
                'deleted_count' => $count,
            ], 200);
        } catch (Exception $e) {
            DB::rollBack();
            $this->service->logError($e);
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete item pricings',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }
}
