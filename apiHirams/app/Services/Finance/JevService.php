<?php

namespace App\Services\Finance;

use App\Events\JevUpdated;
use App\Models\Jev;
use App\Models\JevEntries;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * JEV queries, transactions and broadcasts, plus the company/payee metadata
 * every JEV listing ships with.
 *
 * The Finance controllers keep their original (envelope-less) response
 * shapes — this service owns everything except building those responses.
 */
class JevService
{
    private function withCompanyRelations(): array
    {
        return [
            'entries.journal_account.parent',
            'vouchers.supplier',
            'vouchers.voucher_assignees.assignee',
            'vouchers.company',
            'vouchers.voucher_suppliers.purchase_order.purchaseOrderOptions.purchaseOption.transactionItem.transaction.company',
        ];
    }

    public function index()
    {
        return Jev::with($this->withCompanyRelations())->get()
            ->map(fn($jev) => $this->attachCompanyMeta($jev));
    }

    /**
     * Per-type totals for the sidebar (JevNav): one grouped COUNT instead of
     * shipping every JEV with its entries and voucher relations just to
     * render four numbers.
     */
    public function counts()
    {
        return Jev::select('cJEVLinkType', DB::raw('COUNT(*) as total'))
            ->groupBy('cJEVLinkType')
            ->pluck('total', 'cJEVLinkType');
    }

    /** One JEV with company meta attached, or null when it does not exist. */
    public function show($id): ?Jev
    {
        $res = Jev::with($this->withCompanyRelations())->find($id);

        return $res ? $this->attachCompanyMeta($res) : null;
    }

    public function getByLink($link): ?Jev
    {
        $res = Jev::where('cJEVLinkType', $link)
            ->orWhereHas('entries', fn($q) => $q->where('dAmount', '!=', 0))
            ->with($this->withCompanyRelations())
            ->first();

        return $res ? $this->attachCompanyMeta($res) : null;
    }

    public function store(Request $request)
    {
        $res = DB::transaction(function () use ($request) {
            $jev = Jev::create([
                'strJEVNumber' => Jev::generateNumber(),
                'cJEVLinkType' => $request->cJEVLinkType,
                'strTitle'     => $this->resolveTitle($request),
                'dtOccur'      => $request->dtOccur ?? now(),
                'cStatus'      => 'P',
            ]);

            return Jev::with('entries.journal_account')->find($jev->nJEVId);
        });
        broadcast(new JevUpdated('created', (int) $res->nJEVId, (string) $res->cJEVLinkType))->toOthers();

        return $res;
    }

    public function update(Request $request, $id): ?Jev
    {
        $jev = Jev::find($id);
        if (!$jev) return null;

        $payload = [
            'cJEVLinkType' => $request->cJEVLinkType ?? $jev->cJEVLinkType,
            'dtOccur'      => $request->dtOccur ?? $jev->dtOccur,
            'strTitle'     => $this->resolveTitle($request, $jev),
        ];

        $payload['cStatus'] = $request->cStatus === 'toggle'
            ? ($jev->cStatus === 'P' ? 'A' : 'P')
            : ($request->cStatus ?? $jev->cStatus);

        $jev->update($payload);

        // cJEVLinkType can move here — two badges can change at once.
        broadcast(new JevUpdated('updated', (int) $id, (string) $jev->cJEVLinkType))->toOthers();

        return Jev::with('entries.journal_account')->find($id);
    }

    /**
     * strTitle belongs to a No Type (N) JEV alone — every other link type
     * takes its name from the voucher, purchase or inventory flow behind it.
     *
     * So the title survives only while the type is N, and only when the
     * client actually SENT one: the JEV Info row posts { dtOccur } on a
     * date-only edit, which must never blank out the title it doesn't carry.
     */
    private function resolveTitle(Request $request, ?Jev $jev = null): ?string
    {
        $linkType = (string) ($request->cJEVLinkType ?? $jev?->cJEVLinkType);

        if ($linkType !== 'N') return null;

        return $request->has('strTitle')
            ? $request->input('strTitle')
            : $jev?->strTitle;
    }

    /** Deletes the JEV and its entries; false when the JEV does not exist. */
    public function destroy($id): bool
    {
        $jev = Jev::find($id);
        if (!$jev) return false;

        JevEntries::where('nJEVId', $id)->delete();
        $jev->delete();

        // Every tab / user watching the sidebar recounts the badge for
        // this type. The tab that did the delete already dropped the row
        // and pinged JevNav locally, hence toOthers().
        broadcast(new JevUpdated('deleted', (int) $id, (string) $jev->cJEVLinkType))->toOthers();

        return true;
    }

    private function attachCompanyMeta(Jev $jev): Jev
    {
        $voucher = $jev->vouchers->first(); // adjust if a Jev can ever have >1 voucher

        if (!$voucher) {
            $meta = [
                'strPayeeName'     => '—',
                'strCompanyName'   => 'No Company',
                'bIsAssigneeType'  => false,
                'strVoucherNumber' => $jev->cJEVLinkType,
                'strJEVNumber'     => $jev->strJEVNumber,
            ];
        } else {
            $isAssigneeType = $voucher->voucher_assignees->count() > 0
                && !$voucher->voucher_suppliers->count();

            $payeeName = $isAssigneeType
                ? ($voucher->strTitle ?? $voucher->voucher_assignees->first()?->assignee?->strAssigneeName ?? '—')
                : ($voucher->supplier?->strSupplierName ?? '—');

            $companyName = 'No Company';
            if ($isAssigneeType) {
                $companyName = $voucher->company?->strCompanyName ?? $voucher->company?->strCompanyNickName ?? 'No Company';
            } else {
                foreach ($voucher->voucher_suppliers as $vs) {
                    $company = $vs->purchase_order?->purchaseOrderOptions
                        ->map(fn($o) => $o->purchaseOption?->transactionItem?->transaction?->company)
                        ->first(fn($c) => $c);
                    if ($company) {
                        $companyName = $company->strCompanyName ?? $company->strName ?? 'No Company';
                        break;
                    }
                }
            }

            $meta = [
                'strPayeeName'     => $payeeName,
                'strCompanyName'   => $companyName,
                'bIsAssigneeType'  => $isAssigneeType,
                'strVoucherNumber' => $voucher->strNumber,
                'strJEVNumber'     => $jev->strJEVNumber,
            ];
        }

        $jev->entries->each(function ($entry) use ($meta) {
            $entry->strPayeeName     = $meta['strPayeeName'];
            $entry->strCompanyName   = $meta['strCompanyName'];
            $entry->bIsAssigneeType  = $meta['bIsAssigneeType'];
            $entry->strVoucherNumber = $meta['strVoucherNumber'];
            $entry->strJEVNumber     = $meta['strJEVNumber'];
        });

        return $jev;
    }
}
