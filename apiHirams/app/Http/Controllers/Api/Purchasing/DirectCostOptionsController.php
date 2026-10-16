<?php

namespace App\Http\Controllers\Api\Purchasing;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\DirectCostOption\StoreDirectCostOptionRequest;
use App\Http\Requests\DirectCostOption\UpdateDirectCostOptionRequest;
use App\Services\Purchasing\DirectCostOptionsService;

/**
 * Legacy-shape controller: no try/catch and no return types on purpose —
 * raw models and the { message: 'Deleted' } payload must stay
 * byte-identical, so nothing is wrapped in the modern envelope.
 *
 * The DirectCostUpdated broadcasts moved into DirectCostOptionsService
 * (CrudService reproduces the old created/updated/deleted calls exactly).
 */
class DirectCostOptionsController extends ApiController
{
    public function __construct(private readonly DirectCostOptionsService $service)
    {
    }

    public function index()
    {
        return $this->service->all();
    }

    public function store(StoreDirectCostOptionRequest $request)
    {
        return $this->service->create($request->validated());
    }

    public function show($id)
    {
        return $this->service->find($id);
    }

    public function update(UpdateDirectCostOptionRequest $request, $id)
    {
        return $this->service->update($id, $request->validated());
    }

    public function destroy($id)
    {
        $this->service->delete($id);

        return response()->json(['message' => 'Deleted']);
    }
}
