<?php

namespace App\Services\Masters;

use App\Events\SupplierUpdated;
use App\Models\Supplier;
use App\Services\CrudService;

/**
 * Supplier CRUD + the supplier-specific cascade on delete.
 */
class SupplierService extends CrudService
{
    protected string $entityName = 'Supplier';
    protected string $primaryKey = 'nSupplierId';
    protected array  $searchable = ['strSupplierName', 'strSupplierNickName', 'strAddress'];
    protected array  $defaultSort = ['strSupplierName', 'asc'];

    protected function modelClass(): string
    {
        return Supplier::class;
    }

    protected function eventClass(): ?string
    {
        return SupplierUpdated::class;
    }

    /**
     * Suppliers whose status is the first code in `mappings.status_user`.
     */
    public function activeSuppliers()
    {
        $statusCodes = array_keys(config('mappings.status_user'));

        return $this->newQuery()
            ->where('cStatus', $statusCodes[0])
            ->select('nSupplierId', 'strSupplierName', 'strSupplierNickName', 'bVAT', 'bEWT')
            ->orderBy('strSupplierName', 'asc')
            ->get();
    }

    /**
     * Deleting a supplier also removes its dependent contacts and banks.
     */
    public function delete(int $id): Supplier
    {
        $supplier = $this->find($id);
        $supplier->contacts()->delete();
        $supplier->banks()->delete();
        $supplier->delete();

        $this->broadcast('deleted', $id);

        return $supplier;
    }
}
