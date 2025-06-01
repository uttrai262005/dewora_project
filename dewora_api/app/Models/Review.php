<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Review extends Model
{
    use HasFactory; // <-- Quan trọng để sử dụng factory

    // Khai báo các trường có thể được gán hàng loạt
    protected $fillable = [
        'product_id',
        'name',
        'rating',
        'comment',
    ];

    /**
     * Get the product that owns the review.
     */
    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}