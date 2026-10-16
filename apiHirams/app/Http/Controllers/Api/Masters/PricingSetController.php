<?php

namespace App\Http\Controllers\Api\Masters;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\PricingSet\StorePricingSetRequest;
use App\Http\Requests\PricingSet\UpdatePricingSetRequest;
use App\Services\Masters\PricingSetService;
use Exception;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PricingSetController extends ApiController
{
    public function __construct(private readonly PricingSetService $service)
    {
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $pricingSets = $this->service->listing($request->query('nTransactionId'));

            return response()->json([
                'message' => __('messages.retrieve_success', ['name' => 'Pricing Sets']),
                'data'    => $pricingSets,
            ]);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Pricing Sets');
        }
    }

    public function store(StorePricingSetRequest $request): JsonResponse
    {
        try {
            $pricingSet = $this->service->create($request->validated());

            return response()->json([
                'message' => __('messages.create_success', ['name' => 'Pricing Set']),
                'data'    => $pricingSet,
            ], 201);
        } catch (Exception $e) {
            return $this->handleException($e, 'create_failed', 'Pricing Set');
        }
    }

    public function show(int $id): JsonResponse
    {
        try {
            $pricingSet = $this->service->findWithItems($id);

            return response()->json([
                'message' => __('messages.retrieve_success', ['name' => 'Pricing Set']),
                'data'    => $pricingSet,
            ]);
        } catch (ModelNotFoundException) {
            return response()->json([
                'message' => __('messages.not_found', ['name' => 'Pricing Set']),
            ], 404);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Pricing Set');
        }
    }

    public function update(UpdatePricingSetRequest $request, int $id): JsonResponse
    {
        try {
            $pricingSet = $this->service->update($id, $request->validated());

            return response()->json([
                'message' => __('messages.update_success', ['name' => 'Pricing Set']),
                'data'    => $pricingSet,
            ]);
        } catch (ModelNotFoundException) {
            return response()->json([
                'message' => __('messages.not_found', ['name' => 'Pricing Set']),
            ], 404);
        } catch (Exception $e) {
            return $this->handleException($e, 'update_failed', 'Pricing Set');
        }
    }

    public function destroy(int $id): JsonResponse
    {
        try {
            $pricingSet = $this->service->delete($id);

            return response()->json([
                'message'      => __('messages.delete_success', ['name' => 'Pricing Set']),
                'deleted_data' => $pricingSet,
            ]);
        } catch (ModelNotFoundException) {
            return response()->json([
                'message' => __('messages.not_found', ['name' => 'Pricing Set']),
            ], 404);
        } catch (Exception $e) {
            return $this->handleException($e, 'delete_failed', 'Pricing Set');
        }
    }

    public function choose(int $id): JsonResponse
    {
        try {
            $freshSet = $this->service->choose($id);

            return response()->json([
                'message' => __('messages.update_success', ['name' => 'Pricing Set Status']),
                'data'    => $freshSet,
            ]);
        } catch (ModelNotFoundException) {
            return response()->json([
                'message' => __('messages.not_found', ['name' => 'Pricing Set']),
            ], 404);
        } catch (Exception $e) {
            return $this->handleException($e, 'update_failed', 'Pricing Set Status');
        }
    }
}
