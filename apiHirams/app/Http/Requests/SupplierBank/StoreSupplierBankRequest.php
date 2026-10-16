<?php

namespace App\Http\Requests\SupplierBank;

use App\Http\Requests\ApiRequest;

class StoreSupplierBankRequest extends ApiRequest
{
    protected string $entityName       = 'Supplier Bank';
    protected string $failedMessageKey = 'create_failed';

    public function rules(): array
    {
        return [
            'nSupplierId'      => 'required|integer',
            'strBankName'      => 'required|string|max:100',
            'strAccountName'   => 'required|string|max:100',
            'strAccountNumber' => 'required|string|max:20',
        ];
    }
}
