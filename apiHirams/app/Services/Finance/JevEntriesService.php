<?php

namespace App\Services\Finance;

use App\Events\JournalEntryUpdated;
use App\Models\JevEntries;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * JEV-entry queries, transactions and broadcasts.
 *
 * The controller keeps its original (envelope-less) response shapes — this
 * service owns everything except building those responses.
 */
class JevEntriesService
{
    private function withAccountRelations(): array
    {
        return ['jev', 'journal_account.client', 'journal_account.supplier'];
    }

    // List all Entries
    public function index()
    {
        return JevEntries::with($this->withAccountRelations())->get();
    }

    // Get single Entry by ID
    public function show($id): ?JevEntries
    {
        return JevEntries::with($this->withAccountRelations())->find($id);
    }

    // Get all Entries under a JEV
    public function getByJevId($jevId)
    {
        return JevEntries::where('nJEVId', $jevId)
            ->with([
                'jev',
                'journal_account' => fn($q) => $q->with(['client', 'supplier']),
                'journal_account.parent' => fn($q) => $q->with(['client', 'supplier']),
                'journal_account.parent.parent' => fn($q) => $q->with(['client', 'supplier']),
                'journal_account.parent.parent.parent' => fn($q) => $q->with(['client', 'supplier']),
            ])
            ->get();
    }

    // Create Entry
    public function store(Request $request)
    {
        $res = DB::transaction(function () use ($request) {
            $entry = JevEntries::create([
                'nJEVId'            => $request->nJEVId,
                'nJournalAccountId' => $request->nJournalAccountId,
                'dAmount'           => $request->dAmount,
            ]);

            return JevEntries::with($this->withAccountRelations())
                ->find($entry->nJEVEntryId);
        });

        broadcast(new JournalEntryUpdated('created', $res->nJEVEntryId, $res->nJEVId))->toOthers();

        return $res;
    }

    // Update Entry
    public function update(Request $request, $id): ?JevEntries
    {
        $entry = JevEntries::find($id);
        if (!$entry) return null;

        $entry->update([
            'nJEVId'            => $request->nJEVId ?? $entry->nJEVId,
            'nJournalAccountId' => $request->nJournalAccountId ?? $entry->nJournalAccountId,
            'dAmount'           => $request->dAmount ?? $entry->dAmount,
        ]);

        $res = JevEntries::with($this->withAccountRelations())->find($id);
        broadcast(new JournalEntryUpdated('updated', $res->nJEVEntryId, $res->nJEVId))->toOthers();

        return $res;
    }

    // Delete Entry
    public function destroy($id): bool
    {
        $res = JevEntries::find($id);
        if (!$res) return false;

        $jevEntryId = $res->nJEVEntryId;
        $jevId = $res->nJEVId;
        $res->delete();
        broadcast(new JournalEntryUpdated('deleted', $jevEntryId, $jevId))->toOthers();

        return true;
    }
}
