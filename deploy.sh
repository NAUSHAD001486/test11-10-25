#!/bin/bash

# Love U Convert - Deployment Script for Hostinger
# This script helps deploy the application to Hostinger hosting

echo "🚀 Love U Convert - Deployment Script"
echo "======================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Create uploads directory
echo "📁 Creating uploads directory..."
mkdir -p uploads

# Set proper permissions
echo "🔐 Setting permissions..."
chmod 755 uploads
chmod 644 config.env
chmod 755 server.js

# Check if config.env exists
if [ ! -f "config.env" ]; then
    echo "⚠️  config.env file not found!"
    echo "Please create config.env with your Cloudinary credentials:"
    echo ""
    echo "CLOUDINARY_CLOUD_NAME=your_cloud_name"
    echo "CLOUDINARY_API_KEY=your_api_key"
    echo "CLOUDINARY_API_SECRET=your_api_secret"
    echo "PORT=3000"
    echo "NODE_ENV=production"
    echo ""
    exit 1
fi

echo "✅ Configuration file found"

# Test server syntax
echo "🔍 Testing server syntax..."
node -c server.js

if [ $? -ne 0 ]; then
    echo "❌ Server syntax error"
    exit 1
fi

echo "✅ Server syntax is valid"

# Create PM2 ecosystem file for production
echo "📝 Creating PM2 ecosystem file..."
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'love-u-convert',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
EOF

echo "✅ PM2 ecosystem file created"

# Create startup script
echo "📝 Creating startup script..."
cat > start.sh << 'EOF'
#!/bin/bash
cd /home/u1234567/domains/yourdomain.com/public_html
npm start
EOF

chmod +x start.sh

echo "✅ Startup script created"

echo ""
echo "🎉 Deployment preparation completed!"
echo ""
echo "📋 Next steps for Hostinger deployment:"
echo "1. Upload all files to your domain's public_html directory"
echo "2. Set up your domain to point to the Node.js app"
echo "3. Configure your Cloudinary credentials in config.env"
echo "4. Start the application with: npm start"
echo ""
echo "🔧 For PM2 (recommended for production):"
echo "1. Install PM2: npm install -g pm2"
echo "2. Start with PM2: pm2 start ecosystem.config.js"
echo "3. Save PM2 config: pm2 save"
echo "4. Setup PM2 startup: pm2 startup"
echo ""
echo "📱 PWA Features:"
echo "- The app is installable on any device"
echo "- Works offline for UI components"
echo "- Optimized for mobile and desktop"
echo ""
echo "🔒 Security Features:"
echo "- HTTPS enforcement"
echo "- HSTS headers"
echo "- Rate limiting"
echo "- File validation"
echo "- Secure API handling"
echo ""
echo "✨ Your Love U Convert app is ready to deploy!"
