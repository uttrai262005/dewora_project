<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
   public function up()
{
    Schema::create('products', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->unsignedBigInteger('brand_id')->nullable(); // Khóa ngoại đến brands
        $table->text('description')->nullable();
        $table->decimal('price', 10, 2); // 10 chữ số tổng, 2 chữ số sau dấu phẩy
        $table->decimal('original_price', 10, 2)->nullable();
        $table->integer('discount_percentage')->nullable();
        $table->float('rating')->nullable();
        $table->integer('review_count')->default(0);
        $table->unsignedBigInteger('type_id')->nullable(); // Khóa ngoại đến product_types
        $table->string('gift_description')->nullable();
        $table->timestamps();

        // Định nghĩa khóa ngoại
        $table->foreign('brand_id')->references('id')->on('brands')->onDelete('set null');
        $table->foreign('type_id')->references('id')->on('product_types')->onDelete('set null');
        $table->index('name');
        $table->index('price');
        $table->index('rating');
        $table->index('review_count');
        $table->index('created_at'); // Nếu bạn có sắp xếp theo sản phẩm mới nhất bằng ID hoặc ngày tạo

    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
