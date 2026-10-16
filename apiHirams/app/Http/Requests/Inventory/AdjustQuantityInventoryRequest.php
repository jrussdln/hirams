<?php

namespace App\Http\Requests\Inventory;

use App\Http\Requests\ApiRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class AdjustQuantityInventoryRequest extends ApiRequest
{
    protected string $entityName       = 'Inventory Quantity';
    protected string $failedMessageKey = 'update_failed';

    public function rules(): array
    {
        return [
            'nQuantity' => 'required|integer',
            'operation' => 'required|string|in:increment,decrement,set',
        ];
    }

    /**
     * Behaviour preservation: adjustQuantity() caught ValidationException
     * itself and returned this 422 envelope (without logging to sql_errors),
     * so override ApiRequest's default 500 envelope.
     */
    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(response()->json([
            'message' => 'Validation failed',
            'errors'  => $validator->errors(),
        ], 422));
    }
}
