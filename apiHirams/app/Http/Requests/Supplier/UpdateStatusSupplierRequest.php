<?php

namespace App\Http\Requests\Supplier;

use App\Http\Requests\ApiRequest;

class UpdateStatusSupplierRequest extends ApiRequest
{
    protected string $entityName        = 'Supplier';
    protected string $failedMessageKey  = 'update_failed';

    public function rules(): array
    {
        return [
            'statusCode' => 'required|string|max:1',
        ];
    }
}
