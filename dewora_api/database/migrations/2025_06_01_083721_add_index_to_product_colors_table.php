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
        Schema::table('product_colors', function (Blueprint $table) {
            $table->index('product_id'); // Index cho cột product_id
            $table->index('color_name'); // Index cho cột color_name
        });
    }

    public function down(): void
    {
        // Schema::table('product_colors', function (Blueprint $table) {
        //     // Check if the 'product_id' index exists before dropping
        //     if (Schema::hasColumn('product_colors', 'product_id')) {
        //         // Laravel's default index name is table_name_column_name_index
        //         // So, the index name for product_id would typically be 'product_colors_product_id_index'
        //         // However, dropIndex with an array handles the default naming correctly.
        //         $table->dropIndex(['product_id']);
        //     }

        //     // Check if the 'color_name' index exists before dropping
        //     if (Schema::hasColumn('product_colors', 'color_name')) {
        //         $table->dropIndex(['color_name']);
        //     }
        // });
    }

};