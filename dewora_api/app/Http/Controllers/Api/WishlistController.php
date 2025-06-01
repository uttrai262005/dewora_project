<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Product; // Assuming you have a Product model
use App\Models\ProductImage; // Assuming you have a ProductImage model

class WishlistController extends Controller
{
    /**
     * Display a listing of the user's wishlist items with their first image.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        
        $wishlistItems = $request->user()->wishlistProducts()
            ->with(['productImages' => function ($query) {
                $query->select('product_id', 'image_url') // Select only the necessary columns from product_images
                      ->orderBy('id', 'asc') // Order by ID to get the first image (adjust if you have an 'order' column)
                      ->limit(1); // Get only the first image for each product
            }])
            ->select('products.id', 'products.name', 'products.price') // Select main product attributes
            ->get();

        $wishlistItems = $wishlistItems->map(function ($product) {
            // Get the image_url from the first product image, or null if no images exist
            $product->image_url = $product->productImages->first()->image_url ?? null;

            // Remove the 'productImages' relationship from the output to avoid redundancy
            unset($product->productImages);

            return $product;
        });

        return response()->json($wishlistItems);
    }

    /**
     * Add a product to the user's wishlist.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\Product  $product
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request, Product $product)
    {
        $user = $request->user();

        // Check if the product is already in the wishlist to prevent duplicates
        if ($user->wishlistProducts()->where('product_id', $product->id)->exists()) {
            return response()->json(['message' => 'Sản phẩm đã có trong danh sách yêu thích.'], 409); // Conflict
        }

        // Attach the product to the user's wishlist
        $user->wishlistProducts()->attach($product->id);

        return response()->json(['message' => 'Sản phẩm đã được thêm vào danh sách yêu thích.'], 201); // Created
    }

    /**
     * Remove a product from the user's wishlist.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\Product  $product
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy(Request $request, Product $product)
    {
        // Detach the product from the user's wishlist
        $request->user()->wishlistProducts()->detach($product->id);

        return response()->json(['message' => 'Sản phẩm đã được xóa khỏi danh sách yêu thích.']); // OK
    }
}