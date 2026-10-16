<?php

namespace App\Services\Masters;

use App\Events\SupplierBankUpdated;
use App\Models\SupplierBank;
use App\Services\CrudService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Supplier bank CRUD plus the supplier-scoped listings.
 */
class SupplierBankService extends CrudService
{
    protected string $entityName  = 'Supplier Bank';
    protected string $primaryKey  = 'nSupplierBankId';
    protected array  $searchable  = ['strBankName', 'strAccountName', 'strAccountNumber'];
    protected array  $defaultSort = ['strBankName', 'asc'];

    protected function modelClass(): string
    {
        return SupplierBank::class;
    }

    protected function eventClass(): ?string
    {
        return SupplierBankUpdated::class;
    }

    /* --------------------------------------------------------------------- */
    /* Reading                                                                */
    /* --------------------------------------------------------------------- */

    /**
     * Supplier banks for index(): eager-loads the supplier and, when a
     * supplier_id is supplied, narrows to that supplier (the truthiness check
     * mirrors the old `if ($supplierId = $request->query('supplier_id'))`).
     *
     * @return Collection<int, SupplierBank>
     */
    public function listBanks(mixed $supplierId = null): Collection
    {
        $query = $this->newQuery()->with('supplier');

        if ($supplierId) {
            $query->where('nSupplierId', $supplierId);
        }

        return $query->orderBy('strBankName', 'asc')->get();
    }

    /**
     * One page of banks by supplier, as returned by bySupplier().
     *
     * @return Collection<int, SupplierBank>
     */
    public function bySupplier(int $supplierId): Collection
    {
        return $this->newQuery()
            ->where('nSupplierId', $supplierId)
            ->orderBy('strBankName', 'asc')
            ->get();
    }

    /**
     * A single bank with its supplier eager-loaded (the old show() query).
     */
    public function show(int $id): SupplierBank
    {
        return $this->newQuery()->with('supplier')->findOrFail($id);
    }

    /* --------------------------------------------------------------------- */
    /* Deleting                                                               */
    /* --------------------------------------------------------------------- */

    /**
     * The row is already gone by the time the event fires, so broadcast the
     * in-memory model instead of the raw id (which could no longer be loaded
     * by the raw-id branch of broadcast()).
     */
    public function delete(int $id): SupplierBank
    {
        $bank = $this->find($id);
        $bank->delete();

        $this->broadcast('deleted', $bank);

        return $bank;
    }

    /* --------------------------------------------------------------------- */
    /* Broadcasting                                                           */
    /* --------------------------------------------------------------------- */

    /**
     * SupplierBankUpdated takes THREE args (action, bankId, supplierId), so the
     * 2-arg base broadcast() is not enough: both ids are read off the model, or
     * the model is reloaded when only a raw bank id was passed.
     */
    protected function broadcast(string $action, $reference): void
    {
        if ($this->eventClass() === null) {
            return;
        }

        $bank = $reference instanceof Model
            ? $reference
            : $this->newQuery()->findOrFail((int) $reference);

        broadcast(new SupplierBankUpdated(
            $action,
            (int) $bank->nSupplierBankId,
            (int) $bank->nSupplierId,
        ))->toOthers();
    }
}
