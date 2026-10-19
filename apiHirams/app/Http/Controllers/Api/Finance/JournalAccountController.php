<?php

namespace App\Http\Controllers\Api\Finance;

use App\Http\Controllers\Api\ApiController;
use App\Http\Requests\JournalAccount\MoveJournalAccountRequest;
use App\Http\Requests\JournalAccount\StoreJournalAccountRequest;
use App\Http\Requests\JournalAccount\UnlinkedRecordsJournalAccountRequest;
use App\Http\Requests\JournalAccount\UpdateJournalAccountRequest;
use App\Models\JournalAccount;
use App\Services\Finance\JournalAccountService;
use Illuminate\Http\Request;

class JournalAccountController extends ApiController
{
    public function __construct(private readonly JournalAccountService $service)
    {
    }

    public function index(Request $request)
    {
        return response()->json($this->service->index($request));
    }

    /**
     * POST /journal-accounts
     */
    public function store(StoreJournalAccountRequest $request)
    {
        // store
        if ($error = $this->service->checkRecordLink($request)) return response()->json(['message' => $error], 422);

        return response()->json($this->service->store($request), 201);
    }
    /**
     * PUT/PATCH /journal-accounts/{journalAccount}
     */
    public function update(UpdateJournalAccountRequest $request, JournalAccount $journalAccount)
    {
        if ($request->filled('nParentAccountId')) {
            $newParentId = (int) $request->nParentAccountId;

            if ($newParentId === (int) $journalAccount->nJournalAccountId) {
                return response()->json(['message' => 'An account cannot be its own parent.'], 422);
            }

            $descendantIds = $this->service->getDescendantIds((int) $journalAccount->nJournalAccountId);
            if (in_array($newParentId, $descendantIds, true)) {
                return response()->json([
                    'message' => 'Cannot link to one of its own linked accounts — this would create a loop.',
                ], 422);
            }
        }

        // update (after the existing loop checks)
        if ($error = $this->service->checkRecordLink($request, (int) $journalAccount->nJournalAccountId)) return response()->json(['message' => $error], 422);

        return response()->json($this->service->update($request, $journalAccount));
    }
    /**
     * GET /journal-accounts/{journalAccount}
     */
    public function show(JournalAccount $journalAccount)
    {
        return response()->json($this->service->show($journalAccount));
    }

    /**
     * DELETE /journal-accounts/{journalAccount}
     */
    public function destroy(JournalAccount $journalAccount)
    {
        $id = $journalAccount->nJournalAccountId;

        if ($this->service->hasChildren($id)) {
            return response()->json([
                'message' => 'Cannot delete an account that has linked accounts. Move or delete them first.',
            ], 422);
        }

        // An account that still carries LIVE journal (JEV) entries is part
        // of the books — deleting it would orphan those lines. Lines of a
        // CANCELLED JEV never block: destroy() deletes them WITH the account.
        if ($this->service->hasJournalEntries($id)) {
            return response()->json([
                'message' => 'Cannot delete an account that has journal entries. Remove or reassign its entries first, or cancel their JEVs.',
            ], 422);
        }

        $this->service->destroy($journalAccount);
        return response()->json(['message' => 'Journal account deleted successfully.']);
    }
    /**
     * GET /journal-accounts/{journalAccount}/available-clients-for-import
     * Returns active clients that don't already have a "Collectibles from {nickname}"
     * child account under this journal account.
     */
    // public function availableClientsForImport(JournalAccount $journalAccount)
    // {
    //     $existingClientIds = JournalAccount::where('nParentAccountId', $journalAccount->nJournalAccountId)
    //         ->where('cAccountType', 'C')
    //         ->whereNotNull('nRecordId')
    //         ->pluck('nRecordId')
    //         ->toArray();
    //     $statusCodes = array_keys(config('mappings.status_client'));

    //     $clients = Client::where('cStatus', $statusCodes[0])
    //         ->whereNotIn('nClientId', $existingClientIds)
    //         ->orderBy('strClientName')
    //         ->get();

    //     return response()->json($clients);
    // }

    /**
     * POST /journal-accounts/{journalAccount}/flash-import-clients
     * Bulk-creates child journal accounts, one per selected active client, named
     * "Collectibles from {strClientNickName}".
     */
    // public function flashImportClients(Request $request, JournalAccount $journalAccount)
    // {
    //     if ($journalAccount->cAccountType !== 'C') {
    //         return response()->json(['message' => 'This account does not accept client imports.'], 422);
    //     }

    //     $request->validate([
    //         'clientIds'   => 'required|array|min:1',
    //         'clientIds.*' => 'integer|exists:tblclients,nClientId',
    //     ]);

    //     $statusCodes = array_keys(config('mappings.status_client'));

    //     $clients = Client::whereIn('nClientId', $request->clientIds)
    //         ->where('cStatus', $statusCodes[0])
    //         ->get();
    //     $existingClientIds = JournalAccount::where('nParentAccountId', $journalAccount->nJournalAccountId)
    //         ->where('cAccountType', 'C')
    //         ->whereNotNull('nRecordId')
    //         ->pluck('nRecordId')
    //         ->toArray();
    //     $created = [];

    //     foreach ($clients as $client) {
    //         if (in_array($client->nClientId, $existingClientIds, true)) {
    //             continue; // already imported, skip defensively
    //         }

    //         $created[] = JournalAccount::create([
    //             'strAccountName'   => null,
    //             'nParentAccountId' => $journalAccount->nJournalAccountId,
    //             'nRecordId'        => $client->nClientId,
    //             'cAccountType'     => 'C',
    //         ]);

    //         $existingClientIds[] = $client->nClientId;
    //     }

    //     return response()->json([
    //         'message' => count($created) . ' journal account(s) imported successfully.',
    //         'created' => $created,
    //     ], 201);
    // }
    /**
     * GET /journal-accounts/{journalAccount}/available-suppliers-for-import
     * Returns active suppliers that don't already have a "Purchases from {nickname}"
     * child account under this journal account.
     */
    // public function availableSuppliersForImport(JournalAccount $journalAccount)
    // {
    //     $existingSupplierIds = JournalAccount::where('nParentAccountId', $journalAccount->nJournalAccountId)
    //         ->where('cAccountType', 'S')
    //         ->whereNotNull('nRecordId')
    //         ->pluck('nRecordId')
    //         ->toArray();

    //     $statusCodes = array_keys(config('mappings.status_user'));

    //     $suppliers = Supplier::where('cStatus', $statusCodes[0])
    //         ->whereNotIn('nSupplierId', $existingSupplierIds)
    //         ->orderBy('strSupplierName')
    //         ->get();

    //     return response()->json($suppliers);
    // }

    /**
     * POST /journal-accounts/{journalAccount}/flash-import-suppliers
     * Bulk-creates child journal accounts, one per selected supplier, named
     * "Receivables from {strSupplierNickName}".
     */
    // public function flashImportSuppliers(Request $request, JournalAccount $journalAccount)
    // {
    //     if ($journalAccount->cAccountType !== 'S') {
    //         return response()->json(['message' => 'This account does not accept supplier imports.'], 422);
    //     }

    //     $request->validate([
    //         'supplierIds'   => 'required|array|min:1',
    //         'supplierIds.*' => 'integer|exists:tblsuppliers,nSupplierId',
    //     ]);

    //     $suppliers = Supplier::whereIn('nSupplierId', $request->supplierIds)->get();
    //     $existingSupplierIds = JournalAccount::where('nParentAccountId', $journalAccount->nJournalAccountId)
    //         ->where('cAccountType', 'S')
    //         ->whereNotNull('nRecordId')
    //         ->pluck('nRecordId')
    //         ->toArray();
    //     $created = [];

    //     foreach ($suppliers as $supplier) {
    //         if (in_array($supplier->nSupplierId, $existingSupplierIds, true)) {
    //             continue; // already imported, skip defensively
    //         }

    //         $created[] = JournalAccount::create([
    //             'strAccountName'   => null,
    //             'nParentAccountId' => $journalAccount->nJournalAccountId,
    //             'nRecordId'        => $supplier->nSupplierId,
    //             'cAccountType'     => 'S',
    //         ]);
    //         $existingSupplierIds[] = $supplier->nSupplierId;
    //     }
    //     return response()->json([
    //         'message' => count($created) . ' journal account(s) imported successfully.',
    //         'created' => $created,
    //     ], 201);
    // }
    /**
     * PATCH /journal-accounts/{journalAccount}/move
     * Links an account under a new parent. Nothing else is changed.
     */
    public function move(MoveJournalAccountRequest $request, JournalAccount $journalAccount)
    {
        $newParentId = (int) $request->nParentAccountId;
        $id = (int) $journalAccount->nJournalAccountId;

        if ($newParentId === $id) {
            return response()->json(['message' => 'An account cannot be its own parent.'], 422);
        }

        if (in_array($newParentId, $this->service->getDescendantIds($id), true)) {
            return response()->json([
                'message' => 'Cannot link to one of its own linked accounts — this would create a loop.',
            ], 422);
        }

        return response()->json($this->service->move($journalAccount, $newParentId));
    }
    /**
     * GET /journal-accounts/unlinked-records?type=C|S&includeAccountId=
     * Clients (C) or suppliers (S) not yet linked to a journal account.
     * includeAccountId keeps that account's own current record in the list (edit mode).
     */
    public function unlinkedRecords(UnlinkedRecordsJournalAccountRequest $request)
    {
        $v = $request->validated();

        $type      = $v['type'];
        $accountId = $v['includeAccountId'] ?? null;

        return response()->json($this->service->unlinkedRecords($type, $accountId));
    }
}
