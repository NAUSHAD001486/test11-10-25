// Convert Controller - Handle file conversions
const { convertFile, SPECIAL_FORMATS } = require('../utils/cloudinary');
const { SUPPORTED_OUTPUT_FORMATS } = require('../utils/fileValidation');
const usageTracker = require('../utils/usageTracker');

// Convert files
const convertFiles = async (req, res) => {
  try {
    const { files, targetFormat } = req.body;
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files to convert' });
    }
    
    if (!targetFormat || !SUPPORTED_OUTPUT_FORMATS.includes(targetFormat)) {
      return res.status(400).json({ 
        error: `Unsupported output format. Supported: ${SUPPORTED_OUTPUT_FORMATS.join(', ')}` 
      });
    }
    
    // Hard guard: if limit was reached after middleware run (race), stop
    if (req.usageTracker && req.usageTracker.usage.bytes >= usageTracker.DAILY_LIMIT) {
      return res.status(429).json({
        error: 'Daily usage limit reached',
        message: 'You have reached your daily conversion limit of 2GB. Please try again tomorrow.'
      });
    }

    const convertedFiles = [];
    const errors = [];
    const batchSize = 8;
    
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (file) => {
        try {
          const convertedUrl = await convertFile(file.publicId, file.format, targetFormat);
          
          return {
            success: true,
            result: {
              originalName: file.originalName,
              convertedUrl: convertedUrl,
              format: targetFormat,
              publicId: file.publicId,
              isSpecialFormat: SPECIAL_FORMATS.includes(targetFormat)
            }
          };
        } catch (error) {
          console.error(`Error converting file ${file.originalName}:`, error);
          return {
            success: false,
            error: error.message,
            filename: file.originalName
          };
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            convertedFiles.push(result.value.result);
          } else {
            errors.push({
              filename: result.value.filename,
              error: result.value.error
            });
          }
        } else {
          errors.push({
            filename: 'unknown',
            error: result.reason?.message || 'Conversion failed'
          });
        }
      });
    }
    
    const response = { convertedFiles };
    if (errors.length > 0) {
      response.errors = errors;
    }
    
    res.json(response);
  } catch (error) {
    const logger = require('../logger');
    logger.error('Convert endpoint error:', { error: error.message, stack: error.stack });
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  convertFiles
};

