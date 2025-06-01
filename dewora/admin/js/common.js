const API_BASE_URL = "http://127.0.0.1:8000/api/admin";
const PUBLIC_API_BASE_URL = "http://127.0.0.1:8000/api";

/**
 * Lấy token xác thực từ localStorage.
 * @returns {string|null} Token hoặc null nếu không tìm thấy.
 */
function getAuthToken() {
  return localStorage.getItem("user_auth_token");
}

/**
 * Lấy thông tin người dùng từ localStorage.
 * @returns {object|null} Đối tượng người dùng hoặc null.
 */
function getUser() {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

/**
 * Kiểm tra xem người dùng đã đăng nhập và có phải là admin không.
 * Nếu không, chuyển hướng về trang đăng nhập.
 * @returns {boolean} True nếu là admin, false nếu không.
 */
function checkAdminAuth() {
  const token = getAuthToken();
  const user = getUser();
  if (!token || !user || !user.is_admin) {
    // Chuyển hướng về trang đăng nhập chính của trang người dùng
    // Giả sử trang Login.html nằm ở thư mục gốc, cùng cấp với thư mục 'admin'
    window.location.href = "../Login.html";
    return false;
  }
  return true;
}

/**
 * Hàm gọi API tập trung cho admin.
 * @param {string} endpoint Đường dẫn API (không bao gồm base URL).
 * @param {string} method Phương thức HTTP (GET, POST, PUT, DELETE).
 * @param {object|FormData|null} body Dữ liệu gửi đi.
 * @param {boolean} isFormData True nếu body là FormData, false nếu là JSON.
 * @returns {Promise<object|null>} Dữ liệu JSON từ API hoặc null nếu lỗi.
 */
async function fetchAdminAPI(
  endpoint,
  method = "GET",
  body = null,
  isFormData = false
) {
  if (!getAuthToken() || !getUser()?.is_admin) {
    // Kiểm tra lại phòng trường hợp checkAdminAuth chưa chạy
    showCustomAlert(
      "error",
      "Chưa xác thực",
      "Vui lòng đăng nhập với tư cách quản trị viên."
    );
    setTimeout(() => {
      window.location.href = "../Login.html";
    }, 2000);
    return null; // Hoặc throw new Error
  }

  const token = getAuthToken();
  const headers = {
    Accept: "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  // Không set Content-Type cho FormData, trình duyệt sẽ tự làm
  if (
    !isFormData &&
    body &&
    (method === "POST" || method === "PUT" || method === "PATCH")
  ) {
    headers["Content-Type"] = "application/json";
  }

  const config = {
    method: method,
    headers: headers,
  };

  if (body) {
    // Nếu là PUT và là FormData, Laravel cần _method trick
    if (method === "PUT" && isFormData) {
      body.append("_method", "PUT");
      config.method = "POST"; // Gửi như POST
    }
    config.body = isFormData ? body : JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/${endpoint}`, config);

    if (response.status === 401) {
      // Unauthorized hoặc token hết hạn
      localStorage.removeItem("user_auth_token");
      localStorage.removeItem("user");
      showCustomAlert("error", "Phiên hết hạn", "Vui lòng đăng nhập lại.");
      setTimeout(() => {
        window.location.href = "../Login.html";
      }, 2000);
      return null;
    }

    const responseBody = await response.text(); // Đọc body dạng text trước

    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseBody); // Thử parse JSON
      } catch (e) {
        errorData = {
          message: responseBody || `Lỗi HTTP! Status: ${response.status}`,
        };
      }
      console.error("Lỗi API:", errorData);
      let errorMessage = errorData.message || "Đã có lỗi xảy ra từ server.";
      if (errorData.errors) {
        // Hiển thị lỗi validation chi tiết hơn
        errorMessage += "\nChi tiết:\n";
        for (const field in errorData.errors) {
          errorMessage += `- ${field}: ${errorData.errors[field].join(", ")}\n`;
        }
      }
      showCustomAlert("error", "Lỗi Server", errorMessage, "var(--red_A700)");
      throw new Error(errorMessage);
    }

    if (response.status === 204 || responseBody.length === 0) {
      // No Content hoặc body rỗng
      return null;
    }
    return JSON.parse(responseBody); // Parse JSON nếu thành công và có body
  } catch (error) {
    console.error(`Lỗi khi gọi ${endpoint}:`, error);
    if (
      !error.message.includes("Lỗi HTTP") &&
      !error.message.includes("Lỗi Server")
    ) {
      // Tránh hiển thị alert trùng lặp
      showCustomAlert(
        "error",
        "Lỗi Mạng hoặc Xử lý",
        error.message || "Không thể kết nối đến server hoặc có lỗi xử lý.",
        "var(--red_A700)"
      );
    }
    throw error; // Ném lỗi ra để hàm gọi có thể bắt
  }
}

/**
 * Hàm hiển thị thông báo tùy chỉnh bằng SweetAlert2.
 * @param {'success'|'error'|'warning'|'info'|'question'} icon Loại icon.
 * @param {string} title Tiêu đề thông báo.
 * @param {string} text Nội dung thông báo.
 * @param {string} confirmButtonColor Màu nút xác nhận (CSS variable hoặc hex).
 */
function showCustomAlert(
  icon,
  title,
  text,
  confirmButtonColor = "var(--pink_400)"
) {
  if (typeof Swal !== "undefined") {
    Swal.fire({
      icon: icon,
      title: title,
      text: text,
      confirmButtonColor: confirmButtonColor,
      customClass: {
        confirmButton: "swal2-confirm-button",
      },
    });
  } else {
    alert(`${title}\n${text}`); // Fallback nếu SweetAlert2 không có
  }
}

/**
 * Định dạng số thành tiền tệ Việt Nam (VND).
 * @param {number} amount Số tiền.
 * @returns {string} Chuỗi tiền tệ đã định dạng.
 */
function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(parseFloat(amount))) {
    return "N/A";
  }
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

/**
 * Thiết lập các nút phân trang dựa trên thông tin meta từ API.
 * @param {object} meta - Đối tượng meta từ phản hồi API (Laravel Pagination).
 * @param {string} controlsContainerId - ID của phần tử chứa các nút phân trang.
 * @param {function} loadDataFunction - Hàm sẽ được gọi để tải dữ liệu khi chuyển trang.
 * @param {...any} args - Các đối số bổ sung sẽ được truyền cho loadDataFunction (ví dụ: searchTerm, statusFilter).
 */
function setupPaginationControls(
  meta,
  controlsContainerId,
  loadDataFunction,
  ...args
) {
  const controlsContainer = document.getElementById(controlsContainerId);
  if (!controlsContainer || !meta || !meta.links || !meta.total) {
    if (controlsContainer) controlsContainer.innerHTML = "";
    return;
  }

  controlsContainer.innerHTML = ""; // Xóa các nút cũ

  // Nếu chỉ có 1 trang, không hiển thị phân trang
  if (meta.last_page <= 1) {
    return;
  }

  const currentPage = meta.current_page;
  const lastPage = meta.last_page;

  // Nút "Trước"
  if (meta.links[0].url) {
    const prevButton = document.createElement("button");
    prevButton.textContent = "Trước";
    prevButton.classList.add("pagination-btn");
    prevButton.addEventListener("click", () => {
      loadDataFunction(currentPage - 1, ...args); // Truyền các đối số bổ sung
    });
    controlsContainer.appendChild(prevButton);
  } else {
    const prevButton = document.createElement("button");
    prevButton.textContent = "Trước";
    prevButton.classList.add("pagination-btn", "disabled");
    prevButton.disabled = true;
    controlsContainer.appendChild(prevButton);
  }

  // Các nút số trang
  // Hiển thị một số nút xung quanh trang hiện tại
  const maxButtons = 5; // Số lượng nút trang tối đa hiển thị
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(lastPage, startPage + maxButtons - 1);

  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  if (startPage > 1) {
    const firstPageBtn = document.createElement("button");
    firstPageBtn.textContent = "1";
    firstPageBtn.classList.add("pagination-btn");
    firstPageBtn.addEventListener("click", () => {
      loadDataFunction(1, ...args);
    });
    controlsContainer.appendChild(firstPageBtn);
    if (startPage > 2) {
      const ellipsis = document.createElement("span");
      ellipsis.textContent = "...";
      controlsContainer.appendChild(ellipsis);
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    const pageButton = document.createElement("button");
    pageButton.textContent = i;
    pageButton.classList.add("pagination-btn");
    if (i === currentPage) {
      pageButton.classList.add("active");
    }
    pageButton.addEventListener("click", () => {
      loadDataFunction(i, ...args); // Truyền các đối số bổ sung
    });
    controlsContainer.appendChild(pageButton);
  }

  if (endPage < lastPage) {
    if (endPage < lastPage - 1) {
      const ellipsis = document.createElement("span");
      ellipsis.textContent = "...";
      controlsContainer.appendChild(ellipsis);
    }
    const lastPageBtn = document.createElement("button");
    lastPageBtn.textContent = lastPage;
    lastPageBtn.classList.add("pagination-btn");
    lastPageBtn.addEventListener("click", () => {
      loadDataFunction(lastPage, ...args);
    });
    controlsContainer.appendChild(lastPageBtn);
  }

  // Nút "Sau"
  if (meta.links[meta.links.length - 1].url) {
    const nextButton = document.createElement("button");
    nextButton.textContent = "Sau";
    nextButton.classList.add("pagination-btn");
    nextButton.addEventListener("click", () => {
      loadDataFunction(currentPage + 1, ...args); // Truyền các đối số bổ sung
    });
    controlsContainer.appendChild(nextButton);
  } else {
    const nextButton = document.createElement("button");
    nextButton.textContent = "Sau";
    nextButton.classList.add("pagination-btn", "disabled");
    nextButton.disabled = true;
    controlsContainer.appendChild(nextButton);
  }
}

/**
 * Xử lý đăng xuất cho admin.
 */
async function handleAdminLogout() {
  try {
    // Gọi API logout của backend (thường không có prefix /admin)
    const token = getAuthToken();
    if (token) {
      await fetch(`${PUBLIC_API_BASE_URL}/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
    }
  } catch (error) {
    console.warn(
      "Lỗi khi gọi API đăng xuất (có thể bỏ qua nếu token đã được xóa cục bộ).",
      error
    );
  } finally {
    localStorage.removeItem("user_auth_token");
    localStorage.removeItem("user");
    showCustomAlert("success", "Đăng xuất", "Bạn đã đăng xuất thành công.");
    setTimeout(() => {
      window.location.href = "../Login.html";
    }, 1500);
  }
}

// Gắn event listener cho nút logout chung (nếu có trong header của mọi trang)
document.addEventListener("DOMContentLoaded", () => {
  const logoutButton = document.getElementById("adminLogoutBtn"); // Đảm bảo nút logout có ID này
  if (logoutButton) {
    logoutButton.addEventListener("click", handleAdminLogout);
  }
});
/**
 * Hiển thị overlay loading với thông báo tùy chỉnh.
 * @param {string} message Thông báo hiển thị trên overlay.
 */
function showLoadingOverlay(message = "Đang xử lý...") {
  const overlay = document.getElementById("loadingOverlay");
  const loadingMessage = document.getElementById("loadingMessage");
  if (overlay) {
    overlay.style.display = "flex"; // Sử dụng flex để căn giữa nội dung
    if (loadingMessage) {
      loadingMessage.textContent = message;
    }
  }
}
/**
 * Ẩn overlay loading.
 */
function hideLoadingOverlay() {
  const overlay = document.getElementById("loadingOverlay");
  if (overlay) {
    overlay.style.display = "none";
  }
}
