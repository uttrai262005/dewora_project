// header-footer.js
document.addEventListener("DOMContentLoaded", function () {
  // Load header.html
  fetch("header.html")
    .then((response) => {
      if (!response.ok) throw new Error("Không thể tải header.html");
      return response.text();
    })
    .then((data) => {
      document.getElementById("header-placeholder").innerHTML = data;

      // STEP 1: Load cart_script.js first
      const cartScript = document.createElement("script");
      cartScript.src = "js/cart_script.js";
      cartScript.async = false; // Ensure it executes synchronously before the next script

      cartScript.onload = function () {
        // STEP 2: Once cart_script.js is loaded, load header.js
        const headerScript = document.createElement("script");
        headerScript.src = "js/header.js";
        headerScript.onload = function () {
          // STEP 3: Once header.js is loaded, call its initialization function
          // This function will then use window.DeworaCart, which is now guaranteed to be defined.
          if (typeof window.initHeaderCart === "function") {
            window.initHeaderCart();
          } else {
            console.error(
              "Lỗi: Hàm initHeaderCart không được định nghĩa trong header.js"
            );
          }
        };
        headerScript.onerror = function () {
          console.error("Lỗi: Không thể tải header.js");
        };
        document.body.appendChild(headerScript);

        // THÊM ĐOẠN CODE NÀY VÀO ĐÂY
        // Nếu đây là trang giỏ hàng chính (cart.html), hãy khởi tạo DeworaCart cho trang chính.
        // Điều này đảm bảo initMainCartPage luôn được gọi sau khi DOM đã sẵn sàng và DeworaCart đã được định nghĩa.
        if (
          document.body.classList.contains("cart-page") &&
          window.DeworaCart
        ) {
          window.DeworaCart.initMainCartPage();
          console.log(
            "Called initMainCartPage from header-footer.js for cart.html"
          );
        }
        // KẾT THÚC ĐOẠN CODE MỚI
      };
      cartScript.onerror = function () {
        console.error("Lỗi: Không thể tải cart_script.js");
      };

      document.body.appendChild(cartScript);
    })
    .catch((error) => {
      console.error("Lỗi khi tải header:", error);
    });

  // Load footer.html (this part remains the same)
  fetch("footer.html")
    .then((response) => {
      if (!response.ok) {
        throw new new Error(
          `Không thể tải footer.html: ${response.status} ${response.statusText}`
        )();
      }
      return response.text();
    })
    .then((data) => {
      const footerPlaceholder = document.getElementById("footer-placeholder");
      if (!footerPlaceholder) {
        console.error("Lỗi: Không tìm thấy #footer-placeholder");
        return;
      }
      footerPlaceholder.innerHTML = data;
    })
    .catch((error) => {
      console.error("Lỗi khi tải footer:", error);
      const footerPlaceholder = document.getElementById("footer-placeholder");
      if (footerPlaceholder) {
        footerPlaceholder.innerHTML =
          "<p>Lỗi: Không thể tải footer. Vui lòng thử lại sau.</p>";
      }
    });
});
