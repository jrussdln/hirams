<?php

namespace App\Services\Vouchers;

use App\Events\VoucherAssigneeUpdated;
use App\Events\VoucherUpdated;
use App\Models\Voucher;
use App\Models\VoucherAssignee;
use App\Models\VoucherSupplier;
use App\Services\CrudService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Voucher assignee lines (the particulars of a voucher) plus the
 * "last line gone removes the voucher too" cascade on delete.
 */
class VoucherAssigneeService extends CrudService
{
    protected string $entityName  = 'Voucher Assignee';
    protected string $primaryKey  = 'nVoucherAssigneeId';
    protected array  $searchable  = [];
    protected array  $defaultSort = ['nVoucherAssigneeId', 'desc'];

    protected function modelClass(): string
    {
        return VoucherAssignee::class;
    }

    protected function eventClass(): ?string
    {
        return VoucherAssigneeUpdated::class;
    }

    /* --------------------------------------------------------------------- */
    /* Reading                                                                */
    /* --------------------------------------------------------------------- */

    /**
     * index(): newest line first, company taken from the voucher.
     *
     * @return Collection<int, VoucherAssignee>
     */
    public function listAssignees(): Collection
    {
        return VoucherAssignee::with(['assignee', 'voucher.company']) // ✅ Get company from Voucher
            ->orderByDesc('nVoucherAssigneeId')->get();
    }

    public function show(string $id): VoucherAssignee
    {
        return VoucherAssignee::with(['assignee', 'voucher.company'])->findOrFail($id);
    }

    /* --------------------------------------------------------------------- */
    /* Writing                                                                */
    /* --------------------------------------------------------------------- */

    /**
     * store(): the same defaults the old controller applied for the optional
     * line fields (nQuantity 1, dEWT 0, …).
     */
    public function store(array $data): VoucherAssignee
    {
        $voucherAssignee = VoucherAssignee::create([
            'nVoucherId'    => $data['nVoucherId'],
            // ❌ REMOVED nCompanyId
            'nAssigneeId'   => $data['nAssigneeId'],
            'strParticular' => $data['strParticular'],
            'nQuantity'     => $data['nQuantity'] ?? 1,
            'strUOM'        => $data['strUOM'] ?? null,
            'dAmount'       => $data['dAmount'],
            'dEWT'          => $data['dEWT'] ?? 0,
        ]);

        $this->broadcast('created', $voucherAssignee);

        return $voucherAssignee;
    }

    /**
     * update(): only the validated keys are written — a field omitted from
     * the request stays as stored (in particular dEWT is not reset to 0).
     */
    public function update(int|string $id, array $data): VoucherAssignee
    {
        $voucherAssignee = VoucherAssignee::findOrFail($id);
        $voucherAssignee->update($data);

        $this->broadcast('updated', $voucherAssignee);

        return $voucherAssignee;
    }

    /**
     * destroy(): drops the line; when it was the last of the voucher's lines
     * (no assignees AND no suppliers left) the voucher itself goes with it
     * and a VoucherUpdated fires instead of a VoucherAssigneeUpdated.
     *
     * Returns whether the parent voucher was deleted as well.
     */
    public function destroy(string $id): bool
    {
        $voucherAssignee   = VoucherAssignee::findOrFail($id);
        $voucherId         = $voucherAssignee->nVoucherId;
        $voucherAssigneeId = $voucherAssignee->nVoucherAssigneeId;

        $voucherAssignee->delete();

        $remainingAssignees = VoucherAssignee::where('nVoucherId', $voucherId)->count();
        $remainingSuppliers = VoucherSupplier::where('nVoucherId', $voucherId)->count();

        $voucherDeleted = $remainingAssignees === 0 && $remainingSuppliers === 0;

        if ($voucherDeleted) {
            Voucher::where('nVoucherId', $voucherId)->delete();
            broadcast(new VoucherUpdated('deleted', $voucherId))->toOthers();
        } else {
            broadcast(new VoucherAssigneeUpdated('deleted', $voucherId, $voucherAssigneeId))->toOthers();
        }

        return $voucherDeleted;
    }

    /* --------------------------------------------------------------------- */
    /* Broadcasting                                                           */
    /* --------------------------------------------------------------------- */

    /**
     * VoucherAssigneeUpdated takes THREE args (action, voucherId,
     * voucherAssigneeId), so the 2-arg base broadcast() is not enough: both
     * ids are read off the model, or the model is reloaded when only a raw
     * line id was passed.
     */
    protected function broadcast(string $action, $reference): void
    {
        if ($this->eventClass() === null) {
            return;
        }

        $voucherAssignee = $reference instanceof Model
            ? $reference
            : $this->newQuery()->findOrFail((int) $reference);

        broadcast(new VoucherAssigneeUpdated(
            $action,
            (int) $voucherAssignee->nVoucherId,
            (int) $voucherAssignee->nVoucherAssigneeId,
        ))->toOthers();
    }
}
