<?php

namespace App\Http\Requests\User;

use App\Http\Requests\ApiRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\ValidationException;

class UpdateUserRequest extends ApiRequest
{
    protected string $entityName       = 'User';
    protected string $failedMessageKey = 'update_failed';

    public function rules(): array
    {
        return [
            'strFName'    => 'required|string|max:50',
            'strMName'    => 'nullable|string|max:50',
            'strLName'    => 'required|string|max:50',
            'strNickName' => 'required|string|max:20',
            'cUserType'   => 'required|string|max:1',
            'cSex'        => 'required|string|max:1',
            'strPhoneNo'  => 'nullable|string|max:30',
            'strEmail'    => 'nullable|string|email|max:100',
            'strUserName' => 'nullable|string|max:50',
            'strPassword' => 'nullable|string|min:6',
        ];
    }

    /**
     * Behaviour preservation: update() caught ValidationException itself and
     * returned 409 with the exception summary message (without logging to
     * sql_errors), so override ApiRequest's default 500 envelope. The same
     * body is still produced by the controller for the duplicate
     * username/email checks thrown by the service.
     */
    protected function failedValidation(Validator $validator)
    {
        $exception = new ValidationException($validator);

        throw new HttpResponseException(response()->json([
            'message' => $exception->getMessage(),
        ], 409));
    }
}
