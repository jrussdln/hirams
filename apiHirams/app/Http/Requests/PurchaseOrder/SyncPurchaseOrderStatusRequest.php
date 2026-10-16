<?php

namespace App\Http\Requests\PurchaseOrder;

class SyncPurchaseOrderStatusRequest extends PurchaseOrderRequest
{
    public function rules(): array
    {
        return [
            'nPurchaseOrderId'  => 'required|integer|exists:tblpurchaseorders,nPurchaseOrderId',
            'nPurchaseItemId'   => 'required|integer',
            'nUserId'           => 'nullable|integer',
            'nReceivedStatus'   => 'required|string',
            'nDeliveredStatus'  => 'required|string',
            'nPaidStatus'       => 'required|string',
        ];
    }
}
