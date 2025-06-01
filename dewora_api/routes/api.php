<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\ProductController; 
use App\Http\Controllers\Api\CartController; 
use App\Http\Controllers\Api\OrderController; 
use App\Http\Controllers\Api\AuthController; 
use App\Http\Controllers\Api\ShippingController; // Thêm dòng này ở đầu file
use App\Http\Controllers\Api\PaymentController; // <-- THÊM DÒNG NÀY
use App\Http\Controllers\Api\UserController; // Added
use App\Http\Controllers\Api\AddressController; // Added
use App\Http\Controllers\Api\WishlistController; // Added
use App\Http\Controllers\Api\ReorderController; // Added
use App\Http\Controllers\Api\Admin\AdminProductController;
use App\Http\Controllers\Api\Admin\AdminUserController;
use App\Http\Controllers\Api\Admin\AdminOrderController;
use App\Http\Controllers\Api\Admin\AdminDashboardController;
use App\Http\Controllers\Api\ChatbotController; // Đảm bảo đã import

Route::post('/chatbot', [ChatbotController::class, 'handleRequest']); // Sửa ở đây
/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// Route mặc định ví dụ cho user khi đã authenticate (nếu có)
// Bạn có thể giữ hoặc xóa nếu không dùng Authentication API
// Route::middleware('auth:api')->get('/user', function (Request $request) {
//     return $request->user();
// });

// --- Định nghĩa các Route API cho Product ---
// Sử dụng Route::apiResource để tự động tạo các route chuẩn cho Controller API
// Lệnh này sẽ tạo các routes: GET /products, POST /products, GET /products/{product},
// PUT/PATCH /products/{product}, DELETE /products/{product}
// Route cho xác thực người dùng (ví dụ dùng Sanctum)
// --- Routes cho Xác thực Người dùng ---
Route::post('/shipping/calculate', [ShippingController::class, 'calculateShipping']); // [CHANGED]

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Google Auth Routes
Route::get('/auth/google/redirect', [AuthController::class, 'redirectToGoogle']);
Route::get('/auth/google/callback', [AuthController::class, 'handleGoogleCallback']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);
// Các route cần xác thực mới có thể truy cập
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', function (Request $request) {
        $user = $request->user();
        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'email_verified_at' => $user->email_verified_at,
            'avatar_url' => $user->avatar_url,
            'phone_number' => $user->phone_number,
            'gender' => $user->gender,
            'birth_date' => $user->birth_date,
            'created_at' => $user->created_at,
            'updated_at' => $user->updated_at,
            'is_admin' => $user->is_admin, // Important for frontend to know if admin UI should be accessible
        ]);
    });

 Route::get('/user/profile', [UserController::class, 'getProfile']);
    Route::put('/user/profile/update', [UserController::class, 'updateProfile']);
    Route::post('/user/avatar/update', [UserController::class, 'updateAvatar']);
    Route::put('/user/phone/update', [UserController::class, 'updatePhoneNumber']);
    Route::put('/user/email/update', [UserController::class, 'updateEmail']); // Remember verification flow for production
    Route::post('/user/password/change', [UserController::class, 'changePassword']);


    // Addresses
    Route::get('/addresses', [AddressController::class, 'index']);
    Route::post('/addresses', [AddressController::class, 'store']);
    Route::put('/addresses/{address}', [AddressController::class, 'update']);
    Route::delete('/addresses/{address}', [AddressController::class, 'destroy']);
    Route::post('/addresses/{address}/set-default', [AddressController::class, 'setDefault']);

    // Wishlist (product is the Product model instance via route model binding)
    Route::get('/wishlist', [WishlistController::class, 'index']);
    Route::post('/wishlist/{product}', [WishlistController::class, 'store']);
    Route::delete('/wishlist/{product}', [WishlistController::class, 'destroy']);

    // Reorder
    Route::get('/reorder/items', [ReorderController::class, 'getPreviouslyPurchasedItems']);

Route::post('/checkout/place-order-cod', [OrderController::class, 'placeOrderCod']);

    Route::get('/orders', [OrderController::class, 'userOrders']);
Route::post('/orders/{order}/cancel', [OrderController::class, 'cancelOrder']);

Route::post('/order/place', [OrderController::class, 'placeOrder']);

    Route::get('/orders/{order}', [OrderController::class, 'showOrderDetails']);
Route::prefix('admin')->middleware(\App\Http\Middleware\IsAdminMiddleware::class)->group(function () {        // Dashboard
        Route::get('/dashboard/stats', [AdminDashboardController::class, 'getStats']);
    Route::get('/dashboard/revenue-over-time', [AdminDashboardController::class, 'getRevenueOverTimeReport']);

        // Product Management (CRUD)
        Route::apiResource('products', AdminProductController::class); // Provides index, store, show, update, destroy

        // User Management (CRUD)
        Route::apiResource('users', AdminUserController::class)->except(['store']); // Admins typically don't 'register' users this way
        Route::put('users/{user}/toggle-admin', [AdminUserController::class, 'toggleAdminStatus']);
        Route::get('orders', [AdminOrderController::class, 'index']); // List all orders
        Route::get('orders/{order}', [AdminOrderController::class, 'show']); // Show specific order
        Route::put('orders/{order}/status', [AdminOrderController::class, 'updateStatus']); // Update order status
        Route::get('orders/report/summary', [AdminOrderController::class, 'getOrderSummaryReport']); // Order reporting
        // Add more report routes as needed:
        Route::get('orders/report/by-status', [AdminOrderController::class, 'getOrdersByStatusReport']);
        Route::get('orders/report/revenue-over-time', [AdminOrderController::class, 'getRevenueOverTimeReport']);
    });
        
});
Route::get('/products/search-suggestions', [ProductController::class, 'searchSuggestions']); // <--- THÊM DÒNG NÀY
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{id}', [ProductController::class, 'show']);
Route::post('/products/{product}/reviews', [ProductController::class, 'storeReview']); // Thêm dòng này
Route::get('/products/{product}/reviews', [ProductController::class, 'getProductReviews']);

Route::get('/product-types', [ProductController::class, 'getProductTypes']);
Route::get('/brands', [ProductController::class, 'getBrands']);

Route::prefix('cart')->group(function () {
    Route::get('/', [CartController::class, 'index'])->name('cart.index');
    Route::post('/add', [CartController::class, 'add'])->name('cart.add');
    Route::put('/update/{cartItemId}', [CartController::class, 'update'])->name('cart.update'); // cartItemId là key của item trong session cart
    Route::delete('/remove/{cartItemId}', [CartController::class, 'remove'])->name('cart.remove'); // cartItemId là key của item trong session cart
    Route::delete('/clear', [CartController::class, 'clear'])->name('cart.clear');
});


// Checkout/Order Routes
// Route cho đơn COD

// Route để lấy thông tin đơn hàng theo mã
Route::get('/orders/by-code/{order_code}', [OrderController::class, 'getOrderByCode']);

// Route để khởi tạo thanh toán (VNPAY, VietQR)
Route::post('/payment/create', [PaymentController::class, 'createPayment']);

// Routes cho VNPAY xử lý callback
Route::get('/payment/vnpay-return', [PaymentController::class, 'vnpayReturn'])->name('payment.vnpay_return');
Route::get('/payment/vnpay-ipn', [PaymentController::class, 'vnpayIpn'])->name('payment.vnpay_ipn');



// Ví dụ: Order routes
// use App\Http\Controllers\Api\OrderController;
// Route::apiResource('orders', OrderController::class);
Route::get('/test-geo', function(Illuminate\Http\Request $request) {
    $address = 'Khu phố 6, Phường Linh Trung, Thủ Đức, Thành phố Hồ Chí Minh'; // Một địa chỉ mẫu
    try {
        $response = Illuminate\Support\Facades\Http::withHeaders([
            'User-Agent' => config('app.name') . ' - Geocoding Test'
        ])->get('https://nominatim.openstreetmap.org/search', [
            'q' => $address,
            'format' => 'json',
            'limit' => 1
        ]);

        if ($response->successful() && !empty($response->json())) {
            return response()->json([
                'status' => 'SUCCESS',
                'data' => $response->json()
            ]);
        }

        // Nếu không thành công, trả về lỗi
        return response()->json([
            'status' => 'FAILED',
            'response_code' => $response->status(),
            'response_body' => $response->body()
        ], 500);

    } catch (\Exception $e) {
        // Nếu có lỗi Exception (ví dụ: không kết nối được)
        return response()->json([
            'status' => 'EXCEPTION',
            'error_message' => $e->getMessage()
        ], 500);
    }
});