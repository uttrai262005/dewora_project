<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Http\Request; // Đảm bảo dòng này được import

class Authenticate extends Middleware
{
    /**
     * Get the path the user should be redirected to when they are not authenticated.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return string|null
     */
    protected function redirectTo(Request $request): ?string
    {
        if (! $request->expectsJson()) {
            // Đối với các yêu cầu web thông thường (không phải API),
            // bạn có thể muốn chuyển hướng đến một route login web nếu có.
            // Nếu API của bạn là thuần túy và không có trang login web,
            // bạn có thể không cần dòng này hoặc comment nó đi.
            // return route('login'); // Dòng này gây ra lỗi nếu route 'login' không tồn tại

            // Thay vì cố gắng tìm route('login'), nếu không phải JSON, có thể trả về lỗi chung
            // Hoặc nếu ứng dụng của bạn chỉ là API, bạn có thể luôn muốn trả về null ở đây
            // và để Exception Handler xử lý việc trả về JSON 401.
            // Trong trường hợp này, chúng ta muốn đảm bảo API luôn trả về JSON 401
            // nên sẽ để nó đi tiếp và trả về null ở cuối nếu là JSON.
            // Nếu không phải JSON và không có route 'login', bạn sẽ cần quyết định hành vi ở đây.
            // Tạm thời, nếu không phải JSON và không có route 'login', nó sẽ gây lỗi nếu dòng return route('login') được kích hoạt.
            // An toàn nhất cho API thuần túy là đảm bảo nó không bao giờ cố gọi route('login').
             return null; // Buộc không chuyển hướng cho mọi trường hợp không phải JSON nếu không có route login.
                           // Điều này sẽ khiến AuthenticationException được ném ra,
                           // và Handler sẽ xử lý nó (hy vọng là thành JSON 401).
                           // Hoặc, bạn có thể chỉ định một route cụ thể cho web nếu có:
                           // return '/trang-dang-nhap-web';
        }

        // Đối với các yêu cầu API (mong đợi JSON), trả về null.
        // Điều này sẽ khiến Laravel ném ra một AuthenticationException,
        // mà Exception Handler của Laravel thường sẽ chuyển đổi thành phản hồi JSON 401.
        return null;
    }
}