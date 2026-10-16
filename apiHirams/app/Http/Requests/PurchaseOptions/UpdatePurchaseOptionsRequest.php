<?php

namespace App\Http\Requests\PurchaseOptions;

use App\Http\Requests\ApiRequest;

class UpdatePurchaseOptionsRequest extends ApiRequest
{
    protected string $entityName        = 'Purchase Option';
    protected string $failedMessageKey  = 'update_failed';

    public function rules(): array
    {
        return [
            'nSupplierId'      => 'nullable|integer|exists:tblsuppliers,nSupplierId',
            'quantity'         => 'nullable|integer|min:1',
            'uom'              => 'nullable|string|max:10',
            'brand'            => 'nullable|string|max:255',
            'model'            => 'nullable|string|max:255',
            'specs'            => 'nullable|string|max:20000',
            'unitPrice'        => 'nullable|numeric|min:0',
            'ewt'              => 'nullable|numeric|min:0',
            'bIncluded'        => 'nullable|integer|in:0,1',
            'bAddOn'           => 'nullable|integer|in:0,1',
            'nSupplierContactId' => 'nullable|integer',
            'bPurchaseIncluded' => 'nullable|integer|in:0,1',  // ← ADD
            'dtCanvass' => now(),
        ];
    }
}
