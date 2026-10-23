<?php

namespace App\Services\Purchasing;

use App\Events\DirectCostUpdated;
use App\Models\DirectCost;
use App\Models\DirectCostOptions;
use App\Services\CrudService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection as SupportCollection;
use RuntimeException;

/**
 * Direct cost option CRUD.
 *
 * DirectCostUpdated reproduces the controller's old hand-rolled broadcasts:
 * CrudService emits `new DirectCostUpdated($action, $id)->toOthers()` on
 * create / update, and on delete the route id (an int) — exactly matching
 * the original store(), update() and destroy() calls.
 */
class DirectCostOptionsService extends CrudService
{
    protected string $entityName = 'DirectCostOption';
    protected string $primaryKey = 'nDirectCostOptionID';

    protected function modelClass(): string
    {
        return DirectCostOptions::class;
    }

    protected function eventClass(): ?string
    {
        return DirectCostUpdated::class;
    }

    /**
     * The listing carries how many direct cost lines use each option — the
     * UI swaps Delete for Transfer on the options that have any.
     *
     * Only lines charged to a transaction that still EXISTS are counted: a
     * line left behind by a deleted transaction is dead data, and it must
     * not hold the option hostage.
     */
    public function search(?string $term = null): Builder
    {
        $table = (new DirectCostOptions())->getTable();
        $costs = (new DirectCost())->getTable();

        return parent::search($term)
            ->select("{$table}.*")
            ->selectSub(
                DirectCost::query()
                    ->join('tbltransactions', 'tbltransactions.nTransactionId', '=', "{$costs}.nTransactionID")
                    ->selectRaw('COUNT(*)')
                    ->whereColumn("{$costs}.nDirectCostOptionID", "{$table}.nDirectCostOptionID"),
                'costs_count'
            );
    }

    /**
     * TRUE when a live transaction still charges a cost to this option —
     * such an option cannot be deleted, it has to be transferred first.
     */
    public function hasCosts(int $id): bool
    {
        return DirectCost::where('nDirectCostOptionID', $id)
            ->whereHas('transaction')
            ->exists();
    }

    /**
     * The transactions that charge a direct cost to this option — one row
     * per cost line, the list the transfer modal shows before the lines are
     * moved to another option.
     *
     * Only lines charged to a transaction that still EXISTS are listed —
     * every row therefore carries a real transaction code.
     *
     * @return SupportCollection<int, array>
     */
    public function costs(int $optionId): SupportCollection
    {
        $transactionStatuses = config('mappings.status_transaction', []);

        return DirectCost::with(['transaction.latestHistory'])
            ->where('nDirectCostOptionID', $optionId)
            ->whereHas('transaction')
            ->orderBy('nDirectCostID')
            ->get()
            ->map(function ($cost) use ($transactionStatuses) {
                $transaction  = $cost->transaction;
                $statusLabels = $transaction->latestHistory?->nStatus;

                return [
                    'id'            => (int) $cost->nDirectCostID,
                    'transactionId' => (int) $transaction->nTransactionId,
                    'code'          => $transaction->strCode,
                    'label'         => $transaction->strTitle,
                    'status'        => $statusLabels !== null
                        ? ($transactionStatuses[(string) $statusLabels] ?? null)
                        : null,
                    'amount'        => $cost->dAmount,
                    'dtCreated'     => $transaction->dtDocSubmission,
                ];
            });
    }

    /**
     * Moves this option's direct cost lines to another option.
     *
     * Nothing else on the line changes: the amount and its transaction stay
     * exactly as they are — only the option the cost is charged under moves.
     * Each moved line broadcast-fetches the option lists again.
     *
     * @param  array<int>  $costIds  the lines to move.
     * @return int how many lines moved.
     */
    public function transferCosts(int $optionId, int $targetOptionId, array $costIds = []): int
    {
        $target = DirectCostOptions::findOrFail($targetOptionId);

        if ($targetOptionId === $optionId) {
            throw new RuntimeException('The destination option must be different from the option being transferred.');
        }

        $moved = 0;

        if ($costIds !== []) {
            $costs = DirectCost::where('nDirectCostOptionID', $optionId)
                ->whereIn('nDirectCostID', $costIds)
                ->get();

            foreach ($costs as $cost) {
                $cost->update(['nDirectCostOptionID' => $targetOptionId]);

                broadcast(new DirectCostUpdated('updated', (int) $cost->nDirectCostID))->toOthers();

                $moved++;
            }
        }

        return $moved;
    }

    /**
     * Deleting an option also removes the dead lines (charged to
     * transactions that no longer exist) that were left on it.
     *
     * The controller only lets an option through when no LIVE line still
     * charges to it.
     */
    public function delete(int $id): DirectCostOptions
    {
        DirectCost::where('nDirectCostOptionID', $id)
            ->whereDoesntHave('transaction')
            ->delete();

        return parent::delete($id);
    }
}
