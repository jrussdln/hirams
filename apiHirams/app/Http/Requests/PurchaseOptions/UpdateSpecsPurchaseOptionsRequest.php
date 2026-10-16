<?php

namespace App\Http\Requests\PurchaseOptions;

use App\Http\Requests\ApiRequest;

class UpdateSpecsPurchaseOptionsRequest extends ApiRequest
{
    protected string $entityName        = 'Purchase Option specs';
    protected string $failedMessageKey  = 'update_failed';

    public function rules(): array
    {
        return [
            'specs' => 'nullable|string|max:20000',
        ];
    }
}
