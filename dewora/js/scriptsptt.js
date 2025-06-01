// scriptsptt.js

document.addEventListener('DOMContentLoaded', function() {
    // ========== QUẢN LÝ DỮ LIỆU ==========
    let cart = JSON.parse(localStorage.getItem('dewora-cart')) || [];
    let favorites = JSON.parse(localStorage.getItem('dewora-favorites')) || [];
    let productsLoaded = 4; // Đếm số sản phẩm đã load

    // ========== CÁC HÀM CHÍNH ==========
    // 1. Hiển thị popup thêm vào giỏ hàng
    function showAddToCartPopup(product) {
        // Tạo popup
        const popup = document.createElement('div');
        popup.className = 'add-to-cart-popup';
        popup.innerHTML = `
            <div class="popup-overlay"></div>
            <div class="popup-content">
                <div class="popup-header">
                    <img src="${product.image}" alt="${product.name}" class="popup-product-image">
                    <div class="popup-product-info">
                        <h3>${product.name}</h3>
                        <p class="popup-product-price">${product.price}</p>
                    </div>
                </div>
                <div class="popup-message">
                    <p>Đã thêm vào giỏ hàng thành công!</p>
                </div>
                <div class="popup-actions">
                    <button class="popup-continue">Tiếp tục mua sắm</button>
                    <button class="popup-view-cart">Xem giỏ hàng</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // Thêm CSS
        const style = document.createElement('style');
        style.textContent = `
            .add-to-cart-popup {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 1000;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            .popup-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0,0,0,0.5);
            }
            .popup-content {
                position: relative;
                background-color: white;
                width: 90%;
                max-width: 400px;
                border-radius: 10px;
                padding: 20px;
                z-index: 1001;
                animation: popupFadeIn 0.3s ease;
            }
            .popup-header {
                display: flex;
                gap: 15px;
                margin-bottom: 15px;
                align-items: center;
            }
            .popup-product-image {
                width: 80px;
                height: 80px;
                object-fit: cover;
                border-radius: 5px;
                border: 1px solid #eee;
            }
            .popup-product-info h3 {
                font-size: 16px;
                margin: 0 0 5px 0;
                color: #333;
            }
            .popup-product-price {
                color: #e5536b;
                font-weight: bold;
                margin: 0;
                font-size: 16px;
            }
            .popup-message {
                text-align: center;
                margin: 15px 0;
                font-size: 16px;
                color: #333;
            }
            .popup-actions {
                display: flex;
                gap: 10px;
                margin-top: 20px;
            }
            .popup-continue, .popup-view-cart {
                flex: 1;
                padding: 12px;
                border-radius: 5px;
                cursor: pointer;
                font-weight: 500;
                font-size: 14px;
                transition: all 0.3s;
            }
            .popup-continue {
                background-color: #f5f5f5;
                border: 1px solid #ddd;
                color: #333;
            }
            .popup-continue:hover {
                background-color: #e8e8e8;
            }
            .popup-view-cart {
                background-color: #e5536b;
                color: white;
                border: none;
            }
            .popup-view-cart:hover {
                background-color: #d1425e;
            }
            @keyframes popupFadeIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
        
        // Xử lý sự kiện nút
        popup.querySelector('.popup-continue').addEventListener('click', function() {
            popup.remove();
            style.remove();
        });
        
        popup.querySelector('.popup-view-cart').addEventListener('click', function() {
            window.location.href = 'GihngOne.html';
        });
        
        // Tự động đóng sau 5 giây
        setTimeout(() => {
            popup.remove();
            style.remove();
        }, 5000);
    }

    // 2. Cập nhật số lượng giỏ hàng
    function updateCartCounter() {
        const totalItems = cart.reduce((total, item) => total + (item.quantity || 1), 0);
        const cartCounters = document.querySelectorAll('.cart-counter');
        cartCounters.forEach(counter => {
            counter.textContent = totalItems;
        });
    }

    // 3. Thêm vào giỏ hàng (cập nhật)
    function addToCart(product) {
        const existingItem = cart.find(item => item.id === product.id);
        
        if (existingItem) {
            existingItem.quantity = (existingItem.quantity || 1) + 1;
        } else {
            product.quantity = 1;
            cart.push(product);
        }
        
        localStorage.setItem('dewora-cart', JSON.stringify(cart));
        showAddToCartPopup(product); // Hiển thị popup
        updateCartCounter();
    }

    // 4. Mua ngay - Chuyển đến trang thanh toán với sản phẩm đã chọn
    function buyNow(product) {
        // Tạo giỏ hàng tạm thời chỉ với sản phẩm được chọn
        const tempCart = [{
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: 1
        }];
        
        // Lưu vào localStorage
        localStorage.setItem('dewora-cart', JSON.stringify(tempCart));
        localStorage.setItem('dewora-checkout-product', JSON.stringify(product));
        
        // Chuyển đến trang thanh toán
        window.location.href = 'Thanhton.html';
    }

    // 5. Thêm vào yêu thích
    function addToFavorites(product) {
        if (!favorites.some(item => item.id === product.id)) {
            favorites.push(product);
            localStorage.setItem('dewora-favorites', JSON.stringify(favorites));
            showNotification('Đã thêm vào yêu thích');
            return true;
        } else {
            showNotification('Sản phẩm đã có trong yêu thích');
            return false;
        }
    }

    // 6. Hiển thị thông báo (giữ nguyên)
    function showNotification(message) {
        let notification = document.createElement('div');
        notification.className = 'dewora-notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        if (!document.querySelector('#dewora-notification-style')) {
            const style = document.createElement('style');
            style.id = 'dewora-notification-style';
            style.textContent = `
                .dewora-notification {
                    position: fixed;
                    bottom: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background-color: #e5536b;
                    color: white;
                    padding: 12px 24px;
                    border-radius: 25px;
                    z-index: 1000;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    animation: deworaFadeInOut 3s ease forwards;
                    font-family: 'Lexend Deca', sans-serif;
                }
                @keyframes deworaFadeInOut {
                    0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
                    20% { opacity: 1; transform: translateX(-50%) translateY(0); }
                    80% { opacity: 1; transform: translateX(-50%) translateY(0); }
                    100% { opacity: 0; transform: translateX(-50%) translateY(20px); }
                }
            `;
            document.head.appendChild(style);
        }
        
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // 7. Load thêm sản phẩm (giữ nguyên)
    function loadMoreProducts() {
        const productsGrid = document.querySelector('.products-grid');
        const viewMoreBtn = document.querySelector('.btn-view-more');
        
        viewMoreBtn.disabled = true;
        viewMoreBtn.textContent = 'Đang tải...';

        setTimeout(() => {
            const newProducts = [
                {
                    id: 'prod' + (productsLoaded + 1),
                    name: 'Kem dưỡng ẩm Klairs',
                    price: '310.000đ',
                    image: 'public/images/kem-duong-am.jpg'
                },
                {
                    id: 'prod' + (productsLoaded + 2),
                    name: 'Tẩy trang Bioderma',
                    price: '230.000đ',
                    image: 'public/images/tay-trang.png'
                }
            ];

            newProducts.forEach(product => {
                const productHTML = `
                    <div class="product-card" data-id="${product.id}">
                        <img src="${product.image}" alt="${product.name}" class="product-image">
                        <div class="product-info">
                            <p class="product-name">${product.name}</p>
                            <p class="product-price">${product.price}</p>
                            <div class="product-actions">
                                <button class="btn-buy-now">Mua ngay</button>
                                <button class="btn-add-to-cart">Thêm vào giỏ</button>
                            </div>
                        </div>
                    </div>
                `;
                productsGrid.insertAdjacentHTML('beforeend', productHTML);
                productsLoaded++;
            });

            attachProductEvents();
            viewMoreBtn.disabled = false;
            viewMoreBtn.textContent = 'Xem thêm →';
            
            if (productsLoaded >= 10) {
                viewMoreBtn.style.display = 'none';
            }
        }, 1000);
    }

    // ========== GẮN SỰ KIỆN ==========
    function attachProductEvents() {
        // Thêm vào giỏ
        document.querySelectorAll('.btn-add-to-cart').forEach(button => {
            button.addEventListener('click', function() {
                const productCard = this.closest('.product-card');
                const product = {
                    id: productCard.dataset.id || 'prod-' + Date.now(),
                    name: productCard.querySelector('.product-name').textContent,
                    price: productCard.querySelector('.product-price').textContent,
                    image: productCard.querySelector('.product-image').src
                };
                addToCart(product);
            });
        });

        // Mua ngay
        document.querySelectorAll('.btn-buy-now').forEach(button => {
            button.addEventListener('click', function() {
                const productCard = this.closest('.product-card');
                const product = {
                    id: productCard.dataset.id || 'prod-' + Date.now(),
                    name: productCard.querySelector('.product-name').textContent,
                    price: productCard.querySelector('.product-price').textContent,
                    image: productCard.querySelector('.product-image').src
                };
                buyNow(product);
            });
        });
    }

    // ========== KHỞI TẠO ==========
    // Gắn sự kiện nút Xem thêm
    const viewMoreBtn = document.querySelector('.btn-view-more');
    if (viewMoreBtn) {
        viewMoreBtn.addEventListener('click', loadMoreProducts);
    }

    // Gắn sự kiện cho sản phẩm ban đầu
    attachProductEvents();

    // Cập nhật số lượng giỏ hàng khi tải trang
    updateCartCounter();

    // Thêm data-id cho các sản phẩm ban đầu nếu chưa có
    document.querySelectorAll('.product-card').forEach((card, index) => {
        if (!card.dataset.id) {
            card.dataset.id = 'prod-' + (index + 1);
        }
    });
});