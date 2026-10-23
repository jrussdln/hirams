<?php

namespace App\Http\Requests\Assignee;

use App\Http\Requests\ApiRequest;

class TransferAssigneeVouchersRequest extends ApiRequest
{
    protected string $entityName       = 'Assignee vouchers';
    protected string $failedMessageKey = 'update_failed';

    public function rules(): array
    {
        return [
            'nTargetAssigneeId' => 'required|integer|exists:tblassignees,nAssigneeId',
            'voucherIds'        => 'nullable|array',
            'voucherIds.*'      => 'integer',
        ];
    }
}
