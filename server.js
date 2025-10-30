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
const http = require('http');
const https = require('https');
const archiver = require('archiver');
require('dotenv').config({ path: './config.env' });

// Usage tracking for rate limiting
const usageTracker = new Map();
const DAILY_LIMIT = 2 * 1024 * 1024 * 1024; // 2GB in bytes

const app = express();
// Keep-Alive agents for faster Cloudinary GETs over HTTPS
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 50, keepAliveMsecs: 10000 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 50, keepAliveMsecs: 10000 });
const axiosKA = axios.create({ httpAgent, httpsAgent });
const PORT = process.env.PORT || 3000;

// Validate downloaded image buffer by simple magic-bytes + size checks
function isLikelyValidImage(buffer, expectedExt) {
  if (!buffer || buffer.length < 32) return false; // too small to be valid
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
  // WebP (RIFF....WEBP)
  if (ext === 'webp') {
    return b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;
  }
  // BMP
  if (ext === 'bmp') {
    // BMP must start with 'BM' and contain at least the 54-byte header
    if (b.length < 54) return false;
    return b[0] === 0x42 && b[1] === 0x4D;
  }
  // TIFF (II*\0 or MM\0*)
  if (ext === 'tiff' || ext === 'tif') {
    const ii = b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2A && b[3] === 0x00;
    const mm = b[0] === 0x4D && b[1] === 0x4D && b[2] === 0x00 && b[3] === 0x2A;
    return ii || mm;
  }
  // Fallback: basic size check to avoid HTML error pages
  return buffer.length > 1024;
}

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
    // no-HEAD: return URL directly; GET fetch will validate
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
      // --- MARKET-LEVEL INSTANT ZIP (NO HEAD IN ZIP PHASE) ---
      console.log(`🚀 MARKET ZIP: ${files.length} files (ultrafast mode)`);
      // Tracks and generates unique ZIP entry names before fetch
      const usedNames = new Map();
      const safeName = (base, ext) => {
        const candidate = `${base}${ext}`;
        if (!usedNames.has(candidate)) { usedNames.set(candidate, 1); return candidate; }
        let n = usedNames.get(candidate); let unique;
        do { unique = `${base}_${n}${ext}`; n++; } while (usedNames.has(unique));
        usedNames.set(candidate, n); usedNames.set(unique, 1); return unique;
      };
      // --- Pre-generate all filenames first for no race!
      const fileDescs = files.map((file, k) => {
        const idx = k + 1;
        const ext = '.' + file.format.toLowerCase();
        let base = file.originalName? (()=>{try{
          const e = path.extname(file.originalName);
          let b = e ? path.basename(file.originalName, e) : path.basename(file.originalName);
          return b || `file_${idx}`;
        }catch{ return `file_${idx}`;}})() : `file_${idx}`;
        return {
          ...file,
          idx, origExt: ext, base, zipName: safeName(base, ext)
        };
      });
      // --- Parallel GET, no HEAD, direct to convertedUrl if available, max 3 attempts ---
      const fetchPromises = fileDescs.map(async (f) => {
        const fetchUrl = f.convertedUrl ? f.convertedUrl : await convertFile(f.publicId, f.format, f.format);
        let lastErr, resp;
        for(let i=0;i<3;i++){
          try {
            resp = await axiosKA({ method: 'GET', url: fetchUrl, responseType: 'arraybuffer', timeout: 20000, maxRedirects: 5, validateStatus: s => s>=200&&s<300 });
            if (!resp.data || resp.data.length === 0) throw new Error('File buffer empty');
            const buf = Buffer.from(resp.data);
            // Validate buffer content (magic bytes/size) for the target ext
            const ext = (f.origExt || '.png').slice(1);
            const validateExt = (f.format && SPECIAL_FORMATS.includes(String(f.format).toUpperCase())) ? 'png' : ext;
            if (!isLikelyValidImage(buf, validateExt)) throw new Error('File buffer failed validation');
            return { zipName: f.zipName, index: f.idx, buffer: buf, size: buf.length, originalName: f.originalName };
          } catch (e) { lastErr = e; if (i<2) await new Promise(r=>setTimeout(r,200)); }
        }
        throw new Error(`ZIP fetch failed: ${f.zipName} | ${lastErr && lastErr.message}`);
      });
      let got;
      try { got = await Promise.all(fetchPromises); }
      catch(err){
        console.error('ZIP download error:', err);
        if (!res.headersSent) return res.status(500).json({ error: err.message||'ZIP fetch failed' });
        return;
      }
      // --- In-memory ZIP, compression level 1 ---
      const archive = archiver('zip', { zlib: { level: 1 } });
      const chunks = [];
      archive.on('data', chunk => chunks.push(chunk));
      let zipComplete = false, zipErr = null;
      archive.on('end', ()=>zipComplete=true);
      archive.on('error', err =>zipErr=err);
      let fileN = 0;
      for(const fileObj of got.sort((a,b)=>a.index-b.index)){
        archive.append(fileObj.buffer, { name: fileObj.zipName });
        fileN++;
        console.log(`📁 Added: ${fileObj.zipName} (${fileN}/${got.length}) - ${fileObj.size} bytes`);
      }
      archive.finalize();
      // Await archive in-memory finish
      await new Promise((resolve, reject)=>{
        const wait = ()=>zipErr?reject(zipErr):zipComplete?resolve():setTimeout(wait,50);
        wait();
      });
      const zipBuf = Buffer.concat(chunks);
      if(zipBuf.length===0) return res.status(500).json({ error: 'ZIP buffer empty' });
      // --- Now response! ---
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="converted_files_${Date.now()}.zip"`);
      res.setHeader('Content-Length', zipBuf.length.toString());
      res.setHeader('X-File-Count', got.length.toString());
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache'); res.setHeader('Expires','0');
      res.send(zipBuf);
      console.log(`🎉 Market ZIP delivered: ${got.length} files, ${zipBuf.length} bytes.`);
    }
    
  } catch (error) {
    console.error('Download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Download failed' });
    }
  }
});

// === MARKET-STYLE ZIP JOB SYSTEM (IN-MEMORY, ADVANCED) ===
const crypto = require('crypto');
const zipJobs = new Map();
const randomHex = len => crypto.randomBytes(Math.ceil(len/2)).toString('hex').slice(0,len);

// Create ZIP job - returns jobId, starts async ZIP process
app.post('/api/zip-job', async (req, res) => {
  try {
    const { files } = req.body;
    if (!files || !Array.isArray(files) || files.length === 0)
      return res.status(400).json({ error: 'No files provided' });
    // Only allow "reasonable" jobs
    if (files.length > 50) return res.status(400).json({ error: 'Too many files (limit 50)' });

    const jobId = Date.now() + '-' + randomHex(8);
    const job = {
      jobId, status: 'queued', percent: 0, error: null, ready: false, total: files.length,
      downloadCount: 0, // Track for cleanup
      result: null, // { buf, zipName, count }
      createdAt: Date.now(),
      files,
    };
    zipJobs.set(jobId, job);

    zipJobWorker(jobId); // Start job async (does NOT block response)

    res.json({ jobId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Poll ZIP job status
app.get('/api/zip-status', (req, res) => {
  const { jobId } = req.query;
  if (!jobId || !zipJobs.has(jobId))
    return res.status(404).json({ error: 'Job not found' });
  const job = zipJobs.get(jobId);
  const ret = {
    jobId, status: job.status, percent: job.percent,
    error: job.error, ready: !!job.ready, total: job.total, downloadCount: job.downloadCount
  };
  if (job.ready && job.result)
    ret.zipName = job.result.zipName;
  res.json(ret);
});

// Download ZIP file (triggers browser progress bar)
app.get('/api/zip-file', (req, res) => {
  const { jobId } = req.query;
  if (!jobId || !zipJobs.has(jobId)) return res.status(404).json({ error: 'Job not found' });
  const job = zipJobs.get(jobId);
  if (!job.ready || !job.result) return res.status(400).json({ error: 'ZIP not ready' });
  job.downloadCount++;
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${job.result.zipName}"`);
  res.setHeader('Content-Length', job.result.buf.length.toString());
  res.setHeader('X-File-Count', job.result.count.toString());
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache'); res.setHeader('Expires','0');
  res.send(job.result.buf);
});

// Async worker for ZIP jobs
async function zipJobWorker(jobId) {
  const job = zipJobs.get(jobId);
  if (!job) return;
  job.status = 'processing';
  job.percent = 0;
  job.error = null;
  let cancel = false;
  try {
    // Paranoia: Defensive copy
    const files = Array.isArray(job.files) ? job.files.slice() : [];
    // --- Deduplication ---
    const usedNames = new Map();
    const safeName = (base, ext) => {
      const candidate = `${base}${ext}`;
      if (!usedNames.has(candidate)) { usedNames.set(candidate, 1); return candidate; }
      let n = usedNames.get(candidate); let unique;
      do { unique = `${base}_${n}${ext}`; n++; } while (usedNames.has(unique));
      usedNames.set(candidate, n); usedNames.set(unique, 1); return unique;
    };
    // Pre-generate ZIP names
    const fileDescs = files.map((f, k) => {
      const idx = k+1;
      const ext = '.' + f.format.toLowerCase();
      let base = f.originalName ? (()=>{try{
        const e = path.extname(f.originalName);
        let b = e ? path.basename(f.originalName, e) : path.basename(f.originalName);
        return b || `file_${idx}`;
      }catch{ return `file_${idx}`;}})() : `file_${idx}`;
      return { ...f, idx, origExt: ext, base, zipName: safeName(base, ext) };
    });
    // --- Fetch in parallel --
    let fileCount = fileDescs.length;
    let got = [];
    let done = 0;
    function updatePercent() {
      job.percent = Math.round((done/fileCount)*98);
    }
    const fetchPromises = fileDescs.map(async (f) => {
      const fetchUrl = f.convertedUrl ? f.convertedUrl : await convertFile(f.publicId, f.format, f.format);
      let lastErr, resp;
      for(let i=0;i<3;i++){
        try {
          resp = await axiosKA({ method: 'GET', url: fetchUrl, responseType: 'arraybuffer', timeout: 20000, maxRedirects: 5, validateStatus: s => s>=200&&s<300 });
          if (!resp.data || resp.data.length === 0) throw new Error('File buffer empty');
          const buf = Buffer.from(resp.data);
          // Buffer validation
          const ext = (f.origExt || '.png').slice(1);
          const validateExt = (f.format && SPECIAL_FORMATS.includes(String(f.format).toUpperCase())) ? 'png' : ext;
          if (!isLikelyValidImage(buf, validateExt)) throw new Error('File buffer failed validation');
          got.push({ zipName: f.zipName, index: f.idx, buffer: buf, size: buf.length, originalName: f.originalName });
          break;
        } catch (e) { lastErr = e; if (i<2) await new Promise(r=>setTimeout(r,200)); }
      }
      done++;
      updatePercent();
      if (!resp || !resp.data) throw new Error(`ZIP fetch failed: ${f.zipName} | ${lastErr && lastErr.message}`);
      return true;
    });
    // Wait for all fetches
    let fetchRes;
    try {
      fetchRes = await Promise.all(fetchPromises);
      job.percent = 98; // Safe
    }catch(err){
      job.status = 'error';
      job.error = 'File fetch failed: ' + (err && err.message ? err.message : 'Unknown');
      job.ready = false;
      return;
    }
    // --- ZIP creation ---
    job.status = 'zipping';
    job.percent = 99;
    const archive = archiver('zip', { zlib: { level: 1 } });
    const chunks = [];
    archive.on('data', chunk => chunks.push(chunk));
    let zipComplete = false, zipErr = null;
    archive.on('end', ()=>zipComplete=true);
    archive.on('error', err =>zipErr=err);
    for(const fileObj of got.sort((a,b)=>a.index-b.index)){
      archive.append(fileObj.buffer, { name: fileObj.zipName });
    }
    archive.finalize();
    await new Promise((resolve, reject)=>{
      const wait = ()=>zipErr?reject(zipErr):zipComplete?resolve():setTimeout(wait,50);
      wait();
    });
    const zipBuf = Buffer.concat(chunks);
    if(zipBuf.length===0){
      job.status='error'; job.error='ZIP buffer empty';
      job.ready=false; return;
    }
    // ZIP ready!
    job.status = 'ready';
    job.ready = true;
    job.percent = 100;
    job.result = {
      buf: zipBuf,
      zipName: `converted_files_${jobId}.zip`,
      count: got.length,
    };
  } catch (err) {
    job.status = 'error';
    job.error = err.message || 'Unknown error';
    job.ready = false;
  }
}
// ---
// Schedule auto cleanup every hour to free old ZIPs
global.setInterval(()=>{
  const now = Date.now();
  for(const [jobId, job] of zipJobs.entries()){
    if((job.ready && job.downloadCount>0 && now-job.createdAt > 2*60*60*1000) || (now-job.createdAt > 4*60*60*1000)){
      zipJobs.delete(jobId);
    }
  }
}, 60*60*1000);

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
