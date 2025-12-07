// Cloudinary Configuration
const cloudinaryConfig = {
  // Your cloud name from Cloudinary dashboard
  // This is in your URL: https://console.cloudinary.com/...
  cloudName: 'Put your cloud name here', // Replace if different
  
  // Your upload preset from the settings you showed
  uploadPreset: 'chat_app_upload',
  
  // API configurations (optional for basic uploads)
  apiKey: '', // Leave empty for now
  apiSecret: '', // Leave empty for now
};

// Export the configuration
export default cloudinaryConfig;
