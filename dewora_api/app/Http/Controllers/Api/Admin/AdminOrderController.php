<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order; // Make sure you have this model
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminOrderController extends Controller
{
    public function index(Request $request)
    {
        $query = Order::with(['user:id,name,email', 'items.product:id,name']); // Eager load basic user and product info

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }
        if ($request->has('search_code')) {
            $query->where('order_code', 'like', '%' . $request->search_code . '%');
        }

        $orders = $query->orderBy('created_at', 'desc')
                        ->paginate($request->input('per_page', 10));
        return response()->json($orders);
    }

    public function show(Order $order)
    {
        $order->load(['user', 'items.product.images']); // Load more details
        return response()->json($order);
    }

    public function updateStatus(Request $request, Order $order)
    {
        $validated = $request->validate([
            'status' => 'required|string|in:pending,processing,shipped,delivered,cancelled,refunded', // Define your statuses
        ]);

        // Add logic here: e.g., if changing to 'shipped', create shipment record, notify user.
        // If changing to 'cancelled', check if payment needs refunding, update stock.
        // For now, just a simple status update:
        $order->status = $validated['status'];
        $order->save();

        // Optionally, log this change or notify the user
        // ActivityLog::create([...]);
        // $order->user->notify(new OrderStatusUpdated($order));

        return response()->json(['message' => 'Order status updated successfully.', 'order' => $order]);
    }

    // --- REPORTING EXAMPLES ---
    public function getOrderSummaryReport(Request $request)
    {
        // Date range filter (optional)
        $startDate = $request->input('start_date'); // YYYY-MM-DD
        $endDate = $request->input('end_date');   // YYYY-MM-DD

        $query = Order::query();

        if ($startDate && $endDate) {
            $query->whereBetween('created_at', [$startDate . " 00:00:00", $endDate . " 23:59:59"]);
        }

        $totalOrders = (clone $query)->count();
        $totalRevenue = (clone $query)->whereIn('status', ['delivered', 'shipped', 'processing'])->sum('total_amount'); // Sum only relevant orders
        $pendingOrders = (clone $query)->where('status', 'pending')->count();
        $processingOrders = (clone $query)->where('status', 'processing')->count();
        $shippedOrders = (clone $query)->where('status', 'shipped')->count();
        $deliveredOrders = (clone $query)->where('status', 'delivered')->count();
        $cancelledOrders = (clone $query)->where('status', 'cancelled')->count();

        $ordersByStatus = (clone $query)
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status');

        $revenueOverTime = (clone $query)
            ->whereIn('status', ['delivered', 'shipped', 'processing']) // Or just 'delivered'
            ->select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('SUM(total_amount) as daily_revenue')
            )
            ->groupBy('date')
            ->orderBy('date', 'asc')
            ->get();


        return response()->json([
            'total_orders' => $totalOrders,
            'total_revenue' => (float) $totalRevenue,
            'pending_orders' => $pendingOrders,
            'processing_orders' => $processingOrders,
            'shipped_orders' => $shippedOrders,
            'delivered_orders' => $deliveredOrders,
            'cancelled_orders' => $cancelledOrders,
            'orders_by_status_chart_data' => $ordersByStatus, // For a pie/bar chart
            'revenue_over_time_chart_data' => $revenueOverTime // For a line chart
        ]);
    }
    // Trong AdminOrderController.php

 public function getRevenueOverTimeReport(Request $request)
    {
        $request->validate([
            'start_date' => 'nullable|date_format:Y-m-d',
            'end_date' => 'nullable|date_format:Y-m-d|after_or_equal:start_date',
            'period' => 'nullable|string|in:day,month,year' // Thêm lựa chọn kỳ báo cáo
        ]);

        $startDate = $request->input('start_date', Carbon::now()->subMonth()->toDateString());
        $endDate = $request->input('end_date', Carbon::now()->toDateString());
        $period = $request->input('period', 'day'); // Mặc định theo ngày

        // Các trạng thái đơn hàng được tính vào doanh thu
        $revenueStatuses = ['completed', 'delivered', 'shipped']; // Tùy chỉnh theo logic của bạn

        $query = Order::whereIn('status', $revenueStatuses)
                      ->whereBetween('created_at', [
                          Carbon::parse($startDate)->startOfDay(),
                          Carbon::parse($endDate)->endOfDay()
                      ]);

        switch ($period) {
            case 'month':
                $selectRaw = DB::raw('DATE_FORMAT(created_at, "%Y-%m") as period_label, SUM(total_amount) as total_revenue');
                $groupBy = DB::raw('DATE_FORMAT(created_at, "%Y-%m")');
                $orderBy = 'period_label';
                break;
            case 'year':
                $selectRaw = DB::raw('YEAR(created_at) as period_label, SUM(total_amount) as total_revenue');
                $groupBy = DB::raw('YEAR(created_at)');
                $orderBy = 'period_label';
                break;
            case 'day':
            default:
                $selectRaw = DB::raw('DATE(created_at) as period_label, SUM(total_amount) as total_revenue');
                $groupBy = DB::raw('DATE(created_at)');
                $orderBy = 'period_label';
                break;
        }
        
        $revenueData = $query->select($selectRaw)
                             ->groupBy($groupBy)
                             ->orderBy($orderBy, 'asc')
                             ->get();

        // Đảm bảo trả về 0 cho các ngày/tháng/năm không có doanh thu nếu cần (phức tạp hơn, có thể bỏ qua ban đầu)

        return response()->json($revenueData);
    }

    /**
     * Lấy dữ liệu báo cáo đơn hàng theo trạng thái.
     */
    public function getOrdersByStatusReport(Request $request)
    {
        $request->validate([
            'start_date' => 'nullable|date_format:Y-m-d',
            'end_date' => 'nullable|date_format:Y-m-d|after_or_equal:start_date',
        ]);
        
        $query = Order::query();

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $startDate = Carbon::parse($request->input('start_date'))->startOfDay();
            $endDate = Carbon::parse($request->input('end_date'))->endOfDay();
            $query->whereBetween('created_at', [$startDate, $endDate]);
        } elseif ($request->filled('start_date')) {
            $startDate = Carbon::parse($request->input('start_date'))->startOfDay();
            $query->where('created_at', '>=', $startDate);
        } elseif ($request->filled('end_date')) {
            $endDate = Carbon::parse($request->input('end_date'))->endOfDay();
             $query->where('created_at', '<=', $endDate);
        }

        $ordersByStatus = $query->select('status', DB::raw('count(*) as count'))
                                ->groupBy('status')
                                ->get();
        
        // Chuyển đổi key status thành tiếng Việt nếu cần (có thể làm ở frontend)
        // Ví dụ: 
        // $translatedData = $ordersByStatus->map(function($item) {
        //     $item->translated_status = $this->translateStatusToVietnamese($item->status); // Cần hàm helper
        //     return $item;
        // });

        return response()->json($ordersByStatus);
    }

    private function translateStatusToVietnamese($statusKey) {
        $map = [
            'pending' => 'Chờ xử lý',
            'processing' => 'Đang xử lý',
            'shipped' => 'Đã giao hàng',
            'delivered' => 'Đã nhận hàng',
            'completed' => 'Hoàn thành',
            'cancelled' => 'Đã hủy',
            'failed' => 'Thất bại',
            'refunded' => 'Đã hoàn tiền',
        ];
        return $map[$statusKey] ?? ucfirst($statusKey);
    }
}