// admin/js/orders.js (Additions/Modifications for Admin Panel)

document.addEventListener("DOMContentLoaded", () => {
  if (!checkAdminAuth()) return;

  // For manage_orders.html
  if (document.getElementById("ordersTable")) {
    loadAdminOrders();
    document
      .getElementById("searchOrderButton")
      ?.addEventListener("click", () => {
        const searchTerm = document.getElementById("searchOrderInput").value;
        const statusFilter = document.getElementById("filterOrderStatus").value;
        loadAdminOrders(1, searchTerm, statusFilter);
      });
  }

  // For order_details.html
  if (document.getElementById("orderDetailsContainer")) {
    loadAdminOrderDetails();
    document
      .getElementById("updateStatusBtn")
      ?.addEventListener("click", updateOrderStatusAdmin);
  }
  document
    .getElementById("exportOrdersPdfBtn")
    ?.addEventListener("click", exportOrdersToPdf); // Gọi hàm exportOrdersToPdf khi click
});

let currentAdminOrderPage = 1;
let currentAdminOrderSearch = "";
let currentAdminOrderStatusFilter = "";

async function loadAdminOrders(page = 1, searchTerm = "", status = "") {
  currentAdminOrderPage = page;
  currentAdminOrderSearch = searchTerm;
  currentAdminOrderStatusFilter = status;

  const ordersTableBody = document
    .getElementById("ordersTable")
    ?.querySelector("tbody");
  if (!ordersTableBody) return;
  ordersTableBody.innerHTML = '<tr><td colspan="7">Đang tải...</td></tr>';

  try {
    const perPage = 10;
    let endpoint = `orders?page=${page}&per_page=${perPage}&sort_by=id&sort_order=desc`;
    if (searchTerm) endpoint += `&search=${encodeURIComponent(searchTerm)}`;
    if (status) endpoint += `&status=${encodeURIComponent(status)}`;

    const responseData = await fetchAdminAPI(endpoint); // Ensure this API endpoint exists and supports these params

    if (!responseData || !responseData.data || responseData.data.length === 0) {
      ordersTableBody.innerHTML =
        '<tr><td colspan="7">Không tìm thấy đơn hàng nào.</td></tr>';
      // Chỉnh sửa ở đây:
      setupPaginationControls(
        responseData || {}, // Truyền responseData hoặc object rỗng nếu responseData cũng null/undefined
        "paginationControlsOrders", // Truyền ID dạng chuỗi
        loadAdminOrders,
        currentAdminOrderSearch,
        currentAdminOrderStatusFilter
      );
      return;
    }

    ordersTableBody.innerHTML = "";
    responseData.data.forEach((order) => {
      const row = ordersTableBody.insertRow();
      row.innerHTML = `
                <td>${order.id}</td>
                <td>${order.order_code || "N/A"}</td>
                <td>${
                  order.user?.name || order.customer_name || "Khách vãng lai"
                }</td>
                <td>${new Date(order.created_at).toLocaleString()}</td>
                <td>${formatCurrency(order.total_amount)}</td>
                <td><span class="status-${order.status}">${translateOrderStatus(
        order.status
      )}</span></td>
                <td class="table-actions">
                    <a href="order_details.html?id=${
                      order.id
                    }" class="btn-secondary btn-sm">Xem</a>
                </td>
            `;
    });
    setupPaginationControls(
      responseData, // Truyền responseData trực tiếp
      "paginationControlsOrders", // Truyền ID dạng chuỗi
      loadAdminOrders,
      currentAdminOrderSearch,
      currentAdminOrderStatusFilter
    );
  } catch (error) {
    console.error("Lỗi khi tải đơn hàng admin:", error);
    ordersTableBody.innerHTML =
      '<tr><td colspan="7">Lỗi khi tải dữ liệu.</td></tr>';
  }
}

async function loadAdminOrderDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get("id");
  const container = document.getElementById("orderDetailsContainer");
  const title = document.getElementById("orderDetailsTitle");
  const updateStatusSection = document.getElementById("updateStatusSection");

  if (!orderId || !container || !title) return;
  title.textContent = `Chi Tiết Đơn Hàng #${orderId}`;

  try {
    const order = await fetchAdminAPI(`orders/${orderId}`); // API: GET /api/admin/orders/{order}
    if (!order) {
      container.innerHTML = "<p>Không tìm thấy thông tin đơn hàng.</p>";
      return;
    }

    let itemsHtml = "<p>Không có sản phẩm.</p>";
    if (order.items && order.items.length > 0) {
      itemsHtml = `
                <h4>Các sản phẩm trong đơn:</h4>
                <table class="items-table">
                    <thead>
                        <tr>
                            <th>Ảnh</th>
                            <th>Sản phẩm</th>
                            <th>Đơn giá</th>
                            <th>Số lượng</th>
                            <th>Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.items
                          .map(
                            (item) => `
                            <tr>
                                <td><img src="${
                                  item.product?.images?.[0]?.image_url ||
                                  "images/default-placeholder.png"
                                }" alt="${
                              item.product?.name
                            }" style="width:50px; height:auto;"></td>
                                <td>${
                                  item.product?.name ||
                                  item.product_name ||
                                  "Sản phẩm đã xóa"
                                }</td>
                                <td>${formatCurrency(item.price)}</td>
                                <td>${item.quantity}</td>
                                <td>${formatCurrency(
                                  item.price * item.quantity
                                )}</td>
                            </tr>
                        `
                          )
                          .join("")}
                    </tbody>
                </table>
            `;
    }

    const address = order.address || {}; // Assuming address is part of order details

    container.innerHTML = `
            <div class="order-info-grid">
                <div><strong>ID Đơn hàng:</strong> ${order.id}</div>
                <div><strong>Mã Đơn hàng:</strong> ${order.order_code}</div>
                <div><strong>Ngày đặt:</strong> ${new Date(
                  order.created_at
                ).toLocaleString()}</div>
                <div><strong>Trạng thái hiện tại:</strong> <span class="status-${
                  order.status
                }">${translateOrderStatus(order.status)}</span></div>
                
                <div><strong>Tên khách hàng:</strong> ${
                  order.user?.name || order.customer_name || "N/A"
                }</div>
                <div><strong>Email:</strong> ${
                  order.user?.email || order.customer_email || "N/A"
                }</div>
                <div><strong>Số điện thoại:</strong> ${
                  order.customer_phone || "N/A"
                }</div>
                
                <div><strong>Địa chỉ giao hàng:</strong> ${
                  address.full_address || order.shipping_address || "N/A"
                }</div>
                <div><strong>Phường/Xã:</strong> ${address.ward || "N/A"}</div>
                <div><strong>Quận/Huyện:</strong> ${
                  address.district || "N/A"
                }</div>
                <div><strong>Tỉnh/Thành phố:</strong> ${
                  address.city || "N/A"
                }</div>
                
                <div><strong>Ghi chú đơn hàng:</strong> ${
                  order.notes || "Không có"
                }</div>
                <div><strong>Phương thức thanh toán:</strong> ${translatePaymentMethod(
                  order.payment_method
                )}</div>
                <div><strong>Trạng thái thanh toán:</strong> ${
                  order.payment_status || "Chưa thanh toán"
                }</div>

                <div><strong>Phí vận chuyển:</strong> ${formatCurrency(
                  order.shipping_fee
                )}</div>
                <div><strong>Giảm giá:</strong> ${formatCurrency(
                  order.discount_amount || 0
                )}</div>
                <div style="font-weight: bold; font-size: 1.1em;"><strong>Tổng tiền:</strong> ${formatCurrency(
                  order.total_amount
                )}</div>
            </div>
            ${itemsHtml}
        `;

    // Show update status section and set current status
    if (updateStatusSection) {
      updateStatusSection.style.display = "block";
      document.getElementById("newOrderStatus").value = order.status;
    }
  } catch (error) {
    console.error("Lỗi tải chi tiết đơn hàng:", error);
    container.innerHTML =
      "<p>Lỗi khi tải chi tiết đơn hàng. Vui lòng thử lại.</p>";
  }
}

async function updateOrderStatusAdmin() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get("id");
  const newStatus = document.getElementById("newOrderStatus").value;
  const updateButton = document.getElementById("updateStatusBtn");

  if (!orderId || !newStatus) {
    showCustomAlert("error", "Lỗi", "Thiếu thông tin để cập nhật.");
    return;
  }

  const originalButtonText = updateButton.textContent;
  updateButton.disabled = true;
  updateButton.textContent = "Đang cập nhật...";

  try {
    // API: PUT /api/admin/orders/{order}/status
    const response = await fetchAdminAPI(`orders/${orderId}/status`, "PUT", {
      status: newStatus,
    });
    if (response) {
      showCustomAlert(
        "success",
        "Thành công",
        "Trạng thái đơn hàng đã được cập nhật."
      );
      loadAdminOrderDetails(); // Reload details to show new status
    }
  } catch (error) {
    // Error already shown by fetchAdminAPI
    console.error("Lỗi khi cập nhật trạng thái đơn hàng:", error);
  } finally {
    updateButton.disabled = false;
    updateButton.textContent = originalButtonText;
  }
}

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
    // Add more as needed
  };
  return statuses[status] || status;
}

function translatePaymentMethod(method) {
  const methods = {
    cod: "Thanh toán khi nhận hàng (COD)",
    vnpay: "Thanh toán qua VNPAY",
    bank_transfer: "Chuyển khoản ngân hàng",
    // Add more
  };
  return methods[method] || method;
}

// Make sure your common.js has setupPaginationControls, or adapt it here.
// It should be flexible enough to take a loadFunction and its specific arguments.
// Example modification for setupPaginationControls if needed for varied arguments:
/*
function setupPaginationControls(meta, container, loadFunction, ...args) {
    if (!container || !meta || !meta.links) {
        if(container) container.innerHTML = "";
        return;
    }
    // ... existing pagination logic ...
    prevButton.addEventListener("click", (e) => {
        e.preventDefault();
        if (meta.current_page > 1) {
            loadFunction(meta.current_page - 1, ...args); // Spread additional args
        }
    });
    // ... similar for nextButton and page links ...
}
*/
async function fetchAllAdminOrders(searchTerm = "", status = "") {
  let allOrders = [];
  let currentPage = 1;
  const perPageSetting = 100;
  let hasMorePages = true; // Biến cờ để kiểm soát vòng lặp

  try {
    do {
      const params = new URLSearchParams();
      params.append("page", currentPage);
      params.append("per_page", perPageSetting);
      if (searchTerm) {
        params.append("search", searchTerm);
      }
      if (status) {
        params.append("status", status);
      }

      let endpoint = "orders";
      if (params.toString()) {
        endpoint += `?${params.toString()}`;
      }

      const response = await fetchAdminAPI(endpoint);

      if (response && response.data && response.data.length > 0) {
        allOrders = allOrders.concat(response.data);

        // Kiểm tra xem còn trang tiếp theo không
        if (response.last_page) {
          // Ưu tiên thông tin từ API
          if (currentPage >= response.last_page) {
            hasMorePages = false;
          }
        } else {
          // Nếu API không cung cấp last_page
          if (response.data.length < perPageSetting) {
            hasMorePages = false; // Trang này không đầy, coi như hết
          }
        }
      } else {
        // Không có dữ liệu hoặc response không hợp lệ
        hasMorePages = false;
      }

      if (hasMorePages) {
        currentPage++;
      }
    } while (hasMorePages); // Lặp khi còn trang

    return allOrders;
  } catch (error) {
    console.error("Lỗi khi tải tất cả đơn hàng (lặp trang):", error);
    showCustomAlert(
      "error",
      "Lỗi Tải Dữ Liệu",
      "Không thể tải tất cả dữ liệu đơn hàng để xuất PDF. " +
        (error.message || "Lỗi không xác định.")
    );
    return [];
  }
}

async function exportOrdersToPdf() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "mm", "a4"); // 'p' is portrait, 'mm' is millimeters, 'a4' is A4 size

  // Set font. Use the EXACT name you've confirmed from the font .js file.
  // Based on your previous context, the exact name is 'Roboto-VariableFont_wdth,wght'.
  doc.setFont("Roboto-VariableFont_wdth,wght", "bold");

  // Display loading overlay
  showLoadingOverlay("Đang tạo báo cáo PDF đơn hàng...");

  try {
    const searchTerm = document.getElementById("searchOrderInput").value;
    const statusFilter = document.getElementById("filterOrderStatus").value;

    // Fetch all orders based on current filters (potentially paginated internally)
    const orders = await fetchAllAdminOrders(searchTerm, statusFilter);

    if (orders.length === 0) {
      showCustomAlert(
        "info",
        "Không có dữ liệu",
        "Không có đơn hàng nào để xuất PDF với các tiêu chí đã chọn."
      );
      return;
    }

    const pageSize = 20; // Number of orders per PDF page
    const totalPages = Math.ceil(orders.length / pageSize);

    for (let pageNum = 0; pageNum < totalPages; pageNum++) {
      if (pageNum > 0) {
        doc.addPage(); // Add a new page for subsequent pages
      }

      const startIdx = pageNum * pageSize;
      const endIdx = Math.min(startIdx + pageSize, orders.length);
      const ordersForPage = orders.slice(startIdx, endIdx);

      // Report Title
      doc.setFontSize(18);
      doc.text("Báo Cáo Đơn Hàng - Dewora Admin", 10, 15);
      doc.setFontSize(10);
      doc.text(`Ngày xuất: ${new Date().toLocaleDateString("vi-VN")}`, 10, 25);

      if (searchTerm || statusFilter) {
        doc.text(
          `Tìm kiếm: ${searchTerm || "Không có"} - Trạng thái: ${
            statusFilter ? translateOrderStatus(statusFilter) : "Tất cả"
          }`,
          10,
          32
        );
      }

      // Prepare header and data for the table
      const head = [
        [
          "ID Đơn",
          "Mã Đơn Hàng",
          "Khách Hàng",
          "Ngày Đặt",
          "Tổng Tiền",
          "Trạng Thái",
        ],
      ];

      const body = ordersForPage.map((order) => [
        order.id,
        order.order_code,
        order.user?.name || order.customer_name || "N/A", // Ensure user field exists
        new Date(order.created_at).toLocaleDateString("vi-VN"),
        formatCurrency(order.total_amount), // formatCurrency function must be available (usually in common.js)
        translateOrderStatus(order.status), // translateOrderStatus function is in orders.js
      ]);

      // Add table to PDF
      doc.autoTable({
        startY: 45, // Start table after title and date
        head: head,
        body: body,
        theme: "striped", // Table style: 'striped', 'grid', 'plain'
        styles: {
          font: "Roboto-VariableFont_wdth,wght", // Set font for table
          fontStyle: "bold",
          fontSize: 8,
          cellPadding: 2,
          lineColor: 200,
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [22, 160, 133], // Header background color
          textColor: 255, // Header text color
          fontSize: 9,
        },
        columnStyles: {
          0: { cellWidth: 15 }, // Order ID
          1: { cellWidth: 25 }, // Order Code
          2: { cellWidth: 40 }, // Customer
          3: { cellWidth: 25 }, // Order Date
          4: { cellWidth: 30 }, // Total Amount
          5: { cellWidth: 35 }, // Status
        },
        didDrawPage: function (data) {
          // Footer: Page number
          let str = `Trang ${pageNum + 1} / ${totalPages}`;
          doc.setFontSize(8);
          doc.text(
            str,
            data.settings.margin.left,
            doc.internal.pageSize.height - 10
          );
        },
      });
    }

    // Save PDF file
    doc.save(`bao_cao_don_hang_${new Date().toISOString().slice(0, 10)}.pdf`);
    showCustomAlert("success", "Thành công!", "Báo cáo PDF đã được tạo.");
  } catch (error) {
    console.error("Lỗi khi xuất báo cáo PDF đơn hàng:", error);
    showCustomAlert("error", "Lỗi", "Đã xảy ra lỗi khi tạo báo cáo PDF.");
  } finally {
    hideLoadingOverlay();
  }
}
