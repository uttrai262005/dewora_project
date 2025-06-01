document.addEventListener("DOMContentLoaded", () => {
  const chatbotToggler = document.getElementById("dewora-chatbot-toggler");
  const chatbotWindow = document.getElementById("dewora-chatbot-window");
  const closeChatbotBtn = document.getElementById("chatbot-close-btn");
  const messagesContainer = document.getElementById(
    "chatbot-messages-container"
  );
  const inputArea = document.getElementById("chatbot-input");
  const sendBtn = document.getElementById("chatbot-send-btn");

  // URL của API Laravel (thay đổi nếu cần, ví dụ khi deploy)
  const CHATBOT_API_URL = "http://127.0.0.1:8000/api/chatbot"; // Mặc định cho php artisan serve

  // Lịch sử chat (để gửi lên server làm context)
  // Định dạng: [{role: 'user'/'model', parts: [{text: '...'}]}, ...]
  let chatHistory = [
    {
      role: "model",
      parts: [
        {
          text: "Xin chào! Tôi là trợ lý ảo của DEWORA. Tôi có thể giúp gì cho bạn về các sản phẩm làm đẹp hôm nay?",
        },
      ],
    },
  ];

  if (
    !chatbotToggler ||
    !chatbotWindow ||
    !closeChatbotBtn ||
    !messagesContainer ||
    !inputArea ||
    !sendBtn
  ) {
    console.warn(
      "DEWORA Chatbot: Một hoặc nhiều phần tử UI không được tìm thấy."
    );
    return;
  }

  chatbotToggler.addEventListener("click", () => {
    chatbotWindow.classList.toggle("hidden");
    if (!chatbotWindow.classList.contains("hidden")) {
      inputArea.focus();
      adjustTextareaHeight(); // Điều chỉnh chiều cao khi mở
    }
  });

  closeChatbotBtn.addEventListener("click", () => {
    chatbotWindow.classList.add("hidden");
  });

  sendBtn.addEventListener("click", handleSendMessage);
  inputArea.addEventListener("keypress", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      // Gửi bằng Enter, xuống dòng bằng Shift+Enter
      event.preventDefault(); // Ngăn xuống dòng mặc định của Enter
      handleSendMessage();
    }
  });

  // Tự động điều chỉnh chiều cao textarea
  inputArea.addEventListener("input", adjustTextareaHeight);

  function adjustTextareaHeight() {
    inputArea.style.height = "auto"; // Reset chiều cao
    inputArea.style.height = inputArea.scrollHeight + "px"; // Set chiều cao mới dựa trên nội dung
  }

  function addMessageToUI(text, senderRole) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add(
      "message",
      senderRole === "user" ? "user-message" : "bot-message"
    );

    const messageP = document.createElement("p");
    // Xử lý xuống dòng: thay thế \n bằng <br> (Gemini có thể trả về \n)
    messageP.innerHTML = text.replace(/\n/g, "<br>");
    messageDiv.appendChild(messageP);

    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
  }

  function showTypingIndicator() {
    const typingDiv = document.createElement("div");
    typingDiv.classList.add("message", "bot-message", "typing-indicator");
    typingDiv.innerHTML = `<p><span class="dot"></span><span class="dot"></span><span class="dot"></span></p>`;
    messagesContainer.appendChild(typingDiv);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    const typingIndicator =
      messagesContainer.querySelector(".typing-indicator");
    if (typingIndicator) {
      messagesContainer.removeChild(typingIndicator);
    }
  }

  function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  async function handleSendMessage() {
    const messageText = inputArea.value.trim();
    if (messageText === "") return;

    addMessageToUI(messageText, "user");
    chatHistory.push({ role: "user", parts: [{ text: messageText }] });

    inputArea.value = ""; // Xóa input
    adjustTextareaHeight(); // Reset chiều cao textarea
    inputArea.focus(); // Giữ focus vào input

    showTypingIndicator();

    try {
      const response = await fetch(CHATBOT_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        // Gửi 5-10 tin nhắn gần nhất làm context (bao gồm cả tin nhắn chào mừng đầu tiên)
        // Điều chỉnh số lượng context cho phù hợp với token limit của Gemini và nhu cầu
        body: JSON.stringify({
          message: messageText, // Tin nhắn hiện tại
          history: chatHistory.slice(-10), // Gửi N tin nhắn gần nhất
        }),
      });

      removeTypingIndicator();

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error from Chatbot API:", response.status, errorData);
        const errorMessage =
          errorData.reply ||
          `Lỗi ${response.status}: Không thể nhận phản hồi từ trợ lý.`;
        addMessageToUI(errorMessage, "model");
        chatHistory.push({ role: "model", parts: [{ text: errorMessage }] });
        return;
      }

      const data = await response.json();
      if (data.reply) {
        addMessageToUI(data.reply, "model");
        chatHistory.push({ role: "model", parts: [{ text: data.reply }] });
      } else {
        const fallbackMessage =
          "Xin lỗi, tôi không thể xử lý yêu cầu này ngay bây giờ.";
        addMessageToUI(fallbackMessage, "model");
        chatHistory.push({ role: "model", parts: [{ text: fallbackMessage }] });
      }
    } catch (error) {
      removeTypingIndicator();
      console.error("Failed to send message to Chatbot API:", error);
      const networkErrorMessage =
        "Không thể kết nối đến trợ lý ảo. Vui lòng kiểm tra kết nối mạng của bạn và thử lại.";
      addMessageToUI(networkErrorMessage, "model");
      chatHistory.push({
        role: "model",
        parts: [{ text: networkErrorMessage }],
      });
    }
  }

  // Khởi tạo: điều chỉnh chiều cao textarea nếu có sẵn nội dung (ít khi)
  adjustTextareaHeight();
});
