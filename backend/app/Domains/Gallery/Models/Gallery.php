<?php

namespace App\Domains\Gallery\Models;

use App\Domains\Booking\Models\Booking;
use App\Domains\Booking\Models\Category;
use App\Domains\CRM\Models\Client;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Gallery extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'title',
        'slug',
        'client_id',
        'booking_id',
        'category_id',
        'is_private',
        'access_key',
        'password_hash',
        'expiration_date',
        'cover_photo_id',
    ];

    protected $casts = [
        'is_private' => 'boolean',
        'expiration_date' => 'datetime',
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function albums(): HasMany
    {
        return $this->hasMany(Album::class);
    }

    public function photos(): HasMany
    {
        return $this->hasMany(Photo::class);
    }
}
