<?php

namespace App\Http\Controllers\Api\Masters;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\SupplierBank\StoreSupplierBankRequest;
use App\Http\Requests\SupplierBank\UpdateSupplierBankRequest;
use App\Services\Masters\SupplierBankService;
use Exception;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupplierBankController extends ApiController
{
    public function __construct(private readonly SupplierBankService $service)
    {
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $banks = $this->service->listBanks($request->query('supplier_id'));

            return response()->json([
                'message' => __('messages.retrieve_success', ['name' => 'Supplier Banks']),
                'banks'   => $banks,
            ]);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Supplier Banks');
        }
    }

    public function store(StoreSupplierBankRequest $request): JsonResponse
    {
        try {
            $bank = $this->service->create($request->validated());

            return response()->json([
                'message' => __('messages.create_success', ['name' => 'Supplier Bank']),
                'bank'    => $bank,
            ], 201);
        } catch (Exception $e) {
            return $this->handleException($e, 'create_failed', 'Supplier Bank');
        }
    }

    public function show(int $id): JsonResponse
    {
        try {
            $bank = $this->service->show($id);

            return response()->json([
                'message' => __('messages.retrieve_success', ['name' => 'Supplier Bank']),
                'bank'    => $bank,
            ]);
        } catch (ModelNotFoundException) {
            return $this->notFound('Supplier Bank');
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Supplier Bank');
        }
    }

    public function update(UpdateSupplierBankRequest $request, int $id): JsonResponse
    {
        try {
            $bank = $this->service->update($id, $request->validated());

            return response()->json([
                'message' => __('messages.update_success', ['name' => 'Supplier Bank']),
                'bank'    => $bank,
            ]);
        } catch (ModelNotFoundException) {
            return $this->notFound('Supplier Bank');
        } catch (Exception $e) {
            return $this->handleException($e, 'update_failed', 'Supplier Bank');
        }
    }

    public function destroy(int $id): JsonResponse
    {
        try {
            $bank = $this->service->delete($id);

            return response()->json([
                'message'      => __('messages.delete_success', ['name' => 'Supplier Bank']),
                'deleted_bank' => $bank,
            ]);
        } catch (ModelNotFoundException) {
            return $this->notFound('Supplier Bank');
        } catch (Exception $e) {
            return $this->handleException($e, 'delete_failed', 'Supplier Bank');
        }
    }

    public function bySupplier(int $supplierId): JsonResponse
    {
        try {
            $banks = $this->service->bySupplier($supplierId);

            return response()->json([
                'message' => __('messages.retrieve_success', ['name' => 'Supplier Banks']),
                'banks'   => $banks,
            ]);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Supplier Banks');
        }
    }
}
