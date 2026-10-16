<?php

namespace App\Http\Controllers\Api\Purchasing;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\DirectCost\StoreDirectCostRequest;
use App\Http\Requests\DirectCost\UpdateDirectCostRequest;
use App\Services\Purchasing\DirectCostService;
use Illuminate\Http\Request;

/**
 * Legacy-shape controller: no try/catch and no return types on purpose —
 * raw models and the { success, directCosts, totalEWT } payload must stay
 * byte-identical, so nothing is wrapped in the modern envelope.
 */
class DirectCostController extends ApiController
{
    public function __construct(private readonly DirectCostService $service)
    {
    }

    public function index(Request $request)
    {
        $result = $this->service->costsWithTotalEWT(
            $request->nTransactionID,
            $request->boolean('withEWT')
        );

        return response()->json([
            'success'     => true,
            'directCosts' => $result['directCosts'],
            'totalEWT'    => $result['totalEWT'],
        ]);
    }

    public function store(StoreDirectCostRequest $request)
    {
        return $this->service->create($request->validated());
    }

    public function show($id)
    {
        return $this->service->findWithOptions($id);
    }

    public function update(UpdateDirectCostRequest $request, $id)
    {
        return $this->service->update($id, $request->validated());
    }

    public function destroy($id)
    {
        $this->service->delete($id);

        return response()->json(['message' => 'Deleted']);
    }
}
