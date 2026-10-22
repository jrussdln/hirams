<?php

namespace App\Services\Transactions;

use App\Models\Transactions;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

/**
 * Read side of TransactionController.
 *
 * Holds the query + collection-mapping bodies of all seven index* variants
 * verbatim — sorting, mapping arrays and the virtual status-code remapping
 * are intentionally unchanged. The controller keeps the response envelopes
 * and the 400 guards for a missing nUserId (nothing observable happens
 * before those guards, so keeping them in the controller is equivalent).
 */
class TransactionQueryService
{

    /**
     * Management list: ALL transactions regardless of status.
     * Sorted overdue first / upcoming closest first / no date last,
     * then mapped to the response array (key order preserved).
     */
    public function index(): Collection
    {
        // $statusCodes = array_keys(config('mappings.proc_status'));
        $statusCodes = array_keys(config('mappings.status_transaction'));
        $archivedStatusCodes = array_keys(config('mappings.archive_status'));


        $transactions = Transactions::with(['company', 'client', 'user', 'latestHistory', 'histories.user'])
            ->get()
            // ->sortBy(function ($txn) {
            //     $now = now()->timestamp;
            //     if ($txn->dtDocSubmission) {
            //         $ts = strtotime($txn->dtDocSubmission);
            //         if ($ts >= $now) {
            //             return [0, $ts - $now]; // upcoming — closest first
            //         }
            //     }
            //     return [1, $txn->strCode]; // overdue or no date — by code
            // })
            ->sortBy(function ($txn) {
                $now = now()->timestamp;

                $status = $txn->latestHistory?->nStatus;
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

                // The FIRST history row - the one the Activity Log marks "Start" -
                // is when the transaction was raised, and by whom.
                $createdHistory = $txn->histories->sortBy('dtOccur')->first();

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
                    'dtDelivery'          => $txn->dtDelivery,
                    'strDeliveryPlace'       => $txn->strDeliveryPlace,
                    'company'                => $txn->company,
                    'client'                 => $txn->client,
                    'user'                   => $txn->user,
                    'current_status'         => $latest?->nStatus ?? null,
                    'latest_history'         => $latest,
                    'created_by'             => $createdBy,
                    'created_at'             => $createdHistory?->dtOccur,
                    'created_by_id'          => $createdHistory?->user?->nUserId ?? null,
                ];
            });
        return $transactions;
    }

    /**
     * Procurement Officer / TL list (proc_status scope).
     * Keeps the virtual 115 / 315 remapping, the non-TL 340
     * filtering and the final ->filter()->values() pass.
     */
    public function indexProcurement(Request $request): Collection
    {
        $userId      = (int) $request->query('nUserId');
        $procCodes   = array_keys(config('mappings.proc_status'));
        $archivedStatusCodes = array_keys(config('mappings.archive_status'));

        // proc_status keys by index:
        // 0='100' Draft, 1='110' Finalized, 2='115' Verification(virtual),
        // 3='300' Price Setting, 4='310' Price Finalized, 5='315' Price Verif(virtual), 6='320' Price Approval

        $draftCode         = $procCodes[0]; // '100'
        $finalizeCode      = $procCodes[1]; // '110'
        // $verificationCode = $procCodes[2]; // '115' — virtual, never in DB
        $priceSettingCode  = $procCodes[3]; // '300'
        $priceFinalCode    = $procCodes[4]; // '310'
        // $priceVerifCode   = $procCodes[5]; // '315' — virtual, never in DB
        $priceApprovalCode = $procCodes[6]; // '320'
        $priceApprovedCode = $procCodes[7]; // '330'

        $forPurchaseCode = $procCodes[8] ?? null; // '340' For Purchase
        $realStatuses = array_filter([$draftCode, $finalizeCode, $priceSettingCode, $priceFinalCode, $priceApprovalCode, $priceApprovedCode, $forPurchaseCode]);

        $transactions = Transactions::with(['company', 'client', 'user', 'latestHistory', 'histories.user'])
            ->whereHas('latestHistory', function ($q) use ($realStatuses) {
                $q->whereIn('nStatus', $realStatuses);
            })
            ->get()
            ->unique('nTransactionId')
            // ->sortBy(function ($txn) {
            //     $now = now()->timestamp;
            //     if ($txn->dtDocSubmission) {
            //         $ts = strtotime($txn->dtDocSubmission);
            //         if ($ts >= $now) {
            //             return [0, $ts - $now]; // upcoming — closest first
            //         }
            //     }
            //     return [1, $txn->strCode]; // overdue or no date — by code
            // })
            ->sortBy(function ($txn) {
                $now = now()->timestamp;

                $status = $txn->latestHistory?->nStatus;
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
            ->map(function ($txn) use ($userId, $request, $draftCode, $finalizeCode, $priceSettingCode, $priceFinalCode, $forPurchaseCode) {
                $latest = $txn->latestHistory;

                // Determine the creator of this transaction (the user who first created it at status 100)
                // The FIRST history row - the one the Activity Log marks "Start" -
                // is when the transaction was raised, and by whom.
                $createdHistory = $txn->histories->sortBy('dtOccur')->first();

                $createdBy = $createdHistory?->user
                    ? $createdHistory->user->strNickName
                    : null;

                $creatorId = $createdHistory?->nUserId;

                // Remap virtual verification codes:
                // '110' + NOT my transaction => show as '115' (Transaction Verification — someone else's draft to verify)
                // '310' + NOT my transaction => show as '315' (Price Verification — someone else's price to verify)
                $displayStatus = $latest?->nStatus;

                if ($latest) {
                    $isMyTransaction = ($creatorId == $userId);
                    $isProcTL = (bool) $request->query('isProcTL', false);

                    // For Purchase: non-TL can only see their own
                    if ($latest->nStatus == ($forPurchaseCode ?? '') && !$isProcTL && !$isMyTransaction) {
                        return null;
                    }

                    if ($latest->nStatus == $finalizeCode && !$isMyTransaction) {
                        // This is a finalized txn created by someone else — I need to verify it
                        $displayStatus = '115';
                    } elseif ($latest->nStatus == $priceFinalCode && !$isMyTransaction) {
                        // This is a price-finalized txn created by someone else — I need to verify it
                        $displayStatus = '315';
                    }
                }

                return [
                    'nTransactionId'         => $txn->nTransactionId,
                    'strCode'                => $txn->strCode,
                    'strTitle'               => $txn->strTitle,
                    'cItemType'              => $txn->cItemType,
                    'cProcMode'              => $txn->cProcMode,
                    'cProcSource'            => $txn->cProcSource,
                    'dTotalABC'              => $txn->dTotalABC,
                    'strRefNumber'           => $txn->strRefNumber,
                    'dtPreBid'               => $txn->dtPreBid,
                    'strPreBid_Venue'        => $txn->strPreBid_Venue,
                    'dtDocIssuance'          => $txn->dtDocIssuance,
                    'strDocIssuance_Venue'   => $txn->strDocIssuance_Venue,
                    'dtDocSubmission'        => $txn->dtDocSubmission,
                    'strDocSubmission_Venue' => $txn->strDocSubmission_Venue,
                    'dtDocOpening'           => $txn->dtDocOpening,
                    'strDocOpening_Venue'    => $txn->strDocOpening_Venue,
                    'dtDelivery'          => $txn->dtDelivery,
                    'strDeliveryPlace'       => $txn->strDeliveryPlace,
                    'company'                => $txn->company,
                    'client'                 => $txn->client,
                    'user'                   => $txn->user,
                    'current_status'         => $displayStatus,
                    'latest_history'         => $latest,
                    'created_by'             => $createdBy,
                    'created_at'             => $createdHistory?->dtOccur,
                    'creator_id'             => $creatorId,
                ];
            });
        return $transactions->filter()->values();
    }

    /**
     * Account Officer / AOTL list (aotl_status + ao_status scope)
     * including the virtual 225 / 245 remapping.
     * The 400 guard for a missing nUserId lives in the controller.
     */
    public function indexAccountOfficer(Request $request): Collection
    {
        $userId   = (int) $request->query('nUserId');
        $isAOTL   = (bool) $request->query('isAOTL', false);
        $fetchAll = (bool) $request->query('fetchAll', false);

        $archivedStatusCodes = array_keys(config('mappings.archive_status'));

        $aotlKeys = array_keys(config('mappings.aotl_status'));
        $aoKeys   = array_keys(config('mappings.ao_status'));

        // aotl_status keys by index:
        // 0='200' For Assignment, 1='210' Items Mgmt, 2='220' Items Finalized,
        // 3='225' Items Verif(virtual), 4='230' For Canvas, 5='240' Canvas Finalized,
        // 6='245' Canvas Verif(virtual)

        // ao_status keys by index:
        // 0='210' Items Mgmt, 1='220' Items Finalized, 2='225' Items Verif(virtual),
        // 3='230' For Canvas, 4='240' Canvas Finalized, 5='245' Canvas Verif(virtual)

        $forAssignmentCode   = $aotlKeys[0]; // '200' — AOTL only
        $itemsMgmtCode       = $aotlKeys[1]; // '210'
        $itemsFinalCode      = $aotlKeys[2]; // '220'
        // $itemsVerifCode   = $aotlKeys[3]; // '225' — virtual, never in DB
        $forCanvasCode       = $aotlKeys[4]; // '230'
        $canvasFinalCode     = $aotlKeys[5]; // '240'
        // $canvasVerifCode  = $aotlKeys[6]; // '245' — virtual, never in DB
        $forPurchaseCode     = $aotlKeys[7]; // '340' — for purchase, AOTL only

        // Real DB statuses for AO/AOTL scope
        $realStatuses = [$forAssignmentCode, $itemsMgmtCode, $itemsFinalCode, $forCanvasCode, $canvasFinalCode,  $forPurchaseCode];

        // To this:
        $transactions = Transactions::with(['company', 'client', 'user', 'latestHistory', 'histories.user'])
            ->whereHas('latestHistory', function ($query) use ($realStatuses) {
                $query->whereIn('nStatus', $realStatuses);
            })
            ->get()
            // ->sortBy(function ($txn) {
            //     $now = now()->timestamp;
            //     if ($txn->dtDocSubmission) {
            //         $ts = strtotime($txn->dtDocSubmission);
            //         if ($ts >= $now) {
            //             return [0, $ts - $now]; // upcoming doc submission — closest first
            //         }
            //     }
            //     if ($txn->dtAODueDate) {
            //         $ts = strtotime($txn->dtAODueDate);
            //         if ($ts >= $now) {
            //             return [1, $ts - $now]; // upcoming AO due date — closest first
            //         }
            //     }
            //     return [2, $txn->strCode]; // overdue or no date — by code
            // })
            ->sortBy(function ($txn) {
                $now = now()->timestamp;

                $status = $txn->latestHistory?->nStatus;
                $useAODate = ($status >= 200 && $status <= 240);
                $dateField = $useAODate
                    ? ($txn->dtAODueDate ?? $txn->dtDocSubmission)
                    : ($txn->dtDocSubmission ?? $txn->dtAODueDate);

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
            ->map(function ($txn) use ($userId, $isAOTL, $itemsFinalCode, $canvasFinalCode, $forPurchaseCode) {
                $latest = $txn->latestHistory;

                // ── ADD: resolve creator from the first status (100 = Draft) ─────
                $statusCodes    = array_keys(config('mappings.status_transaction'));
                // The FIRST history row - the one the Activity Log marks "Start" -
                // is when the transaction was raised, and by whom.
                $createdHistory = $txn->histories->sortBy('dtOccur')->first();

                $createdBy = $createdHistory?->user
                    ? $createdHistory->user->strNickName
                    : null;

                $isAssignedAO  = ($txn->nAssignedAO == $userId);
                $displayStatus = $latest?->nStatus;

                if ($latest) {
                    if ($latest->nStatus == $itemsFinalCode && !$isAssignedAO) {
                        $displayStatus = '225';
                    } elseif ($latest->nStatus == $canvasFinalCode && !$isAssignedAO) {
                        $displayStatus = '245';
                    } elseif ($latest->nStatus == $forPurchaseCode && !$isAOTL && !$isAssignedAO) {
                        // AO can only see For Purchase if assigned to them
                        return null; // filter out below
                    }
                }

                return [
                    'nTransactionId'         => $txn->nTransactionId,
                    'strCode'                => $txn->strCode,
                    'cItemType'              => $txn->cItemType,
                    'cProcMode'              => $txn->cProcMode,
                    'cProcSource'            => $txn->cProcSource,
                    'dTotalABC'              => $txn->dTotalABC,
                    'dtPreBid'               => $txn->dtPreBid,
                    'strPreBid_Venue'        => $txn->strPreBid_Venue,
                    'dtDocIssuance'          => $txn->dtDocIssuance,
                    'strDocIssuance_Venue'   => $txn->strDocIssuance_Venue,
                    'dtDocSubmission'        => $txn->dtDocSubmission,
                    'strDocSubmission_Venue' => $txn->strDocSubmission_Venue,
                    'dtDocOpening'           => $txn->dtDocOpening,
                    'strDocOpening_Venue'    => $txn->strDocOpening_Venue,
                    'dtAODueDate'            => $txn->dtAODueDate,
                    'strTitle'               => $txn->strTitle,
                    'dtDelivery'          => $txn->dtDelivery,
                    'strDeliveryPlace'       => $txn->strDeliveryPlace,
                    'nAssignedAO'            => $txn->nAssignedAO,
                    'company'                => $txn->company,
                    'client'                 => $txn->client,
                    'user'                   => $txn->user,
                    'current_status'         => $displayStatus,
                    'latest_history'         => $latest,
                    'created_by'             => $createdBy, // ← ADD
                    'created_at'             => $createdHistory?->dtOccur,
                ];
            });
        return $transactions;
    }

    /**
     * Management archive list (archive_status scope), including the
     * pre-archive "previous_status" mapping.
     */
    public function indexArchive(): Collection
    {
        $statusCodes         = array_keys(config('mappings.status_transaction'));
        $archivedStatusCodes = array_keys(config('mappings.archive_status'));

        $transactions = Transactions::with(['company', 'client', 'user', 'latestHistory', 'histories.user'])
            ->whereHas('latestHistory', function ($q) use ($archivedStatusCodes) {
                $q->whereIn('nStatus', $archivedStatusCodes);
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
                        return [0, $ts];        // overdue — most overdue first
                    }
                    return [1, $ts - $now];     // upcoming — closest first
                }

                return [2, PHP_INT_MAX];        // no date — absolute last
            })
            ->values()
            ->map(function ($txn) use ($statusCodes) {
                $latest = $txn->latestHistory;
                // ── ADD: pre-archive history (second-to-last record) ──────────────
                $preArchiveHistory = $txn->histories
                    ->sortByDesc('nTransactionHistoryId')
                    ->skip(1)
                    ->first();
                // The FIRST history row - the one the Activity Log marks "Start" -
                // is when the transaction was raised, and by whom.
                $createdHistory = $txn->histories->sortBy('dtOccur')->first();

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
                    'dtDelivery'          => $txn->dtDelivery,
                    'strDeliveryPlace'       => $txn->strDeliveryPlace,
                    'company'                => $txn->company,
                    'client'                 => $txn->client,
                    'user'                   => $txn->user,
                    'current_status'         => $latest?->nStatus ?? null,
                    'previous_status' => $preArchiveHistory?->nStatus ?? null, // ← ADD
                    'latest_history'         => $latest,
                    'created_by'             => $createdBy,
                    'created_at'             => $createdHistory?->dtOccur,
                    'created_by_id'          => $createdHistory?->user?->nUserId ?? null,
                ];
            });
        return $transactions;
    }

    /**
     * AO / AOTL archive list: archive_status scope filtered to
     * transactions whose pre-archive status was in the AO scope.
     * The 400 guard for a missing nUserId lives in the controller.
     */
    public function indexAccountOfficerArchive(Request $request): Collection
    {
        $userId      = (int) $request->query('nUserId');
        $isAOTL      = (bool) $request->query('isAOTL', false);
        $archivedStatusCodes = array_keys(config('mappings.archive_status'));

        $aotlKeys = array_keys(config('mappings.aotl_status'));

        $forAssignmentCode = $aotlKeys[0]; // '200'
        $itemsMgmtCode     = $aotlKeys[1]; // '210'
        $itemsFinalCode    = $aotlKeys[2]; // '220'
        $forCanvasCode     = $aotlKeys[4]; // '230'
        $canvasFinalCode   = $aotlKeys[5]; // '240'

        $aoScopeStatuses = [
            $forAssignmentCode,
            $itemsMgmtCode,
            $itemsFinalCode,
            $forCanvasCode,
            $canvasFinalCode,
        ];

        // ── Fetch all archived transactions ───────────────────────────────
        // We need histories to find the pre-archive status (second-to-last record)
        $query = Transactions::with(['company', 'client', 'user', 'latestHistory', 'histories.user'])
            ->whereHas('latestHistory', function ($q) use ($archivedStatusCodes) {
                $q->whereIn('nStatus', $archivedStatusCodes);
            });

        // AO: only transactions assigned to this user
        if (!$isAOTL) {
            $query->where('nAssignedAO', $userId);
        }

        $transactions = $query
            ->get()
            ->filter(function ($txn) use ($aoScopeStatuses) {
                // Find the history record just before the archive entry
                // (second-to-last by dtOccur + id)
                $preArchiveHistory = $txn->histories
                    ->sortByDesc('nTransactionHistoryId')
                    ->skip(1)
                    ->first();

                // Only include if the transaction was in AO workflow scope
                // before it was archived
                return $preArchiveHistory
                    && in_array((string) $preArchiveHistory->nStatus, array_map('strval', $aoScopeStatuses));
            })
            ->sortBy(function ($txn) {
                $now       = now()->timestamp;
                $dateField = $txn->dtDocSubmission ?? $txn->dtAODueDate;

                if ($dateField) {
                    $ts = strtotime($dateField);
                    return $ts < $now ? [0, $ts] : [1, $ts - $now];
                }

                return [2, PHP_INT_MAX];
            })
            ->values()
            ->map(function ($txn) use ($userId) {
                $latest = $txn->latestHistory;
                // ── ADD ───────────────────────────────────────────────────────────
                $preArchiveHistory = $txn->histories
                    ->sortByDesc('nTransactionHistoryId')
                    ->skip(1)
                    ->first();

                $statusCodes    = array_keys(config('mappings.status_transaction'));
                // The FIRST history row - the one the Activity Log marks "Start" -
                // is when the transaction was raised, and by whom.
                $createdHistory = $txn->histories->sortBy('dtOccur')->first();

                $createdBy = $createdHistory?->user
                    ? $createdHistory->user->strNickName
                    : null;

                return [
                    'nTransactionId'         => $txn->nTransactionId,
                    'strCode'                => $txn->strCode,
                    'strTitle'               => $txn->strTitle,
                    'cItemType'              => $txn->cItemType,
                    'cProcMode'              => $txn->cProcMode,
                    'cProcSource'            => $txn->cProcSource,
                    'dTotalABC'              => $txn->dTotalABC,
                    'dtPreBid'               => $txn->dtPreBid,
                    'strPreBid_Venue'        => $txn->strPreBid_Venue,
                    'dtDocIssuance'          => $txn->dtDocIssuance,
                    'strDocIssuance_Venue'   => $txn->strDocIssuance_Venue,
                    'dtDocSubmission'        => $txn->dtDocSubmission,
                    'strDocSubmission_Venue' => $txn->strDocSubmission_Venue,
                    'dtDocOpening'           => $txn->dtDocOpening,
                    'strDocOpening_Venue'    => $txn->strDocOpening_Venue,
                    'dtAODueDate'            => $txn->dtAODueDate,
                    'dtDelivery'          => $txn->dtDelivery,
                    'strDeliveryPlace'       => $txn->strDeliveryPlace,
                    'nAssignedAO'            => $txn->nAssignedAO,
                    'company'                => $txn->company,
                    'client'                 => $txn->client,
                    'user'                   => $txn->user,
                    'current_status'         => $latest?->nStatus ?? null,
                    'previous_status' => $preArchiveHistory?->nStatus ?? null, // ← ADD
                    'latest_history'         => $latest,
                    'created_by'             => $createdBy,
                    'created_at'             => $createdHistory?->dtOccur,
                ];
            });
        return $transactions;
    }

    /**
     * Procurement archive list: archive_status scope filtered to
     * procurement-scope pre-archive status (own transactions unless
     * Proc TL). The 400 guard for a missing nUserId lives in the controller.
     */
    public function indexProcurementArchive(Request $request): Collection
    {
        $userId        = (int) $request->query('nUserId');
        $isProcTL      = (bool) $request->query('isProcTL', false);
        $procCodes     = array_keys(config('mappings.proc_status'));
        $archivedStatusCodes = array_keys(config('mappings.archive_status'));

        $draftCode         = $procCodes[0]; // '100'
        $finalizeCode      = $procCodes[1]; // '110'
        $priceSettingCode  = $procCodes[3]; // '300'
        $priceFinalCode    = $procCodes[4]; // '310'
        $priceApprovalCode = $procCodes[6]; // '320'
        $priceApprovedCode = $procCodes[7]; // '330'

        $procScopeStatuses = [
            $draftCode,
            $finalizeCode,
            $priceSettingCode,
            $priceFinalCode,
            $priceApprovalCode,
            $priceApprovedCode,
        ];

        // ── Fetch all archived transactions ───────────────────────────────
        $transactions = Transactions::with(['company', 'client', 'user', 'latestHistory', 'histories.user'])
            ->whereHas('latestHistory', function ($q) use ($archivedStatusCodes) {
                $q->whereIn('nStatus', $archivedStatusCodes);
            })
            ->get()
            ->filter(function ($txn) use ($userId, $isProcTL, $procScopeStatuses, $draftCode) {
                // Find the history record just before the archive entry
                $preArchiveHistory = $txn->histories
                    ->sortByDesc('nTransactionHistoryId')
                    ->skip(1)
                    ->first();

                // Only include if pre-archive status was in procurement scope
                if (
                    !$preArchiveHistory
                    || !in_array((string) $preArchiveHistory->nStatus, array_map('strval', $procScopeStatuses))
                ) {
                    return false;
                }

                // Proc Officer: only their own transactions (creator at status 100)
                if (!$isProcTL) {
                    $createdHistory = $txn->histories
                        ->where('nStatus', $draftCode)
                        ->sortByDesc('nTransactionHistoryId')
                        ->first();

                    return $createdHistory && $createdHistory->nUserId == $userId;
                }

                // Proc TL: all in scope
                return true;
            })
            ->sortBy(function ($txn) {
                $now       = now()->timestamp;
                $dateField = $txn->dtDocSubmission;

                if ($dateField) {
                    $ts = strtotime($dateField);
                    return $ts < $now ? [0, $ts] : [1, $ts - $now];
                }

                return [2, PHP_INT_MAX];
            })
            ->values()
            ->map(function ($txn) use ($draftCode) {
                $latest = $txn->latestHistory;
                // ── ADD ───────────────────────────────────────────────────────────
                $preArchiveHistory = $txn->histories
                    ->sortByDesc('nTransactionHistoryId')
                    ->skip(1)
                    ->first();
                // The FIRST history row - the one the Activity Log marks "Start" -
                // is when the transaction was raised, and by whom.
                $createdHistory = $txn->histories->sortBy('dtOccur')->first();

                $createdBy = $createdHistory?->user
                    ? $createdHistory->user->strNickName
                    : null;

                $creatorId = $createdHistory?->nUserId;

                return [
                    'nTransactionId'         => $txn->nTransactionId,
                    'strCode'                => $txn->strCode,
                    'strTitle'               => $txn->strTitle,
                    'cItemType'              => $txn->cItemType,
                    'cProcMode'              => $txn->cProcMode,
                    'cProcSource'            => $txn->cProcSource,
                    'dTotalABC'              => $txn->dTotalABC,
                    'strRefNumber'           => $txn->strRefNumber,
                    'dtPreBid'               => $txn->dtPreBid,
                    'strPreBid_Venue'        => $txn->strPreBid_Venue,
                    'dtDocIssuance'          => $txn->dtDocIssuance,
                    'strDocIssuance_Venue'   => $txn->strDocIssuance_Venue,
                    'dtDocSubmission'        => $txn->dtDocSubmission,
                    'strDocSubmission_Venue' => $txn->strDocSubmission_Venue,
                    'dtDocOpening'           => $txn->dtDocOpening,
                    'strDocOpening_Venue'    => $txn->strDocOpening_Venue,
                    'dtDelivery'          => $txn->dtDelivery,
                    'strDeliveryPlace'       => $txn->strDeliveryPlace,
                    'company'                => $txn->company,
                    'client'                 => $txn->client,
                    'user'                   => $txn->user,
                    'current_status'         => $latest?->nStatus ?? null,
                    'previous_status' => $preArchiveHistory?->nStatus ?? null, // ← ADD
                    'latest_history'         => $latest,
                    'created_by'             => $createdBy,
                    'created_at'             => $createdHistory?->dtOccur,
                    'creator_id'             => $creatorId,
                ];
            });
        return $transactions;
    }

    /**
     * Finance Officer list (finance_status scope).
     */
    public function indexFinance(Request $request): Collection
    {
        $userId = (int) $request->query('nUserId');

        $financeCodes = array_keys(config('mappings.finance_status'));

        $transactions = Transactions::with(['company', 'client', 'user', 'latestHistory', 'histories.user'])
            ->whereHas('latestHistory', function ($q) use ($financeCodes) {
                $q->whereIn('nStatus', $financeCodes);
            })
            ->get()
            ->sortBy(function ($txn) {
                $now = now()->timestamp;
                $status = $txn->latestHistory?->nStatus;
                $useAODate = ($status >= 200 && $status <= 240);
                $dateField = $useAODate ? $txn->dtAODueDate : $txn->dtDocSubmission;
                if ($dateField) {
                    $ts = strtotime($dateField);
                    if ($ts < $now) {
                        return [0, $ts];
                    }
                    return [1, $ts - $now];
                }
                return [2, PHP_INT_MAX];
            })
            ->values()
            ->map(function ($txn) {
                $latest = $txn->latestHistory;
                $statusCodes = array_keys(config('mappings.status_transaction'));
                // The FIRST history row - the one the Activity Log marks "Start" -
                // is when the transaction was raised, and by whom.
                $createdHistory = $txn->histories->sortBy('dtOccur')->first();
                $createdBy = $createdHistory?->user
                    ? $createdHistory->user->strNickName
                    : null;

                return [
                    'nTransactionId'         => $txn->nTransactionId,
                    'strCode'                => $txn->strCode,
                    'strTitle'               => $txn->strTitle,
                    'cItemType'              => $txn->cItemType,
                    'cProcMode'              => $txn->cProcMode,
                    'cProcSource'            => $txn->cProcSource,
                    'nAssignedAO'            => $txn->nAssignedAO,
                    'dTotalABC'              => $txn->dTotalABC,
                    'dtDocSubmission'        => $txn->dtDocSubmission,
                    'dtAODueDate'            => $txn->dtAODueDate,
                    'company'                => $txn->company,
                    'client'                 => $txn->client,
                    'user'                   => $txn->user,
                    'current_status'         => $latest?->nStatus ?? null,
                    'latest_history'         => $latest,
                    'created_by'             => $createdBy,
                    'created_at'             => $createdHistory?->dtOccur,
                    'created_by_id'          => $createdHistory?->user?->nUserId ?? null,
                ];
            });
        return $transactions;
    }

}
