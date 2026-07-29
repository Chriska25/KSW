<?php

namespace App\Domains\Booking\Services;

use App\Domains\Booking\Models\Booking;
use Carbon\Carbon;

class BookingAvailabilityService
{
    /**
     * Calcule les créneaux disponibles pour une date donnée
     */
    public function getAvailableSlots(string $date): array
    {
        $defaultSlots = ['09:00', '10:30', '14:00', '16:00', '18:00'];
        
        $bookedTimes = Booking::whereDate('booking_date', $date)
            ->whereIn('status', ['confirmed', 'pending'])
            ->pluck('start_time')
            ->map(fn($t) => substr($t, 0, 5))
            ->toArray();

        return array_values(array_filter($defaultSlots, fn($slot) => !in_array($slot, $bookedTimes)));
    }
}
