// Global state
let uploadedFiles = [];
let selectedFormat = 'PNG';
let isConverting = false;

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
const progressCounter = document.getElementById('progressCounter');
const fileInput = document.getElementById('fileInput');
const urlModal = document.getElementById('urlModal');
const urlInput = document.getElementById('urlInput');
const urlSubmit = document.getElementById('urlSubmit');
const modalClose = document.getElementById('modalClose');
const errorToast = document.getElementById('errorToast');
const successToast = document.getElementById('successToast');
const toastMessage = document.getElementById('toastMessage');
const successMessage = document.getElementById('successMessage');

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    initializeScrollHandler();
    initializeServiceWorker();
});

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
            showToast('Cloud storage integration coming soon!', 'info');
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
        showToast(errorMessage, 'error');
    }
    
    if (validFiles.length === 0) return;
    
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
    showToast(successMessage, 'success');
}

function generateFileId() {
    return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
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
    showToast('File settings coming soon!', 'info');
}

function updateUI() {
    const hasFiles = uploadedFiles.length > 0;
    
    outputSettings.classList.toggle('show', hasFiles);
    convertBtn.style.display = hasFiles ? 'block' : 'none';
    convertBtn.disabled = !hasFiles || isConverting;
    
    if (hasFiles) {
        convertBtn.querySelector('.btn-text').textContent = 'Convert';
        convertBtn.classList.remove('download');
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
        showToast('Please enter a valid URL', 'error');
        return;
    }
    
    if (!isValidImageUrl(url)) {
        showToast('Please enter a valid image URL', 'error');
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
            showToast('File uploaded successfully', 'success');
        })
        .catch(error => {
            showToast(error.message, 'error');
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
        const response = await fetch('/api/upload/url', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url })
        });
        
        if (!response.ok) {
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
    
    isConverting = true;
    convertBtn.disabled = true;
    convertBtn.querySelector('.btn-text').style.display = 'none';
    convertBtn.querySelector('.btn-loading').style.display = 'flex';
    
    progressContainer.style.display = 'block';
    
    // Start time tracking
    const startTime = Date.now();
    
    try {
        const results = await convertFiles(startTime);
        showResults(results);
        showToast('Conversion completed successfully!', 'success');
    } catch (error) {
        showToast(error.message, 'error');
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
        const fileProgress = ((i + 1) / totalFiles) * 100;
        
        // Calculate elapsed time and estimated remaining time
        const elapsedTime = Date.now() - startTime;
        const avgTimePerFile = elapsedTime / (i + 1);
        const remainingFiles = totalFiles - (i + 1);
        const estimatedRemainingTime = avgTimePerFile * remainingFiles;
        
        // Format time display
        const formatTime = (ms) => {
            const seconds = Math.ceil(ms / 1000);
            if (seconds < 60) return `${seconds}s`;
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return `${minutes}m ${remainingSeconds}s`;
        };
        
        const timeText = remainingFiles > 0 
            ? `Converting ${fileObj.name}... (${formatTime(estimatedRemainingTime)} remaining)`
            : `Converting ${fileObj.name}... (Finalizing)`;
        
        // Smooth progress animation
        animateProgress(fileProgress, timeText);
        
        try {
            let result;
            
            if (fileObj.file) {
                // Upload file first
                result = await uploadFile(fileObj.file);
            } else {
                // File already uploaded from URL
                result = {
                    publicId: fileObj.publicId,
                    originalName: fileObj.name
                };
            }
            
            // Convert file
            const convertedUrl = await convertFile(result.publicId, selectedFormat);
            
            results.push({
                originalName: result.originalName,
                convertedUrl: convertedUrl,
                format: selectedFormat,
                publicId: result.publicId
            });
        } catch (error) {
            console.error('Error converting file:', error);
            // Continue with other files
        }
    }
    
    return results;
}

async function uploadFile(file) {
    const formData = new FormData();
    formData.append('files', file);
    
    const response = await fetch('/api/upload/device', {
        method: 'POST',
        body: formData
    });
    
    if (!response.ok) {
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
    progressText.textContent = text || `${counterValue}%`;
    progressCounter.textContent = counterValue;
    
    // Add special styling for "Done" state
    if (text === 'Done!') {
        progressContainer.classList.add('done');
        progressFill.style.background = 'linear-gradient(90deg, rgba(16, 185, 129, 0.7), rgba(5, 150, 105, 0.7))';
        progressCounter.textContent = '100';
    } else {
        progressContainer.classList.remove('done');
        progressFill.style.background = 'linear-gradient(90deg, rgba(124, 58, 237, 0.7), rgba(109, 40, 217, 0.7))';
    }
}

function animateProgress(targetPercentage, text) {
    const currentPercentage = parseFloat(progressFill.style.width) || 0;
    const targetValue = Math.round(targetPercentage);
    const currentValue = Math.round(currentPercentage);
    
    // Animate counter from current to target
    const duration = 500; // 500ms animation
    const steps = Math.abs(targetValue - currentValue);
    const stepDuration = duration / Math.max(steps, 1);
    
    let currentStep = 0;
    const counter = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;
        const animatedValue = Math.round(currentValue + (targetValue - currentValue) * progress);
        
        progressCounter.textContent = animatedValue;
        progressFill.style.width = `${animatedValue}%`;
        progressText.textContent = text || `${animatedValue}%`;
        
        if (currentStep >= steps) {
            clearInterval(counter);
            progressCounter.textContent = targetValue;
            progressFill.style.width = `${targetPercentage}%`;
            progressText.textContent = text || `${targetValue}%`;
        }
    }, stepDuration);
}

function showResults(results) {
    // Update convert button to "Download All"
    convertBtn.querySelector('.btn-text').textContent = 'Download All';
    convertBtn.classList.add('download');
    convertBtn.onclick = () => downloadAllFiles(results);
}

async function downloadFiles(results) {
    try {
        console.log(`Starting download for ${results.length} file(s)`);
        
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
        
        // Create download link
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        link.style.display = 'none';
        
        // Add to DOM, click, and remove immediately
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the blob URL quickly
        setTimeout(() => {
            URL.revokeObjectURL(blobUrl);
        }, 100);
        
        // Show success message briefly
        if (fileCount === '1') {
            showToast('Downloaded!', 'success');
        } else {
            showToast(`ZIP downloaded!`, 'success');
        }
        
    } catch (error) {
        console.error('Download error:', error);
        showToast(`Download failed: ${error.message}`, 'error');
    }
}

async function downloadAllFiles(results) {
    await downloadFiles(results);
}

// Toast notifications
function showToast(message, type = 'info') {
    const toast = type === 'error' ? errorToast : successToast;
    const messageElement = type === 'error' ? toastMessage : successMessage;
    
    messageElement.textContent = message;
    toast.classList.add('show');
    
    // Auto hide after 2 seconds for faster UI
    setTimeout(() => {
        hideToast(toast);
    }, 2000);
}

function hideToast(toast) {
    toast.classList.remove('show');
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
    showToast('An unexpected error occurred', 'error');
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
    showToast('An unexpected error occurred', 'error');
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
    showToast('Connection restored', 'success');
});

window.addEventListener('offline', () => {
    showToast('You are offline. Some features may not work.', 'error');
});
