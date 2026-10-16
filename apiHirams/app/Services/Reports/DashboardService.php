<?php

namespace App\Services\Reports;

use App\Models\Client;
use App\Models\Company;
use App\Models\ItemPricings;
use App\Models\Supplier;
use App\Models\TransactionHistory;
use App\Models\Transactions;
use App\Models\User;
use Illuminate\Support\Collection;

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
