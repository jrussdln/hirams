<?php

namespace App\Http\Requests\Transaction;

use App\Http\Requests\ApiRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class AssignAORequest extends ApiRequest
{
    protected string $entityName       = 'Assign AO';
    protected string $failedMessageKey = 'update_failed';

    public function rules(): array
    {
        return [
            'nAssignedAO' => 'required|integer|exists:tblusers,nUserId',
            'dtAODueDate' => 'nullable|date',
            'user_id'     => 'required|integer|exists:tblusers,nUserId',
            'remarks'     => 'nullable|string|max:255',
        ];
    }

    /**
     * Behaviour preservation: assignAO() caught ValidationException itself and
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
