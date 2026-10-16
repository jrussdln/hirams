<?php

namespace App\Http\Requests\ItemPricing;

class GetTaxItemPricingRequest extends ItemPricingRequest
{
    protected string $failureMessage = 'Failed to calculate tax';

    public function rules(): array
    {
        return [
            'transaction_item_id' => 'required|integer|exists:tbltransactionitems,nTransactionItemId',
            'pricing_set_id'      => 'required|integer|exists:tblpricingsets,nPricingSetId',
            'unit_selling_price'  => 'nullable|numeric|min:0', // ← ADD
        ];
    }
}
