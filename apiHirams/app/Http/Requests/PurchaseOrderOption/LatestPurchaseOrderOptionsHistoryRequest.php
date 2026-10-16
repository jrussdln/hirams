<?php

namespace App\Http\Requests\PurchaseOrderOption;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\ValidationException;

/**
 * Behaviour preservation: latestPurchaseOrderOptionsHistory() wrapped
 * `$request->validate()` in `try { } catch (Exception $e)`, and
 * ValidationException extends Exception — so a failure was returned as this
 * 500 envelope (`error` = the ValidationException message) WITHOUT logging to
 * `sql_errors`, not Laravel's default 422 nor ApiRequest's logged 500.
 */
class LatestPurchaseOrderOptionsHistoryRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'nPurchaseItemId'   => 'required|array|min:1',
            'nPurchaseItemId.*' => 'integer',
        ];
    }

    protected function failedValidation(Validator $validator)
    {
        // The old catch block returned $e->getMessage() of the very
        // ValidationException the default pipeline would have thrown.
        $error = (new ValidationException($validator))->getMessage();

        throw new HttpResponseException(response()->json([
            'message' => 'Failed to retrieve histories.',
            'error'   => $error,
        ], 500));
    }
}
