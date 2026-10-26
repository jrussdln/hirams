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
            'cEWTType'         => 'nullable|string|in:A,B,C,D',
            'bIncluded'        => 'nullable|integer|in:0,1',
            'bAddOn'           => 'nullable|integer|in:0,1',
            'nSupplierContactId' => 'nullable|integer',
            'bPurchaseIncluded' => 'nullable|integer|in:0,1',  // ← ADD
            // NOTE: dtCanvass is NOT touched by an update — the canvass
            // date of a line does not move when its price is edited.
            // (The rule that used to sit here — 'dtCanvass' => now() — was
            // never a rule at all: it was a date VALUE in the rules array,
            // which only broke if a client ever sent dtCanvass.)
        ];
    }
}
