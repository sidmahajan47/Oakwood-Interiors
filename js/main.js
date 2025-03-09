document.addEventListener('DOMContentLoaded', function() {
    // Mobile Navigation Toggle
    const header = document.querySelector('.main-header');
    const mainNav = document.querySelector('.main-nav');
    let navToggle;
    
    // Create hamburger button if it doesn't exist
    if (!document.querySelector('.nav-toggle')) {
        navToggle = document.createElement('div');
        navToggle.className = 'nav-toggle';
        navToggle.setAttribute('aria-label', 'Toggle navigation menu');
        navToggle.innerHTML = '<i class="fas fa-bars"></i>';
        header.querySelector('.container').appendChild(navToggle);
        
        // Toggle menu on hamburger click with improved animation
        navToggle.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent event bubbling
            
            // Toggle active class
            mainNav.classList.toggle('active');
            
            // Toggle icon with smooth transition
            const icon = this.querySelector('i');
            if (mainNav.classList.contains('active')) {
                icon.style.transform = 'rotate(90deg)';
                setTimeout(() => {
                    icon.className = 'fas fa-times';
                    icon.style.transform = 'rotate(0deg)';
                }, 150);
            } else {
                icon.style.transform = 'rotate(90deg)';
                setTimeout(() => {
                    icon.className = 'fas fa-bars';
                    icon.style.transform = 'rotate(0deg)';
                }, 150);
            }
        });
        
        // Add elegant scroll effect for header
        window.addEventListener('scroll', function() {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!mainNav.contains(e.target) && !navToggle.contains(e.target) && mainNav.classList.contains('active')) {
                mainNav.classList.remove('active');
                navToggle.querySelector('i').classList.add('fa-bars');
                navToggle.querySelector('i').classList.remove('fa-times');
            }
        });
        
        // Close menu when window is resized to desktop size
        window.addEventListener('resize', function() {
            if (window.innerWidth > 768 && mainNav.classList.contains('active')) {
                mainNav.classList.remove('active');
                navToggle.querySelector('i').classList.remove('fa-bars');
                
            }
        });
    }
    
    // Smooth Scrolling for Anchor Links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 100,
                    behavior: 'smooth'
                });
                
                // Close mobile menu if open
                mainNav.classList.remove('active');
                navToggle.querySelector('i').classList.add('fa-bars');
                navToggle.querySelector('i').classList.remove('fa-times');
            }
        });
    });
    
    // Form Validation
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Simple validation
            let isValid = true;
            const inputs = this.querySelectorAll('input, textarea');
            
            inputs.forEach(input => {
                if (input.hasAttribute('required') && !input.value.trim()) {
                    isValid = false;
                    input.classList.add('error');
                } else {
                    input.classList.remove('error');
                }
            });
            
            if (isValid) {
                // Show success message
                const successMessage = document.createElement('div');
                successMessage.className = 'success-message';
                successMessage.textContent = 'Thank you! Your message has been sent.';
                
                this.innerHTML = '';
                this.appendChild(successMessage);
                
                // In a real application, you would send the form data to a server here
            }
        });
    }
});