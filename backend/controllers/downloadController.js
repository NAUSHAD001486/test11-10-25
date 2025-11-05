// Download Controller - Handle file downloads
const { convertFile, SPECIAL_FORMATS } = require('../utils/cloudinary');
const { getMimeType } = require('../utils/fileValidation');
const axios = require('axios');
const path = require('path');
const archiver = require('archiver');
const axiosKA = require('../utils/axiosKA');

// Download single file
const downloadSingleFile = async (req, res, file) => {
  const { publicId, format, originalName } = file;
  
  // Get the converted URL with fallback
  let convertedUrl;
  try {
    convertedUrl = await convertFile(publicId, 'webp', format);
  } catch (conversionError) {
    console.warn(`Conversion failed, using original file: ${conversionError.message}`);
    const cloudinary = require('cloudinary').v2;
    convertedUrl = cloudinary.url(publicId, { quality: 'auto' });
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
        timeout: 20000
      });
      break;
    } catch (fetchError) {
      retryCount++;
      if (retryCount > maxRetries) {
        throw new Error(`Failed to fetch file after ${maxRetries + 1} attempts: ${fetchError.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
    }
  }
  
  // Generate proper filename
  let baseName = 'converted';
  if (originalName) {
    try {
      const ext = path.extname(originalName);
      baseName = ext ? path.basename(originalName, ext) : path.basename(originalName);
      if (!baseName) baseName = 'converted';
    } catch (error) {
      baseName = 'converted';
    }
  }
  
  const filename = `${baseName}.${format.toLowerCase()}`;
  const mimeType = SPECIAL_FORMATS.includes(format) ? 'image/png' : getMimeType(format);
  
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', response.headers['content-length']);
  res.setHeader('X-File-Count', '1');
  
  response.data.pipe(res);
};

// Download ZIP (multiple files)
const downloadZip = async (req, res, files) => {
  
  const usedNames = new Map();
  const safeName = (base, ext) => {
    const candidate = `${base}${ext}`;
    if (!usedNames.has(candidate)) { usedNames.set(candidate, 1); return candidate; }
    let n = usedNames.get(candidate); let unique;
    do { unique = `${base}_${n}${ext}`; n++; } while (usedNames.has(unique));
    usedNames.set(candidate, n); usedNames.set(unique, 1); return unique;
  };
  
  const fileDescs = files.map((file, k) => {
    const idx = k + 1;
    const ext = '.' + file.format.toLowerCase();
    let base = file.originalName ? (() => {
      try {
        const e = path.extname(file.originalName);
        let b = e ? path.basename(file.originalName, e) : path.basename(file.originalName);
        return b || `file_${idx}`;
      } catch { return `file_${idx}`; }
    })() : `file_${idx}`;
    return {
      ...file,
      idx, origExt: ext, base, zipName: safeName(base, ext)
    };
  });
  
  const { isLikelyValidImage } = require('../utils/fileValidation');
  
  const fetchPromises = fileDescs.map(async (f) => {
    const fetchUrl = f.convertedUrl ? f.convertedUrl : await convertFile(f.publicId, f.format, f.format);
    let lastErr, resp;
    for (let i = 0; i < 3; i++) {
      try {
        resp = await axiosKA({ method: 'GET', url: fetchUrl, responseType: 'arraybuffer', timeout: 20000, maxRedirects: 5, validateStatus: s => s >= 200 && s < 300 });
        if (!resp.data || resp.data.length === 0) throw new Error('File buffer empty');
        const buf = Buffer.from(resp.data);
        const ext = (f.origExt || '.png').slice(1);
        const validateExt = (f.format && SPECIAL_FORMATS.includes(String(f.format).toUpperCase())) ? 'png' : ext;
        if (!isLikelyValidImage(buf, validateExt)) throw new Error('File buffer failed validation');
        return { zipName: f.zipName, index: f.idx, buffer: buf, size: buf.length, originalName: f.originalName };
      } catch (e) { lastErr = e; if (i < 2) await new Promise(r => setTimeout(r, 200)); }
    }
    throw new Error(`ZIP fetch failed: ${f.zipName} | ${lastErr && lastErr.message}`);
  });
  
  let got;
  try {
    got = await Promise.all(fetchPromises);
  } catch (err) {
    console.error('ZIP download error:', err);
    if (!res.headersSent) return res.status(500).json({ error: err.message || 'ZIP fetch failed' });
    return;
  }
  
  // In-memory ZIP
  const archive = archiver('zip', { zlib: { level: 1 } });
  const chunks = [];
  archive.on('data', chunk => chunks.push(chunk));
  let zipComplete = false, zipErr = null;
  archive.on('end', () => zipComplete = true);
  archive.on('error', err => zipErr = err);
  
  for (const fileObj of got.sort((a, b) => a.index - b.index)) {
    archive.append(fileObj.buffer, { name: fileObj.zipName });
  }
  
  archive.finalize();
  
  await new Promise((resolve, reject) => {
    const wait = () => zipErr ? reject(zipErr) : zipComplete ? resolve() : setTimeout(wait, 50);
    wait();
  });
  
  const zipBuf = Buffer.concat(chunks);
  if (zipBuf.length === 0) return res.status(500).json({ error: 'ZIP buffer empty' });
  
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="converted_files_${Date.now()}.zip"`);
  res.setHeader('Content-Length', zipBuf.length.toString());
  res.setHeader('X-File-Count', got.length.toString());
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.send(zipBuf);
};

// Main download handler
const downloadFiles = async (req, res) => {
  try {
    let files;
    if (req.body.files) {
      try {
        files = typeof req.body.files === 'string' ? JSON.parse(req.body.files) : req.body.files;
      } catch (e) {
        files = req.body.files;
      }
    } else {
      files = req.body.files || req.body;
    }
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files to download' });
    }
    
    if (files.length === 1) {
      await downloadSingleFile(req, res, files[0]);
    } else {
      await downloadZip(req, res, files);
    }
  } catch (error) {
    const logger = require('../logger');
    logger.error('Download error:', { error: error.message, stack: error.stack });
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Download failed' });
    }
  }
};

module.exports = {
  downloadFiles
};

