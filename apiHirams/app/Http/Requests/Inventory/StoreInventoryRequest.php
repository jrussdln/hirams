<?php

namespace App\Http\Requests\Inventory;

use App\Http\Requests\ApiRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class StoreInventoryRequest extends ApiRequest
{
    protected string $entityName       = 'Inventory';
    protected string $failedMessageKey = 'create_failed';

    public function rules(): array
    {
        return [
            'nPurchaseItemId' => 'required|integer',
            'nJEVId'          => 'nullable|integer', // ← NEW
            'nQuantity'       => 'required|integer',
            'dtLog'           => 'nullable|date',
            'strReceiptNumber' => 'nullable|string',
            'cStatus'         => 'required|max:1|string'
        ];
    }

    /**
     * Behaviour preservation: store() caught ValidationException itself and
     * returned this 422 envelope (without logging to sql_errors), so override
     * ApiRequest's default 500 envelope.
     */
    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(response()->json([
            'message' => 'Validation failed',
            'errors'  => $validator->errors(),
        ], 422));
    }
}
