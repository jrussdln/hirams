<?php

namespace App\Http\Requests\VoucherSupplier;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

/**
 * store() wrapped `$request->validate()` in
 * `catch (ValidationException $e) { … 422 … }`, so a failure came back as
 * {"message":"Validation failed.","errors":{…}} with a 422 — NOT Laravel's
 * default envelope. failedValidation() below reproduces that exact body
 * (ValidationException::errors() is `$validator->errors()->messages()`).
 */
class StoreVoucherSupplierRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'nVoucherId'       => 'required|integer|exists:tblvouchers,nVoucherId',
            'nPurchaseOrderId' => 'required|integer|exists:tblpurchaseorders,nPurchaseOrderId',
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
