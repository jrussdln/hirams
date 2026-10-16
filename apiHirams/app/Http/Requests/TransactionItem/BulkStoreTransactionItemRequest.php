<?php

namespace App\Http\Requests\TransactionItem;

use App\Http\Requests\ApiRequest;

class BulkStoreTransactionItemRequest extends ApiRequest
{
    protected string $entityName       = 'Bulk transaction items';
    protected string $failedMessageKey = 'store_failed';

    public function rules(): array
    {
        return [
            'items'              => 'required|array|min:1',
            'items.*.strName'    => 'required|string|max:255',
            'items.*.nQuantity'  => 'required|numeric|min:0',
            'items.*.strUOM'     => 'required|string|max:50',
            'items.*.dUnitABC'   => 'nullable|numeric|min:0',
            'items.*.strSpecs'   => 'nullable|string|max:20000',
        ];
    }
}
