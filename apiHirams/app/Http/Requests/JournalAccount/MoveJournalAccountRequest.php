<?php

namespace App\Http\Requests\JournalAccount;

use Illuminate\Foundation\Http\FormRequest;

/**
 * PATCH /journal-accounts/{journalAccount}/move
 *
 * Extends the framework's FormRequest directly (NOT ApiRequest): the original
 * controller had no try/catch, so a failed `$request->validate()` bubbled up
 * as Laravel's default 422. That contract is preserved here.
 */
class MoveJournalAccountRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'nParentAccountId' => 'required|integer|exists:tbljournalaccounts,nJournalAccountId',
        ];
    }
}
