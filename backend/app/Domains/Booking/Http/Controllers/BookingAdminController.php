<?php

namespace App\Domains\Booking\Http\Controllers;

use App\Domains\Booking\Models\Booking;
use App\Domains\Shared\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class BookingAdminController extends Controller
{
    /**
     * Liste des réservations pour le backoffice administrateur avec filtres par statut et date
     */
    public function index(Request $request): JsonResponse
    {
        $query = Booking::with(['client.user', 'service']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('date')) {
            $query->whereDate('booking_date', $request->date);
        }

        $bookings = $query->orderBy('booking_date', 'asc')->get();

        return response()->json(['data' => $bookings]);
    }

    /**
     * Validation / Changement de statut d'une réservation (pending -> confirmed, completed, cancelled)
     */
    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:pending,confirmed,completed,cancelled',
        ]);

        $booking = Booking::with(['client.user', 'service'])->findOrFail($id);
        $booking->update(['status' => $validated['status']]);

        // Créer une notification pour l'utilisateur
        if ($booking->client && $booking->client->user_id) {
            Notification::create([
                'user_id' => $booking->client->user_id,
                'type' => 'booking_status_updated',
                'title' => 'Statut de Réservation Mis à Jour',
                'message' => "Votre réservation {$booking->reference} est désormais au statut: {$booking->status}.",
                'data_json' => ['booking_id' => $booking->id, 'status' => $booking->status],
            ]);
        }

        return response()->json([
            'message' => "Réservation mise à jour avec succès (Statut: {$booking->status})",
            'data' => $booking,
        ]);
    }

    /**
     * Suppression d'une réservation
     */
    public function destroy(string $id): JsonResponse
    {
        $booking = Booking::findOrFail($id);
        $booking->delete();

        return response()->json(['message' => 'Réservation supprimée']);
    }
}
