<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Reject requests from users whose cStatus is not 'A'. Runs after
        // auth:sanctum on every protected route (see routes/api.php).
        $middleware->alias([
            'active' => \App\Http\Middleware\EnsureUserIsActive::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // An unauthenticated API request must answer 401 — Laravel's default
        // rendering instead tries to REDIRECT to route('login'), which this
        // API-only app never defines, turning every dead-token request into
        // a 500 ("Route [login] not defined"). The SPA's interceptor then
        // had to sniff that 500 body to detect expiry; with a real 401 it
        // just matches status === 401 like any sane client.
        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json(['message' => 'Unauthenticated.'], 401);
            }
        });
    })->create();
