<?php

namespace App\Http\Controllers\Api\Masters;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Supplier\StoreSupplierRequest;
use App\Http\Requests\Supplier\UpdateStatusSupplierRequest;
use App\Http\Requests\Supplier\UpdateSupplierRequest;
use App\Services\Masters\SupplierService;
use Exception;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupplierController extends ApiController
{
    public function __construct(private readonly SupplierService $service)
    {
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $suppliers = $this->service->search($request->input('search'))->get();

            return response()->json([
                'message'   => __('messages.retrieve_success', ['name' => 'Suppliers']),
                'suppliers' => $suppliers,
            ]);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Suppliers');
        }
    }

    public function store(StoreSupplierRequest $request): JsonResponse
    {
        try {
            $supplier = $this->service->create($request->validated());

            return response()->json([
                'message'  => __('messages.create_success', ['name' => 'Supplier']),
                'supplier' => $supplier,
            ], 201);
        } catch (Exception $e) {
            return $this->handleException($e, 'create_failed', 'Supplier');
        }
    }

    public function update(UpdateSupplierRequest $request, int $id): JsonResponse
    {
        try {
            $supplier = $this->service->update($id, $request->validated());

            return response()->json([
                'message'  => __('messages.update_success', ['name' => 'Supplier']),
                'supplier' => $supplier,
            ]);
        } catch (ModelNotFoundException) {
            return $this->notFound('Supplier');
        } catch (Exception $e) {
            return $this->handleException($e, 'update_failed', 'Supplier');
        }
    }

    public function destroy(int $id): JsonResponse
    {
        try {
            $supplier = $this->service->delete($id);

            return response()->json([
                'message'          => __('messages.delete_success', ['name' => 'Supplier']),
                'deleted_supplier' => $supplier,
            ]);
        } catch (ModelNotFoundException) {
            return $this->notFound('Supplier');
        } catch (Exception $e) {
            return $this->handleException($e, 'delete_failed', 'Supplier');
        }
    }

    public function updateStatus(UpdateStatusSupplierRequest $request, int $id): JsonResponse
    {
        try {
            $supplier = $this->service->updateStatus($id, $request->validated('statusCode'));

            return response()->json([
                'message'  => __('messages.update_success', ['name' => 'Supplier Status']),
                'supplier' => $supplier,
            ]);
        } catch (ModelNotFoundException) {
            return $this->notFound('Supplier');
        } catch (Exception $e) {
            return $this->handleException($e, 'update_failed', 'Supplier Status');
        }
    }

    public function allSuppliers(): JsonResponse
    {
        try {
            return response()->json([
                'message'   => __('messages.retrieve_success', ['name' => 'Active Suppliers']),
                'suppliers' => $this->service->activeSuppliers(),
            ]);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Active Suppliers');
        }
    }
}
