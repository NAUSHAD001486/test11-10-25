// Middleware: Track daily usage per IP
const usageTracker = require('../utils/usageTracker');

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
  const DAILY_LIMIT = 2 * 1024 * 1024 * 1024; // 2GB in bytes
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

module.exports = trackUsage;

