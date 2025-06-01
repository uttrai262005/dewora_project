<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\ProductImage; // Đảm bảo bạn đã import ProductImage model

    class Product extends Model
    {
        use HasFactory;
        protected $fillable = [
            'name', 'brand_id', 'description', 'price', 'original_price',
            'discount_percentage', 'rating', 'review_count', 'type_id', 'gift_description'
        ];

        public function brand()
        {
            return $this->belongsTo(Brand::class);
        }

        public function productType() // Đổi tên cho rõ ràng hơn
        {
            return $this->belongsTo(ProductType::class, 'type_id');
        }

        public function images()
        {
            return $this->hasMany(ProductImage::class);
        }

        public function colors()
        {
            return $this->hasMany(ProductColor::class);
        }

        public function labels()
        {
            return $this->hasMany(ProductLabel::class);
        }
        public function reviews()
{
    return $this->hasMany(Review::class);
}
public function getMainImageUrlAttribute()
    {
        $mainImage = $this->images()->where('is_main_image', true)->first();
        if ($mainImage) {
            return $mainImage->image_url;
        }
        // Nếu không có ảnh chính, lấy ảnh đầu tiên
        $firstImage = $this->images()->first();
        return $firstImage ? $firstImage->image_url : null; // Hoặc ảnh mặc định
    }
    public function productImages()
    {
        return $this->hasMany(ProductImage::class);
    }

    /**
     * Get the users that have this product in their wishlist.
     */
    public function usersWishlist()
    {
        // Giả định bảng pivot cho wishlist là 'wishlist'
        // 'product_id' là khóa ngoại của product trong bảng pivot
        // 'user_id' là khóa ngoại của user trong bảng pivot
        return $this->belongsToMany(User::class, 'wishlist', 'product_id', 'user_id');
    }
        }
        