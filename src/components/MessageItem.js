// src/components/MessageItem.js - FIXED WITH BASE64 VOICE MESSAGES
import React, { useState, useEffect } from 'react';
import { ref, update, set, remove } from 'firebase/database';
import { database } from '../firebase';
import { Play, Pause } from 'lucide-react';
import './MessageItem.css';

const MessageItem = ({ 
  message, 
  currentUser, 
  selectedUser, 
  selectedGroup,
  onReply,
  onPin,
  onUnpin,
  reactions,
  isPlayingVoice,
  onPlayVoice
}) => {
  const [showMessageOptions, setShowMessageOptions] = useState(null);
  const [hoveredMessage, setHoveredMessage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState(message.text);
  const [showToast, setShowToast] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [voiceWaveformBars, setVoiceWaveformBars] = useState([]);

  // Helper functions
  const getChatId = (uid1, uid2) => uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
  const formatTime = (timestamp) => timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  const formatDuration = (seconds) => !seconds ? '0:00' : seconds < 60 ? `0:${seconds.toString().padStart(2, '0')}` : `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

  const optimizeImageUrl = (url, options = {}) => {
    if (!url || !url.includes('cloudinary.com')) return url;
    
    const { width = 400, height = 400, quality = 'auto', format = 'auto', crop = 'fill' } = options;
    
    try {
      if (url.includes('/upload/') && !url.includes('/upload/c_')) {
        return url.replace('/upload/', `/upload/c_${crop},w_${width},h_${height},q_${quality},f_${format}/`);
      }
      return url;
    } catch (error) {
      console.error('Error optimizing image URL:', error);
      return url;
    }
  };

  // Effects
  useEffect(() => {
    if (message.type === 'voice') {
      setVoiceWaveformBars(Array.from({ length: 20 }, () => Math.floor(Math.random() * 20) + 5));
    }
  }, [message.type, message.id]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.message-container') && !e.target.closest('.emoji-picker')) {
        setShowMessageOptions(null);
      }
      if (!e.target.closest('.message-bubble') && !e.target.closest('[style*="position: absolute"]')) {
        setShowMessageOptions(null);
        setEditingMessage(null);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [message.id]);

  useEffect(() => {
    if (message.imageUrl) {
      const img = new Image();
      img.src = optimizeImageUrl(message.imageUrl);
      img.onload = () => {}; // Image is cached
    }
  }, [message.imageUrl]);

  // Message operations
  const copyMessage = async (isImage = false, isVoice = false) => {
    try {
      let copyText = message.text;
      if (isImage) copyText = message.imageUrl;
      else if (isVoice) copyText = message.audioData || 'Voice message';
      
      if (!copyText) {
        console.warn('Nothing to copy');
        return;
      }
      
      await navigator.clipboard.writeText(copyText);
      setShowToast(true);
      setShowMessageOptions(null);
    } catch (err) {
      console.error('Failed to copy:', err);
      const textArea = document.createElement('textarea');
      textArea.value = copyText;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setShowToast(true);
      } catch (err) {
        console.error('Fallback copy failed:', err);
      }
      document.body.removeChild(textArea);
      setShowMessageOptions(null);
    }
  };

  // Copy button handlers - FIXED
  const handleCopy = (e) => {
    e.stopPropagation();
    const isImage = !!message.imageUrl;
    const isVoice = message.type === 'voice';
    copyMessage(isImage, isVoice);
  };

  const handleQuickCopy = (e) => {
    e.stopPropagation();
    const isImage = !!message.imageUrl;
    const isVoice = message.type === 'voice';
    copyMessage(isImage, isVoice);
  };

  const startEdit = () => {
    setEditingMessage(message.id);
    setEditText(message.text);
    setShowMessageOptions(null);
  };

  const saveEdit = async () => {
    if (!editText.trim()) return;
    
    try {
      const messageRef = selectedGroup
        ? ref(database, `groups/${selectedGroup.id}/messages/${message.id}`)
        : ref(database, `chats/${getChatId(currentUser.uid, selectedUser.uid)}/messages/${message.id}`);
      
      await update(messageRef, {
        text: editText.trim(),
        edited: true,
        editedAt: Date.now()
      });
      
      setEditingMessage(null);
      setEditText('');
    } catch (error) {
      console.error('Error editing message:', error);
    }
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setEditText('');
  };

  const deleteMessage = async () => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    
    try {
      const messageRef = selectedGroup
        ? ref(database, `groups/${selectedGroup.id}/messages/${message.id}`)
        : ref(database, `chats/${getChatId(currentUser.uid, selectedUser.uid)}/messages/${message.id}`);
      
      await update(messageRef, {
        deleted: true,
        deletedAt: Date.now(),
        ...(message.imageUrl && { imageUrl: null }),
        ...(message.audioData && { audioData: null })
      });
      
      setShowMessageOptions(null);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const addReaction = async (emoji) => {
    try {
      const reactionRef = selectedGroup
        ? ref(database, `groups/${selectedGroup.id}/messages/${message.id}/reactions/${currentUser.uid}`)
        : ref(database, `chats/${getChatId(currentUser.uid, selectedUser.uid)}/messages/${message.id}/reactions/${currentUser.uid}`);
      
      await set(reactionRef, {
        emoji,
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email,
        timestamp: Date.now()
      });
      
      setShowMessageOptions(null);
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const removeReaction = async () => {
    try {
      const reactionRef = selectedGroup
        ? ref(database, `groups/${selectedGroup.id}/messages/${message.id}/reactions/${currentUser.uid}`)
        : ref(database, `chats/${getChatId(currentUser.uid, selectedUser.uid)}/messages/${message.id}/reactions/${currentUser.uid}`);
      
      await remove(reactionRef);
    } catch (error) {
      console.error('Error removing reaction:', error);
    }
  };

  const getReactionCounts = () => {
    if (!message.reactions) return {};
    
    const counts = {};
    Object.values(message.reactions).forEach(reaction => {
      if (reaction?.emoji) counts[reaction.emoji] = (counts[reaction.emoji] || 0) + 1;
    });
    return counts;
  };

  const hasUserReacted = (emoji) => message.reactions?.[currentUser.uid]?.emoji === emoji;

  const openImageInNewTab = () => {
    if (message.imageUrl) {
      window.open(message.imageUrl.replace(/\/upload\/c_[^,]+,w_\d+,h_\d+,q_[^,]+,f_[^/]+\//, '/upload/'), '_blank');
    }
  };

  const renderMessageStatus = () => {
    if (message.senderId !== currentUser.uid) return null;
    switch (message.status) {
      case 'read': return <span className="message-status read">✓✓</span>;
      case 'delivered': return <span className="message-status">✓✓</span>;
      case 'sent': return <span className="message-status">✓</span>;
      default: return null;
    }
  };

  // Voice message rendering
  const renderVoiceMessage = () => {
    const duration = message.duration || 0;
    const formattedDuration = message.formattedDuration || formatDuration(duration);
    
    return (
      <div className={`voice-message-player ${isPlayingVoice ? 'playing' : ''}`}>
        <button className="play-voice-btn" onClick={(e) => { e.stopPropagation(); onPlayVoice(message.id, message.audioData); }} title={isPlayingVoice ? "Pause" : "Play"}>
          {isPlayingVoice ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <div className="voice-info">
          <span className="voice-label">Voice message</span>
          <span className="voice-duration">{formattedDuration}</span>
        </div>
        <div className="voice-waveform">
          {voiceWaveformBars.map((height, index) => (
            <div key={index} className="wave-bar" style={{ '--i': index, height: `${height}px` }} />
          ))}
        </div>
      </div>
    );
  };

  // Main message content renderer
  const renderMessageContent = () => {
    if (message.deleted) return <p className="message-deleted">This message was deleted</p>;
    
    if (editingMessage === message.id) {
      return (
        <div onClick={(e) => e.stopPropagation()}>
          <input type="text" value={editText} onChange={(e) => setEditText(e.target.value)} className="edit-input" onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') { e.preventDefault(); saveEdit(); }
            if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
          }} autoFocus />
          <div className="edit-buttons">
            <button className="edit-save-btn" onClick={(e) => { e.stopPropagation(); saveEdit(); }}>Save</button>
            <button className="edit-cancel-btn" onClick={(e) => { e.stopPropagation(); cancelEdit(); }}>Cancel</button>
          </div>
        </div>
      );
    }

    if (message.type === 'voice') return renderVoiceMessage();
    
    if (message.imageUrl) {
      return (
        <div className="message-image-container">
          <div className="image-wrapper">
            {!imageLoaded && !imageError && <div className="image-loading"><div className="loading-spinner"></div><span>Loading image...</span></div>}
            {imageError && <div className="image-error"><span>⚠️ Failed to load image</span><button className="retry-btn" onClick={() => { setImageError(false); setImageLoaded(false); }}>Retry</button></div>}
            <img src={optimizeImageUrl(message.imageUrl)} alt="Shared in chat" className={`message-image ${imageLoaded ? 'loaded' : ''}`} onClick={openImageInNewTab} onLoad={() => setImageLoaded(true)} onError={() => setImageError(true)} loading="lazy" style={{ display: imageLoaded && !imageError ? 'block' : 'none', maxWidth: '400px', maxHeight: '400px' }} />
          </div>
          {message.text && <div className="image-caption">{message.text}</div>}
        </div>
      );
    }
    
    return <p className="message-text">{message.text}</p>;
  };

  const handleBubbleClick = (e) => {
    if (!e.target.closest('.message-image-container') && !e.target.closest('.voice-message-player') && 
        message.senderId === currentUser.uid && !message.deleted && editingMessage !== message.id && message.type !== 'voice') {
      e.stopPropagation();
      setShowMessageOptions(showMessageOptions === message.id ? null : message.id);
    }
  };

  return (
    <>
      {showToast && <div className="copy-toast">{message.imageUrl ? '✓ Image link copied' : message.type === 'voice' ? '✓ Voice message data copied' : '✓ Message copied to clipboard'}</div>}
      
      <div className={`message-container message-container-${message.id} ${message.senderId === currentUser.uid ? 'sent' : 'received'}`} data-message-id={message.id} onMouseEnter={() => setHoveredMessage(message.id)} onMouseLeave={() => setHoveredMessage(null)}>
        <div className="message-wrapper">
          {message.replyTo && (
            <div className={`reply-reference ${message.senderId === currentUser.uid ? 'sent' : 'received'}`}>
              <div className="reply-sender-name">{message.replyTo.senderName}</div>
              <div>{message.replyTo.imageUrl ? '🖼️ [Image]' : message.replyTo.type === 'voice' ? '🎤 [Voice message]' : message.replyTo.text}</div>
            </div>
          )}

          <div className={`message-bubble ${message.senderId === currentUser.uid ? 'sent' : 'received'} ${message.replyTo ? 'with-reply' : ''} ${message.imageUrl ? 'has-image' : ''} ${message.type === 'voice' ? 'has-voice' : ''}`} onClick={handleBubbleClick}>
            {message.pinned && <div className="pinned-indicator">📌 Pinned</div>}
            {renderMessageContent()}
            
            {showMessageOptions === message.id && message.senderId === currentUser.uid && !message.deleted && editingMessage !== message.id && (
              <div className="message-options-menu">
                <button className="message-option-btn copy" onClick={handleCopy}>
                  {message.imageUrl ? '🔗 Copy Image Link' : message.type === 'voice' ? '🔗 Copy Voice Data' : '📋 Copy'}
                </button>
                {!message.imageUrl && message.type !== 'voice' && <button className="message-option-btn" onClick={(e) => { e.stopPropagation(); startEdit(); }}>✏️ Edit</button>}
                <button className="message-option-btn" onClick={(e) => { e.stopPropagation(); onReply(message); }}>↩️ Reply</button>
                {message.pinned ? <button className="message-option-btn unpin" onClick={(e) => { e.stopPropagation(); onUnpin(message.id); }}>📌 Unpin</button> : <button className="message-option-btn pin" onClick={(e) => { e.stopPropagation(); onPin(message.id); }}>📌 Pin</button>}
                <button className="message-option-btn delete" onClick={(e) => { e.stopPropagation(); deleteMessage(); }}>🗑️ Delete</button>
              </div>
            )}
            
            <div className="message-meta">
              <span>{formatTime(message.createdAt)}{message.edited && ' (edited)'}</span>
              {renderMessageStatus()}
            </div>
          </div>

          {message.reactions && Object.keys(message.reactions).length > 0 && (
            <div className={`reactions-container ${message.senderId === currentUser.uid ? 'sent' : 'received'}`}>
              {Object.entries(getReactionCounts()).map(([emoji, count]) => (
                <button key={emoji} className={`reaction-btn ${hasUserReacted(emoji) ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); hasUserReacted(emoji) ? removeReaction() : addReaction(emoji); }}>
                  {emoji} {count}
                </button>
              ))}
            </div>
          )}

          {!message.deleted && hoveredMessage === message.id && message.type !== 'voice' && (
            <div className={`quick-actions ${message.senderId === currentUser.uid ? 'sent' : 'received'}`}>
              <button className="quick-action-btn" onClick={(e) => { e.stopPropagation(); onReply(message); }} title="Reply">↩️</button>
              <button className="quick-action-btn" onClick={(e) => { e.stopPropagation(); setShowMessageOptions(showMessageOptions === `reactions-${message.id}` ? null : `reactions-${message.id}`); }} title="React">😊</button>
              <button className="quick-action-btn" onClick={handleQuickCopy} title="Copy">📋</button>
              
              {showMessageOptions === `reactions-${message.id}` && (
                <div className={`emoji-picker ${message.senderId === currentUser.uid ? 'sent' : 'received'}`} onClick={(e) => e.stopPropagation()}>
                  {reactions.map(emoji => <button key={emoji} className="emoji-btn" onClick={(e) => { e.stopPropagation(); addReaction(emoji); }}>{emoji}</button>)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default MessageItem;