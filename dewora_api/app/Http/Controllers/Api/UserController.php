<?php

    namespace App\Http\Controllers\Api;

    use App\Http\Controllers\Controller;
    use Illuminate\Http\Request;
    use Illuminate\Support\Facades\Auth;
    use Illuminate\Support\Facades\Storage;
    use Illuminate\Support\Facades\Hash;
    use Illuminate\Validation\Rules\Password;
    use Illuminate\Support\Str; // Đảm bảo dòng này có ở đầu file


    class UserController extends Controller
    {
        public function getProfile(Request $request)
        {
            $user = $request->user();
            return response()->json($user);
        }

        public function updateProfile(Request $request)
        {
            $user = $request->user();
            $validatedData = $request->validate([
                'name' => 'sometimes|string|max:255',
                'gender' => 'sometimes|string|in:male,female,other,null',
                'birth_date' => 'sometimes|date|nullable',
            ]);

            $user->update($validatedData);

            return response()->json(['message' => 'Thông tin tài khoản đã được cập nhật.', 'user' => $user]);
        }

        public function updateAvatar(Request $request)
        {
            $request->validate([
                'avatar' => 'required|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
            ]);

            $user = $request->user();
            \Log::info('APP_URL from env: ' . env('APP_URL')); // Giữ lại để debug thêm nếu cần

            if ($request->hasFile('avatar')) {
                // Logic xóa avatar cũ
                if ($user->avatar_url && $user->avatar_url !== 'public/images/default-avatar.png') {
                    $oldAvatarPath = str_replace(Storage::url(''), '', $user->avatar_url);
                    if (Str::startsWith($oldAvatarPath, 'avatars/') && Storage::disk('public')->exists($oldAvatarPath)) {
                        Storage::disk('public')->delete($oldAvatarPath);
                    } else if (Storage::disk('public')->exists($oldAvatarPath)) {
                        Storage::disk('public')->delete($oldAvatarPath);
                    }
                }

                $path = $request->file('avatar')->store('avatars', 'public');
                \Log::info('Avatar path stored in filesystem: ' . $path); // Giữ lại để debug

                // >>> DÒNG QUAN TRỌNG ĐỂ THAY ĐỔI <<<
                $generated_url = env('APP_URL') . '/storage/' . $path;
                // >>> END DÒNG QUAN TRỌNG <<<

                \Log::info('Generated Storage URL for avatar_url (MANUAL): ' . $generated_url); // Log mới để phân biệt

                $user->avatar_url = $generated_url;
                $user->save();

                return response()->json(['message' => 'Avatar đã được cập nhật.', 'avatar_url' => $user->avatar_url]);
            }

            return response()->json(['message' => 'Không có file avatar được tải lên.'], 400);
        }
        
        public function updatePhoneNumber(Request $request)
        {
            $user = $request->user();
            $validatedData = $request->validate([
                'phone_number' => 'required|string|regex:/^([0-9\s\-\+\(\)]*)$/|min:10|unique:users,phone_number,' . $user->id,
            ]);

            $user->phone_number = $validatedData['phone_number'];
            $user->save();
            return response()->json(['message' => 'Số điện thoại đã được cập nhật.', 'phone_number' => $user->phone_number]);
        }

        public function updateEmail(Request $request)
        {
            $user = $request->user();
            $validatedData = $request->validate([
                'email' => 'required|string|email|max:255|unique:users,email,' . $user->id,
            ]);

            if ($user->email !== $validatedData['email']) {
                $user->email = $validatedData['email'];
                $user->email_verified_at = null; 
                $user->save();
                return response()->json(['message' => 'Email đã được cập nhật. Vui lòng xác thực email mới.']);
            }
            
            $user->save();
            return response()->json(['message' => 'Email đã được cập nhật.', 'email' => $user->email]);
        }
        public function changePassword(Request $request)
        {
            $user = $request->user();
            $validatedData = $request->validate([
                'current_password' => 'required|string',
                'password' => ['required', 'confirmed', Password::min(8)->mixedCase()->numbers()->symbols()],
            ]);

            if (!Hash::check($validatedData['current_password'], $user->password)) {
                return response()->json(['message' => 'Mật khẩu hiện tại không đúng.'], 422);
            }

            $user->password = Hash::make($validatedData['password']);
            $user->save();

            return response()->json(['message' => 'Mật khẩu đã được thay đổi thành công.']);
        }
    }