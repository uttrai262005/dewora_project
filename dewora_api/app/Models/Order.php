<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'order_code', // <-- Thêm vào đây
        'customer_name',
        'customer_phone',
        'customer_email',
        'shipping_name',
        'shipping_phone',
        'shipping_address', // Tên đã được đổi
        'notes', // Tên đã được đổi
        'payment_method',
        'payment_status',
        'subtotal',
        'shipping_fee',
        'discount_amount',
        'total_amount',
        'status',
        'cancellation_reason',
        'cancelled_at',
        'tracking_code',
    ];

    protected $casts = [
        'cancelled_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function items() // Đổi tên từ orderItems cho ngắn gọn
    {
        return $this->hasMany(OrderItem::class);
    }
}