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
Schema::create('product_images', function (Blueprint $table) {
$table->id();
$table->unsignedBigInteger('product_id');
$table->string('image_url');
$table->boolean('is_main_image')->default(false);
$table->timestamps();

            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade'); // Nếu xóa product thì xóa cả ảnh
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_images');
    }
};
