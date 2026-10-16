<?php

namespace App\Http\Requests\SupplierBank;

use App\Http\Requests\ApiRequest;

class UpdateSupplierBankRequest extends ApiRequest
{
    protected string $entityName       = 'Supplier Bank';
    protected string $failedMessageKey = 'update_failed';

    public function rules(): array
    {
        return [
            'strBankName'      => 'required|string|max:100',
            'strAccountName'   => 'required|string|max:100',
            'strAccountNumber' => 'required|string|max:20',
        ];
    }
}
