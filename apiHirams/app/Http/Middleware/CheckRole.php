<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Role code mapping (from User model cUserType):
     *   M = Management (0) - highest/admin level
     *   G = General Manager (1)
     *   P = Procurement Officer (2)
     *   Y = Procurement Officer TL (3)
     *   A = Account Officer (4)
     *   X = Account Officer TL (5)
     *   F = Finance Officer (6)
     */

    public function handle(Request $request, Closure $next, ...$roles): JsonResponse
    {
        $user = $request->user();

        // If no user is authenticated, return 401
        if (! $user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        // Normalize $roles to an array
        $rolesArray = (array) $roles;

        // Check if user has any of the allowed role codes
        $hasAllowedRole = false;

        foreach ($rolesArray as $role) {
            // Check via user's cUserType field (character code)
            if (isset($user->cUserType) && $user->cUserType === $role) {
                $hasAllowedRole = true;
                break;
            }
        }

        if (! $hasAllowedRole) {
            // Return 403 Forbidden with consistent API envelope
            return response()->json([
                'message' => 'Forbidden. Insufficient permissions.',
            ], 403);
        }

        return response()->json([
            'message' => 'Authorized.',
        ], 200);
    }
}