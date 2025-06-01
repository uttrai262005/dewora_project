// API endpoint
const API_URL = "https://provinces.open-api.vn/api/";

// Hàm hiển thị/ẩn form địa chỉ
function toggleAddressForm(show) {
  const addressList = document.getElementById("address-list");
  const addressForm = document.getElementById("address-form");

  if (show) {
    addressList.style.display = "none";
    addressForm.style.display = "block";
    loadProvinces(); // Tải danh sách tỉnh/thành khi hiển thị form
  } else {
    addressList.style.display = "block";
    addressForm.style.display = "none";
  }
}

// Hàm load tỉnh/thành phố
// Hàm load tỉnh/thành phố (sắp xếp theo thứ tự A-Z)
function loadProvinces() {
  fetch(API_URL + "?depth=1")
    .then((response) => response.json())
    .then((data) => {
      const provinceSelect = document.getElementById("province");
      provinceSelect.innerHTML =
        '<option value="">-- Chọn Tỉnh/Thành phố --</option>';

      // Sắp xếp danh sách tỉnh theo tên A-Z
      const sortedProvinces = data.sort((a, b) => a.name.localeCompare(b.name));

      sortedProvinces.forEach((province) => {
        const option = document.createElement("option");
        option.value = province.code;
        option.textContent = province.name;
        provinceSelect.appendChild(option);
      });
    })
    .catch((error) => console.error("Error loading provinces:", error));
}

// Hàm load quận/huyện
function loadDistricts(provinceCode) {
  const districtSelect = document.getElementById("district");
  const wardSelect = document.getElementById("ward");

  // Reset quận/huyện và xã/phường
  districtSelect.innerHTML = '<option value="">-- Chọn Quận/Huyện --</option>';
  wardSelect.innerHTML = '<option value="">-- Chọn Phường/Xã --</option>';
  districtSelect.disabled = !provinceCode;
  wardSelect.disabled = true;

  if (!provinceCode) return;

  fetch(API_URL + "p/" + provinceCode + "?depth=2")
    .then((response) => response.json())
    .then((province) => {
      province.districts.forEach((district) => {
        const option = document.createElement("option");
        option.value = district.code;
        option.textContent = district.name;
        districtSelect.appendChild(option);
      });
      districtSelect.disabled = false;
    })
    .catch((error) => console.error("Error loading districts:", error));
}

// Hàm load xã/phường
function loadWards(districtCode) {
  const wardSelect = document.getElementById("ward");

  wardSelect.innerHTML = '<option value="">-- Chọn Phường/Xã --</option>';
  wardSelect.disabled = !districtCode;

  if (!districtCode) return;

  fetch(API_URL + "d/" + districtCode + "?depth=2")
    .then((response) => response.json())
    .then((district) => {
      district.wards.forEach((ward) => {
        const option = document.createElement("option");
        option.value = ward.code;
        option.textContent = ward.name;
        wardSelect.appendChild(option);
      });
      wardSelect.disabled = false;
    })
    .catch((error) => console.error("Error loading wards:", error));
}

// Gắn sự kiện khi DOM đã tải xong
document.addEventListener("DOMContentLoaded", function () {
  // Gắn sự kiện change cho tỉnh/thành
  document.getElementById("province").addEventListener("change", function () {
    loadDistricts(this.value);
  });

  // Gắn sự kiện change cho quận/huyện
  document.getElementById("district").addEventListener("change", function () {
    loadWards(this.value);
  });

  // Gắn sự kiện cho nút submit form
  document
    .getElementById("address-form")
    .addEventListener("submit", function (e) {
      e.preventDefault();
      // Xử lý lưu địa chỉ ở đây
      alert("Địa chỉ đã được lưu!");
      toggleAddressForm(false);
    });
});
// Thêm vào file JS

// Fix cho iOS
select.addEventListener("focus", function () {
  this.scrollIntoView({ behavior: "smooth", block: "center" });
});
