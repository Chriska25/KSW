<?php

namespace App\Domains\CRM\Models;

use App\Domains\Auth\Models\User;
use App\Domains\Booking\Models\Booking;
use App\Domains\Content\Models\Testimonial;
use App\Domains\Gallery\Models\Gallery;
use App\Domains\Invoicing\Models\Contract;
use App\Domains\Invoicing\Models\Invoice;
use App\Domains\Invoicing\Models\Quote;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Client extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'user_id',
        'company_name',
        'vat_number',
        'address_line1',
        'address_line2',
        'postal_code',
        'city',
        'country',
        'notes',
        'source',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }

    public function galleries(): HasMany
    {
        return $this->hasMany(Gallery::class);
    }

    public function quotes(): HasMany
    {
        return $this->hasMany(Quote::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function contracts(): HasMany
    {
        return $this->hasMany(Contract::class);
    }

    public function testimonials(): HasMany
    {
        return $this->hasMany(Testimonial::class);
    }
}
