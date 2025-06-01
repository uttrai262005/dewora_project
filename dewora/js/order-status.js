// js/order-status.js
// Phiên bản bạn cung cấp (file thứ 3) đã khá tốt.
// Chỉ cần đảm bảo các class trong HTML được JS tạo ra khớp với file CSS mới.
// Ví dụ, phần hiển thị sản phẩm đã dùng class `checkout-item` rất tốt.
// Các class như `item-name`, `item-quantity`, `checkout-item-price` cũng đã có.

document.addEventListener("DOMContentLoaded", () => {
  const API_BASE_URL = "http://127.0.0.1:8000/api";
  const orderCodeDisplay = document.getElementById("order-code-display");
  const statusTracker = document.getElementById("status-tracker");
  const orderDetailsContainer = document.getElementById("order-details");
  const notificationContainer = document.getElementById("status-notification");

  const statusMap = {
    cho_xac_nhan: { text: "Chờ xác nhận", icon: "fa-pause-circle" },
    cho_thanh_toan: { text: "Chờ thanh toán", icon: "fa-credit-card" }, // Thêm icon cho trạng thái này
    cho_dong_goi: { text: "Chờ đóng gói", icon: "fa-box-open" },
    dang_van_chuyen: { text: "Đang vận chuyển", icon: "fa-shipping-fast" },
    da_giao: { text: "Đã giao", icon: "fa-check-circle" },
    da_huy: { text: "Đã hủy", icon: "fa-times-circle" },
  };

  const formatPrice = (price) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);

  async function fetchOrderData(orderCode) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/orders/by-code/${orderCode}`
      );
      if (!response.ok) {
        // Đọc lỗi từ server nếu có
        let errorMsg = "Không tìm thấy đơn hàng hoặc có lỗi xảy ra.";
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || errorMsg;
        } catch (e) {
          // Bỏ qua nếu không parse được JSON
        }
        throw new Error(errorMsg);
      }
      // const order = await response.json(); // Dòng này bị thay đổi ở phiên bản trước
      const data = await response.json(); // Giữ lại theo phiên bản trước (an toàn hơn)
      if (data && data.order) {
        displayOrder(data.order);
      } else {
        // Nếu API trả về order trực tiếp (không có key 'order')
        // thì dùng displayOrder(data) và kiểm tra cấu trúc data.
        // Hiện tại, giả định API trả về { order: { ... } }
        throw new Error("Dữ liệu đơn hàng không hợp lệ từ API.");
      }
    } catch (error) {
      console.error("Fetch Order Data Error:", error);
      orderDetailsContainer.innerHTML = `<p style="color: red; text-align:center;">${error.message}</p>`;
      if (orderCodeDisplay) orderCodeDisplay.textContent = " Lỗi";
      if (statusTracker) statusTracker.innerHTML = "";
      Swal.fire("Lỗi tải đơn hàng", error.message, "error");
    }
  }

  function displayOrder(order) {
    if (orderCodeDisplay)
      orderCodeDisplay.textContent = ` #${order.order_code}`;

    // Render status tracker
    const allDisplayStatuses = [
      // Các trạng thái chính muốn hiển thị tuần tự
      "cho_xac_nhan",
      "cho_dong_goi",
      "dang_van_chuyen",
      "da_giao",
    ];

    let currentDisplayStatus = order.status;

    // Xử lý thông báo riêng cho trạng thái "chờ thanh toán" hoặc "đã hủy"
    if (notificationContainer) {
      notificationContainer.innerHTML = ""; // Xóa thông báo cũ
      if (
        currentDisplayStatus === "cho_thanh_toan" &&
        order.payment_status === "pending"
      ) {
        notificationContainer.innerHTML = `<div style="background: #fff3cd; color: #856404; padding: 15px; border-radius: var(--radius-md); margin-bottom: 20px;">Đơn hàng đang chờ thanh toán. Vui lòng hoàn tất thanh toán để tiếp tục.</div>`;
      } else if (currentDisplayStatus === "da_huy") {
        notificationContainer.innerHTML = `<div style="background: #f8d7da; color: #721c24; padding: 15px; border-radius: var(--radius-md); margin-bottom: 20px;">Đơn hàng này đã bị hủy.</div>`;
      }
    }

    if (statusTracker) {
      if (currentDisplayStatus === "da_huy") {
        statusTracker.innerHTML = `<h2 style="color: var(--danger_color); text-align: center;">Đơn hàng đã bị hủy</h2>`;
      } else if (currentDisplayStatus === "cho_thanh_toan") {
        // Hiển thị một bước duy nhất cho "Chờ thanh toán"
        const statusInfo = statusMap.cho_thanh_toan;
        statusTracker.innerHTML = `
                <div class="status-step active">
                    <div class="icon"><i class="fas ${statusInfo.icon}"></i></div>
                    <p>${statusInfo.text}</p>
                </div>
            `;
      } else {
        const currentStatusIndex =
          allDisplayStatuses.indexOf(currentDisplayStatus);
        statusTracker.innerHTML = allDisplayStatuses
          .map((statusKey, index) => {
            const statusInfo = statusMap[statusKey];
            if (!statusInfo) return ""; // Bỏ qua nếu statusKey không có trong map

            let stepClass = "";
            if (currentStatusIndex >= 0) {
              // Chỉ áp dụng class nếu trạng thái hiện tại nằm trong luồng chính
              if (index < currentStatusIndex) stepClass = "completed";
              if (index === currentStatusIndex) stepClass = "active";
            }

            return `
                    <div class="status-step ${stepClass}">
                        <div class="icon"><i class="fas ${statusInfo.icon}"></i></div>
                        <p>${statusInfo.text}</p>
                    </div>
                    `;
          })
          .join("");
      }
    }

    // Render order details
    if (orderDetailsContainer) {
      orderDetailsContainer.innerHTML = `
            <h3>Chi tiết đơn hàng</h3>
            <p><strong>Người nhận:</strong> ${
              order.shipping_name || "Chưa có thông tin"
            }</p>
            <p><strong>Số điện thoại:</strong> ${
              order.shipping_phone || "Chưa có thông tin"
            }</p>
            <p><strong>Địa chỉ:</strong> ${
              order.shipping_address || "Chưa có thông tin"
            }</p>
            <p><strong>Thanh toán:</strong> ${
              order.payment_method ? order.payment_method.toUpperCase() : "N/A"
            }</p>
            <p><strong>Trạng thái thanh toán:</strong> ${
              order.payment_status === "paid"
                ? "Đã thanh toán"
                : order.payment_status === "pending"
                ? "Chờ thanh toán"
                : order.payment_status === "failed"
                ? "Thanh toán thất bại"
                : "N/A"
            }</p>
            ${
              order.notes
                ? `<p><strong>Ghi chú:</strong> ${order.notes}</p>`
                : ""
            }
            
            <h4>Sản phẩm</h4>
            ${
              order.items && order.items.length > 0
                ? order.items
                    .map(
                      (item) => `
                <div class="checkout-item">
                    <img src="${
                      item.product_image_url || "public/images/placeholder.png"
                    }" alt="${item.product_name}" class="checkout-item-image">
                    <div class="checkout-item-info">
                        <p class="item-name">${item.product_name}</p>
                        ${
                          item.color_name && item.color_name !== "N/A"
                            ? `<p class="item-color">Màu: ${item.color_name}</p>`
                            : ""
                        }
                        <p class="item-quantity">Số lượng: ${item.quantity}</p>
                        <p class="item-price-single">Đơn giá: ${formatPrice(
                          item.price
                        )}</p>
                    </div>
                    <span class="checkout-item-price">${formatPrice(
                      item.item_subtotal || item.price * item.quantity
                    )}</span>
                </div>`
                    )
                    .join("")
                : "<p>Không có thông tin sản phẩm.</p>"
            }
            
            <div class="summary-calculation">
                <div class="calc-row"><span>Tạm tính:</span> <span>${formatPrice(
                  order.subtotal || 0
                )}</span></div>
                <div class="calc-row"><span>Phí vận chuyển:</span> <span>${formatPrice(
                  order.shipping_fee || 0
                )}</span></div>
                ${
                  order.discount_amount > 0
                    ? `<div class="calc-row discount"><span>Giảm giá:</span> <span>-${formatPrice(
                        order.discount_amount
                      )}</span></div>`
                    : ""
                }
                <div class="calc-row total"><span>Thành tiền:</span> <strong>${formatPrice(
                  order.total_amount || 0
                )}</strong></div>
            </div>
        `;
    }
  }

  // Lấy order_code từ URL hoặc localStorage
  const urlParams = new URLSearchParams(window.location.search);
  const orderCodeFromUrl = urlParams.get("order_code");
  const orderCodeFromStorage = localStorage.getItem("dewora_order_code");
  const paymentStatus = urlParams.get("status"); // Từ VNPAY trả về

  console.log("Order Status Page - Code from URL:", orderCodeFromUrl);
  console.log("Order Status Page - Code from Storage:", orderCodeFromStorage);

  let orderCode = orderCodeFromUrl || orderCodeFromStorage;
  console.log("Order Status Page - Effective Order Code:", orderCode);

  if (notificationContainer) {
    // Chỉ xử lý VNPAY status nếu notificationContainer tồn tại
    if (paymentStatus === "success") {
      notificationContainer.innerHTML = `<div style="background: #d4edda; color: #155724; padding: 15px; border-radius: var(--radius-md); margin-bottom: 20px;">Thanh toán VNPAY thành công! Trạng thái đơn hàng sẽ sớm được cập nhật.</div>`;
    } else if (paymentStatus === "failed") {
      notificationContainer.innerHTML = `<div style="background: #f8d7da; color: #721c24; padding: 15px; border-radius: var(--radius-md); margin-bottom: 20px;">Thanh toán VNPAY thất bại. Vui lòng thử lại hoặc chọn phương thức thanh toán khác.</div>`;
    }
  }

  if (orderCode && orderCode !== "undefined" && orderCode.trim() !== "") {
    fetchOrderData(orderCode);
  } else {
    if (orderDetailsContainer)
      orderDetailsContainer.innerHTML = `<p style="color: red; text-align:center;">Không tìm thấy mã đơn hàng hợp lệ để hiển thị.</p>`;
    if (orderCodeDisplay) orderCodeDisplay.textContent = " Không xác định";
    if (statusTracker) statusTracker.innerHTML = "";
    Swal.fire(
      "Không tìm thấy đơn hàng",
      "Mã đơn hàng không hợp lệ hoặc đã bị xóa. Vui lòng kiểm tra lại hoặc liên hệ hỗ trợ.",
      "warning"
    );
  }
});
