// Upload Controller - Handle file uploads
const { uploadToCloudinary } = require('../utils/cloudinary');
const fs = require('fs-extra');
const path = require('path');

// Upload from device
const uploadFromDevice = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const results = [];
    const errors = [];
    const batchSize = 8;
    
    for (let i = 0; i < req.files.length; i += batchSize) {
      const batch = req.files.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (file) => {
        try {
          const publicId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const cloudinaryResult = await uploadToCloudinary(file.path, publicId);
          
          // Track usage
          if (req.usageTracker) {
            req.usageTracker.usage.bytes += file.size;
          }
          
          // Clean up local file
          await fs.remove(file.path);
          
          return {
            success: true,
            result: {
              id: publicId,
              originalName: file.originalname,
              size: file.size,
              format: path.extname(file.originalname).slice(1).toLowerCase(),
              url: cloudinaryResult.secure_url,
              publicId: cloudinaryResult.public_id
            }
          };
        } catch (error) {
          console.error('Error processing file:', error);
          if (file.path) {
            await fs.remove(file.path).catch(() => {});
          }
          return {
            success: false,
            error: error.message,
            filename: file.originalname
          };
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            results.push(result.value.result);
          } else {
            errors.push({
              filename: result.value.filename,
              error: result.value.error
            });
          }
        } else {
          errors.push({
            filename: 'unknown',
            error: result.reason?.message || 'Upload failed'
          });
        }
      });
    }
    
    const response = { files: results };
    if (errors.length > 0) {
      response.errors = errors;
    }
    
    res.json(response);
  } catch (error) {
    console.error('Upload endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Upload from URL
const uploadFromUrl = async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    const { downloadFromUrl } = require('../utils/download');
    const filePath = await downloadFromUrl(url);
    const publicId = `url-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const cloudinaryResult = await uploadToCloudinary(filePath, publicId);
    
    // Clean up local file
    await fs.remove(filePath);
    
    res.json({
      id: publicId,
      originalName: path.basename(url),
      url: cloudinaryResult.secure_url,
      publicId: cloudinaryResult.public_id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  uploadFromDevice,
  uploadFromUrl
};

