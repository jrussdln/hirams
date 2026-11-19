<?php

namespace App\Http\Controllers\Api\Masters;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Supplier\StoreSupplierRequest;
use App\Http\Requests\Supplier\TransferSupplierOptionsRequest;
use App\Http\Requests\Supplier\UpdateStatusSupplierRequest;
use App\Http\Requests\Supplier\UpdateSupplierRequest;
use App\Services\Masters\SupplierService;
use App\Services\Notifications\SupplierNotificationService;
use Exception;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupplierController extends ApiController
{
    public function __construct(
        private readonly SupplierService $service,
        private readonly SupplierNotificationService $notifications,
    ) {
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

            // A new supplier from AO lands at For Approval — let
            // every Finance and Management role know.
            $this->notifications->notifySubmitted($supplier, $request->user());

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

    public function destroy(Request $request, int $id): JsonResponse
    {
        try {
            $supplier = $this->service->find($id);
            $wasPending = (string) $supplier->cStatus === $this->service->forApprovalStatusCode();

            // A supplier that still carries purchase options (canvass
            // results) cannot be removed — the options would be left
            // pointing at nothing. They have to be transferred to another
            // supplier first.
            if ($this->service->hasPurchaseOptions($id)) {
                return response()->json([
                    'message' => 'Cannot delete a supplier that has purchase options. Transfer them to another supplier first.',
                ], 422);
            }

            $deleted = $this->service->delete($id);

            // Deleting a pending supplier is the rejection path: account for
            // the request and notify the user who submitted it.
            if ($wasPending) {
                $this->notifications->notifyDeleted($deleted, $request->user());
            }

            return response()->json([
                'message'          => __('messages.delete_success', ['name' => 'Supplier']),
                'deleted_supplier' => $deleted,
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
            $previous = $this->service->find($id);
            $wasPending = (string) $previous->cStatus === $this->service->forApprovalStatusCode();

            $supplier = $this->service->updateStatus($id, $request->validated('statusCode'));

            // Approving a For Approval supplier sends the submitter a direct
            // notification and clears the Finance/Management approval alert.
            if ($wasPending && (string) $supplier->cStatus === $this->service->activeStatusCode()) {
                $this->notifications->notifyApproved($supplier, $request->user());
            }

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
