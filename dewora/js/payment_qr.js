document.addEventListener("DOMContentLoaded", () => {
  const orderCodeDisplay = document.getElementById("payment-order-code");
  const amountDisplay = document.getElementById("payment-amount-display");
  const paymentInstructionsDiv = document.getElementById(
    "payment-instructions"
  );
  const backToHomeBtn = document.getElementById("back-to-home-btn");
  const checkOrderStatusBtn = document.getElementById("check-order-status-btn"); // Thêm nút này vào HTML

  const qrPaymentDetailsString = localStorage.getItem("qr_payment_details");
  let orderCode,
    amount,
    qrCodeImageBase64,
    bankAccountNumber,
    bankName,
    accountHolder;

  if (!qrPaymentDetailsString) {
    paymentInstructionsDiv.innerHTML = `
            <div class="error-message">
                <p>Không tìm thấy thông tin thanh toán hoặc thông tin đã hết hạn.</p>
                <p>Vui lòng quay lại <a href="cart.html">giỏ hàng</a> và thử đặt hàng lại.</p>
            </div>`;
    Swal.fire(
      "Lỗi",
      "Không thể tải thông tin thanh toán. Vui lòng thử lại.",
      "error"
    );
    if (backToHomeBtn) backToHomeBtn.disabled = true;
    if (checkOrderStatusBtn) checkOrderStatusBtn.disabled = true;
    return;
  }

  try {
    const qrDetails = JSON.parse(qrPaymentDetailsString);
    orderCode = qrDetails.order_code;
    amount = parseInt(qrDetails.total_amount, 10);
    qrCodeImageBase64 = qrDetails.qr_code_image; // Ảnh QR base64 từ backend
    bankAccountNumber = qrDetails.bank_account_number;
    bankName = qrDetails.bank_name;
    accountHolder = qrDetails.account_holder;
  } catch (e) {
    console.error("Lỗi parse JSON từ qr_payment_details:", e);
    // Xử lý lỗi tương tự như trên
    return;
  }

  if (!orderCode || isNaN(amount)) {
    paymentInstructionsDiv.innerHTML = `
            <div class="error-message">
                <p>Thông tin thanh toán không hợp lệ.</p>
            </div>`;
    if (backToHomeBtn) backToHomeBtn.disabled = true;
    if (checkOrderStatusBtn) checkOrderStatusBtn.disabled = true;
    return;
  }

  orderCodeDisplay.textContent = orderCode;
  amountDisplay.textContent = new Intl.NumberFormat("vi-VN").format(amount);

  const transferContent = `DEWORA ${orderCode}`;

  if (qrCodeImageBase64) {
    paymentInstructionsDiv.innerHTML = `
            <h2>Chuyển khoản Ngân hàng (${bankName || "Vietcombank"})</h2>
            <p>Vui lòng quét mã QR dưới đây bằng ứng dụng Ngân hàng của bạn hoặc chuyển khoản thủ công với thông tin được cung cấp:</p>
            <div class="qr-code-container bank-qr-container">
                <img id="bank-qr-image" src="${qrCodeImageBase64}" alt="Bank QR Code" style="max-width: 280px; height: auto; border: 1px solid #ccc;"/>
            </div>
            <div class="bank-transfer-details">
                <h4>Thông tin chuyển khoản:</h4>
                <p><strong>Ngân hàng:</strong> ${
                  bankName ||
                  "Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)"
                }</p>
                <p><strong>Số tài khoản:</strong> <span id="acc-num-text">${bankAccountNumber}</span>
                    <button class="copy-btn" data-clipboard-text="${bankAccountNumber}"><i class="fas fa-copy"></i> Sao chép STK</button>
                </p>
                <p><strong>Chủ tài khoản:</strong> ${accountHolder}</p>
                <p><strong>Số tiền:</strong> ${new Intl.NumberFormat(
                  "vi-VN"
                ).format(amount)} VND</p>
                <p><strong>Nội dung chuyển khoản:</strong> <span id="trans-content-text">${transferContent}</span>
                    <button class="copy-btn" data-clipboard-text="${transferContent}"><i class="fas fa-copy"></i> Sao chép nội dung</button>
                </p>
                <p class="important-notice"><strong>LƯU Ý:</strong> Vui lòng nhập <strong>CHÍNH XÁC</strong> nội dung chuyển khoản để đơn hàng của bạn được xử lý nhanh nhất.</p>
            </div>
        `;
  } else {
    paymentInstructionsDiv.innerHTML =
      "<p>Lỗi: Không thể tải mã QR. Vui lòng thử lại hoặc liên hệ hỗ trợ.</p>";
  }

  document.querySelectorAll(".copy-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const textToCopy = button.getAttribute("data-clipboard-text");
      copyToClipboard(
        textToCopy,
        button.textContent.includes("STK")
          ? "Số tài khoản"
          : "Nội dung chuyển khoản"
      );
    });
  });

  // Xóa thông tin chi tiết QR sau khi đã sử dụng, nhưng KHÔNG xóa dewora_order_code
  localStorage.removeItem("qr_payment_details");
  // localStorage.removeItem("guest_cart_token"); // dewora-checkout-cart đã bị xóa ở thanhtoan.js

  if (backToHomeBtn) {
    backToHomeBtn.addEventListener("click", () => {
      window.location.href = "TRANGCH.html"; // Hoặc trang chủ của bạn
    });
  }

  // Nút này cần được thêm vào file qr_payment.html của bạn
  // Ví dụ: <button id="check-order-status-btn">Kiểm tra trạng thái đơn hàng</button>
  if (checkOrderStatusBtn) {
    checkOrderStatusBtn.addEventListener("click", () => {
      // dewora_order_code vẫn còn trong localStorage từ thanhtoan.js
      window.location.href = `order-status.html`; // order-status.js sẽ tự lấy từ localStorage
    });
  }
});
function copyToClipboard(text, entityName = "Thông tin") {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        Swal.fire({
          text: `${entityName} đã được sao chép!`,
          icon: "success",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 2000,
          timerProgressBar: true,
        });
      })
      .catch((err) => {
        console.error("Lỗi sao chép: ", err);
        fallbackCopyToClipboard(text, entityName); // Fallback for older browsers or issues
      });
  } else {
    fallbackCopyToClipboard(text, entityName); // Fallback for older browsers
  }
}

function fallbackCopyToClipboard(text, entityName) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed"; // Ensure it's not visible
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    const successful = document.execCommand("copy");
    if (successful) {
      Swal.fire({
        text: `${entityName} đã được sao chép (fallback)!`,
        icon: "success",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      });
    } else {
      throw new Error("Fallback copy failed");
    }
  } catch (err) {
    console.error("Lỗi sao chép (fallback): ", err);
    Swal.fire({
      title: "Lỗi Sao Chép",
      text: `Không thể tự động sao chép ${entityName}. Vui lòng sao chép thủ công.`,
      icon: "error",
    });
  }
  document.body.removeChild(textArea);
}
