<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('reviews', function (Blueprint $table) {
            $table->id(); // Cột ID tự tăng (primary key)
            $table->foreignId('product_id') // Cột để lưu ID của sản phẩm
                  ->constrained('products') // Ràng buộc khóa ngoại với bảng 'products'
                  ->onDelete('cascade'); // Khi sản phẩm bị xóa, các review liên quan cũng bị xóa

            $table->string('name'); // Tên người đánh giá
            $table->integer('rating')->unsigned(); // Số sao (1-5), unsigned để đảm bảo không âm
            $table->text('comment')->nullable(); // Nội dung đánh giá, có thể để trống

            $table->timestamps(); // Thêm các cột 'created_at' và 'updated_at'
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reviews'); // Khi rollback migration, xóa bảng 'reviews'
    }
};