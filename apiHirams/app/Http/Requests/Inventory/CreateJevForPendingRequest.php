<?php

namespace App\Http\Requests\Inventory;

use App\Http\Requests\ApiRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class CreateJevForPendingRequest extends ApiRequest
{
    protected string $entityName       = 'JEV';
    protected string $failedMessageKey = 'create_failed';

    public function rules(): array
    {
        return [
            'nPurchaseItemId' => 'required|integer',
        ];
    }

    /**
     * Behaviour preservation: createJevForPending() caught ValidationException
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
