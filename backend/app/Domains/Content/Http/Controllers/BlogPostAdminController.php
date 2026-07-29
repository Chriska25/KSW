<?php

namespace App\Domains\Content\Http\Controllers;

use App\Domains\Content\Models\BlogCategory;

use App\Domains\Content\Models\BlogPost;
use App\Domains\Content\Models\Tag;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Str;

class BlogPostAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = BlogPost::with(['author', 'category', 'tags', 'comments']);

        if ($request->filled('category_id')) {
            $query->where('blog_category_id', $request->category_id);
        }

        if ($request->filled('status')) {
            $isPublished = $request->status === 'published';
            $query->where('is_published', $isPublished);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('excerpt', 'like', "%{$search}%");
            });
        }

        $posts = $query->orderBy('created_at', 'desc')->get();
        $categories = BlogCategory::all();

        return response()->json([
            'data' => $posts,
            'categories' => $categories,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:200',
            'blog_category_id' => 'nullable|uuid',
            'excerpt' => 'required|string',
            'content' => 'required|string',
            'featured_image_path' => 'required|string',
            'is_published' => 'required|boolean',
            'seo_title' => 'nullable|string|max:150',
            'seo_description' => 'nullable|string',
            'tags' => 'array',
        ]);

        $validated['author_id'] = $request->user()?->id ?? BlogPost::first()?->author_id;
        $validated['slug'] = Str::slug($validated['title']) . '-' . Str::random(4);
        if ($validated['is_published']) {
            $validated['published_at'] = now();
        }

        $post = BlogPost::create($validated);

        if (!empty($validated['tags'])) {
            $post->tags()->sync($validated['tags']);
        }

        return response()->json([
            'message' => 'Article de blog créé avec succès',
            'data' => $post->load(['author', 'category', 'tags']),
        ], 201);
    }

    public function show(string $id): JsonResponse
    {
        $post = BlogPost::with(['author', 'category', 'tags', 'comments'])->findOrFail($id);
        return response()->json(['data' => $post]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $post = BlogPost::findOrFail($id);

        $validated = $request->validate([
            'title' => 'sometimes|string|max:200',
            'blog_category_id' => 'nullable|uuid',
            'excerpt' => 'sometimes|string',
            'content' => 'sometimes|string',
            'featured_image_path' => 'sometimes|string',
            'is_published' => 'sometimes|boolean',
            'seo_title' => 'nullable|string|max:150',
            'seo_description' => 'nullable|string',
            'tags' => 'array',
        ]);

        if (isset($validated['is_published']) && $validated['is_published'] && !$post->is_published) {
            $validated['published_at'] = now();
        }

        $post->update($validated);

        if (isset($validated['tags'])) {
            $post->tags()->sync($validated['tags']);
        }

        return response()->json([
            'message' => 'Article mis à jour avec succès',
            'data' => $post->load(['author', 'category', 'tags']),
        ]);
    }

    public function togglePublish(string $id): JsonResponse
    {
        $post = BlogPost::findOrFail($id);
        $newStatus = !$post->is_published;
        
        $post->update([
            'is_published' => $newStatus,
            'published_at' => $newStatus ? now() : $post->published_at,
        ]);

        return response()->json([
            'message' => $newStatus ? 'Article publié' : 'Article passé en brouillon',
            'is_published' => $newStatus,
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        $post = BlogPost::findOrFail($id);
        $post->delete();

        return response()->json(['message' => 'Article supprimé']);
    }
}
