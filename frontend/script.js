// Enhanced JavaScript for Proposed Version
// This includes additional functionality for the hero section

// Smooth scroll to options
function scrollToOptions() {
    document.getElementById('options-section').scrollIntoView({
        behavior: 'smooth'
    });
}

// Demo functionality
function showDemo() {
    // For now, just scroll to options
    scrollToOptions();
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

// Simulated artwork data for fallback when API is unavailable
const simulatedArtworkData = [
    {
        id: 1,
        title: "Abstract Harmony",
        description: "A stunning abstract composition that brings harmony and sophistication to any space. This piece features a perfect balance of warm and cool tones, creating a calming yet engaging atmosphere.",
        price: "$12.95",
        product_url: "#",
        filename: "artwork-1.jpg",
        attributes: {
            width: 800,
            height: 600,
            dominant_colors: [
                { color: "#FF6B6B", percentage: 0.3 },
                { color: "#4ECDC4", percentage: 0.25 },
                { color: "#45B7D1", percentage: 0.2 }
            ]
        }
    },
    {
        id: 2,
        title: "Coastal Serenity",
        description: "Inspired by the peaceful shores of the Mediterranean, this piece captures the essence of coastal living with its soothing blues and sandy neutrals.",
        price: "$15.95",
        product_url: "#",
        filename: "artwork-2.jpg",
        attributes: {
            width: 900,
            height: 600,
            dominant_colors: [
                { color: "#87CEEB", percentage: 0.4 },
                { color: "#F4A460", percentage: 0.3 },
                { color: "#98FB98", percentage: 0.2 }
            ]
        }
    },
    {
        id: 3,
        title: "Urban Rhythm",
        description: "A dynamic composition that reflects the energy and movement of city life, perfect for modern urban spaces seeking contemporary flair.",
        price: "$18.95",
        product_url: "#",
        filename: "artwork-3.jpg",
        attributes: {
            width: 750,
            height: 600,
            dominant_colors: [
                { color: "#2C3E50", percentage: 0.35 },
                { color: "#E74C3C", percentage: 0.25 },
                { color: "#F39C12", percentage: 0.2 }
            ]
        }
    },
    {
        id: 4,
        title: "Nature's Palette",
        description: "Rich earth tones and organic forms create a connection to the natural world, bringing warmth and grounding energy to any interior.",
        price: "$14.95",
        product_url: "#",
        filename: "artwork-4.jpg",
        attributes: {
            width: 800,
            height: 700,
            dominant_colors: [
                { color: "#8B4513", percentage: 0.3 },
                { color: "#228B22", percentage: 0.25 },
                { color: "#DAA520", percentage: 0.2 }
            ]
        }
    },
    {
        id: 5,
        title: "Minimalist Elegance",
        description: "Clean lines and subtle textures define this minimalist masterpiece, offering timeless sophistication for contemporary spaces.",
        price: "$16.95",
        product_url: "#",
        filename: "artwork-5.jpg",
        attributes: {
            width: 700,
            height: 500,
            dominant_colors: [
                { color: "#F5F6F5", percentage: 0.4 },
                { color: "#A3C9A9", percentage: 0.3 },
                { color: "#A9A9A9", percentage: 0.2 }
            ]
        }
    },
    {
        id: 6,
        title: "Vibrant Energy",
        description: "Bold colors and dynamic brushstrokes create an energetic focal point that adds personality and excitement to any room.",
        price: "$13.95",
        product_url: "#",
        filename: "artwork-6.jpg",
        attributes: {
            width: 850,
            height: 650,
            dominant_colors: [
                { color: "#FF1493", percentage: 0.3 },
                { color: "#00CED1", percentage: 0.25 },
                { color: "#FFD700", percentage: 0.2 }
            ]
        }
    }
];

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

    // Option card click handlers with smooth transitions
    document.querySelectorAll('.option-card').forEach(card => {
        card.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            if (action === 'upload') {
                showView('upload-view');
            } else if (action === 'preferences') {
                showView('preferences-view');
            }
        });
    });

    // Back button handlers with smooth transitions
    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            showView('landing-view');
        });
    });

    // Form submission with enhanced loading
    const uploadForm = document.getElementById('upload-form');
    if (uploadForm) {
        uploadForm.addEventListener('submit', function(e) {
            e.preventDefault();
            showLoading();
            
            // Simulate processing time for better UX
            setTimeout(() => {
                hideLoading();
                showView('results-view');
            }, 2000);
        });
    }
});

// Form navigation functions
function showUploadForm() {
    // Hide options and show upload form
    document.getElementById('options-section').style.display = 'none';
    document.getElementById('preferences-form-container').style.display = 'none';
    document.getElementById('upload-form-container').style.display = 'block';
    
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
        console.log('Using simulated data as fallback');
        
        // Use simulated data as fallback
        displayResults(simulatedArtworkData);
        
        // Show a subtle notification that we're using demo data
        const preferencesFormContainer = document.getElementById('preferences-form-container');
        showSuccessState(preferencesFormContainer, 'Demo mode: Showing sample recommendations');
        
        // Hide the success message after 3 seconds
        setTimeout(() => {
            preferencesFormContainer.style.display = 'none';
            document.getElementById('options-section').style.display = 'grid';
        }, 3000);
    });
}

// Navigation functions
function goBackToLanding() {
    const uploadView = document.getElementById('upload-view');
    const resultsArea = document.getElementById('results-area');
    const optionsSection = document.getElementById('options-section');
    const uploadFormContainer = document.getElementById('upload-form-container');
    const preferencesFormContainer = document.getElementById('preferences-form-container');
    
    // Hide results area
    resultsArea.style.display = 'none';
    
    // Show the main view again
    uploadView.style.display = 'block';
    optionsSection.style.display = 'grid';
    
    // Hide any form containers that might be showing
    if (uploadFormContainer) uploadFormContainer.style.display = 'none';
    if (preferencesFormContainer) preferencesFormContainer.style.display = 'none';
    
    // Hide the back button
    document.getElementById('back-button').style.display = 'none';
    
    // Clear any loading states or messages - fix the class names
    const loadingElements = document.querySelectorAll('.loading-spinner, .success-state, .error-state');
    loadingElements.forEach(element => {
        element.remove();
    });
    
    // Reset uploaded image
    uploadedImage = null;
    
    // Clear any file input
    const fileInput = document.getElementById('room-photo');
    if (fileInput) fileInput.value = '';
    
    // Reset upload area to default state
    const uploadArea = document.getElementById('upload-area');
    if (uploadArea) {
        uploadArea.classList.remove('dragover', 'has-image');
        uploadArea.innerHTML = `
            <i class="fas fa-cloud-upload-alt upload-icon"></i>
            <div class="upload-text">Drop your room photo here</div>
            <div class="upload-hint">or click to browse files</div>
        `;
    }
    
    // Reset virtual showroom to show mock room image (remove has-uploaded-image class)
    const virtualShowroom = document.getElementById('virtual-showroom');
    if (virtualShowroom) {
        virtualShowroom.classList.remove('has-uploaded-image');
    }
    
    // Reset preferences form container to its original state
    if (preferencesFormContainer) {
        preferencesFormContainer.innerHTML = `
            <div class="form-header">
                <h3 class="form-title">Tell Us Your Preferences</h3>
                <p class="form-subtitle">We'll match you with the perfect Taberner Studio artwork from our collection</p>
            </div>
            
            <form id="preferences-form">
                <div class="filter-group">
                    <label for="mood-select">Mood:</label>
                    <select id="mood-select">
                        <option value="">Any Mood</option>
                        <option value="calm">Calm & Serene</option>
                        <option value="energetic">Energetic & Vibrant</option>
                        <option value="sophisticated">Sophisticated & Elegant</option>
                        <option value="cozy">Cozy & Warm</option>
                        <option value="minimalist">Minimalist & Clean</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label for="style-select">Art Style:</label>
                    <select id="style-select">
                        <option value="">Any Style</option>
                        <option value="modern">Modern</option>
                        <option value="classical">Classical</option>
                        <option value="abstract">Abstract</option>
                        <option value="impressionist">Impressionist</option>
                        <option value="contemporary">Contemporary</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label for="subject-select">Subject:</label>
                    <select id="subject-select">
                        <option value="">Any Subject</option>
                        <option value="landscape">Landscape</option>
                        <option value="portrait">Portrait</option>
                        <option value="still-life">Still Life</option>
                        <option value="abstract">Abstract</option>
                        <option value="nature">Nature</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label for="color-preference">Color Preference:</label>
                    <select id="color-preference">
                        <option value="">Any Colors</option>
                        <option value="warm">Warm Tones</option>
                        <option value="cool">Cool Tones</option>
                        <option value="neutral">Neutral</option>
                        <option value="bold">Bold & Bright</option>
                        <option value="pastel">Soft & Pastel</option>
                    </select>
                </div>
                
                <button type="submit" class="button">
                    <i class="fas fa-search"></i>
                    Find Artwork
                </button>
            </form>
        `;
        
        // Re-attach the event listener to the form
        const preferencesForm = document.getElementById('preferences-form');
        if (preferencesForm) {
            preferencesForm.addEventListener('submit', handlePreferencesSubmit);
        }
    }
    
    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
        console.log('Using simulated data as fallback');
        
        // Use simulated data as fallback
        displayResults(simulatedArtworkData);
        
        // Show a subtle notification that we're using demo data
        const uploadFormContainer = document.getElementById('upload-form-container');
        showSuccessState(uploadFormContainer, 'Demo mode: Showing sample recommendations');
        
        // Hide the success message after 3 seconds
        setTimeout(() => {
            uploadFormContainer.style.display = 'none';
            document.getElementById('options-section').style.display = 'grid';
        }, 3000);
    });
}

function displayResults(recommendations) {
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
                    
                    // Log dimensions after resize
                    const artworkImage = document.getElementById('artwork-image');
                    console.log('=== AFTER RESIZE ===');
                    console.log('Artwork image dimensions:', {
                        naturalWidth: artworkImage?.naturalWidth,
                        naturalHeight: artworkImage?.naturalHeight,
                        clientWidth: artworkImage?.clientWidth,
                        clientHeight: artworkImage?.clientHeight
                    });
                    console.log('Yellow overlay dimensions:', {
                        width: event.rect.width,
                        height: event.rect.height,
                        styleWidth: target.style.width,
                        styleHeight: target.style.height
                    });
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
    if (!artwork) return;
    
    // Update overlay image
    const artworkImage = document.getElementById('artwork-image');
    if (artworkImage) {
        // Use placeholder for simulated data, real images for API data
        if (artwork.filename && artwork.filename.startsWith('artwork-')) {
            // Simulated data - use a colored placeholder
            const colors = artwork.attributes.dominant_colors;
            const primaryColor = colors[0].color;
            artworkImage.src = `data:image/svg+xml;base64,${btoa(`
                <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100%" height="100%" fill="${primaryColor}"/>
                    <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-family="Arial" font-size="24">${artwork.title}</text>
                </svg>
            `)}`;
        } else {
            // Real API data
            artworkImage.src = `/catalog/images/${artwork.filename}`;
        }
        artworkImage.alt = artwork.title;
        
        // Set initial size for the overlay AFTER image loads
        artworkImage.onload = function() {
            const overlay = document.getElementById('artwork-overlay');
            if (overlay) {
                // Calculate aspect ratio from the loaded image
                const aspectRatio = this.naturalWidth / this.naturalHeight;
                let initialWidth = 250;
                let initialHeight = initialWidth / aspectRatio;

                // Ensure it fits reasonably within the container
                const container = document.getElementById('virtual-showroom');
                if (container) {
                    if (initialWidth > container.clientWidth * 0.8) {
                        initialWidth = container.clientWidth * 0.8;
                        initialHeight = initialWidth / aspectRatio;
                    }
                    if (initialHeight > container.clientHeight * 0.8) {
                        initialHeight = container.clientHeight * 0.8;
                        initialWidth = initialHeight * aspectRatio;
                    }
                }

                overlay.style.width = `${initialWidth}px`;
                overlay.style.height = `${initialHeight}px`;
                overlay.style.left = '50%';
                overlay.style.top = '35%';
                overlay.style.transform = 'translate(-50%, -50%)';
                overlay.setAttribute('data-x', '0');
                overlay.setAttribute('data-y', '0');
                
                // Log initial dimensions
                console.log('=== INITIAL DIMENSIONS (AFTER IMAGE LOAD) ===');
                console.log('Artwork image dimensions:', {
                    naturalWidth: this.naturalWidth,
                    naturalHeight: this.naturalHeight,
                    clientWidth: this.clientWidth,
                    clientHeight: this.clientHeight,
                    aspectRatio: aspectRatio
                });
                console.log('Yellow overlay dimensions:', {
                    width: initialWidth,
                    height: initialHeight,
                    styleWidth: overlay.style.width,
                    styleHeight: overlay.style.height
                });
            }
        };
    }
    
    // Update product details
    document.getElementById('artwork-title').textContent = artwork.title;
    document.getElementById('artwork-description').textContent = artwork.description;
    document.getElementById('artwork-price').textContent = artwork.price;
    
    // Update purchase button
    const purchaseButton = document.getElementById('purchase-button');
    if (purchaseButton) {
        purchaseButton.onclick = () => window.open(artwork.product_url, '_blank');
    }
    
    // Update thumbnail selection
    updateThumbnailSelection(index);
}

// Create thumbnail gallery
function createThumbnailGallery() {
    const gallery = document.getElementById('thumbnail-gallery');
    if (!gallery) return;
    
    gallery.innerHTML = '';
    
    allArtworks.forEach((artwork, index) => {
        const thumbnail = document.createElement('div');
        thumbnail.className = 'thumbnail-item';
        thumbnail.onclick = () => selectThumbnail(index);
        
        // Create thumbnail image
        let thumbnailImage;
        if (artwork.filename && artwork.filename.startsWith('artwork-')) {
            // Simulated data - use a colored placeholder
            const colors = artwork.attributes.dominant_colors;
            const primaryColor = colors[0].color;
            thumbnailImage = `data:image/svg+xml;base64,${btoa(`
                <svg width="200" height="150" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100%" height="100%" fill="${primaryColor}"/>
                    <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-family="Arial" font-size="16">${artwork.title}</text>
                </svg>
            `)}`;
        } else {
            // Real API data
            thumbnailImage = `/catalog/images/${artwork.filename}`;
        }
        
        thumbnail.innerHTML = `
            <img src="${thumbnailImage}" alt="${artwork.title}" loading="lazy">
            <div class="thumbnail-overlay">
                <div class="thumbnail-title">${artwork.title}</div>
                <div class="thumbnail-price">${artwork.price}</div>
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
    // Simulate download functionality
    const downloadBtn = event.target.closest('button');
    const originalText = downloadBtn.innerHTML;
    
    downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    downloadBtn.disabled = true;
    
    setTimeout(() => {
        downloadBtn.innerHTML = '<i class="fas fa-check"></i> Downloaded!';
        
        setTimeout(() => {
            downloadBtn.innerHTML = originalText;
            downloadBtn.disabled = false;
        }, 2000);
    }, 1500);
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

// Smooth view transitions
function showView(viewId) {
    // Hide all views with fade out
    const allViews = document.querySelectorAll('.view');
    allViews.forEach(view => {
        view.style.opacity = '0';
        view.style.transform = 'translateY(20px)';
        view.style.transition = 'all 0.3s ease';
    });

    // Show target view with fade in
    setTimeout(() => {
        allViews.forEach(view => view.style.display = 'none');
        const targetView = document.getElementById(viewId);
        if (targetView) {
            targetView.style.display = 'block';
            targetView.style.opacity = '0';
            targetView.style.transform = 'translateY(20px)';
            
            // Trigger reflow
            targetView.offsetHeight;
            
            // Animate in
            targetView.style.opacity = '1';
            targetView.style.transform = 'translateY(0)';
            targetView.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        }
    }, 300);
}

// Enhanced loading state management
function showLoading() {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
        spinner.style.display = 'flex';
        spinner.style.opacity = '0';
        setTimeout(() => {
            spinner.style.opacity = '1';
            spinner.style.transition = 'opacity 0.3s ease';
        }, 10);
    }
}

function hideLoading() {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
        spinner.style.opacity = '0';
        setTimeout(() => {
            spinner.style.display = 'none';
        }, 300);
    }
}

// Show the results view
function showResultsView() {
    const uploadView = document.getElementById('upload-view');
    const resultsArea = document.getElementById('results-area');
    const optionsSection = document.getElementById('options-section');
    
    // Hide the options section (the two cards) and upload view
    optionsSection.style.display = 'none';
    uploadView.style.display = 'none';
    resultsArea.style.display = 'block';
    
    // Show back button in header
    document.getElementById('back-button').style.display = 'flex';
    
    // Set the room image in the showroom
    const roomImage = document.getElementById('room-image');
    const virtualShowroom = document.getElementById('virtual-showroom');
    
    if (uploadedImage) {
        // User uploaded an image - show it and hide the background
        roomImage.src = uploadedImage;
        roomImage.style.display = 'block';
        virtualShowroom.classList.add('has-uploaded-image');
    } else {
        // No uploaded image (preference-based) - hide the room image and show background
        roomImage.style.display = 'none';
        virtualShowroom.classList.remove('has-uploaded-image');
    }
    
    // Scroll to the very top of the page with a delay to ensure DOM is updated
    setTimeout(() => {
        // Try multiple approaches to ensure we scroll to the top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Also try scrolling to the results header as backup
        const resultsHeader = document.querySelector('.results-header');
        if (resultsHeader) {
            resultsHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 100);
}

// Enhanced resetToOptions function
function resetToOptions() {
    goBackToLanding();
} 