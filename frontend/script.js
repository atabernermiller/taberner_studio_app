// Enhanced JavaScript for Proposed Version
// This includes additional functionality for the hero section

// Smooth scroll to options
function scrollToOptions() {
    document.getElementById('options-section').scrollIntoView({
        behavior: 'smooth'
    });
}

// Enhanced loading states
function showLoadingState(element) {
    element.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <span>Analyzing your space...</span>
        </div>
    `;
}

// Enhanced success states
function showSuccessState(element, message) {
    element.innerHTML = `
        <div class="success-state">
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        </div>
    `;
}

// Enhanced error handling
function showErrorState(element, message) {
    element.innerHTML = `
        <div class="error-state">
            <i class="fas fa-exclamation-circle"></i>
            <span>${message}</span>
        </div>
    `;
}

// Rest of the original script functionality would be included here
// For now, we'll include the basic structure

// Global variables
let currentView = 'upload';
let uploadedImage = null;
let allArtworks = []; // Will hold recommendations from the server

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('Enhanced Taberner Studio App initialized');
    
    // Add smooth scrolling to all internal links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Add hero section animations
    const heroSection = document.querySelector('.hero-section');
    if (heroSection) {
        heroSection.style.opacity = '0';
        heroSection.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            heroSection.style.transition = 'all 0.6s ease';
            heroSection.style.opacity = '1';
            heroSection.style.transform = 'translateY(0)';
        }, 100);
    }
});

// Form navigation functions
function showUploadForm() {
    // Hide options and show upload form
    document.getElementById('options-section').style.display = 'none';
    document.getElementById('preferences-form-container').style.display = 'none';
    document.getElementById('upload-form-container').style.display = 'block';
    
    // Show back button
    document.getElementById('back-button').style.display = 'flex';
    
    // Scroll to form
    document.getElementById('upload-form-container').scrollIntoView({
        behavior: 'smooth'
    });
}

function showPreferencesForm() {
    // Hide options and show preferences form
    document.getElementById('options-section').style.display = 'none';
    document.getElementById('upload-form-container').style.display = 'none';
    document.getElementById('preferences-form-container').style.display = 'block';
    
    // Show back button
    document.getElementById('back-button').style.display = 'flex';
    
    // Scroll to form
    document.getElementById('preferences-form-container').scrollIntoView({
        behavior: 'smooth'
    });
}

// Enhanced back button functionality
function backToOptions() {
    document.querySelectorAll('.form-container').forEach(form => {
        form.style.display = 'none';
    });
    
    document.querySelector('.options-container').style.display = 'grid';
    document.querySelector('.upload-header').style.display = 'block';
    
    // Scroll back to top smoothly
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Add event listeners for back buttons
document.addEventListener('DOMContentLoaded', function() {
    const backButtons = document.querySelectorAll('.back-button');
    backButtons.forEach(button => {
        button.addEventListener('click', backToOptions);
    });
});

// Initialize upload functionality
function initializeUpload() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('room-photo');
    
    if (!uploadArea || !fileInput) return;
    
    // Click to upload
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    // Drag and drop functionality
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    });
    
    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });
    
    // Form submissions
    const uploadForm = document.getElementById('upload-form');
    const preferencesForm = document.getElementById('preferences-form');
    
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleUploadSubmit);
    }
    
    if (preferencesForm) {
        preferencesForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handlePreferencesSubmit(e);
        });
    }
}

// Handle file upload
function handleFileUpload(file) {
    if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        uploadedImage = e.target.result; // Store the uploaded image

        // Hide upload form, show loading state, and get recommendations
        const uploadFormContainer = document.getElementById('upload-form-container');
        showLoadingState(uploadFormContainer);
        getRecommendations();
    };
    reader.readAsDataURL(file);
}

// Handle upload form submission
function handleUploadSubmit(event) {
    event.preventDefault();
    if (!uploadedImage) {
        alert('Please select an image first.');
        return;
    }
    const uploadFormContainer = document.getElementById('upload-form-container');
    showLoadingState(uploadFormContainer);
    getRecommendations();
}

// Handle preferences form submission
function handlePreferencesSubmit(event) {
    event.preventDefault();
    
    // Get form data
    const moodSelect = document.getElementById('mood-select');
    const styleSelect = document.getElementById('style-select');
    const subjectSelect = document.getElementById('subject-select');
    const colorSelect = document.getElementById('color-preference');
    
    const preferences = {
        mood: moodSelect ? moodSelect.value : '',
        style: styleSelect ? styleSelect.value : '',
        subject: subjectSelect ? subjectSelect.value : '',
        color: colorSelect ? colorSelect.value : ''
    };
    
    // Show loading state
    const preferencesFormContainer = document.getElementById('preferences-form-container');
    showLoadingState(preferencesFormContainer);
    
    // Get recommendations by preferences
    getRecommendationsByPreferences(preferences);
}

// Get recommendations by preferences
function getRecommendationsByPreferences(preferences) {
    fetch('/recommend', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            type: 'preferences',
            preferences: preferences
        }),
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => { throw new Error(err.error || 'Server error') });
        }
        return response.json();
    })
    .then(data => {
        if (data.recommendations && data.recommendations.length > 0) {
            displayResults(data.recommendations);
        } else {
            showErrorState(document.getElementById('results-area'), 'No recommendations found for your preferences.');
            showResultsView();
        }
    })
    .catch(error => {
        console.error('Error getting recommendations by preferences:', error);
        showErrorState(document.getElementById('results-area'), 'Unable to get recommendations. Please try again.');
        showResultsView();
    });
}

// Navigation functions
function goBackToLanding() {
    const uploadView = document.getElementById('upload-view');
    const resultsArea = document.getElementById('results-area');
    
    resultsArea.style.display = 'none';
    uploadView.style.display = 'block'; // Show the main view again
}

// Show the results view
function showResultsView() {
    const uploadView = document.getElementById('upload-view');
    const resultsArea = document.getElementById('results-area');
    
    console.log('showResultsView called - Current scroll position:', window.scrollY);
    
    // Correctly toggle the views
    uploadView.style.display = 'none';
    resultsArea.style.display = 'block';
    
    // Set the room image in the showroom
    const roomImage = document.getElementById('room-image');
    if (roomImage) {
        if (uploadedImage) {
            roomImage.src = uploadedImage;
            roomImage.style.display = 'block';
        } else {
            // For preference-based recommendations, show a default room
            roomImage.src = 'assets/mock/mock-room.jpg';
            roomImage.style.display = 'block';
        }
    } else {
        console.error('Room image element not found');
    }
    
    console.log('About to scroll to top - Current position:', window.scrollY);
    
    // Use setTimeout to ensure DOM is updated before scrolling
    setTimeout(() => {
        console.log('Executing scroll to top - Position before scroll:', window.scrollY);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Check position after a short delay
        setTimeout(() => {
            console.log('Position after scroll:', window.scrollY);
        }, 500);
    }, 100);
}

// Enhanced resetToOptions function
function resetToOptions() {
    goBackToLanding();
}

// Enhanced Results Experience
let currentArtworkIndex = 0;
let isDragging = false;
let isResizing = false;
let dragStartX, dragStartY;
let resizeStartX, resizeStartY;
let originalWidth, originalHeight;
let originalX, originalY;

function getRecommendations() {
    if (!uploadedImage) {
        showErrorState(document.getElementById('upload-form-container'), 'Please upload an image first.');
        return;
    }

    fetch('/recommend', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            type: 'upload',
            roomImage: uploadedImage
        }),
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => { throw new Error(err.error || 'Server error') });
        }
        return response.json();
    })
    .then(data => {
        if (data.recommendations && data.recommendations.length > 0) {
            displayResults(data.recommendations);
        } else {
            showErrorState(document.getElementById('results-area'), 'No recommendations found for your image.');
            showResultsView();
        }
    })
    .catch(error => {
        console.error('Error getting recommendations:', error);
        showErrorState(document.getElementById('results-area'), 'Unable to get recommendations. Please try again.');
        showResultsView();
    });
}

function displayResults(recommendations) {
    console.log('displayResults called with', recommendations.length, 'recommendations');
    allArtworks = recommendations;
    showResultsView();

    if (allArtworks.length > 0) {
        createThumbnailGallery();
        selectThumbnail(0); // Display the first recommendation
        initializeArtworkInteraction();
    }
}

function initializeArtworkInteraction() {
    interact('#artwork-overlay')
        .draggable({
            listeners: {
                move(event) {
                    const target = event.target;
                    let x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                    let y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
                    target.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
                    target.setAttribute('data-x', x);
                    target.setAttribute('data-y', y);
                }
            }
        })
        .resizable({
            edges: {
                left: true,
                right: true,
                bottom: true,
                top: true
            },
            listeners: {
                move(event) {
                    const target = event.target;
                    target.style.width = `${event.rect.width}px`;
                    target.style.height = `${event.rect.height}px`;
                    
                    // Debug logging during resize
                    console.log('=== RESIZE DEBUG ===');
                    console.log('Resize event rect width:', event.rect.width);
                    console.log('Resize event rect height:', event.rect.height);
                    console.log('Target style width:', target.style.width);
                    console.log('Target style height:', target.style.height);
                    console.log('Target offsetWidth (including border):', target.offsetWidth);
                    console.log('Target offsetHeight (including border):', target.offsetHeight);
                    console.log('Target clientWidth (excluding border):', target.clientWidth);
                    console.log('Target clientHeight (excluding border):', target.clientHeight);
                    
                    // Check the image inside
                    const artworkImage = document.getElementById('artwork-image');
                    if (artworkImage) {
                        console.log('Image offsetWidth:', artworkImage.offsetWidth);
                        console.log('Image offsetHeight:', artworkImage.offsetHeight);
                        console.log('Image naturalWidth:', artworkImage.naturalWidth);
                        console.log('Image naturalHeight:', artworkImage.naturalHeight);
                    }
                    console.log('=== END RESIZE DEBUG ===');
                },
            },
            modifiers: [interact.modifiers.restrictSize({
                min: {
                    width: 50,
                    height: 50
                }
            }), interact.modifiers.aspectRatio({
                ratio: 'preserve'
            }), ]
        });
}

// Update artwork display
function updateArtworkDisplay(index) {
    const artwork = allArtworks[index];
    if (!artwork) {
        console.error('No artwork found at index:', index);
        return;
    }
    
    console.log('Updating artwork display for:', artwork);
    
    // Update overlay image
    const artworkImage = document.getElementById('artwork-image');
    if (artworkImage) {
        // Use real image from catalog
        const imageSrc = `/catalog/images/${artwork.filename}`;
        console.log('Setting image src to:', imageSrc);
        
        artworkImage.src = imageSrc;
        artworkImage.alt = artwork.title;
        
        // Add error handling for image loading
        artworkImage.onerror = function() {
            console.error('Failed to load image:', imageSrc);
            console.error('Artwork data:', artwork);
            // Show error message to user
            const overlay = document.getElementById('artwork-overlay');
            if (overlay) {
                overlay.innerHTML = '<div style="color: red; text-align: center; padding: 20px;">Unable to load image</div>';
            }
        };
        
        // Set initial overlay size with a default aspect ratio to prevent NaN height
        const overlay = document.getElementById('artwork-overlay');
        if (overlay) {
            // Use a default aspect ratio of 4:3 for initial sizing
            const defaultAspectRatio = 4/3;
            const baseWidth = 250;
            const baseHeight = baseWidth / defaultAspectRatio;
            
            overlay.style.width = baseWidth + 'px';
            overlay.style.height = baseHeight + 'px';
            overlay.style.left = '50%';
            overlay.style.top = '50%';
            overlay.style.transform = 'translate(-50%, -50%)';
            overlay.setAttribute('data-x', '0');
            overlay.setAttribute('data-y', '0');
            
            console.log('=== YELLOW BOX SIZING DEBUG ===');
            console.log('Artwork dimensions:', artwork.width, 'x', artwork.height);
            console.log('Default aspect ratio used:', defaultAspectRatio);
            console.log('Initial overlay size:', baseWidth, 'x', baseHeight);
            console.log('Overlay computed style width:', getComputedStyle(overlay).width);
            console.log('Overlay computed style height:', getComputedStyle(overlay).height);
            console.log('Overlay offsetWidth (including border):', overlay.offsetWidth);
            console.log('Overlay offsetHeight (including border):', overlay.offsetHeight);
            console.log('Overlay clientWidth (excluding border):', overlay.clientWidth);
            console.log('Overlay clientHeight (excluding border):', overlay.clientHeight);
            console.log('Artwork image natural width:', artworkImage.naturalWidth);
            console.log('Artwork image natural height:', artworkImage.naturalHeight);
            console.log('Artwork image computed width:', getComputedStyle(artworkImage).width);
            console.log('Artwork image computed height:', getComputedStyle(artworkImage).height);
            console.log('=== END DEBUG ===');
        }
        
        // Update overlay size after image loads to match actual aspect ratio
        artworkImage.onload = function() {
            console.log('Image loaded successfully:', imageSrc);
            const overlay = document.getElementById('artwork-overlay');
            if (overlay && this.naturalWidth && this.naturalHeight) {
                const aspectRatio = this.naturalWidth / this.naturalHeight;
                const baseWidth = 250;
                const calculatedHeight = baseWidth / aspectRatio;
                
                overlay.style.width = baseWidth + 'px';
                overlay.style.height = calculatedHeight + 'px';
                
                console.log('=== AFTER IMAGE LOAD ===');
                console.log('Artwork image natural width:', this.naturalWidth);
                console.log('Artwork image natural height:', this.naturalHeight);
                console.log('Artwork image computed width:', getComputedStyle(this).width);
                console.log('Artwork image computed height:', getComputedStyle(this).height);
                console.log('Overlay offsetWidth (including border):', overlay.offsetWidth);
                console.log('Overlay offsetHeight (including border):', overlay.offsetHeight);
                console.log('Overlay clientWidth (excluding border):', overlay.clientWidth);
                console.log('Overlay clientHeight (excluding border):', overlay.clientHeight);
                console.log('Border width (computed):', overlay.offsetWidth - overlay.clientWidth);
                console.log('Border height (computed):', overlay.offsetHeight - overlay.clientHeight);
            }
        };
    } else {
        console.error('Artwork image element not found');
    }
    
    // Update artwork info
    const artworkTitle = document.getElementById('artwork-title');
    const artworkDescription = document.getElementById('artwork-description');
    const artworkPrice = document.getElementById('artwork-price');
    
    if (artworkTitle) artworkTitle.textContent = artwork.title;
    if (artworkDescription) artworkDescription.textContent = artwork.description;
    if (artworkPrice) {
        // Remove any existing dollar sign and add a single one
        const cleanPrice = artwork.price.toString().replace('$', '');
        artworkPrice.textContent = `$${cleanPrice}`;
    }
    
    // Update current artwork index
    currentArtworkIndex = index;
    
    // Update navigation buttons
    updateNavigationButtons();
    
    // Update thumbnail selection
    updateThumbnailSelection(index);
}

// Create thumbnail gallery
function createThumbnailGallery() {
    const gallery = document.getElementById('thumbnail-gallery');
    if (!gallery) {
        console.error('Thumbnail gallery element not found');
        return;
    }
    
    console.log('Creating thumbnail gallery with', allArtworks.length, 'artworks');
    gallery.innerHTML = '';
    
    allArtworks.forEach((artwork, index) => {
        console.log('Creating thumbnail for artwork:', artwork);
        
        const thumbnail = document.createElement('div');
        thumbnail.className = 'thumbnail-item';
        thumbnail.onclick = () => selectThumbnail(index);
        
        // Use real image from catalog
        const thumbnailImage = `/catalog/images/${artwork.filename}`;
        console.log('Thumbnail image src:', thumbnailImage);
        
        thumbnail.innerHTML = `
            <img src="${thumbnailImage}" alt="${artwork.title}" loading="lazy" 
                 onerror="console.error('Failed to load thumbnail:', '${thumbnailImage}')"
                 onload="console.log('Thumbnail loaded:', '${thumbnailImage}')">
            <div class="thumbnail-overlay">
                <div class="thumbnail-title">${artwork.title}</div>
                <div class="thumbnail-price">$${artwork.price.toString().replace('$', '')}</div>
            </div>
        `;
        
        gallery.appendChild(thumbnail);
    });
}

// Select thumbnail and update display
function selectThumbnail(index) {
    currentArtworkIndex = index;
    updateArtworkDisplay(index);
    
    // Add visual feedback
    const thumbnails = document.querySelectorAll('.thumbnail-item');
    thumbnails.forEach((thumb, i) => {
        thumb.classList.toggle('selected', i === index);
    });
    
    // Smooth scroll to showroom
    document.getElementById('virtual-showroom').scrollIntoView({
        behavior: 'smooth',
        block: 'center'
    });
}

// Update thumbnail selection state
function updateThumbnailSelection(index) {
    const thumbnails = document.querySelectorAll('.thumbnail-item');
    thumbnails.forEach((thumb, i) => {
        thumb.classList.toggle('selected', i === index);
    });
}

// Download mockup functionality
function downloadMockup() {
    const downloadBtn = event.target.closest('button');
    const originalText = downloadBtn.innerHTML;
    
    downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    downloadBtn.disabled = true;
    
    // Get the virtual showroom element
    const showroom = document.getElementById('virtual-showroom');
    const artworkOverlay = document.getElementById('artwork-overlay');
    const artworkImage = document.getElementById('artwork-image');
    const roomImage = document.getElementById('room-image');
    
    if (!showroom || !artworkOverlay || !artworkImage) {
        console.error('Required elements not found for mockup generation');
        downloadBtn.innerHTML = originalText;
        downloadBtn.disabled = false;
        return;
    }
    
    // Ensure artwork maintains proper aspect ratio
    const artworkAspectRatio = artworkImage.naturalWidth / artworkImage.naturalHeight;
    const overlayWidth = parseFloat(artworkOverlay.style.width) || 250;
    const overlayHeight = overlayWidth / artworkAspectRatio;
    
    // Update overlay dimensions to maintain aspect ratio
    artworkOverlay.style.width = overlayWidth + 'px';
    artworkOverlay.style.height = overlayHeight + 'px';
    
    // Use html2canvas to capture the showroom
    if (typeof html2canvas !== 'undefined') {
        html2canvas(showroom, {
            useCORS: true,
            allowTaint: true,
            backgroundColor: null,
            scale: 2, // Higher quality
            width: showroom.offsetWidth,
            height: showroom.offsetHeight,
            onclone: function(clonedDoc) {
                // Ensure the cloned element maintains the same styling
                const clonedShowroom = clonedDoc.getElementById('virtual-showroom');
                const clonedOverlay = clonedDoc.getElementById('artwork-overlay');
                const clonedArtwork = clonedDoc.getElementById('artwork-image');
                
                if (clonedShowroom && clonedOverlay && clonedArtwork) {
                    // Apply the same positioning and sizing
                    clonedOverlay.style.width = overlayWidth + 'px';
                    clonedOverlay.style.height = overlayHeight + 'px';
                    clonedOverlay.style.position = 'absolute';
                    clonedOverlay.style.left = artworkOverlay.style.left || '50px';
                    clonedOverlay.style.top = artworkOverlay.style.top || '50px';
                    clonedArtwork.style.width = '100%';
                    clonedArtwork.style.height = '100%';
                    clonedArtwork.style.objectFit = 'cover';
                }
            }
        }).then(function(canvas) {
            // Create download link
            const link = document.createElement('a');
            link.download = `taberner-studio-mockup-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            
            // Reset button
            downloadBtn.innerHTML = '<i class="fas fa-check"></i> Downloaded!';
            setTimeout(() => {
                downloadBtn.innerHTML = originalText;
                downloadBtn.disabled = false;
            }, 2000);
        }).catch(function(error) {
            console.error('Error generating mockup:', error);
            downloadBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
            setTimeout(() => {
                downloadBtn.innerHTML = originalText;
                downloadBtn.disabled = false;
            }, 2000);
        });
    } else {
        // Fallback if html2canvas is not available
        console.warn('html2canvas not available, using fallback method');
        
        // Create a simple canvas-based mockup
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size
        canvas.width = showroom.offsetWidth * 2;
        canvas.height = showroom.offsetHeight * 2;
        
        // Create a background (room image or solid color)
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add text overlay
        ctx.fillStyle = '#333';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Taberner Studio Mockup', canvas.width / 2, 50);
        ctx.font = '16px Arial';
        ctx.fillText('Artwork: ' + (allArtworks[currentArtworkIndex]?.title || 'Unknown'), canvas.width / 2, 80);
        
        // Download the canvas
        const link = document.createElement('a');
        link.download = `taberner-studio-mockup-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        downloadBtn.innerHTML = '<i class="fas fa-check"></i> Downloaded!';
        setTimeout(() => {
            downloadBtn.innerHTML = originalText;
            downloadBtn.disabled = false;
        }, 2000);
    }
}

// Save to favorites functionality
function saveFavorites() {
    const saveBtn = event.target.closest('button');
    const originalText = saveBtn.innerHTML;
    
    saveBtn.innerHTML = '<i class="fas fa-heart"></i> Saved!';
    saveBtn.classList.add('saved');
    
    setTimeout(() => {
        saveBtn.innerHTML = originalText;
        saveBtn.classList.remove('saved');
    }, 2000);
}

// Initialize upload functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('Enhanced Taberner Studio app loaded');
    
    // Initialize upload functionality
    initializeUpload();
    
    // Listen for messages from preview system
    window.addEventListener('message', function(event) {
        if (event.data.action === 'showResults') {
            console.log('Received showResults message');
            // This is for external control, might need mock data or a specific artwork ID
            if (allArtworks.length > 0) {
                showResultsView();
            } else {
                // Show error if no real data is available
                console.log("No artwork data available for preview");
                showErrorState(document.getElementById('results-area'), 'No artwork data available. Please upload an image first.');
                showResultsView();
            }
        } else if (event.data.action === 'hideResults') {
            console.log('Received hideResults message');
            resetToOptions();
        }
    });
});

// Update navigation buttons
function updateNavigationButtons() {
    const prevBtn = document.getElementById('prev-artwork');
    const nextBtn = document.getElementById('next-artwork');
    
    if (prevBtn) {
        prevBtn.disabled = currentArtworkIndex === 0;
        prevBtn.style.opacity = currentArtworkIndex === 0 ? '0.5' : '1';
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentArtworkIndex === allArtworks.length - 1;
        nextBtn.style.opacity = currentArtworkIndex === allArtworks.length - 1 ? '0.5' : '1';
    }
}

// Navigate to previous artwork
function previousArtwork() {
    if (currentArtworkIndex > 0) {
        currentArtworkIndex--;
        updateArtworkDisplay(currentArtworkIndex);
    }
}

// Navigate to next artwork
function nextArtwork() {
    if (currentArtworkIndex < allArtworks.length - 1) {
        currentArtworkIndex++;
        updateArtworkDisplay(currentArtworkIndex);
    }
} 