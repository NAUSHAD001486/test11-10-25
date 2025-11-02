# Cache Setup Guide - Smart Caching Implementation

## Overview
This project uses **Smart Caching** - a professional caching strategy similar to market tools like FreeConvert and Convertio. Cache is automatically enabled/disabled based on environment and configuration.

## How It Works

### 1. **Version-Based Caching (CSS/JS)**
- CSS/JS files use versioned URLs: `/css/styles.css?v=1.0.0`
- When you update files, change `CACHE_VERSION` in `config.env`
- Browser automatically fetches new version (cache busting)
- Old cached versions remain until cleared

### 2. **Smart Cache Headers**
- **CSS/JS**: Long cache (1 year) in production, no cache in development
- **Images/Icons**: Long cache (1 year) in production, no cache in development  
- **HTML**: Short cache (5 min) in production, no cache in development
- **API Endpoints**: NEVER cached (always fresh)

### 3. **Environment-Based**
- **Development** (`NODE_ENV=development`): Cache DISABLED automatically
- **Production** (`NODE_ENV=production`): Cache ENABLED automatically
- Can be overridden with `ENABLE_CACHE` in `config.env`

## Configuration

### Enable/Disable Cache

Edit `config.env` file:

```env
# Enable cache in production (default: true)
ENABLE_CACHE=true

# Cache version - INCREMENT THIS when you update CSS/JS files
CACHE_VERSION=1.0.0
```

### For Development (Instant Updates)

**Option 1: Set NODE_ENV**
```bash
NODE_ENV=development npm start
```
Cache will be automatically disabled.

**Option 2: Disable in config.env**
```env
ENABLE_CACHE=false
NODE_ENV=production
```

### For Production (Fast Loading)

**Option 1: Set NODE_ENV (Automatic)**
```bash
NODE_ENV=production npm start
```
Cache will be automatically enabled.

**Option 2: Enable in config.env**
```env
ENABLE_CACHE=true
NODE_ENV=production
```

## How to Update Cache After File Changes

### Step 1: Update Files
Make your changes to CSS/JS files.

### Step 2: Increment Cache Version
Edit `config.env`:
```env
# Change version number
CACHE_VERSION=1.0.1  # Increment: 1.0.0 -> 1.0.1 -> 1.0.2, etc.
```

### Step 3: Update HTML (if needed)
Update version in `public/index.html`:
```html
<link rel="stylesheet" href="/css/styles.css?v=1.0.1">
<script src="/js/app.js?v=1.0.1" defer></script>
```

**Note:** In future, we can automate this with a build script.

### Step 4: Restart Server
```bash
npm start
```

### Step 5: Clear Browser Cache (Users)
Users may need to hard refresh:
- **Chrome/Firefox**: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- **Safari**: `Cmd+Option+R`

OR wait for old cache to expire (1 year) - but version change forces immediate update.

## Current Cache Strategy

| File Type | Development | Production |
|-----------|------------|------------|
| **CSS** | No cache | 1 year (versioned) |
| **JS** | No cache | 1 year (versioned) |
| **Images/Icons** | No cache | 1 year |
| **Fonts** | No cache | 1 year |
| **HTML** | No cache | 5 minutes |
| **API Endpoints** | No cache | No cache |

## Benefits

### ✅ Fast Loading (Production)
- CSS/JS cached for 1 year (instant load)
- Images/icons cached (faster subsequent visits)
- Reduces server load

### ✅ Instant Updates (Development)
- No cache = see changes immediately
- Perfect for testing and development

### ✅ Smart Versioning
- Version change = automatic cache invalidation
- Users get updates without manual cache clear
- Old and new versions coexist until cleared

### ✅ Professional Strategy
- Same approach as FreeConvert, Convertio
- Industry-standard best practices
- Optimal performance

## Testing Cache

### Check Cache Headers
```bash
# Check CSS cache header
curl -I http://localhost:3000/css/styles.css

# Check API no-cache header
curl -I http://localhost:3000/api/usage
```

### Browser DevTools
1. Open DevTools → Network tab
2. Reload page
3. Check:
   - CSS/JS: Should show `200 (from disk cache)` in production
   - API: Should show `200` (not cached) always

## Troubleshooting

### Cache Not Working?
1. Check `ENABLE_CACHE` in `config.env`
2. Check `NODE_ENV` environment variable
3. Restart server after config changes
4. Clear browser cache

### Changes Not Showing?
1. Increment `CACHE_VERSION` in `config.env`
2. Update version in `public/index.html`
3. Restart server
4. Hard refresh browser (`Ctrl+Shift+R`)

### Want Instant Updates During Development?
```bash
# Method 1: Set NODE_ENV=development
NODE_ENV=development npm start

# Method 2: Disable in config.env
ENABLE_CACHE=false
```

## Summary

- **Development**: Cache disabled automatically → See changes instantly
- **Production**: Cache enabled automatically → Fast loading
- **Updates**: Change `CACHE_VERSION` → Automatic cache invalidation
- **APIs**: Never cached → Always fresh data

This is the professional, industry-standard approach used by market-leading tools!

