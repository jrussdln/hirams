<?php

namespace App\Http\Requests\Transaction;

use App\Http\Requests\ApiRequest;

class UpdateTransactionRequest extends ApiRequest
{
    protected string $entityName = 'Transaction';
    protected string $failedMessageKey = 'update_failed';

    public function rules(): array
    {
        return [
            'id' => 'required|integer|exists:transactions,nTransactionId',
            'status' => 'sometimes|string|in:draft,finalized,cancelled',
            'supplier_id' => 'nullable|exists:suppliers,nSupplierId',
            'nUserId' => 'nullable|integer',
            'items' => 'sometimes|required|array',
            'items.*.id' => 'nullable|exists:item_pricings,id',
            'items.*.quantity' => 'sometimes|integer|min:1',
            'items.*.rate' => 'sometimes|numeric|min:0',
            'notes' => 'sometimes|nullable|string|max:500',
        ];
    }

    /**
     * Sanitize the input data before validation.
     */
    protected function prepareForValidation(): void
    {
        // Trim string fields to remove leading/trailing whitespace
        if ($this->has('notes')) {
            $this->merge(['notes' => trim($this->string('notes'))]);
        }
        if ($this->has('supplier_id')) {
            $this->merge(['supplier_id' => $this->integer('supplier_id')]);
        }
        if ($this->has('nUserId')) {
            $this->merge(['nUserId' => $this->integer('nUserId')]);
        }
    }
}