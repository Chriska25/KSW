<?php

namespace App\Domains\Booking\Http\Controllers;

use App\Domains\Booking\Models\Category;
use App\Domains\Booking\Models\Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Str;

class ServiceAdminController extends Controller
{
    /**
     * Liste des services avec filtres par catégorie, statut et recherche
     */
    public function index(Request $request): JsonResponse
    {
        $query = Service::with('category');

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->filled('status')) {
            $isActive = $request->status === 'published';
            $query->where('is_active', $isActive);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('short_description', 'like', "%{$search}%");
            });
        }

        $services = $query->orderBy('display_order')->get();
        $categories = Category::all();

        return response()->json([
            'data' => $services,
            'categories' => $categories,
        ]);
    }

    /**
     * Création d'une nouvelle prestation
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:150',
            'category_id' => 'nullable|uuid',
            'short_description' => 'required|string',
            'full_description' => 'required|string',
            'price' => 'required|numeric|min:0',
            'deposit_percentage' => 'required|numeric|min:0|max:100',
            'duration_minutes' => 'required|integer|min:15',
            'included_photos_count' => 'required|integer|min:1',
            'cover_image_path' => 'required|string',
            'is_active' => 'required|boolean',
            'seo_title' => 'nullable|string|max:150',
            'seo_description' => 'nullable|string',
        ]);

        $validated['slug'] = Str::slug($validated['title']) . '-' . Str::random(4);

        $service = Service::create($validated);

        return response()->json([
            'message' => 'Prestation créée avec succès',
            'data' => $service->load('category'),
        ], 201);
    }

    /**
     * Affichage d'une prestation
     */
    public function show(string $id): JsonResponse
    {
        $service = Service::with('category')->findOrFail($id);
        return response()->json(['data' => $service]);
    }

    /**
     * Mise à jour d'une prestation
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $service = Service::findOrFail($id);

        $validated = $request->validate([
            'title' => 'sometimes|string|max:150',
            'category_id' => 'nullable|uuid',
            'short_description' => 'sometimes|string',
            'full_description' => 'sometimes|string',
            'price' => 'sometimes|numeric|min:0',
            'deposit_percentage' => 'sometimes|numeric|min:0|max:100',
            'duration_minutes' => 'sometimes|integer|min:15',
            'included_photos_count' => 'sometimes|integer|min:1',
            'cover_image_path' => 'sometimes|string',
            'is_active' => 'sometimes|boolean',
            'seo_title' => 'nullable|string|max:150',
            'seo_description' => 'nullable|string',
        ]);

        if (isset($validated['title']) && $validated['title'] !== $service->title) {
            $validated['slug'] = Str::slug($validated['title']) . '-' . Str::random(4);
        }

        $service->update($validated);

        return response()->json([
            'message' => 'Prestation mise à jour avec succès',
            'data' => $service->load('category'),
        ]);
    }

    /**
     * Basculer le statut Publication / Brouillon
     */
    public function toggleActive(string $id): JsonResponse
    {
        $service = Service::findOrFail($id);
        $service->update(['is_active' => !$service->is_active]);

        return response()->json([
            'message' => $service->is_active ? 'Prestation publiée' : 'Prestation passée en brouillon',
            'is_active' => $service->is_active,
        ]);
    }

    /**
     * Suppression d'une prestation
     */
    public function destroy(string $id): JsonResponse
    {
        $service = Service::findOrFail($id);
        $service->delete();

        return response()->json(['message' => 'Prestation supprimée']);
    }
}
