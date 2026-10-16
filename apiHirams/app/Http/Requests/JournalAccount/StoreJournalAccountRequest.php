<?php

namespace App\Http\Requests\JournalAccount;

use Illuminate\Foundation\Http\FormRequest;

/**
 * POST /journal-accounts
 *
 * Extends the framework's FormRequest directly (NOT ApiRequest): the original
 * controller had no try/catch, so a failed `$request->validate()` bubbled up
 * as Laravel's default 422. That contract is preserved here.
 */
class StoreJournalAccountRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'strAccountName'   => 'required|string|max:50',
            'nParentAccountId' => 'nullable|integer|exists:tbljournalaccounts,nJournalAccountId',
            'cAccountType'     => 'nullable|in:C,S,F,E',
        ];
    }
}
