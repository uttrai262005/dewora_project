<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Database\Seeders\ProductSeeder; // <-- Thêm dòng này để import ProductSeeder

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Ví dụ: Tạo một số lượng lớn người dùng bằng factory (nếu cần)
        // User::factory(10)->create();

        // Ví dụ: Tạo một người dùng test cụ thể
        // User::factory()->create([
        //     'name' => 'Test User',
        //     'email' => 'test@example.com',
        // ]);

        // Gọi các Seeder khác để chạy
        $this->call([
            ProductSeeder::class, // <-- Thêm ProductSeeder vào đây
            // Nếu bạn có các Seeder khác (ví dụ: UserSeeder riêng), bạn cũng thêm vào mảng này:
            // UserSeeder::class,
            // OtherSeeder::class,
            ReviewSeeder::class, 
        ]);
    }
}