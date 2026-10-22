<?php

namespace App\Http\Requests\PurchaseOrder;

class UpdateCartStatusRequest extends PurchaseOrderRequest
{
    public function rules(): array
    {
        return [
            'nPurchaseOrderId' => 'required|integer|exists:tblpurchaseorders,nPurchaseOrderId',
            'nStatus'          => 'required|string',
            'nUserId'          => 'nullable|integer',
        ];
    }
}
