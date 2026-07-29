<?php

namespace App\Domains\Shared\Http\Controllers;

use App\Domains\Shared\Models\ContactRequest;
use App\Domains\Shared\Models\Faq;
use App\Domains\Shared\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class ContactController extends Controller
{
    /**
     * Envoie une nouvelle demande de contact avec validation Captcha
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:30',
            'subject' => 'required|string|max:150',
            'message' => 'required|string',
            'captcha_token' => 'required|string',
        ]);

        $contactRequest = ContactRequest::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'subject' => $validated['subject'],
            'message' => $validated['message'],
            'is_read' => false,
        ]);

        // Alerte administrative
        Notification::create([
            'user_id' => null, // Global admin notification
            'type' => 'new_contact_message',
            'title' => 'Nouveau Message de Contact',
            'message' => "Message de {$validated['name']} : {$validated['subject']}",
            'data_json' => ['contact_id' => $contactRequest->id],
        ]);

        return response()->json([
            'message' => 'Votre message a été transmis avec succès. Le studio vous répondra sous 24h.',
            'data' => $contactRequest,
        ], 201);
    }

    /**
     * Liste des questions fréquentes (FAQ)
     */
    public function listFaqs(): JsonResponse
    {
        $faqs = Faq::where('is_published', true)->orderBy('display_order')->get();
        return response()->json(['data' => $faqs]);
    }
}
