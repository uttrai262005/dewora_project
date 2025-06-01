<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB; //
use Carbon\Carbon;

class AdminDashboardController extends Controller
{
    public function getStats(Request $request)
    {
        // Basic Stats
        $totalProducts = Product::count();
        $totalUsers = User::where('is_admin', false)->count(); // Count non-admin users
        $ordersToday = Order::whereDate('created_at', Carbon::today())->count();
        $revenueToday = Order::whereDate('created_at', Carbon::today())
                            ->whereIn('status', ['completed', 'delivered']) // Only count revenue from completed/delivered orders
                            ->sum('total_amount');
        $totalOrdersOverall = Order::count();
        $totalRevenueOverall = Order::whereIn('status', ['completed', 'delivered'])->sum('total_amount');

        // Recent Orders
        $recentOrders = Order::with('user:id,name') // Optimize by selecting only necessary user fields
                            ->orderBy('created_at', 'desc')
                            ->take(5) // Get latest 5 orders
                            ->get(['id', 'order_code', 'user_id', 'total_amount', 'status', 'created_at']);

        // Chart Data: Orders by Status (for all time, or a specific recent period)
        $ordersByStatusData = Order::select('status', DB::raw('count(*) as count'))
                                    ->groupBy('status')
                                    ->pluck('count', 'status') // Creates an associative array: ['status' => count]
                                    ->all();

        // Chart Data: Revenue Over Time (e.g., last 30 days)
        $revenueOverTimeData = Order::select(
                                        DB::raw('DATE(created_at) as date'),
                                        DB::raw('SUM(total_amount) as daily_revenue')
                                    )
                                    ->where('created_at', '>=', Carbon::now()->subDays(30))
                                    ->whereIn('status', ['completed', 'delivered']) // Consider only revenue-generating statuses
                                    ->groupBy(DB::raw('DATE(created_at)'))
                                    ->orderBy('date', 'asc')
                                    ->get();
        
        // You might want to format revenueOverTimeData for easier JS consumption if needed
        // For example, ensuring all days in the period are present, even if revenue is 0.
        // This is a more advanced step, for now, we'll return what the DB gives.


        return response()->json([
            'total_products' => $totalProducts,
            'total_users' => $totalUsers,
            'orders_today' => $ordersToday,
            'revenue_today' => $revenueToday,
            'total_orders_overall' => $totalOrdersOverall,
            'total_revenue_overall' => $totalRevenueOverall,
            'recent_orders' => $recentOrders,
            'orders_by_status_chart_data' => $ordersByStatusData, // Data for doughnut chart
            'revenue_over_time_chart_data' => $revenueOverTimeData, // Data for line chart
        ]);
    }
    public function getRevenueOverTimeReport(Request $request)
    {
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        $query = Order::query()
            ->whereIn('status', ['delivered', 'completed', 'refunded']); // Chỉ tính doanh thu từ các đơn đã hoàn thành/giao/hoàn tiền

        if ($startDate) {
            $query->whereDate('created_at', '>=', $startDate);
        }
        if ($endDate) {
            $query->whereDate('created_at', '<=', $endDate);
        }

        $revenueData = $query->select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('SUM(total_amount) as total_revenue') // Giả sử total_amount là tổng số tiền của đơn hàng
            )
            ->groupBy('date')
            ->orderBy('date', 'asc')
            ->get();

        // Xử lý dữ liệu để điền các ngày bị thiếu với doanh thu bằng 0 nếu cần cho biểu đồ
        $formattedData = [];
        if ($startDate && $endDate) {
            $currentDate = new \DateTime($startDate);
            $endDateTime = new \DateTime($endDate);

            while ($currentDate <= $endDateTime) {
                $dateString = $currentDate->format('Y-m-d');
                $found = $revenueData->firstWhere('date', $dateString);
                $formattedData[] = [
                    'date' => $dateString,
                    'total_revenue' => $found ? (float) $found->total_revenue : 0,
                ];
                $currentDate->modify('+1 day');
            }
        } else {
            // Nếu không có startDate/endDate, trả về dữ liệu thô hoặc áp dụng khoảng thời gian mặc định
            foreach ($revenueData as $item) {
                $formattedData[] = [
                    'date' => $item->date,
                    'total_revenue' => (float) $item->total_revenue,
                ];
            }
        }

        return response()->json($formattedData);
    }
}