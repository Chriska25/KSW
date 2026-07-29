<?php

namespace App\Domains\Content\Http\Controllers;

use App\Domains\Content\Models\Testimonial;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class TestimonialAdminController extends Controller
{
    /**
     * Liste publique des avis approuvés
     */
    public function listPublic(): JsonResponse
    {
        $testimonials = Testimonial::where('is_published', true)
            ->orderBy('display_order', 'asc')
            ->get();

        return response()->json(['data' => $testimonials]);
    }

    /**
     * Liste admin de tous les avis pour modération
     */
    public function index(): JsonResponse
    {
        $testimonials = Testimonial::orderBy('created_at', 'desc')->get();
        return response()->json(['data' => $testimonials]);
    }

    /**
     * Création d'un témoignage
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'client_name' => 'required|string|max:100',
            'client_role' => 'nullable|string|max:100',
            'avatar_path' => 'nullable|string',
            'rating' => 'required|integer|min:1|max:5',
            'content' => 'required|string',
            'is_published' => 'required|boolean',
        ]);

        $testimonial = Testimonial::create($validated);

        return response()->json(['message' => 'Témoignage créé avec succès', 'data' => $testimonial], 201);
    }

    /**
     * Bascule la publication / modération d'un avis
     */
    public function toggleApprove(string $id): JsonResponse
    {
        $testimonial = Testimonial::findOrFail($id);
        $testimonial->update(['is_published' => !$testimonial->is_published]);

        return response()->json([
            'message' => $testimonial->is_published ? 'Avis approuvé et publié' : 'Avis masqué',
            'is_published' => $testimonial->is_published,
        ]);
    }

    /**
     * Suppression d'un témoignage
     */
    public function destroy(string $id): JsonResponse
    {
        $testimonial = Testimonial::findOrFail($id);
        $testimonial->delete();

        return response()->json(['message' => 'Témoignage supprimé']);
    }
}
