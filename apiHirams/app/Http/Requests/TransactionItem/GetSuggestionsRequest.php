<?php

namespace App\Http\Requests\TransactionItem;

use App\Http\Requests\ApiRequest;

class GetSuggestionsRequest extends ApiRequest
{
    protected string $entityName       = 'Suggestions';
    protected string $failedMessageKey = 'retrieve_failed';

    public function rules(): array
    {
        return [
            'clientId' => 'required|integer',
            'search'   => 'nullable|string|max:255',
        ];
    }
}
