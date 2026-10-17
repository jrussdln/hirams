<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Rejects any request from a user whose cStatus is not 'A'.
 *
 * Sanctum only proves "this token is valid" — it never looks at the user's
 * status — so a token outlives a deactivation unless something checks. This
 * runs right after auth:sanctum on every protected route, so a user who is
 * deactivated mid-session is cut off on their very next request instead of
 * staying logged in.
 *
 * Returns 401 (not 403) on purpose: the frontend's axios interceptor treats
 * 401 as "session expired" and auto-logs-out, which is the behaviour we want.
 */
class EnsureUserIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || $user->cStatus !== 'A') {
            return response()->json([
                'success' => false,
                'message' => 'Your account is no longer active. Please contact the administrator.',
            ], 401);
        }

        return $next($request);
    }
}
