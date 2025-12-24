// src/components/ImageUploadButton.js - FIXED VERSION
import React, { useRef, useState } from 'react';
import cloudinaryConfig from '../cloudinaryConfig';

const ImageUploadButton = ({ onImageUpload }) => {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleButtonClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check if it's an image
    if (!file.type.match('image.*')) {
      alert('Please select an image file (JPEG, PNG, GIF, etc.)');
      return;
    }

    // Check file size
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size should be less than 10MB');
      return;
    }

    setUploading(true);

    // Debug: Log your config values
    console.log('Cloudinary Config:', cloudinaryConfig);
    console.log('Cloud Name:', cloudinaryConfig.cloudName);
    console.log('Upload Preset:', cloudinaryConfig.uploadPreset);
    console.log('File details:', {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    // SIMPLIFIED UPLOAD - Remove transformations for now
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', cloudinaryConfig.uploadPreset);
    formData.append('cloud_name', cloudinaryConfig.cloudName);
    
    // Add only basic parameters
    formData.append('folder', 'chat_app/');

    try {
      console.log('Starting upload...');
      
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      console.log('Response status:', response.status);
      
      // Get the response text to see what Cloudinary says
      const responseText = await response.text();
      console.log('Response text:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse JSON:', e);
        throw new Error(`Invalid JSON response: ${responseText}`);
      }

      if (!response.ok) {
        console.error('Cloudinary error response:', data);
        throw new Error(`Upload failed: ${data.error?.message || 'Unknown error'}`);
      }

      if (data.secure_url) {
        console.log('✅ Upload successful:', data.secure_url);
        onImageUpload(data.secure_url);
      } else {
        console.error('❌ Upload failed - no secure_url:', data);
        alert('Upload failed. No image URL returned.');
      }
    } catch (error) {
      console.error('❌ Upload error details:', error);
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
      // REMOVE THIS LINE - it's causing the file dialog to reopen
      // event.target.value = '';
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        style={{ display: 'none' }}
      />
      
      <button
        type="button" // ADD THIS - ensures it doesn't submit the form
        onClick={handleButtonClick}
        disabled={uploading}
        style={{
          padding: '8px 16px',
          backgroundColor: uploading ? '#ccc' : '#4285f4',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: uploading ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          opacity: uploading ? 0.7 : 1,
        }}
      >
        {uploading ? 'Uploading...' : '📷 Upload Image'}
      </button>
    </div>
  );
};

export default ImageUploadButton;