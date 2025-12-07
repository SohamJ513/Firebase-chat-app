// src/components/ChatArea.js - UPDATED WITH IMAGE UPLOAD
import React, { useState, useEffect, useRef } from 'react';
import { 
  ref, 
  onValue, 
  push, 
  update,
  serverTimestamp,
  set,
  onDisconnect
} from 'firebase/database';
import { database } from '../firebase';
import MessageItem from './MessageItem';
import EmojiPicker from './EmojiPicker';
import ImageUploadButton from './ImageUploadButton';
import './ChatArea.css';

const ChatArea = ({ selectedUser, selectedGroup, currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [showPinnedMessages, setShowPinnedMessages] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  
  // TYPING INDICATOR STATES
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  
  // EMOJI PICKER STATES
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiButtonRef = useRef(null);
  const emojiPickerRef = useRef(null);
  
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Available reactions
  const reactions = ['👍', '❤️', '😂', '😮', '😢', '😡'];

  const getChatId = (uid1, uid2) => {
    return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
  };

  // TYPING INDICATOR: Update typing status in Firebase
  const updateTypingStatus = (isTyping) => {
    if ((!selectedUser && !selectedGroup) || !currentUser) return;

    try {
      let typingRef;
      
      if (selectedGroup) {
        typingRef = ref(database, `groups/${selectedGroup.id}/typing/${currentUser.uid}`);
      } else {
        const chatId = getChatId(currentUser.uid, selectedUser.uid);
        typingRef = ref(database, `chats/${chatId}/typing/${currentUser.uid}`);
      }
      
      if (isTyping) {
        set(typingRef, {
          userId: currentUser.uid,
          userName: currentUser.displayName || currentUser.email,
          timestamp: Date.now()
        });
      } else {
        set(typingRef, null);
      }
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  };

  // TYPING INDICATOR: Handle input change with debounce
  const handleInputChange = (e) => {
    const value = e.target.value;
    setNewMessage(value);
    
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    if (value.length > 0 && !isTyping) {
      setIsTyping(true);
      updateTypingStatus(true);
    }
    
    const timeout = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        updateTypingStatus(false);
      }
    }, 1500);
    
    setTypingTimeout(timeout);
  };

  // Handle image upload from ImageUploadButton
  const handleImageUpload = (imageUrl) => {
    if (!selectedUser && !selectedGroup) return;
    
    setUploadingImage(true);
    
    const imageMessageData = {
      text: '',
      imageUrl: imageUrl,
      senderId: currentUser.uid,
      senderName: currentUser.displayName || currentUser.email,
      timestamp: serverTimestamp(),
      createdAt: Date.now(),
      edited: false,
      status: "sent",
      readBy: {},
      reactions: {},
      replyTo: replyingTo ? {
        messageId: replyingTo.id,
        text: replyingTo.text || '[Image]',
        senderName: replyingTo.senderName
      } : null
    };
    
    sendImageMessage(imageMessageData);
  };

  // Send image message to Firebase
  const sendImageMessage = async (messageData) => {
    try {
      let messagesRef;
      
      if (selectedGroup) {
        messagesRef = ref(database, `groups/${selectedGroup.id}/messages`);
      } else {
        const chatId = getChatId(currentUser.uid, selectedUser.uid);
        messagesRef = ref(database, `chats/${chatId}/messages`);
      }

      await push(messagesRef, messageData);
      
      if (selectedGroup) {
        const groupRef = ref(database, `groups/${selectedGroup.id}`);
        await update(groupRef, {
          lastActivity: Date.now(),
          lastMessage: '[Image]'
        });
      }
      
      setReplyingTo(null);
      
      if (isNearBottom) {
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      }
    } catch (error) {
      console.error('Error sending image message:', error);
      alert('Failed to send image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  // EMOJI PICKER: Handle emoji selection
  const handleEmojiSelect = (emoji) => {
    setNewMessage(prev => prev + emoji);
    document.querySelector('.message-input')?.focus();
    
    if (!isTyping && (selectedUser || selectedGroup)) {
      setIsTyping(true);
      updateTypingStatus(true);
      
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      
      const timeout = setTimeout(() => {
        if (isTyping) {
          setIsTyping(false);
          updateTypingStatus(false);
        }
      }, 1500);
      
      setTypingTimeout(timeout);
    }
  };

  // EMOJI PICKER: Toggle emoji picker
  const toggleEmojiPicker = () => {
    setShowEmojiPicker(!showEmojiPicker);
  };

  // EMOJI PICKER: Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showEmojiPicker &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(event.target) &&
        !(event.target.closest && event.target.closest('.emoji-picker-container'))
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  // TYPING INDICATOR: Listen to other users' typing status
  useEffect(() => {
    if ((selectedUser || selectedGroup) && currentUser) {
      let typingRef;
      
      if (selectedGroup) {
        typingRef = ref(database, `groups/${selectedGroup.id}/typing`);
      } else {
        const chatId = getChatId(currentUser.uid, selectedUser.uid);
        typingRef = ref(database, `chats/${chatId}/typing`);
      }
      
      const unsubscribe = onValue(typingRef, (snapshot) => {
        const typingData = snapshot.val() || {};
        
        if (selectedGroup) {
          const otherTypingUsers = {};
          Object.entries(typingData).forEach(([userId, typingInfo]) => {
            if (userId !== currentUser.uid && typingInfo) {
              otherTypingUsers[userId] = typingInfo;
            }
          });
          setTypingUsers(otherTypingUsers);
          setOtherUserTyping(Object.keys(otherTypingUsers).length > 0);
        } else {
          const otherUserId = selectedUser.uid;
          const isOtherTyping = typingData[otherUserId] !== undefined && typingData[otherUserId] !== null;
          setOtherUserTyping(isOtherTyping);
        }
      });

      return () => {
        unsubscribe();
        if (isTyping) {
          updateTypingStatus(false);
        }
      };
    }
  }, [selectedUser, selectedGroup, currentUser, isTyping]);

  // Clean up typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      if (isTyping) {
        updateTypingStatus(false);
      }
    };
  }, [typingTimeout, isTyping]);

  // Listen to messages for selected chat or group
  useEffect(() => {
    if ((selectedUser || selectedGroup) && currentUser) {
      let messagesRef;
      
      if (selectedGroup) {
        messagesRef = ref(database, `groups/${selectedGroup.id}/messages`);
      } else {
        const chatId = getChatId(currentUser.uid, selectedUser.uid);
        messagesRef = ref(database, `chats/${chatId}/messages`);
      }
      
      const unsubscribe = onValue(messagesRef, (snapshot) => {
        const messagesData = snapshot.val() || {};
        const messagesList = Object.keys(messagesData)
          .map(key => ({
            id: key,
            ...messagesData[key],
            status: messagesData[key].status || 'sent',
            readBy: messagesData[key].readBy || {},
            pinned: messagesData[key].pinned || false
          }))
          .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        
        setMessages(messagesList);
        
        const pinned = messagesList.filter(msg => msg.pinned && !msg.deleted);
        setPinnedMessages(pinned);
      });

      return () => unsubscribe();
    }
  }, [selectedUser, selectedGroup, currentUser]);

  // Handle scroll behavior
  useEffect(() => {
    if (isNearBottom) {
      scrollToBottom();
    }
  }, [messages]);

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const threshold = 100;
      const nearBottom = scrollHeight - scrollTop - clientHeight < threshold;
      setIsNearBottom(nearBottom);
      setShowScrollToBottom(!nearBottom);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Send text message - UPDATED FIX
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || (!selectedUser && !selectedGroup) || loading) return;

    // Clear typing status when sending
    if (isTyping) {
      setIsTyping(false);
      updateTypingStatus(false);
    }
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Close emoji picker when sending
    setShowEmojiPicker(false);

    const messageText = newMessage.trim();
    setLoading(true);
    setNewMessage(''); // Clear input immediately for better UX
    
    try {
      let messagesRef;
      
      if (selectedGroup) {
        messagesRef = ref(database, `groups/${selectedGroup.id}/messages`);
      } else {
        const chatId = getChatId(currentUser.uid, selectedUser.uid);
        messagesRef = ref(database, `chats/${chatId}/messages`);
      }

      const messageData = {
        text: messageText,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email,
        timestamp: serverTimestamp(),
        createdAt: Date.now(),
        edited: false,
        status: "sent",
        readBy: {},
        reactions: {},
        replyTo: replyingTo ? {
          messageId: replyingTo.id,
          text: replyingTo.text,
          senderName: replyingTo.senderName
        } : null
      };

      await push(messagesRef, messageData);
      
      // Clear reply if exists
      setReplyingTo(null);
      
      // Update group's last activity
      if (selectedGroup) {
        const groupRef = ref(database, `groups/${selectedGroup.id}`);
        await update(groupRef, {
          lastActivity: Date.now(),
          lastMessage: messageText
        });
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore the message if failed
      setNewMessage(messageText);
      alert('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
      
      // Scroll to bottom
      if (isNearBottom) {
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      }
    }
  };

  // Reply to message
  const replyToMessage = (message) => {
    setReplyingTo(message);
    document.querySelector('.message-input')?.focus();
  };

  // Pin message
  const pinMessage = async (messageId) => {
    try {
      let messageRef;
      
      if (selectedGroup) {
        messageRef = ref(database, `groups/${selectedGroup.id}/messages/${messageId}`);
      } else {
        const chatId = getChatId(currentUser.uid, selectedUser.uid);
        messageRef = ref(database, `chats/${chatId}/messages/${messageId}`);
      }
      
      await update(messageRef, {
        pinned: true,
        pinnedBy: currentUser.uid,
        pinnedAt: Date.now()
      });
    } catch (error) {
      console.error('Error pinning message:', error);
    }
  };

  // Unpin message
  const unpinMessage = async (messageId) => {
    try {
      let messageRef;
      
      if (selectedGroup) {
        messageRef = ref(database, `groups/${selectedGroup.id}/messages/${messageId}`);
      } else {
        const chatId = getChatId(currentUser.uid, selectedUser.uid);
        messageRef = ref(database, `chats/${chatId}/messages/${messageId}`);
      }
      
      await update(messageRef, {
        pinned: false,
        pinnedBy: null,
        pinnedAt: null
      });
    } catch (error) {
      console.error('Error unpinning message:', error);
    }
  };

  // Scroll to message
  const scrollToMessage = (messageId) => {
    const messageElement = document.querySelector(`.message-container-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      messageElement.style.backgroundColor = 'rgba(33, 150, 243, 0.1)';
      setTimeout(() => {
        messageElement.style.backgroundColor = '';
      }, 2000);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'Never';
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  // TYPING INDICATOR: Get typing display text
  const getTypingDisplayText = () => {
    if (selectedGroup && Object.keys(typingUsers).length > 0) {
      const userNames = Object.values(typingUsers)
        .slice(0, 2)
        .map(user => user.userName.split(' ')[0]);
      
      if (userNames.length === 1) {
        return `${userNames[0]} is typing...`;
      } else if (userNames.length === 2) {
        return `${userNames[0]} and ${userNames[1]} are typing...`;
      } else {
        return `${userNames.length} people are typing...`;
      }
    } else if (otherUserTyping && selectedUser) {
      const userName = selectedUser.displayName || selectedUser.email;
      return `${userName.split(' ')[0]} is typing...`;
    }
    return null;
  };

  return (
    <div className="chat-area">
      {selectedUser || selectedGroup ? (
        <>
          {/* Chat Header */}
          {selectedUser ? (
            <div className="chat-header">
              <div className="user-avatar">
                <div className="user-avatar-circle">
                  {selectedUser.photoURL ? (
                    <img 
                      src={selectedUser.photoURL} 
                      alt={selectedUser.displayName || selectedUser.email}
                    />
                  ) : (
                    (selectedUser.displayName || selectedUser.email).charAt(0).toUpperCase()
                  )}
                </div>
              </div>
              <div>
                <h3>{selectedUser.displayName || selectedUser.email}</h3>
                <span className={`user-status ${selectedUser.online ? 'online' : 'offline'}`}>
                  {selectedUser.online ? 'Online' : `Last seen ${formatLastSeen(selectedUser.lastSeen)}`}
                </span>
              </div>
            </div>
          ) : (
            <div className="group-chat-header">
              <div className="group-header-info">
                <div className="group-avatar">
                  <div className="group-avatar-circle">
                    {selectedGroup.avatar ? (
                      <img 
                        src={selectedGroup.avatar} 
                        alt={selectedGroup.name}
                      />
                    ) : (
                      selectedGroup.name.charAt(0).toUpperCase()
                    )}
                  </div>
                </div>
                <div className="group-header-details">
                  <h3>{selectedGroup.name}</h3>
                  {selectedGroup.description && (
                    <div className="group-description">{selectedGroup.description}</div>
                  )}
                  <div className="group-member-count">
                    {selectedGroup.memberCount} member{selectedGroup.memberCount !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              <div className="group-actions">
                <button className="group-action-btn">👥 Members</button>
                <button className="group-action-btn">⚙️ Settings</button>
              </div>
            </div>
          )}

          {/* Pinned Messages Section */}
          {pinnedMessages.length > 0 && (
            <div className="pinned-messages-section">
              <div className="pinned-messages-header">
                <span>📌 Pinned Messages ({pinnedMessages.length})</span>
                <button 
                  className="pinned-messages-toggle"
                  onClick={() => setShowPinnedMessages(!showPinnedMessages)}
                >
                  {showPinnedMessages ? 'Hide' : 'Show'}
                </button>
              </div>
              {showPinnedMessages && (
                <div className="pinned-messages-list">
                  {pinnedMessages.map(message => (
                    <div 
                      key={message.id}
                      className="pinned-message-item"
                      onClick={() => scrollToMessage(message.id)}
                    >
                      <div className="pinned-message-content">
                        {message.imageUrl ? (
                          <div className="pinned-message-image">
                            <span>🖼️ Image</span>
                          </div>
                        ) : (
                          message.text
                        )}
                      </div>
                      <div className="pinned-message-meta">
                        <span className="pinned-message-sender">{message.senderName}</span>
                        <div>
                          <span>{formatTime(message.createdAt)}</span>
                          <button
                            className="unpin-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              unpinMessage(message.id);
                            }}
                            title="Unpin message"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {replyingTo && (
            <div className="reply-banner">
              <div className="reply-info">
                <div className="reply-to-user">Replying to {replyingTo.senderName}</div>
                <div className="reply-text">
                  {replyingTo.imageUrl ? '[Image]' : replyingTo.text}
                </div>
              </div>
              <button 
                className="reply-close-btn"
                onClick={() => setReplyingTo(null)}
              >
                ✕
              </button>
            </div>
          )}

          {/* Messages Container */}
          <div 
            ref={messagesContainerRef}
            className="messages-container"
            onScroll={handleScroll}
          >
            {messages.length === 0 ? (
              <div className="no-messages">
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => (
                <MessageItem
                  key={message.id}
                  message={message}
                  currentUser={currentUser}
                  selectedUser={selectedUser}
                  selectedGroup={selectedGroup}
                  onReply={replyToMessage}
                  onPin={pinMessage}
                  onUnpin={unpinMessage}
                  reactions={reactions}
                />
              ))
            )}
            
            {/* TYPING INDICATOR DISPLAY */}
            {getTypingDisplayText() && (
              <div className="typing-indicator">
                <div className="typing-dots">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </div>
                <span className="typing-text">{getTypingDisplayText()}</span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Scroll to Bottom Button */}
          {showScrollToBottom && (
            <button
              className="scroll-to-bottom"
              onClick={scrollToBottom}
              title="Scroll to bottom"
            >
              ↓
            </button>
          )}

          {/* Message Input with Emoji Picker and Image Upload */}
          <div className="message-input-actions">
            {/* Image Upload Button */}
            <div className="image-upload-wrapper">
              <ImageUploadButton 
                onImageUpload={handleImageUpload}
              />
              {uploadingImage && (
                <div className="uploading-indicator">
                  <div className="uploading-spinner"></div>
                  <span>Uploading image...</span>
                </div>
              )}
            </div>

            <form 
              className="message-form"
              onSubmit={sendMessage}
            >
              <div className="message-input-container">
                {/* Emoji Toggle Button */}
                <button
                  type="button"
                  className="emoji-toggle-btn"
                  onClick={toggleEmojiPicker}
                  ref={emojiButtonRef}
                  aria-label="Toggle emoji picker"
                >
                  {showEmojiPicker ? '😊' : '😀'}
                </button>
                
                {/* Message Input */}
                <input
                  type="text"
                  value={newMessage}
                  onChange={handleInputChange}
                  placeholder={
                    replyingTo 
                      ? `Reply to ${replyingTo.senderName}...` 
                      : selectedGroup
                        ? `Message ${selectedGroup.name}...`
                        : "Type a message..."
                  }
                  disabled={loading || uploadingImage}
                  className="message-input"
                />
              </div>

              <button 
                type="submit" 
                disabled={loading || !newMessage.trim() || uploadingImage}
                className={`send-btn ${newMessage.trim() ? 'active' : 'inactive'}`}
              >
                {loading ? (
                  <span className="sending-indicator">
                    <span className="sending-dot"></span>
                    <span className="sending-dot"></span>
                    <span className="sending-dot"></span>
                  </span>
                ) : 'Send'}
              </button>

              {/* Emoji Picker Component */}
              <EmojiPicker
                isOpen={showEmojiPicker}
                onEmojiClick={handleEmojiSelect}
                onClose={() => setShowEmojiPicker(false)}
                position="top"
              />
            </form>
          </div>
        </>
      ) : (
        <div className="empty-chat">
          <h3>Select a chat to start messaging</h3>
          <p>Choose someone from the users list or join a group to begin a conversation</p>
        </div>
      )}
    </div>
  );
};

export default ChatArea;