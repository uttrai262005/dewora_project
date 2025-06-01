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

// Thư viện VietQR
use cuongnm\viet_qr_pay\QRPay;

class PaymentController extends Controller
{
    private function getCurrentCart(Request $request)
    {
        $user = auth('sanctum')->user();
        $cart = null;

        if ($user) {
            $cart = Cart::with(['items.product'])->where('user_id', $user->id)->first();
        } else {
            $guestToken = $request->header('X-Guest-Token');
            if ($guestToken) {
                $cart = Cart::with(['items.product'])->where('guest_session_id', $guestToken)->first();
            }
        }
        return $cart;
    }

    public function createPayment(Request $request)
    {
       $validatedData = $request->validate([
            'payment_method' => 'required|string|in:vcb,vnpay',
            'customer_name' => 'required|string|max:255',
            'customer_email' => 'required|email|max:255',
            'customer_phone' => 'required|string|max:20',
            'shipping_name' => 'required|string|max:255',
            'shipping_phone' => 'required|string|max:20',
            'shipping_address' => 'required|string|max:500',
            'notes' => 'nullable|string',
            'shipping_fee' => 'required|numeric|min:0',
        ]);

        $cart = $this->getCurrentCart($request);
        if (!$cart || $cart->items->isEmpty()) {
            return response()->json(['message' => 'Giỏ hàng của bạn đang trống.'], 400);
        }

        $subtotal = $cart->items->reduce(fn ($carry, $item) => $carry + ($item->price * $item->quantity), 0);
        $totalAmount = $subtotal + $validatedData['shipping_fee'];
        $orderCode = 'DEWORA-' . strtoupper(Str::random(8));
$user = auth('sanctum')->user(); // Lấy user đã xác thực
$userIdForOrder = null;
if ($user) {
    $userIdForOrder = $user->id;
} elseif ($cart && $cart->user_id) {
    // Fallback nếu $user không có nhưng giỏ hàng (từ guest token) lại có user_id
    $userIdForOrder = $cart->user_id;
}
        DB::beginTransaction();
        try {
            // Tạo đơn hàng trước với trạng thái "chờ thanh toán"
            $order = Order::create([
                'order_code' => $orderCode,
                        'user_id' => $userIdForOrder, // <--- THÊM DÒNG NÀY HOẶC SỬA

                'status' => 'cho_thanh_toan',
                'payment_method' => $validatedData['payment_method'],
                'payment_status' => 'pending',
                'total_amount' => $totalAmount,
                'subtotal' => $subtotal,
                'shipping_fee' => $validatedData['shipping_fee'],
                 // Thêm các thông tin khác
                'customer_name' => $validatedData['customer_name'],
                'customer_email' => $validatedData['customer_email'],
                'customer_phone' => $validatedData['customer_phone'],
                'shipping_name' => $validatedData['shipping_name'],
                'shipping_phone' => $validatedData['shipping_phone'],
                'shipping_address' => $validatedData['shipping_address'],
                'notes' => $validatedData['notes'],           
             ]);
            
            // Thêm các sản phẩm vào order_items
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
            
            // Xóa giỏ hàng
            $cart->items()->delete();
            $cart->delete();

            // Xử lý theo phương thức thanh toán
            switch ($validatedData['payment_method']) {
            case 'vcb': 
                $bankBin = '970436'; // Mã BIN của Vietcombank
                $accountNo = '1036614880'; // <-- Số tài khoản của bạn
                $purpose = "Thanh toan don hang " . $orderCode;

                $qrPay = QRPay::initVietQR(
                    $bankBin,
                    $accountNo,
                    $totalAmount,
                    $purpose
                );

                $qrCodeImage = $qrPay->generate_image(); // Tạo ảnh QR base64

                if (!$qrCodeImage) {
                    throw new \Exception('Không thể tạo mã VietQR.');
                }
                
                DB::commit();
                return response()->json([
                    'message' => 'Đã tạo đơn hàng, vui lòng thanh toán qua QR code.',
                    'payment_method' => 'vcb',
                    'order_code' => $orderCode,
                    'qr_code_image' => $qrCodeImage,
                    'total_amount' => $totalAmount,
                ]);


                case 'vnpay':
                    // Code xử lý VNPAY
                    $vnp_Url = env('VNPAY_URL');
                    $vnp_Returnurl = env('VNPAY_RETURN_URL');
                    $vnp_TmnCode = env('VNPAY_TMNCODE');
                    $vnp_HashSecret = env('VNPAY_HASHSECRET');

                    $vnp_TxnRef = $orderCode; // Mã đơn hàng
                    $vnp_OrderInfo = "Thanh toan don hang " . $orderCode;
                    $vnp_OrderType = 'billpayment';
                    $vnp_Amount = $totalAmount * 100; // VNPAY yêu cầu nhân 100
                    $vnp_Locale = 'vn';
                    $vnp_IpAddr = $request->ip();

                    $inputData = [
                        "vnp_Version" => "2.1.0",
                        "vnp_TmnCode" => $vnp_TmnCode,
                        "vnp_Amount" => $vnp_Amount,
                        "vnp_Command" => "pay",
                        "vnp_CreateDate" => date('YmdHis'),
                        "vnp_CurrCode" => "VND",
                        "vnp_IpAddr" => $vnp_IpAddr,
                        "vnp_Locale" => $vnp_Locale,
                        "vnp_OrderInfo" => $vnp_OrderInfo,
                        "vnp_OrderType" => $vnp_OrderType,
                        "vnp_ReturnUrl" => $vnp_Returnurl,
                        "vnp_TxnRef" => $vnp_TxnRef,
                    ];

                    ksort($inputData);
                    $query = "";
                    $i = 0;
                    $hashdata = "";
                    foreach ($inputData as $key => $value) {
                        if ($i == 1) {
                            $hashdata .= '&' . urlencode($key) . "=" . urlencode($value);
                        } else {
                            $hashdata .= urlencode($key) . "=" . urlencode($value);
                            $i = 1;
                        }
                        $query .= urlencode($key) . "=" . urlencode($value) . '&';
                    }

                    $vnp_Url = $vnp_Url . "?" . $query;
                    $vnpSecureHash = hash_hmac('sha512', $hashdata, $vnp_HashSecret);
                    $vnp_Url .= 'vnp_SecureHash=' . $vnpSecureHash;

                    DB::commit();
                    return response()->json([
                        'message' => 'Đang chuyển hướng đến VNPAY...',
                        'payment_method' => 'vnpay',
                        'payment_url' => $vnp_Url,
                        'order_code' => $orderCode, // <-- THÊM DÒNG NÀY RẤT QUAN TRỌNG

                    ]);
            }
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Lỗi khởi tạo thanh toán: ' . $e->getMessage() . ' File: ' . $e->getFile() . ' Line: ' . $e->getLine());
            return response()->json(['message' => 'Lỗi hệ thống, không thể khởi tạo thanh toán.'], 500);
        }
    }

    public function vnpayReturn(Request $request)
    {
        // Logic xác thực chữ ký của VNPAY... (có thể tham khảo file vnpay_return.php trong code mẫu)
        // ...
        $orderCode = $request->get('vnp_TxnRef');
        $responseCode = $request->get('vnp_ResponseCode');

        // Chuyển hướng về trang trạng thái đơn hàng
        if ($responseCode == '00') {
             // Thanh toán thành công, chuyển hướng với trạng thái success
            return redirect('http://127.0.0.1:5500/order-status.html?order_code=' . $orderCode . '&status=success');
        } else {
            // Thanh toán thất bại, chuyển hướng với trạng thái failed
            return redirect('http://127.0.0.1:5500/order-status.html?order_code=' . $orderCode . '&status=failed');
        }
    }

    // Hàm VNPAY gọi ngầm để cập nhật trạng thái
    public function vnpayIpn(Request $request)
    {
        // Logic xác thực chữ ký (rất quan trọng)
        // ...
        
        try {
            $orderCode = $request->get('vnp_TxnRef');
            $responseCode = $request->get('vnp_ResponseCode');
            $transactionStatus = $request->get('vnp_TransactionStatus');

            $order = Order::where('order_code', $orderCode)->first();

            if ($order) {
                // Nếu thanh toán thành công
                if ($responseCode == '00' && $transactionStatus == '00') {
                    $order->status = 'cho_dong_goi'; // Trạng thái chờ đóng gói
                    $order->payment_status = 'paid'; // Đã thanh toán
                    $order->save();
                    
                    // Phản hồi cho VNPAY biết đã nhận được thông tin
                    return response()->json(['RspCode' => '00', 'Message' => 'Confirm Success']);
                } else {
                    // Nếu thất bại, có thể cập nhật trạng thái là "thanh toán thất bại"
                    $order->status = 'da_huy';
                    $order->payment_status = 'failed';
                    $order->save();
                }
            }
             return response()->json(['RspCode' => '01', 'Message' => 'Order not found']);

        } catch (\Exception $e) {
             Log::error('VNPAY IPN Error: ' . $e->getMessage());
             return response()->json(['RspCode' => '99', 'Message' => 'Unknown error']);
        }
    }
}