<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleAuthorization
{
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Non authentifié'], 401);
        }

        if (!$user->hasAnyRole($roles)) {
            return response()->json(['message' => 'Accès non autorisé pour ce rôle'], 403);
        }

        return $next($request);
    }
}
