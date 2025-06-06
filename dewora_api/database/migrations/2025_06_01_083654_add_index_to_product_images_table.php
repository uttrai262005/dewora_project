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
        Schema::table('product_images', function (Blueprint $table) {
            $table->index('product_id'); // Index cho cột product_id
            $table->index(['product_id', 'is_main_image']); // Index kết hợp
        });
    }

    public function down(): void
    {
        // Schema::table('product_images', function (Blueprint $table) {
        //     $table->dropIndex(['product_id']);
        //     $table->dropIndex(['product_id', 'is_main_image']);
        // });
    }
};
