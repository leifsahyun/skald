// Main JavaScript functionality
document.addEventListener('DOMContentLoaded', function() {
    // Form submission handler
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Thank you for your message! This is a demo form.');
            contactForm.reset();
        });
    }

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Add active class to current page in navigation
    const currentPath = location.pathname;
    const currentPage = currentPath.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        const linkHref = link.getAttribute('href');
        // Match both exact filename and full path to handle subdirectories
        if (linkHref === currentPage || currentPath.endsWith('/' + linkHref)) {
            link.classList.add('active');
        }
    });
});
