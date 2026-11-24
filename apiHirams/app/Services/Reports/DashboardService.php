<?php

namespace App\Services\Reports;

use App\Helpers\FormulaHelper;
use App\Services\Finance\JevService;
use App\Models\Client;
use App\Models\Jev;
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
    public function __construct(private readonly JevService $jevService)
    {
    }

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
     * Active Delivered (D) JEVs with NO inventory link are appended to
     * Collectibles as JEV rows (`isJev`): their code/title/date are the
     * journal's own, the badge is the client nickname only, BID Amount is
     * the journal's balanced side (sum of its positive entries), and Net
     * Amount is that balance less collection EWT and tax (goods by default,
     * services when any word of the title is "Service"). Inventory-backed
     * D JEVs have a transaction behind them and are not listed here.
     *
     * Every transaction row also carries the inputs the card's metrics strip
     * needs to reproduce the receipt's deduction ledger (see
     * CollectionReceiptCard): cItemType (drives the EWT rate — goods 1%,
     * services 2%) and retention (the direct-cost rows whose option name
     * contains "retention").
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
        $typeDelivered  = (string) (array_search('Delivered Items', $jevTypes, true) ?: 'D');
        // The mapping calls A "Active" (some installs label it "Completed");
        // A is the code either way — use it if the label lookup misses.
        $activeStatus   = (string) (array_search('Active', config('mappings.jev_status', []), true) ?: 'A');

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

        // Fallback for records with no ABC stored: the chosen pricing set's
        // selling price — the same fallback the For Collection list uses.
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
            ->map(function ($txn) use ($chosen, $retentionMap) {
                $abc = (float) ($txn->dTotalABC ?? 0);
                $amount = $abc > 0
                    ? $abc
                    : (isset($chosen[$txn->nTransactionId])
                        ? (float) FormulaHelper::calculateTotalSellingPrice(
                            $chosen[$txn->nTransactionId]
                        )
                        : 0.0);

                return $this->collectionCardRow(
                    $txn,
                    $amount,
                    $retentionMap[$txn->nTransactionId] ?? 0.0,
                    // When it reached "For Collection" — the date the filter windows
                    $txn->latestHistory?->dtOccur
                );
            })
            ->values()
            ->all();

        // ── Active Delivered JEVs with NO inventory link ───────────────
        // Only hand-added D JEVs belong here: ones stamped onto inventory
        // batches already have a transaction behind them and belong to the
        // normal collectibles rows. They ride as JEV rows (flagged `isJev`):
        // the badge is the client nickname only, BID Amount is the journal's
        // balanced side, and Net Amount is that balance less EWT / tax.
        $deliveredJevs = collect();
        if ($typeDelivered !== '') {
            $deliveredJevs = Jev::with([
                'entries.journal_account.client',
                'inventories',
            ])
                ->where('cJEVLinkType', $typeDelivered)
                ->where('cStatus', $activeStatus)
                ->whereDoesntHave('inventories')
                ->get()
                ->map(function ($jev) {
                    // The balanced side — same figure the JEV list prints
                    // as its total (credits, i.e. positive dAmount rows).
                    $balanced = $jev->entries->reduce(
                        fn($sum, $entry) => $sum + max(0, (float) $entry->dAmount),
                        0,
                    );

                    return [
                        'id'              => $jev->nJEVId,
                        'strCode'         => $jev->strJEVNumber,
                        'strTitle'        => $jev->strTitle,
                        'clientNickName'  => $this->jevService->displayTitleOf($jev),
                        'companyNickName' => null,
                        'officeNickName'  => null,
                        'cItemType'       => null,
                        'retention'       => 0,
                        // The card puts jevTotal in BID Amount and derives
                        // Net Amount from EWT / tax on that balance.
                        'amount'          => 0,
                        'jevTotal'        => round($balanced, 2),
                        'date'            => $jev->dtOccur,
                        'isJev'           => true,
                    ];
                });
        }

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

        // ── An Active Collection JEV covers a hand-added Delivered one ──
        // Only inventory-free JEVs of BOTH types take part: an inventory
        // JEV already has a transaction behind it, so it is neither hidden
        // here nor offered as a match. Once matched, the D row leaves
        // Collectibles and the C JEV takes its place in Collection.
        $matchedCollectionJevs = collect();
        if ($typeCollection !== '' && $deliveredJevs->isNotEmpty()) {
            $collectionJevs = Jev::with([
                'entries.journal_account.client',
                'inventories',
                'collections',
                'transactions.client',
            ])
                ->where('cJEVLinkType', $typeCollection)
                ->where('cStatus', $activeStatus)
                ->whereDoesntHave('inventories')
                ->get();

            // Index every candidate by its match key (client | amount |
            // period-or-words) — one pass, no per-row queries.
            $byKey = [];
            foreach ($collectionJevs as $jev) {
                $balanced = $jev->entries->reduce(
                    fn($sum, $entry) => $sum + max(0, (float) $entry->dAmount),
                    0,
                );
                $key = $this->jevMatchKey(
                    $jev->strTitle,
                    $this->jevService->displayTitleOf($jev),
                    $balanced,
                );
                $byKey[$key][] = $jev;
            }

            $matchedIds = [];
            $deliveredJevs = $deliveredJevs->reject(
                function ($row) use ($byKey, &$matchedIds) {
                    $key = $this->jevMatchKey(
                        $row['strTitle'],
                        $row['clientNickName'],
                        $row['jevTotal'],
                    );
                    if (empty($byKey[$key])) {
                        return false;
                    }
                    foreach ($byKey[$key] as $jev) {
                        $matchedIds[$jev->nJEVId] = true;
                    }
                    return true;
                }
            );

            // A C JEV whose bound transaction already produced a Collection
            // row must not be printed twice.
            $existingTxnIds = collect($collections)
                ->pluck('id')
                ->filter()
                ->map(fn($id) => (string) $id)
                ->all();

            $matchedCollectionJevs = $collectionJevs
                ->filter(fn($jev) => isset($matchedIds[$jev->nJEVId]))
                ->reject(function ($jev) use ($existingTxnIds) {
                    $txnId = $jev->collections->first()?->nTransactionId;
                    return $txnId !== null && in_array((string) $txnId, $existingTxnIds, true);
                })
                ->map(function ($jev) {
                    $balanced = $jev->entries->reduce(
                        fn($sum, $entry) => $sum + max(0, (float) $entry->dAmount),
                        0,
                    );

                    return [
                        'id'              => $jev->nJEVId,
                        'strCode'         => $jev->strJEVNumber,
                        'strTitle'        => $jev->strTitle,
                        'clientNickName'  => $this->jevService->displayTitleOf($jev),
                        'companyNickName' => null,
                        'officeNickName'  => null,
                        'cItemType'       => null,
                        'retention'       => 0,
                        'amount'          => 0,
                        'jevTotal'        => round($balanced, 2),
                        'date'            => $jev->dtOccur,
                        'isJev'           => true,
                    ];
                });
        }

        // JEV rows come after the transaction rows; the existing order of
        // the transaction rows is left untouched.
        $collectibles = collect($collectibles)
            ->concat($deliveredJevs)
            ->values()
            ->all();
        $collections = collect($collections)
            ->concat($matchedCollectionJevs)
            ->values()
            ->all();

        return [
            'collectibles' => $collectibles,
            'collections'  => $collections,
        ];
    }

    /** Month names (full + abbreviated) used to read a period out of a title. */
    private function monthWords(): array
    {
        return [
            'january' => 1, 'jan' => 1,
            'february' => 2, 'feb' => 2,
            'march' => 3, 'mar' => 3,
            'april' => 4, 'apr' => 4,
            'may' => 5,
            'june' => 6, 'jun' => 6,
            'july' => 7, 'jul' => 7,
            'august' => 8, 'aug' => 8,
            'september' => 9, 'sep' => 9, 'sept' => 9,
            'october' => 10, 'oct' => 10,
            'november' => 11, 'nov' => 11,
            'december' => 12, 'dec' => 12,
        ];
    }

    /** "July 2026" / "Jul 2026" / "07/2026" → "2026-07"; null when absent. */
    private function monthYearKey(?string $title): ?string
    {
        $text = strtolower((string) $title);
        foreach ($this->monthWords() as $word => $month) {
            if (preg_match('/\b' . preg_quote($word, '/') . '\b\D{0,12}\b(20\d{2})\b/', $text, $m)) {
                return sprintf('%04d-%02d', (int) $m[1], $month);
            }
        }
        if (preg_match('/\b(0?[1-9]|1[0-2])\s*\/\s*(20\d{2})\b/', $text, $m)) {
            return sprintf('%04d-%02d', (int) $m[2], (int) $m[1]);
        }
        return null;
    }

    /**
     * Stable words of a title after dropping the JEV / boilerplate prefixes.
     * "CSI - Drone - PGOM-SP" and "Collection for Drone PGOM-SP" both
     * become "drone pgom sp".
     */
    private function descriptorKey(?string $title): string
    {
        $stop = array_merge(
            array_keys($this->monthWords()),
            ['csi', 'collection', 'for', 'of', 'the', 'and', 'a', 'an', 'to', 'in', 'on', 'by', 'payment', 'jev']
        );
        $words = preg_split('/[^a-z0-9]+/', strtolower((string) $title), -1, PREG_SPLIT_NO_EMPTY);
        $words = array_values(array_filter(
            $words,
            fn($w) => !in_array($w, $stop, true) && !preg_match('/^\d{4}$/', $w)
        ));
        sort($words, SORT_STRING);
        return implode(' ', $words);
    }

    /**
     * One match key for a JEV: normalized client + balanced amount in
     * centavos + either the title's period or its descriptor words. A
     * period-bearing title never matches a word-only one, so "June" and
     * "July" cannot collide with an undated C JEV.
     */
    private function jevMatchKey(?string $title, ?string $client, $amount): string
    {
        $prefix = preg_replace('/\s+/', ' ', strtolower(trim((string) $client))) . '|'
            . (string) ((int) round(((float) $amount) * 100)) . '|';
        $period = $this->monthYearKey($title);

        return $period !== null
            ? $prefix . 'p:' . $period
            : $prefix . 'w:' . $this->descriptorKey($title);
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
