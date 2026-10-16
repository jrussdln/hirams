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
            // Set by the For Delivery / Delivered view, where every PO
            // sharing the item sits on one card — cancelling the card
            // cancels all of them.
            'cancelShared'     => 'sometimes|boolean',
        ];
    }
}
