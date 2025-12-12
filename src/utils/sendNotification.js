import { getDatabase, ref, get, set, remove } from "firebase/database";

const db = getDatabase();

// Get recipient's FCM token from Realtime Database
export const getRecipientToken = async (recipientId) => {
  try {
    const tokenRef = ref(db, `users/${recipientId}/fcmToken`);
    const snapshot = await get(tokenRef);
    
    if (snapshot.exists()) {
      const tokenData = snapshot.val();
      console.log('✅ Found FCM token for recipient:', recipientId);
      
      // Handle both string and object formats
      if (typeof tokenData === 'string') {
        return tokenData;
      } else if (tokenData && typeof tokenData === 'object' && tokenData.token) {
        return tokenData.token;
      } else if (tokenData && typeof tokenData === 'object' && !tokenData.token) {
        // Token might be stored directly as string in object format
        return tokenData;
      }
    } else {
      console.log('❌ No FCM token found for recipient:', recipientId);
      return null;
    }
  } catch (error) {
    console.error('Error getting recipient token:', error);
    return null;
  }
};

// Send notification to recipient (saves to Realtime Database)
export const sendNotification = async (notificationData) => {
  const {
    recipientId,
    title,
    body,
    chatId,
    senderId,
    senderName,
    messageText,
    type = 'message'
  } = notificationData;
  
  try {
    console.log('🔔 Sending notification to:', recipientId);
    
    // Check if recipient has FCM token (for logging purposes only)
    const recipientToken = await getRecipientToken(recipientId);
    if (!recipientToken) {
      console.log('⚠️ Recipient has no FCM token - saving to Realtime DB only');
    } else {
      console.log('✅ Recipient has FCM token - token available for future use');
    }
    
    // Create notification object
    const notification = {
      title: title || senderName || 'New Message',
      body: body || messageText || 'You have a new message',
      chatId: chatId,
      senderId: senderId,
      senderName: senderName || 'User',
      messageText: messageText || '',
      type: type,
      read: false,
      createdAt: Date.now(),
      // Include FCM token for potential future server-side sending
      recipientToken: recipientToken || null
    };
    
    // Save to recipient's notifications in Realtime Database
    const notificationKey = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const notificationRef = ref(db, `users/${recipientId}/notifications/${notificationKey}`);
    
    await set(notificationRef, notification);
    
    console.log('✅ Notification saved to Realtime Database for:', recipientId);
    console.log('   Notification key:', notificationKey);
    console.log('   Title:', notification.title);
    console.log('   Body:', notification.body);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error sending notification:', error);
    return false;
  }
};

// Mark notification as read
export const markNotificationAsRead = async (userId, notificationKey) => {
  try {
    const readRef = ref(db, `users/${userId}/notifications/${notificationKey}/read`);
    await set(readRef, true);
    console.log('✅ Notification marked as read:', notificationKey);
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
};

// Clear all notifications for user
export const clearNotifications = async (userId) => {
  try {
    const notificationsRef = ref(db, `users/${userId}/notifications`);
    await remove(notificationsRef);
    console.log('✅ Cleared all notifications for:', userId);
    return true;
  } catch (error) {
    console.error('Error clearing notifications:', error);
    return false;
  }
};

// Get unread notification count
export const getUnreadCount = async (userId) => {
  try {
    const notificationsRef = ref(db, `users/${userId}/notifications`);
    const snapshot = await get(notificationsRef);
    
    if (!snapshot.exists()) return 0;
    
    const notifications = snapshot.val();
    const unreadCount = Object.values(notifications)
      .filter(notification => !notification.read)
      .length;
    
    return unreadCount;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
};

// Get all notifications for user
export const getUserNotifications = async (userId) => {
  try {
    const notificationsRef = ref(db, `users/${userId}/notifications`);
    const snapshot = await get(notificationsRef);
    
    if (!snapshot.exists()) return [];
    
    const notifications = snapshot.val();
    return Object.entries(notifications)
      .map(([key, notification]) => ({
        id: key,
        ...notification
      }))
      .sort((a, b) => b.createdAt - a.createdAt); // Newest first
  } catch (error) {
    console.error('Error getting user notifications:', error);
    return [];
  }
};