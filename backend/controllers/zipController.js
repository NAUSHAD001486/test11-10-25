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
    
    const usedNames = new Map();
    const safeName = (base, ext) => {
      const candidate = `${base}${ext}`;
      if (!usedNames.has(candidate)) { usedNames.set(candidate, 1); return candidate; }
      let n = usedNames.get(candidate); let unique;
      do { unique = `${base}_${n}${ext}`; n++; } while (usedNames.has(unique));
      usedNames.set(candidate, n); usedNames.set(unique, 1); return unique;
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
      return { ...f, idx, origExt: ext, base, zipName: safeName(base, ext) };
    });
    
    let fileCount = fileDescs.length;
    let got = [];
    let done = 0;
    
    function updatePercent() {
      if (fileCount > 0) {
        job.percent = Math.round((done / fileCount) * 98);
      }
    }
    
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
          got.push({ zipName: f.zipName, index: f.idx, buffer: buf, size: buf.length, originalName: f.originalName });
          break;
        } catch (e) { lastErr = e; if (i < 2) await new Promise(r => setTimeout(r, 200)); }
      }
      done++;
      updatePercent();
      if (!resp || !resp.data) throw new Error(`ZIP fetch failed: ${f.zipName} | ${lastErr && lastErr.message}`);
      return true;
    });
    
    try {
      await Promise.all(fetchPromises);
      job.percent = 98;
    } catch (err) {
      job.status = 'error';
      job.error = 'File fetch failed: ' + (err && err.message ? err.message : 'Unknown');
      job.ready = false;
      return;
    }
    
    job.status = 'zipping';
    job.percent = 99;
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

