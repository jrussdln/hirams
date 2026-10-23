<?php

namespace App\Http\Requests\Company;

use App\Http\Requests\ApiRequest;

class TransferCompanyLinksRequest extends ApiRequest
{
    protected string $entityName       = 'Company records';
    protected string $failedMessageKey = 'update_failed';

    public function rules(): array
    {
        return [
            'nTargetCompanyId'  => 'required|integer|exists:tblcompanies,nCompanyId',
            'transactionIds'    => 'nullable|array',
            'transactionIds.*'  => 'integer',
            'voucherIds'        => 'nullable|array',
            'voucherIds.*'      => 'integer',
        ];
    }
}
