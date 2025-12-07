// src/components/MessageItem.js - UPDATED WITH OPTIMIZED IMAGE SUPPORT
import React, { useState, useEffect } from 'react';
import { 
  ref, 
  update,
  set,
  remove 
} from 'firebase/database';
import { database } from '../firebase';
import './MessageItem.css';

const MessageItem = ({ 
  message, 
  currentUser, 
  selectedUser, 
  selectedGroup,
  onReply,
  onPin,
  onUnpin,
  reactions 
}) => {
  const [showMessageOptions, setShowMessageOptions] = useState(null);
  const [hoveredMessage, setHoveredMessage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState(message.text);
  const [showToast, setShowToast] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Close emoji picker when clicking outside
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

  // Hide toast after 2 seconds
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // Reset image state when message changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [message.id]);

  const getChatId = (uid1, uid2) => {
    return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
  };

  // Optimize Cloudinary image URL for faster loading
  const optimizeImageUrl = (url, options = {}) => {
    if (!url || !url.includes('cloudinary.com')) {
      return url; // Return as-is if not a Cloudinary URL
    }

    const {
      width = 400,        // Optimized for chat display
      height = 400,
      quality = 'auto',
      format = 'auto',
      crop = 'fill'
    } = options;

    try {
      // Parse the URL and insert optimization parameters
      if (url.includes('/upload/') && !url.includes('/upload/c_')) {
        // Insert optimization parameters after /upload/
        return url.replace(
          '/upload/',
          `/upload/c_${crop},w_${width},h_${height},q_${quality},f_${format}/`
        );
      }
      
      // If already has transformations, return as-is
      return url;
    } catch (error) {
      console.error('Error optimizing image URL:', error);
      return url; // Fallback to original URL
    }
  };

  // Get thumbnail URL for faster preview
  const getThumbnailUrl = (url) => {
    return optimizeImageUrl(url, {
      width: 50,
      height: 50,
      quality: 'low',
      crop: 'fill'
    });
  };

  // Copy message/image URL to clipboard
  const copyMessage = async (text, isImage = false) => {
    try {
      const copyText = isImage ? message.imageUrl : text;
      await navigator.clipboard.writeText(copyText);
      setShowToast(true);
      setShowMessageOptions(null);
    } catch (err) {
      console.error('Failed to copy:', err);
      const textArea = document.createElement('textarea');
      textArea.value = isImage ? message.imageUrl : text;
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

  // Edit message
  const startEdit = (message) => {
    setEditingMessage(message.id);
    setEditText(message.text);
    setShowMessageOptions(null);
  };

  const saveEdit = async (messageId) => {
    if (!editText.trim()) return;

    try {
      let messageRef;
      
      if (selectedGroup) {
        messageRef = ref(database, `groups/${selectedGroup.id}/messages/${messageId}`);
      } else {
        const chatId = getChatId(currentUser.uid, selectedUser.uid);
        messageRef = ref(database, `chats/${chatId}/messages/${messageId}`);
      }
      
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

  // Delete message
  const deleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;

    try {
      let messageRef;
      
      if (selectedGroup) {
        messageRef = ref(database, `groups/${selectedGroup.id}/messages/${messageId}`);
      } else {
        const chatId = getChatId(currentUser.uid, selectedUser.uid);
        messageRef = ref(database, `chats/${chatId}/messages/${messageId}`);
      }
      
      await update(messageRef, {
        deleted: true,
        deletedAt: Date.now(),
        ...(message.imageUrl && { imageUrl: null })
      });

      setShowMessageOptions(null);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  // Add reaction to message
  const addReaction = async (messageId, emoji) => {
    try {
      let reactionRef;
      
      if (selectedGroup) {
        reactionRef = ref(database, `groups/${selectedGroup.id}/messages/${messageId}/reactions/${currentUser.uid}`);
      } else {
        const chatId = getChatId(currentUser.uid, selectedUser.uid);
        reactionRef = ref(database, `chats/${chatId}/messages/${messageId}/reactions/${currentUser.uid}`);
      }
      
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

  // Remove reaction from message
  const removeReaction = async (messageId) => {
    try {
      let reactionRef;
      
      if (selectedGroup) {
        reactionRef = ref(database, `groups/${selectedGroup.id}/messages/${messageId}/reactions/${currentUser.uid}`);
      } else {
        const chatId = getChatId(currentUser.uid, selectedUser.uid);
        reactionRef = ref(database, `chats/${chatId}/messages/${messageId}/reactions/${currentUser.uid}`);
      }
      
      await remove(reactionRef);
    } catch (error) {
      console.error('Error removing reaction:', error);
    }
  };

  // Get count of each reaction type
  const getReactionCounts = (reactions) => {
    if (!reactions) return {};
    
    const counts = {};
    Object.values(reactions).forEach(reaction => {
      if (reaction && reaction.emoji) {
        counts[reaction.emoji] = (counts[reaction.emoji] || 0) + 1;
      }
    });
    return counts;
  };

  // Check if current user has reacted with specific emoji
  const hasUserReacted = (reactions, emoji) => {
    return reactions && reactions[currentUser.uid] && reactions[currentUser.uid].emoji === emoji;
  };

  // Render message status indicator
  const renderMessageStatus = (message) => {
    if (message.senderId !== currentUser.uid) return null;
    
    switch (message.status) {
      case 'read':
        return <span className="message-status read">✓✓</span>;
      case 'delivered':
        return <span className="message-status">✓✓</span>;
      case 'sent':
        return <span className="message-status">✓</span>;
      default:
        return null;
    }
  };

  // Open image in new tab with original URL
  const openImageInNewTab = () => {
    if (message.imageUrl) {
      // Use original URL without optimizations for full view
      const originalUrl = message.imageUrl.replace(
        /\/upload\/c_[^,]+,w_\d+,h_\d+,q_[^,]+,f_[^/]+\//,
        '/upload/'
      );
      window.open(originalUrl, '_blank');
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Preload image for better UX
  useEffect(() => {
    if (message.imageUrl) {
      const img = new Image();
      const optimizedUrl = optimizeImageUrl(message.imageUrl);
      img.src = optimizedUrl;
      
      img.onload = () => {
        // Image is cached now
      };
    }
  }, [message.imageUrl]);

  return (
    <>
      {/* Toast notification for copy feedback */}
      {showToast && (
        <div className="copy-toast">
          {message.imageUrl ? '✓ Image link copied' : '✓ Message copied to clipboard'}
        </div>
      )}
      
      <div
        className={`message-container message-container-${message.id} ${message.senderId === currentUser.uid ? 'sent' : 'received'}`}
        data-message-id={message.id}
        onMouseEnter={() => setHoveredMessage(message.id)}
        onMouseLeave={() => setHoveredMessage(null)}
      >
        <div className="message-wrapper">
          {/* Reply reference */}
          {message.replyTo && (
            <div className={`reply-reference ${message.senderId === currentUser.uid ? 'sent' : 'received'}`}>
              <div className="reply-sender-name">{message.replyTo.senderName}</div>
              <div>
                {message.replyTo.imageUrl ? (
                  <span className="reply-image-indicator">🖼️ [Image]</span>
                ) : (
                  message.replyTo.text
                )}
              </div>
            </div>
          )}

          <div
            className={`message-bubble ${message.senderId === currentUser.uid ? 'sent' : 'received'} ${message.replyTo ? 'with-reply' : ''} ${message.imageUrl ? 'has-image' : ''}`}
            onClick={(e) => {
              if (!e.target.closest('.message-image-container') && 
                  message.senderId === currentUser.uid && 
                  !message.deleted && 
                  editingMessage !== message.id) {
                e.stopPropagation();
                setShowMessageOptions(showMessageOptions === message.id ? null : message.id);
              }
            }}
          >
            {/* Pinned indicator */}
            {message.pinned && (
              <div className="pinned-indicator">
                📌 Pinned
              </div>
            )}
            
            {message.deleted ? (
              <p className="message-deleted">This message was deleted</p>
            ) : editingMessage === message.id ? (
              <div onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="edit-input"
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      saveEdit(message.id);
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      cancelEdit();
                    }
                  }}
                  autoFocus
                />
                <div className="edit-buttons">
                  <button 
                    className="edit-save-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      saveEdit(message.id);
                    }}
                  >
                    Save
                  </button>
                  <button 
                    className="edit-cancel-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      cancelEdit();
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* OPTIMIZED IMAGE DISPLAY */}
                {message.imageUrl && (
                  <div className="message-image-container">
                    <div className="image-wrapper">
                      {!imageLoaded && !imageError && (
                        <div className="image-loading">
                          <div className="loading-spinner"></div>
                          <span>Loading image...</span>
                        </div>
                      )}
                      {imageError && (
                        <div className="image-error">
                          <span>⚠️ Failed to load image</span>
                          <button 
                            className="retry-btn"
                            onClick={() => {
                              setImageError(false);
                              setImageLoaded(false);
                            }}
                          >
                            Retry
                          </button>
                        </div>
                      )}
                      <img 
                        src={optimizeImageUrl(message.imageUrl)}
                        alt="Shared in chat"
                        className={`message-image ${imageLoaded ? 'loaded' : ''}`}
                        onClick={openImageInNewTab}
                        onLoad={() => setImageLoaded(true)}
                        onError={() => setImageError(true)}
                        loading="lazy"
                        style={{ 
                          display: imageLoaded && !imageError ? 'block' : 'none',
                          maxWidth: '400px',
                          maxHeight: '400px'
                        }}
                        // Add thumbnail for progressive loading (optional)
                        data-thumbnail={getThumbnailUrl(message.imageUrl)}
                      />
                    </div>
                    {message.text && (
                      <div className="image-caption">{message.text}</div>
                    )}
                  </div>
                )}
                
                {/* TEXT MESSAGE */}
                {!message.imageUrl && message.text && (
                  <p className="message-text">{message.text}</p>
                )}
                
                {/* IMAGE-ONLY MESSAGE PLACEHOLDER */}
                {message.imageUrl && !message.text && !imageLoaded && (
                  <div className="image-placeholder">
                    <div className="placeholder-icon">🖼️</div>
                    <span>Image message</span>
                  </div>
                )}
                
                {/* MESSAGE META DATA */}
                <div className="message-meta">
                  <span>
                    {formatTime(message.createdAt)}
                    {message.edited && <span> (edited)</span>}
                  </span>
                  {renderMessageStatus(message)}
                </div>
              </>
            )}

            {/* Message Options Menu */}
            {showMessageOptions === message.id && message.senderId === currentUser.uid && !message.deleted && editingMessage !== message.id && (
              <div className="message-options-menu">
                {/* Copy button */}
                <button
                  className="message-option-btn copy"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (message.imageUrl) {
                      copyMessage('', true);
                    } else {
                      copyMessage(message.text, false);
                    }
                  }}
                >
                  {message.imageUrl ? '🔗 Copy Image Link' : '📋 Copy'}
                </button>
                
                {!message.imageUrl && (
                  <button
                    className="message-option-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(message);
                    }}
                  >
                    ✏️ Edit
                  </button>
                )}
                
                <button
                  className="message-option-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReply(message);
                  }}
                >
                  ↩️ Reply
                </button>
                
                {message.pinned ? (
                  <button
                    className="message-option-btn unpin"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnpin(message.id);
                    }}
                  >
                    📌 Unpin
                  </button>
                ) : (
                  <button
                    className="message-option-btn pin"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPin(message.id);
                    }}
                  >
                    📌 Pin
                  </button>
                )}
                
                <button
                  className="message-option-btn delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMessage(message.id);
                  }}
                >
                  🗑️ Delete
                </button>
              </div>
            )}
          </div>

          {/* Reactions Display */}
          {message.reactions && Object.keys(message.reactions).length > 0 && (
            <div className={`reactions-container ${message.senderId === currentUser.uid ? 'sent' : 'received'}`}>
              {Object.entries(getReactionCounts(message.reactions)).map(([emoji, count]) => (
                <button
                  key={emoji}
                  className={`reaction-btn ${hasUserReacted(message.reactions, emoji) ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hasUserReacted(message.reactions, emoji)) {
                      removeReaction(message.id);
                    } else {
                      addReaction(message.id, emoji);
                    }
                  }}
                >
                  {emoji} {count}
                </button>
              ))}
            </div>
          )}

          {/* Quick Actions */}
          {!message.deleted && hoveredMessage === message.id && (
            <div className={`quick-actions ${message.senderId === currentUser.uid ? 'sent' : 'received'}`}>
              <button
                className="quick-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onReply(message);
                }}
                title="Reply"
              >
                ↩️
              </button>
              
              <button
                className="quick-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMessageOptions(showMessageOptions === `reactions-${message.id}` ? null : `reactions-${message.id}`);
                }}
                title="React"
              >
                😊
              </button>
              
              <button
                className="quick-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  if (message.imageUrl) {
                    copyMessage('', true);
                  } else {
                    copyMessage(message.text, false);
                  }
                }}
                title="Copy"
              >
                📋
              </button>
              
              {showMessageOptions === `reactions-${message.id}` && (
                <div 
                  className={`emoji-picker ${message.senderId === currentUser.uid ? 'sent' : 'received'}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {reactions.map(emoji => (
                    <button
                      key={emoji}
                      className="emoji-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        addReaction(message.id, emoji);
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
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