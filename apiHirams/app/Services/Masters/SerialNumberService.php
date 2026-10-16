<?php

namespace App\Services\Masters;

use App\Events\SerialNumberUpdated;
use App\Models\SerialNumber;
use App\Services\CrudService;

/**
 * Serial number CRUD + the inventory-scoped listing and existence check.
 */
class SerialNumberService extends CrudService
{
    protected string $entityName  = 'Serial Number';
    protected string $primaryKey  = 'nSNId';
    protected array  $searchable  = ['strSerialNumber'];
    protected array  $defaultSort = ['dtLog', 'desc'];

    protected function modelClass(): string
    {
        return SerialNumber::class;
    }

    protected function eventClass(): ?string
    {
        return SerialNumberUpdated::class;
    }

    /**
     * Create a serial number, defaulting dtLog to now() when omitted.
     */
    public function create(array $data): SerialNumber
    {
        $data['dtLog'] = $data['dtLog'] ?? now();

        return parent::create($data);
    }

    /**
     * All serial numbers belonging to a specific inventory record.
     */
    public function byInventory(int $inventoryId)
    {
        return $this->newQuery()
            ->where('nInventoryId', $inventoryId)
            ->orderBy('strSerialNumber')
            ->get();
    }

    /**
     * Exact lookup used by the checkExist() endpoint.
     */
    public function existsBySerialNumber(string $serialNumber): bool
    {
        return $this->newQuery()
            ->where('strSerialNumber', $serialNumber)
            ->exists();
    }
}
