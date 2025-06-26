// Enhanced JavaScript for Proposed Version
// This includes additional functionality for the hero section

// Prevent browser scroll restoration
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

// Clear scroll position before page unload to prevent browser scroll restoration
window.addEventListener('beforeunload', function() {
    console.log('Page unloading - clearing scroll position');
    window.scrollTo(0, 0);
});

// Image URL cache to reduce API calls
const imageUrlCache = new Map();

function getImageUrl(filename) {
    // Check if we already have this URL cached
    if (imageUrlCache.has(filename)) {
        console.log(`[ImageCache] Using cached URL for ${filename}`);
        return imageUrlCache.get(filename);
    }

    // If not cached, fetch from backend
    console.log(`[ImageCache] Fetching URL for ${filename}`);
    
    return fetch(`/catalog/images/${filename}`)
        .then(response => {
            if (!response.ok) {
                if (response.status === 429) {
                    console.warn(`[ImageCache] Rate limit hit for ${filename}, using fallback`);
                    // Return a fallback URL or retry after delay
                    return `/catalog/images/${filename}`;
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            const s3Url = data.url;
            // Cache the S3 URL for future use
            imageUrlCache.set(filename, s3Url);
            console.log(`[ImageCache] Cached S3 URL for ${filename}`);
            return s3Url;
        })
        .catch(error => {
            console.error(`[ImageCache] Error fetching URL for ${filename}:`, error);
            // Return fallback URL
            return `/catalog/images/${filename}`;
        });
}

// Smooth scroll to options
function scrollToOptions() {
    document.getElementById('options-section').scrollIntoView({
        behavior: 'smooth'
    });
}

// Enhanced loading states
function showLoadingState(element, message = 'Analyzing your space...') {
    element.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <span>${message}</span>
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
let currentArtworkIndex = 0;
let allArtworks = []; // Will hold recommendations from the server
let isUploading = false; // Flag to prevent multiple uploads
let recommendations = null;
let currentRecommendations = null;

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== LANDING PAGE LOAD DEBUG ===');
    console.log('Initial scroll position:', window.scrollY);
    console.log('Initial pageYOffset:', window.pageYOffset);
    console.log('Document height:', document.documentElement.scrollHeight);
    console.log('Viewport height:', window.innerHeight);
    
    // Force scroll to top on page load to prevent browser scroll restoration
    window.scrollTo(0, 0);
    
    // More aggressive scroll-to-top handling
    function forceScrollToTop() {
        if (window.scrollY > 0) {
            console.log('Forcing scroll to top from position:', window.scrollY);
            window.scrollTo({
                top: 0,
                left: 0,
                behavior: 'instant' // Use instant to override any smooth scrolling
            });
        }
    }
    
    // Force scroll to top multiple times to handle browser restoration
    forceScrollToTop();
    setTimeout(forceScrollToTop, 50);
    setTimeout(forceScrollToTop, 100);
    setTimeout(forceScrollToTop, 200);
    setTimeout(forceScrollToTop, 500);
    
    // Log position after forcing scroll to top
    setTimeout(() => {
        console.log('Scroll position after forcing to top:', window.scrollY);
        console.log('=== END LANDING PAGE LOAD DEBUG ===');
    }, 100);
    
    // Additional scroll monitoring for debugging
    let scrollCheckCount = 0;
    const maxScrollChecks = 10;
    
    function checkScrollPosition() {
        scrollCheckCount++;
        console.log(`Scroll check ${scrollCheckCount}: position = ${window.scrollY}`);
        
        if (window.scrollY > 100 && scrollCheckCount < maxScrollChecks) { // Allow small scroll amounts
            console.log('Page scrolled down, forcing back to top...');
            forceScrollToTop();
            setTimeout(checkScrollPosition, 200);
        }
    }
    
    // Start monitoring scroll position
    setTimeout(checkScrollPosition, 500);
    
    // Animate hero section on load
    const heroSection = document.querySelector('.hero-section');
    if (heroSection) {
        heroSection.style.opacity = '0';
        heroSection.style.transform = 'translateY(30px)';
        
        setTimeout(() => {
            heroSection.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
            heroSection.style.opacity = '1';
            heroSection.style.transform = 'translateY(0)';
        }, 100);
    }
    
    // Set up smooth scrolling for anchor links
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
    
    // Initialize the application - only call once
    initializeUpload();
    initializeEventListeners();
    
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

    // Dynamically populate preferences form selects from backend
    fetch('/api/preferences-options')
        .then(res => res.json())
        .then(options => {
            populateSelect('mood-select', options.moods, 'Any Mood');
            populateSelect('style-select', options.styles, 'Any Style');
            populateSelect('subject-select', options.subjects, 'Any Subject');
            populateSelect('color-preference', options.colors, 'Any Colors');
        });
});

function populateSelect(selectId, values, anyLabel) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = `<option value="">${anyLabel}</option>`;
    values.forEach(val => {
        if (val && val.trim()) {
            select.innerHTML += `<option value="${val}">${val}</option>`;
        }
    });
}

// Form navigation functions
function showUploadForm() {
    console.log('=== SWITCHING TO UPLOAD WORKFLOW ===');
    console.log('[showUploadForm] Cache state BEFORE clearing:', {
        allArtworks,
        currentArtworkIndex,
        recommendations,
        currentRecommendations,
        uploadedImage
    });
    // Clear photo cache to prevent showing previous workflow's recommendations
    console.log('=== CLEARING PHOTO CACHE FOR UPLOAD WORKFLOW ===');
    allArtworks = [];
    currentArtworkIndex = 0;
    recommendations = null;
    currentRecommendations = null;
    uploadedImage = null;
    isUploading = false;
    
    // Clear any existing UI content
    const recommendationsContainer = document.getElementById('thumbnail-gallery');
    if (recommendationsContainer) {
        recommendationsContainer.innerHTML = '';
    }
    
    // Reset header text
    const headerText = document.querySelector('.results-title');
    if (headerText) {
        headerText.textContent = "Here are some artworks we think you'll love!";
    }
    
    // Hide options and show upload form
    document.getElementById('options-section').style.display = 'none';
    document.getElementById('preferences-form-container').style.display = 'none';
    document.getElementById('upload-form-container').style.display = 'block';
    
    // Ensure upload form is properly reset and not stuck in loading state
    restoreUploadForm();
    
    // Show back button
    document.getElementById('back-button').style.display = 'flex';
    
    // Scroll to form
    document.getElementById('upload-form-container').scrollIntoView({
        behavior: 'smooth'
    });
    
    console.log('=== UPLOAD WORKFLOW CACHE CLEARED ===');
    setTimeout(() => {
        console.log('[showUploadForm] Cache state AFTER clearing:', {
            allArtworks,
            currentArtworkIndex,
            recommendations,
            currentRecommendations,
            uploadedImage
        });
    }, 0);
}

function showPreferencesForm() {
    console.log('=== SWITCHING TO PREFERENCES WORKFLOW ===');
    // Clear photo cache to prevent showing previous workflow's recommendations
    console.log('=== CLEARING PHOTO CACHE FOR PREFERENCES WORKFLOW ===');
    allArtworks = [];
    currentArtworkIndex = 0;
    recommendations = null;
    currentRecommendations = null;
    uploadedImage = null;
    isUploading = false;
    
    // Clear any existing UI content
    const recommendationsContainer = document.getElementById('thumbnail-gallery');
    if (recommendationsContainer) {
        recommendationsContainer.innerHTML = '';
    }
    
    // Reset header text
    const headerText = document.querySelector('.results-title');
    if (headerText) {
        headerText.textContent = "Here are some artworks we think you'll love!";
    }
    
    // Hide options and show preferences form FIRST
    document.getElementById('options-section').style.display = 'none';
    document.getElementById('upload-form-container').style.display = 'none';
    document.getElementById('preferences-form-container').style.display = 'block';
    
    // Show back button
    document.getElementById('back-button').style.display = 'flex';
    
    // Reset preferences form to clear any loading states
    const preferencesFormContainer = document.getElementById('preferences-form-container');
    if (preferencesFormContainer) {
        // Restore the original preferences form with correct CSS classes
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
                    </select>
                </div>
                
                <div class="filter-group">
                    <label for="style-select">Art Style:</label>
                    <select id="style-select">
                        <option value="">Any Style</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label for="subject-select">Subject:</label>
                    <select id="subject-select">
                        <option value="">Any Subject</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label for="color-preference">Color Preference:</label>
                    <select id="color-preference">
                        <option value="">Any Colors</option>
                    </select>
                </div>
                
                <button type="submit" class="button">
                    <i class="fas fa-search"></i>
                    Find Artwork
                </button>
            </form>
        `;
        
        // Re-populate the select options
        fetch('/api/preferences-options')
            .then(res => res.json())
            .then(options => {
                populateSelect('mood-select', options.moods, 'Any Mood');
                populateSelect('style-select', options.styles, 'Any Style');
                populateSelect('subject-select', options.subjects, 'Any Subject');
                populateSelect('color-preference', options.colors, 'Any Colors');
            });
        
        // Re-add the event listener for the preferences form
        const preferencesForm = document.getElementById('preferences-form');
        if (preferencesForm) {
            preferencesForm.addEventListener('submit', (e) => {
                e.preventDefault();
                handlePreferencesSubmit(e);
            });
        }
    }
    
    // Scroll to form AFTER ensuring it's visible
    setTimeout(() => {
        document.getElementById('preferences-form-container').scrollIntoView({
            behavior: 'smooth'
        });
    }, 100);
    
    console.log('=== PREFERENCES WORKFLOW CACHE CLEARED ===');
}

// Enhanced back button functionality
function backToOptions() {
    console.log('=== SWITCHING BACK TO OPTIONS ===');
    console.log('=== BACK TO OPTIONS CALLED ===');
    console.log('Current state:', {
        currentArtworkIndex,
        hasUploadedImage: !!uploadedImage,
        recommendationsCount: recommendations ? recommendations.length : 0,
        currentRecommendationsCount: currentRecommendations ? currentRecommendations.length : 0,
        allArtworksCount: allArtworks ? allArtworks.length : 0
    });
    
    // Reset all recommendation state
    allArtworks = [];
    currentArtworkIndex = 0;
    recommendations = null;
    currentRecommendations = null;
    
    // Reset uploaded image
    uploadedImage = null;
    
    // Reset any ongoing processes
    isUploading = false;
    isDragging = false;
    isResizing = false;
    
    console.log('State after reset:', {
        currentArtworkIndex,
        hasUploadedImage: !!uploadedImage,
        recommendationsCount: recommendations ? recommendations.length : 0,
        currentRecommendationsCount: currentRecommendations ? currentRecommendations.length : 0,
        allArtworksCount: allArtworks ? allArtworks.length : 0
    });
    
    // Clear the UI
    const recommendationsContainer = document.getElementById('thumbnail-gallery');
    if (recommendationsContainer) {
        recommendationsContainer.innerHTML = '';
        console.log('Cleared thumbnail gallery');
    } else {
        console.warn('Thumbnail gallery element not found');
    }
    
    // Reset header text
    const headerText = document.querySelector('.results-title');
    if (headerText) {
        headerText.textContent = "Here are some artworks we think you'll love!";
        console.log('Reset header text to default');
    }
    
    // Ensure upload form is properly reset
    restoreUploadForm();
    
    // Show the options view
    showOptionsView();
    
    console.log('=== BACK TO OPTIONS COMPLETE ===');
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
    
    // File input change - this triggers the upload automatically
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });
    
    // Preferences form only (upload form has no submit button and uploads automatically)
    const preferencesForm = document.getElementById('preferences-form');
    
    if (preferencesForm) {
        preferencesForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handlePreferencesSubmit(e);
        });
    }
}

// Handle file upload
function handleFileUpload(file) {
    console.log('=== FILE UPLOAD INITIATED ===');
    console.log('[handleFileUpload] State before upload:', {
        allArtworks,
        currentArtworkIndex,
        recommendations,
        currentRecommendations,
        uploadedImage
    });
    if (isUploading) {
        console.log('Upload already in progress, ignoring duplicate request');
        return;
    }
    
    if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
    }
    
    isUploading = true;
    
    // Store the original upload form HTML to restore it if needed
    const uploadFormContainer = document.getElementById('upload-form-container');
    const originalUploadFormHTML = uploadFormContainer.innerHTML;
    
    // Show initial loading state
    uploadFormContainer.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner">
                <div class="spinner-ring"></div>
                <div class="spinner-ring"></div>
                <div class="spinner-ring"></div>
            </div>
            <h3 class="loading-title">Processing your photo...</h3>
            <p class="loading-subtitle">Analyzing colors and room style</p>
            <div class="progress-container">
                <div class="progress-bar">
                    <div class="progress-fill" id="upload-progress"></div>
                </div>
                <div class="progress-text">Reading image data...</div>
            </div>
        </div>
    `;
    
    // Start initial progress animation
    let progress = 0;
    const progressBar = document.getElementById('upload-progress');
    const progressText = document.querySelector('.progress-text');
    const progressInterval = setInterval(() => {
        progress += Math.random() * 20;
        if (progress > 90) progress = 90; // Don't go to 100% until we get results
        
        if (progressBar) progressBar.style.width = progress + '%';
        if (progressText) {
            if (progress < 30) {
                progressText.textContent = 'Reading image data...';
            } else if (progress < 60) {
                progressText.textContent = 'Extracting color palette...';
            } else {
                progressText.textContent = 'Preparing for analysis...';
            }
        }
    }, 150);
    
    const reader = new FileReader();
    reader.onload = function(e) {
        uploadedImage = e.target.result; // Store the uploaded image
        
        // Clear the initial progress interval
        clearInterval(progressInterval);
        
        // Show the uploaded image with progress overlay
        uploadFormContainer.innerHTML = `
            <div class="uploaded-image-container">
                <img src="${uploadedImage}" alt="Uploaded room" class="uploaded-room-image" />
                <div class="progress-overlay">
                    <div class="progress-content">
                        <div class="progress-spinner">
                            <div class="spinner-ring"></div>
                            <div class="spinner-ring"></div>
                            <div class="spinner-ring"></div>
                        </div>
                        <h3 class="progress-title">Finding great photos for your room</h3>
                        <p class="progress-subtitle">Our AI is analyzing your space and matching it with perfect artwork</p>
                        <div class="progress-container">
                            <div class="progress-bar">
                                <div class="progress-fill" id="recommendation-progress"></div>
                            </div>
                            <div class="progress-text">Starting analysis...</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Start recommendation progress with engaging messages
        let recProgress = 0;
        const recProgressBar = document.getElementById('recommendation-progress');
        const recProgressText = document.querySelector('.progress-text');
        const progressMessages = [
            'Analyzing your room\'s color scheme...',
            'Understanding your space\'s style...',
            'Searching our curated collection...',
            'Finding perfect color matches...',
            'Calculating style compatibility...',
            'Selecting the best artwork...',
            'Preparing your personalized recommendations...',
            'Almost ready to show you amazing options...'
        ];
        let messageIndex = 0;
        
        const recProgressInterval = setInterval(() => {
            recProgress += Math.random() * 8 + 2; // More consistent progress
            if (recProgress > 85) recProgress = 85;
            
            if (recProgressBar) recProgressBar.style.width = recProgress + '%';
            if (recProgressText && messageIndex < progressMessages.length) {
                // Change message every 15% progress
                const messageChangePoint = Math.floor(recProgress / 15);
                if (messageChangePoint > messageIndex) {
                    messageIndex = messageChangePoint;
                    if (messageIndex < progressMessages.length) {
                        recProgressText.textContent = progressMessages[messageIndex];
                    }
                }
            }
        }, 250);
        
        // Get recommendations
        getRecommendations(recProgressInterval);
    };
    
    reader.onerror = function() {
        clearInterval(progressInterval);
        isUploading = false;
        console.error('FileReader error occurred');
        // Restore the original upload form
        uploadFormContainer.innerHTML = originalUploadFormHTML;
        alert('Error reading file. Please try again.');
    };
    
    reader.readAsDataURL(file);
    
    console.log('=== END FILE UPLOAD DEBUG ===');
}

// Handle preferences form submission
function handlePreferencesSubmit(event) {
    event.preventDefault();
    
    // Get form data
    const moodSelect = document.getElementById('mood-select');
    const styleSelect = document.getElementById('style-select');
    const subjectSelect = document.getElementById('subject-select');
    const colorSelect = document.getElementById('color-preference');
    
    // Send as arrays with plural keys to match backend
    const preferences = {
        moods: moodSelect && moodSelect.value ? [moodSelect.value] : [],
        styles: styleSelect && styleSelect.value ? [styleSelect.value] : [],
        subjects: subjectSelect && subjectSelect.value ? [subjectSelect.value] : [],
        colors: colorSelect && colorSelect.value ? [colorSelect.value] : []
    };
    
    // Show loading state with correct message for preferences
    const preferencesFormContainer = document.getElementById('preferences-form-container');
    showLoadingState(preferencesFormContainer, 'Analyzing your preferences...');
    
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
            displayResults(data.recommendations, 'preferences');
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
    console.log('=== GO BACK TO LANDING CALLED ===');
    
    const uploadView = document.getElementById('upload-view');
    const resultsArea = document.getElementById('results-area');
    const optionsSection = document.getElementById('options-section');
    const uploadFormContainer = document.getElementById('upload-form-container');
    const preferencesFormContainer = document.getElementById('preferences-form-container');
    const backButton = document.getElementById('back-button');
    
    console.log('Elements found:', {
        uploadView: !!uploadView,
        resultsArea: !!resultsArea,
        optionsSection: !!optionsSection,
        uploadFormContainer: !!uploadFormContainer,
        preferencesFormContainer: !!preferencesFormContainer,
        backButton: !!backButton
    });
    
    // Hide results area
    resultsArea.style.display = 'none';
    
    // Show the main upload view
    uploadView.style.display = 'block';
    
    // Ensure options section is visible
    optionsSection.style.display = 'block';
    
    // Hide any forms that might be showing
    uploadFormContainer.style.display = 'none';
    preferencesFormContainer.style.display = 'none';
    
    // Hide back button
    backButton.style.display = 'none';
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    console.log('=== GO BACK TO LANDING COMPLETE ===');
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
    const virtualShowroom = document.getElementById('virtual-showroom');
    const artworkOverlay = document.getElementById('artwork-overlay');
    if (roomImage) {
        if (uploadedImage) {
            console.log('Upload workflow - optimizing uploaded image');
            
            // Optimize the uploaded image for better performance
            const optimizeImage = (dataUrl) => {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.onload = function() {
                        // Create a canvas to resize and compress the image
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        
                        // Calculate optimal dimensions with better handling for HEIC files
                        // HEIC files from iPhones are often very large, so we need more aggressive resizing
                        const maxSize = 600; // Reduced from 800 to 600 for better performance
                        const maxWidth = 800; // Maximum width for very wide images
                        const maxHeight = 600; // Maximum height for very tall images
                        
                        let { width, height } = this;
                        
                        console.log('Original image dimensions:', width, 'x', height);
                        
                        // Handle very large images (like HEIC from iPhones)
                        if (width > 2000 || height > 2000) {
                            // For very large images, be more aggressive with resizing
                            if (width > height) {
                                if (width > maxWidth) {
                                    height = (height * maxWidth) / width;
                                    width = maxWidth;
                                }
                            } else {
                                if (height > maxHeight) {
                                    width = (width * maxHeight) / height;
                                    height = maxHeight;
                                }
                            }
                        } else {
                            // For smaller images, use the standard maxSize approach
                            if (width > height) {
                                if (width > maxSize) {
                                    height = (height * maxSize) / width;
                                    width = maxSize;
                                }
                            } else {
                                if (height > maxSize) {
                                    width = (width * maxSize) / height;
                                    height = maxSize;
                                }
                            }
                        }
                        
                        // Ensure dimensions are integers
                        width = Math.round(width);
                        height = Math.round(height);
                        
                        console.log('Optimized image dimensions:', width, 'x', height);
                        
                        canvas.width = width;
                        canvas.height = height;
                        
                        // Draw and compress the image
                        ctx.drawImage(this, 0, 0, width, height);
                        
                        // Convert to optimized data URL with reduced quality
                        const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                        console.log('Image optimized:', {
                            originalSize: dataUrl.length,
                            optimizedSize: optimizedDataUrl.length,
                            reduction: Math.round((1 - optimizedDataUrl.length / dataUrl.length) * 100) + '%'
                        });
                        
                        resolve(optimizedDataUrl);
                    };
                    img.src = dataUrl;
                });
            };
            
            // Optimize the image before setting it as room background
            optimizeImage(uploadedImage).then(optimizedImage => {
                roomImage.src = optimizedImage;
                roomImage.style.display = 'block';
                console.log('Room image src set to optimized uploaded image');
                
                // Wait for the image to load to get its natural dimensions
                roomImage.onload = function() {
                    console.log('Optimized room image loaded, dimensions:', this.naturalWidth, 'x', this.naturalHeight);
                    if (this.naturalWidth && this.naturalHeight) {
                        const aspectRatio = this.naturalWidth / this.naturalHeight;
                        let maxWidth = 720; // Increased from 600 to 720 (20% larger)
                        let maxHeight = 540; // Increased from 450 to 540 (20% larger)
                        let width = maxWidth;
                        let height = width / aspectRatio;
                        if (height > maxHeight) {
                            height = maxHeight;
                            width = height * aspectRatio;
                        }
                        virtualShowroom.style.width = width + 'px';
                        virtualShowroom.style.height = height + 'px';
                        console.log('Virtual showroom sized to:', width, 'x', height);
                        const artworkOverlay = document.getElementById('artwork-overlay');
                        if (artworkOverlay) {
                            artworkOverlay.style.width = width + 'px';
                            artworkOverlay.style.height = height + 'px';
                            console.log('Artwork overlay sized to:', width, 'x', height);
                        }
                    }
                };
            });
            
            // Show spinner overlay while artwork image is loading
            const spinnerOverlay = document.getElementById('mock-spinner-overlay');
            if (spinnerOverlay) {
                spinnerOverlay.style.display = 'flex';
            }
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
let isDragging = false;
let isResizing = false;
let dragStartX, dragStartY;
let resizeStartX, resizeStartY;
let originalWidth, originalHeight;
let originalX, originalY;

function getRecommendations(progressInterval = null) {
    console.log('=== GET RECOMMENDATIONS DEBUG ===');
    console.log('[getRecommendations] State before API call:', {
        allArtworks,
        currentArtworkIndex,
        recommendations,
        currentRecommendations,
        uploadedImage
    });
    if (!uploadedImage) {
        console.error('No uploaded image available');
        isUploading = false;
        // Restore the upload form
        restoreUploadForm();
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
        if (progressInterval) clearInterval(progressInterval);
        if (!response.ok) {
            return response.json().then(err => { throw new Error(err.error || 'Server error') });
        }
        return response.json();
    })
    .then(data => {
        // Complete the progress bar
        const progressBar = document.getElementById('recommendation-progress');
        const progressText = document.querySelector('.progress-text');
        if (progressBar) progressBar.style.width = '100%';
        if (progressText) progressText.textContent = 'Ready!';
        
        // Show success message briefly
        const uploadFormContainer = document.getElementById('upload-form-container');
        if (uploadFormContainer) {
            uploadFormContainer.innerHTML = `
                <div class="loading-container">
                    <div class="success-checkmark">✓</div>
                    <h3 class="loading-title">Perfect matches found!</h3>
                    <p class="loading-subtitle">Your personalized artwork recommendations are ready</p>
                </div>
            `;
        }
        
        // Wait a moment to show success, then display results
        setTimeout(() => {
            console.log('[getRecommendations] Received recommendations response:', data);
            console.log('[getRecommendations] State after API call:', {
                allArtworks,
                currentArtworkIndex,
                recommendations,
                currentRecommendations,
                uploadedImage
            });
            if (data.recommendations && data.recommendations.length > 0) {
                displayResults(data.recommendations, 'upload');
            } else {
                isUploading = false;
                showErrorState(document.getElementById('results-area'), 'No recommendations found for your image.');
                showResultsView();
            }
        }, 1000);
    })
    .catch(error => {
        if (progressInterval) clearInterval(progressInterval);
        isUploading = false;
        console.error('Error getting recommendations:', error);
        // Restore the upload form on error
        restoreUploadForm();
        showErrorState(document.getElementById('results-area'), 'Unable to get recommendations. Please try again.');
        showResultsView();
    });
    
    console.log('=== END GET RECOMMENDATIONS DEBUG ===');
}

// Helper function to restore the upload form
function restoreUploadForm() {
    const uploadFormContainer = document.getElementById('upload-form-container');
    if (uploadFormContainer) {
        uploadFormContainer.innerHTML = `
            <div class="upload-form">
                <div class="upload-area" id="upload-area">
                    <div class="upload-icon">📸</div>
                    <div class="upload-text">Upload a photo of your room</div>
                    <div class="upload-hint">Click or drag and drop an image here</div>
                </div>
                <input type="file" id="room-photo" accept="image/*" style="display: none;">
            </div>
        `;
        // Re-initialize upload functionality
        initializeUpload();
    }
}

function displayResults(recommendations, type = 'upload') {
    console.log('=== DISPLAY RESULTS DEBUG ===');
    console.log('[displayResults] Recommendations received:', recommendations);
    console.log('[displayResults] State before updating:', {
        allArtworks,
        currentArtworkIndex,
        recommendations,
        currentRecommendations,
        uploadedImage
    });
    
    // Show the results view first
    showResultsView();
    
    // Show progress bar instead of old content
    const resultsArea = document.getElementById('results-area');
    const virtualShowroom = document.getElementById('virtual-showroom');
    const thumbnailGallery = document.getElementById('thumbnail-gallery');
    
    if (virtualShowroom) {
        virtualShowroom.innerHTML = `
            <div class="processing-container">
                <div class="processing-content">
                    <div class="processing-spinner"></div>
                    <h3>Processing your image...</h3>
                    <p>Analyzing colors and finding perfect artwork matches</p>
                    <div class="progress-bar">
                        <div class="progress-fill"></div>
                    </div>
                </div>
            </div>
        `;
    }
    
    if (thumbnailGallery) {
        thumbnailGallery.innerHTML = '';
    }
    
    // Update the header text based on recommendation type
    const headerText = document.querySelector('.results-title');
    if (headerText) {
        if (type === 'preferences') {
            headerText.textContent = "Here are some artworks we think you'll love! Based on your selected preferences";
        } else {
            headerText.textContent = "Here are some artworks we think you'll love! Based on your room's colors";
        }
        console.log('Updated header text to:', headerText.textContent);
    } else {
        console.warn('Header element not found');
    }
    
    // Store recommendations globally
    allArtworks = recommendations;
    currentArtworkIndex = 0;
    
    console.log('Stored recommendations globally:', {
        allArtworksCount: allArtworks.length,
        currentArtworkIndex: currentArtworkIndex
    });
    
    // Batch load all image URLs to prevent rate limiting
    const filenames = allArtworks.map(artwork => artwork.filename);
    batchLoadImageUrls(filenames).then(() => {
        console.log('[displayResults] Batch loading complete, displaying first artwork');
        // Display the first recommendation after batch loading
        if (allArtworks.length > 0) {
            displayCurrentArtwork();
        }
    }).catch(error => {
        console.error('[displayResults] Batch loading failed:', error);
        // Fallback: display anyway
        if (allArtworks.length > 0) {
            displayCurrentArtwork();
        }
    });
    
    setTimeout(() => {
        console.log('[displayResults] State after updating:', {
            allArtworks,
            currentArtworkIndex,
            recommendations,
            currentRecommendations,
            uploadedImage
        });
    }, 0);
    
    console.log('=== END DISPLAY RESULTS DEBUG ===');
}

function displayCurrentArtwork() {
    console.log('=== DISPLAY CURRENT ARTWORK DEBUG ===');
    console.log('Current artwork index:', currentArtworkIndex);
    console.log('Total artworks:', allArtworks.length);
    console.log('Uploaded image exists:', !!uploadedImage);
    
    if (currentArtworkIndex >= allArtworks.length) {
        console.log('No more artworks to display');
        return;
    }
    
    const artwork = allArtworks[currentArtworkIndex];
    console.log('Displaying artwork:', artwork.title);
    console.log('Artwork filename:', artwork.filename);
    
    // Restore the virtual showroom with proper structure
    const virtualShowroom = document.getElementById('virtual-showroom');
    if (virtualShowroom) {
        console.log('Virtual showroom found, adding no-transition class');
        virtualShowroom.classList.add('no-transition');
        virtualShowroom.innerHTML = `
            <img id="room-image" src="" alt="Your room" style="display: none;">
            <div id="artwork-overlay">
                <img id="artwork-image" src="" alt="Artwork" style="width: 100%; height: 100%; object-fit: cover; opacity: 0;">
            </div>
            <div id="mock-spinner-overlay" class="progress-overlay" style="display: none; z-index: 100;">
                <div class="progress-content">
                    <div class="progress-spinner">
                        <div class="spinner-ring"></div>
                        <div class="spinner-ring"></div>
                        <div class="spinner-ring"></div>
                    </div>
                    <h3 class="progress-title">Loading your artwork preview...</h3>
                    <p class="progress-subtitle">Please wait while we load your personalized mockup.</p>
                </div>
            </div>
        `;
        console.log('Virtual showroom HTML set');
        
        // Set the room image based on workflow
        const roomImage = document.getElementById('room-image');
        if (roomImage) {
            if (uploadedImage) {
                console.log('Upload workflow - optimizing uploaded image');
                
                // Optimize the uploaded image for better performance
                const optimizeImage = (dataUrl) => {
                    return new Promise((resolve) => {
                        const img = new Image();
                        img.onload = function() {
                            // Create a canvas to resize and compress the image
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            
                            // Calculate optimal dimensions with better handling for HEIC files
                            // HEIC files from iPhones are often very large, so we need more aggressive resizing
                            const maxSize = 600; // Reduced from 800 to 600 for better performance
                            const maxWidth = 800; // Maximum width for very wide images
                            const maxHeight = 600; // Maximum height for very tall images
                            
                            let { width, height } = this;
                            
                            console.log('Original image dimensions:', width, 'x', height);
                            
                            // Handle very large images (like HEIC from iPhones)
                            if (width > 2000 || height > 2000) {
                                // For very large images, be more aggressive with resizing
                                if (width > height) {
                                    if (width > maxWidth) {
                                        height = (height * maxWidth) / width;
                                        width = maxWidth;
                                    }
                                } else {
                                    if (height > maxHeight) {
                                        width = (width * maxHeight) / height;
                                        height = maxHeight;
                                    }
                                }
                            } else {
                                // For smaller images, use the standard maxSize approach
                                if (width > height) {
                                    if (width > maxSize) {
                                        height = (height * maxSize) / width;
                                        width = maxSize;
                                    }
                                } else {
                                    if (height > maxSize) {
                                        width = (width * maxSize) / height;
                                        height = maxSize;
                                    }
                                }
                            }
                            
                            // Ensure dimensions are integers
                            width = Math.round(width);
                            height = Math.round(height);
                            
                            console.log('Optimized image dimensions:', width, 'x', height);
                            
                            canvas.width = width;
                            canvas.height = height;
                            
                            // Draw and compress the image
                            ctx.drawImage(this, 0, 0, width, height);
                            
                            // Convert to optimized data URL with reduced quality
                            const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                            console.log('Image optimized:', {
                                originalSize: dataUrl.length,
                                optimizedSize: optimizedDataUrl.length,
                                reduction: Math.round((1 - optimizedDataUrl.length / dataUrl.length) * 100) + '%'
                            });
                            
                            resolve(optimizedDataUrl);
                        };
                        img.src = dataUrl;
                    });
                };
                
                // Optimize the image before setting it as room background
                optimizeImage(uploadedImage).then(optimizedImage => {
                    roomImage.src = optimizedImage;
                    roomImage.style.display = 'block';
                    console.log('Room image src set to optimized uploaded image');
                    
                    // Wait for the image to load to get its natural dimensions
                    roomImage.onload = function() {
                        console.log('Optimized room image loaded, dimensions:', this.naturalWidth, 'x', this.naturalHeight);
                        if (this.naturalWidth && this.naturalHeight) {
                            const aspectRatio = this.naturalWidth / this.naturalHeight;
                            let maxWidth = 720; // Increased from 600 to 720 (20% larger)
                            let maxHeight = 540; // Increased from 450 to 540 (20% larger)
                            let width = maxWidth;
                            let height = width / aspectRatio;
                            if (height > maxHeight) {
                                height = maxHeight;
                                width = height * aspectRatio;
                            }
                            virtualShowroom.style.width = width + 'px';
                            virtualShowroom.style.height = height + 'px';
                            console.log('Virtual showroom sized to:', width, 'x', height);
                            const artworkOverlay = document.getElementById('artwork-overlay');
                            if (artworkOverlay) {
                                artworkOverlay.style.width = width + 'px';
                                artworkOverlay.style.height = height + 'px';
                                console.log('Artwork overlay sized to:', width, 'x', height);
                            }
                        }
                    };
                });
                
                // Show spinner overlay while artwork image is loading
                const spinnerOverlay = document.getElementById('mock-spinner-overlay');
                if (spinnerOverlay) {
                    spinnerOverlay.style.display = 'flex';
                }
            } else {
                console.log('Preferences workflow - using default room image');
                roomImage.src = 'assets/mock/mock-room.jpg';
                roomImage.style.display = 'block';
                console.log('Room image src set to default mock room');
                // Set default dimensions for preferences workflow
                virtualShowroom.style.width = '600px';
                virtualShowroom.style.height = '450px';
                console.log('Virtual showroom sized to default: 600x450');
                const artworkOverlay = document.getElementById('artwork-overlay');
                if (artworkOverlay) {
                    artworkOverlay.style.width = '250px';
                    artworkOverlay.style.height = '187.5px'; // 4:3 aspect ratio
                    artworkOverlay.style.left = '50%';
                    artworkOverlay.style.top = '50%';
                    artworkOverlay.style.transform = 'translate(-50%, -50%)';
                    console.log('Artwork overlay positioned and sized to: 250x187.5');
                } else {
                    console.error('Artwork overlay element not found!');
                }
            }
        } else {
            console.error('Room image element not found!');
        }
    } else {
        console.error('Virtual showroom element not found!');
    }
    
    // IMMEDIATELY update the main artwork
    console.log('Calling updateArtworkDisplay with forceInstant=true');
    updateArtworkDisplay(currentArtworkIndex, true, function onArtworkLoaded() {
        // Hide spinner overlay when artwork image is loaded (only for upload workflow)
        if (uploadedImage) {
            const spinnerOverlay = document.getElementById('mock-spinner-overlay');
            if (spinnerOverlay) {
                spinnerOverlay.style.display = 'none';
            }
        }
    });
    
    // Create thumbnail gallery (this will replace the loading spinner when ready)
    console.log('Creating thumbnail gallery...');
    createThumbnailGallery().then(() => {
        console.log('Thumbnail gallery created, selecting thumbnail and initializing interaction');
        selectThumbnail(currentArtworkIndex);
        initializeArtworkInteraction();
        const virtualShowroom = document.getElementById('virtual-showroom');
        if (virtualShowroom) {
            setTimeout(() => {
                virtualShowroom.classList.remove('no-transition');
                console.log('Removed no-transition class from virtual showroom');
            }, 100);
        }
    });
    
    console.log('=== END DISPLAY CURRENT ARTWORK DEBUG ===');
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
                    
                    // Mark as user customized so it won't be reset when switching artworks
                    target.setAttribute('data-user-customized', 'true');
                    
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
                    console.log('Marked as user customized');
                    
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
async function updateArtworkDisplay(index, forceInstant, onLoadedCallback) {
    const artwork = allArtworks[index];
    if (!artwork) {
        console.error('No artwork found at index:', index);
        return;
    }
    console.log('=== UPDATE ARTWORK DISPLAY DEBUG ===');
    console.log('[updateArtworkDisplay] About to display artwork:', artwork);
    console.log('[updateArtworkDisplay] Force instant:', forceInstant);
    console.log('[updateArtworkDisplay] State before image load:', {
        allArtworks,
        currentArtworkIndex,
        recommendations,
        currentRecommendations,
        uploadedImage
    });
    
    console.log('Getting image URL for filename:', artwork.filename);
    const imageSrc = await getImageUrl(artwork.filename);
    console.log('Image URL received:', imageSrc);
    
    const artworkImage = document.getElementById('artwork-image');
    if (artworkImage) {
        console.log('Artwork image element found');
        
        // Set up event handlers BEFORE setting src
        const onloadHandler = function() {
            console.log('Artwork image onload triggered');
            if (forceInstant) {
                console.log('Force instant mode - setting opacity to 1 immediately');
                // Set opacity immediately without waiting for next frame
                artworkImage.style.opacity = '1';
                console.log('Artwork image opacity set to 1');
            }
            const imgLoadEnd = performance.now();
            console.log('[ImageLoad] Image loaded:', imageSrc, 'Duration:', (imgLoadEnd).toFixed(2), 'ms');
            console.log('Image natural dimensions:', this.naturalWidth, 'x', this.naturalHeight);
            if (typeof onLoadedCallback === 'function') {
                onLoadedCallback();
            }
        };
        
        const onerrorHandler = function() {
            console.error('Artwork image failed to load:', imageSrc);
            if (forceInstant) {
                console.log('Force instant mode - setting opacity to 1 on error');
                artworkImage.style.opacity = '1';
            }
            const imgLoadEnd = performance.now();
            console.log('[ImageLoad] Image failed:', imageSrc, 'Duration:', (imgLoadEnd).toFixed(2), 'ms');
            if (typeof onLoadedCallback === 'function') {
                onLoadedCallback();
            }
        };
        
        // Remove any existing event handlers
        artworkImage.onload = null;
        artworkImage.onerror = null;
        
        // Set up new event handlers
        artworkImage.onload = onloadHandler;
        artworkImage.onerror = onerrorHandler;
        
        if (forceInstant) {
            console.log('Force instant mode - setting opacity to 0 and clearing transitions');
            // Force instant display by using a more aggressive approach
            artworkImage.style.opacity = '0';
            artworkImage.style.transition = 'none';
            artworkImage.style.webkitTransition = 'none';
            artworkImage.style.mozTransition = 'none';
            artworkImage.style.oTransition = 'none';
            
            // Don't set placeholder - go directly to the real image
            console.log('Skipping placeholder, setting real image directly');
        }
        
        // Set the actual image source
        console.log('Setting artwork image src to:', imageSrc);
        artworkImage.src = imageSrc;
        artworkImage.alt = artwork.title;
        console.log('Artwork image alt set to:', artwork.title);
        
        // Update overlay image
        const overlay = document.getElementById('artwork-overlay');
        if (overlay) {
            console.log('Artwork overlay found, updating dimensions');
            
            // Clear the user-customized flag when switching to a new artwork
            // This ensures the first artwork gets the default size
            overlay.removeAttribute('data-user-customized');
            
            // Use a default aspect ratio of 4/3 for initial sizing
            const defaultAspectRatio = 4/3;
            const baseWidth = 270; // Reduced from 300px to 270px (10% smaller)
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
        } else {
            console.error('Artwork overlay element not found!');
        }
        
        // Update overlay size after image loads to match actual aspect ratio
        const resizeHandler = function() {
            console.log('Image loaded successfully:', imageSrc);
            const overlay = document.getElementById('artwork-overlay');
            if (overlay && this.naturalWidth && this.naturalHeight) {
                // Check if user has already customized the size
                const hasUserCustomized = overlay.hasAttribute('data-user-customized');
                
                if (!hasUserCustomized) {
                    // Only set default size if user hasn't customized it
                    const aspectRatio = this.naturalWidth / this.naturalHeight;
                    const baseWidth = 270; // Reduced from 300px to 270px (10% smaller)
                    const calculatedHeight = baseWidth / aspectRatio;
                    
                    overlay.style.width = baseWidth + 'px';
                    overlay.style.height = calculatedHeight + 'px';
                    
                    console.log('=== SETTING DEFAULT SIZE (user has not customized) ===');
                } else {
                    console.log('=== PRESERVING USER CUSTOMIZED SIZE ===');
                }
                
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
                console.log('User customized:', hasUserCustomized);
            }
        };
        
        // Add resize handler to onload
        const originalOnload = artworkImage.onload;
        artworkImage.onload = function() {
            if (originalOnload) originalOnload.call(this);
            resizeHandler.call(this);
        };
    } else {
        console.error('Artwork image element not found');
    }
    
    // Update artwork info
    console.log('Updating artwork info elements');
    const artworkTitle = document.getElementById('artwork-title');
    const artworkDescription = document.getElementById('artwork-description');
    const artworkPrice = document.getElementById('artwork-price');
    
    if (artworkTitle) {
        artworkTitle.textContent = artwork.title;
        console.log('Artwork title set to:', artwork.title);
    } else {
        console.error('Artwork title element not found');
    }
    if (artworkDescription) {
        artworkDescription.textContent = artwork.description;
        console.log('Artwork description set');
    } else {
        console.error('Artwork description element not found');
    }
    if (artworkPrice) {
        // Remove any existing dollar sign and add a single one
        const cleanPrice = artwork.price.toString().replace('$', '');
        artworkPrice.textContent = `$${cleanPrice}`;
        console.log('Artwork price set to:', `$${cleanPrice}`);
    } else {
        console.error('Artwork price element not found');
    }
    
    // Update current artwork index
    currentArtworkIndex = index;
    console.log('Current artwork index updated to:', index);
    
    // Update navigation buttons
    updateNavigationButtons();
    console.log('Navigation buttons updated');
    
    // Update purchase button
    updatePurchaseButton();
    console.log('Purchase button updated');
    
    console.log('=== END UPDATE ARTWORK DISPLAY DEBUG ===');
}

// Create thumbnail gallery
async function createThumbnailGallery() {
    const gallery = document.getElementById('thumbnail-gallery');
    if (!gallery) {
        console.error('Thumbnail gallery element not found');
        return;
    }
    
    console.log('Creating thumbnail gallery with', allArtworks.length, 'artworks');
    
    // Clear existing thumbnails first
    gallery.innerHTML = '';
    
    // Track processed artworks to prevent duplicates
    const processedIds = new Set();
    const uniqueArtworks = [];
    
    // Filter out duplicates first
    for (let i = 0; i < allArtworks.length; i++) {
        const artwork = allArtworks[i];
        if (!processedIds.has(artwork.id)) {
            processedIds.add(artwork.id);
            uniqueArtworks.push({ ...artwork, originalIndex: i });
        }
    }
    
    console.log('Creating thumbnails for', uniqueArtworks.length, 'unique artworks');
    
    // Helper function to add delay between requests
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    // Process artworks in smaller batches to avoid rate limiting
    const batchSize = 3; // Process 3 at a time
    const batches = [];
    for (let i = 0; i < uniqueArtworks.length; i += batchSize) {
        batches.push(uniqueArtworks.slice(i, i + batchSize));
    }
    
    const artworkWithUrls = [];
    
    // Process batches sequentially with delays
    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`Processing batch ${i + 1}/${batches.length} with ${batch.length} artworks`);
        
        // Process current batch in parallel
        const batchPromises = batch.map(async (artwork) => {
            try {
                const imageUrl = await getImageUrl(artwork.filename);
                return { artwork, imageUrl };
            } catch (error) {
                console.warn('Failed to get image URL for', artwork.filename, 'using fallback');
                return { artwork, imageUrl: `/catalog/images/${artwork.filename}` };
            }
        });
        
        const batchResults = await Promise.all(batchPromises);
        artworkWithUrls.push(...batchResults);
        
        // Add delay between batches (except for the last batch)
        if (i < batches.length - 1) {
            console.log(`Waiting 200ms before next batch...`);
            await delay(200);
        }
    }
    
    // Create thumbnails with resolved URLs
    artworkWithUrls.forEach(({ artwork, imageUrl }) => {
        console.log('Creating thumbnail for artwork:', artwork.title, 'with URL:', imageUrl);
        
        const thumbnail = document.createElement('div');
        thumbnail.className = 'thumbnail-item';
        thumbnail.onclick = () => selectThumbnail(artwork.originalIndex);
        
        thumbnail.innerHTML = `
            <img src="${imageUrl}" alt="${artwork.title}" loading="lazy" 
                 onerror="console.error('Failed to load thumbnail:', '${imageUrl}')"
                 onload="console.log('Thumbnail loaded:', '${imageUrl}')">
            <div class="thumbnail-overlay">
                <div class="thumbnail-title">${artwork.title}</div>
                <div class="thumbnail-price">$${artwork.price.toString().replace('$', '')}</div>
            </div>
        `;
        
        gallery.appendChild(thumbnail);
    });
    
    console.log('Thumbnail gallery creation complete');
}

// Select thumbnail and update display
function selectThumbnail(index) {
    console.log('=== SELECT THUMBNAIL DEBUG ===');
    console.log('Selecting thumbnail at index:', index);
    console.log('Current artwork index before:', currentArtworkIndex);
    
    // Only update if the index is different
    if (currentArtworkIndex !== index) {
        console.log('Index changed, updating artwork display');
        currentArtworkIndex = index;
        updateArtworkDisplay(index);
    } else {
        console.log('Index unchanged, skipping artwork display update');
    }
    
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
    
    console.log('=== END SELECT THUMBNAIL DEBUG ===');
}

// Update thumbnail selection state
function updateThumbnailSelection(index) {
    const thumbnails = document.querySelectorAll('.thumbnail-item');
    thumbnails.forEach((thumb, i) => {
        thumb.classList.toggle('selected', i === index);
    });
}

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

// Initialize event listeners
function initializeEventListeners() {
    // Note: Back button event listeners are handled via HTML onclick attributes
    // to prevent conflicts with duplicate event listeners
    
    // Add event listeners for navigation buttons
    const getStartedBtn = document.getElementById('get-started-btn');
    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', scrollToOptions);
    }
    
    const backToLandingBtn = document.getElementById('back-to-landing');
    if (backToLandingBtn) {
        backToLandingBtn.addEventListener('click', goBackToLanding);
    }
    
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetToOptions);
    }
}

function showOptionsView() {
    const optionsSection = document.getElementById('options-section');
    if (optionsSection) optionsSection.style.display = 'block';

    const uploadForm = document.getElementById('upload-form-container');
    if (uploadForm) uploadForm.style.display = 'none';

    const preferencesForm = document.getElementById('preferences-form-container');
    if (preferencesForm) preferencesForm.style.display = 'none';

    const resultsArea = document.getElementById('results-area');
    if (resultsArea) resultsArea.style.display = 'none';

    // ... (rest of function remains unchanged)
}

// Handle purchase button click
function handlePurchaseClick() {
    const currentArtwork = allArtworks[currentArtworkIndex];
    if (currentArtwork && currentArtwork.product_url) {
        window.open(currentArtwork.product_url, '_blank');
    } else {
        console.warn('No product URL available for current artwork');
    }
}

// Update purchase button with current artwork's product URL
function updatePurchaseButton() {
    const purchaseButton = document.getElementById('purchase-button');
    if (purchaseButton) {
        const currentArtwork = allArtworks[currentArtworkIndex];
        if (currentArtwork && currentArtwork.product_url) {
            purchaseButton.onclick = handlePurchaseClick;
            purchaseButton.disabled = false;
            console.log('Updated purchase button with URL:', currentArtwork.product_url);
        } else {
            purchaseButton.onclick = null;
            purchaseButton.disabled = true;
            console.warn('No product URL available, purchase button disabled');
        }
    }
}

// Batch load all image URLs to reduce API calls
async function batchLoadImageUrls(filenames) {
    console.log(`[BatchLoad] Pre-loading ${filenames.length} image URLs`);
    
    const promises = filenames.map(async (filename) => {
        try {
            const url = await getImageUrl(filename);
            return { filename, url, success: true };
        } catch (error) {
            console.error(`[BatchLoad] Failed to load URL for ${filename}:`, error);
            return { filename, url: null, success: false };
        }
    });
    
    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
    
    console.log(`[BatchLoad] Successfully pre-loaded ${successful.length}/${filenames.length} image URLs`);
    return successful.map(r => r.value);
} 