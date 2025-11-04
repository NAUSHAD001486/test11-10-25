// Usage tracker - In-memory Map for daily usage per IP
const usageTracker = new Map();
const DAILY_LIMIT = 2 * 1024 * 1024 * 1024; // 2GB in bytes

module.exports = usageTracker;
module.exports.DAILY_LIMIT = DAILY_LIMIT;

