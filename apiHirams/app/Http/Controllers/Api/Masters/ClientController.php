<?php

namespace App\Http\Controllers\Api\Masters;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\Client\StoreClientRequest;
use App\Http\Requests\Client\UpdateClientRequest;
use App\Http\Requests\Client\UpdateStatusClientRequest;
use App\Services\Masters\ClientService;
use Exception;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientController extends ApiController
{
    public function __construct(private readonly ClientService $service)
    {
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

    public function destroy(int $id): JsonResponse
    {
        try {
            $client = $this->service->delete($id);

            return response()->json([
                'message'        => __('messages.delete_success', ['name' => 'Client']),
                'deleted_client' => $client,
            ]);
        } catch (ModelNotFoundException) {
            return $this->notFound('Client');
        } catch (Exception $e) {
            return $this->handleException($e, 'delete_failed', 'Client');
        }
    }

    public function updateStatus(UpdateStatusClientRequest $request, int $id): JsonResponse
    {
        try {
            $client = $this->service->updateStatus($id, $request->validated('cStatus'));

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
