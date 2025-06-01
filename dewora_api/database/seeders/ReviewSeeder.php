<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Product;
use App\Models\Review;
use Illuminate\Support\Facades\DB;

class ReviewSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        // 1. Xóa tất cả dữ liệu cũ trong bảng reviews
        Review::query()->delete(); // <-- THÊM DÒNG NÀY VÀO ĐÂY

        $products = Product::all();

        // Kiểm tra nếu không có sản phẩm nào thì không thể tạo review
        if ($products->isEmpty()) {
            $this->command->warn('Không có sản phẩm nào để tạo review. Hãy chạy ProductSeeder trước.');
            return; // <-- Dừng seeder nếu không có sản phẩm
        }

        foreach ($products as $product) {
            // Tạo một vài review cho mỗi sản phẩm
            Review::factory()->count(rand(1, 5))->create([
                'product_id' => $product->id,
            ]);

            // Cập nhật rating và review_count của sản phẩm sau khi tạo review
            $product->rating = $product->reviews()->avg('rating');
            $product->review_count = $product->reviews()->count();
            $product->save();
        }
    }
}