<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB; // For more complex queries if needed

class ReorderController extends Controller
{
    public function getPreviouslyPurchasedItems(Request $request)
    {
        $user = $request->user();

        // This query assumes you have 'orders' and 'order_items' tables
        // and 'order_items' has product_id, product_name, price_at_purchase, image_url (or relations to get them)
        // and 'orders' has user_id and a status indicating completion (e.g., 'da_giao')
        
        $items = DB::table('order_items')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->join('products', 'order_items.product_id', '=', 'products.id') // Join with products for current info if needed
            ->where('orders.user_id', $user->id)
            ->where('orders.status', 'da_giao') // Only from completed orders
            ->select(
                'order_items.product_id',
                'products.name as product_name', // Current product name
                'order_items.price as price_at_purchase', // Price when it was bought
                'products.image_url', // Current product image
                DB::raw('MAX(orders.created_at) as last_purchased_at') // Get the latest purchase date for this item
            )
            ->groupBy('order_items.product_id', 'products.name', 'order_items.price', 'products.image_url')
            ->orderBy('last_purchased_at', 'desc')
            ->get();

        // If you don't store image_url or name in order_items, you must join with Products table.
        // The price should ideally be `price_at_purchase` from `order_items`.

        return response()->json($items);
    }
}