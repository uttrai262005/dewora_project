document.addEventListener("DOMContentLoaded", () => {
  // --- KHAI BÁO BIẾN VÀ HẰNG SỐ ---
  const API_PROVINCES_URL = "https://provinces.open-api.vn/api/";
  const API_BASE_URL = "http://127.0.0.1:8000/api";

  let currentShippingFee = 0; // Biến để lưu phí vận chuyển hiện tại

  const elements = {
    orderItemsContainer: document.getElementById("checkout-order-items"),
    subtotal: document.getElementById("checkout-subtotal"),
    discount: document.getElementById("checkout-discount"),
    shippingFee: document.getElementById("checkout-shipping-fee"),
    grandTotal: document.getElementById("checkout-grand-total"),
    placeOrderBtn: document.getElementById("place-order-button"),
    buyerName: document.getElementById("buyer-name"),
    buyerPhone: document.getElementById("buyer-phone"),
    buyerEmail: document.getElementById("buyer-email"),
    sameAsBuyerCheckbox: document.getElementById("same-as-buyer"),
    shippingName: document.getElementById("shipping-name"),
    shippingPhone: document.getElementById("shipping-phone"),
    shippingStreet: document.getElementById("shipping-address-street"),
    shippingProvince: document.getElementById("shipping-province"),
    shippingDistrict: document.getElementById("shipping-district"),
    shippingWard: document.getElementById("shipping-ward"),
    shippingNotes: document.getElementById("shipping-notes"),
    paymentRadios: document.querySelectorAll('input[name="payment-method"]'),
    bankDetails: document.getElementById("bank-details"),
    vnpayDetails: document.getElementById("vnpay-details"),
  };

  // --- HÀM TIỆN ÍCH ---
  const formatPrice = (price) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);

  const getGuestToken = () => localStorage.getItem("guest_cart_token");

  // --- RENDER DỮ LIỆU ---
  function renderOrderSummary(cart) {
    if (!cart || !cart.items || cart.items.length === 0) {
      elements.orderItemsContainer.innerHTML =
        "<p>Không có sản phẩm nào để thanh toán.</p>";
      return;
    }

    elements.orderItemsContainer.innerHTML = cart.items
      .map(
        (item) => `
            <div class="checkout-item">
                <img src="${item.product_image}" alt="${
          item.product_name
        }" class="checkout-item-image">
                <div class="checkout-item-info">
                    <p class="item-name">${item.product_name}</p>
                    ${
                      item.color_name && item.color_name !== "N/A"
                        ? `<p class="item-color">Màu: ${item.color_name}</p>`
                        : ""
                    }
                    <p class="item-quantity">Số lượng: ${item.quantity}</p>
                </div>
                <span class="checkout-item-price">${formatPrice(
                  item.price * item.quantity
                )}</span>
            </div>
        `
      )
      .join("");

    // Cập nhật tổng tiền
    const subtotal = cart.subtotal;
    const discount = 0; // Cập nhật logic tính discount nếu có
    const grandTotal = subtotal - discount + currentShippingFee; // Sử dụng currentShippingFee

    elements.subtotal.textContent = formatPrice(subtotal);
    elements.discount.textContent = formatPrice(discount);
    elements.shippingFee.textContent = formatPrice(currentShippingFee); // Cập nhật hiển thị phí vận chuyển
    elements.grandTotal.textContent = formatPrice(grandTotal);
  }

  // --- LOGIC TÍNH TOÁN PHÍ VẬN CHUYỂN ---
  async function calculateAndDisplayShipping() {
    // Hàm mới
    const street = elements.shippingStreet.value.trim();
    const provinceName =
      elements.shippingProvince.options[elements.shippingProvince.selectedIndex]
        ?.dataset.name || "";
    const districtName =
      elements.shippingDistrict.options[elements.shippingDistrict.selectedIndex]
        ?.dataset.name || "";
    const wardName =
      elements.shippingWard.options[elements.shippingWard.selectedIndex]
        ?.dataset.name || "";

    // Chỉ tính toán nếu các phần địa chỉ cần thiết đã được chọn/nhập
    if (!street || !provinceName || !districtName || !wardName) {
      currentShippingFee = 0;
      renderOrderSummary(
        JSON.parse(localStorage.getItem("dewora-checkout-cart"))
      );
      return;
    }

    const fullAddress = `${street}, ${wardName}, ${districtName}, ${provinceName}`;

    try {
      const response = await fetch(`${API_BASE_URL}/shipping/calculate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          address: fullAddress,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error(
          "Error calculating shipping:",
          result.error || "Unknown error"
        );
        currentShippingFee = 0; // Đặt lại hoặc xử lý lỗi
        Swal.fire(
          "Lỗi tính phí vận chuyển",
          result.error || "Không thể tính phí vận chuyển.",
          "error"
        );
      } else {
        currentShippingFee = result.shipping_cost;
      }
    } catch (error) {
      console.error("Network error calculating shipping:", error);
      currentShippingFee = 0; // Đặt lại khi lỗi mạng
      Swal.fire(
        "Lỗi kết nối",
        "Không thể kết nối để tính phí vận chuyển.",
        "error"
      );
    } finally {
      // Re-render order summary để cập nhật phí vận chuyển và tổng tiền
      renderOrderSummary(
        JSON.parse(localStorage.getItem("dewora-checkout-cart"))
      );
    }
  }

  // --- XỬ LÝ SỰ KIỆN ---
  function setupEventListeners() {
    // Checkbox "Giống thông tin người mua"
    elements.sameAsBuyerCheckbox.addEventListener("change", async (e) => {
      // Thêm async
      if (e.target.checked) {
        elements.shippingName.value = elements.buyerName.value;
        elements.shippingPhone.value = elements.buyerPhone.value;
      } else {
        elements.shippingName.value = "";
        elements.shippingPhone.value = "";
      }
      await calculateAndDisplayShipping(); // Kích hoạt tính toán sau khi cập nhật trường
    });

    // Chọn phương thức thanh toán
    elements.paymentRadios.forEach((radio) => {
      radio.addEventListener("change", (e) => {
        elements.bankDetails.style.display =
          e.target.id === "payment-bank" ? "block" : "none";
        elements.momoDetails.style.display =
          e.target.id === "payment-momo" ? "block" : "none";
      });
    });

    // Nút Đặt Hàng
    elements.placeOrderBtn.addEventListener("click", handlePlaceOrder);

    // Thêm các event listener cho việc tính phí ship
    elements.shippingStreet.addEventListener(
      "change",
      calculateAndDisplayShipping
    );
    elements.shippingProvince.addEventListener(
      "change",
      calculateAndDisplayShipping
    );
    elements.shippingDistrict.addEventListener(
      "change",
      calculateAndDisplayShipping
    );
    elements.shippingWard.addEventListener(
      "change",
      calculateAndDisplayShipping
    );
  }

  // --- LOGIC API ĐỊA CHỈ ---
  async function fetchAndPopulate(url, selectElement, defaultOptionText) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Network response was not ok.");
      const data = await response.json();
      selectElement.innerHTML = `<option value="">-- ${defaultOptionText} --</option>`;
      const items = data.results || data.districts || data.wards || data;
      items.forEach((item) => {
        const option = document.createElement("option");
        option.value = item.code || item.province_id || item.district_id;
        option.textContent =
          item.name || item.province_name || item.district_name;
        option.dataset.name =
          item.name || item.province_name || item.district_name; // Lưu tên để lấy sau
        selectElement.appendChild(option);
      });
    } catch (error) {
      console.error(`Error fetching ${defaultOptionText}:`, error);
    }
  }

  function loadProvinces() {
    fetchAndPopulate(
      API_PROVINCES_URL + "?depth=1",
      elements.shippingProvince,
      "Chọn Tỉnh/Thành phố"
    );
    elements.shippingProvince.addEventListener("change", (e) => {
      elements.shippingWard.innerHTML =
        '<option value="">-- Chọn Xã/Phường --</option>';
      if (e.target.value) {
        loadDistricts(e.target.value);
      }
    });
  }

  function loadDistricts(provinceCode) {
    fetchAndPopulate(
      `${API_PROVINCES_URL}p/${provinceCode}?depth=2`,
      elements.shippingDistrict,
      "Chọn Quận/Huyện"
    );
    elements.shippingDistrict.addEventListener("change", (e) => {
      if (e.target.value) {
        loadWards(e.target.value);
      }
    });
  }

  function loadWards(districtCode) {
    fetchAndPopulate(
      `${API_PROVINCES_URL}d/${districtCode}?depth=2`,
      elements.shippingWard,
      "Chọn Xã/Phường"
    );
  }

  // --- HÀM ĐẶT HÀNG CHÍNH ---
  async function handlePlaceOrder(e) {
    e.preventDefault();

    const getSelectedText = (select) =>
      select.options[select.selectedIndex]?.dataset.name || "";

    // 1. Validate form
    const requiredFields = [
      elements.buyerName,
      elements.buyerPhone,
      elements.buyerEmail,
      elements.shippingName,
      elements.shippingPhone,
      elements.shippingStreet,
      elements.shippingProvince,
      elements.shippingDistrict,
      elements.shippingWard,
    ];
    if (requiredFields.some((field) => !field.value.trim())) {
      Swal.fire(
        "Thiếu thông tin",
        "Vui lòng điền đầy đủ các trường có dấu *.",
        "warning"
      );
      return;
    }

    // 2. Thu thập dữ liệu
    const shippingAddress = `${elements.shippingStreet.value.trim()}, ${getSelectedText(
      elements.shippingWard
    )}, ${getSelectedText(elements.shippingDistrict)}, ${getSelectedText(
      elements.shippingProvince
    )}`;

    const payload = {
      customer_name: elements.buyerName.value.trim(),
      customer_phone: elements.buyerPhone.value.trim(),
      customer_email: elements.buyerEmail.value.trim(),
      shipping_name: elements.shippingName.value.trim(),
      shipping_phone: elements.shippingPhone.value.trim(),
      shipping_address: shippingAddress,
      notes: elements.shippingNotes.value.trim(), // Đổi tên shipping_notes -> notes
      payment_method: document.querySelector(
        'input[name="payment-method"]:checked'
      ).value,
      shipping_fee: currentShippingFee,
    };

    // 3. Xử lý theo phương thức thanh toán
    elements.placeOrderBtn.disabled = true;
    elements.placeOrderBtn.textContent = "ĐANG XỬ LÝ...";

    try {
      const headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      const guestToken = getGuestToken();
      if (guestToken) headers["X-Guest-Token"] = guestToken;
      const authToken = getAuthToken();
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`; // Thêm dòng này
      } else {
        // Xử lý trường hợp không có authToken nếu cần,
        // ví dụ: nếu bạn cho phép đặt hàng như khách qua cùng một logic
        // nhưng hiện tại server đang báo 401, nghĩa là authToken là bắt buộc.
        console.warn("Auth token not found. User might not be logged in.");
        // Bạn có thể quyết định hiển thị lỗi hoặc chuyển hướng người dùng đăng nhập ở đây
        // nếu việc đặt hàng bắt buộc phải đăng nhập.
      }

      switch (payload.payment_method) {
        case "cod":
          await handleCodCheckout(payload, headers);
          break;
        case "vcb":
        case "vnpay":
          await handleOnlinePayment(payload, headers);
          break;
        default:
          throw new Error("Phương thức thanh toán không hợp lệ");
      }
    } catch (error) {
      console.error(error); // Log lỗi ra console để debug
      Swal.fire("Đặt hàng thất bại", error.message, "error");
      elements.placeOrderBtn.disabled = false;
      elements.placeOrderBtn.textContent = "ĐẶT HÀNG";
    }
  }
  const getAuthToken = () => localStorage.getItem("user_auth_token"); // Giả sử bạn lưu token với key là 'auth_token'

  // --- CÁC HÀM XỬ LÝ CHECKOUT ---
  async function handleCodCheckout(payload, headers) {
    const response = await fetch(`${API_BASE_URL}/checkout/place-order-cod`, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.message || "Lỗi khi đặt hàng COD.");

    console.log("API Response for /checkout/place-order-cod:", result); // DEBUG

    localStorage.removeItem("dewora-checkout-cart");
    if (result.order_code) {
      localStorage.setItem("dewora_order_code", result.order_code);
      console.log("Stored dewora_order_code for COD:", result.order_code); // DEBUG
    } else {
      console.error("Order code is missing in COD response!");
    }
    // localStorage.setItem("dewora_order_code", result.order_code); // Đã gộp vào if ở trên
    window.location.href = "order-status.html";
  }

  async function handleOnlinePayment(payload, headers) {
    const response = await fetch(`${API_BASE_URL}/payment/create`, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.message || "Lỗi khi khởi tạo thanh toán.");

    console.log("API Response for /payment/create:", result); // DEBUG: Kiểm tra result

    localStorage.removeItem("dewora-checkout-cart");
    if (result.order_code) {
      // Chỉ lưu nếu order_code tồn tại và hợp lệ
      localStorage.setItem("dewora_order_code", result.order_code);
      console.log("Stored dewora_order_code:", result.order_code); // DEBUG
    } else {
      console.error("Order code is missing in payment creation response!");
      // Xử lý lỗi này nếu cần, ví dụ hiển thị thông báo cho người dùng
    }

    if (result.payment_method === "vnpay") {
      window.location.href = result.payment_url;
    } else if (result.payment_method === "vcb") {
      // Store payment details in localStorage for the new page
      // Đảm bảo các key trong object này khớp với những gì PaymentController trả về
      localStorage.setItem(
        "qr_payment_details",
        JSON.stringify({
          total_amount: result.total_amount,
          order_code: result.order_code, // Đảm bảo result.order_code có ở đây
          qr_code_image: result.qr_code_image,
          bank_account_number: result.bank_account_number || "1036614880",
          bank_name: result.bank_name || "VIETCOMBANK",
          account_holder: result.account_holder || "NGUYEN DINH TRUC",
        })
      );
      // localStorage.setItem("dewora_order_code", result.order_code); // Đã thực hiện ở trên
      window.location.href = "qr_payment.html"; // Chuyển hướng đến trang QR payment
    } else {
      // Trường hợp này không nên xảy ra nếu API và logic đúng
      console.error(
        "Phương thức thanh toán không xác định hoặc thiếu order_code."
      );
      Swal.fire(
        "Lỗi!",
        "Không thể xử lý thanh toán. Vui lòng thử lại.",
        "error"
      );
    }
  }

  // --- KHỞI CHẠY ---
  function initialize() {
    const cartString = localStorage.getItem("dewora-checkout-cart");
    if (!cartString) {
      Swal.fire({
        title: "Giỏ hàng trống!",
        text: "Không có sản phẩm nào trong giỏ hàng để thanh toán. Bạn sẽ được chuyển hướng đến trang giỏ hàng.",
        icon: "warning",
        confirmButtonText: "Đồng ý",
        allowOutsideClick: false, // Ngăn người dùng click ra ngoài để đóng
      }).then(() => {
        window.location.href = "cart.html";
      });
      window.location.href = "cart.html";
      return;
    }
    const cart = JSON.parse(cartString);
    elements.placeOrderBtn.addEventListener("click", handlePlaceOrder);

    renderOrderSummary(cart);
    setupEventListeners();
    loadProvinces();
    calculateAndDisplayShipping(); // Gọi hàm tính toán phí vận chuyển ban đầu khi tải trang
  }

  initialize();
});
