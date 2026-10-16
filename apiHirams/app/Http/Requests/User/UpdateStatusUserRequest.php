<?php

namespace App\Http\Requests\User;

use App\Http\Requests\ApiRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class UpdateStatusUserRequest extends ApiRequest
{
    protected string $entityName       = 'User';
    protected string $failedMessageKey = 'update_failed';

    public function rules(): array
    {
        return [
            'cStatus'   => 'required|string|max:1',
            'cUserType' => 'nullable|string|max:1',
        ];
    }

    /**
     * Behaviour preservation: updateStatus() caught ValidationException itself
     * and returned this 422 envelope (without logging to sql_errors), so
     * override ApiRequest's default 500 envelope.
     */
    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(response()->json([
            'message' => 'Validation failed',
            'errors'  => $validator->errors()->messages(),
        ], 422));
    }
}
