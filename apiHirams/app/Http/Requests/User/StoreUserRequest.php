<?php

namespace App\Http\Requests\User;

use App\Http\Requests\ApiRequest;
use App\Models\SqlErrors;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\ValidationException;

class StoreUserRequest extends ApiRequest
{
    protected string $entityName       = 'User';
    protected string $failedMessageKey = 'create_failed';

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
            'cStatus'     => 'required|string|max:1',
        ];
    }

    /**
     * Behaviour preservation: store() had no ValidationException catch, so a
     * failure fell through to catch (Exception) — handleException() logged the
     * ValidationException summary message to sql_errors and returned the 500
     * envelope. Reproduce that exactly (ApiRequest's default would report
     * only the first error instead of the summary).
     */
    protected function failedValidation(Validator $validator)
    {
        $exception = new ValidationException($validator);

        SqlErrors::create([
            'dtDate'   => now(),
            'strError' => $exception->getMessage(),
        ]);

        throw new HttpResponseException(response()->json([
            'message' => __("messages.{$this->failedMessageKey}", ['name' => $this->entityName]),
            'error'   => $exception->getMessage(),
        ], 500));
    }
}
