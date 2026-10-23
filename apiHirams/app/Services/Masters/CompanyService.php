<?php

namespace App\Services\Masters;

use App\Events\CompanyUpdated;
use App\Events\TransactionUpdated;
use App\Events\VoucherUpdated;
use App\Models\Company;
use App\Models\Transactions;
use App\Models\Voucher;
use App\Services\CrudService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection as SupportCollection;
use RuntimeException;

/**
 * Company CRUD + the company-specific logo file cleanup on delete
 * and logo replacement.
 */
class CompanyService extends CrudService
{
    protected string $entityName = 'Company';
    protected string $primaryKey = 'nCompanyId';
    protected array  $searchable = ['strCompanyName', 'strAddress'];
    protected array  $defaultSort = ['strCompanyName', 'asc'];

    protected function modelClass(): string
    {
        return Company::class;
    }

    protected function eventClass(): ?string
    {
        return CompanyUpdated::class;
    }

    /**
     * The listing carries how many transactions and vouchers each company
     * holds — the UI swaps Delete for Transfer on the companies that have
     * any.
     */
    public function search(?string $term = null): Builder
    {
        return parent::search($term)->withCount(['transactions', 'vouchers']);
    }

    /**
     * TRUE when the company still carries transactions or vouchers — such
     * a company cannot be deleted, it has to be transferred first.
     */
    public function hasLinks(int $id): bool
    {
        return Transactions::where('nCompanyId', $id)->exists()
            || Voucher::where('nCompanyId', $id)->exists();
    }

    /**
     * The transactions and vouchers that name a company, as ONE list — the
     * transfer modal shows both kinds side by side.
     *
     * @return SupportCollection<int, array>
     */
    public function links(int $companyId): SupportCollection
    {
        $transactionStatuses = config('mappings.status_transaction', []);
        $voucherStatuses     = config('mappings.voucher_status', []);

        $transactions = Transactions::with(['latestHistory'])
            ->withCount('transactionItems')
            ->where('nCompanyId', $companyId)
            ->orderByDesc('nTransactionId')
            ->get()
            ->map(function ($transaction) use ($transactionStatuses) {
                $status = $transaction->latestHistory?->nStatus;

                return [
                    'type'         => 'transaction',
                    'id'           => (int) $transaction->nTransactionId,
                    'code'         => $transaction->strCode,
                    'label'        => $transaction->strTitle,
                    'status'       => $status !== null
                        ? ($transactionStatuses[(string) $status] ?? null)
                        : null,
                    'amount'       => $transaction->dTotalABC,
                    'items_count'  => (int) $transaction->transaction_items_count,
                    'dtCreated'    => $transaction->dtDocSubmission,
                ];
            });

        $vouchers = Voucher::withCount('voucher_assignees')
            ->where('nCompanyId', $companyId)
            ->orderByDesc('nVoucherId')
            ->get()
            ->map(function ($voucher) use ($voucherStatuses) {
                return [
                    'type'         => 'voucher',
                    'id'           => (int) $voucher->nVoucherId,
                    'code'         => $voucher->strNumber,
                    'label'        => null,
                    'status'       => $voucherStatuses[(string) $voucher->cStatus] ?? null,
                    'amount'       => null,
                    'items_count'  => (int) $voucher->voucher_assignees_count,
                    'dtCreated'    => $voucher->dtCreated,
                ];
            });

        return $transactions->concat($vouchers)->values();
    }

    /**
     * Moves a company's transactions and vouchers to another company.
     *
     * Nothing else on the record changes: the transaction keeps its items,
     * prices and JEV, and the voucher keeps its lines — only the company
     * they belong to moves.
     *
     * @param  array<int>  $transactionIds  the transactions to move.
     * @param  array<int>  $voucherIds      the vouchers to move.
     * @return array{transactions: int, vouchers: int}
     */
    public function transferLinks(
        int $companyId,
        int $targetCompanyId,
        array $transactionIds = [],
        array $voucherIds = []
    ): array {
        $target = $this->find($targetCompanyId);

        if ($targetCompanyId === $companyId) {
            throw new RuntimeException('The destination company must be different from the company being transferred.');
        }

        $movedTransactions = 0;
        $movedVouchers     = 0;

        if ($transactionIds !== []) {
            $transactions = Transactions::where('nCompanyId', $companyId)
                ->whereIn('nTransactionId', $transactionIds)
                ->get();

            foreach ($transactions as $transaction) {
                $transaction->update(['nCompanyId' => $targetCompanyId]);

                broadcast(new TransactionUpdated(
                    'updated',
                    (int) $transaction->nTransactionId,
                    null
                ))->toOthers();

                $movedTransactions++;
            }
        }

        if ($voucherIds !== []) {
            $vouchers = Voucher::where('nCompanyId', $companyId)
                ->whereIn('nVoucherId', $voucherIds)
                ->get();

            foreach ($vouchers as $voucher) {
                $voucher->update(['nCompanyId' => $targetCompanyId]);

                broadcast(new VoucherUpdated('updated', (int) $voucher->nVoucherId))->toOthers();

                $movedVouchers++;
            }
        }

        return [
            'transactions' => $movedTransactions,
            'vouchers'     => $movedVouchers,
        ];
    }

    /**
     * Deleting a company also removes its logo file from public/logo.
     */
    public function delete(int $id): Company
    {
        $company = $this->find($id);

        // Delete logo file
        if ($company->strLogo) {
            $logoPath = public_path('logo/' . $company->strLogo);

            if (file_exists($logoPath)) {
                unlink($logoPath);
            }
        }

        $company->delete();

        $this->broadcast('deleted', $id);

        return $company;
    }

    /**
     * Replace the company logo file. Matches the previous controller logic
     * exactly and deliberately does NOT broadcast, like before.
     */
    public function uploadLogo(int $id, $file, string $filename): Company
    {
        $company = $this->find($id);

        // Delete the old logo file if it exists
        if ($company->strLogo) {
            $oldPath = public_path('logo/' . $company->strLogo);
            if (file_exists($oldPath)) {
                unlink($oldPath);
            }
        }

        $file->move(public_path('logo'), $filename);
        $company->update(['strLogo' => $filename]);

        return $company;
    }
}
