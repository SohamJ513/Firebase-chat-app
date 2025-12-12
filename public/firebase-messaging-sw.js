// Service Worker for Firebase Cloud Messaging
// File: public/firebase-messaging-sw.js

console.log('🔥 Firebase Cloud Messaging Service Worker initializing...');

// Load Firebase SDKs (compat version for service worker compatibility)
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

try {
  // ⚠️ SECURITY WARNING: These credentials are visible in client-side code
  // Make sure to RESTRICT this API key in Google Cloud Console
  // Go to: https://console.cloud.google.com/apis/credentials
  // Find your key → Add HTTP referrer restrictions
  
  const firebaseConfig = {
    apiKey: "AIzaSyB_2ENI6fCDdM4SCO4AZyaCqAwuYPEHSqc",
    authDomain: "chat-app-f4bb5.firebaseapp.com",
    projectId: "chat-app-f4bb5",
    storageBucket: "chat-app-f4bb5.firebasestorage.app",
    messagingSenderId: "618364636557",
    appId: "1:618364636557:web:5154882cef1f56409241c4",
    measurementId: "G-MWET80R2RC"
  };

  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  console.log('✅ Firebase initialized successfully in service worker');

  // Get messaging instance
  const messaging = firebase.messaging();
  
  // ===========================================
  // BACKGROUND MESSAGE HANDLER
  // ===========================================
  messaging.onBackgroundMessage((payload) => {
    console.log('[SW] 📨 Received background message:', payload);
    
    // Extract data with fallbacks
    const notificationData = payload.notification || {};
    const customData = payload.data || {};
    
    // Notification title with fallback
    const notificationTitle = notificationData.title || 
                             customData.title || 
                             'New Message';
    
    // Notification body with fallback
    const notificationBody = notificationData.body || 
                            customData.body || 
                            'You have a new message';
    
    // Notification icon (use absolute URL for reliability)
    const notificationIcon = notificationData.icon || 
                            customData.icon || 
                            '/favicon.ico';
    
    // Create unique tag to prevent notification stacking
    const notificationTag = 'chat-' + 
                           (customData.chatId || 'general') + 
                           '-' + 
                           (customData.messageId || Date.now());
    
    // Notification options
    const notificationOptions = {
      body: notificationBody,
      icon: notificationIcon,
      badge: '/favicon.ico',
      data: {
        ...customData,
        // Add metadata
        receivedAt: Date.now(),
        source: 'firebase-fcm'
      },
      tag: notificationTag,
      requireInteraction: false,
      silent: false,
      timestamp: Date.now(),
      vibrate: [200, 100, 200], // Vibration pattern for mobile devices
    };
    
    // Add actions for chat-specific notifications
    if (customData.chatId) {
      notificationOptions.actions = [
        {
          action: 'open-chat',
          title: '💬 Open Chat',
          icon: '/favicon.ico'
        },
        {
          action: 'mark-read',
          title: '✓ Mark as Read',
          icon: '/favicon.ico'
        }
      ];
    }
    
    // Show notification with error handling
    try {
      self.registration.showNotification(notificationTitle, notificationOptions)
        .then(() => {
          console.log('[SW] ✅ Notification shown successfully:', notificationTag);
        })
        .catch(error => {
          console.error('[SW] ❌ Error showing notification:', error);
        });
    } catch (error) {
      console.error('[SW] ❌ Exception showing notification:', error);
    }
  });

} catch (error) {
  console.error('[SW] ❌ Failed to initialize Firebase:', error);
  // Fallback: Use browser's built-in push notifications if Firebase fails
}

// ===========================================
// NOTIFICATION CLICK HANDLER
// ===========================================
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] 👆 Notification clicked:', event.notification.tag);
  
  const notification = event.notification;
  const action = event.action;
  const notificationData = notification.data || {};
  
  // Close the notification immediately
  notification.close();
  
  // Determine which action was clicked
  switch (action) {
    case 'open-chat':
      console.log('[SW] User clicked: Open Chat');
      openOrFocusChat(notificationData.chatId);
      break;
      
    case 'mark-read':
      console.log('[SW] User clicked: Mark as Read');
      // You could send a message back to main app to mark as read
      sendMessageToClient({
        type: 'MARK_AS_READ',
        chatId: notificationData.chatId,
        messageId: notificationData.messageId
      });
      break;
      
    default:
      console.log('[SW] User clicked notification body');
      openOrFocusChat(notificationData.chatId);
      break;
  }
});

// ===========================================
// HELPER FUNCTIONS
// ===========================================
function openOrFocusChat(chatId) {
  const urlToOpen = chatId ? `/chat/${chatId}` : '/';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      let chatClient = null;
      let mainClient = null;
      
      // Find existing windows
      for (const client of clientList) {
        const clientUrl = new URL(client.url);
        
        // Check for exact chat URL match
        if (chatId && clientUrl.pathname === `/chat/${chatId}`) {
          chatClient = client;
          break;
        }
        
        // Check for any chat page
        if (clientUrl.pathname.startsWith('/chat')) {
          chatClient = client;
        }
        
        // Check for main app page
        if (clientUrl.pathname === '/' || clientUrl.pathname === '/index.html') {
          mainClient = client;
        }
      }
      
      // Priority: 1. Exact chat match, 2. Any chat, 3. Main app, 4. New window
      if (chatClient && 'focus' in chatClient) {
        console.log('[SW] Focusing existing chat window');
        return chatClient.focus();
      } else if (mainClient && 'focus' in mainClient) {
        console.log('[SW] Focusing main app window');
        mainClient.postMessage({
          type: 'NAVIGATE_TO_CHAT',
          chatId: chatId
        });
        return mainClient.focus();
      } else {
        console.log('[SW] Opening new window to:', urlToOpen);
        return clients.openWindow(urlToOpen);
      }
    })
  );
}

function sendMessageToClient(message) {
  clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then((clientList) => {
    for (const client of clientList) {
      client.postMessage(message);
    }
  });
}

// ===========================================
// SERVICE WORKER LIFECYCLE EVENTS
// ===========================================
self.addEventListener('install', (event) => {
  console.log('[SW] 🔧 Service Worker installing...');
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] 🚀 Service Worker activating...');
  // Take control immediately of all pages
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  console.log('[SW] 📩 Message received from client:', event.data);
  
  // Handle messages from the main app
  if (event.data && event.data.type === 'TEST_NOTIFICATION') {
    console.log('[SW] Received test notification request');
    self.registration.showNotification('Test Notification', {
      body: 'This is a test from the main app!',
      icon: '/favicon.ico',
      tag: 'test-' + Date.now()
    });
  }
});

// ===========================================
// PUSH EVENT HANDLER (Fallback)
// ===========================================
self.addEventListener('push', (event) => {
  console.log('[SW] 📬 Push event received (fallback)');
  
  // Only use this if Firebase onBackgroundMessage doesn't fire
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    console.log('[SW] Push data:', data);
    
    // Show a simple notification
    const options = {
      body: data.body || 'New notification',
      icon: data.icon || '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'push-' + Date.now()
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Notification', options)
    );
  } catch (error) {
    console.error('[SW] Error handling push event:', error);
    
    // Show a generic notification
    event.waitUntil(
      self.registration.showNotification('New Message', {
        body: 'You have a new notification',
        icon: '/favicon.ico',
        tag: 'generic-' + Date.now()
      })
    );
  }
});

// ===========================================
// ERROR HANDLING
// ===========================================
self.addEventListener('error', (event) => {
  console.error('[SW] 🚨 Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] 🚨 Unhandled promise rejection:', event.reason);
});

console.log('✅ Service Worker setup complete');