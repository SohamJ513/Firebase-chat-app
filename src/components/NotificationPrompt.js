// src/components/NotificationPrompt.js - CORRECT CONTENT
import React, { useState, useEffect } from 'react';
import './NotificationPrompt.css';

const NotificationPrompt = ({ onEnable, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show prompt only if:
    // 1. Notifications are not granted
    // 2. User hasn't dismissed before
    const shouldShow = () => {
      const permission = Notification.permission;
      const dismissed = localStorage.getItem('notificationPromptDismissed');
      
      return permission === 'default' && !dismissed;
    };

    // Show after a short delay
    const timer = setTimeout(() => {
      if (shouldShow()) {
        setIsVisible(true);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleEnable = async () => {
    if (onEnable) {
      await onEnable();
    }
    setIsVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('notificationPromptDismissed', 'true');
    if (onDismiss) {
      onDismiss();
    }
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="notification-prompt">
      <div className="prompt-content">
        <div className="prompt-icon">🔔</div>
        <div className="prompt-text">
          <h3>Enable Notifications</h3>
          <p>Get notified about new messages</p>
        </div>
        <div className="prompt-actions">
          <button className="btn-dismiss" onClick={handleDismiss}>
            Later
          </button>
          <button className="btn-enable" onClick={handleEnable}>
            Enable
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPrompt;