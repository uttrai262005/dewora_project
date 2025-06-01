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
    //     Schema::table('users', function (Blueprint $table) {
    // $table->string('google_id')->nullable()->after('password');
    // $table->string('avatar_url')->nullable()->after('google_id');
    // $table->string('phone_number')->nullable()->after('avatar_url');
    // $table->string('gender')->nullable()->after('phone_number');
    // $table->date('birth_date')->nullable()->after('gender');
    //         //
    //     });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {Schema::table('users', function (Blueprint $table) {
    $table->dropColumn(['google_id', 'avatar_url', 'phone_number', 'gender', 'birth_date']);
});
    }
};
