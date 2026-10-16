<?php

namespace App\Http\Requests\ItemPricing;

use App\Models\SqlErrors;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\ValidationException;

/**
 * Base request for the item-pricing endpoints.
 *
 * Behaviour-preserving detail: these validations sat inside
 * `try { } catch (Exception $e)` blocks whose handler logged the failure to
 * `sql_errors` and returned a CUSTOM 500 envelope (`success` / `message` /
 * `error`) — not the ApiRequest message/error envelope, and not a 422.
 *
 * `failedValidation()` below reproduces the original contract exactly: the
 * logged string and the `error` field use the same message the caught
 * ValidationException carried (Laravel's error summary), and the `message`
 * field is the one that method's catch block returned.
 *
 * To switch to standard 422 responses later, delete this override.
 */
abstract class ItemPricingRequest extends FormRequest
{
    /** Message returned in the custom 500 envelope, e.g. 'Failed to create item pricing'. */
    protected string $failureMessage = 'Failed';

    protected function failedValidation(Validator $validator)
    {
        // Same message the original caught ValidationException carried.
        $exception = new ValidationException($validator);

        SqlErrors::create([
            'dtDate'   => now(),
            'strError' => $exception->getMessage(),
        ]);

        throw new HttpResponseException(response()->json([
            'success' => false,
            'message' => $this->failureMessage,
            'error'   => $exception->getMessage(),
        ], 500));
    }
}
