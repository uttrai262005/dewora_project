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
    Schema::table('orders', function (Blueprint $table) {
        $table->string('shipping_full_address')->nullable()->change();
        // Hoặc nếu bạn muốn có giá trị mặc định:
        // $table->string('shipping_full_address')->default('')->change(); // Chuỗi rỗng làm mặc định
    });
}

public function down(): void
{
    Schema::table('orders', function (Blueprint $table) {
        // Đảo ngược lại nếu cần, ví dụ: bắt buộc lại
        $table->string('shipping_full_address')->nullable(false)->change();
    });
}
};
