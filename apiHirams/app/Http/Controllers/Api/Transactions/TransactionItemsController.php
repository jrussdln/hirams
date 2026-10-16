<?php

namespace App\Http\Controllers\Api\Transactions;

use App\Events\ItemUpdated;

use App\Http\Controllers\Api\ApiController;
use App\Models\PurchaseOptions;
use App\Models\TransactionItems;
use App\Models\Transactions;
use Exception;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TransactionItemsController extends ApiController
{
    /**
     * Get all transaction items
     */
    public function index(): JsonResponse
    {
        try {
            $items = TransactionItems::all();

            return response()->json([
                'message' => __('messages.retrieve_success', ['name' => 'Transaction items']),
                'items'   => $items,
            ]);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Transaction items');
        }
    }

    /**
     * Create a new transaction item
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'nTransactionId' => 'required|integer',
                'strName'        => 'required|string|max:255',
                'nQuantity'      => 'required|integer',
                'strUOM'         => 'nullable|string|max:50',
                'strSpecs'       => 'nullable|string|max:20000',
                'dUnitABC'       => 'required|numeric',
            ]);

            $maxItemNumber = TransactionItems::where('nTransactionId', $validated['nTransactionId'])
                ->max('nItemNumber');

            $item = TransactionItems::create(array_merge($validated, [
                'nItemNumber' => $maxItemNumber ? $maxItemNumber + 1 : 1,
            ]));
            // In store()
            broadcast(new ItemUpdated('created', $item->nTransactionItemId, $item->nTransactionId))->toOthers();

            return response()->json([
                'message' => __('messages.store_success', ['name' => 'Transaction item']),
                'item'    => $item,
            ], 201);
        } catch (Exception $e) {
            return $this->handleException($e, 'store_failed', 'Transaction item');
        }
    }

    /**
     * Show a specific transaction item
     */
    public function show(int $id): JsonResponse
    {
        try {
            $item = TransactionItems::findOrFail($id);

            return response()->json([
                'message' => __('messages.retrieve_success', ['name' => 'Transaction item']),
                'item'    => $item,
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => __('messages.not_found', ['name' => 'Transaction item']),
                'error'   => $e->getMessage(),
            ], 404);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Transaction item');
        }
    }

    /**
     * Update an existing transaction item
     */
    public function update(Request $request, int $id): JsonResponse
    {
        try {
            $validated = $request->validate([
                'nTransactionId' => 'required|integer',
                'strName'        => 'required|string|max:255',
                'nQuantity'      => 'required|integer',
                'strUOM'         => 'nullable|string|max:50',
                'strSpecs'       => 'nullable|string|max:20000',
                'dUnitABC'       => 'required|numeric',
            ]);

            $item = TransactionItems::findOrFail($id);
            $item->update($validated);

            // In update()
            broadcast(new ItemUpdated('updated', $item->nTransactionItemId, $item->nTransactionId))->toOthers();


            return response()->json([
                'message' => __('messages.update_success', ['name' => 'Transaction item']),
                'item'    => $item,
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => __('messages.not_found', ['name' => 'Transaction item']),
                'error'   => $e->getMessage(),
            ], 404);
        } catch (Exception $e) {
            return $this->handleException($e, 'update_failed', 'Transaction item');
        }
    }

    /**
     * Delete a transaction item and re-order remaining items
     */
    // REPLACE destroy method
    public function destroy(int $id): JsonResponse
    {
        try {
            $item          = TransactionItems::findOrFail($id);
            $transactionId = $item->nTransactionId;

            // Delete all purchase options belonging to this item first
            PurchaseOptions::where('nTransactionItemId', $id)->delete();

            $item->delete();

            $counter = 1;
            TransactionItems::where('nTransactionId', $transactionId)
                ->orderBy('nItemNumber')
                ->get()
                ->each(function ($remaining) use (&$counter) {
                    $remaining->nItemNumber = $counter++;
                    $remaining->save();
                });

            // In destroy()
            broadcast(new ItemUpdated('deleted', $id, $transactionId))->toOthers();


            return response()->json([
                'message' => __('messages.delete_success', ['name' => 'Transaction item']),
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => __('messages.not_found', ['name' => 'Transaction item']),
                'error'   => $e->getMessage(),
            ], 404);
        } catch (Exception $e) {
            return $this->handleException($e, 'delete_failed', 'Transaction item');
        }
    }
    /**
     * Get items by transaction ID
     */
    // public function getItemsByTransaction(int $transactionId): JsonResponse
    // {
    //     try {
    //         $transaction = Transactions::findOrFail($transactionId);

    //         $items = TransactionItems::where('nTransactionId', $transactionId)
    //             ->orderBy('nItemNumber')
    //             ->get()
    //             ->map(fn($item) => [
    //                 'id'                 => $item->nTransactionItemId,
    //                 'nTransactionItemId' => $item->nTransactionItemId,
    //                 'nItemNumber'        => $item->nItemNumber,
    //                 'name'               => $item->strName,
    //                 'qty'                => $item->nQuantity,
    //                 'abc'                => $item->dUnitABC,
    //                 'uom'                => $item->strUOM,
    //                 'specs'              => $item->strSpecs,
    //             ]);

    //         return response()->json([
    //             'message'   => __('messages.retrieve_success', ['name' => 'Transaction items']),
    //             'cItemType' => $transaction->cItemType,
    //             'items'     => $items,
    //         ]);
    //     } catch (ModelNotFoundException $e) {
    //         return response()->json([
    //             'message' => __('messages.not_found', ['name' => 'Transaction']),
    //             'error'   => $e->getMessage(),
    //         ], 404);
    //     } catch (Exception $e) {
    //         return $this->handleException($e, 'retrieve_failed', 'Transaction items');
    //     }
    // }
    public function getItemsByTransaction(int $transactionId): JsonResponse
    {
        try {
            $transaction = Transactions::findOrFail($transactionId);
            $items = TransactionItems::with([
                'purchaseOptions.purchaseOrderOption.purchaseOrder', // ⬅ add .purchaseOrder
                'purchaseOptions.supplier',
                'purchaseOptions.inventories.serialNumbers',
            ])
                ->where('nTransactionId', $transactionId)
                ->orderBy('nItemNumber')
                ->get()
                ->map(fn($item) => [
                    'id'                 => $item->nTransactionItemId,
                    'nTransactionItemId' => $item->nTransactionItemId,
                    'nItemNumber'        => $item->nItemNumber,
                    'name'               => $item->strName,
                    'qty'                => $item->nQuantity,
                    'abc'                => $item->dUnitABC,
                    'uom'                => $item->strUOM,
                    'specs'              => $item->strSpecs,
                    'purchaseOptions'    => $item->purchaseOptions  // add options to each item
                        ->sortBy([['bAddOn', 'asc'], ['bIncluded', 'desc']])
                        ->values()
                        ->map(fn($option) => $this->formatOption($option)),
                ]);

            return response()->json([
                'message'   => __('messages.retrieve_success', ['name' => 'Transaction items']),
                'cItemType' => $transaction->cItemType,
                'items'     => $items,
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => __('messages.not_found', ['name' => 'Transaction']),
                'error'   => $e->getMessage(),
            ], 404);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Transaction items');
        }
    }
    private function formatOption($option): array
    {
        // Only ACTIVE rows (cStatus = 'A') count toward received/delivered totals.
        // Cancelled rows (cStatus = 'C') are excluded from qty/percentage/stamp.
        // ✅ Replace this line ONLY
        $activeInventories = $option->inventories->whereNotIn('cStatus', ['C']);

        // Sum all positive ACTIVE inventory rows → total received
        $receivedQty = $activeInventories
            ->where('nQuantity', '>', 0)
            ->sum('nQuantity');

        // Sum all negative ACTIVE inventory rows → total delivered (stored as negative)
        $deliveredQty = abs(
            $activeInventories
                ->where('nQuantity', '<', 0)
                ->sum('nQuantity')
        );

        // Keep the IDs of the first positive/negative ACTIVE row (for update/delete targets)
        $receivedInventory  = $activeInventories->firstWhere('nQuantity', '>', 0);
        $deliveredInventory = $activeInventories->first(fn($i) => $i->nQuantity < 0);

        return [
            'id'                    => $option->nPurchaseItemId,
            'nPurchaseItemId'     => $option->nPurchaseItemId,
            'nTransactionItemId'    => $option->nTransactionItemId,
            'nSupplierId'           => $option->nSupplierId,
            'supplierName'          => $option->supplier?->strSupplierName ?? null,
            'supplierNickName'      => $option->supplier?->strSupplierNickName ?? null,
            'nQuantity'             => $option->nQuantity,
            'strUOM'                => $option->strUOM,
            'strBrand'              => $option->strBrand,
            'strModel'              => $option->strModel,
            'strSpecs'              => $option->strSpecs,
            'dUnitPrice'            => $option->dUnitPrice,
            'dEWT'                  => $option->dEWT,
            'strProductCode'        => $option->strProductCode,
            'bIncluded'             => (bool) $option->bIncluded,
            'bPurchaseIncluded'     => (bool) $option->bPurchaseIncluded,
            'bAddOn'                => (bool) $option->bAddOn,
            'nSupplierContactId'    => $option->nSupplierContactId,
            'dtCanvass'             => $option->dtCanvass,
            'nPurchaseOrderId' => $option->purchaseOrderOption?->nPurchaseOrderId ?? null,
            'nStatus'          => $option->purchaseOrderOption?->purchaseOrder?->nStatus ?? null,

            // ── inventory split data (summed, not first-row-only) ──
            // ── inventory split data ──
            'nInventoryId'          => $receivedInventory?->nInventoryId ?? null,
            'nInventoryQty'         => $receivedQty,
            'nDeliveredInventoryId' => $deliveredInventory?->nInventoryId ?? null,
            'nDeliveredQty'         => $deliveredQty,
            'deliveredRows' => $option->inventories
                ->where('nQuantity', '<', 0)
                ->sortByDesc('dtLog')
                ->values()
                ->map(fn($i) => [
                    'nInventoryId'      => $i->nInventoryId,
                    'nQuantity'         => abs($i->nQuantity),
                    'dtLog'             => $i->dtLog,
                    'strReceiptNumber'  => $i->strReceiptNumber,   // ← was missing
                    'cStatus'           => $i->cStatus,            // ← so the UI can show VOID / re-activate
                    'serialNumbers'     => $i->serialNumbers
                        ->pluck('strSerialNumber')
                        ->filter()
                        ->values()
                        ->toArray(),
                ])
                ->toArray(),
        ];
    }
    /**
     * Update item order after drag & drop
     */
    public function updateOrder(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'items'               => 'required|array',
                'items.*.id'          => 'required|integer',
                'items.*.nItemNumber' => 'required|integer',
            ]);

            foreach ($validated['items'] as $itemData) {
                $item              = TransactionItems::findOrFail($itemData['id']);
                $item->nItemNumber = $itemData['nItemNumber'];
                $item->save();
            }
            $firstItem = TransactionItems::find($validated['items'][0]['id']);
            if ($firstItem) {

                // In updateOrder()
                broadcast(new ItemUpdated('reordered', 0, $firstItem->nTransactionId))->toOthers();
            }
            return response()->json([
                'message' => __('messages.update_success', ['name' => 'Item order']),
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => __('messages.not_found', ['name' => 'Transaction item']),
                'error'   => $e->getMessage(),
            ], 404);
        } catch (Exception $e) {
            return $this->handleException($e, 'update_failed', 'Item order');
        }
    }

    /**
     * Update transaction item specs
     */
    public function updateSpecs(Request $request, int $id): JsonResponse
    {
        try {
            $validated = $request->validate([
                'specs' => 'nullable|string|max:20000',
            ]);

            $item = TransactionItems::findOrFail($id);
            $item->update([
                'strSpecs' => $validated['specs'] ?? $item->strSpecs,
            ]);

            // In updateSpecs()
            broadcast(new ItemUpdated('specs_updated', $item->nTransactionItemId, $item->nTransactionId))->toOthers();
            return response()->json([
                'message' => __('messages.update_success', ['name' => 'Transaction Item']),
                'item'    => $item,
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => __('messages.not_found', ['name' => 'Transaction item']),
                'error'   => $e->getMessage(),
            ], 404);
        } catch (Exception $e) {
            return $this->handleException($e, 'update_failed', 'Transaction Item specs');
        }
    }
    /**
     * Bulk create transaction items
     */
    public function bulkStore(Request $request, int $transactionId): JsonResponse
    {
        try {
            $validated = $request->validate([
                'items'              => 'required|array|min:1',
                'items.*.strName'    => 'required|string|max:255',
                'items.*.nQuantity'  => 'required|numeric|min:0',
                'items.*.strUOM'     => 'required|string|max:50',
                'items.*.dUnitABC'   => 'nullable|numeric|min:0',
                'items.*.strSpecs'   => 'nullable|string|max:20000',
            ]);

            Transactions::findOrFail($transactionId);

            $maxItemNumber = TransactionItems::where('nTransactionId', $transactionId)
                ->max('nItemNumber') ?? 0;

            $created = [];
            foreach ($validated['items'] as $itemData) {
                $maxItemNumber++;
                $item = TransactionItems::create([
                    'nTransactionId' => $transactionId,
                    'strName'        => $itemData['strName'],
                    'nQuantity'      => $itemData['nQuantity'],
                    'strUOM'         => $itemData['strUOM'],
                    'dUnitABC'       => $itemData['dUnitABC'] ?? 0,
                    'strSpecs'       => $itemData['strSpecs'] ?? null,
                    'nItemNumber'    => $maxItemNumber,
                ]);
                $created[] = $item;
            }

            return response()->json([
                'message' => __('messages.store_success', ['name' => 'Bulk transaction items']),
                'items'   => $created,
            ], 201);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => __('messages.not_found', ['name' => 'Transaction']),
                'error'   => $e->getMessage(),
            ], 404);
        } catch (Exception $e) {
            return $this->handleException($e, 'store_failed', 'Bulk transaction items');
        }
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------
    /**
     * GET /api/transaction-items/suggestions?clientId={id}&search={name}
     *
     * Returns up to 8 deduplicated past items for the given client
     * whose name matches the search string.
     *
     * ⚠️  ROUTE MUST be declared BEFORE apiResource('transaction-items')
     *     in routes/api.php:
     *
     *   Route::get('transaction-items/suggestions', [TransactionItemsController::class, 'getSuggestions']);
     *   Route::apiResource('transaction-items', TransactionItemsController::class);
     */
    public function getSuggestions(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'clientId' => 'required|integer',
                'search'   => 'nullable|string|max:255',
            ]);

            $search = trim($validated['search'] ?? '');

            // Read actual table names from the models — handles custom $table values
            $itemsTable        = (new TransactionItems())->getTable(); // tbltransactionitems
            $transactionsTable = (new Transactions())->getTable();     // tbltransactions

            $suggestions = TransactionItems::select([
                "{$itemsTable}.strName",
                "{$itemsTable}.strSpecs",
                "{$itemsTable}.nQuantity",
                "{$itemsTable}.strUOM",
                "{$itemsTable}.dUnitABC",
            ])
                ->join(
                    $transactionsTable,
                    "{$itemsTable}.nTransactionId",
                    '=',
                    "{$transactionsTable}.nTransactionId"
                )
                ->where("{$transactionsTable}.nClientId", $validated['clientId'])
                ->when($search !== '', function ($query) use ($search, $itemsTable) {
                    $query->where("{$itemsTable}.strName", 'like', '%' . $search . '%');
                })
                ->orderByDesc("{$itemsTable}.nTransactionItemId") // most recent first
                ->get()
                // Deduplicate by normalised name — keep the latest occurrence
                ->unique(fn($item) => strtolower(trim($item->strName)))
                ->take(8)
                ->values()
                ->map(fn($item) => [
                    'name'  => $item->strName,
                    'specs' => $item->strSpecs,
                    'qty'   => $item->nQuantity,
                    'uom'   => $item->strUOM,
                    'abc'   => $item->dUnitABC,
                ]);

            return response()->json([
                'message'     => __('messages.retrieve_success', ['name' => 'Suggestions']),
                'suggestions' => $suggestions,
            ]);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Suggestions');
        }
    }
}
