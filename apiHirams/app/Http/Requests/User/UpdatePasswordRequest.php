<?php

namespace App\Http\Requests\User;

use App\Http\Requests\ApiRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class UpdatePasswordRequest extends ApiRequest
{
    protected string $entityName       = 'Password';
    protected string $failedMessageKey = 'update_failed';

    public function rules(): array
    {
        return [
            'strPassword' => 'required|string|min:6|confirmed',
            // strPassword_confirmation validated implicitly by 'confirmed'
        ];
    }

    /**
     * Behaviour preservation: updatePassword() caught ValidationException
     * itself and returned this 422 envelope (without logging to sql_errors),
     * so override ApiRequest's default 500 envelope.
     */
    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(response()->json([
            'message' => 'Validation failed',
            'errors'  => $validator->errors()->messages(),
        ], 422));
    }
}
