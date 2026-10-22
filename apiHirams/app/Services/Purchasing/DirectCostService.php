<?php

namespace App\Services\Purchasing;

use App\Helpers\FormulaHelper;
use App\Models\DirectCost;
use App\Models\PurchaseOptions;
use App\Services\CrudService;

/**
 * Direct cost CRUD + the optional EWT total used by the listing.
 *
 * No broadcast event: the original controller never broadcast, so
 * CrudService::eventClass() stays null and every write is silent.
 */
class DirectCostService extends CrudService
{
    protected string $entityName = 'DirectCost';
    protected string $primaryKey = 'nDirectCostID';
    protected array  $defaultSort = ['nDirectCostID', 'asc'];

    protected function modelClass(): string
    {
        return DirectCost::class;
    }

    /**
     * Costs of one transaction, plus — when requested — the EWT total of the
     * transaction's included purchase options.
     *
     * @return array{directCosts: \Illuminate\Database\Eloquent\Collection, totalEWT: float|int}
     */
    public function costsWithTotalEWT($nTransactionID, bool $withEWT): array
    {
        $costs = $this->newQuery()
            ->where('nTransactionID', $nTransactionID)
            ->orderBy('nDirectCostID')
            ->get();

        $totalEWT = 0;
        if ($withEWT) {
            // The EWT is DERIVED (the dEWT column is gone), so it cannot be
            // summed in SQL — the options are loaded with the relations the
            // formula needs and the amounts are worked out one by one.
            $options = PurchaseOptions::with(['supplier', 'transactionItem.transaction'])
                ->whereHas('transactionItem', function ($q) use ($nTransactionID) {
                    $q->where('nTransactionId', $nTransactionID);
                })
                ->where('bIncluded', 1)
                ->get();

            $totalEWT = (float) $options->sum(
                fn ($option) => FormulaHelper::calculateEWTForOption($option)
            );
        }

        return ['directCosts' => $costs, 'totalEWT' => $totalEWT];
    }

    /**
     * A cost with its option eagerly loaded (the old show() query).
     */
    public function findWithOptions(int $id): DirectCost
    {
        return $this->newQuery()->with('option')->findOrFail($id);
    }
}
