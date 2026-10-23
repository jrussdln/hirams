<?php

namespace App\Http\Requests\Client;

use App\Http\Requests\ApiRequest;

class TransferClientTransactionsRequest extends ApiRequest
{
    protected string $entityName       = 'Client transactions';
    protected string $failedMessageKey = 'update_failed';

    public function rules(): array
    {
        return [
            'nTargetClientId'  => 'required|integer|exists:tblclients,nClientId',
            'transactionIds'   => 'nullable|array',
            'transactionIds.*' => 'integer',
        ];
    }
}
