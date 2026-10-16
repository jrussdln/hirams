<?php

namespace App\Http\Requests\User;

use App\Http\Requests\ApiRequest;
use App\Models\SqlErrors;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\ValidationException;

class CheckExistUserRequest extends ApiRequest
{
    protected string $entityName       = 'User existence check';
    protected string $failedMessageKey = 'retrieve_failed';

    public function rules(): array
    {
        return [
            'strUserName' => 'nullable|string|max:50',
            'strEmail'    => 'nullable|string|email|max:100',
        ];
    }

    /**
     * Behaviour preservation: checkExist() had no ValidationException catch,
     * so a failure fell through to catch (Exception) — handleException() logged
     * the ValidationException summary message to sql_errors and returned the
     * 500 envelope. Reproduce that exactly instead of the default 422.
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
