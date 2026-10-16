<?php

namespace App\Http\Requests\User;

use App\Http\Requests\ApiRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class UploadProfileImageRequest extends ApiRequest
{
    protected string $entityName       = 'Profile Image';
    protected string $failedMessageKey = 'update_failed';

    public function rules(): array
    {
        return [
            'strProfileImage' => 'required|image|mimes:jpg,jpeg,png,gif,webp|max:2048',
        ];
    }

    /**
     * Behaviour preservation: uploadProfileImage() caught ValidationException
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
