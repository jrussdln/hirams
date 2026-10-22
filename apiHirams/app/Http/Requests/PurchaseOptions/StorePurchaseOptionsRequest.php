<?php

namespace App\Http\Requests\PurchaseOptions;

use App\Http\Requests\ApiRequest;

class StorePurchaseOptionsRequest extends ApiRequest
{
    protected string $entityName        = 'Purchase Option';
    protected string $failedMessageKey  = 'create_failed';

    public function rules(): array
    {
        return [
            'nTransactionItemId'       => 'required|integer|exists:tbltransactionitems,nTransactionItemId',
            'nSupplierId'              => 'nullable|integer|exists:tblsuppliers,nSupplierId',
            'quantity'                 => 'required|integer|min:1',
            'uom'                      => 'required|string|max:10',
            'brand'                    => 'nullable|string|max:255',
            'model'                    => 'nullable|string|max:255',
            'specs'                    => 'nullable|string|max:20000',
            'unitPrice'                => 'required|numeric|min:0',
            'ewt'                      => 'nullable|numeric|min:0',
            'cEWTType'                 => 'nullable|string|in:A,B,C',
            'bIncluded'                => 'nullable|integer|in:0,1',
            'bAddOn'                   => 'nullable|integer|in:0,1',
            'nSupplierContactId'       => 'nullable|integer',
            'dPurchaseUnitPrice'       => 'nullable|numeric|min:0',       // ← ADD
            'bPurchaseIncluded'        => 'nullable|integer|in:0,1',      // ← ADD
            'cPurchaseUnitPriceStatus' => 'nullable|string|max:10',       // ← ADD
        ];
    }
}
