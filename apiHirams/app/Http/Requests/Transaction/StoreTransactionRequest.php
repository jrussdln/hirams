<?php

namespace App\Http\Requests\Transaction;

use App\Http\Requests\ApiRequest;

class StoreTransactionRequest extends ApiRequest
{
    protected string $entityName = 'Transaction';
    protected string $failedMessageKey = 'create_failed';

    public function rules(): array
    {
        return [
            'date' => 'required|date',
            'status' => 'required|string|in:draft,finalized,cancelled',
            'supplier_id' => 'nullable|exists:suppliers,nSupplierId',
            'created_by' => 'required|integer|exists:tblusers,nUserId',
            'items' => 'required|array',
            'items.*.id' => 'nullable|exists:item_pricings,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.rate' => 'required|numeric|min:0',
            'notes' => 'nullable|string|max:500',
        ];
    }

    /**
     * Sanitize the input data before validation.
     */
    protected function prepareForValidation(): void
    {
        // Trim string fields to remove leading/trailing whitespace
        if ($this->has('date')) {
            $this->merge(['date' => trim($this->string('date'))]);
        }
        if ($this->has('notes')) {
            $this->merge(['notes' => trim($this->string('notes'))]);
        }
        if ($this->has('supplier_id')) {
            $this->merge(['supplier_id' => $this->integer('supplier_id')]);
        }
        if ($this->has('created_by')) {
            $this->merge(['created_by' => $this->integer('created_by')]);
        }
    }
}