<?php

namespace App\Services\Reports;

use App\Helpers\FormulaHelper;
use App\Models\Client;
use App\Models\Company;
use App\Models\DirectCost;
use App\Models\ItemPricings;
use App\Models\PricingSet;
use App\Models\Supplier;
use App\Models\TransactionHistory;
use App\Models\Transactions;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Read-only aggregation behind the Dashboard endpoints.
 *
 * Controllers keep the response envelopes (and their try/catch logging);
 * every query and calculation lives here, moved verbatim from the original
 * DashboardController to preserve byte-identical output.
 */
class DashboardService
{
    /**
     * Totals shown on the dashboard header: active users/clients/suppliers
     * and the raw company count.
     *
     * @return array{users: int, companies: int, clients: int, suppliers: int}
     */
    public function totalMetrics(): array
    {
        $status = array_keys(config('mappings.status_user'));

        $totalUsers = User::where('cStatus', $status[0])->count();
        $totalCompanies = Company::count();
        $totalClients = Client::where('cStatus', $status[0])->count();
        $totalSuppliers = Supplier::where('cStatus', $status[0])->count();

        return [
            'users' => $totalUsers,
            'companies' => $totalCompanies,
            'clients' => $totalClients,
            'suppliers' => $totalSuppliers,
        ];
    }

    /**
     * Monthly revenue / expenses / profit for one year.
     *
     * @return array<int, array{month: string, revenue: float, expenses: float, profit: float}>
     */
    public function profitByMonth(int $year): array
    {
        $pricings = ItemPricings::with([
            'transactionItem.purchaseOptions',
            'transactionItem.transaction',
        ])
            ->whereHas('transactionItem.transaction', function ($q) use ($year) {
                $q->whereYear('dtDocSubmission', $year); // ← ADJUST if your date field differs
            })
            ->get();

        $monthly = array_fill(1, 12, ['revenue' => 0.0, 'expenses' => 0.0, 'profit' => 0.0]);

        foreach ($pricings as $p) {
            $item = $p->transactionItem;
            if (!$item || !$item->transaction) continue;

            $month = (int) date('n', strtotime($item->transaction->dtDocSubmission));

            $qty = (float) ($item->nQuantity ?? 0);
            $includedTotal = $item->purchaseOptions
                ->where('bIncluded', 1)
                ->sum(fn($o) => (float) $o->nQuantity * (float) $o->dUnitPrice);

            $unitSellingPrice = (float) ($p->dUnitSellingPrice ?? 0);
            $sellingTotal = $unitSellingPrice * $qty;
            $capital = $qty > 0 ? $includedTotal / $qty : 0;

            $tax = (($sellingTotal - $includedTotal) / 1.12) * 0.42;
            $profit = (($unitSellingPrice - $capital) * $qty) - $tax;

            $monthly[$month]['revenue']  += $sellingTotal;
            $monthly[$month]['expenses'] += $includedTotal;
            $monthly[$month]['profit']   += $profit;
        }

        $monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        $result = [];
        foreach ($monthly as $m => $vals) {
            $result[] = [
                'month'    => $monthNames[$m - 1],
                'revenue'  => round($vals['revenue'], 2),
                'expenses' => round($vals['expenses'], 2),
                'profit'   => round($vals['profit'], 2),
            ];
        }

        return $result;
    }

    /**
     * Per-employee processing stats (steps, speed, ranks) for one year.
     *
     * @return array<int, array{userId: mixed, name: mixed, transactionsHandled: int, avgBusinessHours: float|int, totalBusinessHours: float, rank: int, speedRank: int}>
     */
    public function employeePerformance(int $year): array
    {
        $histories = TransactionHistory::whereYear('dtOccur', $year)
            ->orderBy('nTransactionId')
            ->orderBy('dtOccur')
            ->with(['user' => function ($q) {
                $q->select('nUserId', 'strNickName', 'cStatus', 'cUserType');
            }])
            ->get()
            ->groupBy('nTransactionId');

        $userStats = [];

        foreach ($histories as $transactionId => $rows) {
            $rows = $rows->values();
            for ($i = 1; $i < $rows->count(); $i++) {
                $prev = $rows[$i - 1];
                $curr = $rows[$i];
                $userId = $curr->nRawUserId ?? $curr->nUserId;
                if (!$userId) continue;

                // ⛔ Skip if user relation missing, not active, or is type 'M'
                if (
                    !$curr->user
                    || $curr->user->cStatus !== 'A'
                    || $curr->user->cUserType === 'M'
                ) continue;

                $minutes = $this->getBusinessMinutes($prev->dtOccur, $curr->dtOccur);

                if (!isset($userStats[$userId])) {
                    $userStats[$userId] = [
                        'userId'         => $userId,
                        'name'           => $curr->user->strNickName ?? "User {$userId}",
                        'steps'          => 0,
                        'totalMinutes'   => 0,
                        'transactionIds' => [],
                    ];
                }
                $userStats[$userId]['steps']++;
                $userStats[$userId]['totalMinutes'] += $minutes;
                $userStats[$userId]['transactionIds'][$transactionId] = true;
            }
        }

        $result = array_values(array_map(function ($u) {
            return [
                'userId'               => $u['userId'],
                'name'                 => $u['name'],
                'transactionsHandled'  => count($u['transactionIds']),
                'avgBusinessHours'     => $u['steps'] > 0 ? round(($u['totalMinutes'] / $u['steps']) / 60, 2) : 0,
                'totalBusinessHours'   => round($u['totalMinutes'] / 60, 2),
            ];
        }, $userStats));

        usort($result, fn($a, $b) => $b['transactionsHandled'] <=> $a['transactionsHandled']);

        foreach ($result as $i => &$row) {
            $row['rank'] = $i + 1;
        }
        unset($row);

        $speedSorted = $result;
        usort($speedSorted, function ($a, $b) {
            if ($a['avgBusinessHours'] == 0 && $b['avgBusinessHours'] == 0) return 0;
            if ($a['avgBusinessHours'] == 0) return 1;
            if ($b['avgBusinessHours'] == 0) return -1;
            return $a['avgBusinessHours'] <=> $b['avgBusinessHours'];
        });

        $speedRankMap = [];
        foreach ($speedSorted as $i => $row) {
            $speedRankMap[$row['userId']] = $i + 1;
        }

        foreach ($result as &$row) {
            $row['speedRank'] = $speedRankMap[$row['userId']];
        }
        unset($row);

        return $result;
    }

    /**
     * Get all NON-ARCHIVED transactions for the Dashboard.
     * Used by: Ongoing Transactions panel, Transactions-by-Month chart,
     * and the year dropdown — all of which should ignore archived transactions.
     *
     * @return Collection<int, array<string, mixed>>
     */
    public function ongoingTransactions(): Collection
    {
        $statusCodes         = array_keys(config('mappings.status_transaction'));
        $archivedStatusCodes = array_keys(config('mappings.archive_status'));

        return Transactions::with(['company', 'client', 'user', 'latestHistory', 'histories.user'])
            ->whereHas('latestHistory', function ($q) use ($archivedStatusCodes) {
                $q->whereNotIn('nStatus', $archivedStatusCodes); // ⛔ exclude archived
            })
            ->get()
            ->sortBy(function ($txn) {
                $now = now()->timestamp;

                $status    = $txn->latestHistory?->nStatus;
                $useAODate = ($status >= 200 && $status <= 240);
                $dateField = $useAODate ? $txn->dtAODueDate : $txn->dtDocSubmission;

                if ($dateField) {
                    $ts = strtotime($dateField);
                    if ($ts < $now) {
                        return [0, $ts];         // overdue — most overdue first
                    }
                    return [1, $ts - $now];      // upcoming — closest first
                }

                return [2, PHP_INT_MAX];         // no date — absolute last
            })
            ->values()
            ->map(function ($txn) use ($statusCodes) {
                $latest = $txn->latestHistory;

                $createdHistory = $txn->histories
                    ->where('nStatus', $statusCodes[0])
                    ->sortByDesc('nTransactionHistoryId')
                    ->first();

                $createdBy = $createdHistory?->user
                    ? $createdHistory->user->strNickName
                    : null;

                return [
                    'nTransactionId'         => $txn->nTransactionId,
                    'strCode'                => $txn->strCode,
                    'cItemType'              => $txn->cItemType,
                    'cProcMode'              => $txn->cProcMode,
                    'cProcSource'            => $txn->cProcSource,
                    'nAssignedAO'            => $txn->nAssignedAO,
                    'dTotalABC'              => $txn->dTotalABC,
                    'dtPreBid'               => $txn->dtPreBid,
                    'strPreBid_Venue'        => $txn->strPreBid_Venue,
                    'dtDocIssuance'          => $txn->dtDocIssuance,
                    'strDocIssuance_Venue'   => $txn->strDocIssuance_Venue,
                    'dtDocSubmission'        => $txn->dtDocSubmission,
                    'strDocSubmission_Venue' => $txn->strDocSubmission_Venue,
                    'dtDocOpening'           => $txn->dtDocOpening,
                    'dtAODueDate'            => $txn->dtAODueDate,
                    'strDocOpening_Venue'    => $txn->strDocOpening_Venue,
                    'strTitle'               => $txn->strTitle,
                    'strRefNumber'           => $txn->strRefNumber,
                    'dtDelivery'             => $txn->dtDelivery,
                    'strDeliveryPlace'       => $txn->strDeliveryPlace,
                    'company'                => $txn->company,
                    'client'                 => $txn->client,
                    'user'                   => $txn->user,
                    'current_status'         => $latest?->nStatus ?? null,
                    'latest_history'         => $latest,
                    'created_by'             => $createdBy,
                    'created_by_id'          => $createdHistory?->user?->nUserId ?? null,
                ];
            });
    }

    /**
     * The Management dashboard's Collectibles / Collection card.
     *
     *   • Collectibles — transactions sitting at "For Collection" that do NOT
     *     have a Collection (C) journal raised yet. The amount is the chosen
     *     pricing set's total selling price — the same figure the For
     *     Collection workspace calls the "Collectible Amount".
     *   • Collection — transactions that DO have a Collection journal. The
     *     amount is the journal's credit side (the sum of its positive
     *     entries), i.e. what the receipt actually collected.
     *
     * Every row also carries the inputs the card's metrics strip needs to
     * reproduce the receipt's deduction ledger (see CollectionReceiptCard):
     * cItemType (drives the EWT rate — goods 1%, services 2%) and retention
     * (the direct-cost rows whose option name contains "retention").
     *
     * @return array{
     *     collectibles: array<int, array<string, mixed>>,
     *     collections:  array<int, array<string, mixed>>,
     * }
     */
    public function collectiblesCollection(): array
    {
        $statusCodes    = config('mappings.status_transaction', []);
        $forCollection  = (string) (array_search('For Collection', $statusCodes, true) ?: '');
        $jevTypes       = config('mappings.jev_types', []);
        $typeCollection = (string) (array_search('Collection', $jevTypes, true) ?: '');

        // ── Collectibles: the For Collection workspace itself ──────────
        // Every transaction sitting at For Collection belongs here, even if a
        // journal was already raised — the workspace is the source of truth.
        $collectibleTxns = collect();
        if ($forCollection !== '') {
            $collectibleTxns = Transactions::with(['client', 'company', 'latestHistory'])
                ->whereHas('latestHistory', fn($q) => $q->where('nStatus', $forCollection))
                ->get();
        }

        // ── Collection: the Collected / Transaction Completed archive ──
        // A Collection journal alone is not enough — the transaction must
        // have actually been completed (the archive's rule).
        $collectedTxns = collect();
        if ($typeCollection !== '') {
            $collectedTxns = Transactions::with(['client', 'company', 'latestCompletedHistory'])
                ->whereHas('latestCompletedHistory')
                ->whereHas('collection', fn($q) => $q->whereHas(
                    'jev', fn($j) => $j->where('cJEVLinkType', $typeCollection)
                ))
                ->get();
        }

        // The chosen set of every collectible transaction — ONE query, no
        // per-row N+1. The figure is computed through FormulaHelper, the same
        // path the pricing-set listing uses, so the card can never disagree
        // with the table.
        $chosen = $collectibleTxns->isEmpty() ? collect() : PricingSet::whereIn(
            'nTransactionId',
            $collectibleTxns->pluck('nTransactionId'),
        )
            ->where('bChosen', 1)
            ->pluck('nPricingSetId', 'nTransactionId');

        // ONE retention query for every transaction both lists touch — the
        // same rule the For Collection workspace applies (DirectCost rows
        // whose option name contains "retention", summed per transaction).
        $retentionMap = $this->retentionByTransaction(
            $collectibleTxns->pluck('nTransactionId')
                ->merge($collectedTxns->pluck('nTransactionId'))
                ->filter()
                ->unique()
                ->values()
        );

        $collectibles = $collectibleTxns
            ->map(fn($txn) => $this->collectionCardRow(
                $txn,
                isset($chosen[$txn->nTransactionId])
                    ? FormulaHelper::calculateTotalSellingPrice($chosen[$txn->nTransactionId])
                    : 0.0,
                $retentionMap[$txn->nTransactionId] ?? 0.0,
                // When it reached "For Collection" — the date the filter windows
                $txn->latestHistory?->dtOccur
            ))
            ->values()
            ->all();

        $collections = $collectedTxns
            ->map(function ($txn) use ($retentionMap) {
                $txnId = $txn->nTransactionId;

                return $this->collectionCardRow(
                    $txn,
                    // The archive's figure — the transaction's ABC, not the
                    // journal's credit side.
                    (float) ($txn->dTotalABC ?? 0),
                    $retentionMap[$txnId] ?? 0.0,
                    // When the transaction was marked Transaction Completed.
                    $txn->latestCompletedHistory?->dtOccur
                );
            })
            ->values()
            ->all();

        return [
            'collectibles' => $collectibles,
            'collections'  => $collections,
        ];
    }

    /**
     * Retention per transaction id — one grouped query for the whole batch.
     *
     * Mirrors the For Collection workspace's rule (useTransactionWorkspace's
     * direct-cost scan): direct-cost rows whose OPTION NAME contains
     * "retention", their dAmount summed per transaction.
     *
     * @param  iterable<int, mixed> $txnIds
     * @return array<int, float>
     */
    private function retentionByTransaction($txnIds): array
    {
        $txnIds = collect($txnIds)->filter()->unique()->values();
        if ($txnIds->isEmpty()) {
            return [];
        }

        return DirectCost::query()
            ->join(
                'tbldirectcostoptions as dco',
                'dco.nDirectCostOptionID',
                '=',
                'tbldirectcosts.nDirectCostOptionID'
            )
            ->whereIn('tbldirectcosts.nTransactionID', $txnIds->all())
            ->whereRaw('LOWER(dco.strName) LIKE ?', ['%retention%'])
            ->groupBy('tbldirectcosts.nTransactionID')
            ->selectRaw(
                'tbldirectcosts.nTransactionID as txn_id, SUM(tbldirectcosts.dAmount) as retention'
            )
            ->get()
            ->pluck('retention', 'txn_id')
            ->map(fn($sum) => (float) $sum)
            ->all();
    }

    /**
     * One row of the Collectibles / Collection card — title, client, amount,
     * plus the deduction inputs (cItemType, retention) the metrics strip and
     * the row amounts need.
     */
    private function collectionCardRow(
        ?Transactions $txn,
        ?float $amount,
        ?float $retention = null,
        ?string $date = null
    ): array {
        return [
            'id'             => $txn?->nTransactionId,
            'strCode'        => $txn?->strCode,
            'strTitle'       => $txn?->strTitle,
            'clientNickName' => $txn?->client?->strClientNickName
                ?: $txn?->client?->strClientName,
            'companyNickName' => $txn?->company?->strCompanyNickName
                ?: $txn?->company?->strCompanyName,
            'officeNickName' => $txn?->strOfficeNickName,
            'cItemType'      => $txn?->cItemType,
            'retention'      => round($retention ?? 0, 2),
            'amount'         => round($amount ?? 0, 2),
            // Full dtOccur — the frontend renders it through fmtDateTime
            'date'           => $date,
        ];
    }

    private function getBusinessMinutes($start, $end): float
    {
        if (!$start || !$end) return 0;
        $startDt = new \DateTime($start);
        $endDt   = new \DateTime($end);
        if ($startDt >= $endDt) return 0;

        $totalMinutes = 0;
        $cursor = clone $startDt;
        $cursor->setTime(0, 0, 0);

        while ($cursor < $endDt) {
            $dayOfWeek = (int) $cursor->format('N'); // 1=Mon ... 7=Sun
            $dayStart  = (clone $cursor)->setTime(8, 0, 0);
            $dayEnd    = (clone $cursor)->setTime(17, 0, 0);

            if ($dayOfWeek >= 1 && $dayOfWeek <= 5) {
                $segStart = $startDt > $dayStart ? $startDt : $dayStart;
                $segEnd   = $endDt < $dayEnd ? $endDt : $dayEnd;
                if ($segStart < $segEnd) {
                    $totalMinutes += ($segEnd->getTimestamp() - $segStart->getTimestamp()) / 60;
                }
            }

            $cursor->modify('+1 day');
        }

        return $totalMinutes;
    }
}
