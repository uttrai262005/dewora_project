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
    // Schema::table('users', function (Blueprint $table) {
    //     $table->string('google_id')->nullable()->after('id'); // ID từ Google
    //     $table->timestamp('email_verified_at')->nullable()->change(); // Cho phép email_verified_at là null
    //     $table->string('password')->nullable()->change(); // Cho phép password là null
    // });
}
    /**
     * Reverse the migrations.
     */
    // public function down(): void
    // {
    //     Schema::table('users', function (Blueprint $table) {
    //         //
    //     });
    // }
};
