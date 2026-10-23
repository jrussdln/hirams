<?php

namespace App\Http\Requests\Supplier;

use App\Http\Requests\ApiRequest;

class TransferSupplierOptionsRequest extends ApiRequest
{
    protected string $entityName       = 'Supplier options';
    protected string $failedMessageKey = 'update_failed';

    public function rules(): array
    {
        return [
            'nTargetSupplierId' => 'required|integer|exists:tblsuppliers,nSupplierId',
            'optionIds'         => 'nullable|array',
            'optionIds.*'       => 'integer',
        ];
    }
}
