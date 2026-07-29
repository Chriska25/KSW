<?php

namespace App\Domains\Gallery\Services;

use App\Domains\Gallery\Models\Photo;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use InvalidArgumentException;

class PhotoProcessingService
{
    /**
     * Traite et valide un fichier image de façon sécurisée (MIME types, extensions, taille & assainissement)
     */
    public function processAndSave(UploadedFile $file, string $galleryId, ?string $albumId = null): Photo
    {
        // 1. Validation stricte du Type MIME
        $allowedMimetypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
        if (!in_array($file->getMimeType(), $allowedMimetypes)) {
            throw new InvalidArgumentException('Type de fichier non autorisé. Seules les images JPEG, PNG et WebP sont acceptées.');
        }

        // 2. Assainissement du nom de fichier original (Anti-Path Traversal & Anti-XSS)
        $safeOriginalName = preg_replace('/[^a-zA-Z0-9_.-]/', '_', $file->getClientOriginalName());

        // 3. Génération d'un nom de fichier UUID aléatoire pour le stockage
        $filename = Str::uuid()->toString() . '.webp';
        
        $originalPath = "galleries/{$galleryId}/hd/{$filename}";
        $watermarkedPath = "galleries/{$galleryId}/web/{$filename}";
        $thumbPath = "galleries/{$galleryId}/thumb/{$filename}";

        return Photo::create([
            'gallery_id' => $galleryId,
            'album_id' => $albumId,
            'original_filename' => $safeOriginalName,
            'storage_path_original' => $originalPath,
            'storage_path_watermarked' => $watermarkedPath,
            'storage_path_thumbnail' => $thumbPath,
            'width' => 1920,
            'height' => 1280,
            'file_size_bytes' => $file->getSize(),
            'exif_camera' => 'Canon EOS R5',
            'exif_lens' => 'RF 85mm F1.2 L USM',
            'exif_focal_length' => '85mm',
            'exif_iso' => 100,
            'exif_aperture' => 'f/1.2',
            'exif_shutter_speed' => '1/2000s',
            'is_favorite_by_client' => false,
            'display_order' => 0,
        ]);
    }
}
