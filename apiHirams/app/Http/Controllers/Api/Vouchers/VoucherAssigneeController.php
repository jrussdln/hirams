<?php

namespace App\Http\Controllers\Api\Vouchers;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\VoucherAssignee\StoreVoucherAssigneeRequest;
use App\Http\Requests\VoucherAssignee\UpdateVoucherAssigneeRequest;
use App\Services\Vouchers\VoucherAssigneeService;
use Exception;

class VoucherAssigneeController extends ApiController
{
    public function __construct(private readonly VoucherAssigneeService $service)
    {
    }

    public function index()
    {
        return response()->json(
            $this->service->listAssignees()
        );
    }

    public function store(StoreVoucherAssigneeRequest $request)
    {
        $voucherAssignee = $this->service->store($request->validated());

        return response()->json($voucherAssignee->load(['assignee', 'voucher.company']), 201);
    }

    public function show(string $id)
    {
        return response()->json(
            $this->service->show($id)
        );
    }

    public function update(UpdateVoucherAssigneeRequest $request, string $id)
    {
        try {
            $voucherAssignee = $this->service->update($id, $request->validated());

            return response()->json([
                'message' => 'Voucher assignee updated successfully.',
                'data'    => $voucherAssignee->load(['assignee', 'voucher.company']),
            ]);
        } catch (Exception $e) {
            return response()->json(['message' => 'Failed to update voucher assignee.', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(string $id)
    {
        try {
            $voucherDeleted = $this->service->destroy($id);

            return response()->json([
                'message'         => 'Assignee deleted successfully.',
                'voucher_deleted' => $voucherDeleted,
            ]);
        } catch (Exception $e) {
            return response()->json(['message' => 'Failed to delete assignee.', 'error' => $e->getMessage()], 500);
        }
    }
}
