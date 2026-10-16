<?php

namespace App\Http\Requests\PurchaseOptions;

use App\Http\Requests\ApiRequest;

class GetSuggestionsPurchaseOptionsRequest extends ApiRequest
{
    protected string $entityName        = 'Purchase option suggestions';
    protected string $failedMessageKey  = 'retrieve_failed';

    public function rules(): array
    {
        return [
            'clientId'   => 'nullable|integer',
            'search'     => 'required|string|min:1|max:255',
            'supplierId' => 'nullable|integer|exists:tblsuppliers,nSupplierId',
        ];
    }
}
