// dashboard.js - KIỂM TRA LẠI VỚI PHIÊN BẢN CỦA BẠN
// Đảm bảo các key trong `summaryData` khớp với những gì controller trả về.
// Ví dụ: summaryData.orders_by_status_chart_data và summaryData.revenue_over_time_chart_data

document.addEventListener("DOMContentLoaded", () => {
  if (!checkAdminAuth()) return;

  loadDashboardStats();
});

async function loadDashboardStats() {
  try {
    const data = await fetchAdminAPI("dashboard/stats"); // Endpoint đã được cập nhật ở backend
    if (!data) {
      showCustomAlert(
        "warning",
        "Không có dữ liệu",
        "Không thể tải dữ liệu dashboard."
      );
      return;
    }

    const statsContainer = document.getElementById("dashboardStatsContainer");
    if (statsContainer) {
      statsContainer.innerHTML = `
                <div class="card"><h3>Tổng Sản Phẩm</h3><p>${
                  data.total_products || 0
                }</p></div>
                <div class="card"><h3>Tổng Người Dùng</h3><p>${
                  // User không phải admin
                  data.total_users || 0
                }</p></div>
                <div class="card"><h3>Đơn Hôm Nay</h3><p>${
                  data.orders_today || 0
                }</p></div>
                <div class="card"><h3>Doanh Thu Hôm Nay</h3><p>${formatCurrency(
                  // Chỉ từ đơn hàng hoàn thành/đã giao
                  data.revenue_today || 0 // Sửa lỗi undefined ở đây
                )}</p></div>
                <div class="card"><h3>Tổng Đơn Hàng</h3><p>${
                  data.total_orders_overall || 0
                }</p></div>
                <div class="card"><h3>Tổng Doanh Thu</h3><p>${formatCurrency(
                  // Chỉ từ đơn hàng hoàn thành/đã giao
                  data.total_revenue_overall || 0 // Sửa lỗi undefined ở đây
                )}</p></div>
            `;
    }

    const recentOrdersTableBody = document
      .getElementById("recentOrdersTable")
      ?.querySelector("tbody");
    if (recentOrdersTableBody) {
      recentOrdersTableBody.innerHTML = "";
      if (data.recent_orders && data.recent_orders.length > 0) {
        data.recent_orders.forEach((order) => {
          const row = recentOrdersTableBody.insertRow();
          row.innerHTML = `
                        <td>${order.id}</td>
                        <td><a href="order_details.html?id=${order.id}">${
            order.order_code || "N/A" // Thêm fallback cho order_code
          }</a></td>
                        <td>${
                          order.user
                            ? order.user.name
                            : order.customer_name || "Khách vãng lai"
                        }</td>
                        <td>${formatCurrency(order.total_amount)}</td>
                        <td><span class="status-${order.status.toLowerCase()}">${
            translateOrderStatus(order.status) // Nên có hàm dịch trạng thái
          }</span></td>
                        <td>${new Date(order.created_at).toLocaleDateString(
                          "vi-VN"
                        )}</td>
                    `;
        });
      } else {
        recentOrdersTableBody.innerHTML =
          '<tr><td colspan="6">Không có đơn hàng gần đây.</td></tr>';
      }
    }

    loadDashboardCharts(data); // Gọi hàm vẽ biểu đồ với toàn bộ data
  } catch (error) {
    console.error("Không thể tải dữ liệu dashboard:", error);
  }
}

function loadDashboardCharts(summaryData) {
  // summaryData giờ là toàn bộ object trả về từ API
  if (typeof Chart === "undefined") {
    console.warn("Chart.js chưa được tải. Bỏ qua việc vẽ biểu đồ.");
    return;
  }

  const ordersByStatusCtx = document
    .getElementById("ordersByStatusChart")
    ?.getContext("2d");
  if (
    ordersByStatusCtx &&
    summaryData &&
    summaryData.orders_by_status_chart_data // Đã có sẵn trong summaryData
  ) {
    // Hủy biểu đồ cũ nếu tồn tại để tránh lỗi khi tải lại
    if (window.ordersByStatusChart instanceof Chart) {
      window.ordersByStatusChart.destroy();
    }
    window.ordersByStatusChart = new Chart(ordersByStatusCtx, {
      // Lưu instance vào global/window để có thể destroy
      type: "doughnut",
      data: {
        labels: Object.keys(summaryData.orders_by_status_chart_data).map(
          (status) => translateOrderStatus(status)
        ), // Dịch tên trạng thái
        datasets: [
          {
            label: "Đơn hàng theo trạng thái",
            data: Object.values(summaryData.orders_by_status_chart_data),
            backgroundColor: [
              "rgba(54, 162, 235, 0.8)", // Processing
              "rgba(255, 206, 86, 0.8)", // Pending
              "rgba(75, 192, 192, 0.8)", // Completed
              "rgba(153, 102, 255, 0.8)", // Shipped
              "rgba(255, 99, 132, 0.8)", // Cancelled
              "rgba(201, 203, 207, 0.8)", // Delivered
              "rgba(255, 159, 64, 0.8)", // Failed / Refunded
            ],
            borderColor: "rgba(255,255,255,0.5)", // Màu viền cho các slice
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "top" } },
      },
    });
  } else {
    console.warn(
      "Không có dữ liệu `orders_by_status_chart_data` hoặc canvas không tìm thấy."
    );
  }

  const revenueOverTimeCtx = document
    .getElementById("revenueOverTimeChart")
    ?.getContext("2d");
  if (
    revenueOverTimeCtx &&
    summaryData &&
    summaryData.revenue_over_time_chart_data // Đã có sẵn trong summaryData
  ) {
    if (window.revenueOverTimeChart instanceof Chart) {
      window.revenueOverTimeChart.destroy();
    }
    window.revenueOverTimeChart = new Chart(revenueOverTimeCtx, {
      type: "line",
      data: {
        labels: summaryData.revenue_over_time_chart_data.map(
          (item) => new Date(item.date).toLocaleDateString("vi-VN") // item.date là từ backend
        ),
        datasets: [
          {
            label: "Doanh thu hàng ngày", // Bỏ (VND) vì đã có format ở tooltip vàแกน y
            data: summaryData.revenue_over_time_chart_data.map(
              (item) => item.daily_revenue // item.daily_revenue là từ backend
            ),
            borderColor: "rgba(75, 192, 192, 1)",
            backgroundColor: "rgba(75, 192, 192, 0.2)",
            tension: 0.1,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value, index, values) {
                return formatCurrency(value); // Dùng hàm formatCurrency
              },
            },
          },
        },
        plugins: {
          legend: { display: true, position: "top" }, // Hiển thị legend
          tooltip: {
            callbacks: {
              label: function (context) {
                let label = context.dataset.label || "";
                if (label) {
                  label += ": ";
                }
                if (context.parsed.y !== null) {
                  label += formatCurrency(context.parsed.y);
                }
                return label;
              },
            },
          },
        },
      },
    });
  } else {
    console.warn(
      "Không có dữ liệu `revenue_over_time_chart_data` hoặc canvas không tìm thấy."
    );
  }
}

// Bạn nên có hàm này trong common.js hoặc ở đây nếu chỉ dùng cho dashboard
function translateOrderStatus(status) {
  const statuses = {
    pending: "Chờ xử lý",
    processing: "Đang xử lý",
    shipped: "Đã giao hàng",
    delivered: "Đã nhận hàng",
    completed: "Hoàn thành",
    cancelled: "Đã hủy",
    failed: "Thất bại",
    refunded: "Đã hoàn tiền",
  };
  return statuses[status.toLowerCase()] || status;
}
