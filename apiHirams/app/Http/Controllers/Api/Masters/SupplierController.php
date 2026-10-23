<?php

namespace App\Http\Controllers\Api\Masters;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Supplier\StoreSupplierRequest;
use App\Http\Requests\Supplier\TransferSupplierOptionsRequest;
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
            // A supplier that still carries purchase options (canvass
            // results) cannot be removed — the options would be left
            // pointing at nothing. They have to be transferred to another
            // supplier first.
            if ($this->service->hasPurchaseOptions($id)) {
                return response()->json([
                    'message' => 'Cannot delete a supplier that has purchase options. Transfer them to another supplier first.',
                ], 422);
            }

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

    /**
     * GET /suppliers/{id}/options
     *
     * The purchase options that name this supplier — the list the transfer
     * modal shows before the options are moved to another supplier.
     */
    public function options(int $id): JsonResponse
    {
        try {
            $options = $this->service->purchaseOptions($id);

            return response()->json([
                'message' => __('messages.retrieve_success', ['name' => 'Supplier options']),
                'options' => $options,
            ]);
        } catch (ModelNotFoundException) {
            return $this->notFound('Supplier');
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Supplier options');
        }
    }

    /**
     * POST /suppliers/{id}/transfer
     *
     * Moves the supplier's purchase options to another (active) supplier.
     */
    public function transfer(TransferSupplierOptionsRequest $request, int $id): JsonResponse
    {
        try {
            $validated = $request->validated();

            $moved = $this->service->transferPurchaseOptions(
                $id,
                (int) $validated['nTargetSupplierId'],
                array_map('intval', $validated['optionIds'] ?? []),
            );

            return response()->json([
                'message' => __('messages.update_success', ['name' => 'Supplier options']),
                'moved'   => $moved,
            ]);
        } catch (ModelNotFoundException) {
            return $this->notFound('Supplier');
        } catch (Exception $e) {
            return $this->fail($e->getMessage(), 422);
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
