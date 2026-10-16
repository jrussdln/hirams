<?php

namespace App\Http\Requests\PricingSet;

use App\Http\Requests\ApiRequest;
use App\Models\SqlErrors;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\ValidationException;

class UpdatePricingSetRequest extends ApiRequest
{
    protected string $entityName       = 'Pricing Set';
    protected string $failedMessageKey = 'update_failed';

    public function rules(): array
    {
        return [
            'strName' => 'sometimes|required|string|max:255',
            'bChosen' => 'sometimes|boolean',
        ];
    }

    /**
     * Behaviour preservation: update() had no ValidationException catch (only
     * ModelNotFoundException and Exception), so a failure fell through to
     * catch (Exception) — handleException() logged the ValidationException
     * summary message to sql_errors and returned the 500 envelope. Reproduce
     * that exactly instead of the default 422.
     */
    protected function failedValidation(Validator $validator)
    {
        $exception = new ValidationException($validator);

        SqlErrors::create([
            'dtDate'   => now(),
            'strError' => $exception->getMessage(),
        ]);

        throw new HttpResponseException(response()->json([
            'message' => __("messages.{$this->failedMessageKey}", ['name' => $this->entityName]),
            'error'   => $exception->getMessage(),
        ], 500));
    }
}
