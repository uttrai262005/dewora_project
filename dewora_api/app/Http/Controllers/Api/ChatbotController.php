<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Exception; // Import Exception class for robust error handling

class ChatbotController extends Controller
{
    // --- Private Properties ---
    private $productData = []; // Stores product information loaded from JSON
    // Keywords for product categories
    private $productCategoryKeywords = [
        'moi' => ['son', 'son dưỡng', 'son kem', 'son thỏi', 'son bóng', 'lip balm', 'lipstick'],
        'mat' => ['mascara', 'kẻ mắt', 'eyeliner', 'phấn mắt', 'eye shadow', 'chân mày', 'kẻ mày', 'eyebrow'],
        'da' => ['kem nền', 'foundation', 'cushion', 'phấn phủ', 'powder', 'má hồng', 'blush', 'kem lót', 'primer'],
        'khac' => ['che khuyết điểm', 'concealer', 'xịt khóa nền', 'setting spray', 'highlight', 'tạo khối', 'contour', 'cọ trang điểm', 'makeup brush', 'bông mút', 'makeup sponge'],
        'duongda' => ['serum', 'kem dưỡng', 'moisturizer', 'tẩy trang', 'makeup remover', 'sữa rửa mặt', 'cleanser', 'toner', 'mặt nạ', 'mask', 'kem chống nắng', 'sunscreen', 'sun cream']
    ];
    // Keywords for skin concerns
    private $skinConcernKeywords = [
        'mun' => ['mụn', 'trị mụn', 'da mụn', 'acne', 'da dầu mụn'],
        'dadau' => ['da dầu', 'kiềm dầu', 'da nhờn', 'oily skin'],
        'dakho' => ['da khô', 'dưỡng ẩm', 'khô ráp', 'dry skin'],
        'nhaycam' => ['da nhạy cảm', 'kích ứng', 'sensitive skin'],
        'laohoa' => ['lão hóa', 'chống lão hóa', 'nếp nhăn', 'anti-aging'],
        'sam' => ['thâm', 'nám', 'tàn nhang', 'sạm da', 'đều màu da', 'dark spots', 'pigmentation'],
        'lochanlong' => ['lỗ chân lông to', 'thu nhỏ lỗ chân lông', 'se khít lỗ chân lông', 'large pores']
    ];
    // Keywords for general greetings
    private $greetingKeywords = ['xin chào', 'chào bạn', 'hello', 'hi', 'chào shop', 'chào dewora', 'alo'];
    // Keywords for thank you messages
    private $thankYouKeywords = ['cảm ơn', 'thank you', 'thanks', 'cảm ơn bạn', 'cảm ơn shop', 'cám ơn'];
    // Keywords for goodbye messages
    private $goodbyeKeywords = ['tạm biệt', 'bye', 'goodbye', 'hẹn gặp lại', 'chào nhé'];
    // Trigger keywords for skin advice intent
    private $skinAdviceTriggerKeywords = ['dùng gì', 'loại nào', 'sản phẩm', 'cho da', 'điều trị', 'khắc phục', 'tư vấn da', 'chăm sóc da', 'nên dùng'];
    // Trigger keywords for find product intent
    private $findProductTriggerKeywords = ['tìm', 'mua', 'xem', 'báo giá', 'giá bao nhiêu', 'sản phẩm', 'muốn mua', 'có bán', 'giới thiệu'];

    private $maxSuggestions = 5; // Maximum number of suggestions to return to the frontend
    private $maxProductResults = 5; // Maximum number of products to show in a list

    // --- Constructor ---
    public function __construct()
    {
        $this->loadProductData(); // Load product data when the controller is instantiated
    }

    // --- Public API Endpoint ---
    public function handleRequest(Request $request)
    {
        Log::info('Chatbot: Nhận request mới.', $request->all());

        // Validate incoming request data
        $request->validate([
            'message' => 'required|string|max:500',
            'context' => 'nullable|array',
        ]);

        $userMessage = $request->input('message');
        $currentContext = $request->input('context', []);

        // Normalize the user's message for keyword matching
        $normalizedInput = $this->normalizeText($userMessage);

        try {
            // Understand the user's intent and extract entities
            $nluResult = $this->understandIntent($normalizedInput, $currentContext, $userMessage);
            $intent = $nluResult['intent'];
            $entities = $nluResult['entities'];
            $updatedContext = $nluResult['context'];

            // Generate the bot's response based on the intent and entities
            $response = $this->generateResponse($intent, $entities, $updatedContext, $normalizedInput, $userMessage);

            Log::info('Chatbot: Trả về response.', ['reply' => $response['reply'], 'context' => $response['context']]);

            // Return the response as JSON
            return response()->json([
                'reply' => $response['reply'],
                'context' => $response['context'],
                'next_suggestions' => $response['context']['next_suggestions'] ?? []
            ]);

        } catch (Exception $e) {
            // Catch any unexpected errors during processing
            Log::error('Chatbot: Lỗi xử lý request: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json([
                'reply' => 'Xin lỗi, đã có lỗi hệ thống xảy ra. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.',
                'context' => [], // Reset context on severe error
                'next_suggestions' => ["Chào bạn", "Tìm sản phẩm"]
            ], 500); // Internal Server Error
        }
    }

    // --- Data Loading ---
    private function loadProductData()
    {
        Log::info('Chatbot: Bắt đầu tải dữ liệu sản phẩm...');
        try {
            $jsonPath = storage_path('data/products.json');
            if (file_exists($jsonPath)) {
                $fileContent = file_get_contents($jsonPath);
                if ($fileContent === false) {
                    throw new Exception("Không thể đọc file: " . $jsonPath);
                }
                $this->productData = json_decode($fileContent, true);
                if (json_last_error() !== JSON_ERROR_NONE) {
                    $errorMsg = 'Lỗi JSON khi decode file products_with_keywords.json: ' . json_last_error_msg();
                    Log::error('Chatbot: ' . $errorMsg);
                    throw new Exception($errorMsg);
                }
                Log::info('Chatbot: Đã tải ' . count($this->productData) . ' sản phẩm.');
            } else {
                Log::warning('Chatbot: File products_with_keywords.json không tồn tại tại: ' . $jsonPath);
                $this->productData = []; // Ensure productData is an empty array if file is missing
            }
        } catch (Exception $e) {
            Log::error('Chatbot: Lỗi tải dữ liệu sản phẩm: ' . $e->getMessage());
            $this->productData = []; // Ensure productData is empty on error
            // In a production environment, you might want to alert an admin here.
        } finally {
            Log::info('Chatbot: Kết thúc tải dữ liệu sản phẩm.');
        }
    }

    // --- Text Processing Utilities ---
    private function normalizeText($text)
    {
        if (!is_string($text)) {
            Log::warning('normalizeText received non-string input: ' . gettype($text));
            return ''; // Return empty string to prevent further errors
        }
        $text = mb_strtolower($text, 'UTF-8'); // Convert to lowercase
        $text = Str::ascii($text); // Remove Vietnamese diacritics
        $text = preg_replace('/[^\p{L}\p{N}\s-]/u', '', $text); // Remove special characters, keep letters, numbers, spaces, hyphens
        $text = trim(preg_replace('/\s+/', ' ', $text)); // Replace multiple spaces with single space and trim
        return $text;
    }

    private function checkKeywords($text, $keywords)
    {
        $normalizedText = $this->normalizeText($text);
        foreach ($keywords as $keyword) {
            if (Str::contains($normalizedText, $this->normalizeText($keyword))) {
                return true;
            }
        }
        return false;
    }

    private function getFirstMatchedKeyword($text, $keywords)
    {
        $normalizedText = $this->normalizeText($text);
        foreach ($keywords as $keyword) {
            $normalizedKeyword = $this->normalizeText($keyword);
            if (Str::contains($normalizedText, $normalizedKeyword)) {
                return $keyword; // Return the original (non-normalized) matched keyword
            }
        }
        return null;
    }

    // --- Intent Recognition ---
    private function understandIntent($normalizedInput, $currentContext, $originalUserInput)
    {
        $intent = 'unknown';
        $entities = [];
        $updatedContext = $currentContext;

        Log::info('[UnderstandIntent] Processing input for intent:', ['normalized' => $normalizedInput, 'context_in' => $currentContext]);

        // 1. Check if the bot was waiting for a specific response
        if (isset($updatedContext['bot_waiting_for'])) {
            $waitingFor = $updatedContext['bot_waiting_for'];
            Log::info('[UnderstandIntent] Bot was waiting for: ' . $waitingFor);

            switch ($waitingFor) {
                case 'brand_preference_or_detail':
                case 'brand_query':
                    $brand = $this->extractBrandFromName($originalUserInput);
                    if ($brand) {
                        $intent = 'provide_brand_preference';
                        $entities['brand'] = $brand;
                        Log::info('[UnderstandIntent]   Resolved bot_waiting_for: provide_brand_preference');
                    } elseif ($this->checkKeywords($normalizedInput, ['chi tiet', 'thong tin', 'xem them', 'san pham so'])) {
                        $intent = 'request_product_detail';
                        Log::info('[UnderstandIntent]   Resolved bot_waiting_for: request_product_detail');
                    } elseif ($this->checkKeywords($normalizedInput, ['khong', 'thoi', 'bo qua', 'khong can'])) {
                        $intent = 'cancel_action';
                        $entities['action_to_cancel'] = $waitingFor;
                        Log::info('[UnderstandIntent]   Resolved bot_waiting_for: cancel_action');
                    }
                    break;
                case 'product_detail_query':
                    // User is expected to provide product number or name for detail
                    $productRef = $this->extractProductReferenceFromInput($originalUserInput, $currentContext['last_found_products'] ?? []);
                    if ($productRef !== null || $this->checkKeywords($normalizedInput, ['chi tiet', 'thong tin', 'xem them'])) {
                        $intent = 'request_product_detail';
                        // The actual product ID extraction will happen in generateResponse
                        Log::info('[UnderstandIntent]   Resolved bot_waiting_for: request_product_detail (explicit)');
                    }
                    break;
                case 'skin_concern_query':
                    $extractedSkinConcern = $this->extractSkinConcern($originalUserInput);
                    if ($extractedSkinConcern) {
                        $intent = 'skin_advice';
                        $entities['skin_concern_original'] = $extractedSkinConcern['original'];
                        $entities['skin_concern_key'] = $extractedSkinConcern['key'];
                        Log::info('[UnderstandIntent]   Resolved bot_waiting_for: skin_advice');
                    }
                    break;
                case 'product_specification':
                    // User is expected to provide more specific product query
                    $extractedEntities = $this->extractProductAndConcern($originalUserInput);
                    if (!empty($extractedEntities['product_category_original']) || !empty($extractedEntities['skin_concern_original'])) {
                        $intent = 'find_product';
                        $entities = array_merge($entities, $extractedEntities);
                        Log::info('[UnderstandIntent]   Resolved bot_waiting_for: find_product (specific)');
                    }
                    break;
                case 'product_purchase_action':
                    if ($this->checkKeywords($normalizedInput, ['mua', 'them vao gio', 'dat hang'])) {
                        $intent = 'add_to_cart';
                        Log::info('[UnderstandIntent]   Resolved bot_waiting_for: add_to_cart');
                    } elseif ($this->checkKeywords($normalizedInput, ['san pham tuong tu', 'loai khac'])) {
                        $intent = 'find_similar_product';
                        Log::info('[UnderstandIntent]   Resolved bot_waiting_for: find_similar_product');
                    } elseif ($this->checkKeywords($normalizedInput, ['khong', 'thoi', 'bo qua', 'khong can'])) {
                        $intent = 'cancel_action';
                        $entities['action_to_cancel'] = $waitingFor;
                        Log::info('[UnderstandIntent]   Resolved bot_waiting_for: cancel_action');
                    }
                    break;
                default:
                    // If bot was waiting but input didn't match, fall through to general intent
                    Log::info('[UnderstandIntent]   bot_waiting_for did not resolve, continuing to general intent.');
                    break;
            }

            // If an intent was resolved from bot_waiting_for, clear the flag and return
            if ($intent !== 'unknown') {
                unset($updatedContext['bot_waiting_for']);
                Log::info('[UnderstandIntent]   bot_waiting_for flag cleared.');
                $updatedContext['last_user_intent'] = $intent;
                return ['intent' => $intent, 'entities' => $entities, 'context' => $updatedContext];
            }
        }

        // 2. General Intent Recognition (if not resolved by bot_waiting_for)
        if ($intent === 'unknown') {
            if ($this->checkKeywords($normalizedInput, $this->greetingKeywords)) {
                $intent = 'greeting';
            } elseif ($this->checkKeywords($normalizedInput, $this->thankYouKeywords)) {
                $intent = 'thank_you';
            } elseif ($this->checkKeywords($normalizedInput, $this->goodbyeKeywords)) {
                $intent = 'goodbye';
            } else {
                // Try to extract entities first to infer intent
                $extractedEntities = $this->extractProductAndConcern($originalUserInput);
                $entities = array_merge($entities, $extractedEntities); // Merge any found entities

                $hasProductCategory = !empty($entities['product_category_original']);
                $hasSkinConcern = !empty($entities['skin_concern_original']);

                if ($hasProductCategory && $this->checkKeywords($normalizedInput, $this->findProductTriggerKeywords)) {
                    $intent = 'find_product';
                } elseif ($hasSkinConcern && $this->checkKeywords($normalizedInput, $this->skinAdviceTriggerKeywords)) {
                    $intent = 'skin_advice';
                } elseif ($hasProductCategory) { // Implicit product search (e.g., "son môi")
                    $intent = 'find_product';
                } elseif ($hasSkinConcern) { // Implicit skin advice (e.g., "da dầu")
                    $intent = 'skin_advice';
                } elseif ($this->checkKeywords($normalizedInput, ['mua', 'dat hang', 'gio hang'])) {
                    $intent = 'add_to_cart'; // User might be trying to add something to cart without prior product context
                }
            }
        }

        // Update context with last queried entities if found
        if (!empty($entities['product_category_original'])) {
            $updatedContext['last_queried_category_keyword'] = $entities['product_category_original'];
        }
        if (!empty($entities['skin_concern_original'])) {
            $updatedContext['last_queried_skin_concern'] = $entities['skin_concern_original'];
        }

        $updatedContext['last_user_intent'] = $intent;
        Log::info('[UnderstandIntent] Final Output:', ['intent' => $intent, 'entities' => $entities, 'context_out' => $updatedContext]);
        return ['intent' => $intent, 'entities' => $entities, 'context' => $updatedContext];
    }

    // --- Entity Extraction Helpers ---
    private function extractProductAndConcern($text, $extractProduct = true)
    {
        $entities = [];
        if ($extractProduct) {
            $extractedProductCategory = $this->extractProductCategory($text);
            if ($extractedProductCategory) {
                $entities['product_category_original'] = $extractedProductCategory['original'];
                $entities['product_category_key'] = $extractedProductCategory['key'];
            }
        }
        $extractedSkinConcern = $this->extractSkinConcern($text);
        if ($extractedSkinConcern) {
            $entities['skin_concern_original'] = $extractedSkinConcern['original'];
            $entities['skin_concern_key'] = $extractedSkinConcern['key'];
        }
        Log::info('[extractProductAndConcern] Extracted: ', $entities);
        return $entities;
    }

    private function extractProductCategory($text)
    {
        foreach ($this->productCategoryKeywords as $categoryKey => $keywords) {
            if ($matchedKeyword = $this->getFirstMatchedKeyword($text, $keywords)) {
                return ['key' => $categoryKey, 'original' => $matchedKeyword];
            }
        }
        return null;
    }

    private function extractSkinConcern($text)
    {
        foreach ($this->skinConcernKeywords as $concernKey => $keywords) {
            if ($matchedKeyword = $this->getFirstMatchedKeyword($text, $keywords)) {
                return ['key' => $concernKey, 'original' => $matchedKeyword];
            }
        }
        return null;
    }

    private function extractBrandFromName($text)
    {
        $brand = null;
        try {
            // Get all unique brands from product data
            $allBrands = array_unique(array_column($this->productData, 'brand'));
            $normalizedTextForBrandSearch = $this->normalizeText($text);

            foreach ($allBrands as $b) {
                if (empty($b)) continue; // Skip empty brand names
                // Check for original case match or normalized match
                if (Str::contains(mb_strtolower($text, 'UTF-8'), mb_strtolower($b, 'UTF-8')) ||
                    Str::contains($normalizedTextForBrandSearch, $this->normalizeText($b))) {
                    $brand = $b;
                    break;
                }
            }
            Log::info('[extractBrandFromName] Found brand: ' . ($brand ?? 'None'));
        } catch (Exception $e) {
            Log::error('[extractBrandFromName] Error during brand extraction: ' . $e->getMessage() . ' in text: ' . $text);
        }
        return $brand;
    }

    private function extractProductReferenceFromInput($originalUserInput, $productIdsInContext)
    {
        $normalizedInput = $this->normalizeText($originalUserInput);

        // 1. Check for product number (e.g., "sản phẩm 1", "cái thứ 2", "số 3")
        if (preg_match_all('/\\b(san pham|so|thu|cai)\\s*(\\d+)\\b/', $normalizedInput, $matches)) {
            if (!empty($matches[2])) {
                $index = intval(end($matches[2])) - 1; // Convert to 0-based index
                if ($index >= 0 && $index < count($productIdsInContext)) {
                    Log::info('[extractProductReferenceFromInput] Matched by index: ' . $index);
                    return $productIdsInContext[$index]; // Return product ID
                }
            }
        }
        // 2. Check for product name (partial or full)
        foreach ($this->productData as $p) {
            if (in_array($p['id'], $productIdsInContext)) { // Only consider products in the current context
                 // Compare original name (with diacritics) and normalized name (without diacritics)
                if (Str::contains(mb_strtolower($originalUserInput, 'UTF-8'), mb_strtolower($p['name'], 'UTF-8')) ||
                    Str::contains($normalizedInput, $this->normalizeText($p['name']))) {
                    Log::info('[extractProductReferenceFromInput] Matched by name: ' . $p['name']);
                    return $p['id'];
                }
            }
        }
        Log::info('[extractProductReferenceFromInput] No product reference found.');
        return null;
    }

    // --- Response Generation ---
    private function generateResponse($intent, $entities, $currentContext, $normalizedInput, $originalUserInput)
    {
        $reply = "Xin lỗi, tôi chưa hiểu rõ yêu cầu của bạn.";
        $updatedContext = $currentContext;
        $updatedContext['next_suggestions'] = []; // Always reset suggestions to be generated dynamically

        Log::info('[GenerateResponse] Generating response for intent: ' . $intent, ['entities' => $entities, 'context_in' => $currentContext]);

        try {
            switch ($intent) {
                case 'greeting':
                    $greetings = ["Chào bạn! Mình là trợ lý ảo của DEWORA. Bạn cần tư vấn về sản phẩm nào nè?", "Xin chào! DEWORA rất vui được hỗ trợ bạn hôm nay. Bạn muốn tìm gì?", "Hi! Mình là bot của DEWORA, có thể giúp bạn tìm sản phẩm và tư vấn làm đẹp."];
                    $reply = $greetings[array_rand($greetings)];
                    $updatedContext['conversation_stage'] = 'greeted';
                    $updatedContext['next_suggestions'] = $this->getSuggestions(["Tìm son môi", "Tư vấn kem chống nắng", "Da mụn nên dùng gì?"]);
                    break;

                case 'thank_you':
                    $reply = "Không có chi! Rất vui khi được giúp bạn.";
                    $updatedContext['next_suggestions'] = $this->getSuggestions(["Tìm sản phẩm khác", "Tạm biệt"]);
                    break;

                case 'goodbye':
                    $reply = "Tạm biệt bạn nhé! Chúc bạn một ngày tốt lành. Hẹn gặp lại!";
                    $updatedContext = []; // Clear context on goodbye
                    break;

                case 'find_product':
                    $response = $this->handleFindProduct($entities, $updatedContext, $originalUserInput);
                    $reply = $response['reply'];
                    $updatedContext = $response['context'];
                    break;

                case 'provide_brand_preference':
                    $response = $this->handleProvideBrandPreference($entities, $updatedContext);
                    $reply = $response['reply'];
                    $updatedContext = $response['context'];
                    break;

                case 'request_product_detail':
                    $response = $this->handleRequestProductDetail($entities, $updatedContext, $originalUserInput);
                    $reply = $response['reply'];
                    $updatedContext = $response['context'];
                    break;

                case 'skin_advice':
                    $response = $this->handleSkinAdvice($entities, $updatedContext);
                    $reply = $response['reply'];
                    $updatedContext = $response['context'];
                    break;

                case 'add_to_cart':
                    $response = $this->handleAddProductToCart($entities, $updatedContext, $originalUserInput);
                    $reply = $response['reply'];
                    $updatedContext = $response['context'];
                    break;

                case 'find_similar_product':
                    $response = $this->handleFindSimilarProduct($entities, $updatedContext);
                    $reply = $response['reply'];
                    $updatedContext = $response['context'];
                    break;

                case 'cancel_action':
                    $response = $this->handleCancelAction($entities, $updatedContext);
                    $reply = $response['reply'];
                    $updatedContext = $response['context'];
                    break;

                default: // 'unknown' intent
                    $response = $this->handleUnknownIntent($updatedContext);
                    $reply = $response['reply'];
                    $updatedContext = $response['context'];
                    break;
            }
        } catch (Exception $e) {
            Log::error('[GenerateResponse] Exception caught: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            $reply = "Xin lỗi, đã có lỗi nghiêm trọng xảy ra trong quá trình xử lý. Vui lòng thử lại sau.";
            $updatedContext = []; // Reset context on critical error
            $updatedContext['next_suggestions'] = $this->getSuggestions(["Bắt đầu lại", "Liên hệ hỗ trợ"]);
        } finally {
            Log::info('[GenerateResponse] Final Reply:', ['reply' => $reply, 'context_out' => $updatedContext]);
            return ['reply' => $reply, 'context' => $updatedContext];
        }
    }

    // --- Intent Handling Functions (Separated for clarity and maintainability) ---

    private function handleFindProduct($entities, $currentContext, $originalUserInput)
    {
        $reply = "";
        $updatedContext = $currentContext;
        $foundProducts = [];
        $searchCriteria = [];
        $replyMessageParts = [];

        // Determine search criteria based on entities and context
        $categoryKeyword = $entities['product_category_original'] ?? $currentContext['last_queried_category_keyword'] ?? null;
        if ($categoryKeyword) {
            $replyMessageParts[] = "Bạn đang tìm " . $categoryKeyword;
            $searchCriteria['type_keywords'] = [$categoryKeyword];
        }

        $skinConcernKeyword = $entities['skin_concern_original'] ?? $currentContext['last_queried_skin_concern'] ?? null;
        if ($skinConcernKeyword) {
            if (empty($replyMessageParts)) $replyMessageParts[] = "Bạn đang tìm sản phẩm";
            $replyMessageParts[] = "phù hợp cho " . $skinConcernKeyword;
            $searchCriteria['keywords_contain'] = [$skinConcernKeyword];
        }

        if (!empty($searchCriteria)) {
            $replyMessageParts[] = " phải không? Để mình xem nhé...";
            $reply = implode(" ", $replyMessageParts);
            $foundProducts = $this->searchProductsByCriteria($searchCriteria, $this->productData, $this->maxProductResults);
        }

        if (!empty($foundProducts)) {
            $reply .= "\nMình tìm thấy một số sản phẩm sau:\n" . $this->formatProductList($foundProducts);
            $updatedContext['last_found_products'] = array_column($foundProducts, 'id');
            $updatedContext['bot_waiting_for'] = 'brand_preference_or_detail'; // Bot expects brand or product detail
            $updatedContext['conversation_stage'] = 'product_results_shown';
            $updatedContext['next_suggestions'] = $this->getSuggestions(["Xem chi tiết SP 1", "Lọc theo hãng A", "Tìm loại khác"]);
        } elseif (!empty($searchCriteria)) {
            $reply = implode(" ", $replyMessageParts);
            $reply .= "\nXin lỗi, mình chưa tìm thấy sản phẩm nào khớp với mô tả của bạn. Bạn thử tìm với từ khóa khác xem sao nhé.";
            unset($updatedContext['last_found_products']); // Clear previous product results
            $updatedContext['conversation_stage'] = 'product_not_found';
            $updatedContext['next_suggestions'] = $this->getSuggestions(["Tìm kem dưỡng ẩm", "Tư vấn cho da dầu"]);
        } else {
            $reply = "Bạn muốn tìm sản phẩm cụ thể nào? (ví dụ: son dưỡng, kem chống nắng cho da dầu,...)";
            $updatedContext['bot_waiting_for'] = 'product_specification'; // Bot waits for more specific product query
            $updatedContext['next_suggestions'] = $this->getSuggestions(["Son dưỡng", "Kem chống nắng cho da dầu"]);
        }

        return ['reply' => $reply, 'context' => $updatedContext];
    }

    private function handleProvideBrandPreference($entities, $currentContext)
    {
        $reply = "Xin lỗi, mình không thể lọc sản phẩm theo hãng lúc này.";
        $updatedContext = $currentContext;

        if (isset($entities['brand']) && !empty($currentContext['last_found_products'])) {
            $brandName = $entities['brand'];
            $categoryName = $currentContext['last_queried_category_keyword'] ?? 'sản phẩm';
            $reply = "Được rồi, mình sẽ lọc {$categoryName} của hãng '{$brandName}' từ danh sách vừa rồi nhé:\n";

            // Filter products from the last search results
            $productsFromLastSearch = array_filter($this->productData, function ($p) use ($currentContext) {
                return in_array($p['id'], $currentContext['last_found_products']);
            });

            $filteredByBrand = $this->searchProductsByCriteria(['brand' => $brandName], $productsFromLastSearch, $this->maxProductResults);

            if (!empty($filteredByBrand)) {
                $reply .= $this->formatProductList($filteredByBrand);
                $updatedContext['last_found_products'] = array_column($filteredByBrand, 'id');
                $updatedContext['bot_waiting_for'] = 'product_action'; // After filtering, user might want to see detail
                $updatedContext['next_suggestions'] = $this->getSuggestions(["Xem chi tiết SP 1", "Tìm hãng khác", "Tìm loại khác"]);
            } else {
                $reply = "Xin lỗi, không có sản phẩm nào của hãng " . $brandName . " trong danh sách vừa rồi. Bạn thử tìm hãng khác hoặc xem lại danh sách cũ nhé.";
                $updatedContext['next_suggestions'] = $this->getSuggestions(["Xem lại danh sách trước", "Tìm sản phẩm khác"]);
            }
        } else {
            $reply = "Bạn muốn lọc theo hãng nào? Vui lòng nói rõ tên hãng nhé.";
            $updatedContext['bot_waiting_for'] = 'brand_query';
            $updatedContext['next_suggestions'] = $this->getSuggestions(["Innisfree", "Maybelline"]);
        }

        return ['reply' => $reply, 'context' => $updatedContext];
    }

    private function handleRequestProductDetail($entities, $currentContext, $originalUserInput)
    {
        $reply = "Xin lỗi, mình không thể hiển thị chi tiết sản phẩm lúc này.";
        $updatedContext = $currentContext;
        $product = null;

        try {
            if (!empty($currentContext['last_found_products'])) {
                // Try to extract product reference from current input
                $productRef = $this->extractProductReferenceFromInput($originalUserInput, $currentContext['last_found_products']);

                if ($productRef !== null) {
                    // Find the product in the full product data
                    foreach ($this->productData as $p) {
                        if ($p['id'] == $productRef) {
                            // Ensure the product is from the last found list
                            if (in_array($p['id'], $currentContext['last_found_products'])) {
                                $product = $p;
                                break;
                            }
                        }
                    }
                } elseif (count($currentContext['last_found_products']) == 1) {
                    // If only one product was found in the last search, assume user wants detail for that one
                    $product = $this->productData[array_search($currentContext['last_found_products'][0], array_column($this->productData, 'id'))];
                }
            }

            if ($product) {
                $reply = $this->formatProductDetail($product);
                $updatedContext['last_detailed_product_id'] = $product['id'];
                $updatedContext['bot_waiting_for'] = 'product_purchase_action'; // User might want to buy or find similar
                $updatedContext['next_suggestions'] = $this->getSuggestions(["Thêm vào giỏ hàng", "Tìm sản phẩm tương tự", "Quay lại"]);
            } else {
                $reply = "Bạn muốn xem chi tiết sản phẩm nào? Vui lòng nói rõ số hoặc tên sản phẩm nhé.";
                $updatedContext['bot_waiting_for'] = 'product_detail_query';
                $updatedContext['next_suggestions'] = $this->getSuggestions(["Sản phẩm 1", "Tên sản phẩm"]);
            }
        } catch (Exception $e) {
            Log::error('[handleRequestProductDetail] Error: ' . $e->getMessage());
            $reply = "Xin lỗi, có lỗi khi hiển thị chi tiết sản phẩm. Vui lòng thử lại.";
            $updatedContext['next_suggestions'] = $this->getSuggestions(["Tìm sản phẩm khác", "Bắt đầu lại"]);
        }

        return ['reply' => $reply, 'context' => $updatedContext];
    }

    private function handleSkinAdvice($entities, $currentContext)
    {
        $reply = "Xin lỗi, mình chưa thể tư vấn về vấn đề da này.";
        $updatedContext = $currentContext;

        if (!empty($entities['skin_concern_original'])) {
            $concern = $entities['skin_concern_original'];
            $reply = "Với vấn đề " . $concern . ", bạn có thể tham khảo các sản phẩm sau:\n";
            $products = $this->searchProductsByCriteria(['keywords_contain' => [$concern]], $this->productData, $this->maxProductResults);

            if (!empty($products)) {
                $reply .= $this->formatProductList($products);
                $updatedContext['last_found_products'] = array_column($products, 'id');
                $updatedContext['conversation_stage'] = 'skin_advice_products';
                $updatedContext['next_suggestions'] = $this->getSuggestions(["Xem chi tiết SP 1", "Tìm sản phẩm khác cho " . $concern, "Cách chăm sóc da " . $concern]);
            } else {
                $reply .= "Hiện tại mình chưa có sản phẩm cụ thể nào cho " . $concern . ". Tuy nhiên, bạn có thể tham khảo một số lời khuyên chung:\n";
                // Provide general advice based on common skin concerns
                switch ($entities['skin_concern_key']) {
                    case 'mun':
                        $reply .= "- Luôn giữ da sạch sẽ, tẩy trang kỹ lưỡng.\n- Sử dụng sản phẩm không gây bít tắc lỗ chân lông (non-comedogenic).\n- Hạn chế chạm tay lên mặt.";
                        break;
                    case 'dadau':
                        $reply .= "- Dùng sữa rửa mặt dịu nhẹ, không làm khô da.\n- Ưu tiên sản phẩm gốc nước, không chứa dầu.\n- Sử dụng kem dưỡng ẩm kiềm dầu.";
                        break;
                    case 'dakho':
                        $reply .= "- Dùng sữa rửa mặt không tạo bọt.\n- Đắp mặt nạ dưỡng ẩm thường xuyên.\n- Uống đủ nước và dùng kem dưỡng ẩm giàu thành phần cấp ẩm.";
                        break;
                    default:
                        $reply .= "- Luôn giữ da sạch sẽ.\n- Dưỡng ẩm đầy đủ.\n- Chống nắng hàng ngày.\n- Tham khảo ý kiến bác sĩ da liễu nếu cần.";
                        break;
                }
                $updatedContext['conversation_stage'] = 'skin_advice_general';
                $updatedContext['next_suggestions'] = $this->getSuggestions(["Tìm sản phẩm cho " . $concern, "Lời khuyên khác"]);
            }
        } else {
            $reply = "Bạn muốn tư vấn về vấn đề da nào? (ví dụ: da mụn, da dầu, da khô,...)";
            $updatedContext['bot_waiting_for'] = 'skin_concern_query';
            $updatedContext['next_suggestions'] = $this->getSuggestions(["Da mụn", "Da dầu", "Da nhạy cảm"]);
        }

        return ['reply' => $reply, 'context' => $updatedContext];
    }

    private function handleAddProductToCart($entities, $currentContext, $originalUserInput)
    {
        $reply = "Xin lỗi, mình chưa thể thêm sản phẩm vào giỏ hàng lúc này.";
        $updatedContext = $currentContext;
        $productIdToAdd = null;

        if (!empty($currentContext['last_detailed_product_id'])) {
            $productIdToAdd = $currentContext['last_detailed_product_id'];
        } elseif (!empty($currentContext['last_found_products'])) {
            // If user just said "thêm vào giỏ" after seeing a list, try to infer which product
            $productRef = $this->extractProductReferenceFromInput($originalUserInput, $currentContext['last_found_products']);
            if ($productRef !== null) {
                $productIdToAdd = $productRef;
            } elseif (count($currentContext['last_found_products']) == 1) {
                $productIdToAdd = $currentContext['last_found_products'][0];
            }
        }

        if ($productIdToAdd) {
            $product = null;
            foreach ($this->productData as $p) {
                if ($p['id'] == $productIdToAdd) {
                    $product = $p;
                    break;
                }
            }

            if ($product) {
                // In a real application, you would integrate with an e-commerce cart system here
                // For now, we'll just simulate the action.
                $reply = "Đã thêm '" . $product['name'] . "' vào giỏ hàng của bạn. Bạn có muốn thanh toán không?";
                $updatedContext['last_added_to_cart_id'] = $productIdToAdd;
                $updatedContext['next_suggestions'] = $this->getSuggestions(["Thanh toán", "Tiếp tục mua sắm", "Xem giỏ hàng"]);
            } else {
                $reply = "Xin lỗi, mình không tìm thấy sản phẩm này để thêm vào giỏ hàng.";
                $updatedContext['next_suggestions'] = $this->getSuggestions(["Tìm sản phẩm khác", "Xem lại danh sách"]);
            }
        } else {
            $reply = "Bạn muốn thêm sản phẩm nào vào giỏ hàng? Vui lòng nói rõ tên hoặc số sản phẩm nhé.";
            $updatedContext['bot_waiting_for'] = 'product_add_to_cart_query';
            $updatedContext['next_suggestions'] = $this->getSuggestions(["Thêm SP 1", "Thêm son dưỡng"]);
        }
        return ['reply' => $reply, 'context' => $updatedContext];
    }

    private function handleFindSimilarProduct($entities, $currentContext)
    {
        $reply = "Xin lỗi, mình chưa tìm được sản phẩm tương tự.";
        $updatedContext = $currentContext;

        if (!empty($currentContext['last_detailed_product_id'])) {
            $productId = $currentContext['last_detailed_product_id'];
            $baseProduct = null;
            foreach ($this->productData as $p) {
                if ($p['id'] == $productId) {
                    $baseProduct = $p;
                    break;
                }
            }

            if ($baseProduct) {
                // Logic to find similar products: same category, similar concerns, similar price range etc.
                $similarProducts = $this->searchProductsByCriteria(
                    [
                        'type_keywords' => [$baseProduct['type_keywords'][0] ?? ''], // Same category
                        'keywords_contain' => [$baseProduct['keywords_contain'][0] ?? ''] // Similar concerns
                    ],
                    $this->productData,
                    $this->maxProductResults + 1 // Get one more to exclude the base product itself
                );

                // Remove the base product from the similar list if it's there
                $similarProducts = array_filter($similarProducts, function($p) use ($productId) {
                    return $p['id'] !== $productId;
                });

                if (!empty($similarProducts)) {
                    $reply = "Đây là một số sản phẩm tương tự '" . $baseProduct['name'] . "' mà bạn có thể thích:\n" . $this->formatProductList($similarProducts);
                    $updatedContext['last_found_products'] = array_column($similarProducts, 'id');
                    $updatedContext['bot_waiting_for'] = 'product_action';
                    $updatedContext['next_suggestions'] = $this->getSuggestions(["Xem chi tiết SP 1", "Tìm loại khác"]);
                } else {
                    $reply = "Mình chưa tìm thấy sản phẩm nào tương tự '" . $baseProduct['name'] . "'. Bạn có muốn tìm sản phẩm khác không?";
                    $updatedContext['next_suggestions'] = $this->getSuggestions(["Tìm son môi", "Tư vấn da dầu"]);
                }
            }
        } else {
            $reply = "Bạn muốn tìm sản phẩm tương tự sản phẩm nào?";
            $updatedContext['next_suggestions'] = $this->getSuggestions(["Xem chi tiết sản phẩm trước", "Tìm sản phẩm khác"]);
        }
        return ['reply' => $reply, 'context' => $updatedContext];
    }

    private function handleCancelAction($entities, $currentContext)
    {
        $reply = "Đã hủy thao tác. Bạn cần mình giúp gì nữa không?";
        $updatedContext = $currentContext;

        if (isset($entities['action_to_cancel'])) {
            // Specific cancellation logic if needed
            Log::info('[handleCancelAction] Cancelled action: ' . $entities['action_to_cancel']);
        }

        // Clear any waiting flags
        unset($updatedContext['bot_waiting_for']);
        $updatedContext['next_suggestions'] = $this->getSuggestions(["Tìm sản phẩm", "Tư vấn da", "Bắt đầu lại"]);
        return ['reply' => $reply, 'context' => $updatedContext];
    }

    private function handleUnknownIntent($currentContext)
    {
        $reply = "Xin lỗi, mình chưa hiểu rõ ý của bạn. Bạn có thể diễn đạt lại hoặc thử các gợi ý dưới đây nhé:";
        $updatedContext = $currentContext;

        // Provide context-aware fallback suggestions
        if (!empty($updatedContext['last_queried_category_keyword'])) {
            $reply = "Mình chưa rõ yêu cầu của bạn về '" . $updatedContext['last_queried_category_keyword'] . "'. Bạn muốn tìm sản phẩm cụ thể, xem giá, hay so sánh với sản phẩm khác?";
            $updatedContext['next_suggestions'] = $this->getSuggestions([
                "Sản phẩm " . $updatedContext['last_queried_category_keyword'] . " bán chạy",
                "Giá " . $updatedContext['last_queried_category_keyword'],
                "Tư vấn thêm về " . $updatedContext['last_queried_category_keyword']
            ]);
        } elseif (!empty($updatedContext['last_queried_skin_concern'])) {
            $reply = "Mình chưa rõ yêu cầu của bạn về '" . $updatedContext['last_queried_skin_concern'] . "'. Bạn muốn tìm sản phẩm, hay cần lời khuyên chăm sóc da cụ thể hơn?";
            $updatedContext['next_suggestions'] = $this->getSuggestions([
                "Sản phẩm cho " . $updatedContext['last_queried_skin_concern'],
                "Cách chăm sóc " . $updatedContext['last_queried_skin_concern']
            ]);
        } elseif (!empty($updatedContext['last_found_products'])) {
            $reply = "Mình chưa hiểu. Bạn muốn làm gì với danh sách sản phẩm vừa rồi?";
            $updatedContext['next_suggestions'] = $this->getSuggestions(["Xem chi tiết SP 1", "Lọc theo hãng", "Tìm sản phẩm khác"]);
        } else {
            // General fallback if no specific context
            $fallbacks = [
                "Mình vẫn đang học hỏi. Bạn có thể cung cấp thêm thông tin hoặc thử các gợi ý nhé.",
                "Xin lỗi, mình chưa hiểu lắm. Bạn có thể diễn đạt khác được không?",
                "Mình đang học hỏi thêm, bạn thử hỏi câu khác đơn giản hơn xem sao.",
            ];
            $reply = $fallbacks[array_rand($fallbacks)];
            $updatedContext['next_suggestions'] = $this->getSuggestions(["Tìm son", "Da dầu nên dùng gì?", "Chào bạn"]);
        }

        return ['reply' => $reply, 'context' => $updatedContext];
    }

    // --- Product Search & Formatting Utilities ---
    private function searchProductsByCriteria($criteria, $productsToSearchIn, $limit = 5)
    {
        $results = [];
        $normalizedCriteria = [];

        // Normalize criteria keywords once
        if (isset($criteria['type_keywords'])) {
            $normalizedCriteria['type_keywords'] = array_map([$this, 'normalizeText'], $criteria['type_keywords']);
        }
        if (isset($criteria['keywords_contain'])) {
            $normalizedCriteria['keywords_contain'] = array_map([$this, 'normalizeText'], $criteria['keywords_contain']);
        }
        if (isset($criteria['brand'])) {
            $normalizedCriteria['brand'] = $this->normalizeText($criteria['brand']);
        }

        foreach ($productsToSearchIn as $product) {
            $match = true;

            // Match by product type keywords
            if (isset($normalizedCriteria['type_keywords']) && !empty($normalizedCriteria['type_keywords'])) {
                $typeMatch = false;
                foreach ($product['type_keywords'] as $productTypeKeyword) {
                    if (in_array($this->normalizeText($productTypeKeyword), $normalizedCriteria['type_keywords'])) {
                        $typeMatch = true;
                        break;
                    }
                }
                if (!$typeMatch) {
                    $match = false;
                }
            }

            // Match by general keywords contained in product description/name
            if ($match && isset($normalizedCriteria['keywords_contain']) && !empty($normalizedCriteria['keywords_contain'])) {
                $keywordsContainMatch = false;
                $normalizedProductName = $this->normalizeText($product['name']);
                $normalizedProductDescription = $this->normalizeText($product['description'] ?? '');

                foreach ($normalizedCriteria['keywords_contain'] as $searchKeyword) {
                    if (Str::contains($normalizedProductName, $searchKeyword) || Str::contains($normalizedProductDescription, $searchKeyword)) {
                        $keywordsContainMatch = true;
                        break;
                    }
                }
                if (!$keywordsContainMatch) {
                    $match = false;
                }
            }

            // Match by brand
            if ($match && isset($normalizedCriteria['brand'])) {
                if ($this->normalizeText($product['brand']) !== $normalizedCriteria['brand']) {
                    $match = false;
                }
            }

            if ($match) {
                $results[] = $product;
                if (count($results) >= $limit) {
                    break;
                }
            }
        }
        Log::info('[searchProductsByCriteria] Found ' . count($results) . ' products for criteria: ', $criteria);
        return $results;
    }

    private function formatProductList($products)
    {
        if (empty($products)) {
            return "Không có sản phẩm nào.";
        }
        $list = "";
        foreach ($products as $index => $product) {
            $list .= ($index + 1) . ". " . $product['name'] . " - " . ($product['price'] ?? 'Giá liên hệ') . " VND\n";
        }
        return $list;
    }

    private function formatProductDetail($product)
    {
        if (empty($product)) {
            return "Không tìm thấy chi tiết sản phẩm.";
        }
        $detail = "--- Chi tiết sản phẩm ---\n";
        $detail .= "Tên: " . ($product['name'] ?? 'Đang cập nhật') . "\n";
        $detail .= "Hãng: " . ($product['brand'] ?? 'Đang cập nhật') . "\n";
        $detail .= "Giá: " . ($product['price'] ?? 'Liên hệ') . " VND\n";
        $detail .= "Mô tả: " . ($product['description'] ?? 'Đang cập nhật') . "\n";
        $detail .= "Link: " . ($product['url'] ?? 'Không có') . "\n";
        return $detail;
    }

    // --- Suggestion Management ---
    private function getSuggestions(array $baseSuggestions)
    {
        // Shuffle and limit suggestions to maxSuggestions
        shuffle($baseSuggestions);
        return array_slice($baseSuggestions, 0, $this->maxSuggestions);
    }
}