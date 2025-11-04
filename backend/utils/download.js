// Download utility - Download file from URL
const axiosKA = require('./axiosKA');
const fs = require('fs-extra');
const path = require('path');

const downloadFromUrl = async (url) => {
  try {
    const response = await axiosKA({
      method: 'GET',
      url: url,
      responseType: 'stream',
      timeout: 60000,
      maxContentLength: 2 * 1024 * 1024 * 1024,
      maxBodyLength: 2 * 1024 * 1024 * 1024
    });
    
    const filename = path.basename(url) || 'downloaded-file';
    const filePath = path.join('uploads', Date.now() + '-' + filename);
    
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(filePath));
      writer.on('error', reject);
    });
  } catch (error) {
    throw new Error(`Download failed: ${error.message}`);
  }
};

module.exports = {
  downloadFromUrl
};

