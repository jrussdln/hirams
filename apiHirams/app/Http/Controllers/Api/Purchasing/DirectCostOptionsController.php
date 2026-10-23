<?php

namespace App\Http\Controllers\Api\Purchasing;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\DirectCostOption\StoreDirectCostOptionRequest;
use App\Http\Requests\DirectCostOption\TransferDirectCostCostsRequest;
use App\Http\Requests\DirectCostOption\UpdateDirectCostOptionRequest;
use App\Services\Purchasing\DirectCostOptionsService;
use RuntimeException;

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
        // An option a live transaction still charges a cost to cannot be
        // removed — the lines would be left pointing at nothing. They have
        // to be transferred to another option first.
        if ($this->service->hasCosts((int) $id)) {
            return response()->json([
                'message' => 'Cannot delete a direct cost option that is used in transactions. Transfer its entries to another option first.',
            ], 422);
        }

        $this->service->delete((int) $id);

        return response()->json(['message' => 'Deleted']);
    }

    /**
     * GET /direct-cost-options/{id}/costs
     *
     * The transactions that charge a direct cost to this option — the list
     * the transfer modal shows before the lines are moved to another
     * option.
     */
    public function costs($id)
    {
        return $this->service->costs((int) $id);
    }

    /**
     * POST /direct-cost-options/{id}/transfer
     *
     * Moves this option's direct cost lines to another option.
     */
    public function transfer(TransferDirectCostCostsRequest $request, $id)
    {
        try {
            $validated = $request->validated();

            $moved = $this->service->transferCosts(
                (int) $id,
                (int) $validated['nTargetCostOptionId'],
                array_map('intval', $validated['costIds'] ?? [])
            );
        } catch (RuntimeException $e) {
            // The refusal must reach the modal as a message, not a generic
            // server error.
            return $this->fail($e->getMessage(), 422);
        }

        return response()->json(['moved' => $moved]);
    }}
