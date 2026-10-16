<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyCsrfToken extends Middleware
{
    /**
     * The URIs that should be excluded from CSRF token validation.
     *
     * @var array<int, string>
     */
    protected $except = [
        // Add routes that don't need CSRF protection here
        // e.g., 'api/*',
        // e.g., 'healthcheck',
    ];

    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        return $this->validateCsrfToken($request, $next);
    }
}
