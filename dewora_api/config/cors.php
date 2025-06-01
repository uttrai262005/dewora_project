<?php
// config/cors.php
return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'], // Áp dụng cho các route API và Sanctum (nếu dùng)
    'allowed_methods' => ['*'], // Cho phép tất cả các HTTP methods (GET, POST, PUT, DELETE, OPTIONS, etc.)
    'allowed_origins' => [
        'http://localhost',        // Cho phép từ localhost (XAMPP của bạn)
        'http://127.0.0.1',      // Cũng là localhost
        'null', 
                'http://127.0.0.1:8000', // Cho phép server Laravel

        'http://127.0.0.1:5500', // Thêm địa chỉ này vào
                   // Quan trọng: Cho phép khi bạn mở file HTML trực tiếp từ file system
        // Thêm địa chỉ frontend của bạn nếu nó chạy trên một port khác, ví dụ:
        // 'http://localhost:5500', // Nếu dùng Live Server VS Code
    ],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'], // Cho phép tất cả các headers
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true, 
];