// admin/js/products.js

document.addEventListener("DOMContentLoaded", () => {
  if (!checkAdminAuth()) return;

  // Logic cho trang manage_products.html
  if (document.getElementById("productsTable")) {
    loadProducts(); // Tải lần đầu
    document.getElementById("addProductBtn")?.addEventListener("click", () => {
      window.location.href = "product_form.html";
    });
    document.getElementById("searchButton")?.addEventListener("click", () => {
      const searchTerm = document.getElementById("searchInput").value;
      loadProducts(1, searchTerm);
    });
    document
      .getElementById("searchInput")
      ?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          const searchTerm = document.getElementById("searchInput").value;
          loadProducts(1, searchTerm);
        }
      });
  }

  // Logic cho trang product_form.html
  if (document.getElementById("productForm")) {
    initializeProductForm();
  }
});

let currentProductPage = 1;
let currentProductSearch = "";

async function loadProducts(page = 1, searchTerm = "") {
  currentProductPage = page;
  currentProductSearch = searchTerm;
  const productsTableBody = document
    .getElementById("productsTable")
    ?.querySelector("tbody");
  if (!productsTableBody) return;

  productsTableBody.innerHTML =
    '<tr><td colspan="6">Đang tải dữ liệu sản phẩm...</td></tr>';

  try {
    const perPage = 10; // Giữ nguyên hoặc điều chỉnh số lượng sản phẩm trên mỗi trang
    let endpoint = `products?page=${page}&per_page=${perPage}`;
    if (searchTerm) {
      endpoint += `&search=${encodeURIComponent(searchTerm)}`;
    }

    const response = await fetchAdminAPI(endpoint);
    const products = response.data;
    const paginationMeta = response;
    productsTableBody.innerHTML = ""; // Xóa nội dung cũ

    if (products.length === 0) {
      productsTableBody.innerHTML =
        '<tr><td colspan="6">Không tìm thấy sản phẩm nào.</td></tr>';
      // Đảm bảo ẩn các nút phân trang nếu không có dữ liệu
      document.getElementById("paginationControlsProducts").innerHTML = "";
      return;
    }

    products.forEach((product) => {
      const row = `
        <tr>
          <td>${product.id}</td>
          <td><img src="${
            product.images && product.images.length > 0
              ? product.images[0].image_url
              : "placeholder.jpg"
          }" alt="${product.name}" width="50"></td>
          <td>${product.name}</td>
          <td>${product.brand.name || "N/A"}</td>
          <td>${formatCurrency(product.price)}</td>
          <td>
            <button class="btn-info edit-product-btn" data-id="${
              product.id
            }">Sửa</button>
            <button class="btn-danger delete-product-btn" data-id="${
              product.id
            }">Xóa</button>
          </td>
        </tr>
      `;
      productsTableBody.insertAdjacentHTML("beforeend", row);
    });

    // Call this function AFTER products are loaded into the DOM
    attachProductActionListeners(); // Add this line

    // Gọi hàm setupPaginationControls
    // Đảm bảo rằng hàm setupPaginationControls có sẵn trong common.js
    // và nó được truyền đúng tham số: meta, container ID, và hàm loadData
    setupPaginationControls(
      paginationMeta,
      "paginationControlsProducts",
      loadProducts,
      currentProductSearch // Truyền searchTerm để giữ trạng thái tìm kiếm
    );
  } catch (error) {
    console.error("Lỗi tải sản phẩm:", error);
    productsTableBody.innerHTML =
      '<tr><td colspan="6">Không thể tải dữ liệu sản phẩm.</td></tr>';
    document.getElementById("paginationControlsProducts").innerHTML = "";
  }
}
function attachProductActionListeners() {
  document.querySelectorAll(".edit-product-btn").forEach((button) => {
    button.addEventListener("click", (e) => {
      const productId = e.target.dataset.id;
      window.location.href = `product_form.html?id=${productId}`;
    });
  });

  document.querySelectorAll(".delete-product-btn").forEach((button) => {
    button.addEventListener("click", async (e) => {
      const productId = e.target.dataset.id;
      const result = await Swal.fire({
        title: "Bạn chắc chắn muốn xóa?",
        text: "Hành động này không thể hoàn tác!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Vâng, xóa nó!",
        cancelButtonText: "Hủy bỏ",
      });

      if (result.isConfirmed) {
        try {
          await fetchAdminAPI(`products/${productId}`, "DELETE");
          showCustomAlert(
            "success",
            "Đã xóa!",
            "Sản phẩm đã được xóa thành công."
          );
          loadProducts(currentProductPage, currentProductSearch); // Tải lại trang hiện tại
        } catch (error) {
          // showCustomAlert đã được gọi trong fetchAdminAPI
          console.error("Lỗi khi xóa sản phẩm:", error);
        }
      }
    });
  });
}

// --- Logic cho product_form.html ---
let brandOptionsCache = null;
let typeOptionsCache = null;

async function initializeProductForm() {
  const form = document.getElementById("productForm");
  if (!form) return;

  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get("id");
  const formTitle = document.getElementById("productFormTitle"); // Đảm bảo có element này trong product_form.html

  // Tải danh sách thương hiệu và loại sản phẩm (có cache)
  try {
    if (!brandOptionsCache) {
      // Gọi API public, không cần token admin
      brandOptionsCache = await fetch(`${PUBLIC_API_BASE_URL}/brands`).then(
        (res) => res.json()
      );
    }
    if (!typeOptionsCache) {
      typeOptionsCache = await fetch(
        `${PUBLIC_API_BASE_URL}/product-types`
      ).then((res) => res.json());
    }
    populateDropdown("brand_id", brandOptionsCache);
    populateDropdown("type_id", typeOptionsCache);
  } catch (e) {
    showCustomAlert(
      "error",
      "Lỗi tải dữ liệu",
      "Không thể tải danh sách thương hiệu/loại sản phẩm."
    );
    console.error("Lỗi tải brands/types:", e);
  }

  // Thiết lập các trường động ban đầu (màu sắc, nhãn)
  setupDynamicFields(
    "colorsContainer",
    getEmptyColorFieldHtml,
    "Thêm màu",
    true
  );
  setupDynamicFields(
    "labelsContainer",
    getEmptyLabelFieldHtml,
    "Thêm nhãn",
    true
  );

  if (productId) {
    if (formTitle) formTitle.textContent = "Chỉnh Sửa Sản Phẩm";
    try {
      const product = await fetchAdminAPI(`products/${productId}`);
      if (product) populateProductForm(form, product);
    } catch (error) {
      if (formTitle) formTitle.textContent = "Lỗi Tải Sản Phẩm";
      form.innerHTML =
        "<p>Không thể tải dữ liệu sản phẩm. Vui lòng thử lại.</p>";
    }
  } else {
    if (formTitle) formTitle.textContent = "Thêm Sản Phẩm Mới";
  }

  form.addEventListener("submit", handleProductFormSubmit);
}

function populateDropdown(
  selectId,
  options,
  selectedValue = null,
  defaultText = "Chọn một mục..."
) {
  const select = document.getElementById(selectId);
  if (!select) return;
  select.innerHTML = `<option value="">-- ${defaultText} --</option>`;
  if (options && Array.isArray(options)) {
    options.forEach((option) => {
      const optElement = document.createElement("option");
      optElement.value = option.id;
      optElement.textContent = option.name;
      if (selectedValue && option.id == selectedValue) {
        // So sánh giá trị, không phải kiểu
        optElement.selected = true;
      }
      select.appendChild(optElement);
    });
  }
}

function populateProductForm(form, product) {
  form.elements["name"].value = product.name || "";
  form.elements["description"].value = product.description || "";
  form.elements["price"].value = product.price || "";
  form.elements["original_price"].value = product.original_price || "";
  form.elements["discount_percentage"].value =
    product.discount_percentage || "";
  form.elements["gift_description"].value = product.gift_description || "";

  populateDropdown("brand_id", brandOptionsCache, product.brand_id);
  populateDropdown("type_id", typeOptionsCache, product.type_id);

  // Hiển thị ảnh hiện có
  const existingImagesContainer = document.getElementById(
    "existingImagesContainer"
  );
  if (existingImagesContainer) {
    existingImagesContainer.innerHTML = "<h4>Ảnh Hiện Có:</h4>";
    if (product.images && product.images.length > 0) {
      product.images.forEach((img) => {
        const displayImageUrl = img.image_url.startsWith("http")
          ? img.image_url
          : `http://127.0.0.1:8000${img.image_url}`;
        const imgDiv = document.createElement("div");
        imgDiv.className = "existing-image-item";
        imgDiv.innerHTML = `
                    <img src="${displayImageUrl}" alt="Ảnh sản phẩm ${img.id}">
                    <label>
                        <input type="radio" name="main_image_id" value="${
                          img.id
                        }" ${img.is_main_image ? "checked" : ""}> Ảnh chính
                    </label>
                    <label>
                        <input type="checkbox" name="images_to_delete[]" value="${
                          img.id
                        }" class="delete-image-checkbox"> Xóa ảnh này
                    </label>
                `;
        existingImagesContainer.appendChild(imgDiv);
      });
    } else {
      existingImagesContainer.innerHTML += "<p>Sản phẩm này chưa có ảnh.</p>";
    }
  }

  // Điền dữ liệu cho màu sắc và nhãn (nếu có)
  setupDynamicFields(
    "colorsContainer",
    getEmptyColorFieldHtml,
    "Thêm màu",
    false,
    product.colors || []
  );
  setupDynamicFields(
    "labelsContainer",
    getEmptyLabelFieldHtml,
    "Thêm nhãn",
    false,
    product.labels || []
  );
}

function getEmptyColorFieldHtml(
  color = { id: "", color_name: "", color_value: "" }
) {
  return `
        <div class="field-entry color-entry" data-color-id="${color.id || ""}">
            <input type="text" name="color_name[]" placeholder="Tên màu (VD: Đỏ)" value="${
              color.color_name || ""
            }" class="form-control">
            <input type="text" name="color_value[]" placeholder="Giá trị màu (VD: #FF0000)" value="${
              color.color_value || ""
            }" class="form-control">
            <button type="button" class="remove-field-btn btn-danger" onclick="this.parentElement.remove()">Xóa</button>
        </div>`;
}

function getEmptyLabelFieldHtml(label = { id: "", label_name: "" }) {
  return `
        <div class="field-entry label-entry" data-label-id="${label.id || ""}">
            <input type="text" name="label_name[]" placeholder="Tên nhãn (VD: Hàng mới về)" value="${
              label.label_name || ""
            }" class="form-control">
            <button type="button" class="remove-field-btn btn-danger" onclick="this.parentElement.remove()">Xóa</button>
        </div>`;
}

function setupDynamicFields(
  containerId,
  fieldHtmlFunction,
  addButtonText,
  addOneByDefault = true,
  existingData = []
) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Xóa nút "Thêm" cũ nếu có để tránh trùng lặp
  const oldAddButton = container.querySelector(".add-more-btn");
  if (oldAddButton) oldAddButton.remove();

  const fieldEntriesContainer = document.createElement("div");
  fieldEntriesContainer.className = "field-entries-list";
  container.appendChild(fieldEntriesContainer);

  if (existingData && existingData.length > 0) {
    existingData.forEach((item) => {
      fieldEntriesContainer.insertAdjacentHTML(
        "beforeend",
        fieldHtmlFunction(item)
      );
    });
  } else if (addOneByDefault) {
    fieldEntriesContainer.insertAdjacentHTML("beforeend", fieldHtmlFunction());
  }

  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.textContent = addButtonText;
  addButton.className = "add-more-btn btn-secondary";
  addButton.style.marginTop = "10px";
  addButton.onclick = () => {
    fieldEntriesContainer.insertAdjacentHTML("beforeend", fieldHtmlFunction());
  };
  container.appendChild(addButton);
}

async function handleProductFormSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const productId = new URLSearchParams(window.location.search).get("id");
  const submitButton = form.querySelector('button[type="submit"]');
  const originalButtonText = submitButton.textContent;
  submitButton.disabled = true;
  submitButton.textContent = "Đang xử lý...";

  const formData = new FormData();

  // Các trường cơ bản
  [
    "name",
    "brand_id",
    "type_id",
    "description",
    "price",
    "original_price",
    "discount_percentage",
    "gift_description",
  ].forEach((fieldName) => {
    if (form.elements[fieldName]) {
      formData.append(fieldName, form.elements[fieldName].value);
    }
  });

  // Ảnh mới tải lên
  const imageFilesInput = form.elements["images_files[]"]; // Sửa thành tên input đúng
  if (imageFilesInput && imageFilesInput.files.length > 0) {
    for (let i = 0; i < imageFilesInput.files.length; i++) {
      formData.append("images_files[]", imageFilesInput.files[i]);
    }
  }

  if (productId) {
    // Nếu là form sửa
    // Ảnh cần xóa
    document
      .querySelectorAll(".delete-image-checkbox:checked")
      .forEach((checkbox) => {
        formData.append("images_to_delete[]", checkbox.value);
      });
    // Ảnh chính
    const mainImageRadio = document.querySelector(
      'input[name="main_image_id"]:checked'
    );
    if (mainImageRadio) {
      formData.append("main_image_id", mainImageRadio.value);
    }
  }

  // Màu sắc
  document
    .querySelectorAll("#colorsContainer .color-entry")
    .forEach((entry, index) => {
      const colorId = entry.dataset.colorId;
      const colorName = entry.querySelector('input[name="color_name[]"]').value;
      const colorValue = entry.querySelector(
        'input[name="color_value[]"]'
      ).value;
      if (colorName.trim() !== "") {
        // Chỉ gửi nếu có tên màu
        if (productId && colorId)
          formData.append(`colors[${index}][id]`, colorId); // Gửi ID nếu là sửa và màu đã có
        formData.append(`colors[${index}][color_name]`, colorName);
        formData.append(`colors[${index}][color_value]`, colorValue);
      }
    });

  // Nhãn
  document
    .querySelectorAll("#labelsContainer .label-entry")
    .forEach((entry, index) => {
      const labelId = entry.dataset.labelId;
      const labelName = entry.querySelector('input[name="label_name[]"]').value;
      if (labelName.trim() !== "") {
        // Chỉ gửi nếu có tên nhãn
        if (productId && labelId)
          formData.append(`labels[${index}][id]`, labelId);
        formData.append(`labels[${index}][label_name]`, labelName);
      }
    });

  try {
    let response;
    if (productId) {
      // Laravel không nhận PUT với FormData trực tiếp, cần _method
      // fetchAdminAPI đã xử lý việc này: gửi POST và thêm _method='PUT'
      response = await fetchAdminAPI(
        `products/${productId}`,
        "PUT",
        formData,
        true
      );
    } else {
      response = await fetchAdminAPI("products", "POST", formData, true);
    }

    if (response) {
      showCustomAlert(
        "success",
        "Thành công!",
        `Sản phẩm đã được ${productId ? "cập nhật" : "tạo mới"} thành công.`
      );
      setTimeout(() => {
        window.location.href = "manage_products.html";
      }, 1500);
    }
  } catch (error) {
    // Lỗi đã được hiển thị bởi fetchAdminAPI
    console.error(
      `Lỗi khi ${productId ? "cập nhật" : "tạo mới"} sản phẩm:`,
      error
    );
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = originalButtonText;
  }
}
