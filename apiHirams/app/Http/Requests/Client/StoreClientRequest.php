<?php

namespace App\Http\Requests\Client;

use App\Http\Requests\ApiRequest;

class StoreClientRequest extends ApiRequest
{
    protected string $entityName = 'Client';
    protected string $failedMessageKey = 'create_failed';

    public function rules(): array
    {
        return [
            'strClientName' => 'required|string|max:100',
            'strClientNickName' => 'nullable|string|max:25',
            'strTIN' => 'nullable|string|max:17',
            'strAddress' => 'nullable|string|max:200',
            'strBusinessStyle' => 'nullable|string|max:20',
            'strContactPerson' => 'nullable|string|max:40',
            'strContactNumber' => 'nullable|string|max:50',
            'cStatus' => 'required|string|max:1',
        ];
    }

    /**
     * Sanitize the input data before validation.
     */
    protected function prepareForValidation(): void
    {
        // Trim all string fields to remove whitespace
        $this->merge([
            'strClientName' => trim($this->string('strClientName')),
            'strClientNickName' => $this->strClientNickName ? trim($this->strClientNickName) : null,
            'strTIN' => $this->strTIN ? trim($this->strTIN) : null,
            'strAddress' => $this->strAddress ? trim($this->strAddress) : null,
            'strBusinessStyle' => $this->strBusinessStyle ? trim($this->strBusinessStyle) : null,
            'strContactPerson' => $this->strContactPerson ? trim($this->strContactPerson) : null,
            'strContactNumber' => $this->strContactNumber ? trim($this->strContactNumber) : null,
        ]);
    }
}