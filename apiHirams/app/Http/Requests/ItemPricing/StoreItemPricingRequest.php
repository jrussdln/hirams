<?php

namespace App\Http\Requests\ItemPricing;

class StoreItemPricingRequest extends ItemPricingRequest
{
    protected string $failureMessage = 'Failed to create item pricing';

    public function rules(): array
    {
        return [
            'nPricingSetId'      => 'required|integer|exists:tblpricingsets,nPricingSetId',
            'nTransactionItemId' => 'required|integer|exists:tbltransactionitems,nTransactionItemId',
            'dUnitSellingPrice'  => 'required|numeric|min:0',
            'bPricingLocked'     => 'nullable|integer|in:0,1',
        ];
    }
}
