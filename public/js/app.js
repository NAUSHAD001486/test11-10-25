// Google Analytics tracking functions - ES5 compatible
function trackEvent(eventName, parameters) {
    parameters = parameters || {};
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

// Global state - ES5 compatible for Safari
var uploadedFiles = [];
var convertedFiles = [];
var selectedFormat = 'PNG';
var isConverting = false;
var isDownloaded = false;

// Lightweight format validation - ES5 compatible
var SUPPORTED_INPUT_FORMATS = ['png', 'bmp', 'eps', 'gif', 'ico', 'jpeg', 'jpg', 'odd', 'svg', 'psd', 'tga', 'tiff', 'webp'];
var SUPPORTED_OUTPUT_FORMATS = ['PNG', 'BMP', 'EPS', 'GIF', 'ICO', 'JPEG', 'JPG', 'ODD', 'SVG', 'PSD', 'TGA', 'TIFF', 'WebP'];

// DOM elements - Initialize safely to prevent Safari crashes - ES5 compatible
var header, uploadBox, selectFilesBtn, fileSourceDropdown, fileListContainer;
var outputSettings, formatBtn, formatOptions, convertBtn;
var progressContainer, progressFill, progressText;
var errorMessageContainer, errorMessage;
var fileInput, urlModal, urlInput, urlSubmit, modalClose;

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

// Initialize app - Cross-browser and mobile compatible with Safari fixes
domReady(function() {
    try {
        // Safari requires longer delay for DOM to be fully ready
        var safariDelay = (navigator.userAgent.indexOf('Safari') > -1 && navigator.userAgent.indexOf('Chrome') === -1) ? 200 : 50;
        
        setTimeout(function() {
            // Initialize DOM elements first
            if (!initializeDOMElements()) {
                console.error('Failed to initialize DOM elements');
                // Retry multiple times for Safari
                var retryCount = 0;
                var maxRetries = 5;
                
                var retryInit = function() {
                    retryCount++;
                    if (retryCount <= maxRetries) {
                        if (!initializeDOMElements()) {
                            setTimeout(retryInit, 100);
                            return;
                        }
                        initializeAppFeatures();
                    } else {
                        console.error('Critical DOM elements still not found after retries');
                        // Try to initialize with what we have anyway
                        initializeAppFeatures();
                    }
                };
                
                setTimeout(retryInit, 100);
                return;
            }
            initializeAppFeatures();
        }, safariDelay);
    } catch (error) {
        console.error('Error initializing app:', error);
        // Show user-friendly error message
        if (typeof alert !== 'undefined') {
            alert('An error occurred while loading the page. Please refresh.');
        }
        // Safari fallback - try initialization anyway
        setTimeout(function() {
            try {
                if (typeof initializeDOMElements === 'function') {
                    initializeDOMElements();
                }
                if (typeof initializeAppFeatures === 'function') {
                    initializeAppFeatures();
                }
            } catch (e) {
                console.error('Fallback initialization failed:', e);
            }
        }, 300);
    }
});

// Separate function for initializing app features - Safari compatible
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
        var languageSelect = document.getElementById('languageSelect');
        if (languageSelect && typeof handleLanguageChange === 'function') {
            languageSelect.addEventListener('change', handleLanguageChange);
            
            // Mobile optimization: compact listbox with 6 visible options and scroll
            function isMobileDevice() {
                return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            }
            
            if (isMobileDevice()) {
                // Set size=6 to show compact scrollable listbox (6 languages visible, rest scroll)
                languageSelect.setAttribute('size', '6');
                // Ensure compact display
                languageSelect.style.maxWidth = window.innerWidth <= 480 ? '110px' : '120px';
            }
        }
        
        // Mobile touch events support
        if (typeof initializeMobileSupport === 'function') {
            initializeMobileSupport();
        }
    } catch (error) {
        console.error('Error initializing app features:', error);
        // Safari fallback - retry initialization
        if (typeof window.setTimeout === 'function') {
            setTimeout(function() {
                try {
                    if (typeof initializeEventListeners === 'function') {
                        initializeEventListeners();
                    }
                } catch (e) {
                    console.error('Retry initialization failed:', e);
                }
            }, 200);
        }
    }
}

// Mobile touch support for better mobile compatibility - ES5 compatible
function initializeMobileSupport() {
    // Add touch event support for mobile devices
    if (('ontouchstart' in window) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0)) {
        // Mobile device detected - add touch optimizations
        
        // Prevent zoom on double tap for better mobile UX
        var lastTouchEnd = 0;
        if (document.addEventListener) {
            document.addEventListener('touchend', function(e) {
                var now = Date.now();
                if (now - lastTouchEnd <= 300 && e.preventDefault) {
                    e.preventDefault();
                }
                lastTouchEnd = now;
            }, false);
        }
        
        // Improve touch target sizes for mobile - ES5 compatible
        var buttons = document.querySelectorAll('button, .dropdown-item, .format-option');
        for (var i = 0; i < buttons.length; i++) {
            var button = buttons[i];
            if (button && button.style) {
                // Ensure minimum touch target size (44x44px recommended by Apple)
                var minSize = '44px';
                if (!button.style.minHeight) {
                    button.style.minHeight = minSize;
                }
                if (!button.style.minWidth) {
                    button.style.minWidth = minSize;
                }
            }
        }
    }
}

// Daily limit check - Cross-browser compatible with Promise chains (no async/await)
function isDailyLimitReached() {
    try {
        // Use fetch with fallback for older browsers
        if (typeof fetch !== 'undefined') {
            // Use Promise chain instead of async/await for better compatibility
            return fetch('/api/usage', { cache: 'no-store' })
                .then(function(res) {
                    if (!res || !res.ok) return false;
                    return res.json();
                })
                .then(function(data) {
                    var pct = Number(data.percentage || 0);
        return pct >= 100;
                })
                .catch(function(e) {
                    console.error('Error checking daily limit:', e);
        return false;
                });
        } else {
            // Fallback using XMLHttpRequest for older browsers
            return new Promise(function(resolve) {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', '/api/usage', true);
                xhr.onreadystatechange = function() {
                    if (xhr.readyState === 4) {
                        if (xhr.status === 200) {
                            try {
                                var data = JSON.parse(xhr.responseText);
                                var pct = Number(data.percentage || 0);
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
    } catch (e) {
        console.error('Error checking daily limit:', e);
        return Promise.resolve(false);
    }
}

// Event listeners - Safely initialize with null checks for Safari
function initializeEventListeners() {
    // File source dropdown
    if (selectFilesBtn && fileSourceDropdown) {
    selectFilesBtn.addEventListener('click', toggleFileSourceDropdown);
    document.addEventListener('click', closeDropdownsOnOutsideClick);
    
    // File source options
        var dropdownItems = document.querySelectorAll('.dropdown-item');
        for (var i = 0; i < dropdownItems.length; i++) {
            dropdownItems[i].addEventListener('click', handleFileSourceSelection);
        }
    }
    
    // Format dropdown
    if (formatBtn && formatOptions) {
    formatBtn.addEventListener('click', toggleFormatDropdown);
        // Get all format option elements
        var formatOptionElements = document.querySelectorAll('.format-option');
        for (var i = 0; i < formatOptionElements.length; i++) {
            formatOptionElements[i].addEventListener('click', handleFormatSelection);
        }
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
    var toasts = document.querySelectorAll('.toast');
    for (var i = 0; i < toasts.length; i++) {
        (function(toast) {
            toast.addEventListener('click', function() {
                if (typeof hideToast === 'function') {
                    hideToast(toast);
                }
            });
        })(toasts[i]);
    }
    
    // Language selector - Moved to DOMContentLoaded to prevent Safari issues
    // Initialization is now in DOMContentLoaded handler
}

// Language selection handler - ES5 compatible for Safari
function handleLanguageChange(e) {
    var selectedLanguage = e.target.value;
    
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

var languageMessageTimeout = null;

// Show "Coming Soon" message for language selection in footer - ES5 compatible
function showLanguageComingSoon() {
    // Find the language selector element and footer section
    var languageSelect = document.getElementById('languageSelect');
    var footerSection = null;
    
    // Safari compatible closest() fallback
    if (languageSelect) {
        if (languageSelect.closest) {
            footerSection = languageSelect.closest('.footer-section');
        } else {
            // Fallback for browsers without closest()
            var parent = languageSelect.parentElement;
            while (parent && parent !== document.body) {
                if (parent.className && parent.className.indexOf('footer-section') > -1) {
                    footerSection = parent;
                    break;
                }
                parent = parent.parentElement;
            }
        }
    }
    
    if (!languageSelect || !footerSection) return;
    
    // Clear any existing timeout
    if (languageMessageTimeout) {
        clearTimeout(languageMessageTimeout);
    }
    
    // Ensure footer section is positioning context
    var computedStyle = window.getComputedStyle ? window.getComputedStyle(footerSection) : footerSection.currentStyle;
    if (computedStyle && computedStyle.position === 'static') {
        footerSection.style.position = 'relative';
    }

    // Popup element (overlay) — does not affect layout
    var messageElement = footerSection.querySelector('.language-coming-soon-popup');
    if (!messageElement) {
        messageElement = document.createElement('div');
        messageElement.className = 'language-coming-soon-popup';
        messageElement.textContent = 'Coming Soon';
        footerSection.appendChild(messageElement);
    }

    // Anchor popup just above the language selector box heading without shifting layout
    var languageHeading = footerSection.querySelector('h4');
    var anchorTop = languageHeading && languageHeading.offsetTop ? languageHeading.offsetTop : 0;
    // Place slightly above the heading
    messageElement.style.top = Math.max(0, anchorTop - 26) + 'px';
    messageElement.style.left = '0';
    messageElement.style.right = '0';
    messageElement.style.display = 'block';
    
    // Auto-hide after 3 seconds - ES5 compatible
    languageMessageTimeout = setTimeout(function() {
        hideLanguageMessage();
    }, 3000);
}

function hideLanguageMessage() {
    var languageSelect = document.getElementById('languageSelect');
    var footerSection = null;
    
    // Safari compatible closest() fallback
    if (languageSelect) {
        if (languageSelect.closest) {
            footerSection = languageSelect.closest('.footer-section');
        } else {
            // Fallback for browsers without closest()
            var parent = languageSelect.parentElement;
            while (parent && parent !== document.body) {
                if (parent.className && parent.className.indexOf('footer-section') > -1) {
                    footerSection = parent;
                    break;
                }
                parent = parent.parentElement;
            }
        }
    }
    
    if (footerSection) {
        var messageElement = footerSection.querySelector('.language-coming-soon-popup');
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
    
    var lastScrollY = getScrollY();
    var ticking = false;
    
    function updateHeader() {
        var currentScrollY = getScrollY();
        
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
    
    // Cross-browser scroll event - Safari compatible
    if (window.addEventListener) {
        // Safari compatible event listener (some versions don't support options)
        try {
            window.addEventListener('scroll', requestTick, { passive: true });
        } catch (e) {
            // Fallback for browsers that don't support options
    window.addEventListener('scroll', requestTick);
        }
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
        // IE fallback - ES5 compatible
        var classes = fileSourceDropdown.className.split(' ');
        var filteredClasses = [];
        for (var i = 0; i < classes.length; i++) {
            if (classes[i] !== 'show') {
                filteredClasses.push(classes[i]);
            }
        }
        if (classes.indexOf('show') > -1) {
            fileSourceDropdown.className = filteredClasses.join(' ');
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

// File source selection - ES5 compatible for Safari
function handleFileSourceSelection(e) {
    var source = null;
    // Safari compatible dataset access
    if (e.currentTarget && e.currentTarget.dataset) {
        source = e.currentTarget.dataset.source;
    } else if (e.currentTarget && e.currentTarget.getAttribute) {
        source = e.currentTarget.getAttribute('data-source');
    }
    if (fileSourceDropdown && fileSourceDropdown.classList) {
    fileSourceDropdown.classList.remove('show');
    }
    
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

// Format dropdown - Safari compatible
function toggleFormatDropdown(e) {
    if (!e || !formatOptions) return;
    
    if (e.stopPropagation) {
    e.stopPropagation();
    } else if (e.cancelBubble !== undefined) {
        e.cancelBubble = true; // IE fallback
    }
    
    if (formatOptions.classList) {
    formatOptions.classList.toggle('show');
    } else {
        // IE fallback
        var hasShow = formatOptions.className.indexOf('show') > -1;
        if (hasShow) {
            formatOptions.className = formatOptions.className.replace('show', '').trim();
        } else {
            formatOptions.className += ' show';
        }
    }
}

function handleFormatSelection(e) {
    if (!e || !e.currentTarget) return;
    
    // Stop event propagation
    if (e.stopPropagation) {
        e.stopPropagation();
    } else if (e.cancelBubble !== undefined) {
        e.cancelBubble = true; // IE fallback
    }
    
    // Safari compatible dataset access
    var newFormat = null;
    if (e.currentTarget && e.currentTarget.dataset) {
        newFormat = e.currentTarget.dataset.format;
    } else if (e.currentTarget && e.currentTarget.getAttribute) {
        newFormat = e.currentTarget.getAttribute('data-format');
    }
    
    if (!newFormat) return;
    
    selectedFormat = newFormat;
    
    var selectedFormatElement = document.getElementById('selectedFormat');
    if (selectedFormatElement) {
        selectedFormatElement.textContent = selectedFormat;
    }
    
    // Update selected state - ES5 compatible
    var formatOptionsList = document.querySelectorAll('.format-option');
    for (var i = 0; i < formatOptionsList.length; i++) {
        if (formatOptionsList[i].classList) {
            formatOptionsList[i].classList.remove('selected');
        } else {
            // IE fallback
            formatOptionsList[i].className = formatOptionsList[i].className.replace('selected', '').trim();
        }
    }
    
    if (e.currentTarget && e.currentTarget.classList) {
    e.currentTarget.classList.add('selected');
    } else if (e.currentTarget) {
        // IE fallback
        e.currentTarget.className += ' selected';
    }
    
    // Close dropdown after selection
    if (formatOptions && formatOptions.classList) {
    formatOptions.classList.remove('show');
    } else if (formatOptions) {
        // IE fallback
        formatOptions.className = formatOptions.className.replace('show', '').trim();
    }
}

// File handling
// File selection handler - Cross-browser compatible
function handleFileSelection(e) {
    if (!e || !e.target || !e.target.files) return;
    try {
        var files;
        // Cross-browser file array conversion - ES5 compatible
        if (Array.from) {
            files = Array.from(e.target.files);
        } else {
            // IE/Safari fallback
            files = [];
            for (var i = 0; i < e.target.files.length; i++) {
                files.push(e.target.files[i]);
            }
        }
        
        if (files.length > 0 && typeof processFiles === 'function') {
    processFiles(files);
            // Reset file input to allow re-selecting the same file
            if (fileInput) {
                fileInput.value = '';
            }
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
        
        // Cross-browser file array conversion - ES5 compatible
        var files = e.dataTransfer.files;
        var fileArray;
        if (Array.from) {
            fileArray = Array.from(files);
        } else {
            // IE/Safari fallback
            fileArray = [];
            for (var i = 0; i < files.length; i++) {
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
    // Don't trigger if clicking on the button or dropdown - Safari compatible
    var target = e.target;
    var isButton = false;
    var isDropdown = false;
    
    // Safari compatible closest() fallback
    if (target.closest) {
        isButton = target.closest('.select-files-btn');
        isDropdown = target.closest('.file-source-dropdown');
    } else {
        // Fallback for browsers without closest()
        var parent = target.parentElement;
        while (parent && parent !== document.body) {
            if (parent.className) {
                if (parent.className.indexOf('select-files-btn') > -1) {
                    isButton = true;
                }
                if (parent.className.indexOf('file-source-dropdown') > -1) {
                    isDropdown = true;
                }
            }
            parent = parent.parentElement;
        }
    }
    
    if (isButton || isDropdown) {
        return;
    }
    
    // Open file manager directly
    if (fileInput) {
    fileInput.click();
    }
}

// Lightweight file validation - ES5 compatible for Safari
function validateFile(file) {
    var maxSize = 2 * 1024 * 1024 * 1024; // 2GB
    
    if (file.size > maxSize) {
        throw new Error('File "' + file.name + '" is too large. Maximum size: 2GB');
    }
    
    var nameParts = file.name.split('.');
    var ext = nameParts.length > 1 ? nameParts[nameParts.length - 1].toLowerCase() : '';
    
    // ES5 compatible includes() fallback
    var isSupported = false;
    for (var i = 0; i < SUPPORTED_INPUT_FORMATS.length; i++) {
        if (SUPPORTED_INPUT_FORMATS[i] === ext) {
            isSupported = true;
            break;
        }
    }
    
    if (!isSupported) {
        throw new Error('Unsupported file. Supported inputs: ' + SUPPORTED_INPUT_FORMATS.join(', '));
    }
    
    return true;
}

function processFiles(files) {
    // Allow image selection - limit check only on convert button click
    // No limit check here - let images be selected
    
    var validFiles = [];
    var errors = [];
    
    // Track file upload attempt
    if (typeof trackEvent === 'function') {
    trackEvent('file_upload_attempt', {
        file_count: files.length,
        event_category: 'engagement'
    });
    }
    
    // ES5 compatible loop
    for (var i = 0; i < files.length; i++) {
        try {
            validateFile(files[i]);
            validFiles.push(files[i]);
        } catch (error) {
            errors.push(error.message || 'Invalid file');
        }
    }
    
    // Show errors
    if (errors.length > 0) {
        var errorMsg;
        if (errors.length === 1) {
            errorMsg = errors[0];
        } else {
            errorMsg = errors.length + ' files have errors. First: ' + errors[0];
        }
        if (typeof showError === 'function') {
            showError(errorMsg);
        }
    }
    
    if (validFiles.length === 0) return;
    
    // Clear old files if there are converted files or if download was completed
    console.log('Processing new files - convertedFiles length:', convertedFiles.length, 'isDownloaded:', isDownloaded);
    if (convertedFiles.length > 0 || isDownloaded) {
        console.log('Clearing old files before adding new ones');
        clearAllFiles();
    }
    
    // Add valid files to state
    // ES5 compatible loop
    for (var i = 0; i < validFiles.length; i++) {
        var file = validFiles[i];
        var fileId = generateFileId();
        var fileObj = {
            id: fileId,
            file: file,
            name: file.name,
            size: file.size,
            type: file.type,
            preview: URL.createObjectURL(file)
        };
        
        uploadedFiles.push(fileObj);
    }
    
    updateFileList();
    updateUI();
    
    var successMessage;
    if (validFiles.length === 1) {
        successMessage = 'File added successfully';
    } else {
        successMessage = validFiles.length + ' files added successfully';
    }
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
    if (!fileListContainer) return;
    fileListContainer.innerHTML = '';
    
    // ES5 compatible loop
    for (var i = 0; i < uploadedFiles.length; i++) {
        var fileObj = uploadedFiles[i];
        var fileItem = createFileItem(fileObj);
        if (fileItem && fileListContainer.appendChild) {
        fileListContainer.appendChild(fileItem);
        }
    }
    
    fileListContainer.classList.add('show');
}

// Helper function to truncate filename intelligently (preserve start + last 4 chars + extension)
// Mobile: 15 chars + "..." + last 4 chars of name + extension
// Desktop/Laptop/PC: 30 chars + "..." + last 4 chars of name + extension
function truncateFileName(filename) {
    // Detect mobile device
    var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Extract extension
    var lastDotIndex = filename.lastIndexOf('.');
    var extension = '';
    var nameWithoutExt = filename;
    
    if (lastDotIndex > 0 && lastDotIndex < filename.length - 1) {
        extension = filename.substring(lastDotIndex); // Include the dot
        nameWithoutExt = filename.substring(0, lastDotIndex);
    }
    
    // Mobile: 15 chars for start + 3 for "..." + 4 for last chars + extension
    // Desktop/Laptop/PC: 30 chars for start + 3 for "..." + 4 for last chars + extension
    var startCharLimit = isMobile ? 15 : 30;
    var lastCharsCount = 4; // Last 4 characters before extension
    
    // Calculate total max length (start + dots + last chars + extension)
    var maxLength = startCharLimit + 3 + lastCharsCount + extension.length;
    
    // If filename fits within max length, return as is
    if (filename.length <= maxLength) {
        return filename;
    }
    
    // Ensure name has enough characters to show start + last 4
    if (nameWithoutExt.length <= (startCharLimit + lastCharsCount)) {
        // If name is short enough, just show full name + extension
        return filename;
    }
    
    // Get first part (start chars)
    var startPart = nameWithoutExt.substring(0, startCharLimit);
    
    // Get last part (last 4 chars before extension)
    var lastPart = nameWithoutExt.substring(nameWithoutExt.length - lastCharsCount);
    
    // Truncate: start + "..." + last 4 chars + extension
    var truncatedName = startPart + '...' + lastPart + extension;
    
    return truncatedName;
}

function createFileItem(fileObj) {
    var fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.dataset.fileId = fileObj.id;
    
    // Truncate filename intelligently (preserve extension)
    var displayName = truncateFileName(fileObj.name);
    
    fileItem.innerHTML = `
        <img src="/icons/image-icon.svg" alt="${fileObj.name}" class="file-preview">
        <div class="file-info">
            <div class="file-name" title="${fileObj.name}">${displayName}</div>
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
        
        // Reset file input to allow re-selecting the same file
        if (fileInput) {
            fileInput.value = '';
        }
        
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
    var url = urlInput.value.trim();
    
    if (!url) {
        if (typeof showError === 'function') {
            showError('Please enter a valid URL');
        }
        return;
    }
    
    if (!isValidImageUrl(url)) {
        if (typeof showError === 'function') {
            showError('Please enter a valid image URL');
        }
        return;
    }
    
    urlSubmit.disabled = true;
    urlSubmit.textContent = 'Uploading...';
    
    uploadFromUrl(url)
        .then(function(fileObj) {
            uploadedFiles.push(fileObj);
            updateFileList();
            updateUI();
            if (typeof closeUrlModal === 'function') {
            closeUrlModal();
            }
            // File uploaded successfully
            hideError(); // Hide error on success
        })
        .catch(function(error) {
            // Show error message
            if (error.message && error.message.indexOf('limit') > -1) {
                if (typeof showError === 'function') {
                    showError(error.message);
                }
            } else {
                if (typeof showError === 'function') {
                    showError(error.message || 'Upload failed. Please try again.');
                }
            }
        })
        .then(function() {
            // Finally block - ES5 compatible
            urlSubmit.disabled = false;
            urlSubmit.textContent = 'Upload from URL';
        });
}

function isValidImageUrl(url) {
    try {
        var urlObj = new URL(url);
        var pathname = urlObj.pathname.toLowerCase();
        var imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.tiff', '.ico'];
        
        // ES5 compatible some() fallback
        for (var i = 0; i < imageExtensions.length; i++) {
            if (pathname.indexOf(imageExtensions[i]) === pathname.length - imageExtensions[i].length) {
                return true;
            }
        }
        return false;
    } catch (e) {
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
    var counterValue = Math.round(percentage);
    
    progressFill.style.width = percentage + '%';
    
    // Show real-time counter: "Finalizing 1...", "Finalizing 2...", etc. - ES5 compatible
    var hasFinalizing = text && text.indexOf('Finalizing') > -1;
    if (hasFinalizing) {
        progressText.textContent = 'Finalizing ' + counterValue + '...';
    } else {
        progressText.textContent = text || (counterValue + '%');
    }
    
    // Keep same purple color throughout (no color change)
    if (progressContainer && progressContainer.classList) {
    progressContainer.classList.remove('done');
    }
    progressFill.style.background = 'linear-gradient(90deg, rgba(124, 58, 237, 0.7), rgba(109, 40, 217, 0.7))';
}

function animateProgress(targetPercentage, text) {
    var currentPercentage = parseFloat(progressFill.style.width) || 0;
    var targetValue = Math.round(targetPercentage);
    var currentValue = Math.round(currentPercentage);
    
    // Animate progress from current to target with real-time counter
    var duration = 500; // 500ms animation
    var steps = Math.abs(targetValue - currentValue);
    var stepDuration = duration / Math.max(steps, 1);
    
    var currentStep = 0;
    var counter = setInterval(function() {
        currentStep++;
        var progress = currentStep / steps;
        var animatedValue = Math.round(currentValue + (targetValue - currentValue) * progress);
        
        progressFill.style.width = animatedValue + '%';
        
        // Show real-time counter: "Finalizing 1...", "Finalizing 2...", etc. - ES5 compatible
        var hasFinalizing = text && text.indexOf('Finalizing') > -1;
        if (hasFinalizing) {
            progressText.textContent = 'Finalizing ' + animatedValue + '...';
        } else {
            progressText.textContent = text || (animatedValue + '%');
        }
        
        if (currentStep >= steps) {
            clearInterval(counter);
            progressFill.style.width = targetPercentage + '%';
            
            // Final counter display
            if (hasFinalizing) {
                progressText.textContent = 'Finalizing ' + targetValue + '...';
            } else {
                progressText.textContent = text || (targetValue + '%');
            }
        }
    }, stepDuration);
}

function showResults(results) {
    console.log('showResults called with', results.length, 'results');
    
    // Update convert button text based on number of files
    var btnText = convertBtn.querySelector('.btn-text');
    if (btnText) {
    if (results.length === 1) {
            btnText.textContent = 'Download';
    } else {
            btnText.textContent = 'Download All';
        }
    }
    
    if (convertBtn && convertBtn.classList) {
    convertBtn.classList.add('download');
    }
    // ES5 compatible onclick handler
    convertBtn.onclick = function() {
        downloadAllFiles(results);
    };
}

async function downloadFiles(results) {
    try {
        console.log('Starting download for ' + results.length + ' file(s)');
        
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
        
        // Prepare files data for backend - ES5 compatible
        var files = [];
        for (var i = 0; i < results.length; i++) {
            files.push({
                publicId: results[i].publicId,
                format: results[i].format,
                originalName: results[i].originalName
            });
        }
        
        // Detect mobile browser
        var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // For mobile browsers, use form POST method (more reliable than blob URLs)
        if (isMobile) {
            console.log('Mobile browser detected - using form POST download method');
            
            // Stop spinner
            convertBtn.querySelector('.btn-loading').style.display = 'none';
            convertBtn.querySelector('.btn-text').style.display = 'block';
            convertBtn.disabled = false;
            
            // Create hidden iframe for download (doesn't reload page)
            var iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.name = 'downloadFrame';
            document.body.appendChild(iframe);
            
            // Create form to POST to server
            var form = document.createElement('form');
            form.method = 'POST';
            form.action = '/api/download';
            form.target = 'downloadFrame'; // Download in iframe, not main window
            form.style.display = 'none';
            
            // Add files data as JSON in hidden input
            var filesInput = document.createElement('input');
            filesInput.type = 'hidden';
            filesInput.name = 'files';
            filesInput.value = JSON.stringify(files);
            form.appendChild(filesInput);
            
            // Append form to body and submit
            document.body.appendChild(form);
            form.submit();
            
            // Mark as downloaded
            isDownloaded = true;
            
            // Clean up after delay (iframe stays for download to complete)
            setTimeout(function() {
                if (form.parentNode) {
                    document.body.removeChild(form);
                }
                // Keep iframe for a bit longer to ensure download completes
                setTimeout(function() {
                    if (iframe.parentNode) {
                        document.body.removeChild(iframe);
                    }
                }, 2000);
            }, 500);
            
            // Remove click animation class
            convertBtn.classList.remove('clicked');
            return; // Exit early - download handled by server via iframe
        }
        
        // Desktop: Use blob URL method (original implementation)
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
        
        console.log('Downloading: ' + filename + ' (' + blob.size + ' bytes)');
        
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
        // Prepare files for job API - ES5 compatible
        var files = [];
        for (var i = 0; i < results.length; i++) {
            files.push({
                publicId: results[i].publicId,
                format: results[i].format,
                originalName: results[i].originalName,
                convertedUrl: results[i].convertedUrl
            });
        }
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
        var url = '/api/zip-file?jobId=' + encodeURIComponent(jobId);
        
        // Detect mobile browser
        var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // For mobile browsers, use link click method to trigger download
        if (isMobile) {
            console.log('Mobile browser detected - using link download method for ZIP');
            
            // Create hidden link to trigger download
            var link = document.createElement('a');
            link.href = url;
            link.download = zipName || 'converted_files.zip';
            link.style.display = 'none';
            
            // Add to DOM, click, and remove
            document.body.appendChild(link);
            link.click();
            
            // Clean up after delay
            setTimeout(function() {
                if (link.parentNode) {
                    document.body.removeChild(link);
                }
            }, 100);
            
            isDownloaded = true;
        } else {
            // Desktop: Use direct navigation for most reliable native progress UI
        window.location.assign(url);
        isDownloaded = true;
        }
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

// Error handling - Cross-browser compatible
if (window.addEventListener) {
window.addEventListener('error', function(e) {
        console.error('Global error:', e.error || e.message || 'Unknown error');
        // Prevent error from breaking the page
        e.preventDefault = e.preventDefault || function() {};
        return true; // Prevent default error handling
    }, true);
    
    // Promise rejection handler (if supported)
    if (typeof Promise !== 'undefined' && window.addEventListener) {
window.addEventListener('unhandledrejection', function(e) {
            console.error('Unhandled promise rejection:', e.reason || 'Unknown rejection');
            // Prevent default behavior
            if (e.preventDefault) {
                e.preventDefault();
            }
        });
    }
}

// PWA install prompt - ES5 compatible for Safari
var deferredPrompt;
if (window.addEventListener) {
    window.addEventListener('beforeinstallprompt', function(e) {
        if (e.preventDefault) {
    e.preventDefault();
        }
    deferredPrompt = e;
    
    // Show install button or banner
        if (typeof showInstallPrompt === 'function') {
    showInstallPrompt();
        }
});
}

function showInstallPrompt() {
    // You can add an install button to the UI here
    console.log('PWA install prompt available');
}

// Offline handling
// Online/offline handlers - ES5 compatible
if (window.addEventListener) {
    window.addEventListener('online', function() {
    // Connection restored
        console.log('Connection restored');
});

    window.addEventListener('offline', function() {
    // You are offline. Some features may not work.
        console.log('You are offline. Some features may not work.');
});
}

// FAQ functionality - ES5 compatible
function initializeFAQ() {
    var faqItems = document.querySelectorAll('.faq-item');
    
    for (var i = 0; i < faqItems.length; i++) {
        (function(item) {
            var question = item.querySelector('.faq-question');
            if (!question) return;
            
            question.addEventListener('click', function() {
                var isActive = item.classList && item.classList.contains('active');
                if (!isActive && item.className) {
                    // Fallback check
                    isActive = item.className.indexOf('active') > -1;
                }
            
            // Close all other FAQ items
                for (var j = 0; j < faqItems.length; j++) {
                    if (faqItems[j] !== item) {
                        if (faqItems[j].classList) {
                            faqItems[j].classList.remove('active');
                        } else {
                            // Fallback for IE
                            faqItems[j].className = faqItems[j].className.replace('active', '').trim();
                        }
                    }
                }
            
            // Toggle current item
            if (isActive) {
                    if (item.classList) {
                item.classList.remove('active');
            } else {
                        item.className = item.className.replace('active', '').trim();
                    }
                } else {
                    if (item.classList) {
                item.classList.add('active');
                    } else {
                        item.className = (item.className + ' active').trim();
                    }
            }
        });
        })(faqItems[i]);
    }
}
