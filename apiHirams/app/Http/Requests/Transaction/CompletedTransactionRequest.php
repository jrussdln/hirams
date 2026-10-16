<?php

namespace App\Http\Requests\Transaction;

use App\Http\Requests\ApiRequest;

/**
 * completed() shares archive()'s rules and its catch block reported failures
 * under 'Archive Transaction' as well — kept identical on purpose.
 */
class CompletedTransactionRequest extends ApiRequest
{
    protected string $entityName       = 'Archive Transaction';
    protected string $failedMessageKey = 'update_failed';

    public function rules(): array
    {
        return [
            'user_id'     => 'required|integer|exists:tblusers,nUserId',
            'remarks'     => 'nullable|string|max:255',
            'status_code' => 'nullable|string|max:10',
        ];
    }
}
