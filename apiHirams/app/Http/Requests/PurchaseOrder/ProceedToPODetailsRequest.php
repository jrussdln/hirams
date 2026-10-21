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
            // The freight charge on the PO — optional, but never negative.
            'dFreight'           => 'nullable|numeric|min:0',
        ];
    }
}
