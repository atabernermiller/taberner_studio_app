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
    
    resultsArea.style.display = 'none';
    uploadView.style.display = 'block'; // Show the main view again
}

// Show the results view
function showResultsView() {
    const uploadView = document.getElementById('upload-view');
    const resultsArea = document.getElementById('results-area');
    
    // Correctly toggle the views
    uploadView.style.display = 'none';
    resultsArea.style.display = 'block';
    
    // Set the room image in the showroom
    const roomImage = document.getElementById('room-image');
    if (uploadedImage) {
        roomImage.src = uploadedImage;
        roomImage.style.display = 'block';
    } else {
        // For preference-based recommendations, show a default room
        roomImage.src = 'assets/mock/mock-room.jpg';
        roomImage.style.display = 'block';
    }
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
    }
    
    // Set initial size for the overlay
    const overlay = document.getElementById('artwork-overlay');
    if (overlay) {
        // Use artwork's dimensions to set an initial aspect-ratio correct size
        const aspectRatio = artwork.attributes.width / artwork.attributes.height;
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
        overlay.style.top = '50%';
        overlay.style.transform = 'translate(-50%, -50%)';
        overlay.setAttribute('data-x', '0');
        overlay.setAttribute('data-y', '0');
    }
    
    // Update product details
    document.getElementById('artwork-title').textContent = artwork.title;
    document.getElementById('artwork-description').textContent = artwork.description;
    document.getElementById('artwork-price').textContent = artwork.price;
    
    // Show match score for simulated data
    const matchScoreElement = document.getElementById('match-score');
    if (artwork.filename && artwork.filename.startsWith('artwork-')) {
        // Simulated data - show a random high score
        const score = Math.floor(Math.random() * 20) + 80; // 80-99%
        matchScoreElement.textContent = score + '%';
        matchScoreElement.style.display = 'block';
    } else {
        // Real API data - hide score as it's not provided
        matchScoreElement.textContent = '';
        matchScoreElement.style.display = 'none';
    }
    
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
        
        // Create match score for simulated data
        let matchScore = '';
        if (artwork.filename && artwork.filename.startsWith('artwork-')) {
            const score = Math.floor(Math.random() * 20) + 80; // 80-99%
            matchScore = `<div class="thumbnail-score">${score}% Match</div>`;
        }
        
        thumbnail.innerHTML = `
            <img src="${thumbnailImage}" alt="${artwork.title}" loading="lazy">
            <div class="thumbnail-overlay">
                <div class="thumbnail-title">${artwork.title}</div>
                ${matchScore}
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
                // Load simulated data for preview
                console.log("Loading simulated data for preview");
                displayResults(simulatedArtworkData);
            }
        } else if (event.data.action === 'hideResults') {
            console.log('Received hideResults message');
            resetToOptions();
        }
    });
}); 