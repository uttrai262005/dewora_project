// js/scriptttk.js
document.addEventListener("DOMContentLoaded", () => {
  const API_BASE_URL = "http://127.0.0.1:8000/api";

  const userAuthToken = localStorage.getItem("user_auth_token");
  const storedUser = JSON.parse(localStorage.getItem("user")); // Đổi tên để tránh nhầm lẫn với biến user toàn cục (nếu có)

  const menuItems = document.querySelectorAll(
    ".account-menu ul li, .edit-account-link"
  );
  const contentSections = document.querySelectorAll(".account-content-section");
  // const accountContentDiv = document.querySelector(".account-content"); // Không thấy dùng trực tiếp

  const userGreetingName = document.getElementById("user-greeting-name");
  const fullnameInput = document.getElementById("fullname-input");
  const birthDaySelect = document.getElementById("birth-day");
  const birthMonthSelect = document.getElementById("birth-month");
  const birthYearSelect = document.getElementById("birth-year");
  const currentPhoneDisplay = document.getElementById("current-phone"); // Đổi tên để rõ ràng là display element
  const currentEmailDisplay = document.getElementById("current-email"); // Đổi tên

  if (!userAuthToken || !storedUser) {
    Swal.fire({
      title: "Yêu cầu đăng nhập",
      text: "Vui lòng đăng nhập để quản lý tài khoản.",
      icon: "warning",
      confirmButtonText: "Đến trang đăng nhập",
    }).then(() => {
      window.location.href = "login.html";
    });
    return;
  }

  function populateDateSelects() {
    if (!birthDaySelect || !birthMonthSelect || !birthYearSelect) return;
    for (let i = 1; i <= 31; i++) birthDaySelect.add(new Option(i, i));
    for (let i = 1; i <= 12; i++)
      birthMonthSelect.add(new Option(`Tháng ${i}`, i));
    const currentYear = new Date().getFullYear();
    for (let i = currentYear; i >= currentYear - 100; i--)
      birthYearSelect.add(new Option(i, i));
  }
  populateDateSelects();

  async function loadUserProfile() {
    console.log("TTTK_JS: Loading user profile...");
    if (storedUser) {
      if (userGreetingName)
        userGreetingName.textContent = `Hi, ${storedUser.name || "Người Dùng"}`;
      if (fullnameInput) fullnameInput.value = storedUser.name || "";
      if (currentEmailDisplay)
        currentEmailDisplay.textContent = storedUser.email || "Chưa cập nhật";
    }
    try {
      const response = await fetch(`${API_BASE_URL}/user/profile`, {
        headers: {
          Authorization: `Bearer ${userAuthToken}`,
          Accept: "application/json",
        },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
            `Failed to load profile. Status: ${response.status}`
        );
      }
      const profileData = await response.json();
      console.log("TTTK_JS: Profile data received:", profileData);

      if (fullnameInput)
        fullnameInput.value = profileData.name || storedUser.name || "";
      if (userGreetingName)
        userGreetingName.textContent = `Hi, ${
          profileData.name || storedUser.name || "Người Dùng"
        }`;
      if (currentEmailDisplay)
        currentEmailDisplay.textContent =
          profileData.email || storedUser.email || "Chưa cập nhật";
      if (currentPhoneDisplay)
        currentPhoneDisplay.textContent =
          profileData.phone_number || "Cập nhật số điện thoại";

      if (profileData.gender) {
        const genderRadio = document.querySelector(
          `input[name="gender"][value="${profileData.gender}"]`
        );
        if (genderRadio) genderRadio.checked = true;
      }
      if (
        profileData.birth_date &&
        birthDaySelect &&
        birthMonthSelect &&
        birthYearSelect
      ) {
        const [year, month, day] = profileData.birth_date.split("-");
        birthDaySelect.value = parseInt(day);
        birthMonthSelect.value = parseInt(month);
        birthYearSelect.value = parseInt(year);
      }
      const avatarUrl =
        profileData.avatar_url ||
        "https://hoanghamobile.com/tin-tuc/wp-content/uploads/2024/03/avatar-trang-86.jpg";
      const sidebarAvatar = document.getElementById("user-avatar-sidebar");
      const contentAvatar = document.getElementById("user-avatar-content");
      if (sidebarAvatar) sidebarAvatar.src = avatarUrl;
      if (contentAvatar) contentAvatar.src = avatarUrl;
    } catch (error) {
      console.error("TTTK_JS: Error loading full user profile:", error);
      // Fallback to storedUser if API fails
    }
  }

  const saveProfileInfoBtn = document.getElementById("save-profile-info");
  if (saveProfileInfoBtn) {
    saveProfileInfoBtn.addEventListener("click", async () => {
      const name = fullnameInput.value;
      const gender = document.querySelector(
        'input[name="gender"]:checked'
      )?.value;
      const day = birthDaySelect.value;
      const month = birthMonthSelect.value;
      const year = birthYearSelect.value;
      let birth_date = null;
      if (day && month && year && day !== "" && month !== "" && year !== "") {
        birth_date = `${year}-${String(month).padStart(2, "0")}-${String(
          day
        ).padStart(2, "0")}`;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/user/profile/update`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${userAuthToken}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name, gender, birth_date }),
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.message || "Cập nhật thất bại.");
        Swal.fire(
          "Thành công",
          "Thông tin tài khoản đã được cập nhật.",
          "success"
        );
        if (storedUser) {
          // Cập nhật lại storedUser để UI nhất quán nếu không gọi lại loadUserProfile() ngay
          storedUser.name = name;
          // Cập nhật các trường khác nếu có
          localStorage.setItem("user", JSON.stringify(storedUser));
        }
        loadUserProfile();
      } catch (error) {
        Swal.fire("Lỗi", error.message, "error");
      }
    });
  }

  async function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    console.log("TTTK_JS: Avatar file selected:", file.name);

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const response = await fetch(`${API_BASE_URL}/user/avatar/update`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${userAuthToken}`,
          Accept: "application/json",
        },
        body: formData,
      });
      const result = await response.json();
      console.log("TTTK_JS: Avatar upload response:", result);
      if (!response.ok)
        throw new Error(result.message || "Tải lên avatar thất bại.");

      Swal.fire("Thành công", "Avatar đã được cập nhật.", "success");
      if (document.getElementById("user-avatar-sidebar"))
        document.getElementById("user-avatar-sidebar").src = result.avatar_url;
      if (document.getElementById("user-avatar-content"))
        document.getElementById("user-avatar-content").src = result.avatar_url;
      // Cập nhật user trong localStorage nếu API trả về thông tin user mới
      if (result.user && result.user.avatar_url) {
        storedUser.avatar_url = result.user.avatar_url; // Giả sử API trả về user object
        localStorage.setItem("user", JSON.stringify(storedUser));
      } else if (result.avatar_url) {
        // Hoặc chỉ trả về avatar_url
        storedUser.avatar_url = result.avatar_url;
        localStorage.setItem("user", JSON.stringify(storedUser));
      }
    } catch (error) {
      console.error("TTTK_JS: Avatar upload error:", error);
      Swal.fire("Lỗi", error.message, "error");
    }
  }

  const avatarContentContainer = document.querySelector(
    "#thong-tin-tai-khoan .avatar-container"
  );
  const avatarContentInput = document.getElementById("avatar-upload-content");
  if (avatarContentContainer && avatarContentInput) {
    avatarContentContainer.addEventListener("click", () =>
      avatarContentInput.click()
    );
    avatarContentInput.addEventListener("change", handleAvatarUpload);
  }
  const avatarSidebarContainer = document.querySelector(
    ".sidebar-avatar .avatar-container"
  );
  const avatarSidebarInput = document.getElementById("avatar-upload-sidebar");
  if (avatarSidebarContainer && avatarSidebarInput) {
    avatarSidebarContainer.addEventListener("click", () =>
      avatarSidebarInput.click()
    );
    avatarSidebarInput.addEventListener("change", handleAvatarUpload);
  }
  const updatePhoneBtn = document.getElementById("update-phone-btn");
  if (updatePhoneBtn) {
    updatePhoneBtn.addEventListener("click", async () => {
      const { value: newPhoneNumber } = await Swal.fire({
        title: "Cập nhật Số điện thoại",
        input: "tel", // Sử dụng type 'tel' cho input số điện thoại
        inputValue: currentPhoneDisplay
          ? currentPhoneDisplay.textContent.startsWith("Cập nhật")
            ? ""
            : currentPhoneDisplay.textContent
          : "",
        inputPlaceholder: "Nhập số điện thoại mới",
        showCancelButton: true,
        confirmButtonText: "Cập nhật",
        cancelButtonText: "Hủy",
        inputValidator: (value) => {
          if (!value) {
            return "Bạn cần nhập số điện thoại!";
          }
          // Regex cơ bản để kiểm tra định dạng SĐT Việt Nam (có thể tùy chỉnh thêm)
          const phoneRegex = /^(0[3|5|7|8|9])+([0-9]{8})\b$/;
          if (!phoneRegex.test(value)) {
            return "Số điện thoại không hợp lệ!";
          }
        },
      });

      if (newPhoneNumber) {
        console.log(
          "TTTK_JS: Attempting to update phone number to:",
          newPhoneNumber
        );
        try {
          const response = await fetch(`${API_BASE_URL}/user/phone/update`, {
            // Sử dụng endpoint đã có trong UserController
            method: "PUT",
            headers: {
              Authorization: `Bearer ${userAuthToken}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({ phone_number: newPhoneNumber }),
          });
          const result = await response.json();
          console.log("TTTK_JS: Update phone number response:", result);
          if (!response.ok) {
            throw new Error(
              result.message || "Cập nhật số điện thoại thất bại."
            );
          }
          Swal.fire(
            "Thành công",
            result.message || "Số điện thoại đã được cập nhật.",
            "success"
          );
          loadUserProfile(); // Tải lại thông tin người dùng để hiển thị SĐT mới
        } catch (error) {
          console.error("TTTK_JS: Update phone number error:", error);
          Swal.fire("Lỗi", error.message, "error");
        }
      }
    });
  }
  // --- Cập nhật Email ---
  const updateEmailBtn = document.getElementById("update-email-btn");
  if (updateEmailBtn) {
    updateEmailBtn.addEventListener("click", async () => {
      const { value: newEmail } = await Swal.fire({
        title: "Cập nhật Email",
        input: "email",
        inputValue: currentEmailDisplay ? currentEmailDisplay.textContent : "",
        inputPlaceholder: "Nhập email mới của bạn",
        showCancelButton: true,
        confirmButtonText: "Cập nhật",
        cancelButtonText: "Hủy",
        inputValidator: (value) => {
          if (!value) return "Bạn cần nhập địa chỉ email!";
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) return "Địa chỉ email không hợp lệ!";
        },
      });

      if (newEmail) {
        console.log("TTTK_JS: Attempting to update email to:", newEmail);
        try {
          const response = await fetch(`${API_BASE_URL}/user/email/update`, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${userAuthToken}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({ email: newEmail }),
          });
          const result = await response.json();
          console.log("TTTK_JS: Update email response:", result);
          if (!response.ok)
            throw new Error(result.message || "Cập nhật email thất bại.");
          Swal.fire(
            "Thành công",
            result.message || "Yêu cầu cập nhật email đã được gửi.",
            "success"
          );
          loadUserProfile();
        } catch (error) {
          console.error("TTTK_JS: Update email error:", error);
          Swal.fire("Lỗi", error.message, "error");
        }
      }
    });
  }

  // --- Thay đổi mật khẩu ---
  const changePasswordBtn = document.getElementById("change-password-btn");
  if (changePasswordBtn) {
    changePasswordBtn.addEventListener("click", async () => {
      const { value: formValues } = await Swal.fire({
        title: "Đổi mật khẩu",
        html:
          '<input type="password" id="swal-input-current-password" class="swal2-input" placeholder="Mật khẩu hiện tại">' +
          '<input type="password" id="swal-input-new-password" class="swal2-input" placeholder="Mật khẩu mới">' +
          '<input type="password" id="swal-input-confirm-password" class="swal2-input" placeholder="Xác nhận mật khẩu mới">',
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: "Đổi mật khẩu",
        cancelButtonText: "Hủy",
        preConfirm: () => {
          const currentPassword = document.getElementById(
            "swal-input-current-password"
          ).value;
          const newPassword = document.getElementById(
            "swal-input-new-password"
          ).value;
          const confirmPassword = document.getElementById(
            "swal-input-confirm-password"
          ).value;
          if (!currentPassword || !newPassword || !confirmPassword) {
            Swal.showValidationMessage(`Vui lòng nhập đầy đủ thông tin`);
            return false;
          }
          if (newPassword !== confirmPassword) {
            Swal.showValidationMessage(`Mật khẩu mới không khớp`);
            return false;
          }
          if (newPassword.length < 8) {
            Swal.showValidationMessage(`Mật khẩu mới phải có ít nhất 8 ký tự`);
            return false;
          }
          return {
            current_password: currentPassword,
            password: newPassword,
            password_confirmation: confirmPassword,
          };
        },
      });

      if (formValues) {
        console.log(
          "TTTK_JS: Attempting to change password with data:",
          formValues
        );
        try {
          const response = await fetch(`${API_BASE_URL}/user/password/change`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${userAuthToken}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(formValues),
          });
          const result = await response.json();
          console.log("TTTK_JS: Change password response:", result);
          if (!response.ok)
            throw new Error(result.message || "Đổi mật khẩu thất bại.");
          Swal.fire(
            "Thành công",
            result.message || "Mật khẩu đã được thay đổi.",
            "success"
          );
        } catch (error) {
          console.error("TTTK_JS: Change password error:", error);
          Swal.fire("Lỗi", error.message, "error");
        }
      }
    });
  }

  async function loadAddresses() {
    const container = document.getElementById("address-list-container");
    const noAddressMessage = document.getElementById("no-address-message");
    const addEditForm = document.getElementById("add-edit-address-form");
    const formTitle = document.getElementById("address-form-title");
    const addressIdInput = document.getElementById("address-id");
    if (
      !container ||
      !noAddressMessage ||
      !addEditForm ||
      !formTitle ||
      !addressIdInput
    ) {
      console.error(
        "TTTK_JS: One or more address related elements not found. Skipping loadAddresses."
      );
      return; // Exit if elements are missing
    }
    // Reset form fields
    function resetAddressForm() {
      addEditForm.style.display = "none";
      formTitle.textContent = "Thêm địa chỉ mới";
      addressIdInput.value = "";
      document.getElementById("address-fullname").value = "";
      document.getElementById("address-phone").value = "";
      document.getElementById("address-province").value = "";
      document.getElementById("address-district").value = "";
      document.getElementById("address-ward").value = "";
      document.getElementById("address-street").value = "";
      document.getElementById("address-is-default").checked = false;
    }

    document
      .getElementById("btn-show-add-address-form")
      .addEventListener("click", () => {
        resetAddressForm();
        addEditForm.style.display = "block";
      });
    document
      .getElementById("btn-cancel-address-form")
      .addEventListener("click", () => {
        resetAddressForm();
      });

    // Save/Update Address
    document
      .getElementById("btn-save-address")
      .addEventListener("click", async () => {
        const addressData = {
          full_name: document.getElementById("address-fullname").value,
          phone_number: document.getElementById("address-phone").value,
          province: document.getElementById("address-province").value,
          district: document.getElementById("address-district").value,
          ward: document.getElementById("address-ward").value,
          street_address: document.getElementById("address-street").value,
          is_default: document.getElementById("address-is-default").checked,
        };
        // Basic Validation
        if (
          !addressData.full_name ||
          !addressData.phone_number ||
          !addressData.province ||
          !addressData.district ||
          !addressData.ward ||
          !addressData.street_address
        ) {
          Swal.fire("Lỗi", "Vui lòng điền đầy đủ thông tin bắt buộc.", "error");
          return;
        }

        const addressId = addressIdInput.value;
        const method = addressId ? "PUT" : "POST";
        const url = addressId
          ? `${API_BASE_URL}/addresses/${addressId}`
          : `${API_BASE_URL}/addresses`;

        try {
          const response = await fetch(url, {
            method: method,
            headers: {
              Authorization: `Bearer ${userAuthToken}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(addressData),
          });
          const result = await response.json();
          if (!response.ok)
            throw new Error(result.message || "Lưu địa chỉ thất bại.");
          Swal.fire(
            "Thành công",
            `Địa chỉ đã được ${addressId ? "cập nhật" : "thêm mới"}.`,
            "success"
          );
          resetAddressForm();
          loadAddresses(); // Refresh list
        } catch (error) {
          Swal.fire("Lỗi", error.message, "error");
        }
      });

    container.innerHTML = "<p>Đang tải địa chỉ...</p>";
    noAddressMessage.style.display = "none";
    try {
      const response = await fetch(`${API_BASE_URL}/addresses`, {
        headers: {
          Authorization: `Bearer ${userAuthToken}`,
          Accept: "application/json",
        },
      });
      if (!response.ok) throw new Error("Không thể tải địa chỉ.");
      const addresses = await response.json();

      if (addresses.length === 0) {
        container.innerHTML = "";
        noAddressMessage.style.display = "block";
        return;
      }

      container.innerHTML = addresses
        .map(
          (addr) => `
                <div class="address-item" data-id="${addr.id}">
                    <h4>${addr.full_name} ${
            addr.is_default
              ? '<span style="font-size:0.7em; color:green;">(Mặc định)</span>'
              : ""
          }</h4>
                    <p>ĐT: ${addr.phone_number}</p>
                    <p>${addr.street_address}, ${addr.ward}, ${
            addr.district
          }, ${addr.province}</p>
                    <div class="address-actions">
                        <button class="update-btn edit-address-btn" style="background-color: #f0ad4e;">Sửa</button>
                        <button class="update-btn delete-address-btn" style="background-color: #d9534f;">Xóa</button>
                        ${
                          !addr.is_default
                            ? '<button class="update-btn set-default-address-btn" style="background-color: #5bc0de;">Đặt làm mặc định</button>'
                            : ""
                        }
                    </div>
                </div>
            `
        )
        .join("");

      // Add event listeners for edit, delete, set default
      container.querySelectorAll(".edit-address-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const item = e.target.closest(".address-item");
          const id = item.dataset.id;
          const addrToEdit = addresses.find((a) => a.id == id);
          if (addrToEdit) {
            formTitle.textContent = "Chỉnh sửa địa chỉ";
            addressIdInput.value = addrToEdit.id;
            document.getElementById("address-fullname").value =
              addrToEdit.full_name;
            document.getElementById("address-phone").value =
              addrToEdit.phone_number;
            document.getElementById("address-province").value =
              addrToEdit.province;
            document.getElementById("address-district").value =
              addrToEdit.district;
            document.getElementById("address-ward").value = addrToEdit.ward;
            document.getElementById("address-street").value =
              addrToEdit.street_address;
            document.getElementById("address-is-default").checked =
              addrToEdit.is_default;
            addEditForm.style.display = "block";
            addEditForm.scrollIntoView({ behavior: "smooth" });
          }
        });
      });
      container.querySelectorAll(".delete-address-btn").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          const item = e.target.closest(".address-item");
          const id = item.dataset.id;
          Swal.fire({
            title: "Xác nhận xóa",
            text: "Bạn có chắc muốn xóa địa chỉ này?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonText: "Hủy",
            confirmButtonText: "Xóa",
          }).then(async (result) => {
            if (result.isConfirmed) {
              try {
                const res = await fetch(`${API_BASE_URL}/addresses/${id}`, {
                  method: "DELETE",
                  headers: {
                    Authorization: `Bearer ${userAuthToken}`,
                    Accept: "application/json",
                  },
                });
                if (!res.ok) throw new Error("Xóa thất bại.");
                Swal.fire("Đã xóa!", "Địa chỉ đã được xóa.", "success");
                loadAddresses();
              } catch (err) {
                Swal.fire("Lỗi!", err.message, "error");
              }
            }
          });
        });
      });
      container.querySelectorAll(".set-default-address-btn").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          const item = e.target.closest(".address-item");
          const id = item.dataset.id;
          try {
            const res = await fetch(
              `${API_BASE_URL}/addresses/${id}/set-default`,
              {
                method: "POST", // Or PUT
                headers: {
                  Authorization: `Bearer ${userAuthToken}`,
                  Accept: "application/json",
                },
              }
            );
            if (!res.ok) throw new Error("Đặt làm mặc định thất bại.");
            Swal.fire(
              "Thành công!",
              "Địa chỉ đã được đặt làm mặc định.",
              "success"
            );
            loadAddresses();
          } catch (err) {
            Swal.fire("Lỗi!", err.message, "error");
          }
        });
      });
    } catch (error) {
      console.error("Error loading addresses:", error);
      container.innerHTML = `<p>Không thể tải địa chỉ. ${error.message}</p>`;
    }
  }
  const wishlistItemsContainer = document.getElementById(
    "wishlist-items-container"
  );
  const noWishlistMessage = document.getElementById("no-wishlist-message");

  async function loadWishlist() {
    if (!wishlistItemsContainer || !noWishlistMessage) {
      console.error(
        "TTTK_JS: Wishlist container or message element not found."
      );
      return;
    }

    if (!userAuthToken) {
      Swal.fire(
        "Lỗi",
        "Vui lòng đăng nhập để xem danh sách yêu thích.",
        "error"
      );
      wishlistItemsContainer.innerHTML = "";
      noWishlistMessage.textContent =
        "Vui lòng đăng nhập để xem danh sách yêu thích.";
      noWishlistMessage.style.display = "block";
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/wishlist`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${userAuthToken}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const errorResult = await response.json().catch(() => null);
        throw new Error(
          errorResult?.message ||
            `Không thể tải danh sách yêu thích. Status: ${response.status}`
        );
      }

      const wishlistItems = await response.json();
      wishlistItemsContainer.innerHTML = ""; // Clear previous items

      if (wishlistItems.length === 0) {
        noWishlistMessage.textContent = "Danh sách yêu thích của bạn trống.";
        noWishlistMessage.style.display = "block";
      } else {
        noWishlistMessage.style.display = "none";
        wishlistItems.forEach((item) => {
          // GIẢ SỬ: item.image_url là tên cột hình ảnh bạn đã sửa
          // Nếu tên cột khác (ví dụ: item.image), hãy thay đổi tương ứng.
          const imageUrl =
            item.image_url || item.image || "img/placeholder.png";
          const productElement = document.createElement("div");
          productElement.classList.add("product-item-account"); // Class cho styling
          productElement.innerHTML = `
                        <a href="ctsp.html?id=${
                          item.id
                        }" class="product-link-account" style="text-decoration:none;">
                            <img src="${imageUrl}" alt="${
            item.name
          }" class="product-image-account">
                            <div class="product-info-account">
                                <h4  class="product-name-account">${
                                  item.name
                                }</h4>
                                <p class="product-price-account">${parseFloat(
                                  item.price
                                ).toLocaleString("vi-VN")}₫</p>
                            </div>
                        </a>
                        <div class="product-actions-account">
                            <button class="btn-remove-wishlist" data-product-id="${
                              item.id
                            }" title="Xóa khỏi Yêu thích">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                            <button class="btn-add-to-cart-wishlist" data-product-id="${
                              item.id
                            }" title="Thêm vào giỏ hàng">
                                <i class="fas fa-cart-plus"></i> Thêm vào giỏ hàng
                            </button>
                        </div>
                    `;
          wishlistItemsContainer.appendChild(productElement);
        });
      }
    } catch (error) {
      console.error("TTTK_JS: Lỗi khi tải danh sách yêu thích:", error);
      Swal.fire(
        "Lỗi",
        `Không thể tải danh sách yêu thích: ${error.message}`,
        "error"
      );
      wishlistItemsContainer.innerHTML = "";
      noWishlistMessage.textContent =
        "Đã xảy ra lỗi khi tải danh sách yêu thích.";
      noWishlistMessage.style.display = "block";
    }
  }
  /**
   * Adds an item to the cart.
   * @param {string} productId - The ID of the product to add.
   */
  async function addItemToCart(productId) {
    if (!userAuthToken) {
      Swal.fire({
        title: "Yêu cầu đăng nhập",
        text: "Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng.",
        icon: "info",
        confirmButtonText: "Đăng nhập",
        showCancelButton: true,
      }).then((result) => {
        if (result.isConfirmed) {
          window.location.href = "login.html";
        }
      });
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/cart/add`, {
        // Endpoint của bạn để thêm vào giỏ hàng
        method: "POST",
        headers: {
          Authorization: `Bearer ${userAuthToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          product_id: productId,
          quantity: 1, // Mặc định thêm 1 sản phẩm
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            `Không thể thêm vào giỏ hàng. Status: ${response.status}`
        );
      }

      Swal.fire(
        "Thành công!",
        result.message || "Sản phẩm đã được thêm vào giỏ hàng.",
        "success"
      );

      // Cập nhật số lượng giỏ hàng trên header
      if (typeof updateCartDisplayCountOnHeader === "function") {
        updateCartDisplayCountOnHeader();
      } else {
        console.warn(
          "TTTK_JS: Hàm updateCartDisplayCountOnHeader không tồn tại để cập nhật UI."
        );
        // Bạn có thể cần tự fetch lại số lượng cart ở đây nếu hàm đó không global
      }
    } catch (error) {
      console.error("TTTK_JS: Lỗi khi thêm sản phẩm vào giỏ hàng:", error);
      Swal.fire(
        "Lỗi",
        `Không thể thêm vào giỏ hàng: ${error.message}`,
        "error"
      );
    }
  }
  if (wishlistItemsContainer) {
    wishlistItemsContainer.addEventListener("click", async (event) => {
      const target = event.target.closest("button"); // Tìm button gần nhất được click
      if (!target) return;

      const productId = target.dataset.productId;
      if (!productId) return;

      if (target.classList.contains("btn-remove-wishlist")) {
        // Xử lý xóa khỏi wishlist (code này bạn có thể đã có hoặc cần thêm)
        console.log(
          "TTTK_JS: Clicked remove from wishlist, product ID:",
          productId
        );
        Swal.fire({
          title: "Xác nhận xóa",
          text: "Bạn có chắc chắn muốn xóa sản phẩm này khỏi danh sách yêu thích?",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#d33",
          cancelButtonColor: "#3085d6",
          confirmButtonText: "Xóa",
          cancelButtonText: "Hủy",
        }).then(async (result) => {
          if (result.isConfirmed) {
            try {
              const response = await fetch(
                `${API_BASE_URL}/wishlist/${productId}`,
                {
                  method: "DELETE",
                  headers: {
                    Authorization: `Bearer ${userAuthToken}`,
                    Accept: "application/json",
                  },
                }
              );
              const data = await response.json();
              if (!response.ok) {
                throw new Error(data.message || "Không thể xóa sản phẩm.");
              }
              Swal.fire(
                "Đã xóa!",
                data.message ||
                  "Sản phẩm đã được xóa khỏi danh sách yêu thích.",
                "success"
              );
              loadWishlist(); // Tải lại danh sách yêu thích
            } catch (error) {
              Swal.fire("Lỗi!", error.message, "error");
            }
          }
        });
      } else if (target.classList.contains("btn-add-to-cart-wishlist")) {
        // Xử lý thêm vào giỏ hàng
        console.log(
          "TTTK_JS: Clicked add to cart from wishlist, product ID:",
          productId
        );
        addItemToCart(productId);
      }
    });
  }
  async function loadReorderItems() {
    const container = document.getElementById("reorder-items-container");
    const noReorderMessage = document.getElementById("no-reorder-message");
    container.innerHTML = "<p>Đang tải sản phẩm đã mua...</p>";
    noReorderMessage.style.display = "none";
    try {
      const response = await fetch(`${API_BASE_URL}/reorder/items`, {
        // Assuming this endpoint
        headers: {
          Authorization: `Bearer ${userAuthToken}`,
          Accept: "application/json",
        },
      });
      if (!response.ok) throw new Error("Không thể tải sản phẩm đã mua.");
      const reorderItems = await response.json();

      if (reorderItems.length === 0) {
        container.innerHTML = "";
        noReorderMessage.style.display = "block";
        return;
      }

      container.innerHTML = reorderItems
        .map(
          (item) => `
                <div class="product-card-account" data-id="${item.product_id}">
                    <img src="${
                      item.image_url || "public/images/placeholder.png"
                    }" alt="${item.product_name}">
                    <h5>${item.product_name}</h5>
                    <p class="price">${new Intl.NumberFormat("vi-VN", {
                      style: "currency",
                      currency: "VND",
                    }).format(item.price_at_purchase)}</p>
                    <p style="font-size:0.8em; color:#777;">Mua lần cuối: ${new Date(
                      item.last_purchased_at
                    ).toLocaleDateString("vi-VN")}</p>
                    <button class="add-to-cart-reorder-btn">Thêm vào giỏ</button>
                </div>
            `
        )
        .join("");
      // TODO: Add to cart functionality
    } catch (error) {
      console.error("Error loading reorder items:", error);
      container.innerHTML = `<p>Không thể tải sản phẩm đã mua. ${error.message}</p>`;
    }
  }

  let dhJsScriptElement = null; // Để giữ tham chiếu đến thẻ script của dh.js
  let dhJsInitializedByTttk = false; // Cờ mới

  async function loadMyOrdersContent() {
    console.log(
      "TTTK_JS: loadMyOrdersContent called. dhJsInitializedByTttk:",
      dhJsInitializedByTttk
    );
    const myOrdersSection = document.getElementById("don-hang-cua-toi");
    const loadingDhContent = document.getElementById("loading-dh-content");

    if (myOrdersSection.dataset.loaded === "true" && dhJsInitializedByTttk) {
      if (typeof window.fetchUserOrdersGlobal_DH === "function") {
        // Sử dụng hàm có namespace _DH
        console.log(
          "TTTK_JS: Refreshing orders in tttk using fetchUserOrdersGlobal_DH..."
        );
        window.fetchUserOrdersGlobal_DH();
      } else {
        console.warn(
          "TTTK_JS: fetchUserOrdersGlobal_DH is not a function. Cannot refresh."
        );
      }
      return;
    }

    if (loadingDhContent) loadingDhContent.style.display = "block";
    if (myOrdersSection) {
      myOrdersSection.innerHTML = "";
      if (loadingDhContent) myOrdersSection.appendChild(loadingDhContent);
    }

    try {
      const response = await fetch("dh.html");
      if (!response.ok)
        throw new Error("Failed to load My Orders page content.");
      const htmlContent = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, "text/html");
      const mainContent = doc.querySelector("main.my-orders-page");

      if (mainContent && myOrdersSection) {
        if (loadingDhContent) loadingDhContent.style.display = "none";
        myOrdersSection.innerHTML = "";
        myOrdersSection.appendChild(mainContent);
        myOrdersSection.dataset.loaded = "true";

        // Chỉ tải và khởi tạo script dh.js nếu chưa được làm bởi tttk.js
        if (!dhJsInitializedByTttk) {
          if (dhJsScriptElement) {
            // Nếu script đã được thêm trước đó, xóa đi để đảm bảo fresh load nếu cần
            dhJsScriptElement.remove();
          }
          dhJsScriptElement = document.createElement("script");
          dhJsScriptElement.src = "js/dh.js";
          dhJsScriptElement.onload = () => {
            console.log("TTTK_JS: dh.js loaded dynamically for My Orders tab.");
            if (typeof window.initializeMyOrdersSection === "function") {
              window.initializeMyOrdersSection();
              dhJsInitializedByTttk = true; // Đánh dấu là đã được khởi tạo bởi tttk
              console.log("TTTK_JS: dh.js initialized by tttk.");
            } else {
              console.error(
                "TTTK_JS: initializeMyOrdersSection function not found in dh.js after dynamic load."
              );
            }
          };
          dhJsScriptElement.onerror = () => {
            console.error("TTTK_JS: Failed to load dh.js dynamically.");
            if (myOrdersSection)
              myOrdersSection.innerHTML = "<p>Lỗi tải script cho đơn hàng.</p>";
          };
          document.body.appendChild(dhJsScriptElement);
        } else if (typeof window.initializeMyOrdersSection === "function") {
          // Nếu script đã được tải và khởi tạo bởi tttk trước đó, có thể gọi lại init hoặc refresh
          console.log(
            "TTTK_JS: dh.js was already initialized by tttk, attempting to re-initialize or refresh."
          );
          window.initializeMyOrdersSection(); // Gọi lại init, hàm init nên xử lý việc không re-attach listeners nếu không cần
        }
      } else {
        throw new Error(
          "Could not find main content in dh.html or myOrdersSection is null."
        );
      }
    } catch (error) {
      console.error("TTTK_JS: Error loading 'Đơn hàng của tôi':", error);
      if (loadingDhContent) loadingDhContent.style.display = "none";
      if (myOrdersSection)
        myOrdersSection.innerHTML = `<p>Không thể tải nội dung. Vui lòng thử lại. (${error.message})</p>`;
    }
  }
  const urlParams = new URLSearchParams(window.location.search);
  const targetTabFromUrl = urlParams.get("tab");
  menuItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      menuItems.forEach((menuItem) => menuItem.classList.remove("active"));
      item.classList.add("active");

      // Special handling for "Chỉnh sửa tài khoản" link
      if (item.classList.contains("edit-account-link")) {
        const thongTinTaiKhoanMenu = document.querySelector(
          '.account-menu ul li[data-target="thong-tin-tai-khoan"]'
        );
        if (thongTinTaiKhoanMenu) thongTinTaiKhoanMenu.classList.add("active");
      }

      const targetId = item.dataset.target;
      contentSections.forEach((section) => section.classList.remove("active"));

      const targetSection = document.getElementById(targetId);
      if (targetSection) {
        targetSection.classList.add("active");
        console.log(`TTTK_JS: Switched to tab: ${targetId}`);
        if (targetId === "don-hang-cua-toi") {
          loadMyOrdersContent();
        } else if (targetId === "dia-chi-nhan-hang") {
          loadAddresses(); // Bỏ comment khi sẵn sàng
        } else if (targetId === "san-pham-yeu-thich") {
          loadWishlist(); // Bỏ comment khi sẵn sàng
        } else if (targetId === "mua-lai") {
          loadReorderItems(); // Bỏ comment khi sẵn sàng
        } else if (targetId === "thong-tin-tai-khoan") {
          loadUserProfile();
        }
      }
    });
  });

  if (targetTabFromUrl) {
    const targetMenuItem = document.querySelector(
      `.account-menu ul li[data-target="${targetTabFromUrl}"]`
    );
    if (targetMenuItem) {
      // Kích hoạt tab tương ứng
      menuItems.forEach((menuItem) => menuItem.classList.remove("active"));
      targetMenuItem.classList.add("active");

      contentSections.forEach((section) => section.classList.remove("active"));
      const targetSection = document.getElementById(targetTabFromUrl);
      if (targetSection) {
        targetSection.classList.add("active");
        console.log(`TTTK_JS: Activated tab from URL: ${targetTabFromUrl}`);
        // Gọi hàm tải nội dung tương ứng nếu cần
        if (targetTabFromUrl === "don-hang-cua-toi") {
          loadMyOrdersContent();
        } else if (targetTabFromUrl === "dia-chi-nhan-hang") {
          loadAddresses();
        } else if (targetTabFromUrl === "san-pham-yeu-thich") {
          loadWishlist();
        } else if (targetTabFromUrl === "mua-lai") {
          loadReorderItems();
        } else if (targetTabFromUrl === "thong-tin-tai-khoan") {
          loadUserProfile();
        }
      }
    }
  } else {
    // Logic mặc định khi không có tham số 'tab'
    const defaultActiveMenu = document.querySelector(
      '.account-menu ul li[data-target="thong-tin-tai-khoan"]'
    );
    if (defaultActiveMenu) {
      defaultActiveMenu.click(); // Kích hoạt tab mặc định
    }
  }

  loadUserProfile(); // Tải thông tin user lần đầu
});
