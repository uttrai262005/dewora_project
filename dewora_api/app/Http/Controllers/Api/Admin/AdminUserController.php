<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
class AdminUserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::query();
        if ($request->has('search')) {
            $query->where('name', 'like', '%' . $request->search . '%')
                  ->orWhere('email', 'like', '%' . $request->search . '%');
        }
        $users = $query->orderBy('id', 'desc')->paginate($request->input('per_page', 10));
        return response()->json($users);
    }

    public function show(User $user)
    {
        return response()->json($user);
    }

    public function update(Request $request, User $user)
       {
$validatedData = $request->validate([
'name' => 'sometimes|required|string|max:255',
'email' => 'sometimes|required|string|email|max:255|unique:users,email,' . $user->id,
'phone_number' => 'nullable|string|max:20',
'gender' => 'nullable|string|in:male,female,other',
'birth_date' => 'nullable|date',
'is_admin' => 'sometimes|boolean',
'password' => 'nullable|string|min:8|confirmed', // For password change
]);

        if ($request->filled('password')) {
            $validatedData['password'] = Hash::make($validatedData['password']);
        } else {
            unset($validatedData['password']); // Don't update password if not provided
        }

        $user->update($validatedData);
        return response()->json($user);
    }
public function toggleAdminStatus(User $user)
    {
        // Ngăn chặn admin tự tước quyền của chính mình
        if (Auth::id() === $user->id) {
            return response()->json(['message' => 'Bạn không thể tự thay đổi quyền Admin của chính mình.'], 403);
        }

        try {
            $user->is_admin = !$user->is_admin;
            $user->save();
            $action = $user->is_admin ? "cấp quyền Admin" : "hủy quyền Admin";
            return response()->json(['message' => "Đã {$action} cho người dùng {$user->name} thành công.", 'user' => $user]);
        } catch (\Exception $e) {
            Log::error("Error toggling admin status for user {$user->id}: " . $e->getMessage());
            return response()->json(['message' => 'Có lỗi xảy ra khi thay đổi quyền Admin.'], 500);
        }
    }

    /**
     * Chức năng xóa người dùng.
     */
    public function destroy(User $user)
    {
        // Ngăn chặn admin tự xóa chính mình
        if (Auth::id() === $user->id) {
            return response()->json(['message' => 'Bạn không thể tự xóa chính mình.'], 403);
        }

        try {
            // Cân nhắc: Xóa mềm (soft delete) hay xóa cứng?
            // Nếu có soft delete, đảm bảo model User dùng `use SoftDeletes;`
            // và có cột `deleted_at` trong DB.
            // Ví dụ về xóa các bản ghi liên quan nếu cần (ví dụ: đơn hàng của user đó có thể cần xử lý)
            // $user->orders()->update(['user_id' => null]); // ví dụ: gán đơn hàng cho user khác hoặc null
            
            $userName = $user->name; // Lưu tên trước khi xóa
            $user->delete();
            return response()->json(['message' => "Người dùng {$userName} đã được xóa thành công."], 200); // Hoặc 204 No Content
        } catch (\Exception $e) {
            Log::error("Error deleting user {$user->id}: " . $e->getMessage());
            // Kiểm tra xem có lỗi ràng buộc khóa ngoại không
            if ($e instanceof \Illuminate\Database\QueryException && str_contains($e->getMessage(), 'foreign key constraint fails')) {
                 return response()->json(['message' => 'Không thể xóa người dùng này do có dữ liệu liên quan (ví dụ: đơn hàng). Vui lòng xử lý dữ liệu liên quan trước.'], 409); // 409 Conflict
            }
            return response()->json(['message' => 'Có lỗi xảy ra khi xóa người dùng.'], 500);
        }
    }
    
}