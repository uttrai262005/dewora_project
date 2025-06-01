<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->onDelete('cascade');
            $table->foreignId('product_id')->nullable()->constrained('products')->onDelete('set null'); // Nếu sản phẩm bị xóa, vẫn giữ lại item trong đơn hàng

            $table->string('product_name'); // Tên sản phẩm tại thời điểm mua
            $table->string('product_image_url')->nullable(); // Ảnh sản phẩm
            $table->string('color_name')->nullable(); // Màu sắc đã chọn (nếu có)
            // $table->string('size_name')->nullable(); // Kích thước đã chọn (nếu có)

            $table->integer('quantity');
            $table->decimal('price', 12, 2); // Giá một sản phẩm tại thời điểm mua
            $table->decimal('item_subtotal', 12, 2); // quantity * price

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};