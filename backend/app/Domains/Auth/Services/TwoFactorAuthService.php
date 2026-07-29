<?php

namespace App\Domains\Auth\Services;

use App\Domains\Auth\Models\User;
use Illuminate\Support\Facades\Cache;

class TwoFactorAuthService
{
    /**
     * Génère un code 2FA à 6 chiffres valide 10 minutes
     */
    public function generateCode(User $user): string
    {
        $code = (string) random_int(100000, 999999);
        $key = "2fa_code_{$user->id}";
        
        Cache::put($key, $code, now()->addMinutes(10));

        return $code;
    }

    /**
     * Vérifie si le code 2FA soumis est valide
     */
    public function verifyCode(User $user, string $code): bool
    {
        $key = "2fa_code_{$user->id}";
        $cachedCode = Cache::get($key);

        if ($cachedCode && $cachedCode === $code) {
            Cache::forget($key);
            return true;
        }

        return false;
    }
}
