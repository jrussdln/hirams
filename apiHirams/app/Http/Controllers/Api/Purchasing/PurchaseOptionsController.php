<?php

namespace App\Http\Controllers\Api\Purchasing;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\PurchaseOptions\CalculateEWTPurchaseOptionsRequest;
use App\Http\Requests\PurchaseOptions\GetSuggestionsPurchaseOptionsRequest;
use App\Http\Requests\PurchaseOptions\StorePurchaseOptionsRequest;
use App\Http\Requests\PurchaseOptions\UpdatePurchaseOptionsRequest;
use App\Http\Requests\PurchaseOptions\UpdateSpecsPurchaseOptionsRequest;
use App\Services\Purchasing\PurchaseOptionsService;
use Exception;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;

class PurchaseOptionsController extends ApiController
{
    public function __construct(private readonly PurchaseOptionsService $service)
    {
    }

    public function index(): JsonResponse
    {
        try {
            $purchaseOptions = $this->service->all();

            return response()->json([
                'message' => __('messages.retrieve_success', ['name' => 'Purchase options']),
                'items'   => $purchaseOptions,
            ]);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Purchase options');
        }
    }

    public function store(StorePurchaseOptionsRequest $request): JsonResponse
    {
        try {
            $purchaseOption = $this->service->create($request->validated());

            return response()->json([
                'message' => __('messages.create_success', ['name' => 'Purchase Option']),
                'item'    => $purchaseOption,
            ], 201);
        } catch (Exception $e) {
            return $this->handleException($e, 'create_failed', 'Purchase Option');
        }
    }

    public function show(int $id): JsonResponse
    {
        try {
            $purchaseOption = $this->service->find($id);

            return response()->json([
                'message' => __('messages.retrieve_success', ['name' => 'Purchase option']),
                'item'    => $purchaseOption,
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => __('messages.not_found', ['name' => 'Purchase option']),
                'error'   => $e->getMessage(),
            ], 404);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Purchase option');
        }
    }

    public function update(UpdatePurchaseOptionsRequest $request, int $id): JsonResponse
    {
        try {
            $purchaseOption = $this->service->update($id, $request->validated());

            return response()->json([
                'message' => __('messages.update_success', ['name' => 'Purchase Option']),
                'item'    => $purchaseOption,
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => __('messages.not_found', ['name' => 'Purchase option']),
                'error'   => $e->getMessage(),
            ], 404);
        } catch (Exception $e) {
            return $this->handleException($e, 'update_failed', 'Purchase Option');
        }
    }

    public function destroy(int $id): JsonResponse
    {
        try {
            $this->service->delete($id);

            return response()->json([
                'message' => __('messages.delete_success', ['name' => 'Purchase Option']),
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => __('messages.not_found', ['name' => 'Purchase option']),
                'error'   => $e->getMessage(),
            ], 404);
        } catch (Exception $e) {
            return $this->handleException($e, 'delete_failed', 'Purchase Option');
        }
    }

    public function getByItem(int $itemId): JsonResponse
    {
        try {
            $options = $this->service->byItem($itemId);

            return response()->json([
                'message'         => __('messages.retrieve_success', ['name' => 'Purchase options']),
                'purchaseOptions' => $options,
            ]);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Purchase options');
        }
    }

    public function getAddOnsByItem(int $itemId): JsonResponse
    {
        try {
            $options = $this->service->addOnsByItem($itemId);

            return response()->json([
                'message'         => __('messages.retrieve_success', ['name' => 'Purchase options']),
                'purchaseOptions' => $options,
            ]);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Purchase options');
        }
    }

    public function updateSpecs(UpdateSpecsPurchaseOptionsRequest $request, int $id): JsonResponse
    {
        try {
            $purchaseOption = $this->service->updateSpecs($id, $request->validated());

            return response()->json([
                'message' => __('messages.update_success', ['name' => 'Purchase Option']),
                'item'    => $purchaseOption,
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => __('messages.not_found', ['name' => 'Purchase option']),
                'error'   => $e->getMessage(),
            ], 404);
        } catch (Exception $e) {
            return $this->handleException($e, 'update_failed', 'Purchase Option specs');
        }
    }

    public function calculateEWT(CalculateEWTPurchaseOptionsRequest $request): JsonResponse
    {
        try {
            $calculatedEWT = $this->service->calculateEWT($request->validated());

            // In PurchaseOptionsController::calculateEWT()
            return response()->json([
                'message'       => __('messages.retrieve_success', ['name' => 'EWT']),
                'calculatedEWT' => $calculatedEWT,  // fix the typo here
            ]);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'EWT');
        }
    }

    public function getSuggestions(GetSuggestionsPurchaseOptionsRequest $request): JsonResponse
    {
        try {
            $suggestions = $this->service->suggestions($request->validated());

            return response()->json([
                'message'     => __('messages.retrieve_success', ['name' => 'Purchase option suggestions']),
                'suggestions' => $suggestions,
            ]);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Purchase option suggestions');
        }
    }
}
