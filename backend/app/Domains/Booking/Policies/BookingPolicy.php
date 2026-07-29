<?php

namespace App\Domains\Booking\Policies;

use App\Domains\Auth\Models\User;
use App\Domains\Booking\Models\Booking;

class BookingPolicy
{
    public function view(User $user, Booking $booking): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        return $user->client && $user->client->id === $booking->client_id;
    }

    public function update(User $user, Booking $booking): bool
    {
        return $user->hasRole('admin');
    }

    public function delete(User $user, Booking $booking): bool
    {
        return $user->hasRole('admin');
    }
}
