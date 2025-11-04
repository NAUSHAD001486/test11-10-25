// Cloudinary utility functions
const cloudinary = require('cloudinary').v2;
const path = require('path');

// Cloudinary formats that work reliably
const CLOUDINARY_RELIABLE_FORMATS = {
  'PNG': 'png', 'JPEG': 'jpg', 'JPG': 'jpg', 'GIF': 'gif', 'TIFF': 'tiff', 'WebP': 'webp'
};

// Formats that need special handling (convert to PNG and serve as requested format)
const SPECIAL_FORMATS = ['TGA', 'PSD', 'EPS', 'ODD', 'ICO', 'BMP', 'SVG'];

// All supported formats mapping
const CLOUDINARY_FORMATS = {
  ...CLOUDINARY_RELIABLE_FORMATS,
  'TGA': 'png', 'PSD': 'png', 'EPS': 'png', 'ODD': 'png', 
  'ICO': 'png', 'BMP': 'png', 'SVG': 'png'
};

// Upload file to Cloudinary
const uploadToCloudinary = async (filePath, publicId) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      public_id: publicId,
      resource_type: 'auto',
      folder: 'love-u-convert',
      timeout: 60000,
      chunk_size: 10000000, // 10MB chunks
      tags: ['auto-delete-2h'],
      use_filename: false,
      unique_filename: false
    });
    return result;
  } catch (error) {
    if (error.http_code === 429) {
      await new Promise(resolve => setTimeout(resolve, 500));
      try {
        return await cloudinary.uploader.upload(filePath, {
          public_id: publicId,
          resource_type: 'auto',
          folder: 'love-u-convert',
          timeout: 60000,
          chunk_size: 10000000
        });
      } catch (retryError) {
        throw new Error('Upload failed: Rate limit exceeded. Please try again later.');
      }
    }
    throw new Error(`Upload failed: ${error.message || 'Unknown error'}`);
  }
};

// Convert file format using Cloudinary
const convertFile = async (publicId, originalFormat, targetFormat) => {
  try {
    const cloudinaryFormat = CLOUDINARY_FORMATS[targetFormat];
    if (!cloudinaryFormat) {
      throw new Error(`Cloudinary does not support ${targetFormat} conversion`);
    }
    
    let transformation = {
      quality: 'auto',
      flags: 'progressive'
    };
    
    if (SPECIAL_FORMATS.includes(targetFormat)) {
      transformation.format = 'png';
      transformation.fetch_format = 'png';
    } else {
      transformation.format = cloudinaryFormat;
      transformation.fetch_format = cloudinaryFormat;
    }
    
    const url = cloudinary.url(publicId, transformation);
    return url;
  } catch (error) {
    throw new Error(`Conversion failed: ${error.message}`);
  }
};

module.exports = {
  uploadToCloudinary,
  convertFile,
  CLOUDINARY_FORMATS,
  SPECIAL_FORMATS
};

