<?php

namespace App\Http\Requests\ItemPricing;

use App\Models\ItemPricings;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class UpdateItemPricingRequest extends ItemPricingRequest
{
    protected string $failureMessage = 'Failed to update item pricing';

    public function rules(): array
    {
        return [
            'nPricingSetId'      => 'sometimes|required|integer|exists:tblpricingsets,nPricingSetId',
            'nTransactionItemId' => 'sometimes|required|integer|exists:tbltransactionitems,nTransactionItemId',
            'dUnitSellingPrice'  => 'sometimes|required|numeric|min:0',
            'bPricingLocked'     => 'sometimes|nullable|integer|in:0,1',
        ];
    }

    /**
     * The original update() called `ItemPricings::findOrFail($id)` BEFORE
     * validating, so when both the payload is invalid AND the row is missing
     * the client received the 404 envelope — reproduce that ordering here,
     * where validation runs before the controller body.
     */
    protected function failedValidation(Validator $validator)
    {
        // The update route is the apiResource one; read its parameter
        // positionally so the lookup works regardless of the parameter name.
        $route = $this->route();
        $id    = $route ? last($route->parameters()) : null;

        if ($id === null || ! ItemPricings::whereKey($id)->exists()) {
            throw new HttpResponseException(response()->json([
                'success' => false,
                'message' => 'Item pricing not found',
            ], 404));
        }

        parent::failedValidation($validator);
    }
}
