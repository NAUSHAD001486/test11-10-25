// API Routes
const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const { validateFile } = require('../utils/fileValidation');
const trackUsage = require('../middleware/trackUsage');
const { uploadFromDevice, uploadFromUrl } = require('../controllers/uploadController');
const { convertFiles } = require('../controllers/convertController');
const { downloadFiles } = require('../controllers/downloadController');
const usageTracker = require('../utils/usageTracker');

// Multer configuration
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

// Usage check endpoint
router.get('/usage', (req, res) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  const today = new Date().toDateString();
  const key = `${clientIP}-${today}`;
  
  const usage = usageTracker.get(key) || { bytes: 0, lastReset: Date.now() };
  const usedGB = (usage.bytes / (1024 * 1024 * 1024)).toFixed(2);
  const remainingGB = ((usageTracker.DAILY_LIMIT - usage.bytes) / (1024 * 1024 * 1024)).toFixed(2);
  
  res.json({
    used: `${usedGB}GB`,
    remaining: `${remainingGB}GB`,
    limit: '2GB',
    percentage: Math.round((usage.bytes / usageTracker.DAILY_LIMIT) * 100),
    resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  });
});

// Upload routes
router.post('/upload/device', trackUsage, upload.array('files', 10), uploadFromDevice);
router.post('/upload/url', trackUsage, uploadFromUrl);

// Convert route
router.post('/convert', trackUsage, convertFiles);

// Download route
router.post('/download', downloadFiles);

// ZIP job routes (from original server.js - keep for compatibility)
const { createZipJob, getZipStatus, downloadZipFile } = require('../controllers/zipController');

router.post('/zip-job', trackUsage, createZipJob);
router.get('/zip-status', getZipStatus);
router.get('/zip-file', downloadZipFile);

// Contact form route
const { sendContactEmail } = require('../controllers/contactController');
router.post('/contact', sendContactEmail);

module.exports = router;

