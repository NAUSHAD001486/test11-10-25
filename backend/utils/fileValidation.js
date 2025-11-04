// File validation utilities
const path = require('path');

// Supported formats
const SUPPORTED_INPUT_FORMATS = ['png', 'bmp', 'eps', 'gif', 'ico', 'jpeg', 'jpg', 'odd', 'svg', 'psd', 'tga', 'tiff', 'webp'];
const SUPPORTED_OUTPUT_FORMATS = ['PNG', 'BMP', 'EPS', 'GIF', 'ICO', 'JPEG', 'JPG', 'ODD', 'SVG', 'PSD', 'TGA', 'TIFF', 'WebP'];

// Validate downloaded image buffer by magic-bytes
function isLikelyValidImage(buffer, expectedExt) {
  if (!buffer || buffer.length < 32) return false;
  const b = buffer;
  const ext = (expectedExt || '').toLowerCase().replace('.', '');
  
  // PNG
  if (ext === 'png') {
    return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47 && b[4] === 0x0D && b[5] === 0x0A && b[6] === 0x1A && b[7] === 0x0A;
  }
  // JPEG/JPG
  if (ext === 'jpg' || ext === 'jpeg') {
    return b[0] === 0xFF && b[1] === 0xD8 && b[b.length - 2] === 0xFF && b[b.length - 1] === 0xD9;
  }
  // GIF
  if (ext === 'gif') {
    return b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38;
  }
  // WebP
  if (ext === 'webp') {
    return b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;
  }
  // BMP
  if (ext === 'bmp') {
    if (b.length < 54) return false;
    return b[0] === 0x42 && b[1] === 0x4D;
  }
  // TIFF
  if (ext === 'tiff' || ext === 'tif') {
    const ii = b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2A && b[3] === 0x00;
    const mm = b[0] === 0x4D && b[1] === 0x4D && b[2] === 0x00 && b[3] === 0x2A;
    return ii || mm;
  }
  // Fallback
  return buffer.length > 1024;
}

// Validate file
const validateFile = (file) => {
  const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
  
  if (file.size > maxSize) {
    throw new Error('File too large. Maximum size: 2GB');
  }
  
  const ext = path.extname(file.originalname).toLowerCase().slice(1);
  if (!SUPPORTED_INPUT_FORMATS.includes(ext)) {
    throw new Error(`Unsupported input format. Supported: ${SUPPORTED_INPUT_FORMATS.join(', ')}`);
  }
  
  return true;
};

// Get MIME type
function getMimeType(format) {
  const mimeTypes = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'tiff': 'image/tiff',
    'ico': 'image/x-icon',
    'tga': 'image/x-tga',
    'psd': 'image/vnd.adobe.photoshop',
    'eps': 'application/postscript',
    'odd': 'application/octet-stream'
  };
  
  return mimeTypes[format.toLowerCase()] || 'application/octet-stream';
}

module.exports = {
  isLikelyValidImage,
  validateFile,
  getMimeType,
  SUPPORTED_INPUT_FORMATS,
  SUPPORTED_OUTPUT_FORMATS
};

