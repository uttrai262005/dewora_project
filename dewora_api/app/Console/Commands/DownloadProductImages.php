<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use App\Models\ProductImage; // Đảm bảo bạn đã import model ProductImage
// use App\Models\Product; // Import nếu bạn cần tìm/tạo sản phẩm

class DownloadProductImages extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'products:download-images';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Download product images from products.json and update the database';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $this->info('Starting to download product images...');

        // Đường dẫn tới file products.json
        // $jsonPath = storage_path('app/data/products.json'); // Giữ lại nếu file của bạn ở storage/app/data
        $jsonPath = storage_path('data/products.json'); // Phù hợp với đường dẫn C:\xampp\htdocs\dewora_api\storage\data\products.json

        if (!File::exists($jsonPath)) {
            $this->error('products.json not found at: ' . $jsonPath);
            return Command::FAILURE;
        }

        $jsonContent = File::get($jsonPath);
        $productsData = json_decode($jsonContent, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            $this->error('Error decoding JSON: ' . json_last_error_msg());
            return Command::FAILURE;
        }

        if (empty($productsData)) {
            $this->warn('No product data found in JSON or JSON is empty.');
            return Command::SUCCESS;
        }

        $this->info('Successfully decoded JSON data. Processing products...');

        foreach ($productsData as $productData) {
            $productId = $productData['id'] ?? null;
            $productName = $productData['name'] ?? 'Unknown Product';

            if (!$productId) {
                $this->warn("Skipping product due to missing ID. Product Name (if available): " . $productName);
                continue;
            }

            $this->info("Processing product ID: {$productId} - {$productName}");

            $imageUrls = $productData['images'] ?? [];

            if (empty($imageUrls)) {
                $this->warn("No images array found or images array is empty for product ID: {$productId}");
                continue;
            }
            
            if (!is_array($imageUrls)) {
                $this->warn("Images data for product ID: {$productId} is not an array. Skipping. Data type: " . gettype($imageUrls));
                continue;
            }

            $storageDir = 'product_images'; // Thư mục con trong storage/app/public

            // Đảm bảo thư mục lưu trữ tồn tại
            if (!Storage::disk('public')->exists($storageDir)) {
                Storage::disk('public')->makeDirectory($storageDir);
                $this->info("Created directory: public/storage/{$storageDir}");
            }

            foreach ($imageUrls as $index => $externalImageUrl) {
                $isMainImage = ($index == 0);

                // --- DEBUG LOGS START ---
                $this->line("--------------------------------------------------");
                $this->info("---> [DEBUG] Attempting to process URL for Product ID {$productId}, Index {$index}");
                $this->info("---> [DEBUG] Raw \$externalImageUrl value: '{$externalImageUrl}'");
                $this->info("---> [DEBUG] Data type of \$externalImageUrl: " . gettype($externalImageUrl));

                if (!is_string($externalImageUrl)) {
                    $this->error("---> [DEBUG] \$externalImageUrl is NOT a string. Skipping this entry.");
                    continue;
                }

                $isEmpty = empty($externalImageUrl);
                $this->info("---> [DEBUG] Is \$externalImageUrl empty? " . ($isEmpty ? 'Yes' : 'No'));
                
                $isValidFilterVar = filter_var($externalImageUrl, FILTER_VALIDATE_URL);
                $this->info("---> [DEBUG] filter_var(\$externalImageUrl, FILTER_VALIDATE_URL) result: " . ($isValidFilterVar ? 'Valid' : 'Invalid'));
                // --- DEBUG LOGS END ---

                if ($isEmpty || !$isValidFilterVar) {
                    $this->warn(">>> Skipping due to invalid or empty URL. Product ID {$productId}. Problematic URL: '{$externalImageUrl}'");
                    continue;
                }

                try {
                    $response = Http::timeout(30)->get($externalImageUrl); // Timeout 30 giây

                    if ($response->successful()) {
                        $imageContents = $response->body();
                        $originalExtension = pathinfo($externalImageUrl, PATHINFO_EXTENSION);
                        // Nếu extension rỗng hoặc không hợp lệ, thử lấy từ Content-Type hoặc mặc định là jpg
                        if (empty($originalExtension)) {
                            $contentType = $response->header('Content-Type');
                            if (strpos($contentType, 'image/jpeg') !== false) $originalExtension = 'jpg';
                            elseif (strpos($contentType, 'image/png') !== false) $originalExtension = 'png';
                            elseif (strpos($contentType, 'image/webp') !== false) $originalExtension = 'webp';
                            elseif (strpos($contentType, 'image/gif') !== false) $originalExtension = 'gif';
                            else $originalExtension = 'jpg'; // Mặc định
                        }
                        if (empty($originalExtension)) $originalExtension = 'jpg'; // Double check default

                        // Tạo tên file mới unique
                        $newFileName = 'prod_' . $productId . '_' . time() . '_' . uniqid() . '.' . $originalExtension;
                        $relativePath = $storageDir . '/' . $newFileName;

                        Storage::disk('public')->put($relativePath, $imageContents);
                        $publicImageUrl = Storage::url($relativePath); // Lấy URL công khai sau khi lưu

                        ProductImage::create([
                            'product_id' => $productId,
                            'image_url' => $publicImageUrl,
                            'is_main_image' => $isMainImage,
                        ]);

                        $this->info("Successfully downloaded and saved: {$externalImageUrl} -> {$publicImageUrl}");
                    } else {
                        $this->error("Failed to download: {$externalImageUrl} - HTTP Status: " . $response->status());
                    }
                } catch (\Illuminate\Http\Client\ConnectionException $e) {
                    $this->error("Error downloading {$externalImageUrl} (Connection Exception): " . $e->getMessage());
                } catch (\Exception $e) {
                    $this->error("Error processing image {$externalImageUrl}: " . $e->getMessage());
                }
            }
        }

        $this->info('Finished downloading product images.');
        return Command::SUCCESS;
    }
}