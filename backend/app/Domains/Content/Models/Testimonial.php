<?php

namespace App\Domains\Content\Models;

use App\Domains\CRM\Models\Client;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Testimonial extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'client_id',
        'author_name',
        'author_role_or_event',
        'rating',
        'comment',
        'avatar_path',
        'is_published',
        'display_order',
    ];

    protected $casts = [
        'is_published' => 'boolean',
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
