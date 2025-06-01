<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Laravel\Socialite\Facades\Socialite; 
use Illuminate\Support\Str; 
class AuthController extends Controller

{
    /**
     * Xử lý yêu cầu đăng ký.
     */
    public function register(Request $request)
    {
        // 1. Validate dữ liệu
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed', // 'confirmed' yêu cầu có trường password_confirmation
        ]);

        // 2. Tạo User mới
        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        // 3. Trả về response
        return response()->json([
            'message' => 'Đăng ký thành công!'
        ], 201);
    }

    /**
     * Xử lý yêu cầu đăng nhập.
     */
    public function login(Request $request)
    {
        // 1. Validate dữ liệu
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        // 2. Xác thực người dùng
        if (!Auth::attempt($request->only('email', 'password'))) {
            throw ValidationException::withMessages([
                'email' => ['Email hoặc mật khẩu không chính xác.'],
            ]);
        }

        $user = User::where('email', $request->email)->firstOrFail();

        // 3. Tạo token
        $token = $user->createToken('auth_token')->plainTextToken;

        // 4. Trả về response kèm token
        return response()->json([
            'message' => 'Đăng nhập thành công!',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user
        ]);
    }

    /**
     * Xử lý yêu cầu đăng xuất.
     */
    public function logout(Request $request)
    {
        // Xóa token hiện tại của user
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Đăng xuất thành công.']);
    }
    public function redirectToGoogle()
    {
        // Dòng này sẽ thực hiện chuyển hướng trực tiếp đến Google
        return Socialite::driver('google')->stateless()->redirect();
    }

    /**
     * Obtain the user information from Google.
     */
    public function handleGoogleCallback()
    {
        try {
            $googleUser = Socialite::driver('google')->stateless()->user();

            // Find or create user in your database
            $user = User::updateOrCreate(
                ['google_id' => $googleUser->id],
                [
                    'name' => $googleUser->name,
                    'email' => $googleUser->email,
                    'avatar_url' => $googleUser->avatar,
                    'email_verified_at' => now(), // Assume email is verified by Google
                    'password' => Hash::make(Str::random(10)), // Generate a random password if you still require one for internal purposes, or set nullable in migration
                ]
            );

            // Log in the user (optional for API, but good for session-based systems)
            // Auth::login($user);

            // *** CRUCIAL STEP: GENERATE SANCTUM TOKEN ***
            // Delete existing tokens to ensure only one active token per login (optional, but good practice)
            $user->tokens()->where('name', 'api-token')->delete(); // Or manage tokens differently

            $token = $user->createToken('api-token')->plainTextToken;

            // Redirect the frontend with the token or return JSON
            // For API, returning JSON with the token is generally preferred.
            // The frontend will then store this token and redirect itself.
           $frontendCallbackUrl = 'http://127.0.0.1:5500/google-auth-handler.html'; // Hoặc đường dẫn file của bạn
            return redirect($frontendCallbackUrl . '?' . http_build_query([
                'token' => $token,
                'name' => $user->name,
                'email' => $user->email,
            ]));

        } catch (\Exception $e) {
            \Log::error("Lỗi đăng nhập Google: " . $e->getMessage());
            // Trong trường hợp lỗi, chuyển hướng về trang đăng nhập với thông báo lỗi
            return redirect('http://127.0.0.1:5500/Login.html')->withErrors(['google_login_error' => 'Đăng nhập Google thất bại. Vui lòng thử lại.']);
        }
    }
public function forgotPassword(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json(['message' => 'Chúng tôi không tìm thấy người dùng với địa chỉ email này.'], 404);
        }

        // Xóa các token cũ nếu có
        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        // Tạo token mới
        $token = Str::random(60);

        // Lưu token vào bảng password_reset_tokens
        DB::table('password_reset_tokens')->insert([
            'email' => $request->email,
            'token' => Hash::make($token),
            'created_at' => now()
        ]);

        // Gửi email notification cho người dùng
        try {
            $user->notify(new ResetPasswordNotification($token, $request->email));
            return response()->json(['message' => 'Liên kết đặt lại mật khẩu đã được gửi đến email của bạn!']);
        } catch (\Exception $e) {
            \Log::error("Lỗi gửi email: " . $e->getMessage());
            return response()->json(['message' => 'Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại sau.'], 500);
        }
    }

    /**
     * Xử lý việc đặt lại mật khẩu mới.
     */
    public function resetPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string|min:8|confirmed',
            'token' => 'required|string'
        ]);

        $resetRecord = DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->first();

        // Kiểm tra token có tồn tại và hợp lệ không
        if (!$resetRecord || !Hash::check($request->token, $resetRecord->token)) {
            return response()->json(['message' => 'Token không hợp lệ hoặc đã hết hạn.'], 400);
        }

        // Cập nhật mật khẩu cho user
        $user = User::where('email', $request->email)->first();
        if (!$user) {
            return response()->json(['message' => 'Không tìm thấy người dùng.'], 404);
        }

        $user->password = Hash::make($request->password);
        $user->save();

        // Xóa token đã sử dụng
        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        return response()->json(['message' => 'Mật khẩu đã được đặt lại thành công!']);
    }
}