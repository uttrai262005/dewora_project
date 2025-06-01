// admin/js/users.js

document.addEventListener("DOMContentLoaded", () => {
  if (!checkAdminAuth()) return;

  // Logic cho trang manage_users.html
  if (document.getElementById("usersTable")) {
    loadUsers(); // Tải lần đầu
    document
      .getElementById("searchUserButton")
      ?.addEventListener("click", () => {
        const searchTerm = document.getElementById("searchUserInput").value;
        loadUsers(1, searchTerm);
      });
    document
      .getElementById("searchUserInput")
      ?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          const searchTerm = document.getElementById("searchUserInput").value;
          loadUsers(1, searchTerm);
        }
      });
    // Optional: Add user button event listener if you implement user creation by admin
    // document.getElementById("addUserBtn")?.addEventListener("click", () => {
    //     window.location.href = "user_form.html";
    // });
  }

  // Logic cho trang user_form.html
  if (document.getElementById("userForm")) {
    initializeUserForm();
  }
});

let currentUserPage = 1;
let currentUserSearch = "";

async function loadUsers(page = 1, searchTerm = "") {
  currentUserPage = page;
  currentUserSearch = searchTerm;
  const usersTableBody = document
    .getElementById("usersTable")
    ?.querySelector("tbody");
  if (!usersTableBody) return;

  usersTableBody.innerHTML = '<tr><td colspan="7">Đang tải...</td></tr>';

  try {
    const perPage = 10;
    let endpoint = `users?page=${page}&per_page=${perPage}&sort_by=id&sort_order=desc`;
    if (searchTerm) {
      endpoint += `&search=${encodeURIComponent(searchTerm)}`;
    }
    const responseData = await fetchAdminAPI(endpoint);

    if (!responseData || !responseData.data || responseData.data.length === 0) {
      usersTableBody.innerHTML =
        '<tr><td colspan="7">Không tìm thấy người dùng nào.</td></tr>';
      // Chỉnh sửa ở đây:
      setupPaginationControls(
        responseData || {}, // Truyền responseData hoặc object rỗng
        "paginationControlsUsers", // Truyền ID dạng chuỗi
        loadUsers,
        currentUserSearch
      );
      return;
    }

    usersTableBody.innerHTML = "";
    responseData.data.forEach((user) => {
      const row = usersTableBody.insertRow();
      const avatarUrl = user.avatar_url
        ? user.avatar_url.startsWith("http")
          ? user.avatar_url
          : `${API_BASE_URL.replace("/api", "")}/storage/${user.avatar_url}`
        : "images/default-avatar.png";

      row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.name || "N/A"}</td>
                <td>${user.email || "N/A"}</td>
                <td><img src="${avatarUrl}" alt="${
        user.name || "Avatar"
      }" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;"></td>
                <td><span class="status-${
                  user.is_admin ? "active" : "inactive"
                }">${user.is_admin ? "Có" : "Không"}</span></td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td class="table-actions">
                    <button class="edit-user-btn btn-secondary" data-id="${
                      user.id
                    }">Sửa</button>
                    <button class="toggle-admin-btn btn-${
                      user.is_admin ? "warning" : "success"
                    }" data-id="${user.id}" data-is-admin="${user.is_admin}">
                        ${user.is_admin ? "Hủy Admin" : "Cấp Admin"}
                    </button>
                    <button class="delete-user-btn btn-danger" data-id="${
                      user.id
                    }">Xóa</button>
                </td>
            `;
    });

    attachUserActionListeners();
    setupPaginationControls(
      responseData, // Truyền responseData trực tiếp
      "paginationControlsUsers", // Truyền ID dạng chuỗi
      loadUsers,
      currentUserSearch
    );
  } catch (error) {
    console.error("Lỗi khi tải người dùng:", error);
    usersTableBody.innerHTML =
      '<tr><td colspan="7">Lỗi khi tải dữ liệu người dùng. Vui lòng thử lại.</td></tr>';
  }
}

function attachUserActionListeners() {
  document.querySelectorAll(".edit-user-btn").forEach((button) => {
    button.addEventListener("click", (e) => {
      const userId = e.target.dataset.id;
      window.location.href = `user_form.html?id=${userId}`;
    });
  });

  document.querySelectorAll(".delete-user-btn").forEach((button) => {
    button.addEventListener("click", async (e) => {
      const userId = e.target.dataset.id;
      // Prevent deleting the currently logged-in admin (simple check)
      const loggedInUser = getUser();
      if (loggedInUser && loggedInUser.id == userId) {
        showCustomAlert(
          "error",
          "Không thể xóa",
          "Bạn không thể xóa chính mình."
        );
        return;
      }

      const result = await Swal.fire({
        title: "Bạn chắc chắn muốn xóa?",
        text: "Người dùng này sẽ bị xóa vĩnh viễn!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Vâng, xóa nó!",
        cancelButtonText: "Hủy bỏ",
      });

      if (result.isConfirmed) {
        try {
          await fetchAdminAPI(`users/${userId}`, "DELETE");
          showCustomAlert(
            "success",
            "Đã xóa!",
            "Người dùng đã được xóa thành công."
          );
          loadUsers(currentUserPage, currentUserSearch);
        } catch (error) {
          console.error("Lỗi khi xóa người dùng:", error);
        }
      }
    });
  });

  async function handleToggleAdmin(userId) {
    try {
      const response = await fetchAdminAPI(
        `users/${userId}/toggle-admin`,
        "PUT"
      );
      if (response) {
        showCustomAlert(
          "success",
          "Thành công",
          response.message || "Đã thay đổi quyền admin."
        );
        loadUsers(currentUserPage, currentUserSearch); // Tải lại danh sách
      }
    } catch (error) {
      // fetchAdminAPI đã show alert lỗi rồi
      console.error("Lỗi khi thay đổi quyền admin:", error);
    }
  }

  // Trong users.js, ví dụ hàm xử lý xóa user
  async function handleDeleteUser(userId) {
    // ... (hiển thị confirm dialog)
    if (result.isConfirmed) {
      try {
        await fetchAdminAPI(`users/${userId}`, "DELETE");
        showCustomAlert("success", "Đã xóa", "Người dùng đã được xóa.");
        loadUsers(currentUserPage, currentUserSearch); // Tải lại
      } catch (error) {
        console.error("Lỗi khi xóa user:", error);
      }
    }
  }
  document.querySelectorAll(".toggle-admin-btn").forEach((button) => {
    button.addEventListener("click", async (e) => {
      const userId = e.target.dataset.id;
      const isAdmin =
        e.target.dataset.isAdmin === "true" || e.target.dataset.isAdmin === "1";
      const actionText = isAdmin ? "hủy quyền Admin" : "cấp quyền Admin";

      // Prevent de-admining the currently logged-in admin (simple check)
      const loggedInUser = getUser();
      if (loggedInUser && loggedInUser.id == userId && isAdmin) {
        showCustomAlert(
          "error",
          "Không thể thực hiện",
          "Bạn không thể tự hủy quyền Admin của chính mình."
        );
        return;
      }

      const result = await Swal.fire({
        title: `Xác nhận ${actionText}?`,
        text: `Bạn có muốn ${actionText} cho người dùng này không?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Xác nhận",
        cancelButtonText: "Hủy",
      });

      if (result.isConfirmed) {
        try {
          await fetchAdminAPI(`users/${userId}/toggle-admin`, "PUT");
          showCustomAlert(
            "success",
            "Thành công!",
            `Đã ${actionText} cho người dùng.`
          );
          loadUsers(currentUserPage, currentUserSearch);
        } catch (error) {
          console.error(`Lỗi khi ${actionText}:`, error);
        }
      }
    });
  });
}

async function initializeUserForm() {
  const form = document.getElementById("userForm");
  if (!form) return;

  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get("id");
  const formTitle = document.getElementById("userFormTitle");
  const avatarPreview = document.getElementById("avatarPreview");

  if (userId) {
    if (formTitle) formTitle.textContent = "Chỉnh Sửa Người Dùng";
    try {
      const user = await fetchAdminAPI(`users/${userId}`);
      if (user) {
        populateUserForm(form, user);
        if (avatarPreview) {
          const avatarUrl = user.avatar_url
            ? user.avatar_url.startsWith("http")
              ? user.avatar_url
              : `${API_BASE_URL.replace("/api", "")}/storage/${user.avatar_url}`
            : "images/default-avatar.png";
          avatarPreview.src = avatarUrl;
        }
      }
    } catch (error) {
      if (formTitle) formTitle.textContent = "Lỗi Tải Thông Tin Người Dùng";
      form.innerHTML =
        "<p>Không thể tải dữ liệu người dùng. Vui lòng thử lại.</p>";
    }
  } else {
    // This form is primarily for editing. If creating, redirect or handle differently.
    if (formTitle)
      formTitle.textContent = "Thêm Người Dùng Mới (Không khả dụng)";
    form.innerHTML =
      "<p>Chức năng thêm người dùng mới qua form này không được hỗ trợ. Người dùng nên đăng ký qua hệ thống.</p>";
    // To enable creation, you would need to ensure AdminUserController@store is implemented
    // and then remove the above lines and set formTitle.textContent = "Thêm Người Dùng Mới";
  }

  form.addEventListener("submit", handleUserFormSubmit);
}

function populateUserForm(form, user) {
  form.elements["user_id"].value = user.id;
  form.elements["name"].value = user.name || "";
  form.elements["email"].value = user.email || "";
  form.elements["is_admin"].value = user.is_admin ? "1" : "0";
  form.elements["phone_number"].value = user.phone_number || "";
  form.elements["gender"].value = user.gender || "";
  form.elements["birth_date"].value = user.birth_date || "";
}

async function handleUserFormSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const userId = form.elements["user_id"].value;
  const submitButton = form.querySelector('button[type="submit"]');
  const originalButtonText = submitButton.textContent;
  submitButton.disabled = true;
  submitButton.textContent = "Đang xử lý...";

  const data = {
    name: form.elements["name"].value,
    email: form.elements["email"].value,
    is_admin: form.elements["is_admin"].value === "1", // Convert to boolean for backend
    phone_number: form.elements["phone_number"].value,
    gender: form.elements["gender"].value,
    birth_date: form.elements["birth_date"].value,
    // Password changes should ideally be a separate, more secure process
    // and not part of a general admin edit form.
  };

  if (!userId) {
    showCustomAlert(
      "error",
      "Lỗi",
      "Không tìm thấy ID người dùng để cập nhật."
    );
    submitButton.disabled = false;
    submitButton.textContent = originalButtonText;
    return;
  }

  try {
    const response = await fetchAdminAPI(`users/${userId}`, "PUT", data);
    if (response) {
      showCustomAlert(
        "success",
        "Thành công!",
        "Thông tin người dùng đã được cập nhật."
      );
      setTimeout(() => {
        window.location.href = "manage_users.html";
      }, 1500);
    }
  } catch (error) {
    // Error already shown by fetchAdminAPI
    console.error("Lỗi khi cập nhật người dùng:", error);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = originalButtonText;
  }
}
