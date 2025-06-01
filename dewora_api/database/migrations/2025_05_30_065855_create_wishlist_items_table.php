<?php
// YYYY_MM_DD_HHMMSS_create_wishlist_items_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wishlist_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('product_id')->constrained()->onDelete('cascade'); // Assuming you have a products table
            $table->timestamps();
            $table->unique(['user_id', 'product_id']); // User cannot like the same product multiple times
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wishlist_items');
    }
};