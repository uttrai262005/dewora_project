window.API_BASE_URL = "http://127.0.0.1:8000/api";

// --- BẮT ĐẦU CÁC HÀM TIỆN ÍCH CHUNG (COMMON UTILITY FUNCTIONS) ---
function getGuestToken() {
  let guestToken = localStorage.getItem("guest_cart_token");
  if (!guestToken) {
    guestToken =
      "guest_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("guest_cart_token", guestToken);
  }
  return guestToken;
}

function getAuthToken() {
  return localStorage.getItem("user_auth_token"); // Or whatever key you use to store the auth token
}

async function fetchApi(endpoint, method = "GET", body = null) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  const guestToken = getGuestToken();
  if (guestToken) {
    headers["X-Guest-Token"] = guestToken;
  }
  const authToken = getAuthToken();
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`; // This is the key change
  }
  const options = {
    method: method,
    headers: headers,
  };

  if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

    if (response.ok) {
      if (response.status === 204) {
        // No Content for DELETE
        return {};
      }
      return await response.json();
    } else {
      const errorData = await response.json();
      console.error(
        `Lỗi API tại ${endpoint}:`,
        response.status,
        errorData.detail || errorData.message || JSON.stringify(errorData)
      );
      throw new Error(
        errorData.detail || errorData.message || "Lỗi phản hồi API."
      );
    }
  } catch (error) {
    console.error("Lỗi khi fetch API:", error);
    throw error;
  }
}

// Hàm định dạng giá tiền
function formatPrice(price) {
  console.log("formatPrice input:", price, typeof price); // Debugging: Check input to formatPrice
  // Ensure price is a number
  if (typeof price === "string") {
    price = parseFloat(price);
  }
  if (isNaN(price)) {
    console.warn("Invalid price passed to formatPrice:", price);
    return "0"; // Return "0" for invalid numbers
  }
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// --- KẾT THÚC CÁC HÀM TIỆN ÍCH CHUNG (COMMON UTILITY FUNCTIONS) ---

// DeworaCart object (Centralized Cart Logic)
window.DeworaCart = {
  currentCart: { items: [], total: 0, subtotal: 0, total_items: 0 }, // Initialize with defaults
  isMainCartPageInitialized: false, // Flag to prevent multiple initializations on cart.html

  async fetchCartItems() {
    try {
      const cartData = await fetchApi("/cart");
      console.log("API Response - Raw Cart Data:", cartData); // Debugging: Log raw API response

      if (cartData) {
        const cart = {
          items: Array.isArray(cartData.items) ? cartData.items : [],
          total: cartData.total || 0, // Ensure total defaults to 0 if not present
          subtotal: cartData.subtotal || 0, // Ensure subtotal defaults to 0 if not present
          shipping_cost: cartData.shipping_cost || 0,
          total_items: cartData.total_items || 0,
        };
        this.currentCart = cart; // Update the shared cart object

        console.log("Processed DeworaCart object:", this.currentCart); // Debugging: Log processed object

        // Render both main page cart and sidebar cart
        this.renderCartPage(cart);
        this.renderCartSidebar(cart);
      } else {
        console.warn("No cart data received from API. Rendering empty cart.");
        this.renderEmptyCart(); // Render empty state for both
      }
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu giỏ hàng:", error);
      this.renderEmptyCart(); // Render empty state on error
    }
  },

  renderCartPage(cart) {
    // Only render the main cart page if the current page is cart.html
    if (!document.body.classList.contains("cart-page")) {
      return;
    }

    console.log("Rendering Main Cart Page with cart:", cart);
    const cartItemsContainer = document.getElementById("cart-items-container");
    const emptyCartMessage = document.querySelector(".empty-cart-message");
    const cartSummaryContainer = document.getElementById(
      "cart-summary-container"
    );
    const cartSubtotal = document.getElementById("cart-subtotal");
    // const cartTotal = document.getElementById("cart-total"); // XÓA HOẶC COMMENT DÒNG NÀY
    const checkoutButton = document.getElementById("checkout-button");

    if (
      !cartItemsContainer ||
      !emptyCartMessage ||
      !cartSummaryContainer ||
      !cartSubtotal ||
      // !cartTotal || // XÓA HOẶC COMMENT ĐIỀU KIỆN NÀY
      !checkoutButton
    ) {
      console.warn(
        "Missing one or more main cart page elements. Skipping rendering."
      );
      return;
    }

    if (cart.items.length === 0) {
      cartItemsContainer.innerHTML = "";
      emptyCartMessage.style.display = "block";
      cartSummaryContainer.style.display = "none";
      checkoutButton.style.display = "none";
    } else {
      emptyCartMessage.style.display = "none";
      cartSummaryContainer.style.display = "block";
      checkoutButton.style.display = "block";
      cartItemsContainer.innerHTML = ""; // Clear existing items
      cart.items.forEach((item) => {
        const cartItem = document.createElement("div");
        cartItem.classList.add("cart-item");
        cartItem.innerHTML = `
          <img src="${item.product_image}" alt="${
          item.product_name
        }" class="cart-item-image">
          <div class="cart-item-details">
            <div class="cart-item-name">${item.product_name}</div>
            <div class="cart-item-price">${formatPrice(item.price)} VNĐ</div>
            <div class="cart-item-quantity">Số lượng: ${item.quantity}</div>
          </div>
          <button class="cart-item-remove" data-item-id="${
            item.id
          }">Xóa</button>
        `;
        cartItemsContainer.appendChild(cartItem);
      });
      cartSubtotal.textContent = `${formatPrice(cart.subtotal)} VNĐ`;
      // cartTotal.textContent = `${formatPrice(cart.subtotal)} VNĐ`; // XÓA HOẶC COMMENT DÒNG NÀY
    }

    // Add event listeners for remove buttons (Main Cart Page)
    document.querySelectorAll(".cart-item-remove").forEach((button) => {
      button.addEventListener("click", async function () {
        const itemId = this.getAttribute("data-item-id");
        if (!itemId) {
          console.error("Item ID not found for removal.");
          return;
        }
        try {
          await fetchApi(`/cart/remove/${itemId}`, "DELETE");
          Swal.fire({
            icon: "success",
            title: "Đã xóa sản phẩm",
            showConfirmButton: false,
            timer: 1000,
          });
          window.DeworaCart.fetchCartItems(); // Re-fetch cart data
        } catch (error) {
          console.error("Lỗi khi xóa sản phẩm:", error);
          Swal.fire("Lỗi", "Không thể xóa sản phẩm.", "error");
        }
      });
    });
  },

  renderCartSidebar(cart) {
    console.log("Rendering Cart Sidebar with cart:", cart); // Debugging: Log cart for sidebar
    const cartCount = document.getElementById("cart-count");
    const cartItemsContainer = document.getElementById("cart-items"); // This refers to sidebar items
    const cartEmptyMessage = document.querySelector(
      "#cart-sidebar .cart-empty"
    );
    const cartTotalDiv = document.querySelector("#cart-sidebar .cart-total"); // Select by class for more specificity
    const cartTotalAmount = document.getElementById("cart-total-amount"); // This refers to sidebar total amount span
    const cartCheckoutBtn = document.getElementById("cart-checkout"); // This refers to sidebar checkout button

    if (
      !cartCount ||
      !cartItemsContainer ||
      !cartEmptyMessage ||
      !cartTotalDiv ||
      !cartTotalAmount ||
      !cartCheckoutBtn
    ) {
      console.warn(
        "Missing one or more sidebar cart elements. Skipping rendering."
      );
      return;
    }

    cartCount.textContent = cart.total_items;

    if (cart.items.length === 0) {
      cartItemsContainer.innerHTML = ""; // Clear items
      cartEmptyMessage.style.display = "block";
      cartTotalDiv.style.display = "none";
      cartCheckoutBtn.style.display = "none";
    } else {
      cartEmptyMessage.style.display = "none";
      cartTotalDiv.style.display = "block";
      cartCheckoutBtn.style.display = "block";
      cartItemsContainer.innerHTML = ""; // Clear existing items

      cart.items.forEach((item) => {
        const cartItem = document.createElement("div");
        cartItem.classList.add("cart-item");
        cartItem.innerHTML = `
                    <img src="${item.product_image}" alt="${
          item.product_name
        }" class="cart-item-image">
                    <div class="cart-item-details">
                        <div class="cart-item-name">${item.product_name}</div>
                        <div class="cart-item-price">${formatPrice(
                          item.price
                        )} VNĐ</div>
                        <div class="cart-item-quantity">Số lượng: ${
                          item.quantity
                        }</div>
                    </div>
                    <button class="cart-item-remove" data-item-id="${
                      item.id
                    }">Xóa</button>
                `;
        cartItemsContainer.appendChild(cartItem);
      });

      cartTotalAmount.textContent = `${formatPrice(cart.subtotal)} VNĐ`;
    }

    // Add event listeners for remove buttons (Sidebar Cart)
    document
      .querySelectorAll("#cart-sidebar .cart-item-remove")
      .forEach((button) => {
        button.addEventListener("click", async function () {
          const itemId = this.getAttribute("data-item-id");
          if (!itemId) {
            console.error("Item ID not found for removal in sidebar.");
            return;
          }
          try {
            await fetchApi(`/cart/remove/${itemId}`, "DELETE");
            Swal.fire({
              icon: "success",
              title: "Đã xóa sản phẩm",
              showConfirmButton: false,
              timer: 1000,
            });
            window.DeworaCart.fetchCartItems(); // Re-fetch cart data
          } catch (error) {
            console.error("Lỗi khi xóa sản phẩm từ sidebar:", error);
            Swal.fire("Lỗi", "Không thể xóa sản phẩm.", "error");
          }
        });
      });
  },

  renderEmptyCart() {
    // For main cart page
    const cartItemsContainerPage = document.getElementById(
      "cart-items-container"
    );
    const emptyCartMessagePage = document.querySelector(".empty-cart-message");
    const cartSummaryContainerPage = document.getElementById(
      "cart-summary-container"
    );
    const checkoutButtonPage = document.getElementById("checkout-button");

    if (cartItemsContainerPage) cartItemsContainerPage.innerHTML = "";
    if (emptyCartMessagePage) emptyCartMessagePage.style.display = "block";
    if (cartSummaryContainerPage)
      cartSummaryContainerPage.style.display = "none";
    if (checkoutButtonPage) checkoutButtonPage.style.display = "none";

    // For sidebar cart
    const cartCount = document.getElementById("cart-count");
    const cartItemsContainerSidebar = document.getElementById("cart-items");
    const cartEmptyMessageSidebar = document.querySelector(
      "#cart-sidebar .cart-empty"
    );
    const cartTotalDivSidebar = document.querySelector(
      "#cart-sidebar .cart-total"
    );
    const cartTotalAmountSidebar = document.getElementById("cart-total-amount");
    const cartCheckoutBtnSidebar = document.getElementById("cart-checkout");

    if (cartCount) cartCount.textContent = "0";
    if (cartItemsContainerSidebar) cartItemsContainerSidebar.innerHTML = "";
    if (cartEmptyMessageSidebar)
      cartEmptyMessageSidebar.style.display = "block";
    if (cartTotalDivSidebar) cartTotalDivSidebar.style.display = "none";
    if (cartTotalAmountSidebar) cartTotalAmountSidebar.textContent = "0 VNĐ";
    if (cartCheckoutBtnSidebar) cartCheckoutBtnSidebar.style.display = "none";
  },

  async addProductToCart(productId, quantity = 1) {
    try {
      const response = await fetchApi("/cart/add/", "POST", {
        product_id: productId,
        quantity: quantity,
      });
      console.log("Add product to cart response:", response);
      Swal.fire({
        icon: "success",
        title: "Đã thêm vào giỏ hàng!",
        showConfirmButton: false,
        timer: 1500,
      });
      this.fetchCartItems(); // Re-fetch and render cart after adding
    } catch (error) {
      console.error("Lỗi khi thêm sản phẩm vào giỏ hàng:", error);
      Swal.fire("Lỗi", "Không thể thêm sản phẩm vào giỏ hàng.", "error");
    }
  },

  async updateProductQuantity(productId, quantity) {
    try {
      const response = await fetchApi(`/cart/update/${productId}/`, "PUT", {
        quantity: quantity,
      });
      console.log("Update product quantity response:", response);
      this.fetchCartItems(); // Re-fetch and render cart after updating
    } catch (error) {
      console.error("Lỗi khi cập nhật số lượng sản phẩm:", error);
      Swal.fire("Lỗi", "Không thể cập nhật số lượng sản phẩm.", "error");
    }
  },

  async removeProductFromCart(productId) {
    try {
      await fetchApi(`/cart/remove/${productId}`, "DELETE");
      Swal.fire({
        icon: "success",
        title: "Đã xóa sản phẩm",
        showConfirmButton: false,
        timer: 1000,
      });
      this.fetchCartItems(); // Re-fetch cart data
    } catch (error) {
      console.error("Lỗi khi xóa sản phẩm:", error);
      Swal.fire("Lỗi", "Không thể xóa sản phẩm.", "error");
    }
  },

  initMainCartPage() {
    if (this.isMainCartPageInitialized) {
      return; // Already initialized
    }

    // Event listener for checkout button on main cart page
    const checkoutButton = document.getElementById("checkout-button");
    if (checkoutButton) {
      checkoutButton.addEventListener("click", async () => {
        try {
          const cartData = await fetchApi("/cart");
          if (cartData && cartData.items && cartData.items.length > 0) {
            localStorage.setItem(
              "dewora-checkout-cart",
              JSON.stringify(cartData)
            );
            Swal.fire({
              title: "Đang chuyển hướng...",
              text: "Bạn sẽ được chuyển đến trang thanh toán.",
              icon: "info",
              timer: 1500,
              showConfirmButton: false,
              timerProgressBar: true,
            }).then(() => {
              window.location.href = "thanhtoan.html";
            });
          } else {
            Swal.fire(
              "Giỏ hàng trống",
              "Vui lòng thêm sản phẩm vào giỏ hàng để tiếp tục thanh toán.",
              "warning"
            );
          }
        } catch (error) {
          console.error("Lỗi khi chuyển đến trang thanh toán:", error);
          Swal.fire(
            "Lỗi",
            "Không thể lấy dữ liệu giỏ hàng để thanh toán. Vui lòng thử lại.",
            "error"
          );
        }
      });
    }

    this.fetchCartItems(); // Fetch items when main cart page initializes
    this.isMainCartPageInitialized = true;
  },
};

// Listen for DOMContentLoaded for the main cart page
document.addEventListener("DOMContentLoaded", () => {
  if (document.body.classList.contains("cart-page")) {
    // Add 'cart-page' class to your cart.html <body> tag
    window.DeworaCart.initMainCartPage();
  }
});
