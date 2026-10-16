<?php

namespace App\Services\Vouchers;

use App\Events\VoucherSupplierUpdated;
use App\Events\VoucherUpdated;
use App\Models\Voucher;
use App\Models\VoucherAssignee;
use App\Models\VoucherSupplier;
use App\Services\CrudService;
use Illuminate\Database\Eloquent\Model;

/**
 * Voucher ↔ purchase-order links: the link CRUD plus the "last link gone
 * removes the voucher too" cascade on delete.
 */
class VoucherSupplierService extends CrudService
{
    protected string $entityName  = 'Voucher Supplier';
    protected string $primaryKey  = 'nVoucherSupplierId';
    protected array  $searchable  = [];
    protected array  $defaultSort = [];

    protected function modelClass(): string
    {
        return VoucherSupplier::class;
    }

    protected function eventClass(): ?string
    {
        return VoucherSupplierUpdated::class;
    }

    /* --------------------------------------------------------------------- */
    /* Reading                                                                */
    /* --------------------------------------------------------------------- */

    public function show(string $id): VoucherSupplier
    {
        return VoucherSupplier::findOrFail($id);
    }

    /* --------------------------------------------------------------------- */
    /* Writing                                                                */
    /* --------------------------------------------------------------------- */

    /**
     * store(): the old controller returned a 409 when the PO was already
     * linked, so a duplicate comes back as null and the controller answers.
     *
     * @return VoucherSupplier|null
     */
    public function store(array $data): ?VoucherSupplier
    {
        $existing = VoucherSupplier::where($data)->first();
        if ($existing) {
            return null;
        }

        $voucherSupplier = VoucherSupplier::create($data);

        $this->broadcast('created', $voucherSupplier);

        return $voucherSupplier;
    }

    public function update(int|string $id, array $data): VoucherSupplier
    {
        $voucherSupplier = VoucherSupplier::findOrFail($id);
        $voucherSupplier->update([
            'nVoucherId'       => $data['nVoucherId'] ?? null,
            'nPurchaseOrderId' => $data['nPurchaseOrderId'] ?? null,
        ]);

        $this->broadcast('updated', $voucherSupplier);

        return $voucherSupplier;
    }

    /**
     * destroy(): drops the link; when it was the last of the voucher's
     * links (no suppliers AND no assignees left) the voucher itself goes with
     * it and a VoucherUpdated fires instead of a VoucherSupplierUpdated.
     *
     * Returns whether the parent voucher was deleted as well.
     */
    public function destroy(string $id): bool
    {
        $voucherSupplier   = VoucherSupplier::findOrFail($id);
        $voucherId         = $voucherSupplier->nVoucherId;
        $voucherSupplierId = $voucherSupplier->nVoucherSupplierId;

        $voucherSupplier->delete();

        $remainingSuppliers = VoucherSupplier::where('nVoucherId', $voucherId)->count();
        $remainingAssignees = VoucherAssignee::where('nVoucherId', $voucherId)->count();

        $voucherDeleted = $remainingSuppliers === 0 && $remainingAssignees === 0;

        if ($voucherDeleted) {
            Voucher::where('nVoucherId', $voucherId)->delete();
            broadcast(new VoucherUpdated('deleted', $voucherId))->toOthers();
        } else {
            broadcast(new VoucherSupplierUpdated('deleted', $voucherId, $voucherSupplierId))->toOthers();
        }

        return $voucherDeleted;
    }

    /* --------------------------------------------------------------------- */
    /* Broadcasting                                                           */
    /* --------------------------------------------------------------------- */

    /**
     * VoucherSupplierUpdated takes THREE args (action, voucherId,
     * voucherSupplierId), so the 2-arg base broadcast() is not enough: both
     * ids are read off the model, or the model is reloaded when only a raw
     * link id was passed.
     */
    protected function broadcast(string $action, $reference): void
    {
        if ($this->eventClass() === null) {
            return;
        }

        $voucherSupplier = $reference instanceof Model
            ? $reference
            : $this->newQuery()->findOrFail((int) $reference);

        broadcast(new VoucherSupplierUpdated(
            $action,
            (int) $voucherSupplier->nVoucherId,
            (int) $voucherSupplier->nVoucherSupplierId,
        ))->toOthers();
    }
}
