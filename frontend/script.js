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

// AWS S3 Image URL handling
async function getImageUrl(filename) {
    try {
        const response = await fetch(`/catalog/images/${filename}`);
        if (response.ok) {
            const data = await response.json();
            return data.url; // S3 presigned URL
        } else {
            // Fallback to local path if S3 fails
            return `/catalog/images/${filename}`;
        }
    } catch (error) {
        console.warn('Failed to get S3 URL, using local path:', error);
        // Fallback to local path
        return `/catalog/images/${filename}`;
    }
}

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
    
    // Show immediate loading feedback
    const uploadFormContainer = document.getElementById('upload-form-container');
    uploadFormContainer.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <span>Processing your image...</span>
            <div style="margin-top: 1rem; font-size: 0.9rem; color: #666;">
                Analyzing colors and finding perfect matches
            </div>
        </div>
    `;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        uploadedImage = e.target.result; // Store the uploaded image
        
        // Update loading message
        uploadFormContainer.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <span>Finding your perfect artwork...</span>
                <div style="margin-top: 1rem; font-size: 0.9rem; color: #666;">
                    Matching colors and styles to your space
                </div>
            </div>
        `;
        
        // Get recommendations
        getRecommendations();
    };
    
    reader.onerror = function() {
        isUploading = false;
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
    const virtualShowroom = document.getElementById('virtual-showroom');
    const artworkOverlay = document.getElementById('artwork-overlay');
    if (roomImage) {
        if (uploadedImage) {
            roomImage.src = uploadedImage;
            roomImage.style.display = 'block';
            // Wait for the image to load to get its natural dimensions
            roomImage.onload = function() {
                // Dynamically set the showroom and overlay aspect ratio to match the uploaded image
                if (this.naturalWidth && this.naturalHeight && virtualShowroom && artworkOverlay) {
                    const aspectRatio = this.naturalWidth / this.naturalHeight;
                    // Set max dimensions
                    let maxWidth = 600;
                    let maxHeight = 450;
                    let width = maxWidth;
                    let height = width / aspectRatio;
                    if (height > maxHeight) {
                        height = maxHeight;
                        width = height * aspectRatio;
                    }
                    virtualShowroom.style.width = width + 'px';
                    virtualShowroom.style.height = height + 'px';
                    artworkOverlay.style.width = width + 'px';
                    artworkOverlay.style.height = height + 'px';
                }
            };
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

function getRecommendations() {
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
        return;
    }

    // Start progress indicator
    let progressCounter = 0;
    const progressInterval = setInterval(() => {
        progressCounter++;
        const uploadFormContainer = document.getElementById('upload-form-container');
        if (uploadFormContainer) {
            const dots = '.'.repeat((progressCounter % 4) + 1);
            uploadFormContainer.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <span>Finding your perfect artwork${dots}</span>
                    <div style="margin-top: 1rem; font-size: 0.9rem; color: #666;">
                        Matching colors and styles to your space
                    </div>
                </div>
            `;
        }
    }, 500);

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
        clearInterval(progressInterval);
        if (!response.ok) {
            return response.json().then(err => { throw new Error(err.error || 'Server error') });
        }
        return response.json();
    })
    .then(data => {
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
            showErrorState(document.getElementById('results-area'), 'No recommendations found for your image.');
            showResultsView();
        }
    })
    .catch(error => {
        clearInterval(progressInterval);
        console.error('Error getting recommendations:', error);
        showErrorState(document.getElementById('results-area'), 'Unable to get recommendations. Please try again.');
        showResultsView();
    });
    
    console.log('=== END GET RECOMMENDATIONS DEBUG ===');
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
    
    // Display the first recommendation
    if (allArtworks.length > 0) {
        displayCurrentArtwork();
    }
    
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
        `;
        console.log('Virtual showroom HTML set');
        
        // Set the room image based on workflow
        const roomImage = document.getElementById('room-image');
        if (roomImage) {
            if (uploadedImage) {
                console.log('Upload workflow - using uploaded image');
                roomImage.src = uploadedImage;
                roomImage.style.display = 'block';
                console.log('Room image src set to uploaded image');
                // Wait for the image to load to get its natural dimensions
                roomImage.onload = function() {
                    console.log('Room image loaded, dimensions:', this.naturalWidth, 'x', this.naturalHeight);
                    if (this.naturalWidth && this.naturalHeight) {
                        const aspectRatio = this.naturalWidth / this.naturalHeight;
                        let maxWidth = 600;
                        let maxHeight = 450;
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
    updateArtworkDisplay(currentArtworkIndex, true);
    
    // Create thumbnail gallery (this will replace the loading spinner when ready)
    console.log('Creating thumbnail gallery...');
    createThumbnailGallery().then(() => {
        console.log('Thumbnail gallery created, selecting thumbnail and initializing interaction');
        selectThumbnail(currentArtworkIndex);
        initializeArtworkInteraction();
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
async function updateArtworkDisplay(index, forceInstant) {
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
        };
        
        const onerrorHandler = function() {
            console.error('Artwork image failed to load:', imageSrc);
            if (forceInstant) {
                console.log('Force instant mode - setting opacity to 1 on error');
                artworkImage.style.opacity = '1';
            }
            const imgLoadEnd = performance.now();
            console.log('[ImageLoad] Image failed:', imageSrc, 'Duration:', (imgLoadEnd).toFixed(2), 'ms');
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
        } else {
            console.error('Artwork overlay element not found!');
        }
        
        // Update overlay size after image loads to match actual aspect ratio
        const resizeHandler = function() {
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

// Download mockup functionality
function downloadMockup() {
    const downloadBtn = event.target.closest('button');
    const originalText = downloadBtn.innerHTML;
    
    console.log('[downloadMockup] Button clicked');
    downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    downloadBtn.disabled = true;
    
    // Get the virtual showroom element
    const showroom = document.getElementById('virtual-showroom');
    const artworkOverlay = document.getElementById('artwork-overlay');
    const artworkImage = document.getElementById('artwork-image');
    const roomImage = document.getElementById('room-image');
    
    if (!showroom || !artworkOverlay || !artworkImage) {
        console.error('[downloadMockup] Required elements not found for mockup generation', {showroom, artworkOverlay, artworkImage});
        downloadBtn.innerHTML = originalText;
        downloadBtn.disabled = false;
        return;
    }

    // Helper to convert image src to data URL
    function toDataURL(url, callback, errorCallback) {
        console.log('[downloadMockup] Converting to data URL via backend:', url);
        
        // Use backend endpoint to avoid CORS issues
        fetch(`/api/convert-image-to-data-url?url=${encodeURIComponent(url)}`)
            .then(response => {
                if (!response.ok) throw new Error('Backend failed to convert image');
                return response.json();
            })
            .then(data => {
                if (data.error) {
                    throw new Error(data.error);
                }
                console.log('[downloadMockup] Backend returned data URL');
                callback(data.data_url);
            })
            .catch(err => {
                errorCallback('Backend conversion error: ' + err);
            });
    }

    // Save original src and onload
    const originalSrc = artworkImage.src;
    const originalOnload = artworkImage.onload;
    console.log('[downloadMockup] Original artworkImage.src:', originalSrc);

    // Helper to finish/reset button
    function finishWithError(msg) {
        console.error('[downloadMockup] ERROR:', msg);
        downloadBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
        setTimeout(() => {
            downloadBtn.innerHTML = originalText;
            downloadBtn.disabled = false;
        }, 2000);
    }

    // If already a data URL, skip conversion
    if (originalSrc.startsWith('data:')) {
        console.log('[downloadMockup] artworkImage.src is already a data URL, proceeding directly');
        proceedWithMockup();
    } else {
        let didTimeout = false;
        // Set a timeout in case image never loads
        const timeout = setTimeout(() => {
            didTimeout = true;
            artworkImage.onload = originalOnload;
            artworkImage.src = originalSrc;
            finishWithError('Timeout: artwork image did not load as data URL');
        }, 7000);

        toDataURL(originalSrc, function(dataUrl) {
            if (didTimeout) return;
            clearTimeout(timeout);
            console.log('[downloadMockup] Setting artworkImage.src to data URL');
            artworkImage.onload = function() {
                artworkImage.onload = originalOnload;
                clearTimeout(timeout);
                console.log('[downloadMockup] artworkImage loaded as data URL, proceeding with mockup');
                proceedWithMockup();
            };
            artworkImage.onerror = function(e) {
                clearTimeout(timeout);
                finishWithError('artworkImage onerror: ' + e);
            };
            artworkImage.src = dataUrl;
        }, function(errMsg) {
            clearTimeout(timeout);
            finishWithError(errMsg);
        });
    }

    function proceedWithMockup() {
        console.log('[downloadMockup] proceedWithMockup called');
        
        // Save original styles
        const originalOverlayTransform = artworkOverlay.style.transform;
        const originalOverlayTransition = artworkOverlay.style.transition;
        const originalImageTransform = artworkImage.style.transform;
        const originalImageTransition = artworkImage.style.transition;

        // Remove only transitions for html2canvas (keep transforms for positioning)
        artworkOverlay.style.transition = '';
        artworkImage.style.transition = '';

        if (typeof html2canvas !== 'undefined') {
            console.log('[downloadMockup] Calling html2canvas...');
            html2canvas(showroom, {
                useCORS: true,
                allowTaint: true,
                backgroundColor: null,
                scale: 2,
                width: showroom.offsetWidth,
                height: showroom.offsetHeight,
                onclone: function(clonedDoc) {
                    const clonedOverlay = clonedDoc.getElementById('artwork-overlay');
                    const clonedArtwork = clonedDoc.getElementById('artwork-image');
                    if (clonedOverlay && clonedArtwork) {
                        // Preserve the current transform values (user positioning)
                        clonedOverlay.style.transform = originalOverlayTransform;
                        clonedOverlay.style.transition = '';
                        clonedArtwork.style.transform = originalImageTransform;
                        clonedArtwork.style.transition = '';
                    }
                }
            }).then(function(canvas) {
                console.log('[downloadMockup] html2canvas finished, creating download link');
                // Restore original styles, src, and onload
                artworkOverlay.style.transform = originalOverlayTransform;
                artworkOverlay.style.transition = originalOverlayTransition;
                artworkImage.style.transform = originalImageTransform;
                artworkImage.style.transition = originalImageTransition;
                artworkImage.src = originalSrc;
                artworkImage.onload = originalOnload;

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
                // Restore original styles, src, and onload on error
                artworkOverlay.style.transform = originalOverlayTransform;
                artworkOverlay.style.transition = originalOverlayTransition;
                artworkImage.style.transform = originalImageTransform;
                artworkImage.style.transition = originalImageTransition;
                artworkImage.src = originalSrc;
                artworkImage.onload = originalOnload;
                finishWithError('Error generating mockup: ' + error);
            });
        } else {
            finishWithError('html2canvas is not loaded');
        }
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
    // Add event listeners for back buttons
    const backButtons = document.querySelectorAll('.back-button');
    backButtons.forEach(button => {
        button.addEventListener('click', backToOptions);
    });
    
    // Note: Upload form and preferences form event listeners are already handled in initializeUpload()
    // to prevent duplicate event listeners that cause double submissions
    
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