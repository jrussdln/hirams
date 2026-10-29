<?php

namespace App\Http\Requests\Supplier;

use App\Http\Requests\ApiRequest;

class StoreSupplierRequest extends ApiRequest
{
    protected string $entityName        = 'Supplier';
    protected string $failedMessageKey  = 'create_failed';

    public function rules(): array
    {
        return [
            'strSupplierName'     => 'required|string|max:100',
            'strSupplierNickName' => 'nullable|string|max:50',
            'strAddress'          => 'nullable|string|max:200',
            'strTIN'              => 'nullable|string|max:17',
            'bVAT'                => 'required|boolean',
            'bEWT'                => 'required|boolean',
            'cStatus'             => 'required|string|max:1',
        ];
    }
}
