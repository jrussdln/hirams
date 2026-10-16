<?php

namespace App\Services\Masters;

use App\Events\ClientUpdated;
use App\Models\Client;
use App\Services\CrudService;

/**
 * Client CRUD + the client-specific active list.
 */
class ClientService extends CrudService
{
    protected string $entityName = 'Client';
    protected string $primaryKey = 'nClientId';
    protected array  $searchable = ['strClientName', 'strAddress', 'strContactPerson'];
    protected array  $defaultSort = ['strClientName', 'asc'];

    protected function modelClass(): string
    {
        return Client::class;
    }

    protected function eventClass(): ?string
    {
        return ClientUpdated::class;
    }

    /**
     * Clients whose status is the first code in `mappings.status_client`.
     */
    public function activeClients()
    {
        $statusCodes = array_keys(config('mappings.status_client'));

        return $this->newQuery()
            ->where('cStatus', $statusCodes[0])
            ->orderBy('strClientName', 'asc')
            ->get();
    }
}
