<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ShippingController extends Controller
{
    public function calculateShipping(Request $request)
    {
        Log::info('[SHIPPING] Yêu cầu tính phí vận chuyển (Đơn giản hóa và phân vùng theo độ xa):', $request->all());

        $fullAddress = $request->input('address');
        $shippingCost = 0;

        // --- Định nghĩa các mức phí cơ bản ---
        // Phí cơ bản cho các tỉnh/thành phố ngoài TP.HCM
        // Mức phí này sẽ được cộng thêm với phí theo vùng miền (Bắc/Trung/Nam)
        $baseFeeOutsideHCMC = 20000;
        $baseFeeHCMC = 0; // Phí cơ bản nếu là TP.HCM (Quận 1, Quận 3, etc. có thể miễn phí)

        $hcmcDistrictFees = [
            'Quận 1' => 0,
            'Quận 3' => 0,
            'Quận 4' => 0,
            'Quận 5' => 0,
            'Quận 7' => 15000,
            'Quận 12' => 15000,
            'Thủ Đức' => 0, // Điều chỉnh tùy ý
            'Bình Tân' => 15000,
            'Gò Vấp' => 15000, // Bạn có thể điều chỉnh lại Gò Vấp là 15000
            'Tân Phú' => 15000,
            'Bình Thạnh' => 0, // Điều chỉnh tùy ý
            'Phú Nhuận' => 15000,
            'Tân Bình' => 15000,
            'Hóc Môn' => 15000,
            'Củ Chi' => 20000,
            'Bình Chánh' => 18000,
            'Nhà Bè' => 17000,
            'Cần Giờ' => 25000,
            // Thêm các quận/huyện khác của TP.HCM và mức phí tương ứng
        ];

        // --- Định nghĩa các tỉnh miền Bắc theo độ xa từ TP.HCM và phí phụ trội tương ứng ---
        // Phí phụ trội này sẽ được cộng vào $baseFeeOutsideHCMC
        $northernProvincesTiered = [
            'tier1_surcharge' => 10000, // Phụ trội cho các tỉnh "gần" TP.HCM nhất ở miền Bắc
            'tier1_provinces' => [
                'Thanh Hóa', 'Nghệ An', 'Hà Tĩnh', // Thực ra đây là các tỉnh miền Trung, nhưng có thể xếp vào nhóm "gần" miền Bắc nếu bạn muốn.
                'Vĩnh Phúc', 'Ninh Bình', 'Hà Nam', 'Hưng Yên', 'Hải Dương', 'Thái Bình', 'Nam Định',
            ],
            'tier2_surcharge' => 15000, // Phụ trội cho các tỉnh "trung tâm" miền Bắc
            'tier2_provinces' => [
                'Hà Nội', 'Hải Phòng', 'Quảng Ninh', 'Bắc Ninh', 'Phú Thọ', 'Thái Nguyên', 'Bắc Giang',
            ],
            'tier3_surcharge' => 20000, // Phụ trội cho các tỉnh "xa" nhất ở miền Bắc (vùng núi)
            'tier3_provinces' => [
                'Hà Giang', 'Cao Bằng', 'Lạng Sơn', 'Tuyên Quang', 'Lào Cai', 'Yên Bái', 'Lai Châu', 'Sơn La', 'Điện Biên', 'Bắc Kạn',
            ],
        ];

        // --- Logic tính phí đơn giản hóa ---
        $addressParts = array_map('trim', explode(',', $fullAddress));
        $numParts = count($addressParts);

        $province = '';
        $district = '';

        if ($numParts >= 1) {
            $province = $addressParts[$numParts - 1];
        }
        if ($numParts >= 2) {
            $district = $addressParts[$numParts - 2];
        }

        Log::info('[SHIPPING] Địa chỉ đã phân tích:', [
            'province' => $province,
            'district' => $district,
        ]);

        // Chuẩn hóa tên để so sánh (loại bỏ "Thành phố ", "Tỉnh ", "Quận ", "Huyện ", "Phường ", "Xã ")
        $normalizeName = function($name) {
            return trim(str_replace(['Thành phố ', 'Tỉnh ', 'Quận ', 'Huyện ', 'Phường ', 'Xã '], '', $name));
        };

        $normalizedProvince = $normalizeName($province);
        $normalizedDistrict = $normalizeName($district);

        Log::info('[SHIPPING] Địa chỉ đã chuẩn hóa:', [
            'normalizedProvince' => $normalizedProvince,
            'normalizedDistrict' => $normalizedDistrict,
        ]);

        if (mb_stripos($normalizedProvince, 'Hồ Chí Minh') !== false || mb_stripos($normalizedProvince, 'HCM') !== false) {
            // Đây là TP.HCM
            $shippingCost = $baseFeeHCMC;
            Log::info('[SHIPPING] Địa chỉ trong TP.HCM. Phí cơ bản:', ['cost' => $shippingCost]);

            // Áp dụng phí theo quận/huyện
            foreach ($hcmcDistrictFees as $keyDistrict => $fee) {
                if (mb_stripos($normalizedDistrict, $normalizeName($keyDistrict)) !== false) {
                    $shippingCost += $fee;
                    Log::info('[SHIPPING] Áp dụng phí theo quận/huyện:', ['district' => $keyDistrict, 'added_fee' => $fee, 'total_cost' => $shippingCost]);
                    break;
                }
            }

        } else if (!empty($normalizedProvince)) {
            // Đây là các tỉnh/thành phố khác ngoài TP.HCM
            $shippingCost = $baseFeeOutsideHCMC;
            Log::info('[SHIPPING] Địa chỉ ngoài TP.HCM. Phí cơ bản:', ['cost' => $shippingCost]);

            $foundNorthernTier = false;
            // Kiểm tra các tỉnh miền Bắc theo từng bậc phí
            foreach ($northernProvincesTiered as $tierKey => $tierValue) {
                if (str_starts_with($tierKey, 'tier') && str_ends_with($tierKey, '_provinces')) {
                    $surcharge = $northernProvincesTiered[str_replace('_provinces', '_surcharge', $tierKey)];
                    $provincesInTier = $tierValue;

                    foreach ($provincesInTier as $northernProv) {
                        if (mb_stripos($normalizedProvince, $normalizeName($northernProv)) !== false) {
                            $shippingCost += $surcharge;
                            Log::info('[SHIPPING] Địa chỉ tại miền Bắc (Tier ' . $tierKey . '). Áp dụng phí phụ trội:', [
                                'province' => $normalizedProvince,
                                'surcharge' => $surcharge,
                                'total_cost' => $shippingCost
                            ]);
                            $foundNorthernTier = true;
                            break 2; // Break out of both inner and outer loops
                        }
                    }
                }
            }

            // Nếu không tìm thấy trong bất kỳ bậc miền Bắc nào, nó là tỉnh miền Trung/Nam (không phải TP.HCM)
            // Có thể thêm logic riêng cho miền Trung/Tây Nam Bộ nếu cần
            if (!$foundNorthernTier) {
                Log::info('[SHIPPING] Địa chỉ tại miền Trung/Nam (ngoài TP.HCM và không phải miền Bắc). Giữ nguyên phí cơ bản:', ['cost' => $shippingCost]);
                // Hoặc bạn có thể thêm một mức phí khác cho các tỉnh miền Trung/Nam không phải HCM
                // Ví dụ: $shippingCost += 10000;
            }

        } else {
            // Không xác định được địa chỉ, hoặc địa chỉ quá mơ hồ
            Log::warning('[SHIPPING] Không thể xác định địa chỉ để tính phí vận chuyển.', ['full_address' => $fullAddress]);
            return response()->json(['error' => 'Không thể tính phí vận chuyển. Vui lòng kiểm tra lại địa chỉ.'], 400);
        }

        // Làm tròn lên đến hàng nghìn gần nhất để phí vận chuyển có số đẹp
        $shippingCost = ceil($shippingCost / 1000) * 1000;

        Log::info('[SHIPPING] Phí vận chuyển cuối cùng:', ['cost' => $shippingCost]);

        return response()->json([
            'shipping_cost' => $shippingCost,
        ]);
    }
}