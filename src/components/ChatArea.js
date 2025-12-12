// src/components/ChatArea.js - UPDATED WITH CORRECTED LAYOUT
import React, { useState, useEffect, useRef } from 'react';
import { ref, onValue, push, update, serverTimestamp, set } from 'firebase/database';
import { database } from '../firebase';
import { sendNotification } from '../utils/sendNotification';
import MessageItem from './MessageItem';
import EmojiPicker from './EmojiPicker';
import ImageUploadButton from './ImageUploadButton';
import VoiceRecorder from './VoiceRecorder';
import { Mic } from 'lucide-react';
import './ChatArea.css';

const ChatArea = ({ selectedUser, selectedGroup, currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [showPinnedMessages, setShowPinnedMessages] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const typingTimeout = useRef(null);
  const audioRefs = useRef({});
  const emojiButtonRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const reactions = ['👍', '❤️', '😂', '😮', '😢', '😡'];

  // Helper functions
  const getChatId = (uid1, uid2) => uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
  const formatTime = (timestamp) => timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  const formatDuration = (seconds) => !seconds ? '0:00' : seconds < 60 ? `0:${seconds.toString().padStart(2, '0')}` : `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
  
  const blobToBase64 = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  // Notification trigger
  const triggerNotification = async (messageData) => {
    if (selectedGroup || !selectedUser) return;
    
    try {
      const recipientId = selectedUser.uid;
      const chatId = getChatId(currentUser.uid, recipientId);
      
      await sendNotification({
        recipientId,
        title: currentUser.displayName || currentUser.email || 'New Message',
        body: messageData.type === 'voice' ? '🎤 Voice message' : (messageData.text || '[Image]'),
        chatId,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email,
        messageText: messageData.type === 'voice' ? 'Voice message' : (messageData.text || '[Image]'),
        type: messageData.type || 'message'
      });
    } catch (error) {
      console.error('Error triggering notification:', error);
    }
  };

  // Voice message handler
  const sendVoiceMessage = async (audioBlob, duration) => {
    if ((!selectedUser && !selectedGroup) || !currentUser) return;

    setUploadingVoice(true);
    
    try {
      const base64Audio = await blobToBase64(audioBlob);
      const formattedDuration = formatDuration(duration);
      
      const voiceMessageData = {
        text: `🎤 Voice message (${formattedDuration})`,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email,
        timestamp: serverTimestamp(),
        createdAt: Date.now(),
        edited: false,
        status: "sent",
        readBy: {},
        reactions: {},
        type: 'voice',
        audioData: base64Audio,
        duration,
        formattedDuration,
        replyTo: replyingTo ? {
          messageId: replyingTo.id,
          text: replyingTo.text || '[Image or Voice]',
          senderName: replyingTo.senderName
        } : null
      };
      
      const messagesRef = selectedGroup 
        ? ref(database, `groups/${selectedGroup.id}/messages`)
        : ref(database, `chats/${getChatId(currentUser.uid, selectedUser.uid)}/messages`);
      
      await push(messagesRef, voiceMessageData);
      await triggerNotification(voiceMessageData);
      
      if (selectedGroup) {
        await update(ref(database, `groups/${selectedGroup.id}`), {
          lastActivity: Date.now(),
          lastMessage: '🎤 Voice message'
        });
      }
      
      setReplyingTo(null);
      setShowVoiceRecorder(false);
      
      if (isNearBottom) setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.error('Error sending voice message:', error);
      alert('Failed to send voice message. Please try again.');
    } finally {
      setUploadingVoice(false);
    }
  };

  // Voice playback
  const playVoiceMessage = (messageId, audioData) => {
    if (playingVoiceId && playingVoiceId !== messageId) {
      const prevAudio = audioRefs.current[playingVoiceId];
      if (prevAudio) {
        prevAudio.pause();
        prevAudio.currentTime = 0;
      }
    }
    
    let audio = audioRefs.current[messageId];
    if (!audio) {
      try {
        const byteString = atob(audioData.split(',')[1]);
        const mimeString = audioData.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        
        const audioBlob = new Blob([ab], { type: mimeString });
        audio = new Audio(URL.createObjectURL(audioBlob));
        audioRefs.current[messageId] = audio;
        
        audio.onended = () => setPlayingVoiceId(null);
        audio.onpause = () => {
          if (playingVoiceId === messageId) setPlayingVoiceId(null);
        };
      } catch (error) {
        console.error('Error creating audio:', error);
        alert('Unable to play voice message. The audio data may be corrupted.');
        return;
      }
    }
    
    if (playingVoiceId === messageId) {
      audio.pause();
      setPlayingVoiceId(null);
    } else {
      audio.play()
        .then(() => setPlayingVoiceId(messageId))
        .catch(error => {
          console.error('Error playing audio:', error);
          alert('Unable to play voice message.');
        });
    }
  };

  // Typing indicator
  const updateTypingStatus = (isTyping) => {
    if ((!selectedUser && !selectedGroup) || !currentUser) return;

    const typingRef = selectedGroup
      ? ref(database, `groups/${selectedGroup.id}/typing/${currentUser.uid}`)
      : ref(database, `chats/${getChatId(currentUser.uid, selectedUser.uid)}/typing/${currentUser.uid}`);
    
    isTyping ? set(typingRef, {
      userId: currentUser.uid,
      userName: currentUser.displayName || currentUser.email,
      timestamp: Date.now()
    }) : set(typingRef, null);
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setNewMessage(value);
    
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    
    if (value.length > 0 && !isTyping) {
      setIsTyping(true);
      updateTypingStatus(true);
    }
    
    typingTimeout.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        updateTypingStatus(false);
      }
    }, 1500);
  };

  // Image upload
  const handleImageUpload = (imageUrl) => {
    if (!selectedUser && !selectedGroup) return;
    
    setUploadingImage(true);
    const imageMessageData = {
      text: '',
      imageUrl,
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

  const sendImageMessage = async (messageData) => {
    try {
      const messagesRef = selectedGroup
        ? ref(database, `groups/${selectedGroup.id}/messages`)
        : ref(database, `chats/${getChatId(currentUser.uid, selectedUser.uid)}/messages`);
      
      await push(messagesRef, messageData);
      if (selectedUser) await triggerNotification(messageData);
      
      if (selectedGroup) {
        await update(ref(database, `groups/${selectedGroup.id}`), {
          lastActivity: Date.now(),
          lastMessage: '[Image]'
        });
      }
      
      setReplyingTo(null);
      if (isNearBottom) setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.error('Error sending image:', error);
      alert('Failed to send image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Message functions
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || (!selectedUser && !selectedGroup) || loading) return;

    if (isTyping) {
      setIsTyping(false);
      updateTypingStatus(false);
    }
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    
    setShowEmojiPicker(false);
    const messageText = newMessage.trim();
    setLoading(true);
    setNewMessage('');
    
    try {
      const messagesRef = selectedGroup
        ? ref(database, `groups/${selectedGroup.id}/messages`)
        : ref(database, `chats/${getChatId(currentUser.uid, selectedUser.uid)}/messages`);
      
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
      if (selectedUser) await triggerNotification({ ...messageData, text: messageText });
      
      if (selectedGroup) {
        await update(ref(database, `groups/${selectedGroup.id}`), {
          lastActivity: Date.now(),
          lastMessage: messageText
        });
      }
      
      setReplyingTo(null);
      if (isNearBottom) setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageText);
      alert('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const replyToMessage = (message) => {
    setReplyingTo(message);
    document.querySelector('.message-input')?.focus();
  };

  const pinMessage = async (messageId) => {
    try {
      const messageRef = selectedGroup
        ? ref(database, `groups/${selectedGroup.id}/messages/${messageId}`)
        : ref(database, `chats/${getChatId(currentUser.uid, selectedUser.uid)}/messages/${messageId}`);
      
      await update(messageRef, { pinned: true, pinnedBy: currentUser.uid, pinnedAt: Date.now() });
    } catch (error) {
      console.error('Error pinning message:', error);
    }
  };

  const unpinMessage = async (messageId) => {
    try {
      const messageRef = selectedGroup
        ? ref(database, `groups/${selectedGroup.id}/messages/${messageId}`)
        : ref(database, `chats/${getChatId(currentUser.uid, selectedUser.uid)}/messages/${messageId}`);
      
      await update(messageRef, { pinned: false, pinnedBy: null, pinnedAt: null });
    } catch (error) {
      console.error('Error unpinning message:', error);
    }
  };

  const scrollToMessage = (messageId) => {
    const messageElement = document.querySelector(`.message-container-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      messageElement.style.backgroundColor = 'rgba(33, 150, 243, 0.1)';
      setTimeout(() => { messageElement.style.backgroundColor = ''; }, 2000);
    }
  };

  // Effects
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showEmojiPicker && emojiButtonRef.current && !emojiButtonRef.current.contains(event.target) && !event.target.closest('.emoji-picker-container')) {
        setShowEmojiPicker(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  useEffect(() => {
    if ((selectedUser || selectedGroup) && currentUser) {
      const typingRef = selectedGroup
        ? ref(database, `groups/${selectedGroup.id}/typing`)
        : ref(database, `chats/${getChatId(currentUser.uid, selectedUser.uid)}/typing`);
      
      const unsubscribe = onValue(typingRef, (snapshot) => {
        const typingData = snapshot.val() || {};
        
        if (selectedGroup) {
          const otherTypingUsers = {};
          Object.entries(typingData).forEach(([userId, typingInfo]) => {
            if (userId !== currentUser.uid && typingInfo) otherTypingUsers[userId] = typingInfo;
          });
          setTypingUsers(otherTypingUsers);
          setOtherUserTyping(Object.keys(otherTypingUsers).length > 0);
        } else {
          setOtherUserTyping(typingData[selectedUser.uid] !== undefined && typingData[selectedUser.uid] !== null);
        }
      });

      return () => {
        unsubscribe();
        if (isTyping) updateTypingStatus(false);
      };
    }
  }, [selectedUser, selectedGroup, currentUser, isTyping]);

  useEffect(() => {
    return () => {
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      if (isTyping) updateTypingStatus(false);
    };
  }, [isTyping]);

  useEffect(() => {
    if ((selectedUser || selectedGroup) && currentUser) {
      const messagesRef = selectedGroup
        ? ref(database, `groups/${selectedGroup.id}/messages`)
        : ref(database, `chats/${getChatId(currentUser.uid, selectedUser.uid)}/messages`);
      
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
        setPinnedMessages(messagesList.filter(msg => msg.pinned && !msg.deleted));
      });

      return () => unsubscribe();
    }
  }, [selectedUser, selectedGroup, currentUser]);

  useEffect(() => {
    if (isNearBottom) scrollToBottom();
  }, [messages]);

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const nearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setIsNearBottom(nearBottom);
      setShowScrollToBottom(!nearBottom);
    }
  };

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  const getTypingDisplayText = () => {
    if (selectedGroup && Object.keys(typingUsers).length > 0) {
      const userNames = Object.values(typingUsers).slice(0, 2).map(user => user.userName.split(' ')[0]);
      return userNames.length === 1 ? `${userNames[0]} is typing...` : userNames.length === 2 ? `${userNames[0]} and ${userNames[1]} are typing...` : `${userNames.length} people are typing...`;
    } else if (otherUserTyping && selectedUser) {
      return `${(selectedUser.displayName || selectedUser.email).split(' ')[0]} is typing...`;
    }
    return null;
  };

  const handleEmojiSelect = (emoji) => {
    setNewMessage(prev => prev + emoji);
    document.querySelector('.message-input')?.focus();
    
    if (!isTyping && (selectedUser || selectedGroup)) {
      setIsTyping(true);
      updateTypingStatus(true);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => {
        if (isTyping) {
          setIsTyping(false);
          updateTypingStatus(false);
        }
      }, 1500);
    }
  };

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'Never';
    const diffMins = Math.floor((new Date() - new Date(lastSeen)) / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return new Date(lastSeen).toLocaleDateString();
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
                    <img src={selectedUser.photoURL} alt={selectedUser.displayName || selectedUser.email} />
                  ) : (selectedUser.displayName || selectedUser.email).charAt(0).toUpperCase()}
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
                      <img src={selectedGroup.avatar} alt={selectedGroup.name} />
                    ) : selectedGroup.name.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="group-header-details">
                  <h3>{selectedGroup.name}</h3>
                  {selectedGroup.description && <div className="group-description">{selectedGroup.description}</div>}
                  <div className="group-member-count">{selectedGroup.memberCount} member{selectedGroup.memberCount !== 1 ? 's' : ''}</div>
                </div>
              </div>
              <div className="group-actions">
                <button className="group-action-btn">👥 Members</button>
                <button className="group-action-btn">⚙️ Settings</button>
              </div>
            </div>
          )}

          {/* Pinned Messages */}
          {pinnedMessages.length > 0 && (
            <div className="pinned-messages-section">
              <div className="pinned-messages-header">
                <span>📌 Pinned Messages ({pinnedMessages.length})</span>
                <button className="pinned-messages-toggle" onClick={() => setShowPinnedMessages(!showPinnedMessages)}>
                  {showPinnedMessages ? 'Hide' : 'Show'}
                </button>
              </div>
              {showPinnedMessages && (
                <div className="pinned-messages-list">
                  {pinnedMessages.map(message => (
                    <div key={message.id} className="pinned-message-item" onClick={() => scrollToMessage(message.id)}>
                      <div className="pinned-message-content">
                        {message.imageUrl ? '🖼️ Image' : message.type === 'voice' ? '🎤 Voice message' : message.text}
                      </div>
                      <div className="pinned-message-meta">
                        <span className="pinned-message-sender">{message.senderName}</span>
                        <div>
                          <span>{formatTime(message.createdAt)}</span>
                          <button className="unpin-btn" onClick={(e) => { e.stopPropagation(); unpinMessage(message.id); }} title="Unpin">✕</button>
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
                  {replyingTo.imageUrl ? '[Image]' : replyingTo.type === 'voice' ? '[Voice message]' : replyingTo.text}
                </div>
              </div>
              <button className="reply-close-btn" onClick={() => setReplyingTo(null)}>✕</button>
            </div>
          )}

          {/* Messages Container */}
          <div ref={messagesContainerRef} className="messages-container" onScroll={handleScroll}>
            {messages.length === 0 ? (
              <div className="no-messages"><p>No messages yet. Start the conversation!</p></div>
            ) : messages.map((message) => (
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
                isPlayingVoice={playingVoiceId === message.id}
                onPlayVoice={() => playVoiceMessage(message.id, message.audioData)}
              />
            ))}
            
            {getTypingDisplayText() && (
              <div className="typing-indicator">
                <div className="typing-dots"><span className="dot"></span><span className="dot"></span><span className="dot"></span></div>
                <span className="typing-text">{getTypingDisplayText()}</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {showScrollToBottom && <button className="scroll-to-bottom" onClick={scrollToBottom} title="Scroll to bottom">↓</button>}

          {/* Message Input - CORRECTED STRUCTURE */}
          <form className="message-form" onSubmit={sendMessage}>
            <div className="message-input-container">
              <button 
                type="button" 
                className="emoji-toggle-btn" 
                onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
                ref={emojiButtonRef}
              >
                {showEmojiPicker ? '😊' : '😀'}
              </button>
              <input 
                type="text" 
                value={newMessage} 
                onChange={handleInputChange} 
                placeholder={replyingTo ? `Reply to ${replyingTo.senderName}...` : selectedGroup ? `Message ${selectedGroup.name}...` : "Type a message..."} 
                disabled={loading || uploadingImage || uploadingVoice} 
                className="message-input" 
              />
              
              {/* Image and Voice buttons inside the input container */}
              <div className="input-actions">
                <div className="image-upload-wrapper">
                  <ImageUploadButton onImageUpload={handleImageUpload} />
                  {uploadingImage && <div className="uploading-indicator"><div className="uploading-spinner"></div><span>Uploading image...</span></div>}
                </div>
                
                <button 
                  type="button" 
                  className="voice-btn" 
                  onClick={() => setShowVoiceRecorder(true)} 
                  disabled={uploadingVoice} 
                  title="Record voice message"
                >
                  <Mic size={20} />
                </button>
                {uploadingVoice && <div className="uploading-indicator"><div className="uploading-spinner"></div><span>Uploading voice...</span></div>}
              </div>
            </div>
            
            <button 
              type="submit" 
              disabled={loading || !newMessage.trim() || uploadingImage || uploadingVoice} 
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
          </form>

          {/* Voice Recorder Modal */}
          {showVoiceRecorder && (
            <div className="voice-recorder-modal">
              <div className="modal-backdrop" onClick={() => setShowVoiceRecorder(false)} />
              <div className="modal-content">
                <VoiceRecorder 
                  onSend={sendVoiceMessage} 
                  onCancel={() => setShowVoiceRecorder(false)} 
                />
              </div>
            </div>
          )}

          {/* Emoji Picker */}
          <EmojiPicker 
            isOpen={showEmojiPicker} 
            onEmojiClick={handleEmojiSelect} 
            onClose={() => setShowEmojiPicker(false)} 
            position="top" 
          />
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