<?php

namespace App\Http\Requests\Inventory;

use App\Http\Requests\ApiRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class BulkCreateJevRequest extends ApiRequest
{
    protected string $entityName       = 'JEV';
    protected string $failedMessageKey = 'create_failed';

    public function rules(): array
    {
        return [
            'type'              => 'required|in:received,delivered',
            'nPurchaseItemIds'  => 'required|array|min:1',
            'nPurchaseItemIds.*' => 'integer',
        ];
    }

    /**
     * Behaviour preservation: bulkCreateJev() caught ValidationException
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
