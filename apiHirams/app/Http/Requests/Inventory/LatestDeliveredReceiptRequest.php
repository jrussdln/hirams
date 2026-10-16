<?php

namespace App\Http\Requests\Inventory;

use App\Http\Requests\ApiRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class LatestDeliveredReceiptRequest extends ApiRequest
{
    protected string $entityName       = 'Latest Receipt';
    protected string $failedMessageKey = 'retrieve_failed';

    public function rules(): array
    {
        return [
            'nSupplierId' => 'nullable|integer',
        ];
    }

    /**
     * Behaviour preservation: latestDeliveredReceipt() caught
     * ValidationException itself and returned this 422 envelope (without
     * logging to sql_errors), so override ApiRequest's default 500 envelope.
     */
    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(response()->json([
            'message' => 'Validation failed',
            'errors'  => $validator->errors(),
        ], 422));
    }
}
