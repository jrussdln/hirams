<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SqlErrors;
use Exception;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Shared base for every API controller.
 *
 * Centralises the cross-cutting concerns that were previously copy-pasted
 * into each controller:
 *   - exception logging + the standard 500 envelope
 *   - the standard 404 envelope
 *   - success envelopes (200 / 201)
 *   - the repeated LIKE-search block
 */
abstract class ApiController extends Controller
{
    /**
     * Log the exception to `sql_errors` and return the standard 500 envelope.
     */
    protected function handleException(Exception $e, string $messageKey, string $entityName): JsonResponse
    {
        SqlErrors::create([
            'dtDate'   => now(),
            'strError' => $e->getMessage(),
        ]);

        return response()->json([
            'message' => __("messages.{$messageKey}", ['name' => $entityName]),
            'error'   => $e->getMessage(),
        ], 500);
    }

    /**
     * Standard 404 envelope.
     */
    protected function notFound(string $entityName): JsonResponse
    {
        return response()->json([
            'message' => __('messages.not_found', ['name' => $entityName]),
        ], 404);
    }

    /**
     * Standard 200 envelope: { "message": ..., ...$payload }.
     */
    protected function ok(string $message, array $payload = []): JsonResponse
    {
        return response()->json(array_merge(['message' => $message], $payload));
    }

    /**
     * Standard 201 envelope: { "message": ..., ...$payload }.
     */
    protected function created(string $message, array $payload = []): JsonResponse
    {
        return response()->json(array_merge(['message' => $message], $payload), 201);
    }

    /**
     * Error envelope (4xx/5xx) with an optional raw error string.
     */
    protected function fail(string $message, int $status = 400, ?string $error = null): JsonResponse
    {
        return response()->json(
            array_filter(['message' => $message, 'error' => $error]),
            $status
        );
    }

    /**
     * Apply the repeated OR'd LIKE search that most index() methods hand-rolled.
     *
     *   $this->applySearch(Supplier::query(), $request, ['strSupplierName', 'strAddress']);
     */
    protected function applySearch(Builder $query, Request $request, array $columns, string $param = 'search'): Builder
    {
        $term = trim((string) $request->input($param, ''));

        if ($term !== '') {
            $query->where(function (Builder $q) use ($term, $columns) {
                foreach (array_values($columns) as $index => $column) {
                    $method = $index === 0 ? 'where' : 'orWhere';
                    $q->{$method}($column, 'LIKE', "%{$term}%");
                }
            });
        }

        return $query;
    }
}
