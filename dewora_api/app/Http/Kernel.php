<?php

namespace App\Http;

use Illuminate\Foundation\Http\Kernel as HttpKernel;

class Kernel extends HttpKernel
{
    /**
     * The application's global HTTP middleware stack.
     *
     * These middleware are run during every request to your application.
     *
     * @var array<int, class-string|string>
     */
    protected $middleware = [
        \Illuminate\Session\Middleware\StartSession::class,
        \Illuminate\Session\Middleware\WriteSession::class,
        // \App\Http\Middleware\TrustHosts::class, // Nếu bạn cần cấu hình Trusted Proxies
        \App\Http\Middleware\TrustProxies::class, // Xử lý Trusted Proxies
        \Illuminate\Http\Middleware\HandleCors::class, // <-- Middleware xử lý CORS (Thường nằm ở đây hoặc trong nhóm 'api')
        \App\Http\Middleware\PreventRequestsDuringMaintenance::class, // Chế độ bảo trì
        \Illuminate\Foundation\Http\Middleware\ValidatePostSize::class, // Kiểm tra kích thước POST request
        \App\Http\Middleware\TrimStrings::class, // Cắt bỏ khoảng trắng thừa
        \Illuminate\Foundation\Http\Middleware\ConvertEmptyStringsToNull::class, // Chuyển chuỗi rỗng thành null
    ];

    /**
     * The application's route middleware groups.
     *
     * @var array<string, array<int, class-string|string>>
     */
    protected $middlewareGroups = [
        'web' => [
            \Illuminate\Session\Middleware\StartSession::class,
        \Illuminate\Session\Middleware\WriteSession::class,
            \App\Http\Middleware\EncryptCookies::class, // Mã hóa cookie
            \Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class, // Thêm cookie vào response
            \Illuminate\Session\Middleware\AuthenticateSession::class, // Xác thực session
            \Illuminate\View\Middleware\ShareErrorsFromSession::class, // Chia sẻ lỗi validation
            \App\Http\Middleware\VerifyCsrfToken::class, // Bảo vệ CSRF
            \Illuminate\Routing\Middleware\SubstituteBindings::class, // Route Model Binding
        ],

        'api' => [
            \Illuminate\Http\Middleware\HandleCors::class, // Đảm bảo dòng này có ở đây
            // \Illuminate\Routing\Middleware\ThrottleRequests::class.':api', // Giới hạn tần suất request API (nếu cần)
    \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
        'throttle:api', // Or your specific throttle middleware
        \Illuminate\Routing\Middleware\SubstituteBindings::class, // Route Model Binding
                // \Illuminate\Session\Middleware\StartSession::class, // <-- Thêm dòng này để session hoạt động cho API

            \Illuminate\Routing\Middleware\SubstituteBindings::class, // Route Model Binding cho API
            // Lưu ý: Middleware HandleCors có thể nằm ở đây thay vì global $middleware nếu bạn chỉ muốn áp dụng cho API
                    // \Illuminate\Session\Middleware\WriteSession::class, // <-- ĐÂY LÀ DÒNG CẦN KIỂM TRA/THÊM

        ],
    ];

    /**
     * The application's route middleware.
     *
     * These middleware may be assigned to groups or individual routes.
     *
     * @var array<string, class-string|string>
     */
    protected $routeMiddleware = [
'auth' => \App\Http\Middleware\Authenticate::class,
        'auth.basic' => \Illuminate\Auth\Middleware\AuthenticateWithBasicAuth::class, // Xác thực basic auth
        'cache.headers' => \Illuminate\Http\Middleware\SetCacheHeaders::class, // Cache headers
        'can' => \Illuminate\Auth\Middleware\Authorize::class, // Kiểm tra quyền hạn (Authorization)
        'guest' => \App\Http\Middleware\RedirectIfAuthenticated::class, // Redirect nếu user đã đăng nhập
        'signed' => \Illuminate\Routing\Middleware\ValidateSignature::class, // Validate signed URLs
        'throttle' => \Illuminate\Routing\Middleware\ThrottleRequests::class, // Giới hạn tần suất request (có thể dùng ở route group)
        'verified' => \Illuminate\Auth\Middleware\EnsureEmailIsVerified::class, // Kiểm tra email verified
        // Middleware tùy chỉnh của bạn
        'role' => \App\Http\Middleware\CheckUserRole::class,
    'admin' => \App\Http\Middleware\IsAdminMiddleware::class, // Add this

        // Thêm Sanctum middleware ở đây nếu bạn dùng Laravel Sanctum cho API Authentication
        'sanctum' => \Laravel\Sanctum\Http\Middleware\AuthenticateWithSanctum::class,
    ];
}