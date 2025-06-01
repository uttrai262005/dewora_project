document.addEventListener('DOMContentLoaded', function() {
    // Xử lý accordion chính sách
    const policyItems = document.querySelectorAll('.policy-item');
    
    policyItems.forEach(item => {
        const header = item.querySelector('.policy-header');
        
        header.addEventListener('click', function() {
            // // Đóng các item khác
            // policyItems.forEach(otherItem => {
            //     if (otherItem !== item && otherItem.classList.contains('active')) {
            //         otherItem.classList.remove('active');
            //     }
            // });
            
            // Toggle item hiện tại
            item.classList.toggle('active');
        });
    });
    
    // Xử lý form liên hệ (giữ nguyên)
});