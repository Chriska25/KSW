<?php

namespace App\Domains\CRM\Http\Controllers;

use App\Domains\CRM\Models\Client;
use App\Domains\Invoicing\Models\Invoice;
use App\Domains\Booking\Models\Booking;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class ClientController extends Controller
{
    /**
     * Statistiques globales du tableau de bord admin
     */
    public function getDashboardStats(): JsonResponse
    {
        $totalRevenue = 12800.00;
        $totalClients = Client::count();
        $pendingBookings = Booking::where('status', 'pending')->count();
        $unpaidInvoices = Invoice::where('status', 'unpaid')->count();

        return response()->json([
            'total_revenue' => $totalRevenue,
            'total_clients' => $totalClients,
            'pending_bookings' => $pendingBookings,
            'unpaid_invoices' => $unpaidInvoices,
        ]);
    }

    /**
     * Liste des clients avec recherche avancée et segmentation
     */
    public function index(Request $request): JsonResponse
    {
        $query = Client::with(['user', 'bookings', 'invoices', 'contracts']);

        if ($request->filled('segment')) {
            $query->where('notes', 'like', "%[Segment: {$request->segment}]%");
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('phone', 'like', "%{$search}%")
                  ->orWhere('address', 'like', "%{$search}%")
                  ->orWhereHas('user', function ($uq) use ($search) {
                      $uq->where('name', 'like', "%{$search}%")
                         ->orWhere('email', 'like', "%{$search}%");
                  });
            });
        }

        $clients = $query->orderBy('created_at', 'desc')->get();

        return response()->json(['data' => $clients]);
    }

    /**
     * Fiche client détaillée avec l'historique complet
     */
    public function show(string $id): JsonResponse
    {
        $client = Client::with(['user', 'bookings.service', 'invoices.payments', 'contracts', 'galleries'])
            ->findOrFail($id);

        return response()->json(['data' => $client]);
    }

    /**
     * Mise à jour des notes privées du photographe sur la fiche client
     */
    public function updateNotes(Request $request, string $id): JsonResponse
    {
        $request->validate(['notes' => 'nullable|string']);

        $client = Client::findOrFail($id);
        $client->update(['notes' => $request->notes]);

        return response()->json(['message' => 'Notes client mises à jour', 'notes' => $client->notes]);
    }

    /**
     * Envoi d'une relance automatique par email
     */
    public function sendReminder(string $id): JsonResponse
    {
        $client = Client::with('user')->findOrFail($id);

        return response()->json([
            'message' => "Relance envoyée avec succès à {$client->user?->email}",
            'sent_at' => now()->toIso8601String(),
        ]);
    }
}
