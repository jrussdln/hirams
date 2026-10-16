<?php

namespace App\Http\Requests\TransactionItem;

use App\Http\Requests\ApiRequest;

class UpdateItemSpecsRequest extends ApiRequest
{
    protected string $entityName       = 'Transaction Item specs';
    protected string $failedMessageKey = 'update_failed';

    public function rules(): array
    {
        return [
            'specs' => 'nullable|string|max:20000',
        ];
    }
}
