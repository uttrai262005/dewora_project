<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null'); // Cho phép user khách (nullable) hoặc user đã xóa (onDelete set null)

            $table->string('buyer_name');
            $table->string('buyer_phone');
            $table->string('buyer_email');

            $table->string('shipping_name');
            $table->string('shipping_phone');
            $table->text('shipping_street_address');
            $table->string('shipping_ward')->nullable();
            $table->string('shipping_district')->nullable();
            $table->string('shipping_province')->nullable();
            $table->string('shipping_full_address'); // Lưu địa chỉ đầy đủ đã được format
            $table->text('shipping_notes')->nullable();

            $table->string('payment_method');
            $table->string('payment_status')->default('pending'); // pending, paid, failed

            $table->decimal('subtotal', 12, 2);
            $table->decimal('shipping_fee', 12, 2)->default(0.00);
            $table->decimal('discount_amount', 12, 2)->default(0.00);
            $table->decimal('total_amount', 12, 2);

            $table->string('status')->default('pending'); // Trạng thái đơn hàng: pending, processing, shipped, delivered, cancelled, returned
            $table->string('cancellation_reason')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->string('tracking_code')->nullable(); // Mã vận đơn

            $table->timestamps(); // created_at, updated_at
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};