<?php

namespace App\Http\Middleware;

use App\Domains\Shared\Models\ActivityLog;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ActivityLogger
{
    /**
     * Enregistre l'activité utilisateur / admin pour audit de sécurité
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Enregistrer uniquement les actions de modification (POST, PUT, PATCH, DELETE)
        if (in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE'])) {
            ActivityLog::create([
                'user_id' => $request->user()?->id,
                'action' => $request->method() . ' ' . $request->path(),
                'description' => "Action effectuée par IP " . $request->ip(),
                'ip_address' => $request->ip(),
                'user_agent' => substr($request->userAgent() ?? '', 0, 255),
            ]);
        }

        return $response;
    }
}
