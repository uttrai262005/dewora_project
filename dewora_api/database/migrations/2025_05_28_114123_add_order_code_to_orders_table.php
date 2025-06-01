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
        // Thêm cột order_code sau cột user_id
        $table->string('order_code')->unique()->after('user_id'); 

        // Đổi tên và đảm bảo các cột khớp với code Controller
        $table->renameColumn('shipping_street_address', 'shipping_address');
        $table->renameColumn('shipping_notes', 'notes');
        $table->renameColumn('buyer_name', 'customer_name');
        $table->renameColumn('buyer_phone', 'customer_phone');
        $table->renameColumn('buyer_email', 'customer_email');
    });
}
    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            //
        });
    }
};
