import { getAuth } from "firebase/auth";
import { getDatabase, ref, set, remove } from "firebase/database";

class NotificationService {
  constructor() {
    this.messaging = null;
    this.db = getDatabase(); // Changed to Realtime Database
    this.auth = getAuth();
    this.initialized = false;
    this.currentToken = null;
    
    // ⚠️ Replace with your actual VAPID key from Firebase Console
    this.vapidKey = "BLeOFPybtVQ03_iABh2j7nHy4eOK7uWXLRRsaCX43cESRR6u4Ni-p8VZcXljVPNTTQJDKrI-uB0DckALT0KgAxI";
  }

  async init() {
    console.log('Initializing notification service...');
    
    // Check browser support
    if (!this.isNotificationSupported()) {
      console.log('Notifications not supported');
      return false;
    }

    try {
      // Dynamically import Firebase Messaging
      const { getMessaging, isSupported } = await import("firebase/messaging");
      
      // Check if FCM is supported
      const fcmSupported = await isSupported();
      if (!fcmSupported) {
        console.log('FCM not supported in this browser');
        return false;
      }

      // Initialize messaging
      this.messaging = getMessaging();
      this.initialized = true;
      
      console.log('Notification service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
      return false;
    }
  }

  isNotificationSupported() {
    const supported = 'Notification' in window && 'serviceWorker' in navigator;
    console.log('Notification supported:', supported);
    return supported;
  }

  async requestPermission() {
    if (!this.initialized) {
      const initialized = await this.init();
      if (!initialized) {
        console.log('Cannot request permission - service not initialized');
        return null;
      }
    }

    try {
      console.log('Current notification permission:', Notification.permission);
      
      if (Notification.permission === 'granted') {
        console.log('Permission already granted');
        const token = await this.getToken();
        return token;
      }
      
      if (Notification.permission === 'denied') {
        console.log('Permission was previously denied');
        return null;
      }

      // Request permission
      const permission = await Notification.requestPermission();
      console.log('Permission result:', permission);
      
      if (permission === 'granted') {
        const token = await this.getToken();
        return token;
      }
      
      return null;
    } catch (error) {
      console.error('Error requesting permission:', error);
      return null;
    }
  }

  async getToken() {
    if (!this.messaging) {
      console.log('No messaging instance available');
      return null;
    }

    try {
      const { getToken } = await import("firebase/messaging");
      const token = await getToken(this.messaging, {
        vapidKey: this.vapidKey
      });
      
      if (token) {
        this.currentToken = token;
        console.log('FCM Token obtained (first 20 chars):', token.substring(0, 20) + '...');
        await this.saveTokenToDatabase(token);
        return token;
      } else {
        console.log('No FCM token available');
        return null;
      }
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  // ✅ UPDATED: Save token as STRING to Realtime Database
  async saveTokenToDatabase(token) {
    try {
      const user = this.auth.currentUser;
      if (!user) {
        console.log('No user logged in, cannot save token');
        return;
      }

      console.log('Saving FCM token to Realtime Database for user:', user.uid);
      
      // ✅ Save as PLAIN STRING (simpler)
      const tokenRef = ref(this.db, `users/${user.uid}/fcmToken`);
      await set(tokenRef, token); // Just save the token string directly
      
      // ✅ Optional: Save metadata in a separate location if needed
      const metadataRef = ref(this.db, `users/${user.uid}/fcmTokenMetadata`);
      await set(metadataRef, {
        userId: user.uid,
        email: user.email,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        platform: 'web'
      });
      
      console.log('✅ FCM token saved to Realtime Database as string');
      
    } catch (error) {
      console.error('Error saving token to database:', error);
    }
  }

  // ✅ UPDATED: Delete token from database on logout
  async deleteTokenFromDatabase() {
    try {
      const user = this.auth.currentUser;
      if (!user) return;

      console.log('Deleting FCM token for user:', user.uid);
      
      // Remove token string
      const tokenRef = ref(this.db, `users/${user.uid}/fcmToken`);
      await remove(tokenRef);
      
      // Also remove metadata if it exists
      const metadataRef = ref(this.db, `users/${user.uid}/fcmTokenMetadata`);
      await remove(metadataRef);
      
      console.log('✅ FCM token deleted from database');
    } catch (error) {
      console.error('Error deleting token:', error);
    }
  }

  // ✅ NEW: Get current user's token from database
  async getTokenFromDatabase() {
    try {
      const user = this.auth.currentUser;
      if (!user) return null;

      const { get } = await import("firebase/database");
      const tokenRef = ref(this.db, `users/${user.uid}/fcmToken`);
      const snapshot = await get(tokenRef);
      
      if (snapshot.exists()) {
        return snapshot.val(); // Should return string token
      }
      return null;
    } catch (error) {
      console.error('Error getting token from database:', error);
      return null;
    }
  }

  // ✅ NEW: Check if user has token in database
  async hasTokenInDatabase() {
    const token = await this.getTokenFromDatabase();
    return !!token;
  }

  async cleanupOnLogout() {
    console.log('Cleaning up notification service on logout');
    
    // Delete token from database
    await this.deleteTokenFromDatabase();
    
    this.initialized = false;
    this.currentToken = null;
    this.messaging = null;
  }
}

// Create singleton instance
const notificationService = new NotificationService();
export default notificationService;