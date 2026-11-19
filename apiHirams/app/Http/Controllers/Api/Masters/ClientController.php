<?php

namespace App\Http\Controllers\Api\Masters;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Client\StoreClientRequest;
use App\Http\Requests\Client\TransferClientTransactionsRequest;
use App\Http\Requests\Client\UpdateClientRequest;
use App\Http\Requests\Client\UpdateStatusClientRequest;
use App\Services\Masters\ClientService;
use App\Services\Notifications\ClientNotificationService;
use Exception;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientController extends ApiController
{
    public function __construct(
        private readonly ClientService $service,
        private readonly ClientNotificationService $notifications,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $query = $this->service->search($request->query('search', ''));

            if ($status = $request->query('status')) {
                $query->where('cStatus', $status);
            }

            $clients = $query->get();

            return response()->json([
                'message' => __('messages.retrieve_success', ['name' => 'Clients']),
                'clients' => $clients,
            ]);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Clients');
        }
    }

    public function store(StoreClientRequest $request): JsonResponse
    {
        try {
            $client = $this->service->create($request->validated());

            // A new client from Procurement lands at For Approval — let
            // every Management role know there is something to action.
            $this->notifications->notifySubmitted($client, $request->user());

            return response()->json([
                'message' => __('messages.create_success', ['name' => 'Client']),
                'client'  => $client,
            ], 201);
        } catch (Exception $e) {
            return $this->handleException($e, 'create_failed', 'Client');
        }
    }

    public function update(UpdateClientRequest $request, int $id): JsonResponse
    {
        try {
            $client = $this->service->update($id, $request->validated());

            return response()->json([
                'message' => __('messages.update_success', ['name' => 'Client']),
                'client'  => $client,
            ]);
        } catch (ModelNotFoundException) {
            return $this->notFound('Client');
        } catch (Exception $e) {
            return $this->handleException($e, 'update_failed', 'Client');
        }
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        try {
            $client = $this->service->find($id);
            $wasPending = (string) $client->cStatus === $this->service->forApprovalStatusCode();

            // A client that still carries transactions cannot be removed —
            // the transactions would be left pointing at nothing. They have
            // to be transferred to another client first.
            if ($this->service->hasTransactions($id)) {
                return response()->json([
                    'message' => 'Cannot delete a client that has transactions. Transfer them to another client first.',
                ], 422);
            }

            $deleted = $this->service->delete($id);

            // Deleting a pending client is the rejection path: account for
            // the request and notify the user who submitted it.
            if ($wasPending) {
                $this->notifications->notifyDeleted($deleted, $request->user());
            }

            return response()->json([
                'message'        => __('messages.delete_success', ['name' => 'Client']),
                'deleted_client' => $deleted,
            ]);
        } catch (ModelNotFoundException) {
            return $this->notFound('Client');
        } catch (Exception $e) {
            return $this->handleException($e, 'delete_failed', 'Client');
        }
    }

    /**
     * GET /clients/{id}/transactions
     *
     * The transactions that name this client — the list the transfer modal
     * shows before the transactions are moved to another client.
     */
    public function transactions(int $id): JsonResponse
    {
        try {
            $transactions = $this->service->clientTransactions($id);

            return response()->json([
                'message'      => __('messages.retrieve_success', ['name' => 'Client transactions']),
                'transactions' => $transactions,
            ]);
        } catch (ModelNotFoundException) {
            return $this->notFound('Client');
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Client transactions');
        }
    }

    /**
     * POST /clients/{id}/transfer
     *
     * Moves the client's transactions to another (active) client.
     */
    public function transfer(TransferClientTransactionsRequest $request, int $id): JsonResponse
    {
        try {
            $validated = $request->validated();

            $moved = $this->service->transferTransactions(
                $id,
                (int) $validated['nTargetClientId'],
                array_map('intval', $validated['transactionIds'] ?? []),
            );

            return response()->json([
                'message' => __('messages.update_success', ['name' => 'Client transactions']),
                'moved'   => $moved,
            ]);
        } catch (ModelNotFoundException) {
            return $this->notFound('Client');
        } catch (Exception $e) {
            return $this->fail($e->getMessage(), 422);
        }
    }

    public function updateStatus(UpdateStatusClientRequest $request, int $id): JsonResponse
    {
        try {
            $previous = $this->service->find($id);
            $wasPending = (string) $previous->cStatus === $this->service->forApprovalStatusCode();

            $client = $this->service->updateStatus($id, $request->validated('cStatus'));

            // Approving a For Approval client sends the submitter a direct
            // notification and clears the Management approval alert.
            if ($wasPending && (string) $client->cStatus === $this->service->activeStatusCode()) {
                $this->notifications->notifyApproved($client, $request->user());
            }

            return response()->json([
                'message' => __('messages.update_success', ['name' => 'Client Status']),
                'client'  => $client,
            ]);
        } catch (ModelNotFoundException) {
            return $this->notFound('Client');
        } catch (Exception $e) {
            return $this->handleException($e, 'update_failed', 'Client Status');
        }
    }

    public function activeClients(): JsonResponse
    {
        try {
            return response()->json([
                'message' => __('messages.retrieve_success', ['name' => 'Active Clients']),
                'clients' => $this->service->activeClients(),
            ]);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Active Clients');
        }
    }
}
