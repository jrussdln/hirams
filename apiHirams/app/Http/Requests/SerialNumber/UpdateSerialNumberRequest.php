<?php

namespace App\Http\Requests\SerialNumber;

use App\Http\Requests\ApiRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class UpdateSerialNumberRequest extends ApiRequest
{
    protected string $entityName       = 'Serial Number';
    protected string $failedMessageKey = 'update_failed';

    public function rules(): array
    {
        return [
            'nInventoryId'    => 'nullable|integer',
            'strSerialNumber' => 'required|string|max:50',
            'dtLog'           => 'nullable|date',
        ];
    }

    /**
     * Behaviour preservation: update() caught ValidationException itself and
     * returned this 422 envelope (without logging to sql_errors), so override
     * ApiRequest's default 500 envelope.
     */
    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(response()->json([
            'message' => 'Validation failed',
            'errors'  => $validator->errors()->messages(),
        ], 422));
    }
}
