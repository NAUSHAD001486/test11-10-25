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

- ✅ **HTTPS Enforcement**: Automatic HTTP to HTTPS redirect (production)
- ✅ **HSTS Headers**: Force HTTPS for 1 year with subdomain and preload
- ✅ **SSL/TLS Encryption**: 256-bit encryption for all file transfers
- ✅ **Rate Limiting**: 1000 requests per day per IP
- ✅ **File Type Validation**: Extension + magic bytes validation
- ✅ **File Size Limits**: Max 2GB per file, 2GB daily limit per IP
- ✅ **CORS Protection**: Production domain whitelist only
- ✅ **Helmet.js Security Headers**: XSS, clickjacking, MIME-type protection
- ✅ **Input Sanitization**: Server-side validation for all inputs
- ✅ **Secure API Key Handling**: Environment variables only, never exposed

### Security & Compliance

**File Transfer Security:**
- All uploads/downloads via HTTPS encrypted channels
- Browser → Server: HTTPS encrypted
- Server → Cloudinary: HTTPS encrypted
- Files auto-deleted after 2 hours
- No persistent storage of user data

**Legal Compliance:**
- ✅ GDPR (Europe) compliant
- ✅ CCPA (California) compliant
- ✅ DPDP Act 2023 (India) compliant
- ✅ Comprehensive Privacy Policy
- ✅ Data deletion policy (2 hours)
- ✅ User rights clearly defined

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

- ⚡ **Fast Conversion**: < 3 seconds for single file
- 📦 **Optimized Bundle**: Lightweight vanilla JS, no heavy frameworks
- 🖼️ **Lazy Loading**: Efficient file processing
- 💾 **Efficient Caching**: Service worker for offline support
- 📱 **Mobile-Optimized**: Responsive design, touch-friendly
- 🚀 **Parallel Processing**: Batch processing (5 files at a time)
- ⚙️ **Keep-Alive Agents**: Reused connections for faster API calls
- 📊 **Chunked Uploads**: 6MB chunks for faster transfers

## SEO & Compliance

- ✅ **robots.txt**: Configured (allows indexing, blocks /uploads/ and /api/)
- ✅ **sitemap.xml**: Complete with all format pages
- ✅ **Meta Tags**: Comprehensive (description, keywords, OG tags, Twitter cards)
- ✅ **Privacy Policy**: Accessible at `/privacy-policy.html`
- ✅ **Search Engine Ready**: Fully indexable, no penalties

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
- Multiple file format support (13 input, 13 output formats)
- Secure file handling (HTTPS, validation, encryption)
- Responsive design
- HTTPS enforcement (production)
- Comprehensive security headers
- SEO optimized (robots.txt, sitemap.xml, meta tags)
- Legal compliance (GDPR, CCPA, DPDP Act 2023)
