// =================================================================================
// Global Variables
// =================================================================================

let currentArtworkIndex = 0;
let recommendations = [];
let roomImageLoaded = false;
let lastPreferences = null; // Store the last preferences for refine functionality
let backButtonClickDisabled = false; // Add flag to prevent immediate clicking
let uploadArea, roomPhotoInput, uploadForm, preferencesForm, virtualShowroom, roomImage, artworkOverlay, artworkImage, artworkDetails, artworkTitle, artworkDescription, artworkPrice, viewDetailsButton, thumbnailsSection, thumbnailGallery, loadingSpinner, searchBox, optionsContainer, uploadFormContainer, preferencesFormContainer, resultsArea, mainTitleText, mainSubtitleText, backToSearchTop, navSearch, navGallery, refineSearchButton;
let currentSelectedIndex = -1; // Track the currently selected thumbnail

const MOCK_ROOM_URL = 'assets/mock/mock-room.jpg';

// =================================================================================
// Window Resize Handler
// =================================================================================

// Handle window resize to recalculate thumbnail selection dimensions
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        // If there's a currently selected thumbnail, recalculate its dimensions
        if (currentSelectedIndex >= 0) {
            console.log('Window resized, recalculating thumbnail selection for index:', currentSelectedIndex);
            updateThumbnailSelection(currentSelectedIndex);
        }
    }, 250); // Debounce resize events
});

// =================================================================================
// Initialization
// =================================================================================

document.addEventListener('DOMContentLoaded', function() {
    // --- DOM Element Selection ---
    uploadArea = document.getElementById('upload-area');
    roomPhotoInput = document.getElementById('room-photo');
    uploadForm = document.getElementById('upload-form');
    preferencesForm = document.getElementById('preferences-form');
    virtualShowroom = document.getElementById('virtual-showroom');
    roomImage = document.getElementById('room-image');
    artworkOverlay = document.getElementById('artwork-overlay');
    artworkImage = document.getElementById('artwork-image');
    artworkDetails = document.getElementById('artwork-details');
    artworkTitle = document.getElementById('artwork-title');
    artworkDescription = document.getElementById('artwork-description');
    artworkPrice = document.getElementById('artwork-price');
    viewDetailsButton = document.getElementById('view-details-button');
    thumbnailsSection = document.getElementById('thumbnails-section');
    thumbnailGallery = document.getElementById('thumbnail-gallery');
    loadingSpinner = document.getElementById('loading-spinner');
    searchBox = document.querySelector('#upload-view .search-box');
    optionsContainer = document.querySelector('.options-container');
    uploadFormContainer = document.getElementById('upload-form-container');
    preferencesFormContainer = document.getElementById('preferences-form-container');
    resultsArea = document.getElementById('results-area');
    mainTitleText = document.getElementById('main-title-text');
    mainSubtitleText = document.getElementById('main-subtitle-text');
    backToSearchTop = document.getElementById('back-to-search-top');
    
    // Debug: Check if artwork overlay is found
    console.log('Artwork overlay element found:', artworkOverlay);
    console.log('Artwork image element found:', artworkImage);
    console.log('Virtual showroom element found:', virtualShowroom);
    
    // Mobile navigation - these are anchor tags, not divs
    navSearch = document.querySelector('.mobile-nav-item[onclick*="upload-view"]');
    navGallery = document.querySelector('.mobile-nav-item[onclick*="showResults"]'); 
    refineSearchButton = document.getElementById('refine-search-button');

    // --- Initial Setup ---
    setupEventListeners();
    setupDragAndResize();
    showView('upload-view');
    
    // Handle window resize for artwork positioning
    window.addEventListener('resize', () => {
        if (artworkOverlay && artworkOverlay.style.display !== 'none') {
            positionArtworkOverlay();
        }
    });

    // Debug: Check if back button is found
    console.log('Back to search top button found:', backToSearchTop);
    
    // Hide the back button by default
    if (backToSearchTop) {
        backToSearchTop.style.display = 'none';
    }
});

// =================================================================================
// Event Listeners
// =================================================================================

function setupEventListeners() {
    if (!uploadArea || !roomPhotoInput || !uploadForm || !preferencesForm) {
        console.error("One or more essential elements could not be found.");
        return;
    }

    // --- Search/Upload View ---
    uploadArea.addEventListener('click', () => roomPhotoInput.click());
    roomPhotoInput.addEventListener('change', handleFileSelect);
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    uploadForm.addEventListener('submit', handleUploadFormSubmit);
    preferencesForm.addEventListener('submit', handlePreferencesFormSubmit);

    // --- Navigation ---
    const logoLink = document.getElementById('logo');
    if (logoLink) {
        logoLink.addEventListener('click', () => showOptions());
    }

    const newSearchButton = document.querySelector('button[onclick*="upload-view"]');
    if (newSearchButton) {
        newSearchButton.addEventListener('click', (e) => {
            e.preventDefault();
            showView('upload-view');
        });
    }
    
    if (viewDetailsButton) {
        viewDetailsButton.addEventListener('click', () => {
            artworkDetails.classList.toggle('visible');
        });
    }

    // --- Mobile Navigation ---
    const homeButton = document.getElementById('home-button');
    const uploadNavButton = document.getElementById('upload-nav-button');
    const preferencesNavButton = document.getElementById('preferences-nav-button');
    
    if (homeButton) {
        homeButton.addEventListener('click', (e) => {
            e.preventDefault();
            showOptions();
        });
    }
    
    if (uploadNavButton) {
        uploadNavButton.addEventListener('click', (e) => {
            e.preventDefault();
            showUploadForm();
        });
    }
    
    if (preferencesNavButton) {
        preferencesNavButton.addEventListener('click', (e) => {
            e.preventDefault();
            showPreferencesForm();
        });
    }

    // --- Refine Search Button ---
    if (refineSearchButton) {
        refineSearchButton.addEventListener('click', handleRefineSearch);
    }

    // Back button event listener with enhanced debugging
    if(backToSearchTop) {
        backToSearchTop.addEventListener('click', function(event) {
            console.log('Back button clicked!');
            console.log('Event details:', event);
            console.log('backButtonClickDisabled:', backButtonClickDisabled);
            console.log('Event timestamp:', event.timeStamp);
            
            if (backButtonClickDisabled) {
                console.log('Back button click blocked due to disabled flag');
                event.preventDefault();
                event.stopPropagation();
                return false;
            }
            
            console.log('Back button click allowed, calling resetToOptions');
            resetToOptions();
        });
        console.log('Back button event listener attached');
    } else {
        console.error('Back button not found during event listener setup');
    }
}

// =================================================================================
// View Management
// =================================================================================

function showView(viewId) {
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.add('active');
    }
    updateMobileNav('search');
}

function updateMobileNav(activeView) {
    const homeButton = document.getElementById('home-button');
    const uploadNavButton = document.getElementById('upload-nav-button');
    const preferencesNavButton = document.getElementById('preferences-nav-button');
    
    if (homeButton) homeButton.classList.toggle('active', activeView === 'search');
    if (uploadNavButton) uploadNavButton.classList.toggle('active', activeView === 'upload');
    if (preferencesNavButton) preferencesNavButton.classList.toggle('active', activeView === 'preferences');
}

// =================================================================================
// UI Component Logic
// =================================================================================

function showOptions() {
    optionsContainer.style.display = 'grid';
    uploadFormContainer.style.display = 'none';
    preferencesFormContainer.style.display = 'none';
    resultsArea.style.display = 'none';
    searchBox.classList.add('has-options');

    // Reset header text
    mainTitleText.textContent = 'Transform Your Space';
    mainSubtitleText.textContent = 'Discover the perfect artwork that speaks to your style and enhances your environment';

    recommendations = [];
    currentArtworkIndex = 0;
    
    uploadForm.reset();
    preferencesForm.reset();
    roomImageLoaded = false;
    
    uploadArea.classList.remove('has-image');
    uploadArea.style.backgroundImage = '';
    uploadArea.querySelector('.upload-icon').style.display = 'block';
    uploadArea.querySelector('.upload-text').textContent = 'Drop your room photo here';
    uploadArea.querySelector('.upload-hint').textContent = 'or click to browse files';
    
    // Hide refine button when returning to options
    hideRefineButton();
    
    updateMobileNav('search');
}

function showUploadForm() {
    optionsContainer.style.display = 'none';
    uploadFormContainer.style.display = 'block';
    preferencesFormContainer.style.display = 'none';
    resultsArea.style.display = 'none';
    searchBox.classList.remove('has-options');
    updateMobileNav('upload');
    
    // Clean up any existing upload preview
    const previewContainer = document.getElementById('upload-preview-container');
    if (previewContainer) {
        previewContainer.remove();
    }
    
    // Reset upload area
    if (uploadArea) {
        uploadArea.style.display = 'flex';
        uploadArea.classList.remove('has-image');
        uploadArea.style.backgroundImage = '';
        const uploadIcon = uploadArea.querySelector('.upload-icon');
        if (uploadIcon) uploadIcon.style.display = 'block';
        uploadArea.querySelector('.upload-text').textContent = 'Drop your room photo here';
        uploadArea.querySelector('.upload-hint').textContent = 'or click to browse files';
    }
    
    // Reset file input and state
    const fileInput = document.getElementById('room-photo');
    if (fileInput) fileInput.value = '';
    roomImageLoaded = false;
}

function showPreferencesForm() {
    optionsContainer.style.display = 'none';
    uploadFormContainer.style.display = 'none';
    preferencesFormContainer.style.display = 'block';
    resultsArea.style.display = 'none';
    searchBox.classList.remove('has-options');
    updateMobileNav('preferences');
}

function showResults() {
    console.log('=== SHOW RESULTS FUNCTION START ===');
    console.log('backToSearchTop element:', backToSearchTop);
    console.log('backToSearchTop display before:', backToSearchTop ? backToSearchTop.style.display : 'element not found');
    
    optionsContainer.style.display = 'none';
    uploadFormContainer.style.display = 'none';
    preferencesFormContainer.style.display = 'none';
    resultsArea.style.display = 'block';
    searchBox.classList.remove('has-options');
    
    if(backToSearchTop) {
        backToSearchTop.style.display = 'flex';
        console.log('Back button display set to flex');
        console.log('Back button display after setting:', backToSearchTop.style.display);
        console.log('Back button computed display:', window.getComputedStyle(backToSearchTop).display);
        
        // Disable back button click temporarily to prevent immediate hiding
        backButtonClickDisabled = true;
        console.log('Back button click disabled to prevent immediate hiding');
        
        // Re-enable after a longer delay to ensure any automatic events have settled
        setTimeout(() => {
            backButtonClickDisabled = false;
            console.log('Back button click re-enabled');
        }, 1000); // Increased from 500ms to 1000ms
    } else {
        console.error('Back button element is null in showResults!');
    }

    // Make thumbnails section visible
    const thumbnailsSection = document.getElementById('thumbnails-section');
    if (thumbnailsSection) {
        thumbnailsSection.style.display = 'block';
        console.log('Thumbnails section made visible');
        
        // Check if thumbnails section is in viewport
        const rect = thumbnailsSection.getBoundingClientRect();
        console.log('Thumbnails section position:', rect);
        console.log('Thumbnails section visible in viewport:', rect.top >= 0 && rect.bottom <= window.innerHeight);
        
        // If not visible, scroll to it
        if (rect.bottom > window.innerHeight || rect.top < 0) {
            console.log('Scrolling to thumbnails section');
            thumbnailsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    } else {
        console.error('Thumbnails section not found!');
    }

    // Make artwork details section visible
    const artworkDetails = document.getElementById('artwork-details');
    if (artworkDetails) {
        artworkDetails.style.display = 'block';
        console.log('Artwork details section made visible');
    } else {
        console.error('Artwork details section not found!');
    }

    // Update header text
    mainTitleText.textContent = 'Your Virtual Showroom';
    mainSubtitleText.textContent = 'See how different artworks look in your space. Drag to reposition and resize the artwork overlay.';

    // Show refine button if we have preferences-based results
    if (lastPreferences) {
        showRefineButton();
    }
    
    console.log('=== SHOW RESULTS FUNCTION END ===');
}

function resetToOptions() {
    console.log('resetToOptions called');
    console.log('Call stack:', new Error().stack);
    console.log('backToSearchTop element:', backToSearchTop);
    
    // Check if back button click is disabled (to prevent immediate hiding)
    if (backButtonClickDisabled) {
        console.log('Back button click disabled, ignoring resetToOptions call');
        return;
    }
    
    // Add a small delay to prevent immediate hiding of back button
    setTimeout(() => {
        optionsContainer.style.display = 'grid';
        uploadFormContainer.style.display = 'none';
        preferencesFormContainer.style.display = 'none';
        resultsArea.style.display = 'none';
        searchBox.classList.add('has-options');
        
        // Reset header text
        mainTitleText.textContent = 'Find Your Perfect Artwork';
        mainSubtitleText.textContent = 'Upload a photo of your room or tell us your preferences';
        
        // Clear any existing recommendations
        recommendations = [];
        currentArtworkIndex = 0;
        
        // Hide back button
        if(backToSearchTop) {
            backToSearchTop.style.display = 'none';
            console.log('Back button hidden');
        }
        
        // Reset upload area
        if (uploadArea) {
            uploadArea.style.display = 'flex';
        }
        
        // Clear any existing upload preview
        const previewContainer = document.getElementById('upload-preview-container');
        if (previewContainer) {
            previewContainer.remove();
        }
        
        // Hide refine button
        hideRefineButton();
    }, 100); // 100ms delay
}

// =================================================================================
// Form & File Handling
// =================================================================================

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) processFile(file);
}

function handleDragOver(event) {
    event.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(event) {
    event.preventDefault();
    uploadArea.classList.remove('dragover');
}

function handleDrop(event) {
    event.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = event.dataTransfer.files;
    if (files.length > 0) processFile(files[0]);
}

function processFile(file) {
    if (!file.type.startsWith('image/')) {
        showStatusMessage('Please select an image file.', 'error', uploadFormContainer);
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        roomImage.src = e.target.result;
        roomImage.onload = function() {
            roomImageLoaded = true;
            
            // Show the uploaded image preview
            showUploadedImagePreview(e.target.result, file.name);
        };
    };
    reader.readAsDataURL(file);
}

function showUploadedImagePreview(imageDataUrl, fileName) {
    // Hide the upload area
    uploadArea.style.display = 'none';
    
    // Create and show the image preview
    const previewContainer = document.createElement('div');
    previewContainer.id = 'upload-preview-container';
    previewContainer.className = 'upload-preview-container';
    
    previewContainer.innerHTML = `
        <div class="upload-preview-header">
            <h3>Your Room Photo</h3>
            <button class="change-photo-btn" onclick="changePhoto()">
                <i class="fas fa-edit"></i>
                Change Photo
            </button>
        </div>
        <div class="upload-preview-image">
            <img src="${imageDataUrl}" alt="Your room photo" id="preview-image">
        </div>
        <div class="upload-preview-info">
            <p class="file-name">${fileName}</p>
            <p class="preview-hint">This is the room photo that will be used for recommendations</p>
        </div>
        <div class="upload-preview-actions">
            <button class="button" onclick="proceedWithUpload()">
                <i class="fas fa-magic"></i>
                Get Recommendations
            </button>
        </div>
    `;
    
    // Insert the preview after the upload form
    const uploadForm = document.getElementById('upload-form');
    uploadForm.appendChild(previewContainer);
    
    showStatusMessage('Photo uploaded successfully!', 'success', uploadFormContainer);
}

function changePhoto() {
    // Remove the preview and show upload area again
    const previewContainer = document.getElementById('upload-preview-container');
    if (previewContainer) {
        previewContainer.remove();
    }
    
    uploadArea.style.display = 'flex';
    uploadArea.classList.remove('has-image');
    uploadArea.style.backgroundImage = '';
    uploadArea.querySelector('.upload-icon').style.display = 'block';
    uploadArea.querySelector('.upload-text').textContent = 'Drop your room photo here';
    uploadArea.querySelector('.upload-hint').textContent = 'or click to browse files';
    
    // Reset the file input
    document.getElementById('room-photo').value = '';
    roomImageLoaded = false;
}

function proceedWithUpload() {
    // Automatically get recommendations
    handleUploadFormSubmit(new Event('submit'));
}

async function handleUploadFormSubmit(event) {
    event.preventDefault();
    if (!roomImageLoaded) {
        showStatusMessage('Please upload a room photo first.', 'error', uploadFormContainer);
        return;
    }
    const payload = {
        type: 'upload',
        style: document.getElementById('style-filter').value,
        roomImage: roomImage.src,
    };
    const results = await getRecommendations(payload);
    if (results) displayResults(results, true);
}

async function handlePreferencesFormSubmit(event) {
    event.preventDefault();
    
    // Save the current preferences for refine functionality
    lastPreferences = {
        style: document.getElementById('style-select').value,
        mood: document.getElementById('mood-select').value,
        subject: document.getElementById('subject-select').value,
        color: document.getElementById('color-preference').value
    };
    
    const payload = {
        type: 'preferences',
        preferences: lastPreferences
    };
    const results = await getRecommendations(payload);
    if (results) {
        displayResults(results, false);
        showRefineButton(); // Show the refine button after successful preferences search
    }
}

// =================================================================================
// API Interaction
// =================================================================================

async function getRecommendations(payload) {
    showLoading(true);
    try {
        const response = await fetch(`${config.api.baseUrl}/recommend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Request failed with status ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Recommendation error:', error);
        showStatusMessage(`Error: ${error.message}`, 'error', document.querySelector('.view.active .search-box'));
        return null;
    } finally {
        showLoading(false);
    }
}

// =================================================================================
// Results Display
// =================================================================================

function displayResults(data, hasRoomImage) {
    console.log('displayResults called with hasRoomImage:', hasRoomImage);
    recommendations = data.recommendations;
    if (!recommendations || recommendations.length === 0) {
        showStatusMessage('No recommendations found. Try different criteria.', 'info', searchBox);
        return;
    }
    
    // Clean up upload preview if it exists
    const previewContainer = document.getElementById('upload-preview-container');
    if (previewContainer) {
        previewContainer.remove();
    }
    
    // Reset upload area display
    if (uploadArea) {
        uploadArea.style.display = 'flex';
    }
    
    showResults();
    
    // Directly show the back button as a backup
    if (backToSearchTop) {
        backToSearchTop.style.display = 'flex';
        console.log('Back button display set to flex in displayResults');
    }
    
    // Set up the room image based on hasRoomImage parameter
    if (hasRoomImage) {
        // User uploaded a room photo - it should already be set in roomImage.src
        console.log('Using uploaded room photo');
        roomImage.style.display = 'block';
    } else {
        // No room photo uploaded - use mock room
        console.log('Using mock room background');
        roomImage.src = MOCK_ROOM_URL;
        roomImage.style.display = 'block';
    }
    
    // Debug: Check virtual showroom setup
    console.log('Virtual showroom element:', virtualShowroom);
    console.log('Room image element:', roomImage);
    console.log('Room image src:', roomImage.src);
    console.log('Artwork overlay element:', artworkOverlay);
    console.log('Artwork image element:', artworkImage);
    
    // Create thumbnails
    console.log('=== CREATE THUMBNAILS START ===');
    const thumbnailGallery = document.getElementById('thumbnail-gallery');
    console.log('Thumbnail gallery element:', thumbnailGallery);
    console.log('Thumbnail gallery innerHTML before clearing:', thumbnailGallery.innerHTML);
    
    thumbnailGallery.innerHTML = '';
    console.log('Thumbnail gallery cleared');
    
    console.log('Recommendations count:', recommendations.length);
    console.log('Recommendations:', recommendations);
    
    recommendations.forEach((artwork, index) => {
        console.log(`Creating thumbnail ${index} for Artwork ${artwork.filename}`);
        
        const thumbnail = document.createElement('div');
        thumbnail.className = 'thumbnail';
        thumbnail.style.pointerEvents = 'auto';
        thumbnail.style.cursor = 'pointer';
        
        console.log('Thumbnail element created:', thumbnail);
        
        thumbnail.innerHTML = `
            <img src="/catalog/images/${artwork.filename}" alt="Artwork ${artwork.filename}">
        `;
        
        // Add click event listener
        thumbnail.addEventListener('click', function(e) {
            console.log(`=== THUMBNAIL CLICK EVENT ===`);
            console.log(`Thumbnail ${index} clicked!`);
            
            displayRecommendation(index);
        });
        
        // Add a test click event to verify the element is clickable
        thumbnail.addEventListener('mouseenter', function() {
            console.log(`Mouse entered thumbnail ${index}`);
            // Remove the blue border - it's not needed and looks bad
        });
        
        thumbnail.addEventListener('mouseleave', function() {
            console.log(`Mouse left thumbnail ${index}`);
            if (!this.classList.contains('selected')) {
                this.style.border = '';
            }
        });
        
        thumbnailGallery.appendChild(thumbnail);
        console.log(`Thumbnail ${index} added to gallery`);
        console.log('Thumbnail gallery children count after adding:', thumbnailGallery.children.length);
    });
    
    console.log('=== CREATE THUMBNAILS END ===');
    console.log('Total thumbnails created:', thumbnailGallery.children.length);
    console.log('Thumbnail gallery final HTML:', thumbnailGallery.innerHTML);
    
    // Debug thumbnail positions and clickability
    const thumbnails = thumbnailGallery.querySelectorAll('.thumbnail');
    thumbnails.forEach((thumbnail, index) => {
        const rect = thumbnail.getBoundingClientRect();
        console.log(`Thumbnail ${index} position:`, rect);
        console.log(`Thumbnail ${index} visible:`, rect.width > 0 && rect.height > 0);
        console.log(`Thumbnail ${index} display:`, window.getComputedStyle(thumbnail).display);
        console.log(`Thumbnail ${index} visibility:`, window.getComputedStyle(thumbnail).visibility);
        
        // Check if element is at the center position
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const elementAtCenter = document.elementFromPoint(centerX, centerY);
        console.log(`Thumbnail ${index} element at center (${centerX}, ${centerY}):`, elementAtCenter);
        console.log(`Thumbnail ${index} is element at position:`, elementAtCenter === thumbnail);
        
        // Set pointer events and cursor
        thumbnail.style.pointerEvents = 'auto';
        thumbnail.style.cursor = 'pointer';
        console.log(`Thumbnail ${index} pointer-events set to:`, thumbnail.style.pointerEvents);
        console.log(`Thumbnail ${index} cursor set to:`, thumbnail.style.cursor);
    });
    
    // Display the first recommendation by default
    console.log('=== DISPLAYING FIRST RECOMMENDATION BY DEFAULT ===');
    displayRecommendation(0);
}

function displayRecommendation(index) {
    console.log('=== DISPLAY RECOMMENDATION START ===');
    console.log('displayRecommendation called with index:', index);
    console.log('Index type:', typeof index);
    console.log('Previous currentArtworkIndex:', currentArtworkIndex);
    
    if (!recommendations || recommendations.length === 0) {
        console.log('No recommendations available');
        return;
    }

    // Always update, even if it's the same index
    currentArtworkIndex = index;
    console.log('Updated currentArtworkIndex to:', currentArtworkIndex);
    
    const artwork = recommendations[currentArtworkIndex];
    console.log('Selected artwork:', artwork);
    console.log('Selected artwork filename:', artwork.filename);
    
    // Update main artwork overlay - construct full URL
    const imageUrl = `${config.api.baseUrl}/catalog/images/${artwork.filename}?t=${Date.now()}`;
    console.log('Setting artwork image URL:', imageUrl);
    
    // Debug: Check artwork overlay element
    console.log('Artwork overlay element:', artworkOverlay);
    console.log('Artwork image element:', artworkImage);
    console.log('Artwork overlay display before:', artworkOverlay.style.display);
    console.log('Artwork image src before:', artworkImage.src);
    
    // Update thumbnail selection FIRST
    console.log('About to call updateThumbnailSelection with index:', index);
    updateThumbnailSelection(index);
    console.log('Thumbnail selection updated to index:', index);
    
    // Clear any existing image to force reload
    artworkImage.src = '';
    artworkImage.src = imageUrl;
    
    artworkImage.onload = () => {
        console.log('Artwork image loaded successfully');
        console.log('Image dimensions:', artworkImage.naturalWidth, 'x', artworkImage.naturalHeight);
        
        // Debug: Check if overlay element exists
        console.log('Artwork overlay element exists:', !!artworkOverlay);
        console.log('Artwork overlay element:', artworkOverlay);
        
        // Make the overlay visible and position it properly
        artworkOverlay.style.display = 'block';
        console.log('Artwork overlay display set to block');
        console.log('Artwork overlay display after:', artworkOverlay.style.display);
        console.log('Artwork overlay computed display:', window.getComputedStyle(artworkOverlay).display);
        
        // Add a small delay to ensure DOM is fully updated
        setTimeout(() => {
            // Position the artwork overlay AFTER thumbnail selection is complete
            positionArtworkOverlay();
            
            // Ensure drag and resize functionality is set up
            setupDragAndResize();
            
            console.log('Artwork overlay update completed');
        }, 100);
    };
    
    // Update artwork details section
    updateArtworkDetails(artwork);
    
    console.log('=== DISPLAY RECOMMENDATION END ===');
}

function updateArtworkDetails(artwork) {
    console.log('=== UPDATE ARTWORK DETAILS START ===');
    console.log('Updating artwork details for:', artwork);
    
    const artworkDetails = document.getElementById('artwork-details');
    const artworkTitle = document.getElementById('artwork-title');
    const artworkDescription = document.getElementById('artwork-description');
    const artworkPrice = document.getElementById('artwork-price');
    const viewDetailsButton = document.getElementById('view-details-button');
    
    if (!artworkDetails || !artworkTitle || !artworkDescription || !artworkPrice || !viewDetailsButton) {
        console.error('Artwork details elements not found');
        return;
    }
    
    // Extract filename without extension for title
    const filename = artwork.filename;
    const title = filename.replace(/\.[^/.]+$/, "").replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
    
    // Set artwork title
    artworkTitle.textContent = title;
    
    // Set artwork description (you can customize this based on your needs)
    const description = artwork.description || `Beautiful ${title.toLowerCase()} artwork that will enhance your space. This piece features stunning composition and high-quality printing.`;
    artworkDescription.textContent = description;
    
    // Set price
    const price = artwork.price || '$12.95';
    artworkPrice.textContent = `Starting at ${price}`;
    
    // Set purchase link (you can customize this URL structure)
    const purchaseUrl = artwork.purchase_url || `https://tabernerstudio.com/artwork/${filename.replace(/\.[^/.]+$/, "")}`;
    viewDetailsButton.onclick = () => window.open(purchaseUrl, '_blank');
    
    // Show the artwork details section
    artworkDetails.style.display = 'block';
    
    console.log('Artwork details updated successfully');
    console.log('=== UPDATE ARTWORK DETAILS END ===');
}

function positionArtworkOverlay() {
    console.log('=== POSITION ARTWORK OVERLAY START ===');
    const artworkContainer = virtualShowroom;
    if (!artworkContainer) {
        console.error('Virtual showroom container not found');
        return;
    }
    
    // Get the selected thumbnail to use its dimensions
    const selectedThumbnail = thumbnailGallery.querySelector('.thumbnail.selected');
    if (!selectedThumbnail) {
        console.error('No selected thumbnail found');
        console.log('Available thumbnails:', thumbnailGallery.querySelectorAll('.thumbnail').length);
        console.log('Thumbnails with selected class:', thumbnailGallery.querySelectorAll('.thumbnail.selected').length);
        return;
    }
    
    // Get the actual image element inside the thumbnail
    const thumbnailImage = selectedThumbnail.querySelector('img');
    if (!thumbnailImage) {
        console.error('No image found inside selected thumbnail');
        return;
    }
    
    const thumbnailRect = selectedThumbnail.getBoundingClientRect();
    const containerRect = artworkContainer.getBoundingClientRect();
    
    console.log('Selected thumbnail element:', selectedThumbnail);
    console.log('Thumbnail image element:', thumbnailImage);
    console.log('Thumbnail rect:', thumbnailRect);
    console.log('Container rect:', containerRect);
    
    // Get the actual dimensions of the resized image
    // The image might be smaller than the container due to object-fit: contain
    const imageRect = thumbnailImage.getBoundingClientRect();
    console.log('Image rect:', imageRect);
    console.log('Image computed style:', window.getComputedStyle(thumbnailImage));
    console.log('Image natural dimensions:', thumbnailImage.naturalWidth, 'x', thumbnailImage.naturalHeight);
    console.log('Image offset dimensions:', thumbnailImage.offsetWidth, 'x', thumbnailImage.offsetHeight);
    
    // Calculate actual visible image dimensions when using object-fit: contain
    const containerWidth = thumbnailImage.offsetWidth;
    const containerHeight = thumbnailImage.offsetHeight;
    const naturalWidth = thumbnailImage.naturalWidth;
    const naturalHeight = thumbnailImage.naturalHeight;
    
    // Calculate scaling factor to fit image within container while preserving aspect ratio
    const scaleX = containerWidth / naturalWidth;
    const scaleY = containerHeight / naturalHeight;
    const scale = Math.min(scaleX, scaleY); // Use the smaller scale to fit within container
    
    // Calculate actual visible image dimensions
    const actualWidth = naturalWidth * scale;
    const actualHeight = naturalHeight * scale;
    
    console.log('Container dimensions:', containerWidth, 'x', containerHeight);
    console.log('Natural dimensions:', naturalWidth, 'x', naturalHeight);
    console.log('Scale factors - X:', scaleX, 'Y:', scaleY, 'Used scale:', scale);
    console.log('Actual visible image dimensions:', actualWidth, 'x', actualHeight);
    
    // Use the actual visible image dimensions, not the container dimensions
    const width = actualWidth;
    const height = actualHeight;
    
    console.log('Using actual visible image dimensions - width:', width, 'height:', height);
    console.log('Container dimensions were - width:', thumbnailRect.width, 'height:', thumbnailRect.height);
    
    if (width === 0 || height === 0) {
        console.error('Image has zero dimensions!');
        console.log('Image computed style:', window.getComputedStyle(thumbnailImage));
        console.log('Thumbnail computed style:', window.getComputedStyle(selectedThumbnail));
        return;
    }
    
    // Scale up the overlay to make it more visible in the virtual showroom
    const isMobile = window.innerWidth <= 768;
    const scaleFactor = isMobile ? 1.3 : 1.1; // Larger size for better visibility while still realistic
    const scaledWidth = width * scaleFactor;
    const scaledHeight = height * scaleFactor;
    
    // Calculate position to center the overlay in the container
    // Convert viewport coordinates to container-relative coordinates
    const x = (containerRect.width - scaledWidth) / 2;
    const y = (containerRect.height - scaledHeight) / 2;

    console.log('Calculated position - width:', scaledWidth, 'height:', scaledHeight, 'x:', x, 'y:', y);

    // Use a combination of top/left and transform for robust positioning
    Object.assign(artworkOverlay.style, {
        width: `${scaledWidth}px`,
        height: `${scaledHeight}px`,
        top: `${y}px`,
        left: `${x}px`,
        transform: 'translate(0, 0)' // Reset transform and use top/left
    });

    console.log('Artwork overlay styles applied:', artworkOverlay.style);
    console.log('Artwork overlay final computed style:', window.getComputedStyle(artworkOverlay));

    // Store initial data for dragging
    artworkOverlay.setAttribute('data-x', x);
    artworkOverlay.setAttribute('data-y', y);
    
    console.log('=== POSITION ARTWORK OVERLAY END ===');
}

function updateThumbnailSelection(selectedIndex) {
    console.log('=== UPDATE THUMBNAIL SELECTION START ===');
    console.log('Selected index:', selectedIndex);
    
    const thumbnails = document.querySelectorAll('.thumbnail');
    console.log('Found thumbnails:', thumbnails.length);
    
    thumbnails.forEach((thumbnail, index) => {
        if (index === selectedIndex) {
            thumbnail.classList.add('selected');
            // CSS handles the scale and shadow effects
        } else {
            thumbnail.classList.remove('selected');
            // CSS handles resetting the effects
        }
    });

    console.log('=== UPDATE THUMBNAIL SELECTION END ===');
}

// =================================================================================
// Drag and Resize (Interact.js)
// =================================================================================

function setupDragAndResize() {
    if (!artworkOverlay) return;
    
    // Unset any existing interact.js bindings to prevent conflicts
    interact(artworkOverlay).unset();
    
    // Store original aspect ratio when resizing starts
    let originalAspectRatio = 1;
    const isMobile = window.innerWidth <= 768;
    
    interact(artworkOverlay)
        .resizable({
            edges: { left: true, right: true, bottom: true, top: true },
            listeners: { 
                start: function(event) {
                    // Store the original aspect ratio when resizing starts
                    const target = event.target;
                    originalAspectRatio = target.offsetWidth / target.offsetHeight;
                    console.log('Resize started - Original aspect ratio:', originalAspectRatio);
                },
                move: resizeMoveListener 
            },
            modifiers: isMobile ? [
                // Simplified modifiers for mobile
                interact.modifiers.restrictEdges({ outer: 'parent' }),
                interact.modifiers.restrictSize({ min: { width: 50, height: 50 } })
            ] : [
                // Full modifiers for desktop
                interact.modifiers.restrictEdges({ outer: 'parent' }),
                interact.modifiers.restrictSize({ min: { width: 50, height: 50 } }),
                interact.modifiers.aspectRatio({
                    ratio: 'preserve',
                    modifiers: [
                        interact.modifiers.restrictSize({
                            min: { width: 50, height: 50 }
                        })
                    ]
                })
            ],
            inertia: true,
            // Mobile-specific options
            autoScroll: true,
            touchAction: 'none'
        })
        .draggable({
            listeners: { move: dragMoveListener },
            inertia: true,
            modifiers: [interact.modifiers.restrictRect({ restriction: 'parent', endOnly: true })],
            autoScroll: true,
            touchAction: 'none'
        });
}

function dragMoveListener(event) {
    const target = event.target;
    // Keep the dragged position in the data-x/data-y attributes
    const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
    const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

    // Set position using top/left
    target.style.left = `${x}px`;
    target.style.top = `${y}px`;

    // Update the data attributes
    target.setAttribute('data-x', x);
    target.setAttribute('data-y', y);
}

function resizeMoveListener(event) {
    const target = event.target;
    let x = parseFloat(target.getAttribute('data-x')) || 0;
    let y = parseFloat(target.getAttribute('data-y')) || 0;
    
    // Mobile-specific debugging
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        console.log('=== MOBILE RESIZE DEBUG ===');
        console.log('Event type:', event.type);
        console.log('Event rect:', event.rect);
        console.log('Event deltaRect:', event.deltaRect);
        console.log('Event dx:', event.dx, 'dy:', event.dy);
        console.log('Current target size:', target.offsetWidth, 'x', target.offsetHeight);
    }
    
    // Update size
    target.style.width = event.rect.width + 'px';
    target.style.height = event.rect.height + 'px';
    
    // Update position using top/left instead of transform
    x += event.deltaRect.left;
    y += event.deltaRect.top;
    target.style.left = `${x}px`;
    target.style.top = `${y}px`;
    
    // Update the data attributes
    target.setAttribute('data-x', x);
    target.setAttribute('data-y', y);
    
    if (isMobile) {
        console.log('New target size:', target.offsetWidth, 'x', target.offsetHeight);
        console.log('New position:', x, y);
    }
}

// =================================================================================
// Utility Functions
// =================================================================================

function showLoading(show) {
    loadingSpinner.style.display = show ? 'flex' : 'none';
}

function showStatusMessage(message, type = 'info', container = null) {
    const statusMessage = document.createElement('div');
    statusMessage.className = `status-message ${type}`;
    statusMessage.textContent = message;

    const targetContainer = container || document.querySelector('.view.active');
    if (targetContainer) {
        const existingMsg = targetContainer.querySelector('.status-message');
        if(existingMsg) existingMsg.remove();
        targetContainer.insertBefore(statusMessage, targetContainer.firstChild);
    }
    
    setTimeout(() => {
        statusMessage.classList.add('fade-out');
        setTimeout(() => statusMessage.remove(), 500);
    }, 4000);
}

// =================================================================================
// Refine Search Functionality
// =================================================================================

function showRefineButton() {
    if (refineSearchButton) {
        refineSearchButton.style.display = 'block';
        // Add class to mobile nav for styling
        const mobileNav = document.querySelector('.mobile-nav');
        if (mobileNav) {
            mobileNav.classList.add('has-refine');
        }
    }
}

function hideRefineButton() {
    if (refineSearchButton) {
        refineSearchButton.style.display = 'none';
        // Remove class from mobile nav
        const mobileNav = document.querySelector('.mobile-nav');
        if (mobileNav) {
            mobileNav.classList.remove('has-refine');
        }
    }
}

function handleRefineSearch() {
    if (!lastPreferences) {
        console.error('No previous preferences found');
        return;
    }
    
    // Hide results and show preferences form
    resultsArea.style.display = 'none';
    preferencesFormContainer.style.display = 'block';
    searchBox.classList.remove('has-options');
    
    // Pre-fill the form with last preferences
    document.getElementById('style-select').value = lastPreferences.style;
    document.getElementById('mood-select').value = lastPreferences.mood;
    document.getElementById('subject-select').value = lastPreferences.subject;
    document.getElementById('color-preference').value = lastPreferences.color;
    
    // Update header text
    mainTitleText.textContent = 'Refine Your Search';
    mainSubtitleText.textContent = 'Adjust your preferences to get different recommendations';
    
    // Hide refine button while editing
    hideRefineButton();
}
