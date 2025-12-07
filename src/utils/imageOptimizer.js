// src/utils/imageOptimizer.js

/**
 * Optimizes Cloudinary image URLs for better performance
 * @param {string} url - Original Cloudinary URL
 * @param {Object} options - Optimization options
 * @returns {string} Optimized URL
 */
export const optimizeImageUrl = (url, options = {}) => {
  if (!url || !url.includes('cloudinary.com')) {
    return url; // Return as-is if not a Cloudinary URL
  }

  const {
    width = 600,       // Default width for chat
    height = 600,      // Default height for chat
    quality = 'auto',  // Auto quality
    format = 'auto',   // Auto format (webp for modern browsers)
    crop = 'fill'      // Fill mode
  } = options;

  try {
    // Parse the Cloudinary URL
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    
    // Find the upload index
    const uploadIndex = pathParts.findIndex(part => part === 'upload');
    
    if (uploadIndex === -1) {
      return url; // Not a standard Cloudinary upload URL
    }

    // Insert transformations after 'upload'
    const transformations = `c_${crop},w_${width},h_${height},q_${quality},f_${format}`;
    pathParts.splice(uploadIndex + 1, 0, transformations);
    
    // Reconstruct URL
    urlObj.pathname = pathParts.join('/');
    return urlObj.toString();
    
  } catch (error) {
    console.error('Error optimizing image URL:', error);
    return url; // Fallback to original URL
  }
};

/**
 * Generate thumbnail URL for faster loading
 * @param {string} url - Original Cloudinary URL
 * @returns {string} Thumbnail URL
 */
export const getThumbnailUrl = (url) => {
  return optimizeImageUrl(url, {
    width: 100,
    height: 100,
    quality: 'low',
    crop: 'fill'
  });
};