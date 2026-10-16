<?php

namespace App\Http\Requests\PurchaseOrder;

class UpdateCartStatusBulkRequest extends PurchaseOrderRequest
{
    public function rules(): array
    {
        return [
            'nPurchaseOrderIds'   => 'required|array|min:1',
            'nPurchaseOrderIds.*' => 'integer|exists:tblpurchaseorders,nPurchaseOrderId',
            'nStatus'             => 'required|string',
            'nUserId'             => 'nullable|integer',
        ];
    }
}
