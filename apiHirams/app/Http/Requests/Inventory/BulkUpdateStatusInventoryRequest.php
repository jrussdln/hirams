<?php

namespace App\Http\Requests\Inventory;

use App\Http\Requests\ApiRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Validation\ValidationException;

class BulkUpdateStatusInventoryRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'ids'     => 'required|array|min:1',
            'ids.*'   => 'integer',
            'cStatus' => 'required|string|max:1',
        ];
    }

    /**
     * Behaviour preservation: bulkUpdateStatus() called validate() OUTSIDE any
     * try/catch, so the ValidationException bubbled up to the framework
     * exception handler and Laravel rendered its default 422 JSON envelope
     * ({ "message": <summary>, "errors": {...} }) — no sql_errors logging.
     * Re-throw the stock exception instead of ApiRequest's 500 envelope.
     */
    protected function failedValidation(Validator $validator)
    {
        throw new ValidationException($validator);
    }
}
