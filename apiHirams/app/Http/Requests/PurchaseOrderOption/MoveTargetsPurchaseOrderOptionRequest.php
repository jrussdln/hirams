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
class MoveTargetsPurchaseOrderOptionRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'nUserId'      => 'required|integer',
            'isManagement' => 'required|boolean',
        ];
    }

    protected function prepareForValidation(): void
    {
        // GET queries never carry a real boolean — axios serializes
        // `isManagement: true` as the WORD "true", which the strict
        // `boolean` rule rejects ("must be true or false").
        $value = $this->input('isManagement');
        if (is_string($value)) {
            $this->merge(['isManagement' => filter_var($value, FILTER_VALIDATE_BOOLEAN)]);
        }
    }

    protected function failedValidation(Validator $validator)
    {
        $error = (new ValidationException($validator))->getMessage();

        throw new HttpResponseException(response()->json([
            'message' => 'Failed to load move targets.',
            'error'   => $error,
        ], 500));
    }
}
