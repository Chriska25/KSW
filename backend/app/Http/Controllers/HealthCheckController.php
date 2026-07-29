<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;

class HealthCheckController extends Controller
{
    /**
     * Endpoint d'état de santé du système pour le monitoring (Uptime)
     */
    public function check(): JsonResponse
    {
        $dbStatus = false;
        try {
            DB::connection()->getPdo();
            $dbStatus = true;
        } catch (\Exception $e) {
            $dbStatus = false;
        }

        $redisStatus = false;
        try {
            Redis::ping();
            $redisStatus = true;
        } catch (\Exception $e) {
            $redisStatus = false;
        }

        $healthy = $dbStatus && $redisStatus;

        return response()->json([
            'status' => $healthy ? 'healthy' : 'unhealthy',
            'timestamp' => now()->toIso8601String(),
            'services' => [
                'database_postgresql' => $dbStatus ? 'up' : 'down',
                'cache_redis' => $redisStatus ? 'up' : 'down',
                'app_laravel' => 'up',
            ],
        ], $healthy ? 200 : 503);
    }
}
