<?php

namespace App\Http\Requests\Company;

use App\Http\Requests\ApiRequest;

class StoreCompanyRequest extends ApiRequest
{
    protected string $entityName       = 'Company';
    protected string $failedMessageKey = 'create_failed';

    public function rules(): array
    {
        return [
            'nCompanyId'         => 'integer|null',
            'strCompanyName'     => 'required|string|max:50',
            'strCompanyNickName' => 'nullable|string|max:20',
            'strTIN'             => 'nullable|string|max:17',
            'strAddress'         => 'nullable|string|max:200',
            'strEmail'           => 'nullable|email|max:50',
            'strLogo'            => 'nullable|string|max:50',
            'strPhoneNo'         => 'nullable|string|max:20',
            'bVAT'               => 'required|boolean',
            'bEWT'               => 'required|boolean',
        ];
    }
}
