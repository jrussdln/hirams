<?php

namespace App\Http\Requests\Client;

use App\Http\Requests\ApiRequest;

class UpdateStatusClientRequest extends ApiRequest
{
    protected string $entityName        = 'Client';
    protected string $failedMessageKey  = 'update_failed';

    public function rules(): array
    {
        return [
            'cStatus' => 'required|string|max:1',
        ];
    }
}
