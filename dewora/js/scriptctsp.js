const API_BASE_URL = "http://127.0.0.1:8000/api"; // URL của Laravel API

// --- Helper Functions ---

// Hàm format giá tiền
function formatPrice(price) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
}

// Hàm tạo HTML cho đánh giá sao
function generateRatingHTML(rating, reviewCount) {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 !== 0;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  let starsHTML = "";
  for (let i = 0; i < fullStars; i++) {
    starsHTML += '<i class="fas fa-star gold"></i>';
  }
  if (halfStar) {
    starsHTML += '<i class="fas fa-star-half-alt gold"></i>';
  }
  for (let i = 0; i < emptyStars; i++) {
    starsHTML += '<i class="far fa-star gold"></i>';
  }

  return `
        <div class="stars">${starsHTML}</div>
        <span class="review-count">(${reviewCount} đánh giá)</span>
    `;
}

// Hàm khởi tạo Swiper cho ảnh sản phẩm
function initializeProductImageSwiper(productCard) {
  const images = Array.from(
    productCard.querySelectorAll(".product-image-swiper-image")
  );
  const prevBtn = productCard.querySelector(".swiper-button-prev");
  const nextBtn = productCard.querySelector(".swiper-button-next");
  const dotsContainer = productCard.querySelector(".slider-dots");

  let currentIndex = 0;

  function updateImages() {
    images.forEach((img, index) => {
      img.style.transform = `translateX(${-currentIndex * 100}%)`;
    });
    updateDots();
  }

  function updateDots() {
    if (dotsContainer) {
      dotsContainer.innerHTML = "";
      images.forEach((_, index) => {
        const dot = document.createElement("span");
        dot.classList.add("dot");
        if (index === currentIndex) {
          dot.classList.add("active");
        }
        dot.addEventListener("click", () => {
          currentIndex = index;
          updateImages();
        });
        dotsContainer.appendChild(dot);
      });
    }
  }

  if (images.length > 1) {
    // Chỉ hiển thị nút điều hướng nếu có nhiều hơn 1 ảnh
    prevBtn.addEventListener("click", () => {
      currentIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
      updateImages();
    });

    nextBtn.addEventListener("click", () => {
      currentIndex = currentIndex === images.length - 1 ? 0 : currentIndex + 1;
      updateImages();
    });

    // Ban đầu, ẩn các nút nếu chỉ có 1 ảnh
    prevBtn.style.display = "block";
    nextBtn.style.display = "block";
  } else {
    // Ẩn nút nếu chỉ có 1 ảnh
    if (prevBtn) prevBtn.style.display = "none";
    if (nextBtn) nextBtn.style.display = "none";
    if (dotsContainer) dotsContainer.style.display = "none";
  }

  updateImages(); // Khởi tạo vị trí ảnh và chấm
}

async function fetchProducts(filters = {}, sortOption = "all", page = 1) {
  const params = new URLSearchParams({ page });

  // Xử lý filters
  if (filters.price && filters.price.length > 0) {
    filters.price.forEach((priceFilterId) => {
      if (priceFilterId === "price1") {
        // Dưới 300.000đ
        params.append("max_price", "299999");
      } else if (priceFilterId === "price2") {
        // 300.000đ - 1.000.000đ
        params.append("min_price", "300000");
        params.append("max_price", "1000000");
      } else if (priceFilterId === "price3") {
        // 1.000.000đ - 3.000.000đ
        params.append("min_price", "1000000");
        params.append("max_price", "3000000");
      } else if (priceFilterId === "price4") {
        // 3.000.000đ - 5.000.000đ
        params.append("min_price", "3000000");
        params.append("max_price", "5000000");
      } else if (priceFilterId === "price5") {
        // Trên 5.000.000đ
        params.append("min_price", "5000000");
      }
    });
  }
  if (filters.type && filters.type.length > 0) {
    filters.type.forEach((type) => params.append("type[]", type));
  }
  if (filters.brand && filters.brand.length > 0) {
    filters.brand.forEach((brand) => params.append("brand[]", brand));
  }

  // Xử lý sortOption
  if (sortOption === "price-asc") {
    params.append("sort_by", "price");
    params.append("sort_order", "asc");
  } else if (sortOption === "price-desc") {
    params.append("sort_by", "price");
    params.append("sort_order", "desc");
  } else if (sortOption === "rating-desc") {
    params.append("sort_by", "rating");
    params.append("sort_order", "desc");
  }
  // Các option khác có thể thêm vào đây

  try {
    const response = await fetch(
      `${API_BASE_URL}/products?${params.toString()}`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Không thể fetch sản phẩm từ API:", error);
    return {
      data: [],
      total: 0,
      current_page: 1,
      last_page: 1,
    }; // Trả về cấu trúc rỗng nếu lỗi
  }
}

function renderProducts(productsToRender) {
  const productGrid = document.querySelector(".product-grid");
  if (!productGrid) {
    console.error("Không tìm thấy phần tử .product-grid");
    return;
  }

  productGrid.innerHTML = ""; // Xóa các sản phẩm cũ

  if (productsToRender.length === 0) {
    productGrid.innerHTML = "<p>Không tìm thấy sản phẩm nào phù hợp.</p>";
    return;
  }

  productsToRender.forEach((product) => {
    if (!product || !product.id) {
      console.warn("Dữ liệu sản phẩm không đầy đủ, bỏ qua:", product);
      return;
    }

    const imageSectionHTML = `
            <div class="product-image-swiper-container">
                <div class="product-image-swiper-wrapper">
                    ${
                      product.images && product.images.length > 0
                        ? product.images
                            .map(
                              (img) => `
                            <div class="product-image-swiper-slide">
                                <img src="${img.image_url}" alt="${product.name}" class="product-image-swiper-image" />
                            </div>
                        `
                            )
                            .join("")
                        : `<div class="product-image-swiper-slide">
                            <img src="public/images/default-product.png" alt="Ảnh mặc định" class="product-image-swiper-image" />
                        </div>`
                    }
                </div>
                ${
                  product.images && product.images.length > 1
                    ? `
                    <button class="swiper-button-prev"><i class="fas fa-chevron-left"></i></button>
                    <button class="swiper-button-next"><i class="fas fa-chevron-right"></i></button>
                    <div class="slider-dots"></div>
                `
                    : ""
                }
            </div>
        `;

    const productCardLink = `product-detail.html?id=${product.id}`; // Tạo link chi tiết sản phẩm

    const productCardHTML = `
            <article class="product-card" data-product-id="${product.id}">
                <a href="${productCardLink}" class="product-card-link">
                    ${imageSectionHTML}
                    <div class="product-info">
                        <h4 class="product-brand">${
                          product.brand ? product.brand.name : "N/A"
                        }</h4>
                        <h3 class="product-name">${product.name}</h3>
                        <div class="product-price">
                            <span class="current-price">${formatPrice(
                              product.price
                            )}</span>
                            ${
                              product.original_price !== null &&
                              product.original_price > product.price
                                ? `<span class="original-price">${formatPrice(
                                    product.original_price
                                  )}</span>`
                                : ""
                            }
                        </div>
                        <div class="product-rating">
                            ${generateRatingHTML(
                              product.rating || 0,
                              product.review_count || 0
                            )}
                        </div>
                        ${
                          product.gift_description
                            ? `<div class="product-gift">${product.gift_description}</div>`
                            : ""
                        }
                    </div>
                </a>
            </article>
    `;
    productGrid.insertAdjacentHTML("beforeend", productCardHTML);

    // Sau khi chèn HTML, khởi tạo swiper cho từng card
    const newProductCard = productGrid.lastElementChild;
    initializeProductImageSwiper(newProductCard);
  });
}

function renderPagination(currentPage, lastPage, totalProducts) {
  const paginationContainer = document.querySelector(".pagination-container");
  const resultCountElement = document.querySelector(
    ".listing-header .result-count"
  );

  if (!paginationContainer) {
    console.error("Không tìm thấy phần tử .pagination-container");
    return;
  }
  if (resultCountElement) {
    resultCountElement.textContent = `Hiển thị ${totalProducts} kết quả`;
  }

  paginationContainer.innerHTML = ""; // Xóa phân trang cũ

  if (lastPage <= 1) {
    return; // Không hiển thị phân trang nếu chỉ có 1 trang hoặc không có sản phẩm
  }

  // Nút Previous
  const prevBtn = document.createElement("button");
  prevBtn.textContent = "Previous";
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener("click", () => updateDisplay(currentPage - 1));
  paginationContainer.appendChild(prevBtn);

  // Các nút số trang
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(lastPage, currentPage + 2);

  if (endPage - startPage < 4) {
    // Đảm bảo luôn có ít nhất 5 nút nếu có thể
    if (startPage === 1) {
      endPage = Math.min(lastPage, startPage + 4);
    } else if (endPage === lastPage) {
      startPage = Math.max(1, lastPage - 4);
    }
  }

  if (startPage > 1) {
    const firstPageBtn = document.createElement("button");
    firstPageBtn.textContent = "1";
    firstPageBtn.addEventListener("click", () => updateDisplay(1));
    paginationContainer.appendChild(firstPageBtn);
    if (startPage > 2) {
      const dots = document.createElement("span");
      dots.textContent = "...";
      paginationContainer.appendChild(dots);
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    const pageBtn = document.createElement("button");
    pageBtn.textContent = i;
    pageBtn.classList.add("page-number");
    if (i === currentPage) {
      pageBtn.classList.add("active");
    }
    pageBtn.addEventListener("click", () => updateDisplay(i));
    paginationContainer.appendChild(pageBtn);
  }

  if (endPage < lastPage) {
    if (endPage < lastPage - 1) {
      const dots = document.createElement("span");
      dots.textContent = "...";
      paginationContainer.appendChild(dots);
    }
    const lastPageBtn = document.createElement("button");
    lastPageBtn.textContent = lastPage;
    lastPageBtn.addEventListener("click", () => updateDisplay(lastPage));
    paginationContainer.appendChild(lastPageBtn);
  }

  // Nút Next
  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Next";
  nextBtn.disabled = currentPage === lastPage;
  nextBtn.addEventListener("click", () => updateDisplay(currentPage + 1));
  paginationContainer.appendChild(nextBtn);
}

async function updateDisplay(page = 1) {
  const currentFilters = {};
  document
    .querySelectorAll(".sidebar-filters input[type='checkbox']:checked")
    .forEach((checkbox) => {
      const filterType = checkbox.name; // Ví dụ: 'price', 'type', 'brand'
      if (!currentFilters[filterType]) {
        currentFilters[filterType] = [];
      }
      currentFilters[filterType].push(checkbox.value);
    });

  const sortSelect = document.querySelector(".sort-options select");
  const currentSortOption = sortSelect ? sortSelect.value : "all";

  const productsData = await fetchProducts(
    currentFilters,
    currentSortOption,
    page
  );
  renderProducts(productsData.data);
  renderPagination(
    productsData.current_page,
    productsData.last_page,
    productsData.total
  );
}

// --- Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
  const closeBtn = document.querySelector(".shipping-notice .close-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", function () {
      const shippingNotice = this.closest(".shipping-notice");
      if (shippingNotice) {
        shippingNotice.classList.add("hide");
        shippingNotice.addEventListener(
          "transitionend",
          function () {
            shippingNotice.remove();
          },
          {
            once: true,
          }
        );
      }
    });
  }

  const filterInputs = document.querySelectorAll(
    ".sidebar-filters input[type='checkbox']"
  );
  if (filterInputs.length > 0) {
    filterInputs.forEach((input) => {
      input.addEventListener("change", () => updateDisplay(1)); // Khi filter thay đổi, về trang 1
    });
  }

  const sortSelect = document.querySelector(".sort-options select");
  if (sortSelect) {
    if (!sortSelect.querySelector('option[value="all"]')) {
      sortSelect.innerHTML = `
                    <option value="all">Tất cả</option>
                    <option value="price-asc">Giá: Tăng dần</option>
                    <option value="price-desc">Giá: Giảm dần</option>
                    <option value="rating-desc">Đánh giá: Cao nhất</option>
                `;
    }
    sortSelect.addEventListener("change", () => updateDisplay(1)); // Khi sort thay đổi, về trang 1
  }

  updateDisplay(1);
});
