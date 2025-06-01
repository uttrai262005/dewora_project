document.addEventListener('DOMContentLoaded', function() {
    // Filter blog posts by category
    const categoryBtns = document.querySelectorAll('.category-btn');
    const blogCards = document.querySelectorAll('.blog-card');
    
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons
            categoryBtns.forEach(b => b.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            const filter = this.textContent.trim();
            
            // Filter blog cards
            blogCards.forEach(card => {
                if (filter === 'Tất cả') {
                    card.style.display = 'block';
                } else {
                    const cardTag = card.querySelector('.post-tag').textContent.trim();
                    if (cardTag === filter) {
                        card.style.display = 'block';
                    } else {
                        card.style.display = 'none';
                    }
                }
            });
        });
    });
    

});