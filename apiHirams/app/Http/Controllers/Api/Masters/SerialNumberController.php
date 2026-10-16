<?php

namespace App\Http\Controllers\Api\Masters;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\SerialNumber\CheckExistSerialNumberRequest;
use App\Http\Requests\SerialNumber\StoreSerialNumberRequest;
use App\Http\Requests\SerialNumber\UpdateSerialNumberRequest;
use App\Services\Masters\SerialNumberService;
use Exception;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SerialNumberController extends ApiController
{
    public function __construct(private readonly SerialNumberService $service)
    {
    }

    /**
     * Get all serial numbers with optional inventory filter
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = $this->service->newQuery();

            if ($request->filled('nInventoryId')) {
                $query->where('nInventoryId', $request->nInventoryId);
            }

            if ($request->filled('search')) {
                $query->where('strSerialNumber', 'LIKE', "%{$request->search}%");
            }

            $serialNumbers = $query->orderBy('dtLog', 'desc')->get();

            return response()->json([
                'message'        => __('messages.retrieve_success', ['name' => 'Serial Numbers']),
                'serial_numbers' => $serialNumbers,
            ]);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Serial Numbers');
        }
    }

    /**
     * Get a single serial number by ID
     */
    public function show(int $id): JsonResponse
    {
        try {
            $serialNumber = $this->service->find($id);

            return response()->json([
                'message'       => __('messages.retrieve_success', ['name' => 'Serial Number']),
                'serial_number' => $serialNumber,
            ]);
        } catch (ModelNotFoundException) {
            return response()->json([
                'message' => __('messages.not_found', ['name' => 'Serial Number']),
            ], 404);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Serial Number');
        }
    }

    /**
     * Create a new serial number
     */
    public function store(StoreSerialNumberRequest $request): JsonResponse
    {
        try {
            $serialNumber = $this->service->create($request->validated());

            return response()->json([
                'message'       => __('messages.create_success', ['name' => 'Serial Number']),
                'serial_number' => $serialNumber,
            ], 201);
        } catch (QueryException $e) {
            return $this->handleDuplicateEntry($e);
        } catch (Exception $e) {
            return $this->handleException($e, 'create_failed', 'Serial Number');
        }
    }

    /**
     * Update an existing serial number
     */
    public function update(UpdateSerialNumberRequest $request, int $id): JsonResponse
    {
        try {
            $serialNumber = $this->service->update($id, $request->validated());

            return response()->json([
                'message'       => __('messages.update_success', ['name' => 'Serial Number']),
                'serial_number' => $serialNumber,
            ]);
        } catch (ModelNotFoundException) {
            return response()->json([
                'message' => __('messages.not_found', ['name' => 'Serial Number']),
            ], 404);
        } catch (Exception $e) {
            return $this->handleException($e, 'update_failed', 'Serial Number');
        }
    }

    /**
     * Delete a serial number
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $serialNumber = $this->service->delete($id);

            return response()->json([
                'message'               => __('messages.delete_success', ['name' => 'Serial Number']),
                'deleted_serial_number' => $serialNumber,
            ]);
        } catch (ModelNotFoundException) {
            return response()->json([
                'message' => __('messages.not_found', ['name' => 'Serial Number']),
            ], 404);
        } catch (Exception $e) {
            return $this->handleException($e, 'delete_failed', 'Serial Number');
        }
    }

    /**
     * Get all serial numbers belonging to a specific inventory record
     */
    public function byInventory(int $inventoryId): JsonResponse
    {
        try {
            $serialNumbers = $this->service->byInventory($inventoryId);

            return response()->json([
                'message'        => __('messages.retrieve_success', ['name' => 'Serial Numbers']),
                'serial_numbers' => $serialNumbers,
            ]);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Serial Numbers');
        }
    }

    /**
     * Check if a serial number already exists
     */
    public function checkExist(CheckExistSerialNumberRequest $request): JsonResponse
    {
        try {
            $validated = $request->validated();

            $exists = false;

            if (!empty($validated['strSerialNumber'])) {
                $exists = $this->service->existsBySerialNumber($validated['strSerialNumber']);
            }

            return response()->json(['exists' => $exists]);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Serial Number existence check');
        }
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private function handleDuplicateEntry(QueryException $e): JsonResponse
    {
        if ($e->errorInfo[1] == 1062) {
            return response()->json(['message' => 'Duplicate serial number record already exists.'], 409);
        }
        throw $e;
    }
}
