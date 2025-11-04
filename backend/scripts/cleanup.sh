#!/bin/bash
# Daily cleanup script - Runs independently of Node.js process
# This script should be added to crontab for reliable cleanup

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
LOGS_DIR="$BACKEND_DIR/logs"

# Ensure logs directory exists
mkdir -p "$LOGS_DIR"

# Reset daily usage (via API endpoint - if available)
# curl -X POST http://localhost:3000/api/admin/reset-usage 2>/dev/null

# Cleanup old files in uploads directory (older than 1 day)
if [ -d "$BACKEND_DIR/uploads" ]; then
    find "$BACKEND_DIR/uploads" -type f -mtime +1 -delete 2>/dev/null
    echo "$(date): Cleaned up old files in uploads directory" >> "$LOGS_DIR/cleanup.log"
fi

# Cleanup old log files (older than 7 days)
if [ -d "$LOGS_DIR" ]; then
    find "$LOGS_DIR" -type f -name "*.log" -mtime +7 -delete 2>/dev/null
    echo "$(date): Cleaned up old log files" >> "$LOGS_DIR/cleanup.log"
fi

# Log cleanup completion
echo "$(date): Cleanup completed successfully" >> "$LOGS_DIR/cleanup.log"

