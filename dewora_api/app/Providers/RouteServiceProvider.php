<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;

class RouteServiceProvider extends ServiceProvider
{
    /**
     * The path to your application's "home" route.
     *
     * Typically, users are redirected here after authentication.
     *
     * @var string
     */
    public const HOME = '/home'; // Hoặc '/dashboard', tùy dự án

    /**
     * Define your route model bindings, pattern filters, and other route configuration.
     * Đây là nơi cấu hình cách Laravel load các file route (web, api, console...).
     */
    public function boot(): void
    {

        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });

        $this->routes(function () {
            // --- Phần cấu hình load API routes ---
            // ĐẢM BẢO DÒNG DƯỚI ĐÂY KHÔNG BỊ COMMENT (không có // ở đầu)
            Route::middleware('api') // Áp dụng middleware 'api'
                ->prefix('api')     // Các route trong api.php sẽ có tiền tố '/api'
                ->group(base_path('routes/api.php')); // Nạp file routes/api.php

            // --- Phần cấu hình load Web routes ---
            Route::middleware('web') // Áp dụng middleware 'web'
                ->group(base_path('routes/web.php')); // Nạp file routes/web.php

            // Bạn có thể thêm cấu hình load các file route khác nếu cần (ví dụ: console.php)
        });
    }

    // Bạn không cần chỉnh sửa các hàm khác trong file này nếu có (ví dụ: configureRateLimiting)
    // Chỉ cần thêm toàn bộ nội dung code này vào file RouteServiceProvider.php mới tạo.
}