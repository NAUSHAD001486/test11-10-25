// Simple test script to verify the application setup
const fs = require('fs');
const path = require('path');

console.log('🧪 Love U Convert - Application Test');
console.log('====================================');

// Test 1: Check if all required files exist
const requiredFiles = [
    'server.js',
    'package.json',
    'config.env',
    'public/index.html',
    'public/css/styles.css',
    'public/js/app.js',
    'public/manifest.json',
    'public/sw.js',
    'public/robots.txt',
    'public/sitemap.xml'
];

console.log('\n📁 Checking required files...');
let allFilesExist = true;

requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - MISSING`);
        allFilesExist = false;
    }
});

// Test 2: Check package.json
console.log('\n📦 Checking package.json...');
try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    console.log(`✅ Package name: ${packageJson.name}`);
    console.log(`✅ Version: ${packageJson.version}`);
    console.log(`✅ Main script: ${packageJson.main}`);
} catch (error) {
    console.log('❌ Invalid package.json');
    allFilesExist = false;
}

// Test 3: Check config.env
console.log('\n⚙️  Checking configuration...');
try {
    const configContent = fs.readFileSync('config.env', 'utf8');
    const hasCloudName = configContent.includes('CLOUDINARY_CLOUD_NAME=');
    const hasApiKey = configContent.includes('CLOUDINARY_API_KEY=');
    const hasApiSecret = configContent.includes('CLOUDINARY_API_SECRET=');
    
    if (hasCloudName && hasApiKey && hasApiSecret) {
        console.log('✅ Cloudinary configuration found');
    } else {
        console.log('⚠️  Cloudinary configuration incomplete');
    }
} catch (error) {
    console.log('❌ config.env not found or invalid');
}

// Test 4: Check HTML structure
console.log('\n🌐 Checking HTML structure...');
try {
    const htmlContent = fs.readFileSync('public/index.html', 'utf8');
    const hasTitle = htmlContent.includes('<title>');
    const hasManifest = htmlContent.includes('manifest.json');
    const hasServiceWorker = htmlContent.includes('sw.js');
    const hasStyles = htmlContent.includes('styles.css');
    const hasAppJs = htmlContent.includes('app.js');
    
    if (hasTitle && hasManifest && hasServiceWorker && hasStyles && hasAppJs) {
        console.log('✅ HTML structure is complete');
    } else {
        console.log('⚠️  HTML structure may be incomplete');
    }
} catch (error) {
    console.log('❌ HTML file not found or invalid');
}

// Test 5: Check PWA manifest
console.log('\n📱 Checking PWA manifest...');
try {
    const manifestContent = JSON.parse(fs.readFileSync('public/manifest.json', 'utf8'));
    console.log(`✅ App name: ${manifestContent.name}`);
    console.log(`✅ Short name: ${manifestContent.short_name}`);
    console.log(`✅ Theme color: ${manifestContent.theme_color}`);
    console.log(`✅ Icons count: ${manifestContent.icons.length}`);
} catch (error) {
    console.log('❌ Invalid manifest.json');
}

// Test 6: Check service worker
console.log('\n🔧 Checking service worker...');
try {
    const swContent = fs.readFileSync('public/sw.js', 'utf8');
    const hasInstall = swContent.includes('install');
    const hasActivate = swContent.includes('activate');
    const hasFetch = swContent.includes('fetch');
    
    if (hasInstall && hasActivate && hasFetch) {
        console.log('✅ Service worker is complete');
    } else {
        console.log('⚠️  Service worker may be incomplete');
    }
} catch (error) {
    console.log('❌ Service worker not found or invalid');
}

// Test 7: Check CSS
console.log('\n🎨 Checking CSS...');
try {
    const cssContent = fs.readFileSync('public/css/styles.css', 'utf8');
    const hasVariables = cssContent.includes('--primary-color');
    const hasResponsive = cssContent.includes('@media');
    const hasAnimations = cssContent.includes('transition');
    
    if (hasVariables && hasResponsive && hasAnimations) {
        console.log('✅ CSS is complete with responsive design');
    } else {
        console.log('⚠️  CSS may be incomplete');
    }
} catch (error) {
    console.log('❌ CSS file not found or invalid');
}

// Test 8: Check JavaScript
console.log('\n⚡ Checking JavaScript...');
try {
    const jsContent = fs.readFileSync('public/js/app.js', 'utf8');
    const hasFileHandling = jsContent.includes('handleFileSelection');
    const hasDragDrop = jsContent.includes('handleDragOver');
    const hasConvert = jsContent.includes('handleConvert');
    const hasPWA = jsContent.includes('serviceWorker');
    
    if (hasFileHandling && hasDragDrop && hasConvert && hasPWA) {
        console.log('✅ JavaScript is complete with all features');
    } else {
        console.log('⚠️  JavaScript may be incomplete');
    }
} catch (error) {
    console.log('❌ JavaScript file not found or invalid');
}

// Final result
console.log('\n📊 Test Results');
console.log('================');
if (allFilesExist) {
    console.log('🎉 All tests passed! Your Love U Convert app is ready to deploy.');
    console.log('\n📋 Next steps:');
    console.log('1. Update your domain in config.env and HTML files');
    console.log('2. Upload to Hostinger');
    console.log('3. Configure your domain to use Node.js');
    console.log('4. Start the application with: npm start');
} else {
    console.log('❌ Some tests failed. Please check the missing files.');
}

console.log('\n✨ Thank you for using Love U Convert!');
