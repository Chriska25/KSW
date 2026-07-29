<?php

namespace App\Domains\Booking\Http\Controllers;

use App\Domains\Booking\Models\Booking;
use App\Domains\Booking\Models\Service;
use App\Domains\Booking\Services\BookingAvailabilityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Str;

class BookingController extends Controller
{
    public function __construct(
        protected BookingAvailabilityService $availabilityService
    ) {}

    public function listServices(): JsonResponse
    {
        $services = Service::where('is_active', true)->orderBy('display_order')->get();
        return response()->json(['data' => $services]);
    }

    public function showService(string $slug): JsonResponse
    {
        $service = Service::where('slug', $slug)->firstOrFail();
        return response()->json(['data' => $service]);
    }

    public function getAvailabilitySlots(Request $request): JsonResponse
    {
        $date = $request->query('date', now()->toDateString());
        $slots = $this->availabilityService->getAvailableSlots($date);
        return response()->json(['date' => $date, 'available_slots' => $slots]);
    }

    public function createBooking(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'client_id' => 'required|uuid',
            'service_id' => 'required|uuid',
            'booking_date' => 'required|date',
            'start_time' => 'required',
            'location_address' => 'required|string',
            'special_requests' => 'nullable|string',
        ]);

        $service = Service::findOrFail($validated['service_id']);
        $total = $service->price;
        $deposit = $total * ($service->deposit_percentage / 100);

        $booking = Booking::create([
            'reference' => 'RES-' . date('Y') . '-' . strtoupper(Str::random(5)),
            'client_id' => $validated['client_id'],
            'service_id' => $validated['service_id'],
            'booking_date' => $validated['booking_date'],
            'start_time' => $validated['start_time'],
            'end_time' => date('H:i', strtotime($validated['start_time']) + ($service->duration_minutes * 60)),
            'location_address' => $validated['location_address'],
            'status' => 'pending',
            'total_amount' => $total,
            'deposit_amount' => $deposit,
            'special_requests' => $validated['special_requests'] ?? null,
        ]);

        return response()->json(['message' => 'Réservation créée avec succès', 'data' => $booking], 201);
    }
}
