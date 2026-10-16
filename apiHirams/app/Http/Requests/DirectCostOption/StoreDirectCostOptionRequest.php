<?php

namespace App\Http\Requests\DirectCostOption;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Behaviour preservation: store() called `$request->validate()` with NO
 * try/catch, so failures previously bubbled to Laravel's DEFAULT 422.
 * Extending the base FormRequest (not ApiRequest) keeps that contract.
 */
class StoreDirectCostOptionRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'strName' => 'required|string|max:20',
        ];
    }
}
