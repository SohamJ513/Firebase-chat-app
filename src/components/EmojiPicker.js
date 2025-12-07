// src/components/EmojiPicker.js
import React from 'react';
import EmojiPicker from 'emoji-picker-react';
import './EmojiPicker.css';

const CustomEmojiPicker = ({ onEmojiClick, position = 'top', isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleEmojiClick = (emojiData) => {
    onEmojiClick(emojiData.emoji);
  };

  return (
    <div className={`emoji-picker-container ${position}`}>
      <EmojiPicker
        onEmojiClick={handleEmojiClick}
        width={320}
        height={350}
        skinTonesDisabled
        searchDisabled={false}
        previewConfig={{
          showPreview: false
        }}
      />
    </div>
  );
};

export default CustomEmojiPicker;