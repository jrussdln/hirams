<?php

namespace App\Services\Finance;

use App\Events\JournalAccountUpdated;
use App\Models\Client;
use App\Models\JevEntries;
use App\Models\JournalAccount;
use App\Models\Supplier;
use Illuminate\Http\Request;

/**
 * Journal-account queries, guard helpers, writes and broadcasts.
 *
 * The controller keeps every response body/status exactly as before — this
 * service owns the data work (including the record-link guard and the
 * recursive descendant walk).
 */
class JournalAccountService
{
    /** Relations every journal-account payload ships with. */
    private const RELATIONS = ['parent.client', 'parent.supplier', 'client', 'supplier'];

    public function index(Request $request)
    {
        $query = JournalAccount::with(['parent', 'client', 'supplier'])->orderBy('strAccountName');

        // Only return top-level accounts (no parent) — used for the first
        // level of account-chain selects.
        if ($request->boolean('onlyParents')) {
            $query->whereNull('nParentAccountId');
        }

        // When editing an account, exclude itself and all of its descendants
        // from the selectable parent list (prevents circular links).
        if ($request->filled('excludeDescendantsOf')) {
            $excludeId = (int) $request->excludeDescendantsOf;
            $excludeIds = $this->getDescendantIds($excludeId);
            $excludeIds[] = $excludeId;
            $query->whereNotIn('nJournalAccountId', $excludeIds);
        }

        if ($request->filled('nParentAccountId')) {
            $query->where('nParentAccountId', $request->nParentAccountId);
        }

        return $query->get();
    }

    /**
     * Recursively collect all descendant IDs of a given account.
     */
    public function getDescendantIds(int $id): array
    {
        $ids = [];
        $children = JournalAccount::where('nParentAccountId', $id)->pluck('nJournalAccountId');

        foreach ($children as $childId) {
            $ids[] = $childId;
            $ids = array_merge($ids, $this->getDescendantIds($childId));
        }

        return $ids;
    }

    /** POST /journal-accounts */
    public function store(Request $request): JournalAccount
    {
        $journalAccount = JournalAccount::create([
            'strAccountName'   => $request->strAccountName,
            'nParentAccountId' => $request->nParentAccountId,
            'nRecordId'        => $this->resolveRecordId($request),
            'cAccountType'     => $request->cAccountType,
        ]);
        broadcast(new JournalAccountUpdated('created', $journalAccount->nJournalAccountId))->toOthers();

        return $journalAccount->load(self::RELATIONS);
    }

    /** PUT/PATCH /journal-accounts/{journalAccount} (after the controller's loop checks) */
    public function update(Request $request, JournalAccount $journalAccount): JournalAccount
    {
        $journalAccount->update([
            'strAccountName'   => $request->strAccountName,
            'nParentAccountId' => $request->nParentAccountId,
            'nRecordId'        => $this->resolveRecordId($request),
            'cAccountType'     => $request->cAccountType,
        ]);
        broadcast(new JournalAccountUpdated('updated', $journalAccount->nJournalAccountId))->toOthers();

        return $journalAccount->load(self::RELATIONS);
    }

    /** PATCH /journal-accounts/{journalAccount}/move — links under a new parent. */
    public function move(JournalAccount $journalAccount, int $newParentId): JournalAccount
    {
        $id = (int) $journalAccount->nJournalAccountId;

        $journalAccount->update(['nParentAccountId' => $newParentId]);

        broadcast(new JournalAccountUpdated('updated', $id))->toOthers();

        return $journalAccount->load(self::RELATIONS);
    }

    /** DELETE /journal-accounts/{journalAccount} (after the controller's guards) */
    public function destroy(JournalAccount $journalAccount): void
    {
        $id = $journalAccount->nJournalAccountId;

        // The controller's guard only ever let CANCELLED lines through —
        // sweep those so no entry outlives the account it pointed at.
        JevEntries::where('nJournalAccountId', $id)
            ->whereHas('jev', fn ($q) => $q->where('cStatus', $this->cancelledJevKey()))
            ->delete();

        $journalAccount->delete();
        broadcast(new JournalAccountUpdated('deleted', $id))->toOthers();
    }

    /** GET /journal-accounts/{journalAccount} */
    public function show(JournalAccount $journalAccount): JournalAccount
    {
        return $journalAccount->load(self::RELATIONS);
    }

    public function hasChildren($id): bool
    {
        return JournalAccount::where('nParentAccountId', $id)->exists();
    }

    /**
     * An account that carries LIVE journal (JEV) entries is part of the
     * books. Lines of a CANCELLED JEV don't count — destroy() sweeps those
     * away with the account, so they must never keep it deletable.
     */
    public function hasJournalEntries($id): bool
    {
        return JevEntries::where('nJournalAccountId', $id)
            ->whereDoesntHave('jev', fn ($q) => $q->where('cStatus', $this->cancelledJevKey()))
            ->exists();
    }

    /** The jev_status code config/mappings.php names "Cancelled" (fallback C). */
    private function cancelledJevKey(): string
    {
        return (string) (array_search('Cancelled', config('mappings.jev_status', []), true) ?: 'C');
    }

    /**
     * GET /journal-accounts/unlinked-records?type=C|S&includeAccountId=
     * Clients (C) or suppliers (S) not yet linked to a journal account.
     * includeAccountId keeps that account's own current record in the list (edit mode).
     */
    public function unlinkedRecords($type, $accountId)
    {
        // records linked by OTHER accounts
        $linkedIds = JournalAccount::where('cAccountType', $type)
            ->whereNotNull('nRecordId')
            ->when($accountId, fn($q) => $q->where('nJournalAccountId', '!=', $accountId))
            ->pluck('nRecordId');

        // the record this account already uses (so it stays selectable even if inactive)
        $own = $accountId
            ? JournalAccount::where('nJournalAccountId', $accountId)
            ->where('cAccountType', $type)
            ->value('nRecordId')
            : null;

        if ($type === 'C') {
            $active = array_keys(config('mappings.status_client'))[0];

            $rows = Client::where(function ($q) use ($active, $own) {
                $q->where('cStatus', $active);
                if ($own) $q->orWhere('nClientId', $own);
            })
                ->whereNotIn('nClientId', $linkedIds)
                ->orderBy('strClientName')
                ->get()
                ->map(fn($c) => [
                    'nRecordId'   => $c->nClientId,
                    'strName'     => $c->strClientName,
                    'strNickName' => $c->strClientNickName,
                ]);
        } else {
            $active = array_keys(config('mappings.status_user'))[0];

            $rows = Supplier::where(function ($q) use ($active, $own) {
                $q->where('cStatus', $active);
                if ($own) $q->orWhere('nSupplierId', $own);
            })
                ->whereNotIn('nSupplierId', $linkedIds)
                ->orderBy('strSupplierName')
                ->get()
                ->map(fn($s) => [
                    'nRecordId'   => $s->nSupplierId,
                    'strName'     => $s->strSupplierName,
                    'strNickName' => $s->strSupplierNickName,
                ]);
        }

        return $rows->values();
    }

    /** nRecordId only means something for Client / Supplier accounts. */
    private function resolveRecordId(Request $request): ?int
    {
        return in_array($request->cAccountType, ['C', 'S'], true) && $request->filled('nRecordId')
            ? (int) $request->nRecordId
            : null;
    }

    /**
     * Returns the error message when the chosen record is missing or already
     * linked, or null when it is safe to proceed. The controller turns the
     * message into the original 422 response.
     */
    public function checkRecordLink(Request $request, ?int $ignoreAccountId = null): ?string
    {
        $recordId = $this->resolveRecordId($request);
        if ($recordId === null) return null;

        $type   = $request->cAccountType;
        $exists = $type === 'C'
            ? Client::where('nClientId', $recordId)->exists()
            : Supplier::where('nSupplierId', $recordId)->exists();

        if (!$exists) {
            return 'The selected record does not exist.';
        }

        $taken = JournalAccount::where('cAccountType', $type)
            ->where('nRecordId', $recordId)
            ->when($ignoreAccountId, fn($q) => $q->where('nJournalAccountId', '!=', $ignoreAccountId))
            ->exists();

        if ($taken) {
            return 'That record is already linked to another account.';
        }

        return null;
    }
}
