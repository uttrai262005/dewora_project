document.addEventListener("DOMContentLoaded", () => {
  // Đảm bảo người dùng là admin để truy cập bất kỳ trang nào trong thư mục /admin
  // Hàm checkAdminAuth() đã bao gồm chuyển hướng nếu không phải admin.
  if (!checkAdminAuth()) {
    // Ngăn chặn việc thực thi thêm script hoặc hiển thị nội dung nếu không phải admin
    // Bằng cách dừng ở đây hoặc ẩn body. Body sẽ bị ẩn cho đến khi checkAdminAuth xác nhận.
    // Tuy nhiên, checkAdminAuth đã tự chuyển hướng rồi.
    console.warn("Xác thực quản trị viên thất bại. Đang chuyển hướng...");
    // document.body.style.display = 'none'; // Tùy chọn: ẩn nội dung trong khi chờ chuyển hướng
  } else {
    // Nếu cần, bạn có thể thêm logic khởi tạo chung cho admin ở đây.
    console.log("Quản trị viên đã xác thực.");
  }

  // Xử lý nút đăng xuất chung (đã có trong common.js, nhưng có thể đặt ở đây nếu muốn tập trung)
  // const logoutButton = document.getElementById('adminLogoutBtn');
  // if (logoutButton) {
  //     logoutButton.addEventListener('click', handleAdminLogout);
  // }
});
