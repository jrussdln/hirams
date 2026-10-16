<?php

namespace App\Http\Requests\JournalAccount;

use Illuminate\Foundation\Http\FormRequest;

/**
 * PUT/PATCH /journal-accounts/{journalAccount}
 *
 * Extends the framework's FormRequest directly (NOT ApiRequest): the original
 * controller had no try/catch, so a failed `$request->validate()` bubbled up
 * as Laravel's default 422. That contract is preserved here.
 *
 * cAccountType allows P here where store allows S — exactly as the original
 * inline rules were written.
 */
class UpdateJournalAccountRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'strAccountName'   => 'required|string|max:50',
            'nParentAccountId' => 'nullable|integer|exists:tbljournalaccounts,nJournalAccountId',
            'cAccountType'     => 'nullable|in:C,P,F,E',
        ];
    }
}
