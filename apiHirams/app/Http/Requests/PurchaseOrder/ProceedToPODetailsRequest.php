<?php

namespace App\Http\Requests\PurchaseOrder;

class ProceedToPODetailsRequest extends PurchaseOrderRequest
{
    public function rules(): array
    {
        return [
            'nPurchaseOrderId'   => 'required|integer|exists:tblpurchaseorders,nPurchaseOrderId',
            'strShippingDetails' => 'required|string',
            'cPaymentTerms'      => 'required|string|max:1',
        ];
    }
}
