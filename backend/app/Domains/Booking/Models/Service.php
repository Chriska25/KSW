<?php

namespace App\Domains\Booking\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Service extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'title',
        'slug',
        'category_id',
        'short_description',
        'full_description',
        'price',
        'deposit_percentage',
        'duration_minutes',
        'included_photos_count',
        'cover_image_path',
        'is_active',
        'display_order',
        'seo_title',
        'seo_description',
        'options_json',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'deposit_percentage' => 'decimal:2',
        'is_active' => 'boolean',
        'options_json' => 'array',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }
}
