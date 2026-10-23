<?php

namespace App\Http\Requests\PurchaseOrderOption;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\ValidationException;

/**
 * Same behaviour-preservation contract as its cart siblings
 * (AddToCartPurchaseOrderOptionRequest): the legacy catch block returned
 * `ValidationException::getMessage()` as a 500 envelope, so a failure here
 * reproduces exactly that instead of Laravel's 422.
 */
class MovePurchaseOrderOptionRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'nPurchaseItemId'       => 'required|integer',
            'nTargetPurchaseOrderId' => 'required|integer',
            'nUserId'               => 'required|integer',
            'isManagement'          => 'required|boolean',
        ];
    }

    protected function prepareForValidation(): void
    {
        // Same normalization as its GET sibling — form-data / query-string
        // booleans arrive as the words "true" / "false", not real booleans.
        $value = $this->input('isManagement');
        if (is_string($value)) {
            $this->merge(['isManagement' => filter_var($value, FILTER_VALIDATE_BOOLEAN)]);
        }
    }

    protected function failedValidation(Validator $validator)
    {
        $error = (new ValidationException($validator))->getMessage();

        throw new HttpResponseException(response()->json([
            'message' => 'Failed to move item.',
            'error'   => $error,
        ], 500));
    }
}
