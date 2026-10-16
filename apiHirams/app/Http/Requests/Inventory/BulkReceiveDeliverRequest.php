<?php

namespace App\Http\Requests\Inventory;

use App\Http\Requests\ApiRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class BulkReceiveDeliverRequest extends ApiRequest
{
    protected string $entityName       = 'Inventory';
    protected string $failedMessageKey = 'create_failed';

    public function rules(): array
    {
        // Receiving keeps its receipt number optional — delivering does not:
        // every delivery line has to carry one (the UI prefills it).
        $isDeliver = $this->input('mode') === 'deliver';

        return [
            'mode'                    => 'required|in:receive,deliver',
            'nPurchaseOrderId'        => 'nullable|integer',
            'nReceivedStatus'         => 'required_with:nPurchaseOrderId|string',
            'nDeliveredStatus'        => 'required_with:nPurchaseOrderId|string',
            'nPaidStatus'             => 'required_with:nPurchaseOrderId|string',
            'items'                   => 'required|array|min:1',
            'items.*.nPurchaseItemId' => 'required|integer',
            'items.*.nQuantity'       => 'required|integer|min:1',   // always positive; sign is set by mode
            'items.*.strReceiptNumber' => $isDeliver ? 'required|string' : 'nullable|string',
            'items.*.serials'         => 'nullable|array',
            'items.*.serials.*'       => 'string|max:50',
        ];
    }

    /**
     * Behaviour preservation: bulkReceiveDeliver() caught ValidationException
     * itself and returned this 422 envelope (without logging to sql_errors) —
     * both for rule failures here and for the over-receive/over-deliver
     * ValidationExceptions thrown inside its transaction — so override
     * ApiRequest's default 500 envelope.
     */
    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(response()->json([
            'message' => 'Validation failed',
            'errors'  => $validator->errors(),
        ], 422));
    }
}
