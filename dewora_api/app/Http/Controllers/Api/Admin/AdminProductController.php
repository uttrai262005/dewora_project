<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage; // For file uploads

class AdminProductController extends Controller
{
    public function index(Request $request)
    {
        // Simplified version for admin - can add more filters if needed
        $query = Product::with(['brand', 'productType', 'images', 'colors', 'labels']);
        // Basic search by name for admin
        if ($request->has('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }
        $sortBy = $request->input('sort_by', 'id');
        $sortOrder = $request->input('sort_order', 'desc'); // Default to newest first
        $query->orderBy($sortBy, $sortOrder);

    $products = $query->orderBy('id', 'desc')->paginate($request->input('per_page', 10)); // Ensure pagination is applied
        return response()->json($products);
    }

    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'brand_id' => 'required|exists:brands,id',
            'type_id' => 'required|exists:product_types,id',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'original_price' => 'nullable|numeric|min:0|gte:price', // gt: greater than price
            'discount_percentage' => 'nullable|integer|min:0|max:100',
            'gift_description' => 'nullable|string',
            // For images, expect an array of uploaded files or existing image URLs to keep
            'images_files.*' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048', // For new uploaded files
            'images_existing' => 'nullable|array', // Array of image IDs or URLs to keep
            'images_existing.*' => 'sometimes|integer|exists:product_images,id', // Or 'string|url' if you pass full URLs
            'colors' => 'nullable|array',
            'colors.*.color_name' => 'required_with:colors|string|max:50',
            'colors.*.color_value' => 'nullable|string|max:7', // e.g., #FFFFFF
            'labels' => 'nullable|array',
            'labels.*.label_name' => 'required_with:labels|string|max:50',
        ]);

        try {
            $product = Product::create([
                'name' => $validatedData['name'],
                'brand_id' => $validatedData['brand_id'],
                'type_id' => $validatedData['type_id'],
                'description' => $validatedData['description'] ?? null,
                'price' => $validatedData['price'],
                'original_price' => $validatedData['original_price'] ?? null,
                'discount_percentage' => $validatedData['discount_percentage'] ?? null,
                'gift_description' => $validatedData['gift_description'] ?? null,
                'rating' => 0, // Default values
                'review_count' => 0,
            ]);

            // Handle Images - more robust handling
            if ($request->hasFile('images_files')) {
                foreach ($request->file('images_files') as $key => $file) {
                    $path = $file->store('products', 'public'); // Stores in storage/app/public/products
                    $product->images()->create([
                        'image_url' => Storage::url($path), // Generates URL like /storage/products/filename.jpg
                        'is_main_image' => ($key == $request->input('main_image_index', 0)) // Set based on frontend input
                    ]);
                }
            }

            // Handle Colors
            if (!empty($validatedData['colors'])) {
                foreach ($validatedData['colors'] as $colorData) {
                    $product->colors()->create($colorData);
                }
            }
            // Handle Labels
            if (!empty($validatedData['labels'])) {
                foreach ($validatedData['labels'] as $labelData) {
                    $product->labels()->create($labelData);
                }
            }

            $product->load(['brand', 'productType', 'images', 'colors', 'labels']);
            return response()->json($product, 201);

        } catch (\Exception $e) {
            Log::error("Error creating product: " . $e->getMessage());
            return response()->json(['message' => 'Error creating product', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(Product $product)
    {
        $product->load(['brand', 'productType', 'images', 'colors', 'labels', 'reviews']);
        return response()->json($product);
      }

    public function update(Request $request, Product $product)
    {
        $validatedData = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'brand_id' => 'sometimes|required|exists:brands,id',
            'type_id' => 'sometimes|required|exists:product_types,id',
            'description' => 'nullable|string',
            'price' => 'sometimes|required|numeric|min:0',
            'original_price' => 'nullable|numeric|min:0|gte:price',
            'discount_percentage' => 'nullable|integer|min:0|max:100',
            'gift_description' => 'nullable|string',
            'images_files.*' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
            'images_to_delete' => 'nullable|array', // Array of image IDs to delete
            'images_to_delete.*' => 'sometimes|integer|exists:product_images,id',
            'main_image_id' => 'nullable|integer|exists:product_images,id', // ID of the image to be set as main
            'colors' => 'nullable|array',
            'colors.*.id' => 'nullable|integer|exists:product_colors,id',
            'colors.*.color_name' => 'required_with:colors|string|max:50',
            'colors.*.color_value' => 'nullable|string|max:7',
            'labels' => 'nullable|array',
            'labels.*.id' => 'nullable|integer|exists:product_labels,id',
            'labels.*.label_name' => 'required_with:labels|string|max:50',
        ]);
        try {
            $product->update($request->except(['images_files', 'images_to_delete', 'main_image_id', 'colors', 'labels']));

            // Handle Image Deletion
            if ($request->has('images_to_delete')) {
                foreach ($request->input('images_to_delete') as $imageId) {
                    $image = $product->images()->find($imageId);
                    if ($image) {
                        Storage::delete(str_replace('/storage/', 'public/', $image->image_url)); // Delete from storage
                        $image->delete(); // Delete from DB
                    }
                }
            }

            // Handle New Image Uploads
            if ($request->hasFile('images_files')) {
                foreach ($request->file('images_files') as $file) {
                    $path = $file->store('products', 'public');
                    $product->images()->create([
                        'image_url' => Storage::url($path),
                        'is_main_image' => false // Initially false, can be updated by main_image_id
                    ]);
                }
            }
            // Set Main Image
            if ($request->filled('main_image_id')) {
                $product->images()->update(['is_main_image' => false]); // Reset all
                $mainImage = $product->images()->find($request->input('main_image_id'));
                if ($mainImage) {
                    $mainImage->update(['is_main_image' => true]);
                }
            } elseif (!$product->images()->where('is_main_image', true)->exists() && $product->images()->count() > 0) {
                // If no main image set and there are images, set the first one as main
                $product->images()->first()->update(['is_main_image' => true]);
            }


            // Handle Colors (Sync: delete old, add new/update existing)
            if ($request->has('colors')) {
                $existingColorIds = [];
                foreach ($validatedData['colors'] as $colorData) {
                    if (isset($colorData['id'])) { // Existing color
                        $color = $product->colors()->find($colorData['id']);
                        if ($color) $color->update($colorData);
                        $existingColorIds[] = $colorData['id'];
                    } else { // New color
                        $newColor = $product->colors()->create($colorData);
                        $existingColorIds[] = $newColor->id;
                    }
                }
                // Delete colors not in the request
                $product->colors()->whereNotIn('id', $existingColorIds)->delete();
            }

            // Handle Labels (Sync similar to colors)
            if ($request->has('labels')) {
                $existingLabelIds = [];
                foreach ($validatedData['labels'] as $labelData) {
                    if (isset($labelData['id'])) {
                        $label = $product->labels()->find($labelData['id']);
                        if ($label) $label->update($labelData);
                        $existingLabelIds[] = $labelData['id'];
                    } else {
                        $newLabel = $product->labels()->create($labelData);
                        $existingLabelIds[] = $newLabel->id;
                    }
                }
                $product->labels()->whereNotIn('id', $existingLabelIds)->delete();
            }


            $product->load(['brand', 'productType', 'images', 'colors', 'labels']);
            return response()->json($product);

        } catch (\Exception $e) {
            Log::error("Error updating product {$product->id}: " . $e->getMessage());
            return response()->json(['message' => 'Error updating product', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Product $product)
    {
        try {
            // Delete associated images from storage
            foreach ($product->images as $image) {
                Storage::delete(str_replace('/storage/', 'public/', $image->image_url));
            }
            // Relations like images, colors, labels should be set up with onDelete('cascade') in migrations
            // or manually delete them here if not.
            // $product->images()->delete();
            // $product->colors()->delete();
            // $product->labels()->delete();
            // $product->reviews()->delete();
            $product->delete();
            return response()->json(null, 204);
        } catch (\Exception $e) {
            Log::error("Error deleting product {$product->id}: " . $e->getMessage());
            return response()->json(['message' => 'Error deleting product', 'error' => $e->getMessage()], 500);
        }
    }
}