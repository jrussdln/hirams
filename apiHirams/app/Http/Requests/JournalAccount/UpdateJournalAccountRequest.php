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
 * cAccountType matches the store rule (C, S, F, E). Legacy rows still carry
 * P — keeping it valid here so repairing/updating an old row never 422s, and
 * S is accepted too (it was missing, which broke updating ANY supplier-typed
 * account). The modal sends null to normalize no longer offered types.
 */
class UpdateJournalAccountRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'strAccountName'   => 'required|string|max:50',
            'nParentAccountId' => 'nullable|integer|exists:tbljournalaccounts,nJournalAccountId',
            'cAccountType'     => 'nullable|in:C,S,P,F,E',
        ];
    }
}
