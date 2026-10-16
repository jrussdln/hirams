<?php

namespace App\Http\Requests\Voucher;

use Illuminate\Foundation\Http\FormRequest;

/**
 * updateStatus() used to call `$request->validate(['cStatus' => 'required'])`
 * inside a controller with NO try/catch — so a failure fell through to
 * Laravel's default ValidationException rendering (422 for API requests).
 *
 * Extending FormRequest directly (deliberately NOT ApiRequest) reproduces
 * exactly that: the default `failedValidation()` throws ValidationException,
 * which renders the same 422 payload the inline validate() used to.
 */
class UpdateStatusVoucherRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'cStatus' => 'required',
        ];
    }
}
