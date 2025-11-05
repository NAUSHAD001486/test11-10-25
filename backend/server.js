// Main Server File - Professional Architecture
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const cron = require('node-cron');
const fs = require('fs-extra');
const path = require('path');
const cloudinary = require('cloudinary').v2;
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// Import routes
const apiRoutes = require('./routes/api');

// Import middleware
const trackUsage = require('./middleware/trackUsage');

// Import utilities
const usageTracker = require('./utils/usageTracker');

// Cache configuration
const ENABLE_CACHE = process.env.ENABLE_CACHE === 'true' || process.env.NODE_ENV === 'production';
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

// Security middleware - Production-ready
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "http://res.cloudinary.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      connectSrc: ["'self'", "https://api.cloudinary.com", "http://api.cloudinary.com", "http://localhost:*", "http://127.0.0.1:*", "http://10.*", "http://192.168.*", "http://172.16.*"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: parseInt(process.env.HSTS_MAX_AGE) || 31536000,
    includeSubDomains: true,
    preload: true,
    force: true
  } : false,
  frameguard: { action: 'deny' },
  xssFilter: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permissionsPolicy: {
    features: {
      geolocation: ["'none'"],
      microphone: ["'none'"],
      camera: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting - Apply ONLY to API routes
const limiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 1000, // Allow 1000 requests per day
  message: {
    error: 'Daily usage limit reached',
    message: 'You have reached your daily conversion limit. Please try again tomorrow.',
    limit: '2GB per day',
    resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (req.path === '/health') return true;
    if (!req.path.startsWith('/api')) return true;
    return req.path.startsWith('/css/') || req.path.startsWith('/js/') || req.path.startsWith('/icons/') || req.path.startsWith('/images/');
  }
});
app.use('/api', limiter);

// HTTPS Enforcement (Production only)
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    const host = req.header('host') || '';
    
    if (host.includes('localhost') || 
        host.match(/^10\.\d+\.\d+\.\d+/) || 
        host.match(/^192\.168\.\d+\.\d+/) ||
        host.match(/^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+/)) {
      return next();
    }
    
    const forwardedProto = req.header('x-forwarded-proto') || req.protocol;
    if (forwardedProto !== 'https') {
      res.redirect(301, `https://${host}${req.url}`);
    } else {
      next();
    }
  });
}

// CORS configuration - Updated for frontend-backend separation
// Production: Only allow Vercel domain(s) from ALLOWED_ORIGINS
// Development: Allow localhost for local testing
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? (process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(o => o) : [process.env.FRONTEND_URL || 'https://your-vercel-domain.vercel.app'].filter(o => o))
  : ['http://localhost:3001', 'http://localhost:3000', 'http://127.0.0.1:3001', 'http://127.0.0.1:3000'];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin && process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 86400
}));

// Compression
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: function(req, res) {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Middleware: Ensure API endpoints are NEVER cached
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Routes
// Root route - Informative message for direct backend access
app.get('/', (req, res) => {
  const protocol = req.protocol || 'http';
  const host = req.get('host') || `localhost:${PORT}`;
  const frontendPort = '3001';
  const frontendUrl = `${protocol}://${host.split(':')[0]}:${frontendPort}`;
  
  res.json({
    message: 'Backend API Server',
    status: 'Running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      api: '/api',
      usage: '/api/usage',
      upload: '/api/upload/device',
      convert: '/api/convert',
      download: '/api/download'
    },
    frontend: {
      url: frontendUrl,
      message: 'Access the frontend at the URL above'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('/api', apiRoutes);

// File cleanup
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
  
  setTimeout(cleanupFiles, 2 * 60 * 60 * 1000);
};

// Cloudinary cleanup
const cleanupCloudinaryFiles = async () => {
  try {
    const result = await cloudinary.api.resources_by_tag('auto-delete-2h', {
      resource_type: 'auto',
      max_results: 500
    });
    
    const now = Date.now();
    const maxAge = 2 * 60 * 60 * 1000; // 2 hours
    const filesToDelete = [];
    
    for (const resource of result.resources) {
      const createdAt = new Date(resource.created_at).getTime();
      if (now - createdAt > maxAge) {
        filesToDelete.push(resource.public_id);
      }
    }
    
    if (filesToDelete.length > 0) {
      // Delete in batches of 10
      for (let i = 0; i < filesToDelete.length; i += 10) {
        const batch = filesToDelete.slice(i, i + 10);
        try {
          await cloudinary.api.delete_resources(batch, {
            resource_type: 'auto'
          });
        } catch (deleteError) {
          // Error handling (silent for production)
        }
      }
    }
  } catch (error) {
    // Error handling (silent for production)
  }
  
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
  });
  
  if (keysToDelete.length > 0) {
    console.log(`Daily usage reset completed. Removed ${keysToDelete.length} entries. Active users: ${usageTracker.size}`);
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  const logger = require('./logger');
  logger.error('Error:', { error: error.message, stack: error.stack, url: req.url, method: req.method });
  
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large' });
  }
  if (error.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ error: 'Too many files' });
  }
  
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  const logger = require('./logger');
  logger.info(`✅ Server running on port ${PORT}`, {
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    apiUrl: `http://localhost:${PORT}/api`,
    healthCheck: `http://localhost:${PORT}/health`
  });
});

module.exports = app;

