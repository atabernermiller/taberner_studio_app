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
    console.log('=== FILE UPLOAD DEBUG ===');
    console.log('File upload triggered');
    console.log('Current state:');
    console.log('- currentArtworkIndex:', currentArtworkIndex);
    console.log('- uploadedImage:', uploadedImage ? 'exists' : 'null');
    console.log('- recommendations:', recommendations ? recommendations.length : 'null');
    console.log('- currentRecommendations:', currentRecommendations ? currentRecommendations.length : 'null');
    
    if (isUploading) {
        console.log('Upload already in progress, ignoring duplicate request');
        return;
    }
    
    if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
    }
    
    isUploading = true;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        uploadedImage = e.target.result; // Store the uploaded image

        // Hide upload form, show loading state, and get recommendations
        const uploadFormContainer = document.getElementById('upload-form-container');
        showLoadingState(uploadFormContainer);
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
    console.log('Uploaded image exists:', !!uploadedImage);
    console.log('Current state before request:', {
        currentArtworkIndex,
        allArtworksCount: allArtworks ? allArtworks.length : 0,
        recommendationsCount: recommendations ? recommendations.length : 0
    });
    
    if (!uploadedImage) {
        console.error('No uploaded image available');
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
        console.log('Received recommendations response:', {
            type: data.type,
            recommendationsCount: data.recommendations ? data.recommendations.length : 0,
            firstRecommendation: data.recommendations ? data.recommendations[0].title : 'None'
        });
        
        isUploading = false; // Reset flag on success
        if (data.recommendations && data.recommendations.length > 0) {
            displayResults(data.recommendations, 'upload');
        } else {
            showErrorState(document.getElementById('results-area'), 'No recommendations found for your image.');
            showResultsView();
        }
    })
    .catch(error => {
        console.error('Error getting recommendations:', error);
        isUploading = false; // Reset flag on error
        showErrorState(document.getElementById('results-area'), 'Unable to get recommendations. Please try again.');
        showResultsView();
    });
    
    console.log('=== END GET RECOMMENDATIONS DEBUG ===');
}

function displayResults(recommendations, type = 'upload') {
    console.log('=== DISPLAY RESULTS DEBUG ===');
    console.log('Recommendation type:', type);
    console.log('Number of recommendations:', recommendations.length);
    console.log('First recommendation:', recommendations[0]);
    
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
    
    // Clear existing recommendations
    const recommendationsContainer = document.getElementById('thumbnail-gallery');
    if (recommendationsContainer) {
        recommendationsContainer.innerHTML = '';
        console.log('Cleared thumbnail gallery');
    } else {
        console.warn('Thumbnail gallery element not found');
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
    
    // Show the results view
    showResultsView();
    
    console.log('=== END DISPLAY RESULTS DEBUG ===');
}

function displayCurrentArtwork() {
    console.log('=== DISPLAY CURRENT ARTWORK DEBUG ===');
    console.log('Current artwork index:', currentArtworkIndex);
    console.log('Total artworks:', allArtworks.length);
    
    if (currentArtworkIndex >= allArtworks.length) {
        console.log('No more artworks to display');
        return;
    }
    
    const artwork = allArtworks[currentArtworkIndex];
    console.log('Displaying artwork:', artwork.title);
    
    // Clear existing content
    const recommendationsContainer = document.getElementById('thumbnail-gallery');
    if (recommendationsContainer) {
        recommendationsContainer.innerHTML = '';
        console.log('Cleared thumbnail gallery in displayCurrentArtwork');
    } else {
        console.warn('Thumbnail gallery element not found in displayCurrentArtwork');
        return;
    }
    
    // Create thumbnail gallery
    createThumbnailGallery();
    
    // Select the current thumbnail
    selectThumbnail(currentArtworkIndex);
    
    // Initialize artwork interaction
    initializeArtworkInteraction();
    
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
async function updateArtworkDisplay(index) {
    const artwork = allArtworks[index];
    if (!artwork) {
        console.error('No artwork found at index:', index);
        return;
    }
    
    console.log('Updating artwork display for:', artwork);
    
    // Update overlay image
    const artworkImage = document.getElementById('artwork-image');
    if (artworkImage) {
        // Get image URL (S3 or local fallback)
        const imageSrc = await getImageUrl(artwork.filename);
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
    
    for (let i = 0; i < allArtworks.length; i++) {
        const artwork = allArtworks[i];
        
        // Skip if we've already processed this artwork
        if (processedIds.has(artwork.id)) {
            console.log('Skipping duplicate artwork:', artwork.title);
            continue;
        }
        
        processedIds.add(artwork.id);
        console.log('Creating thumbnail for artwork:', artwork);
        
        const thumbnail = document.createElement('div');
        thumbnail.className = 'thumbnail-item';
        thumbnail.onclick = () => selectThumbnail(i);
        
        // Get image URL (S3 or local fallback)
        const thumbnailImage = await getImageUrl(artwork.filename);
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
    }
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
    
    // Note: Upload form event listener is already handled in initializeUpload()
    // to prevent duplicate event listeners that cause double uploads
    
    const preferencesForm = document.getElementById('preferences-form');
    if (preferencesForm) {
        preferencesForm.addEventListener('submit', handlePreferencesSubmit);
    }
    
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
    console.log('=== SHOW OPTIONS VIEW DEBUG ===');
    console.log('Resetting UI to options view');
    
    // Hide all views
    document.getElementById('landing-page').style.display = 'none';
    document.getElementById('upload-section').style.display = 'none';
    document.getElementById('preferences-section').style.display = 'none';
    document.getElementById('results-section').style.display = 'none';
    document.getElementById('mockup-section').style.display = 'none';
    
    // Show options view
    document.getElementById('options-section').style.display = 'block';
    
    // Clear any existing content
    const uploadPreview = document.getElementById('upload-preview');
    if (uploadPreview) {
        uploadPreview.innerHTML = '';
    }
    
    const resultsContainer = document.getElementById('results-container');
    if (resultsContainer) {
        resultsContainer.innerHTML = '';
    }
    
    console.log('UI reset complete');
    console.log('=== END SHOW OPTIONS VIEW DEBUG ===');
} 