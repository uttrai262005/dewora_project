// header.js
document.addEventListener("DOMContentLoaded", function () {
  // Xử lý đóng thông báo shipping
  const closeNoticeButton = document.querySelector(
    ".shipping-notice .close-btn"
  );
  if (closeNoticeButton) {
    closeNoticeButton.addEventListener("click", function () {
      if (this.parentElement) {
        this.parentElement.style.display = "none";
      }
    });
  }
});
const mainBannerContainer = document.querySelector(".main-banner");
if (mainBannerContainer) {
  let swiperWrapper = mainBannerContainer.querySelector(".swiper-wrapper");
  if (!swiperWrapper) {
    swiperWrapper = document.createElement("div");
    swiperWrapper.classList.add("swiper-wrapper");
    const slides = Array.from(mainBannerContainer.querySelectorAll(".slide"));
    slides.forEach((slide) => {
      slide.classList.add("swiper-slide");
      swiperWrapper.appendChild(slide);
    });
    mainBannerContainer.appendChild(swiperWrapper);
  } else {
    const slidesInWrapper = Array.from(
      swiperWrapper.querySelectorAll(".slide")
    );
    slidesInWrapper.forEach((slide) => slide.classList.add("swiper-slide"));
  }

  new Swiper(mainBannerContainer, {
    loop: true,
    slidesPerView: 1,
    autoplay: {
      delay: 3000,
      disableOnInteraction: false,
      pauseOnMouseEnter: true,
    },
    pagination: {
      el: ".banner-indicators",
      clickable: true,
      bulletClass: "indicator",
      bulletActiveClass: "active",
    },
    navigation: {
      nextEl: ".swiper-button-next",
      prevEl: ".swiper-button-prev",
    },
  });
}
const searchInput = document.querySelector(".search-box");
// Chọn phần tử icon tìm kiếm
const searchIcon = document.querySelector(".search-icon");

// Hàm thực hiện logic tìm kiếm: lấy giá trị từ input và chuyển hướng
function performSearch() {
  // Kiểm tra xem input có tồn tại không trước khi thao tác
  if (!searchInput) {
    console.error("Lỗi: Không tìm thấy phần tử input tìm kiếm (.search-box)!");
    return; // Dừng hàm nếu không tìm thấy input
  }

  const searchQuery = searchInput.value.trim(); // Lấy giá trị và xóa khoảng trắng ở đầu/cuối

  if (searchQuery) {
    const searchURL = "da.html?search_name=" + encodeURIComponent(searchQuery);

    // Chuyển hướng người dùng đến trang kết quả tìm kiếm
    window.location.href = searchURL;
  } else {
    // If empty, consider showing a message (optional)
    console.log("Ô tìm kiếm đang trống. Vui lòng nhập gì đó để tìm kiếm.");
  }
}

// Thêm bộ lắng nghe sự kiện cho ô tìm kiếm (khi nhấn phím)
if (searchInput) {
  searchInput.addEventListener("keypress", function (event) {
    // Kiểm tra xem phím được nhấn có phải là Enter (mã 13 hoặc event.key 'Enter')
    if (event.key === "Enter" || event.keyCode === 13) {
      event.preventDefault(); // Ngăn hành vi mặc định (ví dụ: gửi form)
      performSearch(); // Gọi hàm thực hiện tìm kiếm
    }
  });
}

// Thêm bộ lắng nghe sự kiện cho icon tìm kiếm (khi click)
if (searchIcon) {
  searchIcon.addEventListener("click", function () {
    performSearch(); // Gọi hàm thực hiện tìm kiếm
  });
  const searchBox = document.getElementById("search-box");
  const suggestionsContainer = document.getElementById("search-suggestions");
  let debounceTimer;

  // Search Suggestions Logic
  if (searchBox && suggestionsContainer) {
    searchBox.addEventListener("input", function () {
      clearTimeout(debounceTimer);
      const query = this.value.trim();

      if (query.length < 1) {
        suggestionsContainer.innerHTML = "";
        suggestionsContainer.style.display = "none";
        return;
      }

      debounceTimer = setTimeout(() => {
        fetchSuggestions(query);
      }, 300); // Chờ 300ms sau khi người dùng ngừng gõ rồi mới gửi request
    });

    // Ẩn gợi ý khi click ra ngoài
    document.addEventListener("click", function (event) {
      if (
        searchBox &&
        suggestionsContainer &&
        !searchBox.contains(event.target) &&
        !suggestionsContainer.contains(event.target)
      ) {
        suggestionsContainer.style.display = "none";
      }
    });
    // Hiển thị lại gợi ý khi focus vào search box và có nội dung
    searchBox.addEventListener("focus", function () {
      if (
        this.value.trim().length > 0 &&
        suggestionsContainer.children.length > 0
      ) {
        suggestionsContainer.style.display = "block";
      }
    });
  }

  async function fetchSuggestions(query) {
    const apiUrl = `http://127.0.0.1:8000/api/products/search-suggestions?query=${encodeURIComponent(
      query
    )}`;

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        console.error("Lỗi khi tải gợi ý:", response.statusText);
        suggestionsContainer.innerHTML =
          '<p style="padding:10px; text-align:center; color:#777;">Không thể tải gợi ý.</p>';
        suggestionsContainer.style.display = "block"; // Hiển thị thông báo lỗi
        return;
      }
      const suggestions = await response.json();
      displaySuggestions(suggestions, query);
    } catch (error) {
      console.error("Lỗi khi tải gợi ý:", error);
      suggestionsContainer.innerHTML =
        '<p style="padding:10px; text-align:center; color:#777;">Lỗi kết nối đến máy chủ.</p>';
      suggestionsContainer.style.display = "block"; // Hiển thị thông báo lỗi
    }
  }

  function displaySuggestions(suggestions, query) {
    suggestionsContainer.innerHTML = ""; // Xóa gợi ý cũ

    if (suggestions.length === 0) {
      suggestionsContainer.innerHTML = `<p style="padding:10px; text-align:center; color:#777;">Không tìm thấy sản phẩm nào cho "${escapeHtml(
        query
      )}".</p>`;
      suggestionsContainer.style.display = "block";
      return;
    }

    const ul = document.createElement("ul");
    suggestions.forEach((product) => {
      const li = document.createElement("li");
      const productLink =
        product.product_page_url || `ctsp.html?id=${product.id}`;
      li.innerHTML = `
                <a href="${productLink}">
                    <img src="${
                      product.image_url ||
                      "public/images/default-placeholder.png"
                    }" alt="${escapeHtml(
        product.name
      )}" class="suggestion-image" onerror="this.src='public/images/default-placeholder.png'; this.onerror=null;">
                    <span class="suggestion-name">${highlightMatch(
                      escapeHtml(product.name),
                      query
                    )}</span>
                </a>
            `;
      ul.appendChild(li);
    });

    suggestionsContainer.appendChild(ul);
    suggestionsContainer.style.display = "block";
  }

  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function highlightMatch(text, query) {
    const escapedQuery = escapeHtml(query);
    const regex = new RegExp(
      `(${escapedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi"
    );
    return text.replace(regex, "<strong>$1</strong>");
  }
}
// Xử lý dropdown tài khoản
const accountSelector = document.querySelector(".account-selector");
const accountCurrentButton = document.querySelector(".account-current");
const accountOptions = document.querySelectorAll(".account-option");

if (accountSelector && accountCurrentButton && accountOptions.length > 0) {
  accountCurrentButton.addEventListener("click", function () {
    accountSelector.classList.toggle("active");
  });

  document.addEventListener("click", function (event) {
    if (!accountSelector.contains(event.target)) {
      accountSelector.classList.remove("active");
    }
  });

  accountOptions.forEach((option) => {
    option.addEventListener("click", function () {
      const action = this.getAttribute("data-action");
      switch (action) {
        case "account":
          window.location.href = "tttk.html";
          break;
        case "orders":
          window.location.href = "dh.html";
          break;
        case "address":
          window.location.href = "dc.html";
          break;
        case "favorites":
          window.location.href = "yt.html";
          break;
        case "logout":
          console.log("Đăng xuất...");
          window.location.href = "login.html";
          break;
      }
      accountSelector.classList.remove("active");
    });
  });
}

// Xử lý giỏ hàng sidebar
window.initHeaderCart = function () {
  // Xử lý giỏ hàng sidebar - MOVE THIS ENTIRE BLOCK HERE
  const cartSelector = document.querySelector(".cart-selector");
  const cartCurrentButton = document.querySelector(".cart-current");
  const cartSidebar = document.querySelector("#cart-sidebar");
  const cartSidebarClose = document.querySelector(".cart-sidebar-close");
  const cartCheckout = document.querySelector("#cart-checkout");

  // Only attach listeners if necessary elements exist
  if (
    cartSelector &&
    cartCurrentButton &&
    cartSidebar &&
    cartSidebarClose &&
    cartCheckout // Only checking elements that are actually used in header.js's direct logic
  ) {
    cartCurrentButton.addEventListener("click", function () {
      cartSelector.classList.toggle("active");
      // Call the centralized fetch function from DeworaCart
      if (window.DeworaCart) {
        // At this point, DeworaCart is guaranteed to be defined
        window.DeworaCart.fetchCartItems();
      } else {
        // This else block should ideally not be reached after this fix
        console.error(
          "DeworaCart is not defined after initHeaderCart! (Unexpected)"
        );
      }
    });

    cartSidebarClose.addEventListener("click", function () {
      cartSelector.classList.remove("active");
    });

    document.addEventListener("click", function (event) {
      if (
        !cartSelector.contains(event.target) &&
        !cartSidebar.contains(event.target)
      ) {
        cartSelector.classList.remove("active");
      }
    });

    cartCheckout.addEventListener("click", function () {
      // Redirect to cart.html, DeworaCart.initMainCartPage will handle fetching and displaying
      window.location.href = "cart.html";
      cartSelector.classList.remove("active");
    });
  }

  // Initial fetch for the header cart when initHeaderCart is called
  if (window.DeworaCart && !document.body.classList.contains("cart-page")) {
    // Ensure DeworaCart has its elements correctly identified for the sidebar
    window.DeworaCart.fetchCartItems();
    console.log("Header cart initial fetch triggered from initHeaderCart.");
  } else {
    // console.log("DeworaCart not ready or on cart page, skipping header init.");
  }
};
