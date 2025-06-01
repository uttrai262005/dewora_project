// js/dh.js

// Các biến và hàm tiện ích có thể giữ ở phạm vi ngoài nếu chúng không tương tác trực tiếp với DOM cụ thể khi khởi tạo
const API_BASE_URL_DH = "http://127.0.0.1:8000/api"; // Đổi tên để tránh trùng với scriptttk.js nếu cần
let allUserOrders_DH = []; // Đổi tên để tránh trùng nếu có biến tương tự ở global scope
const orderStatusMap_DH = {
  // Đổi tên
  cho_xac_nhan: "Chờ xác nhận",
  cho_thanh_toan: "Chờ thanh toán",
  cho_dong_goi: "Chờ đóng gói",
  dang_van_chuyen: "Đang vận chuyển",
  da_giao: "Đã giao",
  da_huy: "Đã hủy",
};

const formatPrice_DH = (
  price // Đổi tên
) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);

const formatDate_DH = (dateString) => {
  // Đổi tên
  if (!dateString) return "N/A";
  try {
    const options = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleDateString("vi-VN", options);
  } catch (e) {
    return dateString;
  }
};

async function fetchUserOrders_DH(
  ordersTbodyElem,
  loadingIndicatorElem,
  noOrdersMessageElem
) {
  console.log("DH_JS: fetchUserOrders_DH called with elements:", {
    ordersTbodyElem,
    loadingIndicatorElem,
    noOrdersMessageElem,
  });
  if (loadingIndicatorElem) loadingIndicatorElem.style.display = "block";
  if (noOrdersMessageElem) noOrdersMessageElem.style.display = "none";
  if (ordersTbodyElem) ordersTbodyElem.innerHTML = "";

  try {
    const userAuthToken = localStorage.getItem("user_auth_token");
    if (!userAuthToken) {
      Swal.fire({
        title: "Yêu cầu đăng nhập",
        html: "Vui lòng <a href='login.html'>đăng nhập</a> để xem lịch sử đơn hàng.",
        icon: "info",
        confirmButtonText: "Đóng",
      });
      if (loadingIndicatorElem) loadingIndicatorElem.style.display = "none";
      if (noOrdersMessageElem) noOrdersMessageElem.style.display = "block";
      return;
    }

    const response = await fetch(`${API_BASE_URL_DH}/orders`, {
      headers: {
        Authorization: `Bearer ${userAuthToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        Swal.fire(
          "Lỗi",
          "Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.",
          "error"
        ).then(() => {
          localStorage.removeItem("user_auth_token");
          window.location.href = "login.html";
        });
      } else {
        const errorData = await response.json().catch(() => ({
          message: "Không thể tải đơn hàng. Vui lòng thử lại.",
        }));
        throw new Error(errorData.message);
      }
      return;
    }
    const data = await response.json();
    allUserOrders_DH = data.orders || data || [];
    console.log("DH_JS: Orders fetched: ", allUserOrders_DH);
    renderUserOrders_DH(allUserOrders_DH, ordersTbodyElem, noOrdersMessageElem);
  } catch (error) {
    console.error("DH_JS: Lỗi khi tải đơn hàng của người dùng:", error);
    Swal.fire("Lỗi", `Không thể tải đơn hàng: ${error.message}`, "error");
    if (noOrdersMessageElem) noOrdersMessageElem.style.display = "block";
  } finally {
    if (loadingIndicatorElem) loadingIndicatorElem.style.display = "none";
  }
}

function renderUserOrders_DH(orders, ordersTbodyElem, noOrdersMessageElem) {
  if (!ordersTbodyElem) {
    console.error("DH_JS: ordersTbodyElem is null in renderUserOrders_DH");
    return;
  }
  ordersTbodyElem.innerHTML = "";

  if (!orders || orders.length === 0) {
    if (noOrdersMessageElem) noOrdersMessageElem.style.display = "block";
    return;
  }
  if (noOrdersMessageElem) noOrdersMessageElem.style.display = "none";

  orders.forEach((order) => {
    const row = ordersTbodyElem.insertRow();
    row.insertCell().textContent = order.order_code || "N/A";
    row.insertCell().textContent = formatDate_DH(order.created_at);

    const productCell = row.insertCell();
    productCell.classList.add("product-summary");
    if (order.items && order.items.length > 0) {
      productCell.innerHTML = order.items
        .map(
          (item) =>
            `<div>${item.product_name || "Sản phẩm"} (SL: ${
              item.quantity || 1
            })</div>`
        )
        .join("");
      if (productCell.innerHTML.length > 100) {
        productCell.innerHTML = productCell.innerHTML.substring(0, 100) + "...";
      }
    } else {
      productCell.textContent = "Không có thông tin sản phẩm";
    }

    row.insertCell().textContent = formatPrice_DH(order.total_amount || 0);

    const statusCell = row.insertCell();
    const statusTag = document.createElement("span");
    statusTag.classList.add("status-tag", order.status || "unknown");
    statusTag.textContent =
      orderStatusMap_DH[order.status] || order.status || "Không rõ";
    statusCell.appendChild(statusTag);

    const actionCell = row.insertCell();
    const viewDetailsButton = document.createElement("a");
    viewDetailsButton.href = `order-status.html?order_code=${order.order_code}`;
    viewDetailsButton.classList.add("btn-view-order-details");
    viewDetailsButton.innerHTML = '<i class="fas fa-eye"></i> Xem';
    actionCell.appendChild(viewDetailsButton);

    if (order.status === "cho_xac_nhan" || order.status === "cho_thanh_toan") {
      const cancelButton = document.createElement("button");
      cancelButton.classList.add("btn-cancel-order");
      cancelButton.innerHTML = '<i class="fas fa-times"></i> Hủy';
      cancelButton.addEventListener("click", () => {
        handleCancelOrder_DH(
          order.id || order.order_code,
          order.order_code,
          ordersTbodyElem,
          document.getElementById("loading-my-orders"),
          document.getElementById("no-my-orders-message")
        );
      });
      actionCell.appendChild(cancelButton);
    }
  });
}

async function handleCancelOrder_DH(
  orderIdentifier,
  orderCode,
  ordersTbodyElem,
  loadingIndicatorElem,
  noOrdersMessageElem
) {
  Swal.fire({
    title: "Xác nhận hủy đơn hàng",
    html: `Bạn có chắc muốn hủy đơn hàng <strong>${orderCode}</strong> không?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
    confirmButtonText: "Đồng ý hủy",
    cancelButtonText: "Không, giữ lại",
  }).then(async (result) => {
    if (result.isConfirmed) {
      const userAuthToken = localStorage.getItem("user_auth_token");
      if (!userAuthToken) {
        Swal.fire(
          "Lỗi",
          "Vui lòng đăng nhập lại để thực hiện thao tác này.",
          "error"
        );
        return;
      }
      try {
        const response = await fetch(
          `${API_BASE_URL_DH}/orders/${orderIdentifier}/cancel`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${userAuthToken}`,
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            message: "Hủy đơn hàng thất bại. Vui lòng thử lại.",
          }));
          throw new Error(errorData.message);
        }
        const responseData = await response.json();
        Swal.fire(
          "Đã hủy!",
          responseData.message || "Đơn hàng của bạn đã được hủy.",
          "success"
        );
        fetchUserOrders_DH(
          ordersTbodyElem,
          loadingIndicatorElem,
          noOrdersMessageElem
        );
      } catch (error) {
        console.error("DH_JS: Lỗi khi hủy đơn hàng:", error);
        Swal.fire(
          "Thất bại!",
          `Không thể hủy đơn hàng: ${error.message}`,
          "error"
        );
      }
    }
  });
}

function updateTabUnderline_DH(activeTab, tabUnderlineElement) {
  if (activeTab && tabUnderlineElement) {
    tabUnderlineElement.style.left = activeTab.offsetLeft + "px";
    tabUnderlineElement.style.width = activeTab.offsetWidth + "px";
  }
}

function filterUserOrders_DH(
  selectedStatus,
  ordersTbodyElem,
  noOrdersMessageElem
) {
  let filteredOrders = allUserOrders_DH;
  if (selectedStatus && selectedStatus !== "all") {
    filteredOrders = filteredOrders.filter(
      (order) => order.status === selectedStatus
    );
  }
  renderUserOrders_DH(filteredOrders, ordersTbodyElem, noOrdersMessageElem);
}

// Hàm khởi tạo chính, sẽ được gọi bởi scriptttk.js
function initMyOrdersPage_DH() {
  console.log("DH_JS: initMyOrdersPage_DH CALLED");
  const myOrdersSectionContext = document.getElementById("don-hang-cua-toi");
  if (!myOrdersSectionContext) {
    console.error(
      "DH_JS: My Orders section context (#don-hang-cua-toi) not found in initMyOrdersPage_DH!"
    );
    return;
  }

  const ordersTbodyElem =
    myOrdersSectionContext.querySelector("#my-orders-tbody");
  const loadingIndicatorElem =
    myOrdersSectionContext.querySelector("#loading-my-orders");
  const noOrdersMessageElem = myOrdersSectionContext.querySelector(
    "#no-my-orders-message"
  );
  const localOrderStatusTabs =
    myOrdersSectionContext.querySelector("#order-status-tabs");
  const localTabUnderline =
    myOrdersSectionContext.querySelector(".tab-underline");

  if (
    !ordersTbodyElem ||
    !loadingIndicatorElem ||
    !noOrdersMessageElem ||
    !localOrderStatusTabs ||
    !localTabUnderline
  ) {
    console.error(
      "DH_JS: One or more critical elements for My Orders page are missing within #don-hang-cua-toi.",
      {
        ordersTbodyElem,
        loadingIndicatorElem,
        noOrdersMessageElem,
        localOrderStatusTabs,
        localTabUnderline,
      }
    );
    return;
  }
  console.log(
    "DH_JS: All critical elements for My Orders found in tttk context."
  );

  // Gỡ bỏ event listener cũ (nếu có) và gắn lại để tránh duplicate
  const newLocalOrderStatusTabs = localOrderStatusTabs.cloneNode(true);
  localOrderStatusTabs.parentNode.replaceChild(
    newLocalOrderStatusTabs,
    localOrderStatusTabs
  );

  newLocalOrderStatusTabs.addEventListener("click", (event) => {
    const clickedTab = event.target.closest(".order-tab");
    if (clickedTab && newLocalOrderStatusTabs.contains(clickedTab)) {
      newLocalOrderStatusTabs.querySelectorAll(".order-tab").forEach((tab) => {
        tab.classList.remove("active");
      });
      clickedTab.classList.add("active");
      if (localTabUnderline) {
        updateTabUnderline_DH(clickedTab, localTabUnderline);
      }
      const selectedStatus = clickedTab.dataset.status;
      filterUserOrders_DH(selectedStatus, ordersTbodyElem, noOrdersMessageElem);
    }
  });

  fetchUserOrders_DH(
    ordersTbodyElem,
    loadingIndicatorElem,
    noOrdersMessageElem
  ).then(() => {
    const initialActiveTab =
      newLocalOrderStatusTabs.querySelector(".order-tab.active");
    if (initialActiveTab && localTabUnderline) {
      updateTabUnderline_DH(initialActiveTab, localTabUnderline);
    }
  });
}

// Logic này chỉ chạy khi dh.html được mở trực tiếp
if (
  window.location.pathname.endsWith("dh.html") ||
  window.location.pathname.endsWith("dh")
) {
  document.addEventListener("DOMContentLoaded", () => {
    console.log(
      "DH_JS: Running in standalone mode (DOMContentLoaded for dh.html)."
    );
    const myOrdersSectionContext = document.querySelector(".my-orders-page"); // Hoặc một selector cụ thể hơn nếu cần
    if (!myOrdersSectionContext) {
      console.error("DH_JS: Main context for standalone dh.html not found.");
      return;
    }
    const ordersTbody =
      myOrdersSectionContext.querySelector("#my-orders-tbody");
    const loadingIndicator =
      myOrdersSectionContext.querySelector("#loading-my-orders");
    const noOrdersMessage = myOrdersSectionContext.querySelector(
      "#no-my-orders-message"
    );
    const orderStatusTabs =
      myOrdersSectionContext.querySelector("#order-status-tabs");
    const tabUnderline = myOrdersSectionContext.querySelector(".tab-underline");

    if (
      !ordersTbody ||
      !loadingIndicator ||
      !noOrdersMessage ||
      !orderStatusTabs ||
      !tabUnderline
    ) {
      console.error(
        "DH_JS: Standalone - One or more critical elements for My Orders page are missing.",
        {
          ordersTbody,
          loadingIndicator,
          noOrdersMessage,
          orderStatusTabs,
          tabUnderline,
        }
      );
      return;
    }

    if (orderStatusTabs) {
      orderStatusTabs.addEventListener("click", (event) => {
        const clickedTab = event.target.closest(".order-tab");
        if (clickedTab && orderStatusTabs.contains(clickedTab)) {
          orderStatusTabs.querySelectorAll(".order-tab").forEach((tab) => {
            tab.classList.remove("active");
          });
          clickedTab.classList.add("active");
          if (tabUnderline) {
            updateTabUnderline_DH(clickedTab, tabUnderline);
          }
          const selectedStatus = clickedTab.dataset.status;
          filterUserOrders_DH(selectedStatus, ordersTbody, noOrdersMessage);
        }
      });
    }

    fetchUserOrders_DH(ordersTbody, loadingIndicator, noOrdersMessage).then(
      () => {
        const initialActiveTab =
          orderStatusTabs.querySelector(".order-tab.active");
        if (initialActiveTab && tabUnderline) {
          updateTabUnderline_DH(initialActiveTab, tabUnderline);
        }
      }
    );
  });
}

// Luôn gán vào window để scriptttk.js có thể gọi
window.initializeMyOrdersSection = initMyOrdersPage_DH;
window.fetchUserOrdersGlobal_DH = () => {
  // Đổi tên
  console.log("DH_JS: fetchUserOrdersGlobal_DH CALLED");
  const myOrdersSectionContext = document.getElementById("don-hang-cua-toi");
  if (myOrdersSectionContext) {
    const ordersTbodyElem =
      myOrdersSectionContext.querySelector("#my-orders-tbody");
    const loadingIndicatorElem =
      myOrdersSectionContext.querySelector("#loading-my-orders");
    const noOrdersMessageElem = myOrdersSectionContext.querySelector(
      "#no-my-orders-message"
    );
    if (ordersTbodyElem && loadingIndicatorElem && noOrdersMessageElem) {
      fetchUserOrders_DH(
        ordersTbodyElem,
        loadingIndicatorElem,
        noOrdersMessageElem
      );
    } else {
      console.error(
        "DH_JS: Cannot refresh orders via global: one or more DOM elements are missing."
      );
    }
  } else {
    console.error(
      "DH_JS: Cannot refresh orders via global: #don-hang-cua-toi section not found."
    );
  }
};
