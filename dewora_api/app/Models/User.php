<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens; // Đảm bảo bạn đã cài Sanctum cho API auth

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable; // Thêm HasApiTokens

    protected $fillable = [
        'name',
        'email',
        'password',
        'google_id', // Added from your AuthController
        'avatar_url', // For user avatar
        'phone_number',
        'gender',
        'birth_date',
            'is_admin', 

    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'birth_date' => 'date', // Cast birth_date to date object

        ];
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    public function addresses()
    {
        return $this->hasMany(Address::class);
    }

    // Wishlist: Many-to-Many relationship with Product
    public function wishlistProducts()
    {
        return $this->belongsToMany(Product::class, 'wishlist_items', 'user_id', 'product_id')->withTimestamps();
    }
}