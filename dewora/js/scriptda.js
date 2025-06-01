// window.API_BASE_URL = "http://127.0.0.1:8000/api"; // Already defined in common.js

// --- Helper Functions --- (These are now in common.js, so remove from here)
// function formatPrice(price) { ... }
// function generateRatingHTML(rating, reviewCount) { ... }
// function initializeProductImageSwiper(containerElement) { ... }

let allProductTypes = [];
let allBrands = [];

const productTypeGroups = {
  moi: [1, 2, 3, 4],
  mat: [5, 6, 7, 8],
  da: [9, 10, 11, 12],
  khac: [13, 14, 15, 16],
};

async function fetchProducts(filters = {}, sortOption = "all", page = 1) {
  const params = new URLSearchParams({ page });

  if (filters.search_name) {
    params.append("search_name", filters.search_name);
  }
  if (filters.price && filters.price.length > 0) {
    filters.price.forEach((priceFilterId) => {
      if (priceFilterId === "price1") params.append("max_price", "299999");
      else if (priceFilterId === "price2") {
        params.append("min_price", "300000");
        params.append("max_price", "500000");
      } else if (priceFilterId === "price3") {
        params.append("min_price", "500000");
        params.append("max_price", "800000");
      } else if (priceFilterId === "price4") {
        params.append("min_price", "800000");
        params.append("max_price", "1500000");
      } else if (priceFilterId === "price5")
        params.append("min_price", "1500000");
    });
  }
  if (filters.type && filters.type.length > 0) {
    filters.type.forEach((typeId) => params.append("type[]", typeId));
  }
  if (filters.brand && filters.brand.length > 0) {
    filters.brand.forEach((brandId) => params.append("brand[]", brandId));
  }

  // Lọc theo label_name nếu có
  if (filters.label_name) {
    params.append("label_name", filters.label_name);
  }

  let finalSortBy = null;
  let finalSortOrder = null;

  // Xác định sắp xếp mặc định dựa trên label (nếu người dùng chưa chọn sắp xếp)
  // và sau đó ghi đè bằng lựa chọn sắp xếp của người dùng.
  if (sortOption === "all" || sortOption === "default_sort") {
    // "all" là giá trị ban đầu của dropdown, "default_sort" để phân biệt
    if (filters.label_name === "MỚI VỀ") {
      finalSortBy = "id"; // Sắp xếp theo ID cho sản phẩm "MỚI VỀ"
      finalSortOrder = "desc";
    } else if (filters.label_name === "BÁN CHẠY") {
      finalSortBy = "review_count"; // Sắp xếp theo review_count cho sản phẩm "BÁN CHẠY"
      // Giả định API hỗ trợ sort_by=review_count
      finalSortOrder = "desc";
    }
  } else if (sortOption === "id_desc") {
    finalSortBy = "id";
    finalSortOrder = "desc";
  } else if (sortOption === "reviewCount_desc") {
    finalSortBy = "review_count"; // Giả định API hỗ trợ
    finalSortOrder = "desc";
  } else if (sortOption === "price-asc") {
    finalSortBy = "price";
    finalSortOrder = "asc";
  } else if (sortOption === "price-desc") {
    finalSortBy = "price";
    finalSortOrder = "desc";
  } else if (sortOption === "rating-desc") {
    finalSortBy = "rating";
    finalSortOrder = "desc";
  }

  if (finalSortBy) {
    params.append("sort_by", finalSortBy);
    params.append("sort_order", finalSortOrder);
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/products?${params.toString()}`
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Không thể fetch sản phẩm từ API:", error);
    return { data: [], total: 0, current_page: 1, last_page: 1 };
  }
}

function renderProducts(productsToRender) {
  const productGrid = document.querySelector(".product-grid");
  if (!productGrid) return;
  productGrid.innerHTML = "";

  if (!productsToRender || productsToRender.length === 0) {
    productGrid.innerHTML = "<p>Không tìm thấy sản phẩm nào phù hợp.</p>";
    return;
  }

  productsToRender.forEach((product) => {
    const productCardHTML = renderProductCard(product);
    productGrid.insertAdjacentHTML("beforeend", productCardHTML);
    const swiperContainer = productGrid.lastElementChild.querySelector(
      ".product-image-swiper-container"
    );
    if (swiperContainer) initializeProductImageSwiper(swiperContainer);
  });
}

function renderPagination(currentPage, lastPage, totalProducts) {
  const paginationContainer = document.querySelector(".pagination-container");
  const resultCountElement = document.querySelector(
    ".listing-header .result-count"
  );

  if (!paginationContainer) return;
  if (resultCountElement)
    resultCountElement.textContent = `Hiển thị ${totalProducts} kết quả`; // Hoặc `Hiển thị X-Y trên tổng số Z kết quả`
  paginationContainer.innerHTML = "";
  if (lastPage <= 1) return;

  const createButton = (
    text,
    pageNum,
    isDisabled = false,
    isCurrent = false,
    isDots = false
  ) => {
    const button = document.createElement(isDots ? "span" : "button");
    button.textContent = text;
    if (isDots) button.classList.add("pagination-dots");
    else {
      button.classList.add("pagination-button");
      if (pageNum === null)
        button.classList.add(text.toLowerCase()); // For "Previous", "Next"
      else button.classList.add("page-number");
      if (isDisabled) button.disabled = true;
      if (isCurrent) button.classList.add("active");
      button.addEventListener("click", () => updateDisplay(pageNum));
    }
    return button;
  };

  paginationContainer.appendChild(
    createButton("Previous", currentPage - 1, currentPage === 1)
  );
  let startPage = Math.max(1, currentPage - 2),
    endPage = Math.min(lastPage, currentPage + 2);
  if (endPage - startPage < 4) {
    if (startPage === 1) endPage = Math.min(lastPage, startPage + 4);
    else if (endPage === lastPage) startPage = Math.max(1, lastPage - 4);
  }
  if (lastPage > 5 && endPage - startPage < 4) {
    // Ensure at least 5 page numbers if possible
    if (startPage === 1) endPage = Math.min(lastPage, 5);
    else if (endPage === lastPage) startPage = Math.max(1, lastPage - 4);
  }
  if (startPage > 1) {
    paginationContainer.appendChild(createButton("1", 1));
    if (startPage > 2)
      paginationContainer.appendChild(
        createButton("...", null, false, false, true)
      );
  }
  for (let i = startPage; i <= endPage; i++)
    paginationContainer.appendChild(
      createButton(i, i, false, i === currentPage)
    );
  if (endPage < lastPage) {
    if (endPage < lastPage - 1)
      paginationContainer.appendChild(
        createButton("...", null, false, false, true)
      );
    paginationContainer.appendChild(createButton(lastPage, lastPage));
  }
  paginationContainer.appendChild(
    createButton("Next", currentPage + 1, currentPage === lastPage)
  );
}

async function updateDisplay(page = 1) {
  const currentFilters = { price: [], type: [], brand: [] };
  const urlParams = new URLSearchParams(window.location.search);
  const searchNameFromUrl = urlParams.get("search_name");
  const labelNameFromUrl = urlParams.get("label"); // Lấy label từ URL

  if (searchNameFromUrl) {
    currentFilters.search_name = searchNameFromUrl;
  }
  if (labelNameFromUrl) {
    currentFilters.label_name = labelNameFromUrl; // Thêm label vào bộ lọc
  }

  document
    .querySelectorAll(".sidebar-filters input[type='checkbox']:checked")
    .forEach((checkbox) => {
      const filterType = checkbox.name;
      if (!currentFilters[filterType]) currentFilters[filterType] = [];
      currentFilters[filterType].push(checkbox.value);
    });
  const sortSelect = document.querySelector(".sort-options select");

  // Sử dụng 'default_sort' nếu không có label đặc biệt hoặc người dùng chưa chọn gì,
  // để fetchProducts có thể áp dụng logic sắp xếp mặc định dựa trên label.
  // Nếu người dùng đã chọn một option cụ thể, dùng giá trị đó.
  let currentSortOption =
    sortSelect && sortSelect.value !== "all"
      ? sortSelect.value
      : "default_sort";

  const productsData = await fetchProducts(
    currentFilters,
    currentSortOption,
    page
  );
  renderProducts(Array.isArray(productsData.data) ? productsData.data : []);
  renderPagination(
    productsData.current_page || 1,
    productsData.last_page || 1,
    productsData.total || 0
  );
}

async function fetchProductTypes() {
  try {
    const response = await fetch(`${API_BASE_URL}/product-types`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data : data.data || [];
  } catch (error) {
    console.error("Không thể fetch Loại sản phẩm:", error);
    return [];
  }
}

async function fetchBrands() {
  try {
    const response = await fetch(`${API_BASE_URL}/brands`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data : data.data || [];
  } catch (error) {
    console.error("Không thể fetch Thương hiệu:", error);
    return [];
  }
}

function renderFilterOptions(options, containerId, filterName) {
  const container = document.getElementById(containerId);
  if (!container) return;
  // Xóa các li cũ trước khi render mới để tránh trùng lặp khi tìm kiếm
  const listItems = container.querySelectorAll("li");
  listItems.forEach((li) => li.remove());

  if (!options || options.length === 0) {
    const noOptionsLi = document.createElement("li");
    noOptionsLi.textContent = "Không có tùy chọn.";
    container.appendChild(noOptionsLi);
    return;
  }
  options.forEach((option) => {
    const optionIdSafe = `${filterName}-${String(option.id || option.name)
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")}`;
    const listItem = document.createElement("li");
    listItem.innerHTML = `<input type="checkbox" id="${optionIdSafe}" name="${filterName}" value="${option.id}" /><label for="${optionIdSafe}">${option.name}</label>`;
    container.appendChild(listItem);
    const checkbox = listItem.querySelector('input[type="checkbox"]');
    if (checkbox) checkbox.addEventListener("change", () => updateDisplay(1));
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const closeBtn = document.querySelector(".shipping-notice .close-btn");
  if (closeBtn)
    closeBtn.addEventListener("click", function () {
      const shippingNotice = this.closest(".shipping-notice");
      if (shippingNotice) {
        shippingNotice.classList.add("hide");
        shippingNotice.addEventListener(
          "transitionend",
          () => shippingNotice.remove(),
          { once: true }
        );
      }
    });

  allProductTypes = await fetchProductTypes();
  renderFilterOptions(allProductTypes, "type-filter-list", "type");
  allBrands = await fetchBrands();
  renderFilterOptions(allBrands, "brand-filter-list", "brand");

  const urlParams = new URLSearchParams(window.location.search);
  const groupIdFromUrl = urlParams.get("group");
  const typeIdFromUrl = urlParams.get("type_id");
  const labelNameFromUrl = urlParams.get("label"); // Lấy label từ URL

  if (groupIdFromUrl && productTypeGroups[groupIdFromUrl]) {
    const typeIdsInGroup = productTypeGroups[groupIdFromUrl];
    typeIdsInGroup.forEach((typeId) => {
      const typeCheckbox = document.querySelector(
        `.sidebar-filters input[name='type'][value='${typeId}']`
      );
      if (typeCheckbox && !typeCheckbox.checked) typeCheckbox.checked = true;
      else if (!typeCheckbox)
        console.warn(
          `Checkbox cho type_id '${typeId}' trong nhóm '${groupIdFromUrl}' không tìm thấy.`
        );
    });
  } else if (typeIdFromUrl) {
    const typeCheckbox = document.querySelector(
      `.sidebar-filters input[name='type'][value='${typeIdFromUrl}']`
    );
    if (typeCheckbox && !typeCheckbox.checked) typeCheckbox.checked = true;
    else if (!typeCheckbox)
      console.warn(`Checkbox cho type_id '${typeIdFromUrl}' không tìm thấy.`);
  }

  const typeSearchInput = document
    .querySelector("#type-filter-list")
    ?.closest(".filter-group")
    ?.querySelector('.search-filter input[type="text"]');
  if (typeSearchInput) {
    typeSearchInput.addEventListener("input", () => {
      const searchTerm = typeSearchInput.value.toLowerCase();
      const filteredTypes = allProductTypes.filter((type) =>
        type.name.toLowerCase().includes(searchTerm)
      );
      renderFilterOptions(filteredTypes, "type-filter-list", "type");
      // Áp dụng lại check cho group hoặc type_id sau khi render lại danh sách lọc
      if (groupIdFromUrl && productTypeGroups[groupIdFromUrl]) {
        productTypeGroups[groupIdFromUrl].forEach((typeId) => {
          const cb = document.querySelector(
            `.sidebar-filters input[name='type'][value='${typeId}']`
          );
          if (cb) cb.checked = true;
        });
      } else if (typeIdFromUrl) {
        const cb = document.querySelector(
          `.sidebar-filters input[name='type'][value='${typeIdFromUrl}']`
        );
        if (cb) cb.checked = true;
      }
    });
  }

  const brandSearchInput = document
    .querySelector("#brand-filter-list")
    ?.closest(".filter-group")
    ?.querySelector('.search-filter input[type="text"]');
  if (brandSearchInput) {
    brandSearchInput.addEventListener("input", () => {
      const searchTerm = brandSearchInput.value.toLowerCase();
      renderFilterOptions(
        allBrands.filter((brand) =>
          brand.name.toLowerCase().includes(searchTerm)
        ),
        "brand-filter-list",
        "brand"
      );
    });
  }

  const sortSelect = document.querySelector(".sort-options select");
  if (sortSelect) {
    // Cập nhật các tùy chọn sắp xếp
    sortSelect.innerHTML = `
        <option value="all">Mặc định</option>
        <option value="price-asc">Giá: Tăng dần</option>
        <option value="price-desc">Giá: Giảm dần</option>
        <option value="rating-desc">Đánh giá: Cao nhất</option>
    `;
    // Nếu có label đặc biệt từ URL, để giá trị dropdown là "all" (Mặc định)
    // để logic trong fetchProducts áp dụng sắp xếp mặc định cho label đó.
    // Nếu người dùng tự chọn một option khác, event listener sẽ kích hoạt updateDisplay.
    if (labelNameFromUrl === "MỚI VỀ" || labelNameFromUrl === "BÁN CHẠY") {
      sortSelect.value = "all"; // Để "Mặc định", fetchProducts sẽ xử lý
    }

    sortSelect.addEventListener("change", () => updateDisplay(1));
  }

  document
    .querySelectorAll(".sidebar-filters .filter-group input[name='price']")
    .forEach((priceCheckbox) => {
      if (!priceCheckbox.dataset.listenerAttached) {
        priceCheckbox.addEventListener("change", () => updateDisplay(1));
        priceCheckbox.dataset.listenerAttached = "true";
      }
    });

  await updateDisplay(1); // Tải sản phẩm lần đầu
});
