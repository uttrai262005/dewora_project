window.API_BASE_URL = "http://127.0.0.1:8000/api";

// --- Helper Functions ---
function formatPrice(price) {
  const numericPrice = parseFloat(price);
  if (isNaN(numericPrice)) {
    console.error("Invalid price received:", price);
    return "N/A";
  }
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(numericPrice);
}

function generateRatingHTML(rating, reviewCount) {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 !== 0;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
  let starsHTML = "";
  for (let i = 0; i < fullStars; i++)
    starsHTML += '<i class="fas fa-star gold"></i>';
  if (halfStar) starsHTML += '<i class="fas fa-star-half-alt gold"></i>';
  for (let i = 0; i < emptyStars; i++)
    starsHTML += '<i class="far fa-star gold"></i>';
  return `<div class="stars">${starsHTML}</div><span class="review-count">(${reviewCount} đánh giá)</span>`;
}

function initializeProductImageSwiper(containerElement) {
  const images = Array.from(
    containerElement.querySelectorAll(".product-image-swiper-image")
  );
  const prevBtn = containerElement.querySelector(".swiper-button-prev");
  const nextBtn = containerElement.querySelector(".swiper-button-next");
  const dotsContainer = containerElement.querySelector(".slider-dots");
  const imageWrapper = containerElement.querySelector(
    ".product-image-swiper-wrapper"
  );

  if (!imageWrapper || images.length === 0) {
    if (prevBtn) prevBtn.style.display = "none";
    if (nextBtn) nextBtn.style.display = "none";
    if (dotsContainer) dotsContainer.style.display = "none";
    return;
  }

  let currentIndex = 0;
  const totalImages = images.length;

  function updateImages() {
    imageWrapper.style.transform = `translateX(${-currentIndex * 100}%)`;
    updateDots();
  }

  function updateDots() {
    if (dotsContainer) {
      dotsContainer.innerHTML = "";
      for (let i = 0; i < totalImages; i++) {
        const dot = document.createElement("span");
        dot.classList.add("dot");
        if (i === currentIndex) dot.classList.add("active");
        dot.addEventListener("click", (event) => {
          event.stopPropagation();
          event.preventDefault();
          currentIndex = i;
          updateImages();
        });
        dotsContainer.appendChild(dot);
      }
    }
  }

  if (totalImages > 1) {
    if (prevBtn) {
      prevBtn.style.display = "block";
      prevBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        event.preventDefault();
        currentIndex = currentIndex === 0 ? totalImages - 1 : currentIndex - 1;
        updateImages();
      });
    }
    if (nextBtn) {
      nextBtn.style.display = "block";
      nextBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        event.preventDefault();
        currentIndex = currentIndex === totalImages - 1 ? 0 : currentIndex + 1;
        updateImages();
      });
    }
    if (dotsContainer) dotsContainer.style.display = "flex";
  } else {
    if (prevBtn) prevBtn.style.display = "none";
    if (nextBtn) nextBtn.style.display = "none";
    if (dotsContainer) dotsContainer.style.display = "none";
  }
  updateImages();
}

function renderProductCard(product) {
  if (!product || !product.id) return "";
  const discountBadgeHTML =
    product.discount_percentage > 0
      ? `<span class="discount-badge">-${product.discount_percentage}%</span>`
      : "";
  let otherLabelsHTML = (product.labels || [])
    .map((labelObject) => {
      if (!labelObject.label_name) return "";
      let extraClass = "";
      const labelNameUpper = labelObject.label_name.toUpperCase();
      if (labelNameUpper === "VEGAN") extraClass = "label-vegan";
      else if (labelNameUpper === "FREESHIP 15K MỌI ĐƠN")
        extraClass = "label-freeship";
      else if (labelNameUpper === "BÁN CHẠY") extraClass = "label-best-selling";
      else if (labelNameUpper === "MỚI VỀ") extraClass = "label-new-arrivals";
      return `<span class="product-label ${extraClass}">${labelObject.label_name}</span>`;
    })
    .join("");
  if (product.gift_description)
    otherLabelsHTML += `<span class="product-label product-gift">${product.gift_description}</span>`;
  const otherLabelsContainerHTML = otherLabelsHTML
    ? `<div class="product-labels-container">${otherLabelsHTML}</div>`
    : "";

  const imageSectionHTML = `
      <div class="product-image-swiper-container">
          <div class="product-image-swiper-wrapper">
              ${(product.images && product.images.length > 0
                ? product.images
                : [
                    {
                      image_url: "public/images/default-product.png",
                      alt: "Ảnh mặc định",
                    },
                  ]
              )
                .map(
                  (img) =>
                    `<div class="product-image-swiper-slide"><img src="${img.image_url}" alt="${product.name}" class="product-image-swiper-image" loading="lazy"/></div>`
                )
                .join("")}
          </div>
          ${
            product.images && product.images.length > 1
              ? `
              <button class="swiper-button-prev" aria-label="Previous"><i class="fas fa-chevron-left"></i></button>
              <button class="swiper-button-next" aria-label="Next"><i class="fas fa-chevron-right"></i></button>
              <div class="slider-dots"></div>`
              : ""
          }
      </div>`;

  const productCardLink = `ctsp.html?id=${product.id}`;
  return `
      <article class="product-card" data-product-id="${product.id}">
          <a href="${productCardLink}" class="product-card-link">
              <div class="product-image-wrapper-with-badges">${imageSectionHTML}${discountBadgeHTML}${otherLabelsContainerHTML}</div>
              <div class="product-info">
                  <h4 class="product-brand">${
                    product.brand ? product.brand.name : "N/A"
                  }</h4>
                  <h3 class="product-name">${product.name}</h3>
                  <div class="product-price">
                      <span class="current-price">${formatPrice(
                        product.price
                      )}</span>
                      ${
                        parseFloat(product.original_price) >
                        parseFloat(product.price)
                          ? `<span class="original-price">${formatPrice(
                              product.original_price
                            )}</span>`
                          : ""
                      }
                  </div>
                  <div class="product-rating">${generateRatingHTML(
                    product.rating || 0,
                    product.review_count || 0
                  )}</div>
              </div>
          </a>
      </article>`;
}
