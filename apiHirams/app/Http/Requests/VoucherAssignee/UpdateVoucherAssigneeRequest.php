<?php

namespace App\Http\Requests\VoucherAssignee;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

/**
 * update() wrapped `$request->validate()` in
 * `catch (ValidationException $e) { … 422 … }`, so a failure came back as
 * {"message":"Validation failed.","errors":{…}} with a 422 — NOT Laravel's
 * default envelope. failedValidation() below reproduces that exact body
 * (ValidationException::errors() is `$validator->errors()->messages()`).
 */
class UpdateVoucherAssigneeRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            // ❌ REMOVED nCompanyId validation
            'strParticular' => 'required|string',
            'nQuantity'     => 'nullable|integer|min:1',
            'strUOM'        => 'nullable|string|max:20',
            'dAmount'       => 'required|numeric|min:0.01',
            // Omitted from the request → absent from $validated → the
            // stored dEWT is left untouched rather than reset to 0.
            'dEWT'          => 'nullable|numeric|min:0',
        ];
    }

    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(response()->json([
            'message' => 'Validation failed.',
            'errors'  => $validator->errors()->messages(),
        ], 422));
    }
}
