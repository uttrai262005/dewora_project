<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;
// use Illuminate\Support\Facades\Storage; // Không cần Storage nếu chỉ dùng File::get(storage_path(...))

use App\Models\Product;
use App\Models\Brand;
use App\Models\ProductType;
use App\Models\ProductImage;
use App\Models\ProductColor;
use App\Models\ProductLabel;

class ProductSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        // Xóa dữ liệu cũ để tránh trùng lặp khi chạy lại seeder (cẩn thận khi dùng ở production)
        // Lưu ý: Thứ tự xóa phải đảo ngược lại với thứ tự tạo để tránh lỗi khóa ngoại
        ProductImage::query()->delete();
        ProductColor::query()->delete();
        ProductLabel::query()->delete();
        Product::query()->delete();
        ProductType::query()->delete();
        Brand::query()->delete();


        $jsonPath = storage_path('data/products.json'); // Đường dẫn đầy đủ

        // Kiểm tra file tồn tại
        if (!File::exists($jsonPath)) {
             $this->command->error('File products.json not found at ' . $jsonPath);
             return;
        }

        $json = File::get($jsonPath);
        // Giải mã nội dung JSON thành MẢNG KẾT HỢP (truy cập bằng [])
        $productsData = json_decode($json, true); // <-- THAY ĐỔI Ở ĐÂY: Thêm TRUE

        // Kiểm tra decode thành công và là mảng
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($productsData)) {
             $this->command->error('Error decoding JSON or data is not an array.');
             return;
        }


        foreach ($productsData as $productData) { // $productData giờ là mảng kết hợp []
            // Sử dụng firstOrCreate: Tìm bản ghi theo điều kiện, nếu không có thì tạo mới
            // Truy cập dữ liệu bằng cú pháp MẢNG []
            $brand = Brand::firstOrCreate(['name' => $productData['brand'] ?? 'Unknown Brand']); // <-- Cú pháp MẢNG []

            // Sử dụng firstOrCreate cho ProductType
            $productType = ProductType::firstOrCreate(['name' => $productData['type'] ?? 'Unknown Type']); // <-- Cú pháp MẢNG []


            // Tạo Product mới
            $product = Product::create([
                // 'id' => $productData['id'], // Vẫn không nên set ID thủ công
                'name' => (string)($productData['name'] ?? 'Untitled Product'), // <-- Cú pháp MẢNG [], ép kiểu string
                'brand_id' => $brand->id,
                'type_id' => $productType->id,
                'description' => (string)($productData['description'] ?? null), // <-- Cú pháp MẢNG [], ép kiểu string hoặc null
                'price' => $productData['price'] ?? 0, // <-- Cú pháp MẢNG []
                'original_price' => $productData['originalPrice'] ?? null, // <-- Cú pháp MẢNG []
                'discount_percentage' => $productData['discount'] ?? null, // <-- Cú pháp MẢNG []
                'rating' => $productData['rating'] ?? null, // <-- Cú pháp MẢNG []
                'review_count' => $productData['reviewCount'] ?? 0, // <-- Cú pháp MẢNG []
                'gift_description' => is_array($productData['gift'] ?? null) ? null : (string)($productData['gift'] ?? null),
            ]);

            // --- Xử lý hình ảnh ---
            // Cần đảm bảo $productData['images'] tồn tại và là mảng
            if (isset($productData['images']) && is_array($productData['images'])) { // <-- Cú pháp MẢNG []
                 foreach ($productData['images'] as $index => $imageUrl) { // $imageUrl nên là string
                     $product->images()->create([
                         'image_url' => (string)($imageUrl ?? ''), // <-- Ép kiểu string
                         'is_main_image' => $index === 0
                     ]);
                 }
            }

            // --- Xử lý màu sắc ---
             if (isset($productData['colors']) && is_array($productData['colors'])) { // <-- Cú pháp MẢNG []
                 foreach ($productData['colors'] as $colorData) { // $colorData có thể là mảng hoặc gì đó tùy JSON
                      // Giả định colorData là mảng như ['name' => 'Red', 'value' => '#FF0000']
                     // Cần truy cập bằng cú pháp MẢNG [] và ép kiểu an toàn
                     $product->colors()->create([
                         'color_name' => (string)($colorData['name'] ?? 'Unknown Color'), // <-- Cú pháp MẢNG [], ép kiểu string
                         'color_value' => (string)($colorData['value'] ?? ($colorData['id'] ?? null)) // <-- Cú pháp MẢNG [], ép kiểu string hoặc null
                     ]);
                 }
            }

            // --- Xử lý nhãn ---
             if (isset($productData['labels']) && is_array($productData['labels'])) { // <-- Cú pháp MẢNG []
                 foreach ($productData['labels'] as $labelName) { // $labelName dự kiến là string
                     // Đây là chỗ có thể đã xảy ra lỗi nếu $labelName là một đối tượng/mảng thay vì string
                     // Ép kiểu tường minh sang string để đảm bảo
                     $product->labels()->create(['label_name' => (string)($labelName ?? '')]); // <-- Ép kiểu string an toàn
                 }
            }

            $this->command->info('Seeded product: ' . (string)($productData['name'] ?? 'Untitled Product')); // <-- Cú pháp MẢNG [], ép kiểu string an toàn

        } // Kết thúc foreach
    }
}