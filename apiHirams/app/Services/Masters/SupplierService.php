<?php

namespace App\Services\Masters;

use App\Events\OptionUpdated;
use App\Events\SupplierUpdated;
use App\Events\VoucherUpdated;
use App\Models\PurchaseOptions;
use App\Models\Supplier;
use App\Models\Voucher;
use App\Services\CrudService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection as SupportCollection;
use Illuminate\Support\Facades\DB;
use RuntimeException;

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
     * The listing carries how many purchase options each supplier holds —
     * the UI swaps Delete for Transfer on the suppliers that have any.
     */
    public function search(?string $term = null): Builder
    {
        return parent::search($term)->withCount('purchaseOptions');
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
     * The status code that marks a supplier ACTIVE.
     */
    public function activeStatusCode(): string
    {
        $statusCodes = array_keys(config('mappings.status_user'));

        return (string) ($statusCodes[0] ?? '');
    }

    /**
     * TRUE when the supplier still carries purchase options — such a
     * supplier cannot be deleted, it has to be transferred first.
     */
    public function hasPurchaseOptions(int $id): bool
    {
        return PurchaseOptions::where('nSupplierId', $id)->exists();
    }

    /**
     * The purchase options that name a supplier, newest canvass first.
     *
     * @return SupportCollection<int, array>
     */
    public function purchaseOptions(int $supplierId): SupportCollection
    {
        // latestHistory feeds the status chip; the voucherSuppliers bridge
        // rows find the DV the option's PO was charged to — newest one
        // wins, so the constraint on the query orders it there.
        return PurchaseOptions::with([
            'transactionItem.transaction.latestHistory',
            'purchaseOrderOption.purchaseOrder.voucherSuppliers'
                => fn ($q) => $q->orderByDesc('nVoucherId'),
            'purchaseOrderOption.purchaseOrder.voucherSuppliers.voucher',
        ])
            ->where('nSupplierId', $supplierId)
            ->orderByDesc('dtCanvass')
            ->orderBy('nPurchaseItemId', 'desc')
            ->get()
            ->map(fn ($option) => $this->formatOption($option));
    }

    /**
     * Moves purchase options from one supplier to another.
     *
     * The destination must be an ACTIVE supplier — an inactive one would
     * only move the problem. The supplier CONTACT of each option is
     * cleared on the way: it belongs to the old supplier, so it cannot
     * stay behind on a line that now names the new one.
     *
     * Supplier-type vouchers are carried along too: every DV whose
     * supplier is the one being left behind is re-pointed to the new
     * supplier, so its supplier block keeps resolving to a real,
     * up-to-date record instead of a voucher about to be deleted.
     *
     * @param  array<int>  $optionIds  the options to move — empty means ALL
     *                                  of the supplier's options.
     * @return int  the number of options that moved.
     */
    public function transferPurchaseOptions(int $supplierId, int $targetSupplierId, array $optionIds = []): int
    {
        $target = $this->find($targetSupplierId);

        if ((string) $target->cStatus !== $this->activeStatusCode()) {
            throw new RuntimeException('The destination supplier must be an active supplier.');
        }

        if ($targetSupplierId === $supplierId) {
            throw new RuntimeException('The destination supplier must be different from the supplier being transferred.');
        }

        $moved = DB::transaction(function () use ($supplierId, $targetSupplierId, $optionIds) {
            $query = PurchaseOptions::where('nSupplierId', $supplierId);

            if ($optionIds !== []) {
                $query->whereIn('nPurchaseItemId', $optionIds);
            }

            $options = $query->with('transactionItem')->get();

            $count = 0;

            foreach ($options as $option) {
                $option->update([
                    'nSupplierId'        => $targetSupplierId,
                    'nSupplierContactId' => null,
                ]);

                broadcast(new OptionUpdated(
                    'updated',
                    (int) $option->nPurchaseItemId,
                    (int) $option->nTransactionItemId,
                    (int) ($option->transactionItem?->nTransactionId ?? 0)
                ))->toOthers();

                $count++;
            }

            // The supplier-type vouchers stamped with the old supplier
            // follow it over — nTypeId is the supplier id when cType = 'S'.
            $supplierType = array_search(
                'Supplier',
                config('mappings.voucher_type', []),
                true,
            );

            Voucher::where('cType', $supplierType)
                ->where('nTypeId', $supplierId)
                ->get()
                ->each(function (Voucher $voucher) use ($targetSupplierId) {
                    $voucher->update(['nTypeId' => $targetSupplierId]);

                    broadcast(new VoucherUpdated(
                        'updated',
                        (int) $voucher->nVoucherId
                    ))->toOthers();
                });

            return $count;
        });

        return $moved;
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

    /**
     * One purchase option, flattened for the transfer modal.
     */
    private function formatOption(PurchaseOptions $option): array
    {
        $item        = $option->transactionItem;
        $transaction = $item?->transaction;
        $status      = $transaction?->latestHistory?->nStatus;
        // The DV the option's PO was charged to — through the
        // voucher_suppliers bridge (PO → voucher). Only a voucher that
        // actually carries a number counts: its presence is what makes
        // the row "vouchered", and the number is the echo-line below
        // brand · model.
        $voucher     = $option->purchaseOrderOption
            ?->purchaseOrder
            ?->voucherSuppliers
            ->map(fn ($row) => $row->voucher)
            ->filter(fn ($v) => $v && $v->strNumber)
            ->first();
        $statusLabels = config('mappings.status_transaction', []);

        return [
            'nPurchaseItemId'    => $option->nPurchaseItemId,
            'nTransactionItemId' => $option->nTransactionItemId,
            'nTransactionId'     => $transaction?->nTransactionId,
            'strBrand'           => $option->strBrand,
            'strModel'           => $option->strModel,
            'strSpecs'           => $option->strSpecs,
            'nQuantity'          => $option->nQuantity,
            'strUOM'             => $option->strUOM,
            'dUnitPrice'         => $option->dUnitPrice,
            'bIncluded'          => (bool) $option->bIncluded,
            'bPurchaseIncluded'  => (bool) $option->bPurchaseIncluded,
            'bAddOn'             => (bool) $option->bAddOn,
            'dtCanvass'          => $option->dtCanvass,
            'strItemName'        => $item?->strName,
            'strItemUOM'         => $item?->strUOM,
            'strTransactionTitle' => $transaction?->strTitle,
            'strTransactionCode'  => $transaction?->strCode,
            'status'             => $status !== null
                ? ($statusLabels[(string) $status] ?? null)
                : null,
            'status_code'        => $status,
            'strDVNumber'        => $voucher?->strNumber,
            'voucher_status'     => $voucher?->cStatus,
        ];
    }
}
