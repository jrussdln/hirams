<?php

namespace App\Services\Masters;

use App\Events\SupplierContactUpdated;
use App\Models\SupplierContact;
use App\Services\CrudService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Supplier contact CRUD + the supplier-scoped listing used by bySupplier().
 */
class SupplierContactService extends CrudService
{
    protected string $entityName = 'Supplier Contact';
    protected string $primaryKey = 'nSupplierContactId';
    protected array  $defaultSort = ['strName', 'asc'];

    protected function modelClass(): string
    {
        return SupplierContact::class;
    }

    protected function eventClass(): ?string
    {
        return SupplierContactUpdated::class;
    }

    /**
     * Reproduces the original index(): SupplierContact::with('supplier').
     *
     * The eager load is deliberately kept inside index() only — wiring it into
     * newQuery() would add a `supplier` key to the update/destroy/bySupplier
     * JSON payloads and break byte-for-byte output parity.
     *
     * @return Collection<int, SupplierContact>
     */
    public function index(): Collection
    {
        return $this->newQuery()
            ->with('supplier')
            ->orderBy('strName', 'asc')
            ->get();
    }

    /**
     * Contacts of one supplier, ordered by name.
     *
     * @return Collection<int, SupplierContact>
     */
    public function bySupplier(int $supplierId): Collection
    {
        return $this->newQuery()
            ->where('nSupplierId', $supplierId)
            ->orderBy('strName', 'asc')
            ->get();
    }

    /**
     * CrudService::delete() broadcasts the raw id — but the row is already
     * gone by then, and the event needs nSupplierId as well, so broadcast the
     * in-memory model instead (same payload as the original controller).
     */
    public function delete(int $id): SupplierContact
    {
        $supplierContact = $this->find($id);
        $supplierContact->delete();

        $this->broadcast('deleted', $supplierContact);

        return $supplierContact;
    }

    /**
     * SupplierContactUpdated takes THREE arguments (action, contact id,
     * supplier id), while the base broadcast() only forwards the primary key —
     * so the event has to be constructed here.
     */
    protected function broadcast(string $action, $reference): void
    {
        $supplierContact = $reference instanceof Model
            ? $reference
            : $this->newQuery()->find((int) $reference);

        if ($supplierContact === null) {
            return;
        }

        broadcast(new SupplierContactUpdated(
            $action,
            (int) $supplierContact->nSupplierContactId,
            (int) $supplierContact->nSupplierId,
        ))->toOthers();
    }
}
