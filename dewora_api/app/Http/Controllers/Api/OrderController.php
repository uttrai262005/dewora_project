<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Cart;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
class OrderController extends Controller
{
    private function getCurrentCart(Request $request)
{
    $user = auth('sanctum')->user();
    $cart = null;

    if ($user) {
        \Log::info('[OrderController::getCurrentCart] Authenticated user identified.', ['user_id' => $user->id]);
        $cart = Cart::with(['items.product', 'items.productColor'])->where('user_id', $user->id)->first(); // Eager load productColor too
        if ($cart) {
            \Log::info('[OrderController::getCurrentCart] Cart found for user.', ['user_id' => $user->id, 'cart_id' => $cart->id, 'item_count' => $cart->items->count(), 'cart_user_id' => $cart->user_id]);
        } else {
            \Log::warning('[OrderController::getCurrentCart] No cart found for authenticated user.', ['user_id' => $user->id]);
        }
    } else {
        \Log::info('[OrderController::getCurrentCart] User is GUEST or token invalid for order placement.');
        $guestToken = $request->header('X-Guest-Token') ?? $request->input('guest_token');
        if ($guestToken) {
            $cart = Cart::with(['items.product', 'items.productColor'])->where('guest_session_id', $guestToken)->first();
            if ($cart) {
                \Log::info('[OrderController::getCurrentCart] Cart found for GUEST.', ['guest_token' => $guestToken, 'cart_id' => $cart->id, 'item_count' => $cart->items->count(), 'cart_user_id' => $cart->user_id]);
            } else {
                \Log::warning('[OrderController::getCurrentCart] No cart found for GUEST token during order placement.', ['guest_token' => $guestToken]);
            }
        } else {
             \Log::warning('[OrderController::getCurrentCart] No GUEST token provided for order placement.');
        }
    }
    return $cart;
}

    public function placeOrderCod(Request $request)
    {
        $validatedData = $request->validate([
            'customer_name' => 'required|string|max:255',
            'customer_email' => 'required|email|max:255',
            'customer_phone' => 'required|string|max:20',
            'shipping_name' => 'required|string|max:255',
            'shipping_phone' => 'required|string|max:20',
            'shipping_address' => 'required|string|max:500',
            'notes' => 'nullable|string',
            
            'payment_method' => 'required|string|in:cod', // Chỉ chấp nhận COD
            'shipping_fee' => 'required|numeric|min:0', // Thêm validation cho phí ship
        ]);

        DB::beginTransaction();

        try {
            $cart = $this->getCurrentCart($request);

            if (!$cart || $cart->items->isEmpty()) {
                return response()->json(['message' => 'Giỏ hàng của bạn đang trống.'], 400);
            }
$userIdForOrder = Auth::id(); // Lấy ID của user đang đăng nhập

    if (!$userIdForOrder && $cart->user_id) {
        // Nếu không có user đăng nhập nhưng giỏ hàng có user_id (chắc chắn là đã liên kết)
        $userIdForOrder = $cart->user_id;
    }
            $subtotal = $cart->items->reduce(function ($carry, $item) {
                return $carry + ($item->price * $item->quantity);
            }, 0);
            
            // Tính tổng tiền cuối cùng
            $totalAmount = $subtotal + $validatedData['shipping_fee'];

            $order = Order::create([
        'user_id' => $userIdForOrder, // <-- THAY ĐỔI DÒNG NÀY
                'order_code' => 'DEWORA-' . strtoupper(Str::random(8)),
                'customer_name' => $validatedData['customer_name'],
                'customer_email' => $validatedData['customer_email'],
                'customer_phone' => $validatedData['customer_phone'],
                'shipping_name' => $validatedData['shipping_name'],
                'shipping_phone' => $validatedData['shipping_phone'],
                'shipping_address' => $validatedData['shipping_address'],
                'notes' => $validatedData['notes'],
                'subtotal' => $subtotal, // Thêm subtotal
                'shipping_fee' => $validatedData['shipping_fee'], // Thêm phí ship
                'total_amount' => $totalAmount,
                'status' => 'cho_xac_nhan', // <-- THAY ĐỔI QUAN TRỌNG
                'payment_method' => $validatedData['payment_method'],
                'payment_status' => 'pending', // COD thì chờ thanh toán
            ]);

            foreach ($cart->items as $cartItem) {
                            $itemSubtotal = $cartItem->quantity * $cartItem->price;

                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $cartItem->product_id,
                    'product_name' => $cartItem->product->name,
                    'color_id' => $cartItem->color_id,
                    'quantity' => $cartItem->quantity,
                    'price' => $cartItem->price,
                                        'item_subtotal' => $itemSubtotal, // <-- THÊM DÒNG NÀY

                    'product_image_url' => $cartItem->product->images->first()->image_url ?? null,
                ]);
            }

            $cart->items()->delete();
            $cart->delete();

            DB::commit();

            return response()->json([
                'message' => 'Đặt hàng thành công!',
                'order_code' => $order->order_code,
                'order_id' => $order->id
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Lỗi đặt hàng COD: ' . $e->getMessage() . ' tại dòng ' . $e->getLine());
            return response()->json(['message' => 'Đã xảy ra lỗi trong quá trình đặt hàng. Vui lòng thử lại.'], 500);
        }
    }

    // THÊM HÀM MỚI ĐỂ LẤY ĐƠN HÀNG BẰNG MÃ
    public function getOrderByCode(Request $request, $order_code)
    {
        $order = Order::with('items')->where('order_code', $order_code)->first();

        if (!$order) {
            return response()->json(['message' => 'Không tìm thấy đơn hàng'], 404);
        }
        
        // Bạn có thể kiểm tra xem user có quyền xem đơn hàng này không nếu cần
        // ...

    return response()->json(['order' => $order]); // Wrap the order in an 'order' key to match the frontend
    }
public function userOrders(Request $request){
    $user = Auth::user(); // Hoặc $request->user();

    if (!$user) {
        return response()->json(['message' => 'Chưa xác thực.'], 401);
    }

    $orders = Order::with('items') // Eager load 'items' giống như trang chi tiết
                   ->where('user_id', $user->id)
                   ->orderBy('created_at', 'desc') // Sắp xếp đơn mới nhất lên đầu
                   ->get();

    if ($orders->isEmpty()) {
        return response()->json(['orders' => []]); // Trả về mảng rỗng nếu không có đơn nào
    }

    // Chuyển đổi định dạng items cho phù hợp với frontend (nếu cần)
    // Frontend 'don-hang-cua-toi.js' đang mong đợi order.items có product_name, quantity
    $orders->transform(function ($order) {
        $order->items = $order->items->map(function ($item) {
            return [
                'product_name' => $item->product_name,
                'quantity' => $item->quantity,
                // Thêm các trường khác của item nếu frontend cần
            ];
        });
        return $order;
    });


    return response()->json(['orders' => $orders]);
}
/**
     * Hủy một đơn hàng cụ thể của người dùng đã xác thực.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\Order  $order  (Laravel tự động tìm Order theo {order} ID)
     * @return \Illuminate\Http\JsonResponse
     */
    public function cancelOrder(Request $request, Order $order)
    {
        // 1. Kiểm tra quyền của người dùng: Đảm bảo người dùng hiện tại là chủ của đơn hàng
        //    Hoặc bạn có thể thêm logic cho phép admin hủy đơn hàng
        if (Auth::id() !== $order->user_id) { //
            return response()->json(['message' => 'Bạn không có quyền hủy đơn hàng này.'], 403); // 403 Forbidden
        }

        // 2. Kiểm tra trạng thái đơn hàng có cho phép hủy không
        //    Thay đổi các trạng thái này tùy theo business logic của bạn
        $allowedStatusesForCancel = ['cho_xac_nhan', 'cho_thanh_toan']; // Ví dụ: chỉ cho phép hủy khi đang chờ xác nhận hoặc chờ thanh toán

        if (!in_array($order->status, $allowedStatusesForCancel)) { //
            return response()->json(['message' => 'Không thể hủy đơn hàng ở trạng thái hiện tại (' . $order->status_name . ').'], 400); // 400 Bad Request
        }

        // 3. Thực hiện hủy đơn hàng: Cập nhật trạng thái
        $order->status = 'da_huy'; // Đặt trạng thái là 'da_huy'
        $order->save(); //

        // Tùy chọn: Hoàn lại sản phẩm vào kho nếu cần
        // foreach ($order->products as $product) {
        //     $product->increment('stock', $product->pivot->quantity);
        // }

        return response()->json(['message' => 'Đơn hàng đã được hủy thành công.'], 200); // 200 OK
    }
}