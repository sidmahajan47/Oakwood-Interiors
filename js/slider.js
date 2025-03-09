document.addEventListener('DOMContentLoaded', function() {
    // Before-After Slider Functionality
    console.log('Initializing sliders...');
    const sliders = document.querySelectorAll('.before-after-slider');
    
    sliders.forEach(slider => {
        console.log('Setting up slider:', slider);
        const rangeInput = slider.querySelector('.slider-range');
        const afterImg = slider.querySelector('.after-img');
        const sliderLine = slider.querySelector('.slider-line');
        const sliderButton = slider.querySelector('.slider-button');
        
        if (!rangeInput || !afterImg) {
            console.error('Missing required slider elements', {rangeInput, afterImg});
            return;
        }
        
        // Ensure the range input has proper z-index and is clickable
        rangeInput.style.zIndex = '20';
        rangeInput.style.opacity = '0';
        rangeInput.style.cursor = 'col-resize';
        
        // Initialize slider position
        updateSliderPosition(rangeInput.value);
        console.log('Initial slider position set to', rangeInput.value);
        
        // Update slider on input change
        rangeInput.addEventListener('input', function() {
            console.log('Slider moved to', this.value);
            updateSliderPosition(this.value);
        });
        
        // Handle clicks directly on the slider container as fallback
        slider.addEventListener('click', function(e) {
            // Only if the click wasn't on the range input directly
            if (e.target !== rangeInput) {
                const rect = slider.getBoundingClientRect();
                const posX = e.clientX - rect.left;
                const percent = (posX / rect.width) * 100;
                console.log('Slider container clicked, setting to', percent);
                rangeInput.value = percent;
                updateSliderPosition(percent);
            }
        });
        
        // Add active class when dragging
        rangeInput.addEventListener('mousedown', function() {
            console.log('Slider drag started');
            slider.classList.add('active');
            document.body.style.cursor = 'col-resize'; // Force cursor
        });
        
        rangeInput.addEventListener('touchstart', function() {
            console.log('Slider touch started');
            slider.classList.add('active');
        });
        
        // Remove active class when done dragging
        window.addEventListener('mouseup', function() {
            if (slider.classList.contains('active')) {
                console.log('Slider drag ended');
                slider.classList.remove('active');
                document.body.style.cursor = ''; // Reset cursor
            }
        });
        
        window.addEventListener('touchend', function() {
            if (slider.classList.contains('active')) {
                console.log('Slider touch ended');
                slider.classList.remove('active');
            }
        });
        
        // Function to update slider position
        function updateSliderPosition(value) {
            // Ensure value is a number between 0-100
            value = parseFloat(value);
            if (isNaN(value)) value = 50;
            value = Math.max(0, Math.min(100, value));
            
            const percentage = value + '%';
            
            // Apply clipping path for after image
            const clipPathVal = `polygon(0 0, ${percentage} 0, ${percentage} 100%, 0 100%)`;
            afterImg.style.clipPath = clipPathVal;
            afterImg.style.webkitClipPath = clipPathVal; // For Safari
            
            // Update slider line position
            if (sliderLine) {
                sliderLine.style.left = percentage;
            }
            
            // Update slider button position
            if (sliderButton) {
                sliderButton.style.left = percentage;
            }
        }
        
        // Handle window resize
        window.addEventListener('resize', function() {
            console.log('Window resized, updating slider');
            updateSliderPosition(rangeInput.value);
        });
        
        // Force update when images load to ensure proper positioning
        const images = slider.querySelectorAll('img');
        images.forEach(img => {
            img.addEventListener('load', function() {
                console.log('Image loaded, updating slider');
                updateSliderPosition(rangeInput.value);
            });
            
            // Also check if already loaded
            if (img.complete) {
                console.log('Image already loaded, updating slider');
                updateSliderPosition(rangeInput.value);
            }
        });
        
        console.log('Slider setup complete');
    });
});