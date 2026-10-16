<?php

namespace App\Http\Requests\ItemPricing;

class BulkStoreItemPricingRequest extends ItemPricingRequest
{
    protected string $failureMessage = 'Failed to process bulk item pricings';

    public function rules(): array
    {
        return [
            'nPricingSetId'                  => 'required|integer|exists:tblpricingsets,nPricingSetId',
            'items'                          => 'required|array|min:1',
            'items.*.nTransactionItemId'     => 'required|integer|exists:tbltransactionitems,nTransactionItemId',
            'items.*.nItemPriceId'           => 'nullable|integer',
            'items.*.dUnitSellingPrice'      => 'nullable|numeric|min:0',
        ];
    }
}
