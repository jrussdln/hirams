<?php

namespace App\Http\Requests\SupplierContact;

use App\Http\Requests\ApiRequest;

class StoreSupplierContactRequest extends ApiRequest
{
    protected string $entityName       = 'Supplier Contact';
    protected string $failedMessageKey = 'create_failed';

    public function rules(): array
    {
        return [
            'nSupplierId'   => 'required|integer',
            'strName'       => 'required|string|max:50',
            'strNumber'     => 'required|string|max:50',
            'strPosition'   => 'nullable|string|max:50',
            'strDepartment' => 'nullable|string|max:50',
        ];
    }
}
