// Google Analytics tracking functions
function trackEvent(eventName, parameters = {}) {
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, parameters);
    }
}

function trackPageView(pageName) {
    if (typeof gtag !== 'undefined') {
        gtag('event', 'page_view', {
            page_title: pageName,
            page_location: window.location.href
        });
    }
}

// Global state
let uploadedFiles = [];
let convertedFiles = [];
let selectedFormat = 'PNG';
let isConverting = false;
let isDownloaded = false;

// Lightweight format validation
const SUPPORTED_INPUT_FORMATS = ['png', 'bmp', 'eps', 'gif', 'ico', 'jpeg', 'jpg', 'odd', 'svg', 'psd', 'tga', 'tiff', 'webp'];
const SUPPORTED_OUTPUT_FORMATS = ['PNG', 'BMP', 'EPS', 'GIF', 'ICO', 'JPEG', 'JPG', 'ODD', 'SVG', 'PSD', 'TGA', 'TIFF', 'WebP'];

// DOM elements - Initialize safely to prevent Safari crashes
let header, uploadBox, selectFilesBtn, fileSourceDropdown, fileListContainer;
let outputSettings, formatBtn, formatOptions, convertBtn;
let progressContainer, progressFill, progressText;
let errorMessageContainer, errorMessage;
let fileInput, urlModal, urlInput, urlSubmit, modalClose;

// Safely initialize DOM elements
function initializeDOMElements() {
    header = document.getElementById('header');
    uploadBox = document.getElementById('uploadBox');
    selectFilesBtn = document.getElementById('selectFilesBtn');
    fileSourceDropdown = document.getElementById('fileSourceDropdown');
    fileListContainer = document.getElementById('fileListContainer');
    outputSettings = document.getElementById('outputSettings');
    formatBtn = document.getElementById('formatBtn');
    formatOptions = document.getElementById('formatOptions');
    convertBtn = document.getElementById('convertBtn');
    progressContainer = document.getElementById('progressContainer');
    progressFill = document.getElementById('progressFill');
    progressText = document.getElementById('progressText');
    errorMessageContainer = document.getElementById('errorMessageContainer');
    errorMessage = document.getElementById('errorMessage');
    fileInput = document.getElementById('fileInput');
    urlModal = document.getElementById('urlModal');
    urlInput = document.getElementById('urlInput');
    urlSubmit = document.getElementById('urlSubmit');
    modalClose = document.getElementById('modalClose');
    
    // Validate critical elements exist
    if (!uploadBox || !fileListContainer || !convertBtn) {
        console.error('Critical DOM elements not found');
        return false;
    }
    return true;
}

// Cross-browser DOM ready function
function domReady(fn) {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(fn, 1);
    } else {
        if (document.addEventListener) {
            document.addEventListener('DOMContentLoaded', fn);
        } else if (document.attachEvent) {
            // IE8 fallback
            document.attachEvent('onreadystatechange', function() {
                if (document.readyState === 'complete') {
                    fn();
                }
            });
        }
    }
}

// Initialize app - Cross-browser and mobile compatible
domReady(function() {
    try {
        // Wait a bit for all elements to be fully loaded (Safari fix)
        setTimeout(function() {
            // Initialize DOM elements first
            if (!initializeDOMElements()) {
                console.error('Failed to initialize DOM elements');
                // Retry once after a short delay
                setTimeout(function() {
                    if (!initializeDOMElements()) {
                        console.error('Critical DOM elements still not found');
                        return;
                    }
                    initializeAppFeatures();
                }, 100);
                return;
            }
            initializeAppFeatures();
        }, 50);
    } catch (error) {
        console.error('Error initializing app:', error);
        // Show user-friendly error message
        if (typeof alert !== 'undefined') {
            alert('An error occurred while loading the page. Please refresh.');
        }
    }
});

// Separate function for initializing app features
function initializeAppFeatures() {
    try {
        // Track page view (only if gtag is available)
        if (typeof trackPageView === 'function') {
            trackPageView('Love U Convert - WebP to PNG Converter');
        }
        
        // Initialize features safely with feature detection
        if (typeof initializeEventListeners === 'function') {
            initializeEventListeners();
        }
        if (typeof initializeScrollHandler === 'function') {
            initializeScrollHandler();
        }
        if (typeof initializeServiceWorker === 'function') {
            initializeServiceWorker();
        }
        if (typeof initializeFAQ === 'function') {
            initializeFAQ();
        }
        
        // Language selector initialization
        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect && typeof handleLanguageChange === 'function') {
            languageSelect.addEventListener('change', handleLanguageChange);
        }
        
        // Mobile touch events support
        initializeMobileSupport();
    } catch (error) {
        console.error('Error initializing app features:', error);
    }
}

// Mobile touch support for better mobile compatibility
function initializeMobileSupport() {
    // Add touch event support for mobile devices
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        // Mobile device detected - add touch optimizations
        
        // Prevent zoom on double tap for better mobile UX
        let lastTouchEnd = 0;
        document.addEventListener('touchend', function(e) {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
        
        // Improve touch target sizes for mobile
        const buttons = document.querySelectorAll('button, .dropdown-item, .format-option');
        buttons.forEach(function(button) {
            if (button && button.style) {
                // Ensure minimum touch target size (44x44px recommended by Apple)
                const minSize = '44px';
                if (!button.style.minHeight) {
                    button.style.minHeight = minSize;
                }
                if (!button.style.minWidth) {
                    button.style.minWidth = minSize;
                }
            }
        });
    }
}

// Daily limit check - Cross-browser compatible with fetch fallback
async function isDailyLimitReached() {
    try {
        // Use fetch with fallback for older browsers
        let res;
        if (typeof fetch !== 'undefined') {
            res = await fetch('/api/usage', { cache: 'no-store' });
        } else {
            // Fallback using XMLHttpRequest for older browsers
            return new Promise(function(resolve) {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', '/api/usage', true);
                xhr.onreadystatechange = function() {
                    if (xhr.readyState === 4) {
                        if (xhr.status === 200) {
                            try {
                                const data = JSON.parse(xhr.responseText);
                                const pct = Number(data.percentage || 0);
                                resolve(pct >= 100);
                            } catch (e) {
                                resolve(false);
                            }
                        } else {
                            resolve(false);
                        }
                    }
                };
                xhr.send();
            });
        }
        
        if (!res || !res.ok) return false; // fallthrough; don't block if unknown
        const data = await res.json();
        const pct = Number(data.percentage || 0);
        return pct >= 100;
    } catch (e) {
        console.error('Error checking daily limit:', e);
        return false;
    }
}

// Event listeners - Safely initialize with null checks for Safari
function initializeEventListeners() {
    // File source dropdown
    if (selectFilesBtn && fileSourceDropdown) {
        selectFilesBtn.addEventListener('click', toggleFileSourceDropdown);
        document.addEventListener('click', closeDropdownsOnOutsideClick);
        
        // File source options
        document.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', handleFileSourceSelection);
        });
    }
    
    // Format dropdown
    if (formatBtn && formatOptions) {
        formatBtn.addEventListener('click', toggleFormatDropdown);
        document.querySelectorAll('.format-option').forEach(option => {
            option.addEventListener('click', handleFormatSelection);
        });
    }
    
    // File input
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelection);
    }
    
    // Drag and drop
    if (uploadBox) {
        uploadBox.addEventListener('dragover', handleDragOver);
        uploadBox.addEventListener('dragleave', handleDragLeave);
        uploadBox.addEventListener('drop', handleDrop);
        uploadBox.addEventListener('click', handleUploadBoxClick);
    }
    
    // Convert button
    if (convertBtn) {
        convertBtn.addEventListener('click', handleConvert);
    }
    
    // URL modal
    if (urlSubmit && modalClose && urlModal) {
        urlSubmit.addEventListener('click', handleUrlSubmit);
        modalClose.addEventListener('click', closeUrlModal);
        urlModal.addEventListener('click', handleModalBackdropClick);
    }
    
    // Toast close
    document.querySelectorAll('.toast').forEach(toast => {
        toast.addEventListener('click', () => hideToast(toast));
    });
    
    // Language selector - Moved to DOMContentLoaded to prevent Safari issues
    // Initialization is now in DOMContentLoaded handler
}

// Language selection handler
function handleLanguageChange(e) {
    const selectedLanguage = e.target.value;
    
    // If English is selected, allow it (do nothing)
    if (selectedLanguage === 'en') {
        // Hide message if visible
        hideLanguageMessage();
        return;
    }
    
    // If any other language is selected, show "Coming Soon" message and reset to English
    showLanguageComingSoon();
    e.target.value = 'en'; // Reset to English
}

let languageMessageTimeout = null;

// Show "Coming Soon" message for language selection in footer
function showLanguageComingSoon() {
    // Find the language selector element and footer section
    const languageSelect = document.getElementById('languageSelect');
    const footerSection = languageSelect ? languageSelect.closest('.footer-section') : null;
    
    if (!languageSelect || !footerSection) return;
    
    // Clear any existing timeout
    if (languageMessageTimeout) {
        clearTimeout(languageMessageTimeout);
    }
    
    // Ensure footer section is positioning context
    if (getComputedStyle(footerSection).position === 'static') {
        footerSection.style.position = 'relative';
    }

    // Popup element (overlay) — does not affect layout
    let messageElement = footerSection.querySelector('.language-coming-soon-popup');
    if (!messageElement) {
        messageElement = document.createElement('div');
        messageElement.className = 'language-coming-soon-popup';
        messageElement.textContent = 'Coming Soon';
        footerSection.appendChild(messageElement);
    }

    // Anchor popup just above the language selector box heading without shifting layout
    const languageHeading = footerSection.querySelector('h4');
    const anchorTop = languageHeading ? languageHeading.offsetTop : 0;
    // Place slightly above the heading
    messageElement.style.top = Math.max(0, anchorTop - 26) + 'px';
    messageElement.style.left = '0';
    messageElement.style.right = '0';
    messageElement.style.display = 'block';
    
    // Auto-hide after 3 seconds
    languageMessageTimeout = setTimeout(() => {
        hideLanguageMessage();
    }, 3000);
}

function hideLanguageMessage() {
    const languageSelect = document.getElementById('languageSelect');
    const footerSection = languageSelect ? languageSelect.closest('.footer-section') : null;
    
    if (footerSection) {
        const messageElement = footerSection.querySelector('.language-coming-soon-popup');
        if (messageElement) {
            messageElement.style.display = 'none';
        }
    }
    
    if (languageMessageTimeout) {
        clearTimeout(languageMessageTimeout);
        languageMessageTimeout = null;
    }
}

// Scroll handler for header - Cross-browser compatible
function initializeScrollHandler() {
    if (!header) return;
    
    // Cross-browser scroll position detection
    function getScrollY() {
        return window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    }
    
    let lastScrollY = getScrollY();
    let ticking = false;
    
    function updateHeader() {
        const currentScrollY = getScrollY();
        
        if (currentScrollY > lastScrollY && currentScrollY > 100) {
            if (header && header.classList) {
                header.classList.add('hidden');
            }
        } else {
            if (header && header.classList) {
                header.classList.remove('hidden');
            }
        }
        
        lastScrollY = currentScrollY;
        ticking = false;
    }
    
    function requestTick() {
        if (!ticking) {
            // Use requestAnimationFrame with fallback
            if (window.requestAnimationFrame) {
                window.requestAnimationFrame(updateHeader);
            } else {
                // Fallback for older browsers
                setTimeout(updateHeader, 16);
            }
            ticking = true;
        }
    }
    
    // Cross-browser scroll event
    if (window.addEventListener) {
        window.addEventListener('scroll', requestTick, { passive: true });
    } else if (window.attachEvent) {
        window.attachEvent('onscroll', requestTick);
    }
}

// Service worker registration - Cross-browser compatible
function initializeServiceWorker() {
    // Check if service worker is supported
    if ('serviceWorker' in navigator) {
        // Wait for page to fully load before registering SW
        if (window.addEventListener) {
            window.addEventListener('load', function() {
                try {
                    navigator.serviceWorker.register('/sw.js')
                        .then(function(registration) {
                            console.log('SW registered: ', registration);
                        })
                        .catch(function(registrationError) {
                            console.log('SW registration failed: ', registrationError);
                            // Silently fail - SW is optional
                        });
                } catch (e) {
                    console.log('SW registration error: ', e);
                }
            });
        }
    }
}

// File source dropdown - Cross-browser compatible with null checks
function toggleFileSourceDropdown(e) {
    if (!e || !fileSourceDropdown) return;
    if (e.stopPropagation) {
        e.stopPropagation();
    } else if (e.cancelBubble !== undefined) {
        e.cancelBubble = true; // IE fallback
    }
    if (fileSourceDropdown.classList) {
        fileSourceDropdown.classList.toggle('show');
    } else {
        // IE fallback
        const classes = fileSourceDropdown.className.split(' ');
        if (classes.indexOf('show') > -1) {
            fileSourceDropdown.className = classes.filter(c => c !== 'show').join(' ');
        } else {
            fileSourceDropdown.className += ' show';
        }
    }
}

function closeDropdownsOnOutsideClick(e) {
    if (!e || !e.target) return;
    
    // Close file source dropdown
    if (selectFilesBtn && fileSourceDropdown) {
        if (!selectFilesBtn.contains(e.target) && !fileSourceDropdown.contains(e.target)) {
            if (fileSourceDropdown.classList) {
                fileSourceDropdown.classList.remove('show');
            } else {
                // IE fallback
                fileSourceDropdown.className = fileSourceDropdown.className.replace('show', '').trim();
            }
        }
    }
    
    // Close format dropdown
    if (formatBtn && formatOptions) {
        if (!formatBtn.contains(e.target) && !formatOptions.contains(e.target)) {
            if (formatOptions.classList) {
                formatOptions.classList.remove('show');
            } else {
                // IE fallback
                formatOptions.className = formatOptions.className.replace('show', '').trim();
            }
        }
    }
}

// File source selection
function handleFileSourceSelection(e) {
    const source = e.currentTarget.dataset.source;
    fileSourceDropdown.classList.remove('show');
    
    switch (source) {
        case 'device':
            fileInput.click();
            break;
        case 'url':
            showUrlModal();
            break;
        case 'google-drive':
        case 'onedrive':
        case 'dropbox':
            // Cloud storage integration coming soon!
            break;
    }
}

// Format dropdown
function toggleFormatDropdown(e) {
    e.stopPropagation();
    formatOptions.classList.toggle('show');
}

function handleFormatSelection(e) {
    selectedFormat = e.currentTarget.dataset.format;
    document.getElementById('selectedFormat').textContent = selectedFormat;
    
    // Update selected state
    document.querySelectorAll('.format-option').forEach(option => {
        option.classList.remove('selected');
    });
    e.currentTarget.classList.add('selected');
    
    formatOptions.classList.remove('show');
}

// File handling
// File selection handler - Cross-browser compatible
function handleFileSelection(e) {
    if (!e || !e.target || !e.target.files) return;
    try {
        let files;
        // Cross-browser file array conversion
        if (Array.from) {
            files = Array.from(e.target.files);
        } else {
            // IE fallback
            files = [];
            for (let i = 0; i < e.target.files.length; i++) {
                files.push(e.target.files[i]);
            }
        }
        
        if (files.length > 0 && typeof processFiles === 'function') {
            processFiles(files);
        }
    } catch (err) {
        console.error('Error in handleFileSelection:', err);
        if (typeof showError === 'function') {
            showError('Error selecting files. Please try again.');
        }
    }
}

// Drag and drop handlers - Cross-browser compatible with error handling
function handleDragOver(e) {
    if (!e || !uploadBox) return;
    try {
        e.preventDefault();
        e.stopPropagation();
        if (uploadBox.classList) {
            uploadBox.classList.add('dragover');
        } else {
            // IE fallback
            uploadBox.className += ' dragover';
        }
    } catch (err) {
        console.error('Error in handleDragOver:', err);
    }
}

function handleDragLeave(e) {
    if (!e || !uploadBox) return;
    try {
        e.preventDefault();
        e.stopPropagation();
        if (uploadBox.classList) {
            uploadBox.classList.remove('dragover');
        } else {
            // IE fallback
            uploadBox.className = uploadBox.className.replace('dragover', '').trim();
        }
    } catch (err) {
        console.error('Error in handleDragLeave:', err);
    }
}

function handleDrop(e) {
    if (!e || !uploadBox) return;
    try {
        e.preventDefault();
        e.stopPropagation();
        
        if (uploadBox.classList) {
            uploadBox.classList.remove('dragover');
        } else {
            // IE fallback
            uploadBox.className = uploadBox.className.replace('dragover', '').trim();
        }
        
        // Get files from dataTransfer
        if (!e.dataTransfer || !e.dataTransfer.files) {
            console.error('No files in drop event');
            return;
        }
        
        // Cross-browser file array conversion
        const files = e.dataTransfer.files;
        let fileArray;
        if (Array.from) {
            fileArray = Array.from(files);
        } else {
            // IE fallback
            fileArray = [];
            for (let i = 0; i < files.length; i++) {
                fileArray.push(files[i]);
            }
        }
        
        if (fileArray.length > 0 && typeof processFiles === 'function') {
            processFiles(fileArray);
        }
    } catch (err) {
        console.error('Error in handleDrop:', err);
        if (typeof showError === 'function') {
            showError('Error dropping files. Please try selecting files instead.');
        }
    }
}

function handleUploadBoxClick(e) {
    // Don't trigger if clicking on the button or dropdown
    if (e.target.closest('.select-files-btn') || e.target.closest('.file-source-dropdown')) {
        return;
    }
    
    // Open file manager directly
    fileInput.click();
}

// Lightweight file validation
function validateFile(file) {
    const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
    
    if (file.size > maxSize) {
        throw new Error(`File "${file.name}" is too large. Maximum size: 2GB`);
    }
    
    const ext = file.name.split('.').pop().toLowerCase();
    if (!SUPPORTED_INPUT_FORMATS.includes(ext)) {
        throw new Error(`Unsupported file. Supported inputs: ${SUPPORTED_INPUT_FORMATS.join(', ')}`);
    }
    
    return true;
}

async function processFiles(files) {
    // Allow image selection - limit check only on convert button click
    // No limit check here - let images be selected
    
    const validFiles = [];
    const errors = [];
    
    // Track file upload attempt
    trackEvent('file_upload_attempt', {
        file_count: files.length,
        event_category: 'engagement'
    });
    
    files.forEach(file => {
        try {
            validateFile(file);
            validFiles.push(file);
        } catch (error) {
            errors.push(error.message);
        }
    });
    
    // Show errors
    if (errors.length > 0) {
        const errorMsg = errors.length === 1 ? errors[0] : `${errors.length} files have errors. First: ${errors[0]}`;
        showError(errorMsg);
    }
    
    if (validFiles.length === 0) return;
    
    // Clear old files if there are converted files or if download was completed
    console.log('Processing new files - convertedFiles length:', convertedFiles.length, 'isDownloaded:', isDownloaded);
    if (convertedFiles.length > 0 || isDownloaded) {
        console.log('Clearing old files before adding new ones');
        clearAllFiles();
    }
    
    // Add valid files to state
    validFiles.forEach(file => {
        const fileId = generateFileId();
        const fileObj = {
            id: fileId,
            file: file,
            name: file.name,
            size: file.size,
            type: file.type,
            preview: URL.createObjectURL(file)
        };
        
        uploadedFiles.push(fileObj);
    });
    
    updateFileList();
    updateUI();
    
    const successMessage = validFiles.length === 1 ? 'File added successfully' : `${validFiles.length} files added successfully`;
    // Success: ${successMessage}
}

function generateFileId() {
    return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function clearAllFiles() {
    console.log('Clearing all files - convertedFiles length:', convertedFiles.length, 'isDownloaded:', isDownloaded);
    
    // Clear all file arrays
    uploadedFiles = [];
    convertedFiles = [];
    
    // Reset states
    isConverting = false;
    isDownloaded = false;
    
    // Clear UI elements
    fileListContainer.innerHTML = '';
    fileListContainer.classList.remove('show');
    
    // Reset convert button
    convertBtn.style.display = 'none';
    convertBtn.classList.remove('download');
    convertBtn.querySelector('.btn-text').textContent = 'Convert';
    convertBtn.querySelector('.btn-text').style.display = 'block';
    convertBtn.querySelector('.btn-loading').style.display = 'none';
    
    // Reset onclick handler (remove any custom handler)
    convertBtn.onclick = null;
    
    // Hide output settings
    outputSettings.classList.remove('show');
    
    // Hide progress bar
    progressContainer.style.display = 'none';
    
    // Clear file input
    fileInput.value = '';
}

function updateFileList() {
    fileListContainer.innerHTML = '';
    
    uploadedFiles.forEach(fileObj => {
        const fileItem = createFileItem(fileObj);
        fileListContainer.appendChild(fileItem);
    });
    
    fileListContainer.classList.add('show');
}

function createFileItem(fileObj) {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.dataset.fileId = fileObj.id;
    
    fileItem.innerHTML = `
        <img src="/icons/image-icon.svg" alt="${fileObj.name}" class="file-preview">
        <div class="file-info">
            <div class="file-name">${fileObj.name}</div>
            <div class="file-size">${formatFileSize(fileObj.size)}</div>
        </div>
        <div class="file-actions">
            <button class="file-action-btn settings" title="Settings">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"></path>
                </svg>
            </button>
            <button class="file-action-btn delete" title="Remove">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
    `;
    
    // Add event listeners
    const deleteBtn = fileItem.querySelector('.delete');
    deleteBtn.addEventListener('click', () => removeFile(fileObj.id));
    
    const settingsBtn = fileItem.querySelector('.settings');
    settingsBtn.addEventListener('click', () => showFileSettings(fileObj.id));
    
    return fileItem;
}

function removeFile(fileId) {
    const fileIndex = uploadedFiles.findIndex(f => f.id === fileId);
    if (fileIndex !== -1) {
        // Revoke object URL to free memory
        URL.revokeObjectURL(uploadedFiles[fileIndex].preview);
        uploadedFiles.splice(fileIndex, 1);
        
        updateFileList();
        updateUI();
        
        if (uploadedFiles.length === 0) {
            fileListContainer.classList.remove('show');
        }
    }
}

function showFileSettings(fileId) {
    // File settings coming soon!
}

function updateUI() {
    const hasFiles = uploadedFiles.length > 0;
    const isFirstSelection = hasFiles && uploadedFiles.length === 1;
    
    outputSettings.classList.toggle('show', hasFiles);
    convertBtn.style.display = hasFiles ? 'block' : 'none';
    convertBtn.disabled = !hasFiles || isConverting;
    
    if (hasFiles) {
        convertBtn.querySelector('.btn-text').textContent = 'Convert';
        convertBtn.classList.remove('download');
        
        // Smooth scroll to convert button only on first selection
        if (isFirstSelection) {
            setTimeout(() => {
                // Get button position and scroll just enough to show it
                const buttonRect = convertBtn.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                
                // If button is below viewport, scroll just enough to show it
                if (buttonRect.bottom > viewportHeight) {
                    const scrollAmount = buttonRect.bottom - viewportHeight + 50; // 50px padding
                    
                    window.scrollBy({
                        top: scrollAmount,
                        behavior: 'smooth'
                    });
                }
            }, 200); // Slightly longer delay for smoother effect
        }
    }
}

// URL modal
function showUrlModal() {
    urlModal.classList.add('show');
    urlInput.focus();
}

function closeUrlModal() {
    urlModal.classList.remove('show');
    urlInput.value = '';
}

function handleModalBackdropClick(e) {
    if (e.target === urlModal) {
        closeUrlModal();
    }
}

function handleUrlSubmit() {
    const url = urlInput.value.trim();
    
        if (!url) {
            showError('Please enter a valid URL');
            return;
        }
        
        if (!isValidImageUrl(url)) {
            showError('Please enter a valid image URL');
            return;
        }
    
    urlSubmit.disabled = true;
    urlSubmit.textContent = 'Uploading...';
    
    uploadFromUrl(url)
        .then(fileObj => {
            uploadedFiles.push(fileObj);
            updateFileList();
            updateUI();
            closeUrlModal();
            // File uploaded successfully
            hideError(); // Hide error on success
        })
        .catch(error => {
            // Show error message
            if (error.message && error.message.includes('limit')) {
                showError(error.message);
            } else {
                showError(error.message || 'Upload failed. Please try again.');
            }
        })
        .finally(() => {
            urlSubmit.disabled = false;
            urlSubmit.textContent = 'Upload from URL';
        });
}

function isValidImageUrl(url) {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname.toLowerCase();
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.tiff', '.ico'];
        return imageExtensions.some(ext => pathname.endsWith(ext));
    } catch {
        return false;
    }
}

async function uploadFromUrl(url) {
    try {
        // Check limit before uploading from URL
        if (await isDailyLimitReached()) {
            throw new Error('Daily limit reached (2GB). Please try again tomorrow.');
        }
        const response = await fetch('/api/upload/url', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url })
        });
        
        if (!response.ok) {
            if (response.status === 429) {
                throw new Error('Daily limit reached (2GB). Please try again tomorrow.');
            }
            const error = await response.json();
            throw new Error(error.error || 'Upload failed');
        }
        
        const result = await response.json();
        
        return {
            id: result.id,
            name: result.originalName,
            size: 0, // Size not available from URL
            type: 'image/*',
            preview: result.url,
            publicId: result.publicId
        };
    } catch (error) {
        if (error.message && error.message.includes('limit')) {
            showError(error.message);
        }
        throw new Error(error.message || 'Failed to upload from URL');
    }
}

// Convert files
async function handleConvert() {
    if (isConverting || uploadedFiles.length === 0) return;
    
    // Hide any previous errors
    hideError();
    
    // Abort early if daily limit reached
    if (await isDailyLimitReached()) {
        showError('Daily limit reached (2GB). Please try again tomorrow.');
        // Reset button state
        convertBtn.disabled = false;
        convertBtn.querySelector('.btn-text').style.display = 'block';
        convertBtn.querySelector('.btn-loading').style.display = 'none';
        return;
    }
    
    // Track conversion start
    trackEvent('conversion_start', {
        file_count: uploadedFiles.length,
        output_format: selectedFormat,
        event_category: 'conversion'
    });
    
    isConverting = true;
    convertBtn.disabled = true;
    convertBtn.querySelector('.btn-text').style.display = 'none';
    convertBtn.querySelector('.btn-loading').style.display = 'flex';
    
    progressContainer.style.display = 'block';
    
    // Start time tracking
    const startTime = Date.now();
    
    try {
        const results = await convertFiles(startTime);
        convertedFiles = results; // Store converted files for clearing logic
        showResults(results);
        // Hide any errors on success
        hideError();
        // Conversion completed successfully!
    } catch (error) {
        // Show error message (red color)
        if (error.message && error.message.includes('limit')) {
            showError(error.message);
        } else {
            showError(error.message || 'Conversion failed. Please try again.');
        }
    } finally {
        isConverting = false;
        convertBtn.disabled = false;
        convertBtn.querySelector('.btn-text').style.display = 'block';
        convertBtn.querySelector('.btn-loading').style.display = 'none';
        
        // Show "Done" message before hiding
        updateProgress(100, 'Done!');
        setTimeout(() => {
            progressContainer.style.display = 'none';
        }, 1500);
    }
}

async function convertFiles(startTime) {
    const results = [];
    const totalFiles = uploadedFiles.length;
    
    for (let i = 0; i < uploadedFiles.length; i++) {
        const fileObj = uploadedFiles[i];
        
        // Start with 0% progress for this file
        let fileProgress = 0;
        const fileStartTime = Date.now();
        
        // Show initial progress
        updateProgress(fileProgress, `Finalizing ${Math.round(fileProgress)}...`);
        
        try {
            let result;
            
        // Start continuous progress animation
        let currentProgress = 0;
        let isProcessingComplete = false;
        const progressInterval = setInterval(() => {
            // Smoother increments, especially in 90s range
            let increment;
            if (currentProgress < 80) {
                increment = Math.random() * 2 + 1; // 1-3 points
            } else if (currentProgress < 90) {
                increment = Math.random() * 1.5 + 0.5; // 0.5-2 points
            } else if (currentProgress < 95) {
                increment = Math.random() * 0.8 + 0.2; // 0.2-1 points (smoother in 90s)
            } else {
                // 95-99 range: very small increments
                increment = Math.random() * 0.3 + 0.1; // 0.1-0.4 points
            }
            
            currentProgress += increment;
            
            // If processing is complete, go to 100, otherwise cap at 99
            if (isProcessingComplete) {
                if (currentProgress >= 100) {
                    currentProgress = 100;
                    clearInterval(progressInterval);
                }
            } else {
                if (currentProgress > 99) currentProgress = 99;
            }
            
            updateProgress(currentProgress, `Finalizing ${Math.round(currentProgress)}...`);
        }, 80); // Update every 80ms for smoother flow
        
        // Upload phase (0-40%)
        if (fileObj.file) {
            result = await uploadFile(fileObj.file);
        } else {
            // File already uploaded from URL
            result = {
                publicId: fileObj.publicId,
                originalName: fileObj.name
            };
        }
        
        // Convert phase (40-95%)
        const convertedUrl = await convertFile(result.publicId, selectedFormat);
        
        // Mark processing as complete to allow progress to reach 100
        isProcessingComplete = true;
            
            results.push({
                originalName: result.originalName,
                convertedUrl: convertedUrl,
                format: selectedFormat,
                publicId: result.publicId
            });
            
            // Wait for progress to reach 100 naturally
            await new Promise(resolve => setTimeout(resolve, 500));
            
        } catch (error) {
            console.error('Error converting file:', error);
            // Continue with other files
        }
    }
    
    // Final completion
    updateProgress(100, 'Done!');
    
    return results;
}

async function uploadFile(file) {
    // Check limit before uploading from device
    if (await isDailyLimitReached()) {
        throw new Error('Daily limit reached (2GB). Please try again tomorrow.');
    }
    const formData = new FormData();
    formData.append('files', file);
    
    const response = await fetch('/api/upload/device', {
        method: 'POST',
        body: formData
    });
    
        if (!response.ok) {
            if (response.status === 429) {
                const err = await response.json().catch(() => ({}));
                const limitError = err.message || 'Daily limit reached (2GB). Please try again tomorrow.';
                showError(limitError);
                throw new Error(limitError);
            }
            const error = await response.json();
            const errorMsg = error.error || 'Upload failed';
            showError(errorMsg);
            throw new Error(errorMsg);
        }
    
    const result = await response.json();
    
    // Handle partial success
    if (result.errors && result.errors.length > 0) {
        console.warn('Some files failed to upload:', result.errors);
    }
    
    return result.files[0];
}

async function convertFile(publicId, format) {
    const response = await fetch('/api/convert', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            files: [{ publicId, format: 'webp' }],
            targetFormat: format
        })
    });
    
    if (!response.ok) {
        if (response.status === 429) {
            const err = await response.json().catch(() => ({}));
            const limitError = err.message || 'Daily limit reached (2GB). Please try again tomorrow.';
            showError(limitError);
            throw new Error(limitError);
        }
        const error = await response.json();
        const errorMsg = error.error || 'Conversion failed';
        showError(errorMsg);
        throw new Error(errorMsg);
    }
    
    const result = await response.json();
    
    // Handle partial success
    if (result.errors && result.errors.length > 0) {
        console.warn('Some files failed to convert:', result.errors);
    }
    
    if (!result.convertedFiles || result.convertedFiles.length === 0) {
        throw new Error('No files were successfully converted');
    }
    
    return result.convertedFiles[0].convertedUrl;
}

function updateProgress(percentage, text) {
    const counterValue = Math.round(percentage);
    
    progressFill.style.width = `${percentage}%`;
    
    // Show real-time counter: "Finalizing 1...", "Finalizing 2...", etc.
    if (text && text.includes('Finalizing')) {
        progressText.textContent = `Finalizing ${counterValue}...`;
    } else {
        progressText.textContent = text || `${counterValue}%`;
    }
    
    // Keep same purple color throughout (no color change)
    progressContainer.classList.remove('done');
    progressFill.style.background = 'linear-gradient(90deg, rgba(124, 58, 237, 0.7), rgba(109, 40, 217, 0.7))';
}

function animateProgress(targetPercentage, text) {
    const currentPercentage = parseFloat(progressFill.style.width) || 0;
    const targetValue = Math.round(targetPercentage);
    const currentValue = Math.round(currentPercentage);
    
    // Animate progress from current to target with real-time counter
    const duration = 500; // 500ms animation
    const steps = Math.abs(targetValue - currentValue);
    const stepDuration = duration / Math.max(steps, 1);
    
    let currentStep = 0;
    const counter = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;
        const animatedValue = Math.round(currentValue + (targetValue - currentValue) * progress);
        
        progressFill.style.width = `${animatedValue}%`;
        
        // Show real-time counter: "Finalizing 1...", "Finalizing 2...", etc.
        if (text && text.includes('Finalizing')) {
            progressText.textContent = `Finalizing ${animatedValue}...`;
        } else {
            progressText.textContent = text || `${animatedValue}%`;
        }
        
        if (currentStep >= steps) {
            clearInterval(counter);
            progressFill.style.width = `${targetPercentage}%`;
            
            // Final counter display
            if (text && text.includes('Finalizing')) {
                progressText.textContent = `Finalizing ${targetValue}...`;
            } else {
                progressText.textContent = text || `${targetValue}%`;
            }
        }
    }, stepDuration);
}

function showResults(results) {
    console.log('showResults called with', results.length, 'results');
    
    // Update convert button text based on number of files
    if (results.length === 1) {
        convertBtn.querySelector('.btn-text').textContent = 'Download';
    } else {
        convertBtn.querySelector('.btn-text').textContent = 'Download All';
    }
    
    convertBtn.classList.add('download');
    convertBtn.onclick = () => downloadAllFiles(results);
}

async function downloadFiles(results) {
    try {
        console.log(`Starting download for ${results.length} file(s)`);
        
        // Track download start
        trackEvent('download_start', {
            file_count: results.length,
            download_type: results.length === 1 ? 'single_file' : 'zip_archive',
            event_category: 'conversion'
        });
        
        // Add click animation class
        convertBtn.classList.add('clicked');
        
        // Disable button during preparation and show loading spinner
        convertBtn.disabled = true;
        convertBtn.querySelector('.btn-text').style.display = 'none';
        convertBtn.querySelector('.btn-loading').style.display = 'flex';
        // Hide progress bar during download
        progressContainer.style.display = 'none';
        
        // Prepare files data for backend
        const files = results.map(result => ({
            publicId: result.publicId,
            format: result.format,
            originalName: result.originalName
        }));
        
        // Send download request to backend immediately
        const response = await fetch('/api/download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ files })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Download failed');
        }
        
        // Get the blob data
        const blob = await response.blob();
        
        if (!blob || blob.size === 0) {
            throw new Error('Downloaded file is empty');
        }
        
        // Get filename from Content-Disposition header (set by backend)
        let filename = 'converted_files.zip'; // Default fallback
        const contentDisposition = response.headers.get('content-disposition');
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
            if (filenameMatch) {
                filename = filenameMatch[1];
            }
        }
        
        console.log(`Downloading: ${filename} (${blob.size} bytes)`);
        
        // Create object URL from blob
        const blobUrl = URL.createObjectURL(blob);
        
        // Stop spinner NOW that the file is ready to download
        convertBtn.querySelector('.btn-loading').style.display = 'none';
        convertBtn.querySelector('.btn-text').style.display = 'block';
        convertBtn.disabled = false;

        // Create download link
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        link.style.display = 'none';
        
        // No extra timers; browser shows native download progress
        
        // Add to DOM, click, and remove immediately
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the blob URL quickly
        setTimeout(() => {
            URL.revokeObjectURL(blobUrl);
        }, 40);
        
        // Mark as downloaded for future file clearing
        isDownloaded = true;
        
        // Show success message briefly
        if (results.length === 1) {
            // Downloaded!
        } else {
            // ZIP downloaded!
        }
        
    } catch (error) {
        console.error('Download error:', error);
        // Download failed: ${error.message}
        
        // Reset button state on error (spinner will be hidden by 2-second timeout)
        convertBtn.disabled = false;
    } finally {
        // Remove click animation class
        convertBtn.classList.remove('clicked');
    }
}

async function downloadAllFiles(results) {
    try {
        // Hide any previous errors
        hideError();
        
        // Pre-check daily limit before starting ZIP job
        if (await isDailyLimitReached()) {
            showError('Daily limit reached (2GB). Please try again tomorrow.');
            convertBtn.disabled = false;
            convertBtn.querySelector('.btn-text').style.display = 'block';
            convertBtn.querySelector('.btn-loading').style.display = 'none';
            return;
        }
        if (results.length === 1) {
            // Single file: keep current logic for direct download
            await downloadFiles(results);
            return;
        }
        // -------- Advanced market-style ZIP job system --------
        // Prepare files for job API
        const files = results.map(({ publicId, format, originalName, convertedUrl }) => ({
            publicId, format, originalName, convertedUrl
        }));
        // 1. POST to create ZIP job
        // Show ONLY button spinner while preparing
        convertBtn.disabled = true;
        convertBtn.querySelector('.btn-text').style.display = 'none';
        convertBtn.querySelector('.btn-loading').style.display = 'flex';
        progressContainer.style.display = 'none';

        const resp = await fetch('/api/zip-job', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ files })
        });
        let outJson = { error: '', message: '' };
        try {
            outJson = await resp.json();
        } catch (e) {}
        if (!resp.ok) {
            // Special: Cloudinary/usage/daily limit error detection
            if ((outJson.error && outJson.error.includes('limit')) || (outJson.message && outJson.message.toLowerCase().includes('daily'))) {
                convertBtn.querySelector('.btn-loading').style.display = 'none';
                convertBtn.querySelector('.btn-text').style.display = 'block';
                convertBtn.disabled = false;
                showError(outJson.message || 'Daily limit reached (2GB). Please try again tomorrow.');
                return;
            }
            throw new Error(outJson.error || 'ZIP job create failed');
        }
        const { jobId } = outJson;
        if (!jobId) throw new Error('jobId missing');

        // 2. Poll for status (no in-site progress visuals)
        let jobReady = false, jobError = null, zipName = 'converted_files.zip';
        let pollCount = 0, maxPoll = 300, pollTimer;
        const pollZip = async () => {
            pollCount++;
            const sres = await fetch(`/api/zip-status?jobId=${encodeURIComponent(jobId)}`);
            let stat = { error: '', message: '' };
            try { stat = await sres.json(); } catch (e) {}
            if (!sres.ok) {
                // Usage/limit error mid-process
                if ((stat.error && stat.error.includes('limit')) || (stat.message && stat.message.toLowerCase().includes('daily'))) {
                    convertBtn.querySelector('.btn-loading').style.display = 'none';
                    convertBtn.querySelector('.btn-text').style.display = 'block';
                    convertBtn.disabled = false;
                    showError(stat.message || 'Daily limit reached (2GB). Please try again tomorrow.');
                    return;
                }
                throw new Error('Status poll failed');
            }
            if (stat.error) {
                if (stat.error.includes('limit') || (stat.message && stat.message.toLowerCase().includes('daily'))) {
                    convertBtn.querySelector('.btn-loading').style.display = 'none';
                    convertBtn.querySelector('.btn-text').style.display = 'block';
                    convertBtn.disabled = false;
                    showError(stat.message || 'Daily limit reached (2GB). Please try again tomorrow.');
                    return;
                }
                throw new Error('ZIP error: ' + stat.error);
            }
            if (stat.status === 'ready' && stat.ready) {
               jobReady = true; zipName = stat.zipName || zipName;
               // Stop spinner immediately, re-enable button
               convertBtn.querySelector('.btn-loading').style.display = 'none';
               convertBtn.querySelector('.btn-text').style.display = 'block';
               convertBtn.disabled = false;
               // Native browser download (progress shown by browser)
               await doMarketDownload(jobId, zipName);
               return;
            } else if (stat.status === 'error') {
               jobError = stat.error || 'ZIP preparation failed';
               throw new Error(jobError);
            } else {
               if (pollCount>maxPoll) throw new Error('ZIP job timed out');
               pollTimer = setTimeout(pollZip, 1000);
            }
        };
        await pollZip();
    } catch (error) {
        progressContainer.style.display = 'none';
        // Stop spinner and re-enable on error
        convertBtn.querySelector('.btn-loading').style.display = 'none';
        convertBtn.querySelector('.btn-text').style.display = 'block';
        convertBtn.disabled = false;
        if (error && error.message && error.message.toLowerCase().includes('limit')) {
            showError('Daily limit reached (2GB). Please try again tomorrow.');
            return;
        }
        showError(error.message || 'ZIP download failed');
    }
}

async function doMarketDownload(jobId, zipName) {
    // Trigger browser-native download -- ZIP progress bar!
    try {
        let url = `/api/zip-file?jobId=${encodeURIComponent(jobId)}`;
        // Use direct navigation for most reliable native progress UI
        window.location.assign(url);
        isDownloaded = true;
    } catch(err) {
        alert('Native ZIP download failed: ' + (err.message||''));
    }
}

// Error message display function
let errorTimeout = null;
let messageStartTime = null;
let messageVisible = false;
let lastScrollY = 0;

function showError(message) {
    if (!errorMessageContainer || !errorMessage) return;
    
    // Clear any existing timeouts
    if (errorTimeout) clearTimeout(errorTimeout);
    
    errorMessage.textContent = message;
    errorMessageContainer.style.display = 'block';
    errorMessageContainer.style.position = 'fixed';
    errorMessageContainer.style.top = '50px';
    messageVisible = true;
    messageStartTime = Date.now();
    
    // Scroll page to top to show message
    window.scrollTo({ top: 0, behavior: 'smooth' });
    lastScrollY = 0;
    
    // Adjust main content padding
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.style.paddingTop = '110px';
    }
    
    // Auto-hide after 5 seconds
    errorTimeout = setTimeout(() => {
        hideError();
    }, 5000);
}

function hideError() {
    if (errorMessageContainer) {
        errorMessageContainer.style.display = 'none';
        messageVisible = false;
        messageStartTime = null;
        
        // Reset main content padding
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.style.paddingTop = '';
        }
    }
    
    // Clear timeouts
    if (errorTimeout) {
        clearTimeout(errorTimeout);
        errorTimeout = null;
    }
}

// Scroll detection - hide/show message in header area
function handleScroll() {
    if (!errorMessageContainer || !messageVisible) {
        lastScrollY = window.scrollY;
        return;
    }
    
    const currentScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
    const elapsedTime = messageStartTime ? (Date.now() - messageStartTime) : 0;
    
    // Check if 5 seconds have passed
    if (elapsedTime >= 5000) {
        // 5 seconds passed - hide message completely
        hideError();
        return;
    }
    
    // If message is still within 5 seconds window
    if (elapsedTime < 5000) {
        // Always keep message fixed in header area (not moving to footer)
        errorMessageContainer.style.position = 'fixed';
        errorMessageContainer.style.top = '50px';
        errorMessageContainer.style.left = '0';
        errorMessageContainer.style.right = '0';
        
        // Hide message when user scrolls up (away from top)
        // Show message when user scrolls back down to top
        if (currentScrollY > 100) {
            // User scrolled up - hide message in header section
            errorMessageContainer.style.display = 'none';
        } else {
            // User is at or near top (within 100px) - show message
            errorMessageContainer.style.display = 'block';
        }
    }
    
    lastScrollY = currentScrollY;
}

// Initialize scroll listener after DOM is ready
function initializeScrollListener() {
    // Set initial scroll position
    lastScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
    
    // Add scroll event listener
    window.addEventListener('scroll', handleScroll, { passive: true });
}

// Call initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeScrollListener);
} else {
    initializeScrollListener();
}

// Utility functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Error handling
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    // An unexpected error occurred
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
    // An unexpected error occurred
});

// PWA install prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Show install button or banner
    showInstallPrompt();
});

function showInstallPrompt() {
    // You can add an install button to the UI here
    console.log('PWA install prompt available');
}

// Offline handling
window.addEventListener('online', () => {
    // Connection restored
});

window.addEventListener('offline', () => {
    // You are offline. Some features may not work.
});

// FAQ functionality
function initializeFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            
            // Close all other FAQ items
            faqItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                }
            });
            
            // Toggle current item
            if (isActive) {
                item.classList.remove('active');
            } else {
                item.classList.add('active');
            }
        });
    });
}
