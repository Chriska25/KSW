<?php

namespace App\Domains\Gallery\Http\Controllers;

use App\Domains\Gallery\Models\Album;
use App\Domains\Gallery\Models\Gallery;
use App\Domains\Gallery\Services\PhotoProcessingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Str;

class GalleryAdminController extends Controller
{
    public function __construct(
        protected PhotoProcessingService $photoService
    ) {}

    public function index(): JsonResponse
    {
        $galleries = Gallery::with(['client', 'albums', 'photos'])->get();
        return response()->json(['data' => $galleries]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:150',
            'client_id' => 'nullable|uuid',
            'category_id' => 'nullable|uuid',
            'is_private' => 'required|boolean',
        ]);

        $validated['slug'] = Str::slug($validated['title']) . '-' . Str::random(4);
        $validated['access_key'] = strtoupper(Str::random(12));

        $gallery = Gallery::create($validated);

        return response()->json(['message' => 'Galerie créée avec succès', 'data' => $gallery], 201);
    }

    public function createAlbum(Request $request, string $galleryId): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:100',
        ]);

        $album = Album::create([
            'gallery_id' => $galleryId,
            'title' => $validated['title'],
        ]);

        return response()->json(['message' => 'Album créé', 'data' => $album], 201);
    }

    public function uploadPhotos(Request $request, string $galleryId): JsonResponse
    {
        $request->validate([
            'photos' => 'required|array',
            'photos.*' => 'image|max:20480', // Max 20MB per photo
            'album_id' => 'nullable|uuid',
        ]);

        $processedPhotos = [];
        foreach ($request->file('photos') as $file) {
            $photo = $this->photoService->processAndSave($file, $galleryId, $request->album_id);
            $processedPhotos[] = $photo;
        }

        return response()->json([
            'message' => count($processedPhotos) . ' photos uploadées et compressées avec succès',
            'data' => $processedPhotos,
        ]);
    }
}
