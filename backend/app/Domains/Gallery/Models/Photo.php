<?php

namespace App\Domains\Gallery\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Photo extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'gallery_id',
        'album_id',
        'original_filename',
        'storage_path_original',
        'storage_path_watermarked',
        'storage_path_thumbnail',
        'width',
        'height',
        'file_size_bytes',
        'exif_camera',
        'exif_lens',
        'exif_focal_length',
        'exif_iso',
        'exif_aperture',
        'exif_shutter_speed',
        'is_favorite_by_client',
        'display_order',
    ];

    protected $casts = [
        'is_favorite_by_client' => 'boolean',
    ];

    public function gallery(): BelongsTo
    {
        return $this->belongsTo(Gallery::class);
    }

    public function album(): BelongsTo
    {
        return $this->belongsTo(Album::class);
    }
}
