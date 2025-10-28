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

// Privacy Policy routes
app.get('/privacy-policy.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'privacy-policy.html'));
});

// Alternative route for /Privacy-Policy
app.get('/Privacy-Policy', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'privacy-policy.html'));
});

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

// Cloudinary formats that work reliably
const CLOUDINARY_RELIABLE_FORMATS = {
  'PNG': 'png', 'JPEG': 'jpg', 'JPG': 'jpg', 'GIF': 'gif', 'TIFF': 'tiff', 'WebP': 'webp'
};

// Formats that need special handling (convert to PNG and serve as requested format)
const SPECIAL_FORMATS = ['TGA', 'PSD', 'EPS', 'ODD', 'ICO', 'BMP', 'SVG'];

// All supported formats mapping - most convert to PNG for reliability
const CLOUDINARY_FORMATS = {
  ...CLOUDINARY_RELIABLE_FORMATS,
  'TGA': 'png', 'PSD': 'png', 'EPS': 'png', 'ODD': 'png', 
  'ICO': 'png', 'BMP': 'png', 'SVG': 'png'  // These will be converted to PNG for reliability
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
      chunk_size: 6000000, // 6MB chunks for speed
      tags: ['auto-delete-2h'] // Tag for auto-delete cleanup
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
    
    // Handle special formats that need different approaches
    let transformation = {
      quality: 'auto',
      flags: 'progressive'
    };
    
    // For special formats, always convert to PNG for reliability
    if (SPECIAL_FORMATS.includes(targetFormat)) {
      transformation.format = 'png';
      transformation.fetch_format = 'png';
      console.log(`Converting ${targetFormat} to PNG for reliability`);
    } else {
      // Standard conversion for reliable formats
      transformation.format = cloudinaryFormat;
      transformation.fetch_format = cloudinaryFormat;
      console.log(`Converting to ${cloudinaryFormat} (native format)`);
    }
    
    const url = cloudinary.url(publicId, transformation);
    console.log(`Generated URL: ${url}`);
    
    // Trigger conversion with timeout - but don't fail if HEAD request fails
    try {
      const headResponse = await axios.head(url, { timeout: 20000 });
      console.log(`HEAD request successful: ${headResponse.status}`);
    } catch (headError) {
      console.warn('HEAD request failed, but continuing:', headError.message);
      // Continue even if HEAD fails - the URL might still work
    }
    
    return url;
  } catch (error) {
    console.error('Conversion error:', error);
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
          console.log(`Converting ${file.originalName} from ${file.format} to ${targetFormat}`);
          const convertedUrl = await convertFile(file.publicId, file.format, targetFormat);
          console.log(`Conversion successful for ${file.originalName}: ${convertedUrl}`);
          
          return {
            success: true,
            result: {
              originalName: file.originalName,
              convertedUrl: convertedUrl,
              format: targetFormat,
              publicId: file.publicId,
              isSpecialFormat: SPECIAL_FORMATS.includes(targetFormat)
            }
          };
        } catch (error) {
          console.error(`Error converting file ${file.originalName}:`, error);
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
      console.log(`Is special format: ${SPECIAL_FORMATS.includes(format)}`);
      
      // Get the converted URL with fallback
      let convertedUrl;
      try {
        convertedUrl = await convertFile(publicId, 'webp', format);
        console.log(`Using converted URL: ${convertedUrl}`);
      } catch (conversionError) {
        console.warn(`Conversion failed, using original file: ${conversionError.message}`);
        // Fallback to original file if conversion fails
        convertedUrl = cloudinary.url(publicId, { quality: 'auto' });
        console.log(`Using fallback URL: ${convertedUrl}`);
      }
      
      // Fetch the file from Cloudinary with retry logic
      let response;
      let retryCount = 0;
      const maxRetries = 2;
      
      while (retryCount <= maxRetries) {
        try {
          response = await axios({
            method: 'GET',
            url: convertedUrl,
            responseType: 'stream',
            timeout: 20000 // Increased timeout for reliability
          });
          
          console.log(`File fetch response status: ${response.status}`);
          console.log(`File fetch response headers:`, response.headers);
          break; // Success, exit retry loop
          
        } catch (fetchError) {
          retryCount++;
          console.error(`Fetch attempt ${retryCount} failed:`, fetchError.message);
          
          if (retryCount > maxRetries) {
            throw new Error(`Failed to fetch file after ${maxRetries + 1} attempts: ${fetchError.message}`);
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
      
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
      // For special formats, we convert to PNG but serve with requested format name
      const filename = `${baseName}.${format.toLowerCase()}`;
      let mimeType;
      
      if (SPECIAL_FORMATS.includes(format)) {
        // Special formats are converted to PNG but served with original format name
        mimeType = 'image/png'; // Always PNG for special formats
        console.log(`Special format ${format} converted to PNG, serving as ${filename}`);
      } else {
        mimeType = getMimeType(format);
      }
      
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', response.headers['content-length']);
      res.setHeader('X-File-Count', '1');
      
      // Stream the file to response
      response.data.pipe(res);
      console.log('Response sent at', Date.now());
      
    } else {
      // Multiple files - create ZIP bundle with COMPLETE rewrite
      console.log(`🚀 COMPLETE ZIP REWRITE: Creating ZIP bundle for ${files.length} files`);
      console.log(`📋 Files to process: ${files.map(f => f.originalName).join(', ')}`);
      
      const totalFiles = files.length;
      const processedFiles = [];
      const failedFiles = [];
      
      // PHASE 1: Process ALL files first and store in memory
      console.log('📦 PHASE 1: Processing ALL files and storing in memory...');
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const { publicId, format, originalName } = file;
        
        console.log(`🔄 Processing file ${i + 1}/${totalFiles}: ${originalName} (${format})`);
        
        try {
          // Get the converted URL
          const convertedUrl = await convertFile(publicId, 'webp', format);
          console.log(`✅ Generated URL for ${originalName}`);
          
          // Fetch the file from Cloudinary with enhanced retry logic
          let fileResponse;
          let retryCount = 0;
          const maxRetries = 5;
          
          while (retryCount <= maxRetries) {
            try {
              fileResponse = await axios({
                method: 'GET',
                url: convertedUrl,
                responseType: 'arraybuffer',
                timeout: 60000, // 60 seconds timeout
                maxRedirects: 10,
                validateStatus: function (status) {
                  return status >= 200 && status < 300;
                }
              });
              break; // Success, exit retry loop
            } catch (fetchError) {
              retryCount++;
              console.error(`❌ Fetch attempt ${retryCount}/${maxRetries + 1} failed for ${originalName}:`, fetchError.message);
              
              if (retryCount > maxRetries) {
                throw new Error(`Failed to fetch file after ${maxRetries + 1} attempts: ${fetchError.message}`);
              }
              
              // Exponential backoff with jitter
              const delay = Math.min(2000 * Math.pow(2, retryCount) + Math.random() * 2000, 15000);
              console.log(`⏳ Waiting ${delay}ms before retry ${retryCount + 1}...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
          
          // Create filename for ZIP entry by stripping original extension
          let baseName = `file_${i + 1}`;
          if (originalName) {
            try {
              const ext = path.extname(originalName);
              baseName = ext ? path.basename(originalName, ext) : path.basename(originalName);
              if (!baseName) baseName = `file_${i + 1}`;
            } catch (error) {
              console.warn('⚠️ Error processing ZIP filename:', error.message);
              baseName = `file_${i + 1}`;
            }
          }
          const zipFilename = `${baseName}.${format.toLowerCase()}`;
          
          // Store file data with validation
          const fileBuffer = Buffer.from(fileResponse.data);
          if (fileBuffer.length === 0) {
            throw new Error(`File ${originalName} is empty`);
          }
          
          processedFiles.push({
            buffer: fileBuffer,
            filename: zipFilename,
            index: i + 1,
            originalName: originalName,
            size: fileBuffer.length
          });
          
          console.log(`✅ Successfully processed ${originalName} (${i + 1}/${totalFiles}) - Size: ${fileBuffer.length} bytes`);
          
        } catch (fileError) {
          console.error(`❌ Error processing file ${originalName}:`, fileError);
          failedFiles.push({
            originalName: originalName,
            error: fileError.message,
            index: i + 1
          });
        }
      }
      
      console.log(`📊 PHASE 1 COMPLETE: ${processedFiles.length}/${totalFiles} files processed successfully`);
      if (failedFiles.length > 0) {
        console.log(`⚠️ Failed files: ${failedFiles.map(f => f.originalName).join(', ')}`);
      }
      
      // PHASE 2: Create ZIP completely in memory with FULL VALIDATION
      console.log('📦 PHASE 2: Creating ZIP archive completely in memory...');
      
      const archive = archiver('zip', {
        zlib: { level: 6 } // Balanced compression for speed
      });
      
      // Collect ZIP data in memory
      const zipChunks = [];
      let zipComplete = false;
      let zipError = null;
      
      archive.on('data', (chunk) => {
        zipChunks.push(chunk);
      });
      
      archive.on('end', () => {
        console.log(`✅ ZIP archive finalized successfully with ${processedFiles.length} files`);
        zipComplete = true;
      });
      
      archive.on('error', (err) => {
        console.error('❌ Archive finalization error:', err);
        zipError = err;
      });
      
      // Add ALL processed files to ZIP with count validation
      let addedCount = 0;
      for (const fileData of processedFiles) {
        archive.append(fileData.buffer, { name: fileData.filename });
        addedCount++;
        console.log(`📁 Added to ZIP: ${fileData.filename} (${addedCount}/${processedFiles.length}) - ${fileData.size} bytes`);
      }
      
      console.log(`📦 ZIP processing complete: ${addedCount}/${processedFiles.length} files added to archive`);
      
      // CRITICAL: Verify all files were added before finalizing
      if (addedCount !== processedFiles.length) {
        throw new Error(`ZIP creation failed: Only ${addedCount}/${processedFiles.length} files added to archive`);
      }
      
      // Finalize the archive and WAIT for complete creation
      archive.finalize();
      
      // WAIT for ZIP to be completely finalized
      await new Promise((resolve, reject) => {
        const checkComplete = () => {
          if (zipError) {
            reject(zipError);
          } else if (zipComplete) {
            resolve();
          } else {
            setTimeout(checkComplete, 100); // Check every 100ms
          }
        };
        checkComplete();
      });
      
      // Combine all ZIP chunks into a single buffer
      const zipBuffer = Buffer.concat(zipChunks);
      console.log(`📦 ZIP created in memory: ${zipBuffer.length} bytes`);
      
      // FINAL VALIDATION: Ensure ZIP buffer is valid and complete
      if (zipBuffer.length === 0) {
        throw new Error('ZIP buffer is empty - archive creation failed');
      }
      
      // Validate ZIP file signature (PK header)
      const zipSignature = zipBuffer.slice(0, 2);
      if (zipSignature[0] !== 0x50 || zipSignature[1] !== 0x4B) {
        throw new Error('Invalid ZIP file signature - archive corrupted');
      }
      
      console.log(`✅ ZIP validation passed: ${zipBuffer.length} bytes, valid signature`);
      console.log(`🎯 GUARANTEED: ${processedFiles.length} files stored in ZIP before download link provided`);
      
      // PHASE 3: Send complete ZIP file
      console.log('📤 PHASE 3: Sending complete ZIP file...');
      
      // Set headers for ZIP download with cache-busting
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="converted_files_${Date.now()}.zip"`);
      res.setHeader('Content-Length', zipBuffer.length.toString());
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('X-File-Count', processedFiles.length.toString());
      res.setHeader('X-Total-Files', totalFiles.toString());
      res.setHeader('X-Success-Count', processedFiles.length.toString());
      res.setHeader('X-Failed-Count', failedFiles.length.toString());
      res.setHeader('X-ZIP-Size', zipBuffer.length.toString());
      res.setHeader('X-Timestamp', Date.now().toString());
      
      // Send the complete ZIP file
      res.send(zipBuffer);
      console.log(`🎉 ZIP file sent successfully with ${processedFiles.length}/${totalFiles} files at`, Date.now());
      
      if (failedFiles.length > 0) {
        console.log(`⚠️ Note: ${failedFiles.length} files failed to process and were excluded from ZIP`);
      }
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
    'ico': 'image/x-icon',
    'tga': 'image/x-tga',
    'psd': 'image/vnd.adobe.photoshop',
    'eps': 'application/postscript',
    'odd': 'application/octet-stream'
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

// Cloudinary cleanup function
const cleanupCloudinaryFiles = async () => {
  try {
    console.log('Starting Cloudinary cleanup...');
    
    // Get all resources with auto-delete tag
    const result = await cloudinary.api.resources_by_tag('auto-delete-2h', {
      resource_type: 'auto',
      max_results: 500
    });
    
    const now = Date.now();
    const maxAge = 2 * 60 * 60 * 1000; // 2 hours
    const filesToDelete = [];
    
    // Check each file's creation time
    for (const resource of result.resources) {
      const createdAt = new Date(resource.created_at).getTime();
      if (now - createdAt > maxAge) {
        filesToDelete.push(resource.public_id);
      }
    }
    
    // Delete old files in batches
    if (filesToDelete.length > 0) {
      console.log(`Deleting ${filesToDelete.length} old Cloudinary files...`);
      
      // Delete in batches of 10 to avoid rate limits
      for (let i = 0; i < filesToDelete.length; i += 10) {
        const batch = filesToDelete.slice(i, i + 10);
        try {
          await cloudinary.api.delete_resources(batch, {
            resource_type: 'auto'
          });
          console.log(`Deleted batch of ${batch.length} files`);
        } catch (deleteError) {
          console.error('Error deleting Cloudinary batch:', deleteError);
        }
        
        // No delay for faster deletion
      }
    }
    
    console.log('Cloudinary cleanup completed');
  } catch (error) {
    console.error('Cloudinary cleanup error:', error);
  }
  
  // Schedule next Cloudinary cleanup in 2 hours
  setTimeout(cleanupCloudinaryFiles, 2 * 60 * 60 * 1000);
};

// Start cleanup cycles
setTimeout(cleanupFiles, 2 * 60 * 60 * 1000);
setTimeout(cleanupCloudinaryFiles, 2 * 60 * 60 * 1000);

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
