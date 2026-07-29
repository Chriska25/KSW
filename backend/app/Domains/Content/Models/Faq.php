<?php

namespace App\Domains\Content\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Faq extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'faqs';

    protected $fillable = [
        'question',
        'answer',
        'category',
        'display_order',
    ];
}
