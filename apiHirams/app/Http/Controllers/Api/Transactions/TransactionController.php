<?php

namespace App\Http\Controllers\Api\Transactions;


use App\Http\Controllers\Api\ApiController;
use App\Models\ItemPricings;
use App\Models\PricingSet;
use App\Models\PurchaseOptions;
use App\Models\TransactionHistory;
use App\Models\TransactionItems;
use App\Models\Transactions;
use App\Models\User;
use Exception;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use App\Events\TransactionUpdated;
use App\Models\Jev;
use Illuminate\Support\Facades\DB;

class TransactionController extends ApiController
{
    /**
     * Get all transactions with relationships
     * Used by: Management
     *
     * Fetches ALL transactions regardless of status.
     * The frontend filters by status_code client-side using transaction_filter_content.
     */
    public function index(): JsonResponse
    {
        try {
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

            return response()->json([
                'message'      => __('messages.retrieve_success', ['name' => 'Transactions']),
                'transactions' => $transactions,
            ]);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Transactions');
        }
    }

    /**
     * Get transactions for procurement users (Procurement Officer & Procurement TL)
     *
     * proc_status comment rules (from mappings.php):
     *   '100' => Draft         — fetch where status=100 AND created_by == current user
     *   '110' => Finalized     — fetch where status=110 AND created_by == current user
     *   '115' => Verification  — fetch where status=110 AND created_by != current user  (virtual code, remapped here)
     *   '300' => Price Setting — fetch where status=300 AND created_by == current user
     *   '310' => Price Final.  — fetch where status=310 AND created_by == current user
     *   '315' => Price Verif.  — fetch where status=310 AND created_by != current user  (virtual code, remapped here)
     *   '320' => Price Approval— fetch where status=320 AND created_by == current user
     *
     * The virtual codes 115 and 315 are never stored in the DB.
     * We remap them on the fly so the frontend can distinguish "mine to verify" vs "others' to verify".
     */
    public function indexProcurement(Request $request): JsonResponse
    {
        try {
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

            return response()->json([
                'message'      => __('messages.retrieve_success', ['name' => 'Transaction']),
                'transactions' => $transactions->filter()->values(),
            ]);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Transaction');
        }
    }

    /**
     * Get transactions for account officers (AO & AOTL)
     *
     * ao_status comment rules (for regular Account Officer):
     *   '210' => Items Management  — fetch where status=210 AND nAssignedAO == current user
     *   '220' => Items Finalized   — fetch where status=220 AND nAssignedAO == current user
     *   '225' => Items Verification— fetch where status=220 AND nAssignedAO != current user  (virtual)
     *   '230' => For Canvas        — fetch where status=230 AND nAssignedAO == current user
     *   '240' => Canvas Finalized  — fetch where status=240 AND nAssignedAO == current user
     *   '245' => Canvas Verif.     — fetch where status=240 AND nAssignedAO != current user  (virtual)
     *
     * aotl_status comment rules (for AO Team Leader):
     *   '200' => For Assignment    — fetch ALL where status IN (200,210,220,225,230,240,245)
     *   '210' => Items Management  — fetch where status=210 AND nAssignedAO == current user
     *   '220' => Items Finalized   — fetch where status=220 AND nAssignedAO == current user
     *   '225' => Items Verification— fetch where status=220 AND nAssignedAO != current user  (virtual)
     *   '230' => For Canvas        — fetch where status=230 AND nAssignedAO == current user
     *   '240' => Canvas Finalized  — fetch where status=240 AND nAssignedAO == current user
     *   '245' => Canvas Verif.     — fetch where status=240 AND nAssignedAO != current user  (virtual)
     */
    public function indexAccountOfficer(Request $request): JsonResponse
    {
        try {
            $userId   = (int) $request->query('nUserId');
            $isAOTL   = (bool) $request->query('isAOTL', false);
            $fetchAll = (bool) $request->query('fetchAll', false);

            if (!$fetchAll && !$userId) {
                return response()->json([
                    'message' => __('messages.not_found', ['name' => 'User Id']),
                ], 400);
            }
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

            return response()->json([
                'message'      => __('messages.retrieve_success', ['name' => 'Transactions']),
                'transactions' => $transactions,
            ]);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Transactions');
        }
    }
    /**
     * Get all archived transactions
     * Used by: Management
     *
     * Fetches ALL archived transactions regardless of which workflow
     * they came from (Procurement or AO scope), mirroring index() but
     * for archived statuses only.
     */
    public function indexArchive(): JsonResponse
    {
        try {
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

            return response()->json([
                'message'      => __('messages.retrieve_success', ['name' => 'Transactions']),
                'transactions' => $transactions,
            ]);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Transactions');
        }
    }
    /**
     * Get archived transactions for Account Officers (AO & AOTL)
     *
     * AO:   only transactions where nAssignedAO == current user
     *       AND the status before archive was in AO workflow scope
     *       (200, 210, 220, 230, 240)
     *
     * AOTL: ALL archived transactions whose pre-archive status
     *       was in AO workflow scope — regardless of who archived them
     */
    public function indexAccountOfficerArchive(Request $request): JsonResponse
    {
        try {
            $userId      = (int) $request->query('nUserId');
            $isAOTL      = (bool) $request->query('isAOTL', false);
            $archivedStatusCodes = array_keys(config('mappings.archive_status'));

            if (!$userId) {
                return response()->json([
                    'message' => __('messages.not_found', ['name' => 'User Id']),
                ], 400);
            }

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

            return response()->json([
                'message'      => __('messages.retrieve_success', ['name' => 'Transactions']),
                'transactions' => $transactions,
            ]);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Transactions');
        }
    }

    /**
     * Get archived transactions for Procurement (Officer & TL)
     *
     * Proc Officer: only transactions where creator_id == current user
     *               AND the status before archive was in procurement scope
     *               (100, 110, 300, 310, 320, 330)
     *
     * Proc TL:      ALL archived transactions whose pre-archive status
     *               was in procurement scope — regardless of who archived them
     */
    public function indexProcurementArchive(Request $request): JsonResponse
    {
        try {
            $userId        = (int) $request->query('nUserId');
            $isProcTL      = (bool) $request->query('isProcTL', false);
            $procCodes     = array_keys(config('mappings.proc_status'));
            $archivedStatusCodes = array_keys(config('mappings.archive_status'));

            if (!$userId) {
                return response()->json([
                    'message' => __('messages.not_found', ['name' => 'User Id']),
                ], 400);
            }

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

            return response()->json([
                'message'      => __('messages.retrieve_success', ['name' => 'Transactions']),
                'transactions' => $transactions,
            ]);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Transactions');
        }
    }
    /**
     * Get transactions for Finance Officer.
     * Fetches transactions using financestatus scope.
     * Adjust the status codes / scoping logic below to match
     * whatever finance-specific rules your app needs (e.g. only
     * transactions that have reached voucher/payment stages).
     */
    public function indexFinance(Request $request): JsonResponse
    {
        try {
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

            return response()->json([
                'message'      => __('messages.retrieve_success', ['name' => 'Transactions']),
                'transactions' => $transactions,
            ]);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Transactions');
        }
    }
    /**
     * Create a new transaction
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'nCompanyId'             => 'required|integer',
                'nClientId'              => 'required|integer',
                'strTitle'               => 'required|string',
                'strRefNumber'           => 'nullable|string|max:255',
                'dTotalABC'              => 'nullable|numeric',
                'cProcMode'              => 'nullable|string|max:20',
                'cItemType'              => 'nullable|string|max:1',
                'strCode'                => 'nullable|string|max:30',
                'cProcSource'            => 'nullable|string|max:1',
                'dtPreBid'               => 'nullable|date',
                'strPreBid_Venue'        => 'nullable|string',
                'dtDocIssuance'          => 'nullable|date',
                'strDocIssuance_Venue'   => 'nullable|string',

                'dtDocSubmission'        => 'nullable|date',
                'strDocSubmission_Venue' => 'nullable|string',

                'dtDocOpening'           => 'nullable|date',
                'strDocOpening_Venue'    => 'nullable|string',

                'nUserId'                => 'required',

                'dtDelivery'             => 'nullable|date',
                'strDeliveryPlace'       => 'nullable|string',
            ]);

            $transaction = Transactions::create($validated);

            TransactionHistory::create([
                'nTransactionId' => $transaction->nTransactionId,
                'dtOccur'        => now(),
                'nStatus'        => '100',
                'nUserId'        => $validated['nUserId'],
                'strRemarks'     => null,
            ]);
            broadcast(new TransactionUpdated('created', $transaction->nTransactionId))->toOthers();
            return response()->json([
                'message'     => __('messages.store_success', ['name' => 'Transaction']),
                'transaction' => $transaction,
            ], 201);
        } catch (Exception $e) {
            return $this->handleException($e, 'store_failed', 'Transaction');
        }
    }

    /**
     * Update an existing transaction
     */
    public function update(Request $request, int $id): JsonResponse
    {
        try {
            $validated = $request->validate([
                'nCompanyId'             => 'required|integer',
                'nClientId'              => 'required|integer',
                'strTitle'               => 'required|string',
                'strRefNumber'           => 'nullable|string|max:255',
                'dTotalABC'              => 'nullable|numeric',
                'cProcMode'              => 'nullable|string|max:20',
                'cItemType'              => 'nullable|string|max:1',
                'strCode'                => 'nullable|string|max:30',
                'cProcSource'            => 'nullable|string|max:1',
                'dtPreBid'               => 'nullable|date',
                'strPreBid_Venue'        => 'nullable|string',
                'dtDocIssuance'          => 'nullable|date',
                'strDocIssuance_Venue'   => 'nullable|string',

                'dtDocSubmission'        => 'nullable|date',
                'strDocSubmission_Venue' => 'nullable|string',

                'dtDocOpening'           => 'nullable|date',
                'strDocOpening_Venue'    => 'nullable|string',

                'nUserId'                => 'required',

                'dtDelivery'             => 'nullable|date',
                'strDeliveryPlace'       => 'nullable|string',
            ]);

            $transaction = Transactions::findOrFail($id);
            $transaction->update($validated);
            broadcast(new TransactionUpdated('updated', $transaction->nTransactionId))->toOthers();
            return response()->json([
                'message'     => __('messages.update_success', ['name' => 'Transaction']),
                'transaction' => $transaction,
            ]);
        } catch (Exception $e) {
            return $this->handleException($e, 'update_failed', 'Transaction');
        }
    }

    /**
     * Show a specific transaction (not implemented)
     */
    public function show(): void {}

    /**
     * Delete a transaction
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $transaction = Transactions::findOrFail($id);

            $hasItems = TransactionItems::where('nTransactionId', $transaction->nTransactionId)->exists();
            $hasPricingSets = PricingSet::where('nTransactionId', $transaction->nTransactionId)->exists();

            $hasItemPricings = ItemPricings::whereHas('transactionItem', fn($q) => $q->where('nTransactionId', $transaction->nTransactionId))
                ->orWhereHas('pricingSet', fn($q) => $q->where('nTransactionId', $transaction->nTransactionId))
                ->exists();

            $hasPurchaseOptions = PurchaseOptions::whereHas('transactionItem', fn($q) => $q->where('nTransactionId', $transaction->nTransactionId))
                ->exists();

            if ($hasItems || $hasPricingSets || $hasItemPricings || $hasPurchaseOptions) {
                return response()->json([
                    'message' => __('messages.delete_blocked', ['name' => 'Transaction']),
                    'warning' => 'Cannot delete this transaction because it still has linked items, pricing sets, or purchase options.',
                ], 409);
            }

            $transaction->delete();
            broadcast(new TransactionUpdated('deleted', $id))->toOthers();
            return response()->json([
                'message'       => __('messages.delete_success', ['name' => 'Transaction']),
                'transactionId' => $id,
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => __('messages.not_found', ['name' => 'Transaction']),
                'error'   => $e->getMessage(),
            ], 404);
        } catch (Exception $e) {
            return $this->handleException($e, 'delete_failed', 'Transaction');
        }
    }

    /**
     * Revert transaction to previous status
     * Supports optional `revert_to_status` for Management role (jump to any earlier status).
     */
    public function revert(Request $request, int $id): JsonResponse
    {
        try {
            $transaction   = Transactions::findOrFail($id);
            $latestHistory = $transaction->histories()->latest('dtOccur')->first();

            if (!$latestHistory) {
                return response()->json([
                    'message' => __('messages.not_found', ['name' => 'Transaction']),
                ], 404);
            }

            $currentStatus = $latestHistory->nStatus;
            $statusFlow    = config('mappings.status_transaction');
            $codes         = array_keys($statusFlow);
            $currentIndex  = array_search((string) $currentStatus, $codes);

            if ($currentIndex === false || $currentIndex === 0) {
                return response()->json([
                    'message' => __('messages.revert_blocked'),
                ], 400);
            }

            // ── Remap virtual codes to their real DB equivalents ──────────────
            $virtualToReal = [
                '115' => '110',
                '315' => '310',
                '225' => '220',
                '245' => '240',
            ];

            $requestedStatus = $request->input('revert_to_status');

            if ($requestedStatus !== null) {
                $requestedStatus = $virtualToReal[(string) $requestedStatus] ?? (string) $requestedStatus;
                $requestedIndex  = array_search($requestedStatus, $codes);

                if ($requestedIndex === false || $requestedIndex >= $currentIndex) {
                    return response()->json([
                        'message' => 'Invalid revert_to_status: must be a status that comes before the current one.',
                    ], 400);
                }

                $targetStatus = $requestedStatus;
            } else {
                $targetStatus = $codes[$currentIndex - 1];
            }

            // ── Find the user who last held the target status ─────────────────
            $previousHistory = $transaction->histories()
                ->where('nStatus', $targetStatus)
                ->latest('dtOccur')
                ->first();

            $previousUserId = $previousHistory?->nUserId;

            // ── Insert new history record ─────────────────────────────────────
            TransactionHistory::create([
                'nTransactionId' => $id,
                'nUserId'        => $previousUserId ?? Auth::id(),
                'nStatus'        => $targetStatus,
                'strRemarks'     => $request->input('remarks'),
                'dtOccur'        => now(),
            ]);

            // ── Clear AO assignment if reverting to or past status 200 ────────
            if ((int) $targetStatus <= 200) {
                $transaction->nAssignedAO = null;
                $transaction->dtAODueDate = null;
            }
            $transaction->save();

            broadcast(new TransactionUpdated('reverted', $id))->toOthers();

            return response()->json([
                'message'               => __('messages.update_success', ['name' => 'Transaction Reverted']),
                'transaction'           => $transaction,
                'new_status'            => $targetStatus,
                'previous_status'       => $targetStatus,
                'previous_status_label' => $statusFlow[$targetStatus] ?? $targetStatus,
                'previous_user_id'      => $previousUserId,
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Transaction not found.',
                'error'   => $e->getMessage(),
            ], 404);
        } catch (Exception $e) {
            return $this->handleException($e, 'update_failed', 'Revert Transaction');
        }
    }
    /**
     * Get transaction history
     */
    public function getHistory(int $id): JsonResponse
    {
        try {
            $history = TransactionHistory::where('nTransactionId', $id)
                ->with('user')
                ->orderBy('dtOccur', 'desc')
                ->get()
                ->map(fn($item) => [
                    'dtOccur'    => $item->dtOccur,
                    'nStatus'    => $item->nStatus,
                    'nUserId'    => $item->user ? $item->user->strNickName : 'System',
                    'nRawUserId' => $item->nUserId, // ← add this
                    'strRemarks' => $item->strRemarks,
                ]);

            return response()->json([
                'message' => __('messages.retrieve_success', ['name' => 'Transaction History']),
                'history' => $history,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'message' => __('messages.retrieve_failed', ['name' => 'Transaction History']),
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get pricing modal data
     */
    public function getPricingModalData(int $id): JsonResponse
    {
        try {
            $transaction = Transactions::with([
                'transactionItems.itemPricings.pricingSet',
                'transactionItems.purchaseOptions',
            ])->findOrFail($id);

            $transactionTotalABC = $transaction->dTotalABC ?? 0;
            $itemsWithABC        = $transaction->transactionItems->filter(fn($i) => $i->dUnitABC !== null);
            $itemsWithoutABC     = $transaction->transactionItems->filter(fn($i) => $i->dUnitABC === null);
            $sumSetABC           = $itemsWithABC->sum('dUnitABC');
            $remainingABC        = max($transactionTotalABC - $sumSetABC, 0);
            $countUnset          = $itemsWithoutABC->count();
            $abcPerUnset         = $countUnset ? $remainingABC / $countUnset : 0;

            $pricingData = [
                'transactionName' => $transaction->strTitle,
                'transactionId'   => $transaction->strCode,
                'totalABC'        => $transactionTotalABC,
                'items'           => $transaction->transactionItems->map(function ($item) use ($abcPerUnset) {
                    $firstPricing  = $item->itemPricings->first();
                    $purchasePrice = $item->purchaseOptions
                        ->where('bIncluded', 1)
                        ->sortBy('dUnitPrice')
                        ->first()?->dUnitPrice ?? 0;

                    return [
                        'id'            => $item->nTransactionItemId,
                        'name'          => $item->strName,
                        'qty'           => $item->nQuantity,
                        'purchasePrice' => $purchasePrice,
                        'sellingPrice'  => $firstPricing?->dUnitSellingPrice ?? 0,
                        'abc'           => $item->dUnitABC ?? $abcPerUnset,
                        'pricingSet'    => $firstPricing?->pricingSet?->strName ?? null,
                        'purchaseOptions' => $item->purchaseOptions->map(fn($option) => [
                            'id'         => $option->nPurchaseItemId,
                            'supplierId' => $option->nSupplierId,
                            'qty'        => $option->nQuantity,
                            'unitPrice'  => $option->dUnitPrice,
                            'uom'        => $option->strUOM,
                            'brand'      => $option->strBrand,
                            'model'      => $option->strModel,
                            'included'   => (bool) $option->bIncluded,
                        ]),
                    ];
                }),
            ];

            return response()->json([
                'message'     => __('messages.retrieve_success', ['name' => 'Pricing data']),
                'transaction' => $pricingData,
            ]);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'Pricing data');
        }
    }

    /**
     * Assign Account Officer to transaction
     */
    /**
     * Assign Account Officer to transaction
     */
    public function assignAO(Request $request, int $id): JsonResponse
    {
        try {
            $validated = $request->validate([
                'nAssignedAO' => 'required|integer|exists:tblusers,nUserId',
                'dtAODueDate' => 'nullable|date',
                'user_id'     => 'required|integer|exists:tblusers,nUserId',
                'remarks'     => 'nullable|string|max:255',
            ]);

            $transaction = Transactions::findOrFail($id);

            $isReassign = !is_null($transaction->nAssignedAO);

            // The status the transaction moves to:
            //   • FIRST assignment (no AO on it yet) → Items Management: the
            //     new officer starts the items work from scratch.
            //   • REASSIGNMENT (an AO is already on it) → the status it is
            //     ALREADY on: only the officer changes, the work does not
            //     start over — so the history records the same status.
            // The Items Management code comes from the one mapping every
            // transaction status is keyed by (position 3 of the flow:
            // 100 Draft · 110 Verification · 200 Assign · 210 Items Mgmt).
            $statusCodes      = array_keys(config('mappings.status_transaction'));
            $itemsMgmtStatus  = $statusCodes[3] ?? '210';
            $currentStatus    = $transaction->latestHistory?->nStatus ?? $itemsMgmtStatus;
            $newStatus        = $isReassign ? $currentStatus : $itemsMgmtStatus;
            $assignedUser     = User::find($validated['nAssignedAO']);
            $assignedFullName = $assignedUser
                ? $assignedUser->strFName . ' ' . $assignedUser->strLName
                : 'Unknown';

            $action  = $isReassign ? 'Reassigned' : 'Assigned';
            $remarks = $validated['remarks'] ?? "{$action} Transaction to {$assignedFullName}";

            $transaction->update([
                'nAssignedAO' => $validated['nAssignedAO'],
                'dtAODueDate' => $validated['dtAODueDate'] ?? null,
            ]);

            TransactionHistory::create([
                'nTransactionId' => $transaction->nTransactionId,
                'dtOccur'        => now(),
                'nStatus'        => $newStatus, // Items Management on a first assign; the status it was already on when the AO is only swapped
                'nUserId'        => $validated['user_id'],
                'strRemarks'     => $remarks,
            ]);

            broadcast(new TransactionUpdated('assigned', $id))->toOthers();

            return response()->json([
                'message'     => __('messages.update_success', ['name' => "{$action} Account Officer"]),
                'transaction' => $transaction,
                'status'      => $newStatus,
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors'  => $e->errors(),
            ], 422);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => __('messages.not_found', ['name' => 'Transaction']),
            ], 404);
        } catch (Exception $e) {
            return $this->handleException($e, 'update_failed', 'Assign AO');
        }
    }
    /**
     * UPDATED assignProcurement() method
     * 
     * Changes:
     * 1. Updates all history records with status code '100' (Draft) to assign the new user as creator
     * 2. Inserts a new transaction history record maintaining the current status code
     * 3. Creates an audit trail for procurement officer reassignment
     */

    public function assignProcurement(Request $request, int $id): JsonResponse
    {
        try {
            $validated = $request->validate([
                'user_id' => 'required|integer|exists:tblusers,nUserId',
                'remarks' => 'nullable|string|max:255',
            ]);

            $transaction = Transactions::findOrFail($id);
            $procCodes   = array_keys(config('mappings.proc_status'));
            $firstStatus = $procCodes[0]; // '100'

            // 🔹 Get latest status (DO NOT override this)
            $currentHistory = $transaction->histories()
                ->latest('dtOccur')
                ->first();

            $currentStatus = $currentHistory?->nStatus ?? $firstStatus;

            // 🔹 Get current creator (status 100)
            $creatorHistory = $transaction->histories()
                ->where('nStatus', $firstStatus)
                ->latest('dtOccur')
                ->first();

            // 🔹 If same user, no action needed
            if ($creatorHistory && $creatorHistory->nUserId == $validated['user_id']) {
                return response()->json([], 200);
            }

            // 🔹 Resolve names for the remarks
            $fromUser = $creatorHistory?->nUserId
                ? User::find($creatorHistory->nUserId)
                : null;
            $toUser   = User::find($validated['user_id']);

            $fromName = $fromUser?->strNickName ?? $fromUser?->strFName ?? 'Unknown';
            $toName   = $toUser?->strNickName   ?? $toUser?->strFName   ?? 'Unknown';

            $remarks = $validated['remarks'] ?? "{$fromName} assigned to {$toName}";

            // ✅ STEP 1: Update ownership (all status 100 records → new user)
            $transaction->histories()
                ->where('nStatus', $firstStatus)
                ->update(['nUserId' => $validated['user_id']]);

            // ✅ STEP 2a: Insert ownership trail at status 100 SECOND (so it's not the latest)
            // ✅ STEP 2b: Insert current workflow status LAST so it becomes the latest
            TransactionHistory::create([
                'nTransactionId' => $transaction->nTransactionId,
                'dtOccur'        => now(),
                'nStatus'        => $firstStatus, // '100'
                'nUserId'        => $validated['user_id'],
                'strRemarks'     => $remarks,
            ]);

            sleep(1);

            TransactionHistory::create([
                'nTransactionId' => $transaction->nTransactionId,
                'dtOccur'        => now(),
                'nStatus'        => $currentStatus, // '300' — this must be LAST
                'nUserId'        => $validated['user_id'],
                'strRemarks'     => $remarks,
            ]);

            broadcast(new TransactionUpdated('assigned_procurement', $id))->toOthers();

            return response()->json([
                'message'     => __('messages.update_success', ['name' => 'Assigned to Procurement']),
                'transaction' => $transaction,
                'status'      => $currentStatus,
                'assigned_to' => $validated['user_id'],
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors'  => $e->errors(),
            ], 422);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => __('messages.not_found', ['name' => 'Transaction']),
            ], 404);
        } catch (Exception $e) {
            return $this->handleException($e, 'update_failed', 'Assign Procurement');
        }
    }
    /**
     * Finalize transaction (Procurement)
     */
    public function finalizetransaction(Request $request, int $id): JsonResponse
    {
        return $this->changeTransactionStatus(
            $id,
            $request->input('userId'),
            $this->resolveNextStatus($request, $id, '110'),
            'Transaction Finalized',
            $request->input('remarks')
        );
    }
    /**
     * Verify transaction (Procurement)
     */
    public function verifytransaction(Request $request, int $id): JsonResponse
    {
        return $this->changeTransactionStatus($id, $request->input('userId'), '200', 'Transaction Verified', $request->input('remarks'));
    }

    /**
     * Finalize transaction (Account Officer)
     */
    public function finalizetransactionAO(Request $request, int $id): JsonResponse
    {
        return $this->changeTransactionStatus($id, $request->input('userId'), '220', 'Transaction Finalized (AO)', $request->input('remarks'));
    }

    /**
     * Verify transaction (Account Officer)
     */
    public function verifytransactionAO(Request $request, int $id): JsonResponse
    {
        return $this->changeTransactionStatus($id, $request->input('userId'), '230', 'Transaction Verified (AO)', $request->input('remarks'));
    }

    /**
     * Finalize transaction pricing (Procurement)
     */
    public function finalizeTransactionPricing(Request $request, int $id): JsonResponse
    {
        return $this->changeTransactionStatus(
            $id,
            $request->input('userId'),
            $this->resolveNextStatus($request, $id, '310'),
            'Transaction Pricing Finalized',
            $request->input('remarks')
        );
    }
    /**
     * Verify transaction pricing (Procurement)
     */
    public function verifyTransactionPricing(Request $request, int $id): JsonResponse
    {
        return $this->changeTransactionStatus($id, $request->input('userId'), '320', 'Transaction Pricing Verified', $request->input('remarks'));
    }

    /**
     * Finalize transaction canvas (Account Officer)
     */
    public function finalizetransactionAOC(Request $request, int $id): JsonResponse
    {
        return $this->changeTransactionStatus($id, $request->input('userId'), '240', 'Transaction Finalized (AO)', $request->input('remarks'));
    }

    /**
     * Verify transaction canvas (Account Officer)
     */
    public function verifytransactionAOC(Request $request, int $id): JsonResponse
    {
        return $this->changeTransactionStatus($id, $request->input('userId'), '300', 'Transaction Verified (AO)', $request->input('remarks'));
    }
    /**
     * Move transaction to "For Collection" status.
     * Transitions from For Purchase (340) → For Collection (350).
     */
    public function forCollection(Request $request, int $id): JsonResponse
    {
        $nextStatus = $request->input('next_status');

        if (!$nextStatus) {
            return response()->json([
                'message' => 'next_status is required for for-collection.',
            ], 400);
        }

        return $this->changeTransactionStatus(
            $id,
            $request->input('userId'),
            $nextStatus,
            'Transaction Moved to For Collection',
            $request->input('remarks')
        );
    }
    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------
    /**
     * Use the client-supplied next_status only if it's a real status that
     * comes AFTER the transaction's current one; otherwise use the default.
     */
    private function resolveNextStatus(Request $request, int $id, string $default): string
    {
        $requested = $request->input('next_status');
        if (!$requested) {
            return $default;
        }

        $codes = array_map('strval', array_keys(config('mappings.status_transaction')));

        // virtual codes are never stored
        $virtual = ['115', '315', '225', '245'];
        $requested = (string) $requested;
        if (in_array($requested, $virtual, true) || !in_array($requested, $codes, true)) {
            return $default;
        }

        $latest = TransactionHistory::where('nTransactionId', $id)
            ->orderBy('dtOccur', 'desc')
            ->orderBy('nTransactionHistoryId', 'desc')
            ->first();

        $currentIdx = array_search((string) $latest?->nStatus, $codes, true);
        $nextIdx    = array_search($requested, $codes, true);

        return ($currentIdx !== false && $nextIdx > $currentIdx) ? $requested : $default;
    }
    private function changeTransactionStatus(int $id, ?int $userId, string $newStatus, string $actionName, ?string $remarks = null): JsonResponse
    {
        try {
            if (!$userId) {
                return response()->json([
                    'message' => __('messages.not_found', ['name' => 'User Id']),
                ], 400);
            }

            $transaction = Transactions::findOrFail($id);

            TransactionHistory::create([
                'nTransactionId' => $id,
                'nUserId'        => $userId,
                'nStatus'        => $newStatus,
                'strRemarks'     => $remarks,
                'dtOccur'        => now(),
            ]);

            Log::info("Transaction status changed", [
                'transaction_id' => $id,
                'user_id'        => $userId,
                'new_status'     => $newStatus,
            ]);
            broadcast(new TransactionUpdated('status_changed', $id, [
                'new_status' => $newStatus,
            ]))->toOthers();
            return response()->json([
                'message'     => __('messages.update_success', ['name' => $actionName]),
                'transaction' => $transaction,
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Transaction not found.',
                'error'   => $e->getMessage(),
            ], 404);
        } catch (Exception $e) {
            return $this->handleException($e, 'update_failed', $actionName);
        }
    }
    /**
     * Force Finalize transaction (Management - non-owner)
     * Callable when current user is NOT the creator of the transaction.
     * Moves status: 100 (Draft) or 300 (Price Setting) → next status.
     * The next_status is determined by the frontend and passed in the request.
     */
    public function forceFinalizeManagement(Request $request, int $id): JsonResponse
    {
        $nextStatus = $request->input('next_status');

        if (!$nextStatus) {
            return response()->json([
                'message' => 'next_status is required for force finalize.',
            ], 400);
        }

        return $this->changeTransactionStatus(
            $id,
            $request->input('userId'),
            $nextStatus,
            'Transaction Force Finalized (Management)',
            $request->input('remarks')
        );
    }
    /**
     * Approve transaction pricing (Management)
     */
    /**
     * Approve transaction pricing (Management)
     * On Win: also updates dtDelivery and strDeliveryPlace on the transaction.
     *
     * Replace the existing approveTransactionPricing() in TransactionController.php
     */
    public function approveTransactionPricing(Request $request, int $id): JsonResponse
    {
        $nextStatus = $request->input('next_status');

        if (!$nextStatus) {
            return response()->json([
                'message' => 'next_status is required for approve pricing.',
            ], 400);
        }

        // ── Persist delivery details if provided (Win path) ───────────────────
        try {
            $transaction = Transactions::findOrFail($id);

            $deliveryData = array_filter([
                'dtDelivery'      => $request->input('dtDelivery'),
                'strDeliveryPlace' => $request->input('strDeliveryPlace'),
            ], fn($v) => !is_null($v));

            if (!empty($deliveryData)) {
                $transaction->update($deliveryData);
            }
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => __('messages.not_found', ['name' => 'Transaction']),
            ], 404);
        }

        return $this->changeTransactionStatus(
            $id,
            $request->input('userId'),
            $nextStatus,
            'Transaction Pricing Approved',
            $request->input('remarks')
        );
    }
    /**
     * Archive a transaction
     * Inserts a new history record with the archive status code.
     */
    public function archive(Request $request, int $id): JsonResponse
    {
        try {
            $validated = $request->validate([
                'user_id'     => 'required|integer|exists:tblusers,nUserId',
                'remarks'     => 'nullable|string|max:255',
                'status_code' => 'nullable|string|max:10', // ← ADD: allows "Lost" override
            ]);

            $transaction = Transactions::findOrFail($id);

            $archiveCodes = array_keys(config('mappings.archive_status'));

            // Use explicit code if provided (e.g. Lost = index 1), else default to Archived (index 0)
            $archiveCode = $validated['status_code'] ?? $archiveCodes[0];

            TransactionHistory::create([
                'nTransactionId' => $id,
                'nUserId'        => $validated['user_id'],
                'nStatus'        => $archiveCode,
                'strRemarks'     => $validated['remarks'] ?? 'Transaction archived.',
                'dtOccur'        => now(),
            ]);

            broadcast(new TransactionUpdated('status_changed', $id, [
                'new_status' => $archiveCode,
            ]))->toOthers();

            return response()->json([
                'message'    => __('messages.update_success', ['name' => 'Transaction Archived']),
                'new_status' => $archiveCode,
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => __('messages.not_found', ['name' => 'Transaction']),
            ], 404);
        } catch (Exception $e) {
            return $this->handleException($e, 'update_failed', 'Archive Transaction');
        }
    }
    /**
     * Unarchive a transaction
     * Finds the second-to-latest history record (the status before archive)
     * and inserts a new history record with that previous status.
     */
    public function unarchive(Request $request, int $id): JsonResponse
    {
        try {
            $validated = $request->validate([
                'user_id' => 'required|integer|exists:tblusers,nUserId',
                'remarks' => 'nullable|string|max:255',
            ]);

            $transaction = Transactions::findOrFail($id);

            // Get the last two history records ordered by most recent first
            $recentHistories = $transaction->histories()
                ->orderBy('dtOccur', 'desc')
                ->orderBy('nTransactionHistoryId', 'desc')
                ->take(2)
                ->get();

            if ($recentHistories->count() < 2) {
                return response()->json([
                    'message' => 'No previous status found to restore.',
                ], 400);
            }

            // The second record is the status before the archive
            $previousStatus   = $recentHistories[1]->nStatus;
            $previousUserId   = $recentHistories[1]->nUserId;

            TransactionHistory::create([
                'nTransactionId' => $id,
                'nUserId'        => $previousUserId ?? $validated['user_id'],
                'nStatus'        => $previousStatus,
                'strRemarks'     => $validated['remarks'] ?? 'Transaction unarchived.',
                'dtOccur'        => now(),
            ]);

            broadcast(new TransactionUpdated('status_changed', $id, [
                'new_status' => $previousStatus,
            ]))->toOthers();

            return response()->json([
                'message'         => __('messages.update_success', ['name' => 'Transaction Unarchived']),
                'new_status'      => $previousStatus,
                'previous_user'   => $previousUserId,
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => __('messages.not_found', ['name' => 'Transaction']),
            ], 404);
        } catch (Exception $e) {
            return $this->handleException($e, 'update_failed', 'Unarchive Transaction');
        }
    }
    public function completed(Request $request, int $id): JsonResponse
    {
        try {
            $validated = $request->validate([
                'user_id'     => 'required|integer|exists:tblusers,nUserId',
                'remarks'     => 'nullable|string|max:255',
                'status_code' => 'nullable|string|max:10', // ← ADD: allows "Lost" override
            ]);

            $transaction = Transactions::findOrFail($id);

            $archiveCodes = array_keys(config('mappings.archive_status'));

            // Use explicit code if provided (e.g. Lost = index 1), else default to Archived (index 0)
            $archiveCode = $validated['status_code'] ?? $archiveCodes[2];

            TransactionHistory::create([
                'nTransactionId' => $id,
                'nUserId'        => $validated['user_id'],
                'nStatus'        => $archiveCode,
                'strRemarks'     => $validated['remarks'] ?? 'Transaction Completed.',
                'dtOccur'        => now(),
            ]);

            broadcast(new TransactionUpdated('status_changed', $id, [
                'new_status' => $archiveCode,
            ]))->toOthers();

            return response()->json([
                'message'    => __('messages.update_success', ['name' => 'Transaction Completed']),
                'new_status' => $archiveCode,
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => __('messages.not_found', ['name' => 'Transaction']),
            ], 404);
        } catch (Exception $e) {
            return $this->handleException($e, 'update_failed', 'Archive Transaction');
        }
    }
    public function getJev(int $id): JsonResponse
    {
        try {
            $txn = Transactions::findOrFail($id);
            if (!$txn->nJEVId) {
                return response()->json(['jev' => null]);
            }
            $jev = Jev::with('entries.journal_account.parent')->find($txn->nJEVId);
            return response()->json(['jev' => $jev]);
        } catch (Exception $e) {
            return $this->handleException($e, 'retrieve_failed', 'JEV');
        }
    }

    public function createJev(int $id): JsonResponse
    {
        try {
            $jev = DB::transaction(function () use ($id) {
                $txn = Transactions::lockForUpdate()->findOrFail($id);

                // already has one? return it, never create a second
                if ($txn->nJEVId) {
                    return Jev::with('entries.journal_account.parent')->find($txn->nJEVId);
                }

                $new = Jev::create([
                    'strJEVNumber' => Jev::generateNumber(),   // ← add
                    'cJEVLinkType' => 'C',
                    'dtOccur'      => now(),
                    'cStatus'      => 'P',
                ]);

                $txn->nJEVId = $new->nJEVId;
                $txn->save();

                return Jev::with('entries.journal_account.parent')->find($new->nJEVId);
            });

            return response()->json(['jev' => $jev], 201);
        } catch (Exception $e) {
            return $this->handleException($e, 'store_failed', 'JEV');
        }
    }
}
