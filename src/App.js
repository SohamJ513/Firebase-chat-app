// App.js - Updated with email verification check and debug buttons restored
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signOut, sendEmailVerification} from 'firebase/auth';
import { getDatabase, ref, onValue, set } from 'firebase/database';
import { auth } from './firebase';
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import ChatPage from './components/ChatPage';
import notificationService from './utils/notificationUtils';
import NotificationPrompt from './components/NotificationPrompt';
import './App.css';

// Custom hook to check if user needs email verification
const useEmailVerificationCheck = (user) => {
  const location = useLocation();
  const [needsVerification, setNeedsVerification] = useState(false);
  
  useEffect(() => {
    if (user && !user.emailVerified) {
      // Check if user signed up with email/password
      const isEmailProvider = user.providerData.some(
        provider => provider.providerId === 'password'
      );
      
      // Only show verification message on auth page or chat page
      if (isEmailProvider && (location.pathname === '/auth' || location.pathname === '/chat')) {
        setNeedsVerification(true);
      } else {
        setNeedsVerification(false);
      }
    } else {
      setNeedsVerification(false);
    }
  }, [user, location]);
  
  return needsVerification;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('light');
  const [notificationStatus, setNotificationStatus] = useState('checking');
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationUnsubscribe, setNotificationUnsubscribe] = useState(null);
  const [db] = useState(getDatabase());
  const [shownNotifications, setShownNotifications] = useState(new Set());
  const [emailVerified, setEmailVerified] = useState(true); // Track email verification state
  
  // Load theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('chatAppTheme');
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('chatAppTheme', theme);
  }, [theme]);

  // Setup notification listener for Realtime Database
  const setupNotificationListener = (userId) => {
    if (!userId) return null;
    
    const notificationsRef = ref(db, `users/${userId}/notifications`);
    
    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      const notifications = snapshot.val() || {};
      
      const unread = Object.values(notifications)
        .filter(notification => !notification.read && notification.senderId !== userId)
        .length;
      
      setUnreadCount(unread);
      
      const unreadNotifications = Object.entries(notifications)
        .filter(([key, notification]) => !notification.read && notification.senderId !== userId)
        .map(([key, notification]) => ({ key, ...notification }))
        .sort((a, b) => b.createdAt - a.createdAt);
      
      unreadNotifications.forEach(notification => {
        if (Notification.permission !== 'granted') return;
        
        if (shownNotifications.has(notification.key)) {
          return;
        }
        
        if (document.hasFocus() && document.visibilityState === 'visible') {
          return;
        }
        
        const notificationTag = `chat-${notification.chatId || 'general'}-${notification.key}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        try {
          const browserNotification = new Notification(notification.title || 'New Message', {
            body: notification.body || 'You have a new message',
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: notificationTag,
            data: notification,
            requireInteraction: false,
            silent: false,
            timestamp: Date.now()
          });
          
          setShownNotifications(prev => new Set([...prev, notification.key]));
          
          browserNotification.onclick = () => {
            window.focus();
            browserNotification.close();
            
            const readRef = ref(db, `users/${userId}/notifications/${notification.key}/read`);
            set(readRef, true);
            
            setShownNotifications(prev => {
              const newSet = new Set(prev);
              newSet.delete(notification.key);
              return newSet;
            });
            
            if (notification.chatId) {
              console.log('Opening chat:', notification.chatId);
            }
          };
          
          setTimeout(() => {
            try {
              browserNotification.close();
            } catch (e) {}
            
            setTimeout(() => {
              const readRef = ref(db, `users/${userId}/notifications/${notification.key}/read`);
              set(readRef, true);
            }, 1000);
          }, 5000);
          
          console.log('🔔 Notification shown:', notification.title);
          
        } catch (error) {
          console.error('❌ Error showing notification:', error);
        }
      });
    });
    
    return unsubscribe;
  };

  // Handle authentication and notifications
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      // Check email verification status
      if (currentUser) {
        setEmailVerified(currentUser.emailVerified);
        console.log('User logged in:', currentUser.email, 'Email verified:', currentUser.emailVerified);
        
        // For email/password users without verification, sign them out
        const isEmailProvider = currentUser.providerData.some(
          provider => provider.providerId === 'password'
        );
        
        if (isEmailProvider && !currentUser.emailVerified) {
          console.log('Email not verified for email/password user, staying on auth page');
          // Don't sign out automatically - let the user see verification message
        }
      }
      
      if (currentUser) {
        console.log('User logged in:', currentUser.email);
        
        setShownNotifications(new Set());
        
        try {
          await notificationService.init();
          const currentPermission = Notification.permission;
          setNotificationStatus(currentPermission);
          console.log('Notification status:', currentPermission);
          
          if (currentPermission === 'granted') {
            console.log('Notification permission already granted, checking token...');
            
            const token = await notificationService.getToken();
            if (token) {
              console.log('✅ Token obtained and saved to Realtime DB');
              
              const savedToken = await notificationService.getTokenFromDatabase();
              if (savedToken) {
                console.log('✅ Token verified in DB (first 30 chars):', savedToken.substring(0, 30) + '...');
              }
            }
            
            const unsubscribe = setupNotificationListener(currentUser.uid);
            setNotificationUnsubscribe(() => unsubscribe);
          } else {
            console.log('Notification permission:', currentPermission);
          }
        } catch (error) {
          console.error('Error in notification init:', error);
          setNotificationStatus('error');
        }
      } else {
        setNotificationStatus('checking');
        setUnreadCount(0);
        setShownNotifications(new Set());
        setEmailVerified(true); // Reset email verification state
      }
      
      setLoading(false);
    });

    const registerServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
          console.log('Service Worker registered with scope:', registration.scope);
        } catch (error) {
          console.log('Service Worker registration failed:', error);
        }
      }
    };
    
    registerServiceWorker();

    return () => {
      unsubscribeAuth();
      if (notificationUnsubscribe) {
        notificationUnsubscribe();
      }
    };
  }, []);

  // ===== DEBUG/TEST HANDLER FUNCTIONS =====
  
  // Debug function to check FCM token in DB
  const checkFCMTokenInDB = async () => {
    if (!user) {
      alert('Please log in first');
      return;
    }
    
    const token = await notificationService.getTokenFromDatabase();
    if (token) {
      console.log('FCM Token in DB:', token);
      console.log('Token length:', token.length);
      alert(`FCM Token exists in DB (${token.length} chars)\nCheck console for details.`);
    } else {
      console.log('No FCM token found in DB');
      alert('No FCM token found in Realtime Database');
    }
  };

  // Cleanup old token format if needed
  const cleanupOldTokenFormat = async () => {
    if (!user) {
      alert('Please log in first');
      return;
    }
    
    const dbRef = ref(db, `users/${user.uid}/fcmToken`);
    const { get, remove } = await import('firebase/database');
    const snapshot = await get(dbRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      
      // Check if it's an object (old format)
      if (typeof data === 'object' && data !== null) {
        console.log('Found old object format, cleaning up...');
        await remove(dbRef);
        console.log('✅ Old token format removed');
        alert('Old token format removed! Please enable notifications again.');
      } else if (typeof data === 'string') {
        console.log('Token is already in string format ✅');
        alert('Token is already in correct string format!');
      }
    } else {
      console.log('No token found to clean up');
      alert('No token found in database');
    }
  };

  // Test notification function (for debugging)
  const testNotification = () => {
    if (Notification.permission === 'granted') {
      new Notification('Test Notification', {
        body: 'This is a test notification from the browser!',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'test-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
      });
      
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification('Service Worker Test', {
            body: 'Service worker notifications are working!',
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'sw-test-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
          });
        });
      }
    } else {
      alert('Please enable notifications first using the "Enable Notifications" button');
    }
  };

  // Manually trigger a notification (for testing)
  const triggerTestNotification = async () => {
    if (!user) return;
    
    const notificationKey = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const notificationRef = ref(db, `users/${user.uid}/notifications/${notificationKey}`);
    
    await set(notificationRef, {
      title: 'Test Notification',
      body: 'This is a manual test notification - ' + new Date().toLocaleTimeString(),
      chatId: 'test-chat',
      senderId: 'system',
      senderName: 'System',
      messageText: 'Test message content',
      type: 'test',
      read: false,
      createdAt: Date.now()
    });
    
    console.log('✅ Test notification triggered in Realtime DB');
    console.log('   Key:', notificationKey);
  };

  // Clear all shown notifications (debug function)
  const clearShownNotifications = () => {
    setShownNotifications(new Set());
    console.log('✅ Cleared all shown notifications');
    alert('Cleared shown notifications cache. New notifications will appear again.');
  };

  // ===== END DEBUG/TEST HANDLER FUNCTIONS =====

  const handleLogout = async () => {
    try {
      await notificationService.cleanupOnLogout();
      
      if (notificationUnsubscribe) {
        notificationUnsubscribe();
        setNotificationUnsubscribe(null);
      }
      
      setShownNotifications(new Set());
      
      await signOut(auth);
      setUnreadCount(0);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const handleEnableNotifications = async () => {
    console.log('User clicked enable notifications');
    try {
      const token = await notificationService.requestPermission();
      
      if (token) {
        setNotificationStatus('granted');
        console.log('✅ Notifications enabled successfully!');
        
        const savedToken = await notificationService.getTokenFromDatabase();
        if (savedToken) {
          console.log('✅ Token verified in DB (first 30 chars):', savedToken.substring(0, 30) + '...');
        }
        
        if (user) {
          const unsubscribe = setupNotificationListener(user.uid);
          setNotificationUnsubscribe(() => unsubscribe);
        }
        
        if (Notification.permission === 'granted') {
          new Notification('Notifications Enabled', {
            body: 'You will now receive push notifications for new messages!',
            icon: '/favicon.ico',
            tag: 'notif-enabled-' + Date.now()
          });
        }
      } else {
        setNotificationStatus('denied');
        console.log('User denied notifications or token not available');
      }
    } catch (error) {
      console.error('❌ Error enabling notifications:', error);
      setNotificationStatus('error');
    }
  };

  const handleDismissNotifications = () => {
    console.log('User dismissed notification prompt');
    localStorage.setItem('notificationPromptDismissed', 'true');
  };

  // Check if user can access chat page
  const canAccessChat = () => {
    if (!user) return false;
    
    // Check if user signed up with email/password
    const isEmailProvider = user.providerData.some(
      provider => provider.providerId === 'password'
    );
    
    // For email/password users, require email verification
    if (isEmailProvider && !user.emailVerified) {
      return false;
    }
    
    // For Google users or verified email users, allow access
    return true;
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const ChatAppHeader = () => (
    <header className="app-header">
      <h1>SparkChat</h1>
      <div className="user-info">
        <span>Welcome, {user.displayName || user.email}</span>
        
        {/* Show email verification warning if needed */}
        {user && user.providerData.some(p => p.providerId === 'password') && !user.emailVerified && (
          <span className="verification-warning" title="Please verify your email">
            ⚠️ Verify Email
          </span>
        )}
        
        {unreadCount > 0 && (
          <div className="notification-badge" title={`${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`}>
            <span>{unreadCount}</span>
          </div>
        )}
        
        <span 
          className="notification-status-indicator" 
          title={`Notifications: ${notificationStatus}\nShown: ${shownNotifications.size}`}
          onClick={() => console.log('Notification status:', notificationStatus, 'Shown:', shownNotifications)}
          style={{ cursor: 'pointer' }}
        >
          {notificationStatus === 'granted' ? '🔔' : '🔕'}
        </span>
        
        {/* ===== DEBUG/TEST BUTTONS RESTORED ===== */}
        <button 
          onClick={checkFCMTokenInDB}
          className="test-notification-btn"
          style={{ backgroundColor: '#2196f3' }}
          title="Check if FCM token is saved in DB"
        >
          Check Token
        </button>
        
        <button 
          onClick={cleanupOldTokenFormat}
          className="test-notification-btn"
          style={{ backgroundColor: '#ff9800' }}
          title="Cleanup old token format"
        >
          Cleanup Token
        </button>
        
        <button 
          onClick={clearShownNotifications}
          className="test-notification-btn"
          style={{ backgroundColor: '#607d8b' }}
          title="Clear shown notifications cache"
        >
          Clear Cache
        </button>
        
        <button 
          onClick={testNotification}
          className="test-notification-btn"
          style={{ backgroundColor: '#4caf50' }}
          title="Test browser notifications"
        >
          Test Notif
        </button>
        
        <button 
          onClick={triggerTestNotification}
          className="test-notification-btn"
          style={{ backgroundColor: '#9c27b0' }}
          title="Trigger test notification in database"
        >
          Trigger Notif
        </button>
        {/* ===== END DEBUG/TEST BUTTONS ===== */}
        
        <button onClick={toggleTheme} className="theme-toggle-btn">
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </div>
    </header>
  );

  return (
    <Router>
      <div className="app">
        <Routes>
          {/* Landing Page - Always accessible */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Auth Page - Accessible to all, with special handling for unverified users */}
          <Route 
            path="/auth" 
            element={
              canAccessChat() ? (
                <Navigate to="/chat" />
              ) : (
                <AuthPage />
              )
            } 
          />
          
          {/* Chat Page - Only accessible if logged in AND verified (for email/password users) */}
          <Route 
            path="/chat" 
            element={
              canAccessChat() ? (
                <div className="app-container">
                  <ChatAppHeader />
                  <ChatPage user={user} />
                </div>
              ) : user ? (
                // User is logged in but not verified (email/password users only)
                <div className="verification-required">
                  <div className="verification-card">
                    <h2>Email Verification Required</h2>
                    <p>Please verify your email address before accessing the chat.</p>
                    <p>We've sent a verification email to <strong>{user.email}</strong>.</p>
                    <div className="verification-actions">
                      <button 
                        onClick={() => auth.signOut().then(() => window.location.href = '/auth')}
                        className="auth-btn primary"
                      >
                        Go to Login
                      </button>
                      <button 
                        onClick={() => {
                          sendEmailVerification(auth.currentUser)
                            .then(() => alert('Verification email resent!'))
                            .catch(error => alert('Error: ' + error.message));
                        }}
                        className="auth-btn secondary"
                      >
                        Resend Verification Email
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <Navigate to="/auth" />
              )
            } 
          />
          
          {/* Redirect any unknown routes to landing page */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        
        {/* Show notification prompt only when needed (in chat page) */}
        {user && notificationStatus === 'default' && window.location.pathname === '/chat' && (
          <NotificationPrompt 
            onEnable={handleEnableNotifications}
            onDismiss={handleDismissNotifications}
          />
        )}
      </div>
    </Router>
  );
}

export default App;