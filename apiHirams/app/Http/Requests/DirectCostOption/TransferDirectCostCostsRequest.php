<?php

namespace App\Http\Requests\DirectCostOption;

use App\Http\Requests\ApiRequest;

class TransferDirectCostCostsRequest extends ApiRequest
{
    protected string $entityName       = 'Direct cost option entries';
    protected string $failedMessageKey = 'update_failed';

    public function rules(): array
    {
        return [
            'nTargetCostOptionId' => 'required|integer|exists:tbldirectcostoptions,nDirectCostOptionID',
            'costIds'             => 'nullable|array',
            'costIds.*'           => 'integer',
        ];
    }
}
