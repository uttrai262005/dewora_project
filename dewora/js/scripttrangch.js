document.addEventListener("DOMContentLoaded", function () {
  // Định nghĩa API_BASE_URL (Đã có trong common.js, nên không cần định nghĩa lại ở đây nếu common.js được load trước)
  // const API_BASE_URL = "http://127.0.0.1:8000/api";

  // Hàm render sản phẩm bán chạy (sử dụng renderProductCard từ common.js)
  function renderBestSeller(product) {
    return renderProductCard(product);
  }

  // Hàm render sản phẩm mới nhất (sử dụng renderProductCard từ common.js)
  function renderNewArrival(product) {
    return renderProductCard(product);
  }

  // Hàm lấy sản phẩm từ API, sử dụng logic lọc và sắp xếp như scriptda.js
  async function fetchProducts(filters = {}, sortOption = "all", limit = 10) {
    const params = new URLSearchParams({ limit });

    if (filters.label_name) {
      params.append("label_name", filters.label_name);
    }

    let finalSortBy = null;
    let finalSortOrder = null;

    if (sortOption === "all" || sortOption === "default_sort") {
      if (filters.label_name === "MỚI VỀ") {
        finalSortBy = "id";
        finalSortOrder = "desc";
      } else if (filters.label_name === "BÁN CHẠY") {
        finalSortBy = "review_count";
        finalSortOrder = "desc";
      }
    } else if (sortOption === "id_desc") {
      finalSortBy = "id";
      finalSortOrder = "desc";
    } else if (sortOption === "reviewCount_desc") {
      finalSortBy = "review_count";
      finalSortOrder = "desc";
    } // Add other sort options if needed for homepage sections

    if (finalSortBy) {
      params.append("sort_by", finalSortBy);
      params.append("sort_order", finalSortOrder);
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/products?${params.toString()}`
      );
      if (!response.ok)
        throw new Error(
          `HTTP error! status: ${response.status} - ${response.statusText}`
        );
      const data = await response.json();
      return Array.isArray(data.data) ? data.data : []; // API trả về {data: [...], total: ...}
    } catch (error) {
      console.error("Không thể fetch sản phẩm từ API:", error);
      return [];
    }
  }

  // Hàm load và render sản phẩm
  async function loadProducts() {
    const bestSellersContainer = document.getElementById("best-sellers");
    const latestProductsContainer = document.getElementById("latest-products");
    if (!bestSellersContainer || !latestProductsContainer) {
      console.error(
        'Không tìm thấy container sản phẩm! Kiểm tra id="best-sellers" và id="latest-products" trong HTML.'
      );
      return;
    }

    try {
      // Hiển thị loading
      bestSellersContainer.innerHTML = `<p>Đang tải sản phẩm...</p>`;
      latestProductsContainer.innerHTML = `<p>Đang tải sản phẩm...</p>`;

      // Lấy dữ liệu sản phẩm bán chạy
      const bestSellersData = await fetchProducts(
        { label_name: "BÁN CHẠY" },
        "reviewCount_desc",
        10
      );

      // Lấy dữ liệu sản phẩm mới nhất
      const latestProductsData = await fetchProducts(
        { label_name: "MỚI VỀ" },
        "id_desc",
        10
      );

      console.log("Dữ liệu từ API:", { bestSellersData, latestProductsData });

      if (!bestSellersData || bestSellersData.length === 0) {
        bestSellersContainer.innerHTML = `<p style="color: gray;">Chưa có sản phẩm bán chạy.</p>`;
      } else {
        bestSellersContainer.innerHTML = bestSellersData
          .map(renderBestSeller)
          .join("");
        // Initialize Swipers for best sellers
        bestSellersContainer.querySelectorAll(
          ".product-image-swiper-container"
        );
        bestSellersContainer
          .querySelectorAll(".product-image-swiper-container")
          .forEach((swiperContainer) => {
            initializeProductImageSwiper(swiperContainer);
          });
      }

      if (!latestProductsData || latestProductsData.length === 0) {
        latestProductsContainer.innerHTML = `<p style="color: gray;">Chưa có sản phẩm mới nhất.</p>`;
      } else {
        latestProductsContainer.innerHTML = latestProductsData
          .map(renderNewArrival)
          .join("");
        // Initialize Swipers for new arrivals
        latestProductsContainer
          .querySelectorAll(".product-image-swiper-container")
          .forEach((swiperContainer) => {
            initializeProductImageSwiper(swiperContainer);
          });
      }
      console.log("Sản phẩm đã được render:", {
        bestSellersData,
        latestProductsData,
      });
    } catch (error) {
      console.error("Lỗi khi tải hoặc render sản phẩm:", error);
      bestSellersContainer.innerHTML = `<p style="color: red;">Lỗi: Không tải được sản phẩm bán chạy. Vui lòng kiểm tra API hoặc kết nối mạng. Chi tiết: ${error.message}</p>`;
      latestProductsContainer.innerHTML = `<p style="color: red;">Lỗi: Không tải được sản phẩm mới nhất. Vui lòng kiểm tra API hoặc kết nối mạng. Chi tiết: ${error.message}</p>`;
    }
  }
const mainBanner = document.querySelector('.main-banner .swiper-wrapper');
  if (mainBanner) {
    mainBanner.addEventListener('click', (e) => {
      const slide = e.target.closest('.swiper-slide');
      if (slide) {
        const slideIndex = slide.getAttribute('data-slide');
        let eventUrl = 'event-detail.html';
        if (slideIndex) {
          eventUrl += `?event=${slideIndex}`; // Thêm tham số để xác định sự kiện
        }
        window.location.href = eventUrl;
      }
    });
  }

  const sideBanners = document.querySelectorAll('.side-banners .small-banner');
  if (sideBanners.length > 0) {
    sideBanners.forEach((banner, index) => {
      banner.addEventListener('click', () => {
        const eventUrl = `event-detail.html?event=${index + 4}`; // 4, 5 cho side banners
        window.location.href = eventUrl;
      });
    });
  }
  // G
  // Gọi hàm load sản phẩm
  loadProducts();

  // ===== SWIPER CHO 2 BANNER NHỎ BÊN CẠNH =====
  const smallBanners = document.querySelectorAll(".side-banners .small-banner");
  smallBanners.forEach((bannerNode, index) => {
    const existingImg = bannerNode.querySelector("img.banner-img");
    if (existingImg) {
      const wrapper = document.createElement("div");
      wrapper.classList.add("swiper-wrapper");
      const slide = document.createElement("div");
      slide.classList.add("swiper-slide");
      const clonedImg = existingImg.cloneNode(true);
      slide.appendChild(clonedImg);
      wrapper.appendChild(slide);
      bannerNode.innerHTML = "";
      bannerNode.appendChild(wrapper);

      new Swiper(bannerNode, {
        loop: wrapper.children.length > 1,
        slidesPerView: 1,
        autoplay: {
          delay: 3500 + index * 500,
          disableOnInteraction: false,
          pauseOnMouseEnter: true,
        },
      });
    }
  });

 // ===== TỰ ĐỘNG CUỘN SẢN PHẨM MỚI =====
  const newProductsContainer = document.querySelector(".product-scroll-container.new-products");
  let autoScrollInterval;

  function startAutoScroll() {
    if (!newProductsContainer) return;
    autoScrollInterval = setInterval(() => {
      if (
        newProductsContainer.scrollLeft + newProductsContainer.clientWidth >=
        newProductsContainer.scrollWidth - 1
      ) {
        newProductsContainer.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        newProductsContainer.scrollBy({ left: 250, behavior: "smooth" });
      }
    }, 3000);
  }

  if (newProductsContainer) {
    newProductsContainer.addEventListener("mouseenter", () => {
      if (autoScrollInterval) clearInterval(autoScrollInterval);
    });
    newProductsContainer.addEventListener("mouseleave", startAutoScroll);
    startAutoScroll();
  }

  // ===== TOGGLE MENU DROPDOWN TRÊN MOBILE =====
  const navDropdowns = document.querySelectorAll(".nav-item.dropdown");
  navDropdowns.forEach((dropdown) => {
    const link = dropdown.querySelector("a.nav-item");
    const menu = dropdown.querySelector(".dropdown-menu");
    if (link && menu) {
      link.addEventListener("click", function (e) {
        if (window.innerWidth <= 768) {
          if (link.getAttribute("href") === "#") {
            e.preventDefault();
          }
          const isVisible =
            menu.style.display === "flex" || menu.style.display === "block";
          menu.style.display = isVisible ? "none" : "flex";
        }
      });
    }
  });
});
