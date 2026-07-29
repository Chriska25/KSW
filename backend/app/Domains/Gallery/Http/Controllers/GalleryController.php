<?php

namespace App\Domains\Gallery\Http\Controllers;

use App\Domains\Gallery\Models\Gallery;
use App\Domains\Gallery\Models\Photo;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Hash;

class GalleryController extends Controller
{
    /**
     * Liste des galeries publiques
     */
    public function listPublicGalleries(): JsonResponse
    {
        $galleries = Gallery::where('is_private', false)
            ->with(['photos' => fn ($q) => $q->take(6)])
            ->get();

        return response()->json(['data' => $galleries]);
    }

    /**
     * Affichage d'une galerie privée par clé d'accès avec vérification d'expiration et mot de passe
     */
    public function showPrivateGallery(Request $request, string $accessKey): JsonResponse
    {
        $gallery = Gallery::where('access_key', $accessKey)
            ->with(['albums.photos', 'photos'])
            ->firstOrFail();

        // Vérification de la date d'expiration
        if ($gallery->expires_at && now()->greaterThan($gallery->expires_at)) {
            return response()->json([
                'message' => 'Cette galerie privée a expiré. Veuillez contacter le photographe.',
                'is_expired' => true,
            ], 403);
        }

        // Vérification du mot de passe si configuré
        if ($gallery->password_hash) {
            $password = $request->header('X-Gallery-Password') ?? $request->input('password');
            if (!$password || !Hash::check($password, $gallery->password_hash)) {
                return response()->json([
                    'message' => 'Mot de passe de galerie requis ou incorrect.',
                    'requires_password' => true,
                ], 401);
            }
        }

        return response()->json(['data' => $gallery]);
    }

    /**
     * Basculer l'état favori d'une photo pour le client
     */
    public function toggleFavorite(string $id): JsonResponse
    {
        $photo = Photo::findOrFail($id);
        $photo->update(['is_favorite_by_client' => !$photo->is_favorite_by_client]);

        return response()->json([
            'message' => $photo->is_favorite_by_client ? 'Photo ajoutée aux favoris' : 'Photo retirée des favoris',
            'is_favorite' => $photo->is_favorite_by_client,
        ]);
    }

    /**
     * Génère le lien de téléchargement HD sécurisé (ZIP ou fichier individuel)
     */
    public function generateDownloadLink(string $id): JsonResponse
    {
        $gallery = Gallery::findOrFail($id);

        if ($gallery->expires_at && now()->greaterThan($gallery->expires_at)) {
            return response()->json(['message' => 'Téléchargement impossible : galerie expirée.'], 403);
        }

        return response()->json([
            'download_url' => "/api/v1/galleries/{$id}/zip-download",
            'expires_at' => now()->addHours(24)->toIso8601String(),
        ]);
    }
}
