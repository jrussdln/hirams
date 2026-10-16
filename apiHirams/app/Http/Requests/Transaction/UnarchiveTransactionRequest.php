<?php

namespace App\Http\Requests\Transaction;

use App\Http\Requests\ApiRequest;

class UnarchiveTransactionRequest extends ApiRequest
{
    protected string $entityName       = 'Unarchive Transaction';
    protected string $failedMessageKey = 'update_failed';

    public function rules(): array
    {
        return [
            'user_id' => 'required|integer|exists:tblusers,nUserId',
            'remarks' => 'nullable|string|max:255',
        ];
    }
}
