// vite.config.js (hoặc vite.config.ts)
import { defineConfig } from "vite";
// import react from '@vitejs/plugin-react'; // Ví dụ nếu dùng React
// import vue from '@vitejs/plugin-vue'; // Ví dụ nếu dùng Vue

export default defineConfig({
  // plugins: [react()], // Hoặc plugin của framework bạn dùng

  server: {
    // Cổng mà front-end dev server sẽ chạy
    port: 5500,

    // Cấu hình proxy
    proxy: {
      // Khi front-end gọi đến URL bắt đầu bằng '/storage'
      // ví dụ: /storage/product_images/image.webp
      "/storage": {
        // Chuyển tiếp yêu cầu này đến server Laravel backend
        target: "http://127.0.0.1:8000", // URL gốc của Laravel backend của bạn
        changeOrigin: true, // Cần thiết cho virtual hosted sites, thay đổi header "Host" của request
        // secure: false, // Nếu backend target là HTTPS và có certificate tự ký, có thể cần thiết
        // rewrite: (path) => path.replace(/^\/fallback-path/, ''), // Không cần rewrite ở đây vì đường dẫn /storage đã đúng
        // Nếu bạn cần thay đổi đường dẫn trước khi gửi đến target, sử dụng rewrite
        // Ví dụ, nếu backend phục vụ ảnh từ /public/storage thì có thể rewrite.
        // Nhưng vì Laravel đã có symlink public/storage, thì target /storage là đúng.
      },

      // (TÙY CHỌN) Proxy cho các API calls nếu cần
      // Ví dụ, nếu API của bạn có tiền tố là /api
      // '/api': {
      //   target: 'http://localhost/dewora_api', // URL gốc của Laravel backend
      //   changeOrigin: true,
      //   rewrite: (path) => path.replace(/^\/api/, '/api') // Hoặc nếu API của Laravel có tiền tố là /api thì không cần rewrite tiền tố /api
      //                                                      // Nếu API Laravel không có tiền tố /api thì có thể cần: path.replace(/^\/api/, '')
      // },
    },
  },
});
