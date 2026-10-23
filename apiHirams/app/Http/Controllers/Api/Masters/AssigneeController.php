<?php

namespace App\Http\Controllers\Api\Masters;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Assignee\CheckExistAssigneeRequest;
use App\Http\Requests\Assignee\StoreAssigneeRequest;
use App\Http\Requests\Assignee\TransferAssigneeVouchersRequest;
use App\Http\Requests\Assignee\UpdateAssigneeRequest;
use App\Http\Requests\Assignee\UpdateStatusAssigneeRequest;
use App\Services\Masters\AssigneeService;
use Exception;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssigneeController extends ApiController
{
    public function __construct(private readonly AssigneeService $service)
    {
    }

    /**
     * Get all assignees with optional search filter and status filter
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = $this->service->search($request->input('search'));

            if ($request->filled('cStatus')) {
                $query->where('cStatus', $request->cStatus);
            }

            $assignees = $query->get();

            return response()->json([
                'message'   => __('messages.retrieve_success', ['name' => 'Assignees']),
                'assignees' => $assignees,
            ]);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Assignees');
        }
    }

    /**
     * Get a single assignee by ID
     */
    public function show(int $id): JsonResponse
    {
        try {
            $assignee = $this->service->find($id);

            return response()->json([
                'message'  => __('messages.retrieve_success', ['name' => 'Assignee']),
                'assignee' => $assignee,
            ]);
        } catch (ModelNotFoundException) {
            return $this->notFound('Assignee');
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Assignee');
        }
    }

    /**
     * Create a new assignee
     */
    public function store(StoreAssigneeRequest $request): JsonResponse
    {
        try {
            $assignee = $this->service->create($request->validated());

            return response()->json([
                'message'  => __('messages.create_success', ['name' => 'Assignee']),
                'assignee' => $assignee,
            ], 201);
        } catch (QueryException $e) {
            return $this->handleDuplicateEntry($e);
        } catch (Exception $e) {
            return $this->handleException($e, 'create_failed', 'Assignee');
        }
    }

    /**
     * Update an existing assignee
     */
    public function update(UpdateAssigneeRequest $request, int $id): JsonResponse
    {
        try {
            $assignee = $this->service->update($id, $request->validated());

            return response()->json([
                'message'  => __('messages.update_success', ['name' => 'Assignee']),
                'assignee' => $assignee,
            ]);
        } catch (ModelNotFoundException) {
            return $this->notFound('Assignee');
        } catch (Exception $e) {
            return $this->handleException($e, 'update_failed', 'Assignee');
        }
    }

    /**
     * Delete an assignee
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            // An assignee that still carries voucher lines cannot be
            // removed — the lines would be left pointing at nothing. They
            // have to be transferred to another assignee first.
            if ($this->service->hasVouchers($id)) {
                return response()->json([
                    'message' => 'Cannot delete an assignee that has vouchers. Transfer them to another assignee first.',
                ], 422);
            }

            $assignee = $this->service->delete($id);

            return response()->json([
                'message'          => __('messages.delete_success', ['name' => 'Assignee']),
                'deleted_assignee' => $assignee,
            ]);
        } catch (ModelNotFoundException) {
            return $this->notFound('Assignee');
        } catch (Exception $e) {
            return $this->handleException($e, 'delete_failed', 'Assignee');
        }
    }

    /**
     * GET /assignees/{id}/vouchers
     *
     * The vouchers this assignee is on — the list the transfer modal shows
     * before the vouchers are moved to another assignee.
     */
    public function vouchers(int $id): JsonResponse
    {
        try {
            $vouchers = $this->service->vouchers($id);

            return response()->json([
                'message'  => __('messages.retrieve_success', ['name' => 'Assignee vouchers']),
                'vouchers' => $vouchers,
            ]);
        } catch (ModelNotFoundException) {
            return $this->notFound('Assignee');
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Assignee vouchers');
        }
    }

    /**
     * POST /assignees/{id}/transfer
     *
     * Moves the assignee's voucher lines to another (active) assignee.
     */
    public function transfer(TransferAssigneeVouchersRequest $request, int $id): JsonResponse
    {
        try {
            $validated = $request->validated();

            $moved = $this->service->transferVouchers(
                $id,
                (int) $validated['nTargetAssigneeId'],
                array_map('intval', $validated['voucherIds'] ?? []),
            );

            return response()->json([
                'message' => __('messages.update_success', ['name' => 'Assignee vouchers']),
                'moved'   => $moved,
            ]);
        } catch (ModelNotFoundException) {
            return $this->notFound('Assignee');
        } catch (Exception $e) {
            return $this->fail($e->getMessage(), 422);
        }
    }

    /**
     * Update assignee status only
     */
    public function updateStatus(UpdateStatusAssigneeRequest $request, int $id): JsonResponse
    {
        try {
            $assignee = $this->service->updateStatus($id, $request->validated('cStatus'));

            return response()->json([
                'message'  => __('messages.update_success', ['name' => 'Assignee Status']),
                'assignee' => $assignee,
            ]);
        } catch (ModelNotFoundException) {
            return $this->notFound('Assignee');
        } catch (Exception $e) {
            return $this->handleException($e, 'update_failed', 'Assignee Status');
        }
    }

    /**
     * Check if assignee name already exists
     */
    public function checkExist(CheckExistAssigneeRequest $request): JsonResponse
    {
        try {
            $validated = $request->validated();

            $exists = false;

            if (!empty($validated['strAssigneeName'])) {
                $exists = $this->service->existsByName($validated['strAssigneeName']);
            }

            return response()->json(['exists' => $exists]);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Assignee existence check');
        }
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private function handleDuplicateEntry(QueryException $e): JsonResponse
    {
        if ($e->errorInfo[1] == 1062) {
            return response()->json(['message' => 'Duplicate assignee record already exists.'], 409);
        }
        throw $e;
    }
}
