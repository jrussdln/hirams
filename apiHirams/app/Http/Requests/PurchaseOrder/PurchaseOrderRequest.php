<?php

namespace App\Http\Requests\PurchaseOrder;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

/**
 * Base request for the purchase-order endpoints.
 *
 * Behaviour-preserving detail: the original controller wrapped every
 * `$request->validate()` in `try { } catch (ValidationException $e)` and
 * returned a 422 envelope — so a validation failure must NOT become the
 * ApiRequest 500 + sql_errors envelope. `failedValidation()` below reproduces
 * the original body verbatim:
 *
 *     422 { "message": "Validation failed.", "errors": { ... } }
 *
 * and, like the original, does not log the failure to `sql_errors`.
 */
abstract class PurchaseOrderRequest extends FormRequest
{
    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(response()->json([
            'message' => 'Validation failed.',
            'errors' => $validator->errors()->messages(),
        ], 422));
    }
}
