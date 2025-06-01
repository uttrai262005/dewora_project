<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
 // 2025_05_21_162049_create_carts_table.php
public function up()
{
    Schema::create('carts', function (Blueprint $table) {
        $table->id();
        $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('cascade');
        // Đổi tên cột này thành 'guest_token' nếu bạn muốn rõ ràng hơn,
        // hoặc giữ nguyên 'guest_session_id' nhưng ý nghĩa là 'guest_token'
        $table->string('guest_session_id')->nullable()->unique(); // Hoặc $table->string('guest_token')->nullable()->unique();
        $table->timestamps();
    });
}
    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('carts');
    }
};
