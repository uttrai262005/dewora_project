// admin/js/reports.js
document.addEventListener("DOMContentLoaded", () => {
  if (!checkAdminAuth()) return;

  loadGeneralStats();

  document
    .getElementById("loadRevenueReportBtn")
    ?.addEventListener("click", loadRevenueOverTimeReport);
  document
    .getElementById("loadOrderStatusReportBtn")
    ?.addEventListener("click", loadOrdersByStatusReport);
  document
    .getElementById("exportPdfBtn")
    ?.addEventListener("click", exportReportsToPdf);
  // Initialize charts with empty data or a loading message
  initRevenueChart();
  initOrderStatusChart();
});
async function exportReportsToPdf() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "mm", "a4"); // 'p' là portrait (dọc), 'mm' là đơn vị milimet, 'a4' là kích thước A4
  doc.setFont("Roboto-VariableFont_wdth,wght", "bold"); // ĐÂY LÀ TÊN FONT CHÍNH XÁC
  // Hiển thị overlay loading (giả sử bạn có hàm này trong common.js)
  showLoadingOverlay("Đang tạo báo cáo PDF...");

  try {
    // Tiêu đề báo cáo và ngày xuất
    doc.setFontSize(18);
    doc.text("Báo Cáo Thống Kê - Dewora Admin", 10, 15); // x, y
    doc.setFontSize(10);
    doc.text(`Ngày xuất: ${new Date().toLocaleDateString("vi-VN")}`, 10, 25);

    let yOffset = 40; // Vị trí Y ban đầu cho nội dung

    // --- Xuất phần Thống Kê Chung ---
    const generalStatsContainer = document.getElementById(
      "generalStatsContainer"
    );
    if (generalStatsContainer) {
      doc.setFontSize(14);
      doc.text("1. Thống Kê Chung", 10, yOffset);
      yOffset += 5; // Khoảng cách sau tiêu đề

      // Chuyển đổi phần tử HTML thành canvas (ảnh)
      const canvasGeneral = await html2canvas(generalStatsContainer, {
        scale: 2,
        backgroundColor: "#ffffff",
      }); // scale 2 để chất lượng tốt hơn
      const imgDataGeneral = canvasGeneral.toDataURL("image/png");
      const imgWidthGeneral = 190; // Chiều rộng cho ảnh (A4 ~ 210mm, trừ lề 10mm mỗi bên)
      const imgHeightGeneral =
        (canvasGeneral.height * imgWidthGeneral) / canvasGeneral.width;

      // Thêm ảnh vào PDF. addImage(imageData, format, x, y, width, height)
      doc.addImage(
        imgDataGeneral,
        "PNG",
        10,
        yOffset,
        imgWidthGeneral,
        imgHeightGeneral
      );
      yOffset += imgHeightGeneral + 15; // Cập nhật yOffset cho phần tiếp theo
    }

    // --- Xuất phần Doanh Thu Theo Thời Gian (Biểu đồ) ---
    const revenueChartCanvas = document.getElementById("revenueChart");
    if (revenueChartCanvas) {
      // Kiểm tra nếu nội dung còn dài, thêm trang mới
      if (yOffset > 250) {
        // Ví dụ: nếu còn dưới 50mm trên trang
        doc.addPage();
        yOffset = 10;
      }

      doc.setFontSize(14);
      doc.text("2. Doanh Thu Theo Thời Gian", 10, yOffset);
      yOffset += 5;

      const canvasRevenueChart = await html2canvas(revenueChartCanvas, {
        scale: 2,
        backgroundColor: "#ffffff",
      });
      const imgDataRevenueChart = canvasRevenueChart.toDataURL("image/png");
      const imgWidthRevenueChart = 190;
      const imgHeightRevenueChart =
        (canvasRevenueChart.height * imgWidthRevenueChart) /
        canvasRevenueChart.width;

      doc.addImage(
        imgDataRevenueChart,
        "PNG",
        10,
        yOffset,
        imgWidthRevenueChart,
        imgHeightRevenueChart
      );
      yOffset += imgHeightRevenueChart + 15;
    }

    // --- Xuất phần Tóm Tắt Doanh Thu ---
    const revenueSummary = document.getElementById("revenueSummary");
    if (revenueSummary && revenueSummary.innerText.trim() !== "") {
      // Kiểm tra nếu nội dung còn dài, thêm trang mới
      if (yOffset > 250) {
        doc.addPage();
        yOffset = 10;
      }

      doc.setFontSize(12);
      doc.text("Tóm Tắt Doanh Thu:", 10, yOffset);
      yOffset += 5;

      const canvasRevenueSummary = await html2canvas(revenueSummary, {
        scale: 2,
        backgroundColor: "#ffffff",
      });
      const imgDataRevenueSummary = canvasRevenueSummary.toDataURL("image/png");
      const imgWidthRevenueSummary = 190;
      const imgHeightRevenueSummary =
        (canvasRevenueSummary.height * imgWidthRevenueSummary) /
        canvasRevenueSummary.width;

      doc.addImage(
        imgDataRevenueSummary,
        "PNG",
        10,
        yOffset,
        imgWidthRevenueSummary,
        imgHeightRevenueSummary
      );
      yOffset += imgHeightRevenueSummary + 15;
    }

    // --- Xuất phần Đơn Hàng Theo Trạng Thái (Biểu đồ) ---
    const orderStatusChartCanvas = document.getElementById("orderStatusChart");
    if (orderStatusChartCanvas) {
      // Kiểm tra nếu nội dung còn dài, thêm trang mới
      if (yOffset > 250) {
        doc.addPage();
        yOffset = 10;
      }

      doc.setFontSize(14);
      doc.text("3. Đơn Hàng Theo Trạng Thái", 10, yOffset);
      yOffset += 5;

      const canvasOrderStatusChart = await html2canvas(orderStatusChartCanvas, {
        scale: 2,
        backgroundColor: "#ffffff",
      });
      const imgDataOrderStatusChart =
        canvasOrderStatusChart.toDataURL("image/png");
      const imgWidthOrderStatusChart = 190;
      const imgHeightOrderStatusChart =
        (canvasOrderStatusChart.height * imgWidthOrderStatusChart) /
        canvasOrderStatusChart.width;

      doc.addImage(
        imgDataOrderStatusChart,
        "PNG",
        10,
        yOffset,
        imgWidthOrderStatusChart,
        imgHeightOrderStatusChart
      );
      // yOffset += imgHeightOrderStatusChart + 15; // Không cần cập nhật yOffset nếu đây là phần cuối
    }

    // Lưu file PDF
    doc.save("bao_cao_dewora_admin.pdf");
    showCustomAlert("success", "Thành công!", "Báo cáo PDF đã được tạo.");
  } catch (error) {
    console.error("Lỗi khi tạo báo cáo PDF:", error);
    showCustomAlert(
      "error",
      "Lỗi",
      "Không thể tạo báo cáo PDF. Vui lòng thử lại."
    );
  } finally {
    // Ẩn overlay loading
    hideLoadingOverlay(); // Giả sử bạn có hàm này trong common.js
  }
}
let revenueChartInstance = null;
let orderStatusChartInstance = null;

async function loadGeneralStats() {
  const container = document.getElementById("generalStatsContainer");
  if (!container) return;
  container.innerHTML = "<p>Đang tải thống kê...</p>";

  try {
    // API: GET /api/admin/dashboard/stats
    const stats = await fetchAdminAPI("dashboard/stats");
    if (stats) {
      container.innerHTML = `
                <div class="stat-card">
                    <h4>Tổng Doanh Thu</h4>
                    <p>${formatCurrency(stats.total_revenue_overall || 0)}</p>
                </div>
                <div class="stat-card">
                    <h4>Tổng Đơn Hàng</h4>
                    <p>${stats.total_orders_overall || 0}</p>
                </div>
                <div class="stat-card">
                    <h4>Tổng Người Dùng</h4> <p>${
                      // Đã đổi "Khách Hàng Mới (Tháng Này)" thành "Tổng Người Dùng"
                      stats.total_users || 0 // Sử dụng khóa "total_users" từ API
                    }</p>
                </div>
                <div class="stat-card">
                    <h4>Sản Phẩm Hiện Có</h4>
                    <p>${stats.total_products || 0}</p>
                </div>
            `;
    } else {
      container.innerHTML = "<p>Không thể tải dữ liệu thống kê chung.</p>";
    }
  } catch (error) {
    console.error("Lỗi tải thống kê chung:", error);
    container.innerHTML = "<p>Có lỗi xảy ra khi tải thống kê chung.</p>";
    showCustomAlert("error", "Lỗi", "Không thể tải thống kê chung.");
  }
}
function initRevenueChart() {
  const ctx = document.getElementById("revenueChart")?.getContext("2d");
  if (!ctx) return;
  revenueChartInstance = new Chart(ctx, {
    type: "line", // or 'bar'
    data: {
      labels: [], // Dates
      datasets: [
        {
          label: "Doanh thu",
          data: [], // Revenue amounts
          borderColor: "rgb(75, 192, 192)",
          tension: 0.1,
          fill: false,
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
              return formatCurrency(value);
            },
          },
        },
      },
      plugins: {
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
}

function initOrderStatusChart() {
  const ctx = document.getElementById("orderStatusChart")?.getContext("2d");
  if (!ctx) return;
  orderStatusChartInstance = new Chart(ctx, {
    type: "pie", // or 'doughnut'
    data: {
      labels: [], // Status names
      datasets: [
        {
          label: "Số lượng đơn hàng",
          data: [], // Counts per status
          backgroundColor: [
            // Add more colors as needed
            "rgba(255, 99, 132, 0.7)",
            "rgba(54, 162, 235, 0.7)",
            "rgba(255, 206, 86, 0.7)",
            "rgba(75, 192, 192, 0.7)",
            "rgba(153, 102, 255, 0.7)",
            "rgba(255, 159, 64, 0.7)",
            "rgba(199, 199, 199, 0.7)",
          ],
          borderColor: "#fff",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              let label = context.label || "";
              let value = context.parsed || 0;
              return `${label}: ${value} đơn`;
            },
          },
        },
      },
    },
  });
}

async function loadRevenueOverTimeReport() {
  // Lấy tham chiếu đến các phần tử input
  const startDateInput = document.getElementById("revenueStartDate");
  const endDateInput = document.getElementById("revenueEndDate");

  // Kiểm tra xem các phần tử có tồn tại không
  if (!startDateInput || !endDateInput) {
    console.error(
      "Lỗi: Không tìm thấy các trường ngày bắt đầu hoặc ngày kết thúc doanh thu."
    );
    showCustomAlert(
      "error",
      "Lỗi",
      "Không tìm thấy các trường ngày 'Doanh thu'. Vui lòng kiểm tra lại HTML."
    );
    return; // Dừng hàm nếu không tìm thấy phần tử
  }

  const startDate = startDateInput.value;
  const endDate = endDateInput.value;

  try {
    // API: GET /api/admin/dashboard/revenue-over-time?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
    let endpoint = "dashboard/revenue-over-time";
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    if (params.toString()) endpoint += `?${params.toString()}`;

    const reportData = await fetchAdminAPI(endpoint);

    if (reportData && revenueChartInstance) {
      const labels = reportData.map((item) => item.date);
      const data = reportData.map((item) => item.total_revenue);

      revenueChartInstance.data.labels = labels;
      revenueChartInstance.data.datasets[0].data = data;
      revenueChartInstance.update();

      const totalRevenue = reportData.reduce(
        (sum, item) => sum + item.total_revenue,
        0
      );
      document.getElementById(
        "revenueSummary"
      ).innerHTML = `<p><strong>Tổng doanh thu:</strong> ${formatCurrency(
        totalRevenue
      )}</p>`;
    } else {
      if (revenueChartInstance) {
        revenueChartInstance.data.labels = [];
        revenueChartInstance.data.datasets[0].data = [];
        revenueChartInstance.update();
      }
      document.getElementById("revenueSummary").innerHTML =
        "<p>Không có dữ liệu doanh thu cho khoảng thời gian này.</p>";
    }
  } catch (error) {
    console.error("Lỗi tải báo cáo doanh thu theo thời gian:", error);
    showCustomAlert("error", "Lỗi", "Không thể tải báo cáo doanh thu.");
  }
}

async function loadOrdersByStatusReport() {
  const startDate = document.getElementById("orderStatusStartDate").value;
  const endDate = document.getElementById("orderStatusEndDate").value;

  try {
    // API: GET /api/admin/orders/report/by-status?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
    let endpoint = "orders/report/by-status";
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    if (params.toString()) endpoint += `?${params.toString()}`;

    const reportData = await fetchAdminAPI(endpoint); // Assuming API returns [{status: 'name', count: X}]

    if (reportData && orderStatusChartInstance) {
      const labels = reportData.map((item) =>
        translateOrderStatus(item.status)
      );
      const data = reportData.map((item) => item.count);

      orderStatusChartInstance.data.labels = labels;
      orderStatusChartInstance.data.datasets[0].data = data;
      orderStatusChartInstance.update();
    } else {
      if (orderStatusChartInstance) {
        // Clear chart
        orderStatusChartInstance.data.labels = [];
        orderStatusChartInstance.data.datasets[0].data = [];
        orderStatusChartInstance.update();
      }
    }
  } catch (error) {
    console.error("Lỗi tải báo cáo trạng thái đơn hàng:", error);
  }
}

/**
 * Dịch trạng thái đơn hàng sang tiếng Việt.
 * @param {string} statusKey - Khóa trạng thái đơn hàng
 * @returns {string} Trạng thái đã dịch sang tiếng Việt
 */
function translateOrderStatus(statusKey) {
  const map = {
    pending: "Chờ xử lý",
    processing: "Đang xử lý",
    shipped: "Đã giao hàng",
    delivered: "Đã nhận hàng",
    completed: "Hoàn thành",
    cancelled: "Đã hủy",
    failed: "Thất bại",
    refunded: "Đã hoàn tiền",
  };
  return map[statusKey] || statusKey; // Trả về giá trị đã dịch hoặc khóa gốc nếu không có trong map
}
