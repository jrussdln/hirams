<?php

namespace App\Services\Masters;

use App\Events\AssigneeUpdated;
use App\Events\VoucherAssigneeUpdated;
use App\Models\Assignee;
use App\Models\Voucher;
use App\Models\VoucherAssignee;
use App\Services\CrudService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection as SupportCollection;
use RuntimeException;

/**
 * Assignee CRUD + the case-sensitive name lookup behind checkExist().
 */
class AssigneeService extends CrudService
{
    protected string $entityName   = 'Assignee';
    protected string $primaryKey   = 'nAssigneeId';
    protected array  $searchable   = ['strAssigneeName', 'strAssigneeNickName'];
    protected array  $defaultSort  = ['strAssigneeName', 'asc'];

    protected function modelClass(): string
    {
        return Assignee::class;
    }

    protected function eventClass(): ?string
    {
        return AssigneeUpdated::class;
    }

    /**
     * The listing carries how many VOUCHERS each assignee is on — the UI
     * swaps Delete for Transfer on the assignees that have any.
     *
     * The count is of DISTINCT vouchers: one voucher can hold several
     * lines for the same assignee, and those are still ONE voucher.
     * Only vouchers that still EXIST are counted — a line left behind by
     * a deleted voucher is dead data, and it must not hold an assignee
     * hostage.
     */
    public function search(?string $term = null): Builder
    {
        $table = (new Assignee())->getTable();
        $lines = (new VoucherAssignee())->getTable();

        return parent::search($term)
            ->select("{$table}.*")
            ->selectSub(
                VoucherAssignee::query()
                    ->join('tblvouchers', 'tblvouchers.nVoucherId', '=', "{$lines}.nVoucherId")
                    ->selectRaw("COUNT(DISTINCT {$lines}.nVoucherId)")
                    ->whereColumn("{$lines}.nAssigneeId", "{$table}.nAssigneeId"),
                'vouchers_count'
            );
    }

    /**
     * Case-sensitive (binary) name match used by the uniqueness check.
     */
    public function existsByName(string $name): bool
    {
        return $this->newQuery()
            ->whereRaw('BINARY strAssigneeName = ?', [$name])
            ->exists();
    }

    /**
     * The status code that marks an assignee ACTIVE.
     */
    public function activeStatusCode(): string
    {
        $statusCodes = array_keys(config('mappings.status_user'));

        return (string) ($statusCodes[0] ?? '');
    }

    /**
     * The ACTIVE assignees — the destinations a transfer can move to.
     */
    public function activeAssignees()
    {
        return $this->newQuery()
            ->where('cStatus', $this->activeStatusCode())
            ->orderBy('strAssigneeName', 'asc')
            ->get();
    }

    /**
     * TRUE when the assignee is still on a voucher — such an assignee
     * cannot be deleted, it has to be transferred first.
     *
     * Only vouchers that still EXIST count: a line left behind by a
     * deleted voucher is dead data, and it goes with the assignee.
     */
    public function hasVouchers(int $id): bool
    {
        return VoucherAssignee::where('nAssigneeId', $id)
            ->whereHas('voucher')
            ->exists();
    }

    /**
     * The vouchers an assignee is on, with the lines of that assignee on
     * each of them.
     *
     * Only vouchers that still EXIST are listed — every row therefore
     * carries a real DV number. The lines of a voucher that was deleted
     * are dead data: they are swept away with the assignee.
     *
     * @return SupportCollection<int, array>
     */
    public function vouchers(int $assigneeId): SupportCollection
    {
        $statusLabels = config('mappings.voucher_status', []);

        $lines = VoucherAssignee::with('voucher')
            ->where('nAssigneeId', $assigneeId)
            ->whereHas('voucher')
            ->get();

        return $lines
            ->groupBy('nVoucherId')
            ->map(function ($group, $voucherId) use ($statusLabels) {
                $voucher = $group->first()->voucher;

                $particulars = $group
                    ->pluck('strParticular')
                    ->filter()
                    ->map(fn ($p) => trim($p))
                    ->unique()
                    ->values();

                return [
                    'nVoucherId'    => (int) $voucherId,
                    // A line can point at a voucher that no longer exists —
                    // the voucher was deleted and the line was left behind.
                    // There is no DV number to show then, so the id stands
                    // in for it and the row is flagged as removed.
                    'strNumber'     => $voucher?->strNumber ?? "Voucher #{$voucherId}",
                    'isRemoved'     => $voucher === null,
                    'cType'         => $voucher?->cType,
                    'cStatus'       => $voucher?->cStatus,
                    'cStatusLabel'  => $statusLabels[(string) $voucher?->cStatus] ?? null,
                    'dtCreated'     => $voucher?->dtCreated,
                    'dAmount'       => (float) $group->sum('dAmount'),
                    'linesCount'    => $group->count(),
                    'particulars'   => $particulars,
                ];
            })
            ->sortByDesc('nVoucherId')
            ->values();
    }

    /**
     * Deleting an assignee also removes its voucher lines.
     *
     * The controller only lets an assignee through when it carries no
     * LIVE voucher — so the lines that go with it are the dead ones left
     * behind by vouchers that were deleted.
     */
    public function delete(int $id): Assignee
    {
        $assignee = $this->find($id);
        $assignee->voucherAssignees()->delete();
        $assignee->delete();

        $this->broadcast('deleted', $id);

        return $assignee;
    }

    /**
     * Moves an assignee's voucher lines to another assignee.
     *
     * The destination must be an ACTIVE assignee — an inactive one would
     * only move the problem. Only the LINES of this assignee move: a
     * voucher can hold lines for several assignees, and the other
     * assignees' lines stay exactly where they are. Nothing else on the
     * line changes — the amount, quantity and EWT are untouched.
     *
     * @param  array<int>  $voucherIds  the vouchers to move — empty means
     *                                   ALL of the assignee's vouchers.
     * @return int  the number of voucher lines that moved.
     */
    public function transferVouchers(int $assigneeId, int $targetAssigneeId, array $voucherIds = []): int
    {
        $target = $this->find($targetAssigneeId);

        if ((string) $target->cStatus !== $this->activeStatusCode()) {
            throw new RuntimeException('The destination assignee must be an active assignee.');
        }

        if ($targetAssigneeId === $assigneeId) {
            throw new RuntimeException('The destination assignee must be different from the assignee being transferred.');
        }

        $query = VoucherAssignee::where('nAssigneeId', $assigneeId);

        if ($voucherIds !== []) {
            $query->whereIn('nVoucherId', $voucherIds);
        }

        $lines = $query->get();

        $moved = 0;

        foreach ($lines as $line) {
            $line->update(['nAssigneeId' => $targetAssigneeId]);

            broadcast(new VoucherAssigneeUpdated(
                'updated',
                (int) $line->nVoucherId,
                (int) $line->nVoucherAssigneeId
            ))->toOthers();

            $moved++;
        }

        return $moved;
    }
}
