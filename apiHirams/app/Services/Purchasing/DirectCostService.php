<?php

namespace App\Services\Purchasing;

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
            $totalEWT = (float) PurchaseOptions::whereHas('transactionItem', function ($q) use ($nTransactionID) {
                    $q->where('nTransactionId', $nTransactionID);
                })
                ->where('bIncluded', 1)
                ->sum('dEWT');
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
