<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Address;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AddressController extends Controller
{
    public function index(Request $request)
    {
        return $request->user()->addresses()->orderBy('is_default', 'desc')->orderBy('created_at', 'desc')->get();
    }

    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'full_name' => 'required|string|max:255',
            'phone_number' => 'required|string|max:20',
            'province' => 'required|string|max:255',
            'district' => 'required|string|max:255',
            'ward' => 'required|string|max:255',
            'street_address' => 'required|string|max:255',
            'is_default' => 'sometimes|boolean',
        ]);

        $user = $request->user();

        if ($request->input('is_default', false)) {
            $user->addresses()->update(['is_default' => false]);
        }

        $address = $user->addresses()->create($validatedData);
        return response()->json($address, 201);
    }

    public function update(Request $request, Address $address)
    {
        if ($address->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validatedData = $request->validate([
            'full_name' => 'required|string|max:255',
            'phone_number' => 'required|string|max:20',
            'province' => 'required|string|max:255',
            'district' => 'required|string|max:255',
            'ward' => 'required|string|max:255',
            'street_address' => 'required|string|max:255',
            'is_default' => 'sometimes|boolean',
        ]);
        
        $user = $request->user();
        if ($request->input('is_default', false) && !$address->is_default) {
            $user->addresses()->where('id', '!=', $address->id)->update(['is_default' => false]);
        }


        $address->update($validatedData);
        return response()->json($address);
    }

    public function destroy(Request $request, Address $address)
    {
        if ($address->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($address->is_default) {
            return response()->json(['message' => 'Không thể xóa địa chỉ mặc định.'], 400);
        }

        $address->delete();
        return response()->json(['message' => 'Địa chỉ đã được xóa.'], 200);
    }

    public function setDefault(Request $request, Address $address)
    {
        if ($address->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->user()->addresses()->update(['is_default' => false]);
        $address->update(['is_default' => true]);

        return response()->json(['message' => 'Địa chỉ đã được đặt làm mặc định.', 'address' => $address]);
    }
}