const API_BASE_URL = "http://127.0.0.1:8000/api";

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
async function fetchBackendApi(endpoint, method = "GET", body = null) {
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
  const config = {
    method: method,
    headers: headers,
  };

  if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
    config.body = JSON.stringify(body);
  }

  try {
    // SỬA LỖI TẠI ĐÂY: Đảm bảo URL được nối đúng cách
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: response.statusText }));
      console.error("API Error:", response.status, errorData);
      Swal.fire({
        title: "Lỗi API!",
        text: `Không thể thực hiện yêu cầu: ${
          errorData.message || response.statusText
        }`,
        icon: "error",
        confirmButtonColor: "#e5536b",
      });
      throw new Error(errorData.message || `Lỗi ${response.status}`);
    }
    if (
      response.status === 204 ||
      response.headers.get("content-length") === "0"
    ) {
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`Lỗi khi gọi API ${method} ${endpoint}:`, error);
    if (!Swal.isVisible()) {
      Swal.fire({
        title: "Lỗi Kết Nối!",
        text: `Đã có lỗi xảy ra khi kết nối đến máy chủ: ${error.message}`,
        icon: "error",
        confirmButtonColor: "#e5536b",
      });
    }
    throw error;
  }
}
// --- KẾT THÚC CÁC HÀM TIỆN ÍCH CHUNG ---

document.addEventListener("DOMContentLoaded", () => {
  const productDetailContent = document.getElementById(
    "product-detail-content"
  );
  const productNotFoundDiv = document.getElementById("product-not-found");
  const mainImageWrapper = document.getElementById("main-image-wrapper-ctsp");
  const thumbnailWrapper = document.getElementById("thumbnail-wrapper-ctsp");
  const productBrand = document.getElementById("product-brand");
  const productName = document.getElementById("product-name");
  const productRatingDisplay = document.getElementById(
    "product-rating-display"
  );
  const currentPriceElem = document.getElementById("current-price");
  const originalPriceElem = document.getElementById("original-price");
  const discountPercentageElem = document.getElementById("discount-percentage");
  const shortDescription = document.getElementById("product-short-description");
  const longDescription = document.getElementById("product-long-description");
  const colorOptionsContainer = document.getElementById(
    "color-options-container"
  );
  const colorSelector = document.getElementById("color-selector");
  const quantityInput = document.getElementById("quantity-input");
  const decreaseQuantityBtn = document.getElementById("decrease-quantity");
  const increaseQuantityBtn = document.getElementById("increase-quantity");
  const addToCartBtn = document.getElementById("add-to-cart-btn");
  const addToWishlistBtnCtsp = document.getElementById(
    "add-to-wishlist-btn-ctsp"
  );
  const productLabelsCtsp = document.getElementById("product-labels-ctsp");
  const giftDescriptionCtsp = document.getElementById("gift-description-ctsp");
  const breadcrumbCategory = document.getElementById("breadcrumb-category");
  const breadcrumbProductName = document.getElementById(
    "breadcrumb-product-name"
  );
  const cartCountElemOnCtspPage = document.getElementById("cart-count");

  const reviewsListDiv = document.getElementById("product-reviews-list");
  const showMoreReviewsBtn = document.getElementById("show-more-reviews-btn");
  const hideReviewsBtn = document.getElementById("hide-reviews-btn");

  const reviewForm = document.getElementById("review-form");
  const starRatingInputForm = document.getElementById("star-rating-input-form");
  const ratingValueHidden = document.getElementById("ratingValueHidden");
  const reviewCountDisplayElements = document.querySelectorAll(
    ".review-count-display"
  );

  let currentProductData = null;
  let selectedColorVariant = null;
  let mainImageSwiper = null;
  let thumbnailSwiper = null;
  let productReviews = [];
  const INITIAL_REVIEW_COUNT = 3;
  let showingAllReviews = false;

  function formatPrice(price) {
    const numericPrice = parseFloat(price);
    return isNaN(numericPrice)
      ? "N/A"
      : new Intl.NumberFormat("vi-VN", {
          style: "currency",
          currency: "VND",
        }).format(numericPrice);
  }

  function renderStars(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 !== 0;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    let starsHTML = "";
    for (let i = 0; i < fullStars; i++)
      starsHTML += '<i class="fas fa-star"></i>';
    if (halfStar) starsHTML += '<i class="fas fa-star-half-alt"></i>';
    for (let i = 0; i < emptyStars; i++)
      starsHTML += '<i class="far fa-star"></i>';
    return starsHTML;
  }

  function updateOverallRatingDisplay(newRating, newReviewCount) {
    if (productRatingDisplay) {
      const starsHTML = renderStars(newRating);
      productRatingDisplay.querySelector(".stars-display").innerHTML =
        starsHTML;
      productRatingDisplay.querySelector(".review-count-display").textContent =
        newReviewCount;
    }
    reviewCountDisplayElements.forEach(
      (el) => (el.textContent = newReviewCount)
    );
  }

  async function fetchProductDetails(productId) {
    productDetailContent.classList.add("loading");
    try {
      return await fetchBackendApi(`/products/${productId}`);
    } catch (error) {
      console.error("Lỗi khi lấy chi tiết sản phẩm:", error);
      return null;
    } finally {
      productDetailContent.classList.remove("loading");
    }
  }

  async function fetchProductReviews(productId) {
    try {
      const data = await fetchBackendApi(`/products/${productId}/reviews`);
      if (data && Array.isArray(data.reviews)) {
        productReviews = data.reviews;
      } else {
        console.warn("API reviews không trả về định dạng mong đợi.", data);
        productReviews = [];
      }
      return productReviews;
    } catch (error) {
      console.error("Lỗi tải đánh giá:", error);
      productReviews = [];
      return [];
    }
  }

  async function submitReviewToServer(productId, reviewData) {
    try {
      const updatedProductData = await fetchBackendApi(
        `/products/${productId}/reviews`,
        "POST",
        reviewData
      );

      if (
        updatedProductData &&
        updatedProductData.review_count !== undefined &&
        updatedProductData.rating !== undefined
      ) {
        currentProductData.rating = updatedProductData.rating;
        currentProductData.review_count = updatedProductData.review_count;
      } else {
        console.warn(
          "Phản hồi từ server sau khi gửi review không chứa dữ liệu sản phẩm cập nhật."
        );
      }
      return updatedProductData;
    } catch (error) {
      console.error("Lỗi gửi đánh giá:", error);
      return null;
    }
  }

  function renderProductGallery(images) {
    if (mainImageSwiper) {
      mainImageSwiper.destroy(true, true);
      mainImageSwiper = null;
    }
    if (thumbnailSwiper) {
      thumbnailSwiper.destroy(true, true);
      thumbnailSwiper = null;
    }

    mainImageWrapper.innerHTML = "";
    thumbnailWrapper.innerHTML = "";
    const defaultImg = "public/images/default-product.png";

    if (!images || images.length === 0) {
      mainImageWrapper.innerHTML = `<div class="swiper-slide"><img src="${defaultImg}" alt="Sản phẩm"></div>`;
      if (typeof Swiper !== "undefined") {
        mainImageSwiper = new Swiper(".main-image-swiper", {
          allowTouchMove: false,
          navigation: false,
          pagination: false,
          loop: false,
        });
      } else {
        console.error(
          "Swiper is not defined. Make sure the library is loaded."
        );
      }
      document.querySelector(".thumbnail-swiper").style.display = "none";
      return;
    }

    images.forEach((img) => {
      mainImageWrapper.innerHTML += `<div class="swiper-slide"><img src="${
        img.image_url || defaultImg
      }" alt="${currentProductData.name}"></div>`;
      thumbnailWrapper.innerHTML += `<div class="swiper-slide thumbnail-slide"><img src="${
        img.image_url || defaultImg
      }" alt="Thumbnail ${currentProductData.name}"></div>`;
    });

    if (typeof Swiper !== "undefined") {
      thumbnailSwiper = new Swiper(".thumbnail-swiper", {
        spaceBetween: 10,
        slidesPerView: 4,
        freeMode: true,
        watchSlidesProgress: true,
        loop: false,
        navigation: {
          nextEl: ".thumbnail-swiper-button-next",
          prevEl: ".thumbnail-swiper-button-prev",
        },
      });

      mainImageSwiper = new Swiper(".main-image-swiper", {
        spaceBetween: 10,
        loop: images.length > 1,
        navigation: {
          nextEl: ".main-img-next",
          prevEl: ".main-img-prev",
        },
        pagination: {
          el: ".main-img-pagination",
          clickable: true,
        },
        thumbs: {
          swiper: thumbnailSwiper,
        },
      });
    } else {
      console.error("Swiper is not defined. Make sure the library is loaded.");
    }

    document.querySelector(".thumbnail-swiper").style.display =
      images.length > 1 ? "block" : "none";

    setTimeout(() => {
      if (mainImageSwiper && mainImageSwiper.update) mainImageSwiper.update();
      if (thumbnailSwiper && thumbnailSwiper.update) thumbnailSwiper.update();
    }, 300);
  }

  function displayProductDetails(product) {
    currentProductData = product;
    document.title = `${product.name} - DEWORA`;

    breadcrumbCategory.textContent = product.product_type
      ? product.product_type.name
      : "Sản phẩm";
    if (product.product_type)
      breadcrumbCategory.href = `da.html?type_id=${product.product_type.id}`;
    breadcrumbProductName.textContent = product.name;

    productBrand.textContent = product.brand ? product.brand.name : "Không rõ";
    productName.textContent = product.name;

    updateOverallRatingDisplay(product.rating || 0, product.review_count || 0);

    currentPriceElem.textContent = formatPrice(product.price);
    if (
      product.original_price &&
      parseFloat(product.original_price) > parseFloat(product.price)
    ) {
      originalPriceElem.textContent = formatPrice(product.original_price);
      originalPriceElem.style.display = "inline";
      discountPercentageElem.textContent = product.discount_percentage
        ? `-${product.discount_percentage}%`
        : "";
      discountPercentageElem.style.display = product.discount_percentage
        ? "inline-block"
        : "none";
    } else {
      originalPriceElem.style.display = "none";
      discountPercentageElem.style.display = "none";
    }
    shortDescription.textContent = product.description
      ? product.description.substring(0, 200) +
        (product.description.length > 200 ? "..." : "")
      : "Chưa có mô tả ngắn.";
    longDescription.innerHTML = product.description
      ? product.description.replace(/\n/g, "<br>")
      : "Chưa có mô tả chi tiết.";

    renderProductGallery(product.images);

    if (product.colors && product.colors.length > 0) {
      colorOptionsContainer.style.display = "block";
      colorSelector.innerHTML = "";
      product.colors.forEach((color, index) => {
        const chip = document.createElement("span");
        chip.className = "color-chip";
        chip.textContent = color.color_name;
        chip.dataset.colorId = color.id;
        if (index === 0) {
          chip.classList.add("active");
          selectedColorVariant = color;
        }
        chip.addEventListener("click", () => {
          document
            .querySelectorAll("#color-selector .color-chip.active")
            .forEach((c) => c.classList.remove("active"));
          chip.classList.add("active");
          selectedColorVariant = color;
        });
        colorSelector.appendChild(chip);
      });
    } else {
      colorOptionsContainer.style.display = "none";
      selectedColorVariant = null;
    }

    productLabelsCtsp.innerHTML = "";
    if (product.labels && product.labels.length > 0) {
      product.labels.forEach((label) => {
        productLabelsCtsp.innerHTML += `<span class="product-label label-${label.label_name.toLowerCase()}">${
          label.label_name
        }</span>`;
      });
    }
    giftDescriptionCtsp.textContent = product.gift_description || "";
    giftDescriptionCtsp.style.display = product.gift_description
      ? "block"
      : "none";
  }

  function renderReviews() {
    reviewsListDiv.innerHTML = "";
    showMoreReviewsBtn.style.display = "none";
    hideReviewsBtn.style.display = "none";

    if (!productReviews || productReviews.length === 0) {
      reviewsListDiv.innerHTML =
        '<p class="no-reviews">Chưa có đánh giá nào.</p>';
      return;
    }

    const reviewsToRender = showingAllReviews
      ? productReviews
      : productReviews.slice(0, INITIAL_REVIEW_COUNT);

    reviewsToRender.forEach((review) => {
      const reviewEl = document.createElement("div");
      reviewEl.classList.add("review-item");
      const reviewDate = new Date(review.created_at).toLocaleDateString(
        "vi-VN"
      );
      reviewEl.innerHTML = `
      <div class="review-header">
        <strong class="reviewer-name">${review.name || "Ẩn danh"}</strong>
        <span class="review-date">${reviewDate}</span>
      </div>
      <div class="review-rating">${renderStars(review.rating)}</div>
      <p class="review-comment">${review.comment || ""}</p>
      `;
      reviewsListDiv.appendChild(reviewEl);
    });

    if (productReviews.length > INITIAL_REVIEW_COUNT) {
      if (showingAllReviews) {
        hideReviewsBtn.style.display = "block";
        showMoreReviewsBtn.style.display = "none";
      } else {
        showMoreReviewsBtn.style.display = "block";
        hideReviewsBtn.style.display = "none";
      }
    }
  }

  showMoreReviewsBtn.addEventListener("click", () => {
    showingAllReviews = true;
    renderReviews();
  });

  hideReviewsBtn.addEventListener("click", () => {
    showingAllReviews = false;
    renderReviews();
  });

  decreaseQuantityBtn.addEventListener("click", () => {
    let quantity = parseInt(quantityInput.value);
    if (quantity > 1) {
      quantityInput.value = quantity - 1;
    }
  });

  increaseQuantityBtn.addEventListener("click", () => {
    let quantity = parseInt(quantityInput.value);
    quantityInput.value = quantity + 1;
  });

  window.openTab = function (evt, tabName) {
    let i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabcontent.length; i++) {
      tabcontent[i].style.display = "none";
      tabcontent[i].classList.remove("active");
    }
    tablinks = document.getElementsByClassName("tab-link");
    for (i = 0; i < tablinks.length; i++) {
      tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    const currentTab = document.getElementById(tabName);
    if (currentTab) {
      currentTab.style.display = "block";
      currentTab.classList.add("active");
    }
    if (evt && evt.currentTarget) {
      evt.currentTarget.className += " active";
    }
  };

  const firstTabButton = document.querySelector(".tab-link");
  if (firstTabButton) {
    firstTabButton.click();
  }

  if (starRatingInputForm) {
    starRatingInputForm.addEventListener("click", (e) => {
      if (e.target.matches("i.fa-star")) {
        const rating = parseInt(e.target.dataset.value);
        if (ratingValueHidden) ratingValueHidden.value = rating;
        Array.from(starRatingInputForm.children).forEach((star, index) => {
          star.classList.toggle("fas", index < rating);
          star.classList.toggle("far", index >= rating);
        });
      }
    });
  }

  if (reviewForm) {
    reviewForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const reviewerNameInput = document.getElementById("reviewer-name");
      const reviewCommentInput = document.getElementById("review-comment");

      const reviewerName = reviewerNameInput
        ? reviewerNameInput.value.trim()
        : "";
      const rating = ratingValueHidden ? parseInt(ratingValueHidden.value) : 0;
      const comment = reviewCommentInput ? reviewCommentInput.value.trim() : "";

      if (!reviewerName || rating === 0 || !comment) {
        Swal.fire(
          "Lưu ý",
          "Vui lòng nhập đầy đủ tên, chọn số sao và viết bình luận.",
          "warning",
          { confirmButtonColor: "#e5536b" }
        );
        return;
      }
      if (!currentProductData || !currentProductData.id) {
        Swal.fire(
          "Lỗi",
          "Không tìm thấy thông tin sản phẩm để gửi đánh giá.",
          "error"
        );
        return;
      }

      const reviewData = {
        name: reviewerName,
        rating: rating,
        comment: comment,
      };
      const submitResult = await submitReviewToServer(
        currentProductData.id,
        reviewData
      );

      if (submitResult) {
        await fetchProductReviews(currentProductData.id);
        renderReviews();
        if (currentProductData) {
          updateOverallRatingDisplay(
            currentProductData.rating,
            currentProductData.review_count
          );
        }
        reviewForm.reset();
        if (starRatingInputForm) {
          Array.from(starRatingInputForm.children).forEach((star) => {
            star.classList.add("far");
            star.classList.remove("fas");
          });
        }
        if (ratingValueHidden) ratingValueHidden.value = "0";

        Swal.fire({
          title: "Thành công!",
          text: "Cảm ơn bạn đã đánh giá sản phẩm!",
          icon: "success",
          timer: 3000,
          timerProgressBar: true,
          confirmButtonColor: "#e5536b",
        });
      }
    });
  }

  function animateAddToCart() {
    const mainImageElement =
      mainImageSwiper &&
      mainImageSwiper.slides.length > 0 &&
      mainImageSwiper.activeIndex !== undefined &&
      mainImageSwiper.slides[mainImageSwiper.activeIndex]
        ? mainImageSwiper.slides[mainImageSwiper.activeIndex].querySelector(
            "img"
          )
        : document.querySelector(".main-image-swiper .swiper-slide-active img");

    if (!mainImageElement) {
      console.warn("Không tìm thấy ảnh chính để tạo hiệu ứng.");
      updateCartDisplayCountOnHeader();
      return;
    }

    const cartIconTarget = cartCountElemOnCtspPage;
    if (!cartIconTarget) {
      console.warn("Không tìm thấy biểu tượng giỏ hàng (cart-count span).");
      updateCartDisplayCountOnHeader();
      return;
    }

    const startRect = mainImageElement.getBoundingClientRect();
    const endRect = cartIconTarget.getBoundingClientRect();
    const flyingImg = mainImageElement.cloneNode(true);

    flyingImg.style.position = "fixed";
    flyingImg.style.top = startRect.top + "px";
    flyingImg.style.left = startRect.left + "px";
    flyingImg.style.width = startRect.width + "px";
    flyingImg.style.height = startRect.height + "px";
    flyingImg.style.zIndex = "10000";
    flyingImg.style.transition = "all 0.8s ease-in-out";
    flyingImg.style.opacity = "0.8";
    flyingImg.style.borderRadius = "50%";
    flyingImg.style.objectFit = "cover";

    document.body.appendChild(flyingImg);

    requestAnimationFrame(() => {
      flyingImg.style.top = endRect.top + endRect.height / 2 - 10 + "px";
      flyingImg.style.left = endRect.left + endRect.width / 2 - 10 + "px";
      flyingImg.style.width = "20px";
      flyingImg.style.height = "20px";
      flyingImg.style.opacity = "0";
    });

    flyingImg.addEventListener("transitionend", () => {
      flyingImg.remove();
    });
  }

  async function updateCartDisplayCountOnHeader() {
    try {
      const cartData = await fetchBackendApi("/cart");
      if (
        cartData &&
        cartData.total_items !== undefined &&
        cartCountElemOnCtspPage
      ) {
        cartCountElemOnCtspPage.textContent = cartData.total_items;
        cartCountElemOnCtspPage.style.display =
          cartData.total_items > 0 ? "inline" : "none";
      } else if (cartCountElemOnCtspPage) {
        cartCountElemOnCtspPage.textContent = "0";
        cartCountElemOnCtspPage.style.display = "none";
      }
    } catch (error) {
      console.error("Lỗi cập nhật số lượng giỏ hàng từ server:", error);
      if (cartCountElemOnCtspPage) {
        cartCountElemOnCtspPage.textContent = "0";
        cartCountElemOnCtspPage.style.display = "none";
      }
    }
  }
  if (addToWishlistBtnCtsp) {
    addToWishlistBtnCtsp.addEventListener("click", async () => {
      const authToken = getAuthToken();
      if (!authToken) {
        Swal.fire({
          title: "Yêu cầu đăng nhập",
          text: "Vui lòng đăng nhập để thêm sản phẩm vào danh sách yêu thích.",
          icon: "info",
          confirmButtonText: "Đến trang đăng nhập",
          showCancelButton: true,
          cancelButtonText: "Để sau",
        }).then((result) => {
          if (result.isConfirmed) {
            window.location.href = "login.html"; // Hoặc trang đăng nhập của bạn
          }
        });
        return;
      }

      if (!currentProductData || !currentProductData.id) {
        Swal.fire("Lỗi", "Không tìm thấy thông tin sản phẩm.", "error");
        return;
      }

      try {
        // API endpoint: POST /api/wishlist/{product_id}
        // WishlistController@store đã dùng route model binding {product}, nên ta truyền product_id
        const response = await fetchBackendApi(
          `/wishlist/${currentProductData.id}`,
          "POST"
        );

        // fetchBackendApi đã tự xử lý lỗi và response.ok, response.json()
        // Nếu không có lỗi, nó sẽ trả về null (nếu 204) hoặc parsed JSON
        // WishlistController@store trả về JSON với message và status 201 hoặc 409

        // Kiểm tra response từ fetchBackendApi (nếu nó không throw error thì đã thành công ở mức HTTP)
        // Dựa vào message từ server để hiển thị thông báo phù hợp
        if (response && response.message) {
          Swal.fire("Thành công!", response.message, "success");
        } else {
          // Trường hợp thành công nhưng không có message cụ thể (ít xảy ra với API của bạn)
          Swal.fire(
            "Thành công!",
            "Sản phẩm đã được xử lý trong danh sách yêu thích.",
            "success"
          );
        }
        // Cập nhật trạng thái nút nếu cần (ví dụ: đổi thành "Đã yêu thích" hoặc disable)
        addToWishlistBtnCtsp.innerHTML =
          '<i class="fas fa-heart"></i> Đã Yêu thích';
        addToWishlistBtnCtsp.disabled = true;
      } catch (error) {
        // fetchBackendApi đã hiển thị Swal lỗi, nên ở đây có thể không cần làm gì thêm
        // hoặc log thêm nếu muốn.
        console.error("Lỗi khi thêm vào wishlist từ ctsp_script:", error);
        // Nếu fetchBackendApi không throw Error mà trả về null/undefined do response không ok
        // thì Swal mặc định của nó có thể đã hiển thị.
        // Nếu muốn chắc chắn, bạn có thể thêm một Swal ở đây như một fallback.
        if (!Swal.isVisible()) {
          Swal.fire(
            "Lỗi",
            "Không thể thêm sản phẩm vào danh sách yêu thích. " + error.message,
            "error"
          );
        }
      }
    });
  }
  if (addToCartBtn) {
    addToCartBtn.addEventListener("click", async () => {
      if (!currentProductData) {
        Swal.fire(
          "Lỗi",
          "Dữ liệu sản phẩm chưa sẵn sàng. Vui lòng tải lại trang.",
          "error",
          { confirmButtonColor: "#e5536b" }
        );
        return;
      }
      const quantity = quantityInput ? parseInt(quantityInput.value) : 0;
      if (quantity <= 0) {
        Swal.fire("Lưu ý", "Số lượng phải lớn hơn 0.", "warning", {
          confirmButtonColor: "#e5536b",
        });
        return;
      }

      const itemPayload = {
        product_id: currentProductData.id,
        quantity: quantity,
        color_id: selectedColorVariant ? selectedColorVariant.id : null,
      };

      try {
        const result = await fetchBackendApi("/cart/add", "POST", itemPayload);

        if (result && result.cart && result.message) {
          Swal.fire({
            title: "Thành công!",
            text: result.message,
            icon: "success",
            timer: 2000,
            showConfirmButton: false,
            timerProgressBar: true,
          });

          if (
            result.cart.total_items !== undefined &&
            cartCountElemOnCtspPage
          ) {
            cartCountElemOnCtspPage.textContent = result.cart.total_items;
            cartCountElemOnCtspPage.style.display =
              result.cart.total_items > 0 ? "inline" : "none";
          } else {
            updateCartDisplayCountOnHeader();
          }
          animateAddToCart();
        } else if (result && result.message) {
          Swal.fire("Thông báo", result.message, "info", {
            confirmButtonColor: "#e5536b",
          });
          updateCartDisplayCountOnHeader();
        } else {
          Swal.fire(
            "Thông báo",
            "Đã thêm vào giỏ hàng, nhưng không nhận được phản hồi chi tiết.",
            "info",
            { confirmButtonColor: "#e5536b" }
          );
          updateCartDisplayCountOnHeader();
        }
      } catch (error) {
        // Error already handled by fetchBackendApi
      }
    });
  }

  async function initPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get("id");

    if (!productId) {
      if (productDetailContent) productDetailContent.style.display = "none";
      if (productNotFoundDiv) productNotFoundDiv.style.display = "block";
      return;
    }

    if (productDetailContent) {
      productDetailContent.classList.add("loading");
      productDetailContent.style.display = "block";
    }
    if (productNotFoundDiv) productNotFoundDiv.style.display = "none";
    showingAllReviews = false;

    const productData = await fetchProductDetails(productId);
    if (productDetailContent) productDetailContent.classList.remove("loading");

    if (productData && productData.id) {
      displayProductDetails(productData);
      await fetchProductReviews(productId);
      renderReviews();
      const authToken = getAuthToken();
      if (authToken && productData.id) {
        try {
          // Giả sử bạn có 1 endpoint kiểm tra 1 sản phẩm có trong wishlist không
          // Hoặc, lấy toàn bộ wishlist rồi kiểm tra phía client
          const wishlistItems = await fetchBackendApi("/wishlist"); // GET
          const isWishlisted = wishlistItems.some(
            (item) => item.id === productData.id
          );
          if (isWishlisted && addToWishlistBtnCtsp) {
            addToWishlistBtnCtsp.innerHTML =
              '<i class="fas fa-heart"></i> Đã Yêu thích';
            addToWishlistBtnCtsp.disabled = true;
          } else if (addToWishlistBtnCtsp) {
            addToWishlistBtnCtsp.innerHTML =
              '<i class="far fa-heart"></i> Thêm vào Yêu thích';
            addToWishlistBtnCtsp.disabled = false;
          }
        } catch (err) {
          console.error("Lỗi kiểm tra trạng thái wishlist:", err);
          if (addToWishlistBtnCtsp) {
            addToWishlistBtnCtsp.innerHTML =
              '<i class="far fa-heart"></i> Thêm vào Yêu thích';
            addToWishlistBtnCtsp.disabled = false;
          }
        }
      } else if (addToWishlistBtnCtsp) {
        addToWishlistBtnCtsp.innerHTML =
          '<i class="far fa-heart"></i> Thêm vào Yêu thích';
        addToWishlistBtnCtsp.disabled = false;
      }

      const firstTabToClick =
        document.querySelector(".tab-link.active") ||
        document.querySelector(".tab-link");
      if (firstTabToClick && typeof firstTabToClick.click === "function") {
        if (window.getComputedStyle(firstTabToClick).display !== "none") {
          // firstTabToClick.click(); // Bỏ qua nếu openTab đã tự xử lý
        }
      }
    } else {
      if (productDetailContent) productDetailContent.style.display = "none";
      if (productNotFoundDiv) productNotFoundDiv.style.display = "block";
    }
    updateCartDisplayCountOnHeader();
  }

  initPage();
});
