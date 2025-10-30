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

// DOM elements
const header = document.getElementById('header');
const uploadBox = document.getElementById('uploadBox');
const selectFilesBtn = document.getElementById('selectFilesBtn');
const fileSourceDropdown = document.getElementById('fileSourceDropdown');
const fileListContainer = document.getElementById('fileListContainer');
const outputSettings = document.getElementById('outputSettings');
const formatBtn = document.getElementById('formatBtn');
const formatOptions = document.getElementById('formatOptions');
const convertBtn = document.getElementById('convertBtn');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
// Removed progressCounter reference
const fileInput = document.getElementById('fileInput');
const urlModal = document.getElementById('urlModal');
const urlInput = document.getElementById('urlInput');
const urlSubmit = document.getElementById('urlSubmit');
const modalClose = document.getElementById('modalClose');
// Toast notifications removed

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    // Track page view
    trackPageView('Love U Convert - WebP to PNG Converter');
    
    initializeEventListeners();
    initializeScrollHandler();
    initializeServiceWorker();
    initializeFAQ();
});

// Daily limit check
async function isDailyLimitReached() {
    try {
        const res = await fetch('/api/usage', { cache: 'no-store' });
        if (!res.ok) return false; // fallthrough; don't block if unknown
        const data = await res.json();
        const pct = Number(data.percentage || 0);
        return pct >= 100;
    } catch {
        return false;
    }
}

// Event listeners
function initializeEventListeners() {
    // File source dropdown
    selectFilesBtn.addEventListener('click', toggleFileSourceDropdown);
    document.addEventListener('click', closeDropdownsOnOutsideClick);
    
    // File source options
    document.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', handleFileSourceSelection);
    });
    
    // Format dropdown
    formatBtn.addEventListener('click', toggleFormatDropdown);
    document.querySelectorAll('.format-option').forEach(option => {
        option.addEventListener('click', handleFormatSelection);
    });
    
    // File input
    fileInput.addEventListener('change', handleFileSelection);
    
    // Drag and drop
    uploadBox.addEventListener('dragover', handleDragOver);
    uploadBox.addEventListener('dragleave', handleDragLeave);
    uploadBox.addEventListener('drop', handleDrop);
    
    // Click anywhere in upload box to open file manager
    uploadBox.addEventListener('click', handleUploadBoxClick);
    
    // Convert button
    convertBtn.addEventListener('click', handleConvert);
    
    // URL modal
    urlSubmit.addEventListener('click', handleUrlSubmit);
    modalClose.addEventListener('click', closeUrlModal);
    urlModal.addEventListener('click', handleModalBackdropClick);
    
    // Toast close
    document.querySelectorAll('.toast').forEach(toast => {
        toast.addEventListener('click', () => hideToast(toast));
    });
}

// Scroll handler for header
function initializeScrollHandler() {
    let lastScrollY = window.scrollY;
    let ticking = false;
    
    function updateHeader() {
        const currentScrollY = window.scrollY;
        
        if (currentScrollY > lastScrollY && currentScrollY > 100) {
            header.classList.add('hidden');
        } else {
            header.classList.remove('hidden');
        }
        
        lastScrollY = currentScrollY;
        ticking = false;
    }
    
    function requestTick() {
        if (!ticking) {
            requestAnimationFrame(updateHeader);
            ticking = true;
        }
    }
    
    window.addEventListener('scroll', requestTick);
}

// Service worker registration
function initializeServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('SW registered: ', registration);
                })
                .catch(registrationError => {
                    console.log('SW registration failed: ', registrationError);
                });
        });
    }
}

// File source dropdown
function toggleFileSourceDropdown(e) {
    e.stopPropagation();
    fileSourceDropdown.classList.toggle('show');
}

function closeDropdownsOnOutsideClick(e) {
    if (!selectFilesBtn.contains(e.target) && !fileSourceDropdown.contains(e.target)) {
        fileSourceDropdown.classList.remove('show');
    }
    
    if (!formatBtn.contains(e.target) && !formatOptions.contains(e.target)) {
        formatOptions.classList.remove('show');
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
function handleFileSelection(e) {
    const files = Array.from(e.target.files);
    processFiles(files);
}

function handleDragOver(e) {
    e.preventDefault();
    uploadBox.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadBox.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    uploadBox.classList.remove('dragover');
    
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
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

function processFiles(files) {
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
        const errorMessage = errors.length === 1 ? errors[0] : `${errors.length} files have errors. First: ${errors[0]}`;
        // Error: ${errorMessage}
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
        // Please enter a valid URL
        return;
    }
    
    if (!isValidImageUrl(url)) {
        // Please enter a valid image URL
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
        })
        .catch(error => {
            // Error: ${error.message}
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
        throw new Error(error.message || 'Failed to upload from URL');
    }
}

// Convert files
async function handleConvert() {
    if (isConverting || uploadedFiles.length === 0) return;
    // Abort early if daily limit reached
    if (await isDailyLimitReached()) {
        alert('Daily limit reached (2GB). Please try again tomorrow.');
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
        // Conversion completed successfully!
    } catch (error) {
        // Error: ${error.message}
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
            throw new Error(err.message || 'Daily limit reached (2GB). Please try again tomorrow.');
        }
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
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
            throw new Error(err.message || 'Daily limit reached (2GB). Please try again tomorrow.');
        }
        const error = await response.json();
        throw new Error(error.error || 'Conversion failed');
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
        // Pre-check daily limit before starting ZIP job
        if (await isDailyLimitReached()) {
            alert('Daily limit reached (2GB). Please try again tomorrow.');
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
                alert(outJson.message || 'Your daily conversion limit has been reached. Please try again tomorrow!');
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
                    alert(stat.message || 'Your daily conversion limit has been reached. Please try again tomorrow!');
                    return;
                }
                throw new Error('Status poll failed');
            }
            if (stat.error) {
                if (stat.error.includes('limit') || (stat.message && stat.message.toLowerCase().includes('daily'))) {
                    convertBtn.querySelector('.btn-loading').style.display = 'none';
                    convertBtn.querySelector('.btn-text').style.display = 'block';
                    convertBtn.disabled = false;
                    alert(stat.message || 'Your daily conversion limit has been reached. Please try again tomorrow!');
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
            alert('Your daily conversion limit has been reached. Please try again tomorrow!');
            return;
        }
        alert(error.message || 'ZIP download failed');
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

// Toast notifications removed

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
