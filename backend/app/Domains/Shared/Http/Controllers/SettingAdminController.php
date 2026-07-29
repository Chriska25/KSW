<?php

namespace App\Domains\Shared\Http\Controllers;

use App\Domains\Shared\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class SettingAdminController extends Controller
{
    /**
     * Récupère tous les paramètres enregistrés en BDD
     */
    public function index(): JsonResponse
    {
        $settings = Setting::all()->pluck('value', 'key')->map(function ($val) {
            $decoded = json_decode($val, true);
            return json_last_error() === JSON_ERROR_NONE ? $decoded : $val;
        });
        return response()->json(['data' => $settings]);
    }

    /**
     * Enregistre et persiste les paramètres modifiés
     */
    public function update(Request $request): JsonResponse
    {
        $settingsData = $request->input('settings', []);

        foreach ($settingsData as $key => $value) {
            Setting::updateOrCreate(
                ['key' => $key],
                [
                    'value' => is_array($value) || is_bool($value) ? json_encode($value) : (string) $value,
                    'group' => 'general',
                ]
            );
        }

        return response()->json([
            'message' => 'Paramètres enregistrés et persistés avec succès en base de données',
            'data' => $settingsData,
        ]);
    }
}
