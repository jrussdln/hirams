<?php

namespace App\Http\Requests\Assignee;

use App\Http\Requests\ApiRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class StoreAssigneeRequest extends ApiRequest
{
    protected string $entityName       = 'Assignee';
    protected string $failedMessageKey = 'create_failed';

    public function rules(): array
    {
        return [
            'strAssigneeName'     => 'required|string|max:150',
            'strAssigneeNickName' => 'nullable|string|max:50',
            'strAddress'          => 'nullable|string|max:255',
            'strTIN'              => 'nullable|string|max:20',
            'cStatus'             => 'required|string|max:1',
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
