<?php

namespace App\Http\Controllers\Api\Vouchers;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\VoucherSupplier\StoreVoucherSupplierRequest;
use App\Services\Vouchers\VoucherSupplierService;
use Exception;
use Illuminate\Http\Request;

class VoucherSupplierController extends ApiController
{
    public function __construct(private readonly VoucherSupplierService $service)
    {
    }

    public function index()
    {
        return response()->json($this->service->all());
    }

    public function show(string $id)
    {
        return response()->json($this->service->show($id));
    }

    public function update(Request $request, string $id)
    {
        $voucherSupplier = $this->service->update($id, [
            'nVoucherId'       => $request->nVoucherId,
            'nPurchaseOrderId' => $request->nPurchaseOrderId,
        ]);

        return response()->json($voucherSupplier);
    }

    public function store(StoreVoucherSupplierRequest $request)
    {
        try {
            $validated = $request->validated();

            $voucherSupplier = $this->service->store($validated);
            if ($voucherSupplier === null) {
                return response()->json([
                    'message' => 'This PO is already linked to this voucher.',
                ], 409);
            }

            return response()->json([
                'message' => 'PO linked to voucher successfully.',
                'data'    => $voucherSupplier,
            ], 201);
        } catch (Exception $e) {
            return response()->json(['message' => 'Failed to link PO to voucher.', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(string $id)
    {
        try {
            $voucherDeleted = $this->service->destroy($id);

            return response()->json([
                'message'         => 'Supplier link deleted successfully.',
                'voucher_deleted' => $voucherDeleted,
            ]);
        } catch (Exception $e) {
            return response()->json(['message' => 'Failed to delete supplier link.', 'error' => $e->getMessage()], 500);
        }
    }
}
