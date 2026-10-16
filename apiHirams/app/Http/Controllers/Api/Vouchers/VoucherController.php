<?php

namespace App\Http\Controllers\Api\Vouchers;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Voucher\UpdateStatusVoucherRequest;
use App\Services\Vouchers\VoucherService;
use Illuminate\Http\Request;

class VoucherController extends ApiController
{
    public function __construct(private readonly VoucherService $service)
    {
    }

    public function index()
    {
        return response()->json($this->service->listVouchers());
    }

    public function createJev(string $id)
    {
        $jev = $this->service->createJev($id);

        if ($jev === null) {
            return response()->json(['message' => 'JEV already exists.'], 422);
        }

        return response()->json([
            'message' => 'JEV created successfully.',
            'jev'     => $jev,
            'nJEVId'  => $jev->nJEVId,
        ], 201);
    }

    public function store(Request $request)
    {
        $voucher = $this->service->store($request->all());

        return response()->json($voucher, 201);
    }

    public function show(string $id)
    {
        return response()->json(
            $this->service->show($id)
        );
    }

    public function update(Request $request, string $id)
    {
        $voucher = $this->service->update($id, $request->all());

        return response()->json($voucher);
    }

    public function destroy(string $id)
    {
        $this->service->destroy($id);

        return response()->json(['message' => 'Voucher deleted successfully.']);
    }

    public function updateStatus(UpdateStatusVoucherRequest $request, string $id)
    {
        $voucher = $this->service->changeStatus($request, $id);

        return response()->json([
            'message' => 'Voucher status updated successfully.',
            'voucher' => $voucher,
        ]);
    }
}
