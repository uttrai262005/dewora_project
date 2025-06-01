@component('mail::message')
<img src="./public/dewora.png" alt="Dewora Logo" style="max-width: 150px; height: auto; display: block; margin: 0 auto 20px;">

# Chào bạn,

Bạn nhận được email này vì chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.

@component('mail::button', ['url' => $url])
Đặt lại mật khẩu
@endcomponent

Liên kết này sẽ hết hạn sau 60 phút.

Nếu bạn không yêu cầu đặt lại mật khẩu, bạn không cần thực hiện thêm hành động nào.

Trân trọng,
{{ config('app.name') }}
@endcomponent