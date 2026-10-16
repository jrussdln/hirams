<?php

namespace App\Http\Requests\JournalAccount;

use Illuminate\Foundation\Http\FormRequest;

/**
 * GET /journal-accounts/unlinked-records?type=C|S&includeAccountId=
 *
 * Extends the framework's FormRequest directly (NOT ApiRequest): the original
 * controller had no try/catch, so a failed `$request->validate()` bubbled up
 * as Laravel's default 422. That contract is preserved here.
 */
class UnlinkedRecordsJournalAccountRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'type'             => 'required|in:C,S',
            'includeAccountId' => 'nullable|integer',
        ];
    }
}
