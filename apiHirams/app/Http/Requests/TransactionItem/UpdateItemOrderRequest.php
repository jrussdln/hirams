<?php

namespace App\Http\Requests\TransactionItem;

use App\Http\Requests\ApiRequest;

class UpdateItemOrderRequest extends ApiRequest
{
    protected string $entityName       = 'Item order';
    protected string $failedMessageKey = 'update_failed';

    public function rules(): array
    {
        return [
            'items'               => 'required|array',
            'items.*.id'          => 'required|integer',
            'items.*.nItemNumber' => 'required|integer',
        ];
    }
}
