<?php

namespace App\Http\Requests\Client;

use App\Http\Requests\ApiRequest;

class UpdateClientRequest extends ApiRequest
{
    protected string $entityName = 'Client';
    protected string $failedMessageKey = 'update_failed';

    public function rules(): array
    {
        return [
            'id' => 'required|integer|exists:tblusers,nUserId',
            'strClientName' => 'sometimes|required|string|max:100',
            'strClientNickName' => 'sometimes|nullable|string|max:25',
            'strTIN' => 'sometimes|nullable|string|max:17',
            'strAddress' => 'sometimes|nullable|string|max:200',
            'strBusinessStyle' => 'sometimes|nullable|string|max:20',
            'strContactPerson' => 'sometimes|nullable|string|max:40',
            'strContactNumber' => 'sometimes|nullable|string|max:50',
            'cStatus' => 'sometimes|required|string|max:1',
        ];
    }

    /**
     * Sanitize the input data before validation.
     */
    protected function prepareForValidation(): void
    {
        // Trim string fields to remove whitespace
        $this->merge([
            'strClientName' => $this->strClientName ? trim($this->strClientName) : null,
            'strClientNickName' => $this->strClientNickName ? trim($this->strClientNickName) : null,
            'strTIN' => $this->strTIN ? trim($this->strTIN) : null,
            'strAddress' => $this->strAddress ? trim($this->strAddress) : null,
            'strBusinessStyle' => $this->strBusinessStyle ? trim($this->strBusinessStyle) : null,
            'strContactPerson' => $this->strContactPerson ? trim($this->strContactPerson) : null,
            'strContactNumber' => $this->strContactNumber ? trim($this->strContactNumber) : null,
        ]);
    }
}