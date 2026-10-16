<?php

namespace App\Http\Requests\PurchaseOrderOption;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\ValidationException;

/**
 * Behaviour preservation: addToCart() wrapped `$request->validate()` in
 * `try { } catch (Exception $e)`, and ValidationException extends Exception —
 * so a failure was returned as this 500 envelope (`error` = the
 * ValidationException message, no sql_errors logging), not Laravel's 422 nor
 * ApiRequest's logged 500.
 */
class AddToCartPurchaseOrderOptionRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'nPurchaseItemId' => 'required|integer',
            'nUserId'         => 'required|integer',
            'nStatus'         => 'required|string', // ✅ '110' from frontend
            'isManagement'    => 'required|boolean',
        ];
    }

    protected function failedValidation(Validator $validator)
    {
        // The old catch block returned $e->getMessage() of the very
        // ValidationException the default pipeline would have thrown.
        $error = (new ValidationException($validator))->getMessage();

        throw new HttpResponseException(response()->json([
            'message' => 'Failed to add to cart.',
            'error'   => $error,
        ], 500));
    }
}
