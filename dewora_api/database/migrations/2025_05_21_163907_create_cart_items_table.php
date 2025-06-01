<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
   // database/migrations/xxxx_xx_xx_xxxxxx_create_cart_items_table.php
public function up()
{
    Schema::create('cart_items', function (Blueprint $table) {
        $table->id();
        $table->foreignId('cart_id')->constrained('carts')->onDelete('cascade');
        $table->foreignId('product_id')->constrained('products')->onDelete('cascade');
        $table->unsignedInteger('quantity');
        $table->foreignId('color_id')->nullable()->constrained('product_colors')->onDelete('set null'); // Giả sử bạn có bảng product_colors
        $table->decimal('price', 10, 2); // Lưu giá sản phẩm tại thời điểm thêm vào giỏ hàng
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cart_items');
    }
};
