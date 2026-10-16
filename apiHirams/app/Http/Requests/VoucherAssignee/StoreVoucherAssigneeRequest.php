<?php

namespace App\Http\Requests\VoucherAssignee;

use Illuminate\Foundation\Http\FormRequest;

/**
 * store() validated inline with NO try/catch around it, so a failure fell
 * through to Laravel's default ValidationException rendering (422 for API
 * requests). Extending FormRequest directly (deliberately NOT ApiRequest)
 * keeps that default `failedValidation()` behaviour byte-for-byte.
 */
class StoreVoucherAssigneeRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'nVoucherId'    => 'required|integer|exists:tblvouchers,nVoucherId',
            // ❌ REMOVED nCompanyId validation
            'nAssigneeId'   => 'required|integer',
            'strParticular' => 'required|string',
            'nQuantity'     => 'nullable|integer|min:1',
            'strUOM'        => 'nullable|string|max:20',
            'dAmount'       => 'required|numeric|min:0.01',
            // Per-line expanded withholding tax — summed across the voucher's
            // assignee lines for the voucher-level EWT total.
            'dEWT'          => 'nullable|numeric|min:0',
        ];
    }
}
