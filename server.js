const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const cron = require('node-cron');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const archiver = require('archiver');
require('dotenv').config({ path: './config.env' });

// Usage tracking for rate limiting
const usageTracker = new Map();
const DAILY_LIMIT = 2 * 1024 * 1024 * 1024; // 2GB in bytes

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.cloudinary.com"]
    }
  },
  hsts: {
    maxAge: parseInt(process.env.HSTS_MAX_AGE) || 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate limiting - Allow 2GB usage per IP per day
const limiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 1000, // Allow 1000 requests per day (should be enough for 2GB)
  message: {
    error: 'Daily usage limit reached',
    message: 'You have reached your daily conversion limit. Please try again tomorrow.',
    limit: '2GB per day',
    resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for static files and health checks
    return req.path === '/health' || req.path.startsWith('/css/') || req.path.startsWith('/js/') || req.path.startsWith('/icons/');
  }
});
app.use(limiter);

// Custom usage tracking middleware
const trackUsage = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  const today = new Date().toDateString();
  const key = `${clientIP}-${today}`;
  
  // Initialize usage for this IP and day
  if (!usageTracker.has(key)) {
    usageTracker.set(key, { bytes: 0, lastReset: Date.now() });
  }
  
  const usage = usageTracker.get(key);
  
  // Check if daily limit is reached
  if (usage.bytes >= DAILY_LIMIT) {
    return res.status(429).json({
      error: 'Daily usage limit reached',
      message: 'You have reached your daily conversion limit of 2GB. Please try again tomorrow.',
      limit: '2GB per day',
      used: `${(usage.bytes / (1024 * 1024 * 1024)).toFixed(2)}GB`,
      resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });
  }
  
  // Store usage info in request for later use
  req.usageTracker = { key, usage };
  next();
};

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? ['https://yourdomain.com'] : ['http://localhost:3000'],
  credentials: true
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use(express.static('public'));

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024, // 2GB
    files: 10
  },
  fileFilter: (req, file, cb) => {
    try {
      validateFile(file);
      cb(null, true);
    } catch (error) {
      cb(new Error(error.message), false);
    }
  }
});

// Lightweight file format validation
const SUPPORTED_INPUT_FORMATS = ['png', 'bmp', 'eps', 'gif', 'ico', 'jpeg', 'jpg', 'odd', 'svg', 'psd', 'tga', 'tiff', 'webp'];
const SUPPORTED_OUTPUT_FORMATS = ['PNG', 'BMP', 'EPS', 'GIF', 'ICO', 'JPEG', 'JPG', 'ODD', 'SVG', 'PSD', 'TGA', 'TIFF', 'WebP'];

// Cloudinary supported formats (for conversion)
const CLOUDINARY_FORMATS = {
  'PNG': 'png', 'BMP': 'bmp', 'GIF': 'gif', 'ICO': 'ico', 
  'JPEG': 'jpg', 'JPG': 'jpg', 'SVG': 'svg', 'TIFF': 'tiff', 'WebP': 'webp'
};

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

// Upload file to Cloudinary with optimized settings
const uploadToCloudinary = async (filePath, publicId) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      public_id: publicId,
      resource_type: 'auto',
      folder: 'love-u-convert',
      timeout: 30000,
      chunk_size: 6000000 // 6MB chunks for speed
    });
    return result;
  } catch (error) {
    if (error.http_code === 429) {
      // Rate limit - wait 1s and retry once
      await new Promise(resolve => setTimeout(resolve, 1000));
      try {
        return await cloudinary.uploader.upload(filePath, {
          public_id: publicId,
          resource_type: 'auto',
          folder: 'love-u-convert',
          timeout: 30000
        });
      } catch (retryError) {
        throw new Error('Upload failed: Rate limit exceeded');
      }
    }
    throw new Error(`Upload failed: ${error.message}`);
  }
};

// Convert file format using Cloudinary with lightweight validation
const convertFile = async (publicId, originalFormat, targetFormat) => {
  try {
    // Check if Cloudinary supports this format
    const cloudinaryFormat = CLOUDINARY_FORMATS[targetFormat];
    if (!cloudinaryFormat) {
      throw new Error(`Cloudinary does not support ${targetFormat} conversion`);
    }
    
    const transformation = {
      format: cloudinaryFormat,
      quality: 'auto',
      fetch_format: cloudinaryFormat,
      flags: 'progressive' // For faster loading
    };
    
    const url = cloudinary.url(publicId, transformation);
    
    // Trigger conversion with timeout
    try {
      await axios.head(url, { timeout: 5000 });
    } catch (headError) {
      // Continue even if HEAD fails
    }
    
    return url;
  } catch (error) {
    throw new Error(`Conversion failed: ${error.message}`);
  }
};

// Download file from URL
const downloadFromUrl = async (url) => {
  try {
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream',
      timeout: 30000
    });
    
    const filename = path.basename(url) || 'downloaded-file';
    const filePath = path.join('uploads', Date.now() + '-' + filename);
    
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(filePath));
      writer.on('error', reject);
    });
  } catch (error) {
    throw new Error(`Download failed: ${error.message}`);
  }
};

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Usage check endpoint
app.get('/api/usage', (req, res) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  const today = new Date().toDateString();
  const key = `${clientIP}-${today}`;
  
  const usage = usageTracker.get(key) || { bytes: 0, lastReset: Date.now() };
  const usedGB = (usage.bytes / (1024 * 1024 * 1024)).toFixed(2);
  const remainingGB = ((DAILY_LIMIT - usage.bytes) / (1024 * 1024 * 1024)).toFixed(2);
  
  res.json({
    used: `${usedGB}GB`,
    remaining: `${remainingGB}GB`,
    limit: '2GB',
    percentage: Math.round((usage.bytes / DAILY_LIMIT) * 100),
    resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  });
});

// Upload from device with limited parallel processing
app.post('/api/upload/device', trackUsage, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const results = [];
    const errors = [];
    
    // Process files in batches of 5 to avoid overload
    const batchSize = 5;
    for (let i = 0; i < req.files.length; i += batchSize) {
      const batch = req.files.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (file) => {
        try {
          const publicId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const cloudinaryResult = await uploadToCloudinary(file.path, publicId);
          
          // Track usage
          if (req.usageTracker) {
            req.usageTracker.usage.bytes += file.size;
          }
          
          // Clean up local file
          await fs.remove(file.path);
          
          return {
            success: true,
            result: {
              id: publicId,
              originalName: file.originalname,
              size: file.size,
              format: path.extname(file.originalname).slice(1).toLowerCase(),
              url: cloudinaryResult.secure_url,
              publicId: cloudinaryResult.public_id
            }
          };
        } catch (error) {
          console.error('Error processing file:', error);
          // Clean up local file on error
          if (file.path) {
            await fs.remove(file.path).catch(() => {});
          }
          return {
            success: false,
            error: error.message,
            filename: file.originalname
          };
        }
      });
      
      // Wait for batch to complete
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            results.push(result.value.result);
          } else {
            errors.push({
              filename: result.value.filename,
              error: result.value.error
            });
          }
        } else {
          errors.push({
            filename: 'unknown',
            error: result.reason?.message || 'Upload failed'
          });
        }
      });
    }
    
    const response = { files: results };
    if (errors.length > 0) {
      response.errors = errors;
    }
    
    res.json(response);
  } catch (error) {
    console.error('Upload endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload from URL
app.post('/api/upload/url', trackUsage, async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    const filePath = await downloadFromUrl(url);
    const publicId = `url-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const cloudinaryResult = await uploadToCloudinary(filePath, publicId);
    
    // Clean up local file
    await fs.remove(filePath);
    
    res.json({
      id: publicId,
      originalName: path.basename(url),
      url: cloudinaryResult.secure_url,
      publicId: cloudinaryResult.public_id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Convert files with parallel processing
app.post('/api/convert', async (req, res) => {
  try {
    const { files, targetFormat } = req.body;
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files to convert' });
    }
    
    if (!targetFormat || !SUPPORTED_OUTPUT_FORMATS.includes(targetFormat)) {
      return res.status(400).json({ 
        error: `Unsupported output format. Supported: ${SUPPORTED_OUTPUT_FORMATS.join(', ')}` 
      });
    }
    
    const convertedFiles = [];
    const errors = [];
    
    // Process conversions in parallel (max 5 at a time)
    const batchSize = 5;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (file) => {
        try {
          const convertedUrl = await convertFile(file.publicId, file.format, targetFormat);
          return {
            success: true,
            result: {
              originalName: file.originalName,
              convertedUrl: convertedUrl,
              format: targetFormat,
              publicId: file.publicId
            }
          };
        } catch (error) {
          console.error('Error converting file:', error);
          return {
            success: false,
            error: error.message,
            filename: file.originalName
          };
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            convertedFiles.push(result.value.result);
          } else {
            errors.push({
              filename: result.value.filename,
              error: result.value.error
            });
          }
        } else {
          errors.push({
            filename: 'unknown',
            error: result.reason?.message || 'Conversion failed'
          });
        }
      });
    }
    
    const response = { convertedFiles };
    if (errors.length > 0) {
      response.errors = errors;
    }
    
    res.json(response);
  } catch (error) {
    console.error('Convert endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Download converted files (single file or ZIP bundle)
app.post('/api/download', async (req, res) => {
  try {
    const { files } = req.body;
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files to download' });
    }
    
    console.log(`Download request for ${files.length} file(s)`);
    
    if (files.length === 1) {
      // Single file download
      const file = files[0];
      const { publicId, format, originalName } = file;
      
      console.log(`Downloading single file: ${originalName} (${format})`);
      
      // Get the converted URL
      const convertedUrl = await convertFile(publicId, 'webp', format);
      
      // Fetch the file from Cloudinary
      const response = await axios({
        method: 'GET',
        url: convertedUrl,
        responseType: 'stream',
        timeout: 10000 // Reduced timeout for faster response
      });
      
      // Generate proper filename by stripping original extension and adding new one
      let baseName = 'converted';
      if (originalName) {
        try {
          const ext = path.extname(originalName);
          baseName = ext ? path.basename(originalName, ext) : path.basename(originalName);
          // Handle edge case where basename might be empty
          if (!baseName) baseName = 'converted';
        } catch (error) {
          console.warn('Error processing filename:', error.message);
          baseName = 'converted';
        }
      }
      const filename = `${baseName}.${format.toLowerCase()}`;
      const mimeType = getMimeType(format);
      
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', response.headers['content-length']);
      res.setHeader('X-File-Count', '1');
      
      // Stream the file to response
      response.data.pipe(res);
      
    } else {
      // Multiple files - create ZIP bundle
      console.log(`Creating ZIP bundle for ${files.length} files`);
      
      // Set headers for ZIP download
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="converted_files.zip"');
      res.setHeader('X-File-Count', files.length.toString());
      
      // Create ZIP archive
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });
      
      // Handle archive events
      archive.on('error', (err) => {
        console.error('Archive error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to create ZIP archive' });
        }
      });
      
      // Pipe archive to response
      archive.pipe(res);
      
      // Add each file to the ZIP
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const { publicId, format, originalName } = file;
        
        try {
          console.log(`Adding to ZIP: ${originalName} (${format})`);
          
          // Get the converted URL
          const convertedUrl = await convertFile(publicId, 'webp', format);
          
          // Fetch the file from Cloudinary
          const fileResponse = await axios({
            method: 'GET',
            url: convertedUrl,
            responseType: 'stream',
            timeout: 10000 // Reduced timeout for faster response
          });
          
          // Create filename for ZIP entry by stripping original extension
          let baseName = `file_${i + 1}`;
          if (originalName) {
            try {
              const ext = path.extname(originalName);
              baseName = ext ? path.basename(originalName, ext) : path.basename(originalName);
              // Handle edge case where basename might be empty
              if (!baseName) baseName = `file_${i + 1}`;
            } catch (error) {
              console.warn('Error processing ZIP filename:', error.message);
              baseName = `file_${i + 1}`;
            }
          }
          const zipFilename = `${baseName}.${format.toLowerCase()}`;
          
          // Add file to archive
          archive.append(fileResponse.data, { name: zipFilename });
          
        } catch (fileError) {
          console.error(`Error adding file ${originalName} to ZIP:`, fileError);
          // Continue with other files
        }
      }
      
      // Finalize the archive
      await archive.finalize();
    }
    
  } catch (error) {
    console.error('Download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Download failed' });
    }
  }
});

// Helper function to get MIME type based on format
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
    'ico': 'image/x-icon'
  };
  
  return mimeTypes[format.toLowerCase()] || 'application/octet-stream';
}

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Lightweight file cleanup with setTimeout
const cleanupFiles = async () => {
  try {
    const uploadsDir = 'uploads';
    if (await fs.pathExists(uploadsDir)) {
      const files = await fs.readdir(uploadsDir);
      const now = Date.now();
      const maxAge = 2 * 60 * 60 * 1000; // 2 hours
      
      for (const file of files) {
        const filePath = path.join(uploadsDir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.remove(filePath);
        }
      }
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
  
  // Schedule next cleanup in 2 hours
  setTimeout(cleanupFiles, 2 * 60 * 60 * 1000);
};

// Start cleanup cycle
setTimeout(cleanupFiles, 2 * 60 * 60 * 1000);

// Reset daily usage (runs every day at midnight)
cron.schedule('0 0 * * *', () => {
  const today = new Date().toDateString();
  const keysToDelete = [];
  
  for (const [key, usage] of usageTracker.entries()) {
    const keyDate = key.split('-').slice(1).join('-');
    if (keyDate !== today) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => {
    usageTracker.delete(key);
    console.log(`Reset daily usage for: ${key}`);
  });
  
  console.log(`Daily usage reset completed. Active users: ${usageTracker.size}`);
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files' });
    }
  }
  
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;
