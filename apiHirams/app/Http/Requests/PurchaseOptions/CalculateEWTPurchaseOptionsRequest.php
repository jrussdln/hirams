<?php

namespace App\Http\Requests\PurchaseOptions;

use App\Http\Requests\ApiRequest;

class CalculateEWTPurchaseOptionsRequest extends ApiRequest
{
    protected string $entityName        = 'EWT';
    protected string $failedMessageKey  = 'retrieve_failed';

    public function rules(): array
    {
        return [
            'nSupplierId' => 'required|integer|exists:tblsuppliers,nSupplierId',
            'quantity'    => 'required|numeric|min:0',
            'unitPrice'   => 'required|numeric|min:0',
            'cItemType'   => 'required|string|in:G,S',
        ];
    }
}
