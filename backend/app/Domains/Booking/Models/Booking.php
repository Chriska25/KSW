<?php

namespace App\Domains\Booking\Models;

use App\Domains\CRM\Models\Client;
use App\Domains\Gallery\Models\Gallery;
use App\Domains\Invoicing\Models\Contract;
use App\Domains\Invoicing\Models\Invoice;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Booking extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'reference',
        'client_id',
        'service_id',
        'booking_date',
        'start_time',
        'end_time',
        'location_address',
        'status',
        'total_amount',
        'deposit_amount',
        'special_requests',
    ];

    protected $casts = [
        'booking_date' => 'date',
        'total_amount' => 'decimal:2',
        'deposit_amount' => 'decimal:2',
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function contract(): HasOne
    {
        return $this->hasOne(Contract::class);
    }

    public function invoice(): HasOne
    {
        return $this->hasOne(Invoice::class);
    }

    public function gallery(): HasOne
    {
        return $this->hasOne(Gallery::class);
    }
}
