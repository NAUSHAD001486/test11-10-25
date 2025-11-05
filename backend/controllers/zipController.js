// ZIP Controller - Handle ZIP job creation and status
const crypto = require('crypto');
const zipJobs = new Map();
const { convertFile, SPECIAL_FORMATS } = require('../utils/cloudinary');
const { isLikelyValidImage } = require('../utils/fileValidation');
const axiosKA = require('../utils/axiosKA');
const archiver = require('archiver');
const path = require('path');

const randomHex = len => crypto.randomBytes(Math.ceil(len/2)).toString('hex').slice(0, len);

// Create ZIP job
const createZipJob = async (req, res) => {
  try {
    const { files } = req.body;
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }
    if (files.length > 50) {
      return res.status(400).json({ error: 'Too many files (limit 50)' });
    }

    const usageTracker = require('../utils/usageTracker');
    if (req.usageTracker && req.usageTracker.usage.bytes >= usageTracker.DAILY_LIMIT) {
      return res.status(429).json({
        error: 'Daily usage limit reached',
        message: 'You have reached your daily conversion limit of 2GB. Please try again tomorrow.'
      });
    }

    const jobId = Date.now() + '-' + randomHex(8);
    const job = {
      jobId, status: 'queued', percent: 0, error: null, ready: false, total: files.length,
      downloadCount: 0,
      result: null,
      createdAt: Date.now(),
      files,
    };
    zipJobs.set(jobId, job);

    zipJobWorker(jobId);

    res.json({ jobId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get ZIP status
const getZipStatus = (req, res) => {
  const { jobId } = req.query;
  if (!jobId || !zipJobs.has(jobId)) {
    return res.status(404).json({ error: 'Job not found' });
  }
  const job = zipJobs.get(jobId);
  const ret = {
    jobId, status: job.status, percent: job.percent,
    error: job.error, ready: !!job.ready, total: job.total, downloadCount: job.downloadCount
  };
  if (job.ready && job.result) {
    ret.zipName = job.result.zipName;
  }
  res.json(ret);
};

// Download ZIP file
const downloadZipFile = (req, res) => {
  const { jobId } = req.query;
  if (!jobId || !zipJobs.has(jobId)) {
    return res.status(404).json({ error: 'Job not found' });
  }
  const job = zipJobs.get(jobId);
  if (!job.ready || !job.result) {
    return res.status(400).json({ error: 'ZIP not ready' });
  }
  job.downloadCount++;
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${job.result.zipName}"`);
  res.setHeader('Content-Length', job.result.buf.length.toString());
  res.setHeader('X-File-Count', job.result.count.toString());
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.send(job.result.buf);
};

// ZIP job worker
async function zipJobWorker(jobId) {
  const job = zipJobs.get(jobId);
  if (!job) return;
  job.status = 'processing';
  job.percent = 0;
  job.error = null;
  
  try {
    const files = Array.isArray(job.files) ? job.files.slice() : [];
    
    // Fixed: Improved same-name handling with unique index tracking
    const usedNames = new Map();
    const safeName = (base, ext, fileIndex) => {
      // Clean base name (remove special characters that might cause issues)
      const cleanBase = base.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 100); // Limit length
      const candidate = `${cleanBase}${ext}`;
      
      if (!usedNames.has(candidate)) { 
        usedNames.set(candidate, { count: 1, index: fileIndex }); 
        return candidate; 
      }
      
      // File with same name exists - create unique name
      const existing = usedNames.get(candidate);
      let n = existing.count;
      let unique;
      
      do { 
        unique = `${cleanBase}_${n}${ext}`; 
        n++; 
      } while (usedNames.has(unique));
      
      // Track both the original and the new unique name
      usedNames.set(candidate, { count: n, index: existing.index });
      usedNames.set(unique, { count: 1, index: fileIndex });
      
      return unique;
    };
    
    const fileDescs = files.map((f, k) => {
      const idx = k + 1;
      const ext = '.' + f.format.toLowerCase();
      let base = f.originalName ? (() => {
        try {
          const e = path.extname(f.originalName);
          let b = e ? path.basename(f.originalName, e) : path.basename(f.originalName);
          return b || `file_${idx}`;
        } catch { return `file_${idx}`; }
      })() : `file_${idx}`;
      // Fixed: Pass file index to safeName for better tracking
      return { ...f, idx, origExt: ext, base, zipName: safeName(base, ext, idx) };
    });
    
    let fileCount = fileDescs.length;
    let got = [];
    let done = 0;
    
    function updatePercent() {
      if (fileCount > 0) {
        job.percent = Math.round((done / fileCount) * 98);
      }
    }
    
    // Fixed: Process all files in parallel with Promise.allSettled (no files missed)
    // Use allSettled instead of all to ensure all files are processed even if some fail
    const fetchPromises = fileDescs.map(async (f) => {
      try {
        const fetchUrl = f.convertedUrl ? f.convertedUrl : await convertFile(f.publicId, f.format, f.format);
        let lastErr, resp;
        
        // Optimized retry with exponential backoff (3 attempts, faster retries)
        for (let i = 0; i < 3; i++) {
          try {
            // Reduced timeout from 20s to 15s for faster failure detection
            resp = await axiosKA({ 
              method: 'GET', 
              url: fetchUrl, 
              responseType: 'arraybuffer', 
              timeout: 15000, // Reduced from 20000
              maxRedirects: 5, 
              validateStatus: s => s >= 200 && s < 300 
            });
            
            if (!resp.data || resp.data.length === 0) throw new Error('File buffer empty');
            const buf = Buffer.from(resp.data);
            const ext = (f.origExt || '.png').slice(1);
            const validateExt = (f.format && SPECIAL_FORMATS.includes(String(f.format).toUpperCase())) ? 'png' : ext;
            if (!isLikelyValidImage(buf, validateExt)) throw new Error('File buffer failed validation');
            
            // Success: Add to got array
            got.push({ zipName: f.zipName, index: f.idx, buffer: buf, size: buf.length, originalName: f.originalName });
            done++;
            updatePercent();
            return { success: true, file: f, data: { zipName: f.zipName, index: f.idx, buffer: buf, size: buf.length, originalName: f.originalName } };
          } catch (e) { 
            lastErr = e; 
            // Exponential backoff: 100ms, 200ms
            if (i < 2) await new Promise(r => setTimeout(r, 100 * (i + 1))); 
          }
        }
        
        // If all retries failed, return failure (don't throw - use allSettled)
        done++;
        updatePercent();
        return { success: false, file: f, error: `ZIP fetch failed: ${f.zipName} | ${lastErr && lastErr.message}` };
      } catch (err) {
        // Catch any unexpected errors
        done++;
        updatePercent();
        return { success: false, file: f, error: err.message || 'Unknown error' };
      }
    });
    
    // Fixed: Use Promise.allSettled to process ALL files, even if some fail
    const results = await Promise.allSettled(fetchPromises);
    
    // Process results: separate successful and failed files
    const failedFiles = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const fileResult = result.value;
        if (fileResult.success) {
          // File already added to got array in the promise
          // Double-check: ensure it's in got array
          const exists = got.find(g => g.index === fileResult.data.index && g.zipName === fileResult.data.zipName);
          if (!exists) {
            got.push(fileResult.data);
          }
        } else {
          // Failed file - track for logging
          failedFiles.push({
            zipName: fileResult.file.zipName,
            originalName: fileResult.file.originalName,
            error: fileResult.error
          });
        }
      } else {
        // Promise rejected - this shouldn't happen but handle it
        failedFiles.push({
          zipName: fileDescs[index]?.zipName || 'unknown',
          originalName: fileDescs[index]?.originalName || 'unknown',
          error: result.reason?.message || 'Promise rejected'
        });
      }
    });
    
    // Log failed files for debugging
    if (failedFiles.length > 0) {
      const logger = require('../logger');
      logger.warn(`ZIP job ${jobId}: ${failedFiles.length} files failed to fetch`, { failedFiles });
    }
    
    // Check if we have any successful files
    if (got.length === 0) {
      job.status = 'error';
      job.error = 'All files failed to fetch. Please try again.';
      job.ready = false;
      return;
    }
    
    // If some files failed but we have successful ones, continue with partial success
    if (failedFiles.length > 0) {
      job.partialSuccess = true;
      job.failedFiles = failedFiles;
    }
    
    job.percent = 98;
    
    job.status = 'zipping';
    job.percent = 99;
    // Optimized: Level 1 compression for fastest ZIP creation (already optimal)
    const archive = archiver('zip', { zlib: { level: 1 }, store: false });
    const chunks = [];
    archive.on('data', chunk => chunks.push(chunk));
    let zipComplete = false, zipErr = null;
    archive.on('end', () => zipComplete = true);
    archive.on('error', err => zipErr = err);
    
    // Fixed: Sort by index and verify all files are included before appending
    const sortedFiles = got.sort((a, b) => a.index - b.index);
    
    // Verify we have files in order and append only valid buffers
    let filesAdded = 0;
    for (const fileObj of sortedFiles) {
      // Double-check buffer exists and is valid
      if (fileObj.buffer && Buffer.isBuffer(fileObj.buffer) && fileObj.buffer.length > 0) {
        archive.append(fileObj.buffer, { name: fileObj.zipName });
        filesAdded++;
      } else {
        // Log warning but continue with other files
        const logger = require('../logger');
        logger.warn(`ZIP job ${jobId}: File ${fileObj.zipName} (index ${fileObj.index}) has invalid buffer, skipping`);
      }
    }
    
    // Log final file count for verification
    const logger = require('../logger');
    logger.info(`ZIP job ${jobId}: Added ${filesAdded} files to ZIP (expected: ${fileCount}, got: ${got.length}, sorted: ${sortedFiles.length})`);
    
    archive.finalize();
    
    await new Promise((resolve, reject) => {
      const wait = () => zipErr ? reject(zipErr) : zipComplete ? resolve() : setTimeout(wait, 50);
      wait();
    });
    
    const zipBuf = Buffer.concat(chunks);
    if (zipBuf.length === 0) {
      job.status = 'error';
      job.error = 'ZIP buffer empty';
      job.ready = false;
      return;
    }
    
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

// Auto cleanup
global.setInterval(() => {
  const now = Date.now();
  for (const [jobId, job] of zipJobs.entries()) {
    if ((job.ready && job.downloadCount > 0 && now - job.createdAt > 2 * 60 * 60 * 1000) || (now - job.createdAt > 4 * 60 * 60 * 1000)) {
      zipJobs.delete(jobId);
    }
  }
}, 60 * 60 * 1000);

module.exports = {
  createZipJob,
  getZipStatus,
  downloadZipFile
};

