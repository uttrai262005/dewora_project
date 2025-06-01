
  const tabs = document.querySelectorAll('.order-tab');
  const underline = document.querySelector('.tab-underline');

  tabs.forEach(tab => {
    tab.addEventListener('mouseenter', () => {
      underline.style.width = `${tab.offsetWidth}px`;
      underline.style.left = `${tab.offsetLeft}px`;
    });
  });

  // Đặt vị trí mặc định cho tab đầu
  window.addEventListener('DOMContentLoaded', () => {
    const activeTab = document.querySelector('.order-tab.active');
    underline.style.width = `${activeTab.offsetWidth}px`;
    underline.style.left = `${activeTab.offsetLeft}px`;
  });
  window.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.order-tab');
    const underline = document.querySelector('.tab-underline');
    const tabContainer = document.querySelector('.order-tabs');

    const moveUnderline = (tab) => {
      const tabRect = tab.getBoundingClientRect();
      const containerRect = tabContainer.getBoundingClientRect();
      underline.style.width = `${tab.offsetWidth}px`;
      underline.style.left = `${tab.offsetLeft}px`;
    };

    // Vị trí ban đầu theo tab .active
    const activeTab = document.querySelector('.order-tab.active');
    if (activeTab) {
      moveUnderline(activeTab);
    }

    tabs.forEach(tab => {
      tab.addEventListener('mouseenter', () => moveUnderline(tab));
    });

    tabContainer.addEventListener('mouseleave', () => {
      if (activeTab) moveUnderline(activeTab);
    });
  });