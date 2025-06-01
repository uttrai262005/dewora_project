<?php

namespace Database\Factories;

use App\Models\Review;
use Illuminate\Database\Eloquent\Factories\Factory;

class ReviewFactory extends Factory
{
protected $model = Review::class;

public function definition()
{
    // Một mảng các bình luận tiếng Việt
    $vietnameseComments = [
    'Son lên màu chuẩn, giữ màu lâu, rất thích!',
    'Kem dưỡng ẩm thấm nhanh, không gây bết dính.',
    'Phấn phủ mịn, kiềm dầu tốt suốt cả ngày.',
    'Sản phẩm có mùi thơm nhẹ, rất dễ chịu.',
    'Chất kem mịn, tán đều, không bị vón cục.',
    'Dưỡng môi tốt, môi mềm mượt cả ngày.',
    'Không gây kích ứng, da mình nhạy cảm vẫn dùng được.',
    'Mặt nạ cấp ẩm cực kỳ hiệu quả, da căng mướt sau khi dùng.',
    'Thiết kế bao bì đẹp, sang trọng.',
    'Giá thành hợp lý so với chất lượng.',
    'Da mình cải thiện rõ rệt sau 2 tuần sử dụng.',
    'Chống nắng tốt, không gây bóng dầu.',
    'Tẩy trang sạch mà không làm khô da.',
    'Son không bị trôi khi ăn uống nhẹ.',
    'Mùi hơi nồng, không hợp với mình lắm.',
    'Giao hàng nhanh, đóng gói chắc chắn.',
    'Dưỡng trắng không rõ hiệu quả sau 1 tuần dùng.',
    'Chất lượng vượt mong đợi, đáng tiền.',
    'Mua lần 2 rồi, vẫn hài lòng như lần đầu.',
    'Không hợp da mình, bị nổi mụn.',
    'Hàng chính hãng, có tem đầy đủ.',
    'Cushion mỏng nhẹ, che phủ tốt.',
    'Chất kem dễ tán, không gây bết dính.',
    'Toner giúp da mình đỡ khô hơn nhiều.',
    'Xịt khoáng mát, dùng thích vào mùa hè.',
    'Chì kẻ mày lên màu tự nhiên.',
    'Không thấy hiệu quả rõ rệt như quảng cáo.',
    'Hộp nhỏ hơn mình tưởng, dùng nhanh hết.',
    'Son lì lâu trôi nhưng hơi khô môi.',
    'Kem mắt có cải thiện quầng thâm nhẹ.',
    'Sữa rửa mặt dịu nhẹ, không làm khô da.',
    'Mùi sản phẩm thơm dễ chịu, không gắt.',
    'Không hợp da dầu, dễ bị đổ dầu vùng chữ T.',
    'Sản phẩm dùng ban đầu tốt, sau đấy da hơi khô.',
    'Da mình đều màu hơn sau khi dùng serum này.',
    'Kem chống nắng mỏng nhẹ, không gây bí da.',
    'Serum thẩm thấu nhanh, không gây nhờn.',
    'Hơi thất vọng về hiệu quả dưỡng trắng.',
    'Giao hàng chậm hơn dự kiến 1 ngày.',
    'Sản phẩm full size, đủ dùng trong 2 tháng.',
    'Mình da nhạy cảm mà dùng vẫn thấy ok.',
    'Lần đầu thử hãng này, rất ấn tượng.',
    'Son tint hơi khô môi nếu không dưỡng trước.',
    'Sản phẩm có hương liệu, da nhạy cảm nên test trước.',
    'Lọ thủy tinh chắc tay, xịt ra tia đều.',
    'Giúp da căng bóng sau vài lần dùng.',
    'Trang điểm cả ngày không bị xuống tone.',
    'Tẩy tế bào chết nhẹ nhàng, không rát da.',
    'Hũ kem nhỏ gọn, tiện mang đi du lịch.',
    'Combo dưỡng da giá tốt, hiệu quả ổn.',
];

    return [
        'name' => $this->faker->name, // Sẽ là tên Việt Nam sau khi cấu hình faker_locale
        'rating' => $this->faker->numberBetween(1, 5),
        'comment' => $this->faker->randomElement($vietnameseComments), // Chọn ngẫu nhiên từ mảng
    ];
}
}