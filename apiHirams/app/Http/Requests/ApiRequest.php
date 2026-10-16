<?php

namespace App\Http\Requests;

use App\Models\SqlErrors;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

/**
 * Base request for the API.
 *
 * Behaviour-preserving detail: the controllers wrapped `$request->validate()`
 * in `try { } catch (Exception $e)`, and `ValidationException extends Exception`
 * — so a validation failure was previously caught and returned through
 * `handleException()` as a **500** envelope (and logged to `sql_errors`),
 * not Laravel's default 422.
 *
 * `failedValidation()` below reproduces that exact contract so moving the rules
 * into FormRequests is a pure refactor. To switch to standard 422 responses
 * later, delete this override.
 */
abstract class ApiRequest extends FormRequest
{
    /** Human entity name used in the message, e.g. 'Supplier'. */
    protected string $entityName = 'Record';

    /** Translations key used when validation fails, e.g. 'create_failed'. */
    protected string $failedMessageKey = 'create_failed';

    protected function failedValidation(Validator $validator)
    {
        $error = $validator->errors()->first();

        SqlErrors::create([
            'dtDate'   => now(),
            'strError' => $error,
        ]);

        throw new HttpResponseException(response()->json([
            'message' => __("messages.{$this->failedMessageKey}", ['name' => $this->entityName]),
            'error'   => $error,
        ], 500));
    }
}
