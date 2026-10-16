<?php

namespace App\Http\Requests\TransactionItem;

use App\Http\Requests\ApiRequest;

class StoreTransactionItemRequest extends ApiRequest
{
    protected string $entityName       = 'Transaction item';
    protected string $failedMessageKey = 'store_failed';

    public function rules(): array
    {
        return [
            'nTransactionId' => 'required|integer',
            'strName'        => 'required|string|max:255',
            'nQuantity'      => 'required|integer',
            'strUOM'         => 'nullable|string|max:50',
            'strSpecs'       => 'nullable|string|max:20000',
            'dUnitABC'       => 'required|numeric',
        ];
    }
}
