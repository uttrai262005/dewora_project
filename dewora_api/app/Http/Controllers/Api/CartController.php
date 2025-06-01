<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Product;
use App\Models\ProductColor;
use App\Models\Cart;
use App\Models\CartItem;
use Illuminate\Support\Facades\Auth;
// use Illuminate\Support\Facades\Session; // Đảm bảo dòng này đã được bỏ comment nếu bạn đã chuyển sang guest token
use Illuminate\Support\Str; // Thêm để tạo UUID

class CartController extends Controller
{
   private function getCurrentCart(Request $request)
{
    $user = Auth::guard('sanctum')->user();
    $cart = null;
    $response = null; // If you need to manipulate response like clearing cookies

    if ($user) {
        // User is logged in, get or create their cart
        $userCart = Cart::firstOrCreate(['user_id' => $user->id]);
        \Log::info('Cart retrieved/created for authenticated user', ['user_id' => $user->id, 'cart_id' => $userCart->id]);

        // Attempt to merge guest cart if present
        $guestToken = $request->header('X-Guest-Token') ?? $request->input('guest_token');
        // You might also store guest token in a cookie and check $request->cookie('guest_cart_token')

        if ($guestToken) {
            $guestCart = Cart::with('items')->where('guest_session_id', $guestToken)->first();
            if ($guestCart && $guestCart->id !== $userCart->id) { // Check if guest cart exists and is different
                \Log::info('Attempting to merge guest cart to user cart.', [
                    'user_id' => $user->id,
                    'user_cart_id' => $userCart->id,
                    'guest_cart_id' => $guestCart->id,
                    'guest_cart_items' => $guestCart->items->count()
                ]);

                foreach ($guestCart->items as $guestItem) {
                    $existingItem = $userCart->items()
                                            ->where('product_id', $guestItem->product_id)
                                            ->when($guestItem->color_id, function ($query) use ($guestItem) {
                                                return $query->where('color_id', $guestItem->color_id);
                                            }, function ($query) {
                                                return $query->whereNull('color_id');
                                            })
                                            ->first();
                    if ($existingItem) {
                        $existingItem->quantity += $guestItem->quantity;
                        $existingItem->save();
                        $guestItem->delete(); // Remove merged item from guest cart
                    } else {
                        // Move item to user's cart
                        $guestItem->cart_id = $userCart->id;
                        $guestItem->save();
                    }
                }
                // After merging all items, if guest cart is empty, delete it
                if ($guestCart->items()->count() === 0) {
                    $guestCart->delete();
                     \Log::info('Guest cart merged and deleted.', ['deleted_guest_cart_id' => $guestCart->id]);
                    // Consider instructing frontend to clear its guest token
                }
            }
        }
        $cart = $userCart->load(['items.product.images', 'items.productColor']);
    } else {
        // Guest user logic (as you have it)
        $guestToken = $request->header('X-Guest-Token') ?? $request->input('guest_token');

        if (!$guestToken) {
            $guestToken = (string) Str::uuid();
            // If you are creating a new cart, you might want to pass the token back to frontend
            // One way is via a custom header or in the JSON response if this method returns a response.
            // For now, assuming frontend handles guest token generation or receives it elsewhere.
            $cart = Cart::create(['guest_session_id' => $guestToken]);
            \Log::info('New Guest Cart created with auto-generated token', ['guest_token' => $guestToken, 'cart_id' => $cart->id]);
        } else {
            $cart = Cart::firstOrCreate(['guest_session_id' => $guestToken]);
            \Log::info('Guest Cart retrieved/created with provided token', ['guest_token' => $guestToken, 'cart_id' => $cart->id]);
        }
    }

    if ($cart) {
        $cart->load(['items.product.images', 'items.productColor']);
        \Log::info('Cart loaded with items for getCurrentCart', ['cart_id' => $cart->id, 'item_count' => $cart->items->count()]);
    } else {
        \Log::warning('getCurrentCart (CartController) returned null cart.', ['guest_token' => $guestToken, 'user_id' => $user ? $user->id : null]);
    }
    return $cart;
}

     private function calculateCartTotals(Cart $cart)
    {
        // Tải lại các mối quan hệ trước khi tính toán nếu cần,
        // nhưng dòng này đã được gọi ở các phương thức khác.
        // $cart->load(['items.product.images', 'items.color']);

        $totalItems = 0;
        $subtotal = 0;
        $itemsData = [];

        foreach ($cart->items as $item) {
            $product = $item->product; // Lấy đối tượng Product
            $color = $item->color;     // Lấy đối tượng Color

            // Kiểm tra và lấy URL hình ảnh chính
            $imageUrl = null;
            if ($product && $product->images->isNotEmpty()) {
                // Lấy ảnh chính (nếu có trường is_main_image) hoặc ảnh đầu tiên
                $mainImage = $product->images->where('is_main_image', true)->first();
                if (!$mainImage) {
                    $mainImage = $product->images->first();
                }
                if ($mainImage) {
                    // Kiểm tra xem image_url đã là một URL đầy đủ chưa
                    if (str_starts_with($mainImage->image_url, 'http://') || str_starts_with($mainImage->image_url, 'https://')) {
                        $imageUrl = $mainImage->image_url; // Nếu là URL đầy đủ, dùng nguyên nó
                    } else {
                        // Nếu không phải URL đầy đủ, giả định là đường dẫn cục bộ và dùng asset()
                        $imageUrl = asset($mainImage->image_url);
                    }
                }
            }

            // Gán giá trị mặc định nếu không tìm thấy hình ảnh
            if (!$imageUrl) {
                // Đảm bảo đường dẫn này đúng với ảnh placeholder của bạn trong thư mục public
                $imageUrl = asset('images/default-placeholder.png');
            }


            $itemsData[] = [
                'id' => $item->id,
                'product_id' => $item->product_id,
                'product_name' => $product ? $product->name : 'Sản phẩm không tồn tại',
                'product_image' => $imageUrl, // <-- ĐÂY LÀ ĐIỂM SỬA CHỮA CHÍNH: gán URL hình ảnh vào đây
                'color_id' => $item->color_id,
    'color_name' => $item->productColor ? $item->productColor->color_name : 'N/A', // Lấy tên màu từ mối quan hệ productColor
                'quantity' => $item->quantity,
                'price' => $item->price,
                // Bạn có thể thêm các trường khác nếu cần
            ];

            $totalItems += $item->quantity;
            $subtotal += $item->price * $item->quantity;
        }

        return [
            'id' => $cart->id,
            'guest_token' => $cart->guest_session_id,
            'user_id' => $cart->user_id,
            'items' => $itemsData,
            'total_items' => $totalItems,
            'subtotal' => $subtotal,
            'shipping_fee' => 0, // Điều chỉnh nếu có phí vận chuyển
            'total_amount' => $subtotal // Điều chỉnh nếu có phí vận chuyển hoặc giảm giá
        ];
    }

    public function index(Request $request)
    {
        \Log::info('Index method called');
        $cart = $this->getCurrentCart($request);
        if (!$cart) {
            \Log::warning('Cart not found or created in index method, returning empty data.');
            return response()->json([
                'id' => null,
                'user_id' => null,
                'guest_token' => $request->header('X-Guest-Token') ?? $request->input('guest_token'),
                'total_items' => 0,
                'subtotal' => 0,
                'items' => [],
            ]);
        }
        $cartData = $this->calculateCartTotals($cart);
        return response()->json($cartData);
    }

    public function add(Request $request)
    {
        \Log::info('Add method called', $request->all());
        $cart = $this->getCurrentCart($request);
        if (!$cart) {
            \Log::error('Failed to get or create cart in add method.');
            return response()->json(['message' => 'Lỗi: Không thể tạo hoặc lấy giỏ hàng.'], 500);
        }

        $productId = $request->input('product_id');
        $quantity = $request->input('quantity', 1);
        $colorId = $request->input('color_id');

        \Log::info('Attempting to add product to cart', ['cart_id' => $cart->id, 'product_id' => $productId, 'quantity' => $quantity, 'color_id' => $colorId]);

        $product = Product::find($productId);
        if (!$product) {
            \Log::warning('Product not found for add to cart', ['product_id' => $productId]);
            return response()->json(['message' => 'Sản phẩm không tồn tại!'], 404);
        }

        $price = $product->price;

        $cartItem = $cart->items()
                        ->where('product_id', $productId)
                        ->when($colorId, function ($query) use ($colorId) {
                            return $query->where('color_id', $colorId);
                        }, function ($query) {
                            return $query->whereNull('color_id');
                        })
                        ->first();

        if ($cartItem) {
            $cartItem->quantity += $quantity;
            $cartItem->save();
            \Log::info('Cart item quantity updated', ['cart_item_id' => $cartItem->id, 'new_quantity' => $cartItem->quantity]);
        } else {
            $cartItem = new CartItem([
                'product_id' => $productId,
                'quantity' => $quantity,
                'color_id' => $colorId,
                'price' => $price
            ]);
            $cart->items()->save($cartItem);
            \Log::info('New cart item added', ['cart_item_id' => $cartItem->id, 'product_id' => $productId, 'quantity' => $quantity]);
        }

        // Tải lại giỏ hàng và các item của nó để tính toán lại tổng tiền mới nhất
        $cart->refresh(); // Lấy lại dữ liệu giỏ hàng từ DB
$cart->load(['items.product.images', 'items.productColor']);

       $cartData = $this->calculateCartTotals($cart);

        return response()->json([
            'message' => 'Sản phẩm đã được thêm vào giỏ hàng!',
            'cart' => $cartData
        ]);
    }

    public function update(Request $request, $cartItemId)
    {
        \Log::info('Update method called', ['cart_item_id' => $cartItemId, 'request_data' => $request->all()]);
        $cart = $this->getCurrentCart($request);
        if (!$cart) {
            return response()->json(['message' => 'Lỗi: Không tìm thấy giỏ hàng.'], 500);
        }

        $quantity = $request->input('quantity');

        $cartItem = $cart->items()->find($cartItemId);

        if ($cartItem) {
            $cartItem->quantity = $quantity;
            $cartItem->save();
            \Log::info('Cart item quantity updated via update method', ['cart_item_id' => $cartItem->id, 'new_quantity' => $quantity]);

            $cart->refresh();
$cart->load(['items.product.images', 'items.productColor']);
         $cartData = $this->calculateCartTotals($cart);
            return response()->json([
                'message' => 'Giỏ hàng đã được cập nhật!',
                'cart' => $cartData
            ]);
        }
        \Log::warning('Cart item not found in update method', ['cart_item_id' => $cartItemId, 'cart_id' => $cart->id]);
        return response()->json(['message' => 'Sản phẩm không tìm thấy trong giỏ!'], 404);
    }

    public function remove(Request $request, $cartItemId)
    {
        \Log::info('Remove method called', ['cart_item_id' => $cartItemId]);
        $cart = $this->getCurrentCart($request);
        if (!$cart) {
            return response()->json(['message' => 'Lỗi: Không tìm thấy giỏ hàng.'], 500);
        }

        $cartItem = $cart->items()->find($cartItemId);

        if ($cartItem) {
            $cartItem->delete();
            \Log::info('Cart item removed', ['cart_item_id' => $cartItem->id, 'cart_id' => $cart->id]);

            $cart->refresh();
$cart->load(['items.product.images', 'items.productColor']);
           $cartData = $this->calculateCartTotals($cart);
            return response()->json([
                'message' => 'Sản phẩm đã được xóa khỏi giỏ!',
                'cart' => $cartData
            ]);
        }
        \Log::warning('Cart item not found in remove method', ['cart_item_id' => $cartItemId, 'cart_id' => $cart->id]);
        return response()->json(['message' => 'Sản phẩm không tìm thấy trong giỏ!'], 404);
    }

    public function clear(Request $request)
    {
        \Log::info('Clear method called');
        $cart = $this->getCurrentCart($request);
        if (!$cart) {
            return response()->json(['message' => 'Lỗi: Không tìm thấy giỏ hàng.'], 500);
        }

        $cart->items()->delete();
        \Log::info('Cart cleared', ['cart_id' => $cart->id]);

        $cart->refresh();
$cart->load(['items.product.images', 'items.productColor']);

        return response()->json([
            'message' => 'Giỏ hàng đã được dọn sạch!',
            'cart' => $this->calculateCartTotals($cart)
        ]);
    }
}