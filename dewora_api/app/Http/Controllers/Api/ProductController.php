<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product; // Import Model Product
use App\Models\ProductImage; // Import Model cho mối quan hệ
use App\Models\ProductColor; // Import Model cho mối quan hệ
use App\Models\ProductLabel; // Import Model cho mối quan hệ
use Illuminate\Http\Request; // Import Request
use App\Models\Review; 
use App\Models\ProductType; // <-- Import model ProductType của bạn
use App\Models\Brand;
use Illuminate\Support\Facades\Schema; // Import Schema facade (nếu dùng cho sắp xếp)
use Illuminate\Support\Facades\Log; // Thêm Log facade


class ProductController extends Controller
{
    /**
     * Display a listing of the resource.
     * (READ - multiple items)
     *
     * @param  \Illuminate\Http\Request  $request
     * 
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        // Bắt đầu Query builder cho Product và eager load các mối quan hệ
        $query = Product::with(['brand', 'productType', 'images', 'colors', 'labels']);

        // --- Filtering ---
        // Filter theo thương hiệu (brand name)
       if ($request->has('brand') && is_array($request->input('brand'))) {
    $query->whereIn('brand_id', $request->input('brand'));
}
        // Filter theo loại sản phẩm (product type name)
       if ($request->has('type') && is_array($request->input('type'))) {
     $query->whereIn('type_id', $request->input('type'));
}

        // Filter theo khoảng giá
        if ($request->has('min_price')) {
            $query->where('price', '>=', $request->min_price);
        }
        if ($request->has('max_price')) {
            $query->where('price', '<=', $request->max_price);
        }

        // Tìm kiếm theo tên sản phẩm
        if ($request->has('search_name')) {
            $query->where('name', 'like', '%' . $request->search_name . '%');
        }
 if ($request->has('label_name')) {
            $labelName = $request->input('label_name');
            // Sử dụng whereHas để lọc sản phẩm dựa trên mối quan hệ 'labels'
            // Điều này giả định bạn có một mối quan hệ 'labels' trong Product Model
            // và ProductLabel Model có trường 'label_name'.
            $query->whereHas('labels', function ($q) use ($labelName) {
                $q->where('label_name', $labelName);
            });
        }

        // --- Sorting ---
        $sortBy = $request->input('sort_by', 'id'); // Cột sắp xếp mặc định là 'id'
        $sortOrder = $request->input('sort_order', 'asc'); // Thứ tự sắp xếp mặc định là 'asc'

        // Danh sách các cột được phép sắp xếp trực tiếp trên bảng 'products'
        $allowedSortColumns = ['id', 'price', 'rating', 'name', 'created_at', 'updated_at','review_count'];

        if (in_array($sortBy, $allowedSortColumns)) {
             // Kiểm tra xem cột có tồn tại trong bảng 'products' không trước khi sắp xếp
             if (Schema::hasColumn('products', $sortBy)) {
                 $query->orderBy($sortBy, $sortOrder);
             }
            // Logic sắp xếp theo quan hệ (nếu cần) sẽ phức tạp hơn và không có ở đây
        } else {
            // Nếu cột sắp xếp không hợp lệ, sắp xếp theo 'id' mặc định
            $query->orderBy('id', $sortOrder);
        }


        // --- Pagination ---
        $perPage = $request->input('per_page', 12); // Số lượng sản phẩm trên mỗi trang, mặc định 12
        $products = $query->paginate($perPage);

        // Trả về kết quả dưới dạng JSON
        return response()->json($products);
    }

    /**
     * Store a newly created resource in storage.
     * (CREATE)
     *
     * @param  \Illuminate\Http\Request  $request // Hoặc StoreProductRequest $request nếu dùng Form Request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request) // Hoặc StoreProductRequest $request
    {
        // 1. Validate the request data
        // Sử dụng $request->validate() để kiểm tra dữ liệu đầu vào
        // Form Request ($ php artisan make:request StoreProductRequest) là cách tốt hơn để quản lý validation rules
        $validatedData = $request->validate([
            'name' => 'required|string|max:255', // Tên sản phẩm là bắt buộc, kiểu chuỗi, tối đa 255 ký tự
            'brand_id' => 'required|exists:brands,id', // ID thương hiệu là bắt buộc và phải tồn tại trong bảng 'brands'
            'type_id' => 'required|exists:product_types,id', // ID loại sản phẩm là bắt buộc và phải tồn tại trong bảng 'product_types'
            'description' => 'nullable|string', // Mô tả là tùy chọn (có thể null), kiểu chuỗi
            'price' => 'required|numeric|min:0', // Giá là bắt buộc, kiểu số, không âm
            'original_price' => 'nullable|numeric|min:0', // Giá gốc là tùy chọn, kiểu số, không âm
            'discount_percentage' => 'nullable|integer|min:0|max:100', // Phần trăm giảm giá là tùy chọn, số nguyên từ 0 đến 100
            'rating' => 'nullable|numeric|min:0|max:5', // Rating là tùy chọn, số thực từ 0 đến 5
            'review_count' => 'nullable|integer|min:0', // Số lượt review là tùy chọn, số nguyên không âm
            'gift_description' => 'nullable|string', // Mô tả quà tặng là tùy chọn, kiểu chuỗi

            // --- Validation cho dữ liệu mối quan hệ (Ví dụ) ---
            // Cần xác định rõ định dạng dữ liệu gửi lên cho ảnh, màu, nhãn.
            // Dưới đây là ví dụ validation nếu gửi lên dưới dạng mảng.
            'images' => 'nullable|array', // images là một mảng (tùy chọn)
            'images.*.image_url' => 'required_with:images|string|url|max:255', // Mỗi phần tử trong mảng images cần có 'image_url', là chuỗi URL, tối đa 255
            // 'images.*.is_main_image' => 'boolean', // is_main_image là boolean (tùy chọn)

            'colors' => 'nullable|array', // colors là một mảng (tùy chọn)
            // 'colors.*.color_name' => 'required_with:colors|string|max:255', // Mỗi phần tử trong colors cần có 'color_name', là chuỗi, tối đa 255
            // 'colors.*.color_value' => 'nullable|string|max:255', // color_value là chuỗi (tùy chọn), tối đa 255

            'labels' => 'nullable|array', // labels là một mảng (tùy chọn)
            // 'labels.*' => 'required_with:labels|string|max:255', // Mỗi phần tử trong labels là chuỗi, tối đa 255
        ]);


        // 2. Create the new Product
        // Tạo bản ghi Product mới trong database
        // Chỉ truyền các trường có trong $fillable của Product Model
        $product = Product::create([
            'name' => $validatedData['name'],
            'brand_id' => $validatedData['brand_id'],
            'type_id' => $validatedData['type_id'],
            'description' => $validatedData['description'] ?? null, // Sử dụng ?? null để gán null nếu description không có trong $validatedData
            'price' => $validatedData['price'],
            'original_price' => $validatedData['original_price'] ?? null,
            'discount_percentage' => $validatedData['discount_percentage'] ?? null,
            'rating' => $validatedData['rating'] ?? null,
            'review_count' => $validatedData['review_count'] ?? 0,
            'gift_description' => $validatedData['gift_description'] ?? null,
        ]);


        // 3. Handle related data (Ví dụ đơn giản)
        // Phần này xử lý việc lưu các bản ghi liên quan (ảnh, màu, nhãn) sau khi sản phẩm chính đã được tạo.
        // Logic cụ thể phụ thuộc vào cách bạn gửi dữ liệu liên quan trong request body.
        // Các ví dụ dưới đây giả định dữ liệu liên quan được gửi dưới dạng mảng.

        // Xử lý ảnh (giả định request có mảng 'images' với các object/array chứa 'image_url' và 'is_main_image')
        if ($request->has('images') && is_array($request->input('images'))) {
             foreach ($request->input('images') as $index => $imageData) {
                 // Ép kiểu sang mảng để truy cập nhất quán
                 $imageData = (array) $imageData;
                 // Chỉ tạo nếu có 'image_url'
                 if (isset($imageData['image_url'])) {
                      $product->images()->create([ // Sử dụng quan hệ images()
                          'image_url' => $imageData['image_url'],
                          // Đặt ảnh đầu tiên trong mảng là ảnh chính (hoặc kiểm tra giá trị is_main_image từ request)
                          'is_main_image' => $imageData['is_main_image'] ?? ($index === 0),
                      ]);
                 }
             }
         }

        // Xử lý màu sắc (giả định request có mảng 'colors' với các object/array chứa 'color_name' và 'color_value')
         if ($request->has('colors') && is_array($request->input('colors'))) {
              foreach ($request->input('colors') as $colorData) {
                 $colorData = (array) $colorData;
                  if (isset($colorData['color_name'])) {
                       $product->colors()->create([ // Sử dụng quan hệ colors()
                           'color_name' => $colorData['color_name'],
                           'color_value' => $colorData['color_value'] ?? null,
                       ]);
                  }
              }
          }

        // Xử lý nhãn (giả định request có mảng 'labels' chứa các chuỗi tên nhãn)
         if ($request->has('labels') && is_array($request->input('labels'))) {
             foreach ($request->input('labels') as $labelName) {
                 // Đảm bảo labelName là chuỗi và không rỗng
                 if (is_string($labelName) && !empty($labelName)) {
                      $product->labels()->create(['label_name' => $labelName]); // Sử dụng quan hệ labels()
                 }
             }
         }


        // 4. Return the response
        // Load lại sản phẩm với các mối quan hệ để response trả về dữ liệu đầy đủ của sản phẩm vừa tạo
        $product->load(['brand', 'productType', 'images', 'colors', 'labels']);

        // Trả về response JSON với sản phẩm vừa tạo và status code 201 (Created)
        return response()->json($product, 201);
    }

    /**
     * Display the specified resource.
     * (READ - single item)
     *
     * @param  int  $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function show($id)
    {
        // Tìm sản phẩm theo ID và eager load các mối quan hệ
        $product = Product::with(['brand', 'productType', 'images', 'colors', 'labels'])->find($id);

        // Kiểm tra nếu sản phẩm không tồn tại
        if (!$product) {
            return response()->json(['message' => 'Sản phẩm không tồn tại'], 404);
        }

        // Trả về chi tiết sản phẩm dưới dạng JSON
        return response()->json($product);
    }

    /**
     * Update the specified resource in storage.
     * (UPDATE)
     *
     * @param  \Illuminate\Http\Request  $request // Hoặc UpdateProductRequest $request nếu dùng Form Request
     * @param  int  $id // ID của sản phẩm cần cập nhật (Laravel Route Model Binding có thể tự inject Model nếu type-hint)
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, $id) // Hoặc UpdateProductRequest $request, Product $product
    {
         // Tìm sản phẩm bằng ID (nếu không dùng Route Model Binding theo $product)
         $product = Product::find($id);

        // Kiểm tra nếu sản phẩm không tồn tại
        if (!$product) {
            return response()->json(['message' => 'Sản phẩm không tồn tại'], 404);
        }

        // 1. Validate the request data
        // Sử dụng 'sometimes' cho các trường không bắt buộc phải có trong request update
        $validatedData = $request->validate([
            'name' => 'sometimes|string|max:255', // 'sometimes' sẽ chỉ validate nếu trường này có trong request
            'brand_id' => 'sometimes|required|exists:brands,id', // 'required' đi với 'sometimes' nghĩa là nếu 'brand_id' có mặt, nó phải có giá trị và phải tồn tại
            'type_id' => 'sometimes|required|exists:product_types,id',
            'description' => 'nullable|string', // Cho phép update thành null
            'price' => 'sometimes|numeric|min:0',
            'original_price' => 'nullable|numeric|min:0',
            'discount_percentage' => 'nullable|integer|min:0|max:100',
            'rating' => 'nullable|numeric|min:0|max:5',
            'review_count' => 'nullable|integer|min:0',
            'gift_description' => 'nullable|string',
            // --- Validation cho dữ liệu mối quan hệ (Ví dụ) ---
            // Validation update cho mối quan hệ phức tạp hơn store
             'images' => 'sometimes|array', // Có thể gửi mảng ảnh để cập nhật
             // 'images.*.id' => 'sometimes|exists:product_images,id', // Nếu gửi ID của ảnh hiện có
             // 'images.*.image_url' => 'sometimes|string|url|max:255', // Nếu gửi URL mới cho ảnh
             // 'images.*.is_main_image' => 'sometimes|boolean', // Cập nhật trạng thái ảnh chính

             'colors' => 'sometimes|array', // Có thể gửi mảng màu để cập nhật
             // 'colors.*.id' => 'sometimes|exists:product_colors,id', // Nếu gửi ID màu hiện có
             // 'colors.*.color_name' => 'sometimes|string|max:255', // Cập nhật tên màu
             // 'colors.*.color_value' => 'sometimes|string|max:255', // Cập nhật giá trị màu

             'labels' => 'sometimes|array', // Có thể gửi mảng nhãn để cập nhật/đồng bộ
             // 'labels.*' => 'sometimes|string|max:255', // Tên nhãn
        ]);

        // 2. Update the Product
        // Cập nhật các trường của sản phẩm chính
        // Chỉ cập nhật các trường có trong $validatedData (do 'sometimes')
        $product->update($validatedData);


        // 3. Handle related data updates (Logic phức tạp!)
        // Cách xử lý update mối quan hệ rất đa dạng: thêm mới, xóa bớt, chỉnh sửa bản ghi cũ.
        // Dưới đây là ví dụ đơn giản: xóa hết các bản ghi cũ liên quan và tạo mới lại từ dữ liệu request.
        // Phương án khác có thể dùng sync() nếu mối quan hệ là Many-to-Many hoặc tùy biến logic.

        // Xử lý ảnh (Ví dụ: xóa hết ảnh cũ và tạo mới từ request)
        if ($request->has('images')) { // Kiểm tra request có gửi mảng 'images' lên không
             $product->images()->delete(); // Xóa tất cả ảnh hiện có của sản phẩm này
             if (is_array($request->input('images'))) { // Đảm bảo dữ liệu gửi lên là mảng
                 foreach ($request->input('images') as $index => $imageData) {
                     $imageData = (array) $imageData;
                     if (isset($imageData['image_url'])) {
                          $product->images()->create([ // Tạo bản ghi ảnh mới
                              'image_url' => $imageData['image_url'],
                              'is_main_image' => $imageData['is_main_image'] ?? ($index === 0),
                          ]);
                     }
                 }
             }
         }

        // Xử lý màu sắc (Ví dụ: xóa hết màu cũ và tạo mới từ request)
         if ($request->has('colors')) {
             $product->colors()->delete(); // Xóa tất cả màu hiện có
              if (is_array($request->input('colors'))) {
                 foreach ($request->input('colors') as $colorData) {
                    $colorData = (array) $colorData;
                     if (isset($colorData['color_name'])) {
                          $product->colors()->create([ // Tạo bản ghi màu mới
                              'color_name' => $colorData['color_name'],
                              'color_value' => $colorData['color_value'] ?? null,
                          ]);
                     }
                 }
             }
         }

        // Xử lý nhãn (Ví dụ: xóa hết nhãn cũ và tạo mới từ request)
         if ($request->has('labels')) {
             $product->labels()->delete(); // Xóa tất cả nhãn hiện có
              if (is_array($request->input('labels'))) {
                 foreach ($request->input('labels') as $labelName) {
                      if (is_string($labelName) && !empty($labelName)) {
                          $product->labels()->create(['label_name' => $labelName]); // Tạo bản ghi nhãn mới
                      }
                  }
              }
         }


        // 4. Return the response
        // Load lại sản phẩm với các mối quan hệ để response trả về dữ liệu đã cập nhật đầy đủ
        $product->load(['brand', 'productType', 'images', 'colors', 'labels']);

        // Trả về response JSON với sản phẩm đã cập nhật và status code 200 (OK)
        return response()->json($product);
    }
    /**
     * Lấy danh sách tất cả các loại sản phẩm.
     * <-- THÊM PHƯƠNG THỨC NÀY VÀO -->
     */
    public function getProductTypes()
    {
        try {
            // Lấy tất cả loại sản phẩm từ bảng 'product_types'
            // Giả định bạn có Model ProductType tương ứng
            $productTypes = \App\Models\ProductType::all(['id', 'name']); // Chỉ lấy id và name

            // Trả về danh sách dưới dạng JSON
            return response()->json($productTypes);

        } catch (\Exception $e) {
            // Log lỗi nếu có vấn đề khi truy vấn
            \Log::error("Error fetching product types: " . $e->getMessage());
            // Trả về response lỗi
            return response()->json(['message' => 'Could not fetch product types'], 500);
        }
    }

    /**
     * Lấy danh sách tất cả các thương hiệu.
     * <-- THÊM PHƯƠNG THỨC NÀY VÀO -->
     */
    public function getBrands()
    {
        try {
            // Lấy tất cả thương hiệu từ bảng 'brands'
            // Giả định bạn có Model Brand tương ứng
            $brands = \App\Models\Brand::all(['id', 'name']); // Chỉ lấy id và name

            // Trả về danh sách dưới dạng JSON
            return response()->json($brands);

        } catch (\Exception $e) {
             // Log lỗi nếu có vấn đề khi truy vấn
            \Log::error("Error fetching brands: " . $e->getMessage());
             // Trả về response lỗi
            return response()->json(['message' => 'Could not fetch brands'], 500);
        }
    }

    // ... các phương thức khác như index, show, store, update, destroy ...
    // (Hãy giữ nguyên các phương thức index, show, store, update, destroy mà bạn đã có)

    /**
     * Remove the specified resource from storage.
     * (DELETE)
     *
     * @param  int  $id // ID của sản phẩm cần xóa (Laravel Route Model Binding có thể tự inject Model nếu type-hint)
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy($id) // Hoặc Product $product
    {
        // Tìm sản phẩm bằng ID (nếu không dùng Route Model Binding theo $product)
        $product = Product::find($id);

        // Kiểm tra nếu sản phẩm không tồn tại
        if (!$product) {
            return response()->json(['message' => 'Sản phẩm không tồn tại'], 404);
        }

        // 1. Delete the product
        // Xóa sản phẩm. Nhờ cấu hình 'onDelete('cascade')' trong migration,
        // các bản ghi liên quan trong product_images, product_colors, product_labels, order_items
        // tham chiếu đến sản phẩm này sẽ tự động bị xóa bởi database.
        $product->delete();

        // 2. Return the response
        // Trả về response JSON với status code 204 (No Content)
        // Đây là status code chuẩn cho việc xóa thành công mà không cần trả về nội dung.
        return response()->json(null, 204);
    }
/**
     * Store a new review for a specific product.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\Product  $product // Laravel Route Model Binding
     * @return \Illuminate\Http\JsonResponse
     */
    public function storeReview(Request $request, Product $product)
    {
        // 1. Validate the request data
        $validatedData = $request->validate([
            'name' => 'required|string|max:255', // Tên người đánh giá
            'rating' => 'required|integer|min:1|max:5', // Số sao từ 1 đến 5
            'comment' => 'nullable|string', // Nội dung đánh giá
        ]);

        // 2. Create and save the review
        // Đảm bảo Product Model của bạn có mối quan hệ `hasMany` với Review Model
        // Ví dụ: Trong Product.php, thêm `public function reviews() { return $this->hasMany(Review::class); }`
        $review = $product->reviews()->create($validatedData);

        // 3. Update product's rating and review_count
        // Cần tính toán lại rating trung bình và tổng số review
        $product->rating = $product->reviews()->avg('rating');
        $product->review_count = $product->reviews()->count();
        $product->save(); // Lưu các thay đổi vào database

        // 4. Return the response
        // Trả về dữ liệu sản phẩm đã cập nhật (có rating và review_count mới)
        return response()->json([
            'message' => 'Đánh giá đã được gửi thành công!',
            'review' => $review, // Có thể trả về review vừa tạo
            'rating' => $product->rating, // Rating mới của sản phẩm
            'review_count' => $product->review_count // Số lượng review mới của sản phẩm
        ], 201); // 201 Created status code
    }
    // Note: The 'create' and 'edit' methods are typically used for web interfaces (displaying forms)
    // and are often omitted or left unimplemented in pure API controllers.
    // public function create() { /* ... */ }
    // public function edit(Product $product) { /* ... */ }
    /**
     * Get all reviews for a specific product.
     *
     * @param  \App\Models\Product  $product
     * @return \Illuminate\Http\JsonResponse
     */
    public function getProductReviews(Product $product)
    {
        // Lấy tất cả đánh giá liên quan đến sản phẩm này
        // Sắp xếp theo thời gian tạo mới nhất để hiển thị các đánh giá gần đây trước
        $reviews = $product->reviews()->orderBy('created_at', 'desc')->get();

        return response()->json(['reviews' => $reviews], 200);
    }
    /**
     * Provide search suggestions for products.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function searchSuggestions(Request $request)
    {
        $searchTerm = $request->input('query');

        if (empty($searchTerm)) {
            return response()->json([]);
        }

        try {
            $products = Product::with(['images' => function ($query) {
                // Ưu tiên ảnh chính, sau đó lấy ảnh có ID nhỏ nhất làm fallback
                $query->orderBy('is_main_image', 'desc')->orderBy('id', 'asc');
            }])
            ->where('name', 'LIKE', "%{$searchTerm}%")
            // Cân nhắc tìm kiếm thêm trong mô tả nếu cần
            // ->orWhere('description', 'LIKE', "%{$searchTerm}%")
            ->select('id', 'name') // Chỉ chọn các trường cần thiết từ bảng products ban đầu
            ->take(7) // Giới hạn số lượng gợi ý (ví dụ: 7)
            ->get();

           $suggestions = $products->map(function ($product) {
                $mainImage = $product->images->first();
                $productPageUrl = 'ctsp.html?id=' . $product->id; // <-- THAY ĐỔI DÒNG NÀY

    $imageUrl = 'images/default-placeholder.png'; // Mặc định nếu không có ảnh
               if ($mainImage) {
        // Kiểm tra xem image_url đã là một URL đầy đủ chưa
        if (str_starts_with($mainImage->image_url, 'http://') || str_starts_with($mainImage->image_url, 'https://')) {
            $imageUrl = $mainImage->image_url; // Nếu là URL đầy đủ, dùng nguyên nó
        } else {
            // Nếu không phải URL đầy đủ, giả định là đường dẫn cục bộ và dùng asset()
            $imageUrl = asset($mainImage->image_url);
        }
    }
                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'product_page_url' => $productPageUrl, // <-- Đảm bảo trả về URL này
                    'image_url' => $imageUrl
                ];
            });

            return response()->json($suggestions);

        } catch (\Exception $e) {
            Log::error("Lỗi khi tìm kiếm gợi ý sản phẩm: " . $e->getMessage());
            return response()->json(['message' => 'Không thể xử lý yêu cầu tìm kiếm.'], 500);
        }
    }
    
}