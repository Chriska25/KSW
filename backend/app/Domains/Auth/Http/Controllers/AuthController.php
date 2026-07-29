<?php

namespace App\Domains\Auth\Http\Controllers;

use App\Domains\Auth\Models\User;
use App\Domains\Auth\Services\TwoFactorAuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(
        protected TwoFactorAuthService $twoFactorService
    ) {}

    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Les identifiants fournis sont incorrects.'],
            ]);
        }

        // Si l'utilisateur est admin ou client VIP, exiger la vérification 2FA
        if ($user->hasRole('admin')) {
            $code = $this->twoFactorService->generateCode($user);

            return response()->json([
                'requires_2fa' => true,
                'user_id' => $user->id,
                'message' => "Un code 2FA à 6 chiffres a été envoyé par email. (Code de test local: {$code})",
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'requires_2fa' => false,
            'message' => 'Connexion réussie',
            'user' => $user->load('roles'),
            'access_token' => $token,
            'token_type' => 'Bearer',
        ]);
    }

    public function verify2fa(Request $request): JsonResponse
    {
        $request->validate([
            'user_id' => 'required|uuid',
            'code' => 'required|string|size:6',
        ]);

        $user = User::findOrFail($request->user_id);

        if (!$this->twoFactorService->verifyCode($user, $request->code)) {
            throw ValidationException::withMessages([
                'code' => ['Le code de vérification 2FA est invalide ou expiré.'],
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Double authentification validée avec succès',
            'user' => $user->load('roles'),
            'access_token' => $token,
            'token_type' => 'Bearer',
        ]);
    }

    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
        ]);

        $user = User::create([
            'first_name' => $validated['first_name'],
            'last_name' => $validated['last_name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        $user->assignRole('client');
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Inscription réussie. Un email de vérification a été transmis.',
            'user' => $user->load('roles'),
            'access_token' => $token,
        ], 201);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email']);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json(['message' => 'Si cette adresse existe, un lien de réinitialisation a été envoyé.']);
        }

        return response()->json(['message' => 'Instructions de réinitialisation envoyées par email.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $request->user()->load('roles')]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Déconnexion réussie']);
    }
}
