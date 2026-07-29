<?php

namespace App\Domains\Invoicing\Models;

use App\Domains\Booking\Models\Booking;
use App\Domains\CRM\Models\Client;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Contract extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'booking_id',
        'client_id',
        'title',
        'content_html',
        'is_signed',
        'signed_at',
        'signature_image_path',
        'signer_ip_address',
    ];

    protected $casts = [
        'is_signed' => 'boolean',
        'signed_at' => 'datetime',
    ];

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
