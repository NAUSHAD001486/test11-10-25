# Love U Convert - WebP to PNG Converter

A modern, fast, and secure WebP to PNG converter with PWA support. Convert images between various formats including WebP, PNG, JPEG, GIF, and more.

## Features

- 🚀 **Fast Conversion**: Powered by Cloudinary's advanced image processing
- 📱 **PWA Support**: Install as a web app on any device
- 🔒 **Secure**: Server-side processing with secure API handling
- 📱 **Responsive**: Works perfectly on mobile, tablet, and desktop
- 🎨 **Modern UI**: Clean, minimal design with smooth animations
- ⚡ **Multiple Sources**: Upload from device, URL, or cloud storage
- 🛡️ **File Validation**: Secure file type and size validation
- 🔄 **Batch Processing**: Convert multiple files at once
- 📊 **Progress Tracking**: Real-time conversion progress
- 🧹 **Auto Cleanup**: Automatic file cleanup after 2 hours

## Supported Formats

### Input Formats
- PNG, JPEG, JPG, WebP, GIF, BMP, SVG, TIFF, ICO, EPS, PSD, TGA

### Output Formats
- PNG, BMP, EPS, GIF, ICO, JPEG, JPG, ODD, SVG, PSD, TGA, TIFF, WebP

## Installation

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Cloudinary account

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd love-u-convert
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Copy the `config.env` file and update with your Cloudinary credentials:
   ```bash
   cp config.env .env
   ```
   
   Update the following variables in your `.env` file:
   ```env
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   npm start
   ```

## Deployment

### Hostinger Deployment

1. **Upload files to Hostinger**
   - Upload all files to your domain's public_html directory
   - Ensure Node.js is enabled in your Hostinger control panel

2. **Configure environment variables**
   - Set up your environment variables in Hostinger's control panel
   - Or create a `.env` file in your project root

3. **Install dependencies**
   ```bash
   npm install --production
   ```

4. **Start the application**
   ```bash
   npm start
   ```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name | Required |
| `CLOUDINARY_API_KEY` | Your Cloudinary API key | Required |
| `CLOUDINARY_API_SECRET` | Your Cloudinary API secret | Required |
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | production |
| `MAX_FILE_SIZE` | Maximum file size in bytes | 2147483648 (2GB) |
| `CLEANUP_INTERVAL_HOURS` | File cleanup interval | 2 |

## API Endpoints

### Upload from Device
```
POST /api/upload/device
Content-Type: multipart/form-data
Body: files (multipart files)
```

### Upload from URL
```
POST /api/upload/url
Content-Type: application/json
Body: { "url": "https://example.com/image.webp" }
```

### Convert Files
```
POST /api/convert
Content-Type: application/json
Body: {
  "files": [{"publicId": "file_id", "format": "webp"}],
  "targetFormat": "png"
}
```

### Download Converted File
```
GET /api/download/:publicId/:format
```

## Security Features

- ✅ HTTPS enforcement
- ✅ HSTS headers
- ✅ Rate limiting
- ✅ File type validation
- ✅ File size limits
- ✅ CORS protection
- ✅ Helmet.js security headers
- ✅ Input sanitization
- ✅ Secure API key handling

## PWA Features

- 📱 Installable on any device
- 🔄 Offline support for UI
- 📊 Background sync
- 🔔 Push notifications (ready)
- 📱 App shortcuts
- 🎨 Custom splash screens

## Browser Support

- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+
- ✅ Mobile browsers

## Performance

- ⚡ Fast image processing via Cloudinary
- 📦 Optimized bundle size
- 🖼️ Lazy loading
- 💾 Efficient caching
- 📱 Mobile-optimized

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support, email support@loveuconvert.com or create an issue in the repository.

## Changelog

### v1.0.0
- Initial release
- WebP to PNG conversion
- PWA support
- Multiple file format support
- Secure file handling
- Responsive design
