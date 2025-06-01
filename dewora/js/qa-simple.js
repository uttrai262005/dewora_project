document.addEventListener('DOMContentLoaded', function() {
    // Toggle câu hỏi
    const qaItems = document.querySelectorAll('.qa-simple-item');
    
    qaItems.forEach(item => {
        const question = item.querySelector('.qa-question');
        
        question.addEventListener('click', function() {
            // // Đóng các item khác khi mở 1 item mới
            // qaItems.forEach(otherItem => {
            //     if (otherItem !== item && otherItem.classList.contains('active')) {
            //         otherItem.classList.remove('active');
            //     }
            // });
            
            // Toggle item hiện tại
            item.classList.toggle('active');
        });
    });
    
    // Xử lý form gửi câu hỏi
    const qaForm = document.querySelector('.qa-simple-form form');
    if (qaForm) {
        qaForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const question = this.querySelector('textarea').value;
            const name = this.querySelector('input[type="text"]').value;
            const email = this.querySelector('input[type="email"]').value;
            
            // Gửi dữ liệu (trong thực tế sẽ gọi API)
            console.log('New question:', { name, email, question });
            
            // Thông báo & reset form
            alert('Cảm ơn câu hỏi của bạn! Chúng tôi sẽ phản hồi sớm.');
            this.reset();
        });
    }
});