/**
 * Simplified Notification Service
 * Web-compatible notification system
 */

import { storage } from '../../storageUtils';

export interface Notification {
  id: string;
  user_id: string;
  type: 'order' | 'message' | 'system' | 'promotion';
  title: string;
  content: string;
  data: Record<string, any>;
  status: 'unread' | 'read' | 'dismissed';
  created_at: string;
  read_at?: string;
}

class NotificationService {
  private static instance: NotificationService;
  private listeners: Map<string, (notification: Notification) => void> = new Map();
  
  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }
  
  // Create notification
  async createNotification(
    userId: string,
    type: Notification['type'],
    title: string,
    content: string,
    data: Record<string, any> = {}
  ): Promise<Notification> {
    try {
      const notification: Notification = {
        id: 'notif_' + Date.now(),
        user_id: userId,
        type,
        title,
        content,
        data,
        status: 'unread',
        created_at: new Date().toISOString()
      };
      
      // Store notification
      const notificationsData = await storage.getItem('@zada_notifications');
      const notifications: Notification[] = notificationsData ? JSON.parse(notificationsData) : [];
      notifications.push(notification);
      await storage.setItem('@zada_notifications', JSON.stringify(notifications));
      
      // Notify listeners
      this.notifyListeners(notification);
      
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }
  
  // Get user notifications
  async getUserNotifications(
    userId: string,
    filters?: {
      type?: string;
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<Notification[]> {
    try {
      const notificationsData = await storage.getItem('@zada_notifications');
      if (!notificationsData) return [];
      
      let notifications: Notification[] = JSON.parse(notificationsData);
      
      // Filter by user
      notifications = notifications.filter(n => n.user_id === userId);
      
      // Apply filters
      if (filters?.type) {
        notifications = notifications.filter(n => n.type === filters.type);
      }
      
      if (filters?.status) {
        notifications = notifications.filter(n => n.status === filters.status);
      }
      
      // Sort by created_at desc
      notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      // Apply limit and offset
      if (filters?.offset) {
        notifications = notifications.slice(filters.offset);
      }
      
      if (filters?.limit) {
        notifications = notifications.slice(0, filters.limit);
      }
      
      return notifications;
    } catch (error) {
      console.error('Error getting notifications:', error);
      return [];
    }
  }
  
  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const notificationsData = await storage.getItem('@zada_notifications');
      if (!notificationsData) return;
      
      const notifications: Notification[] = JSON.parse(notificationsData);
      const notification = notifications.find(n => n.id === notificationId);
      
      if (notification) {
        notification.status = 'read';
        notification.read_at = new Date().toISOString();
        await storage.setItem('@zada_notifications', JSON.stringify(notifications));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }
  
  // Mark all notifications as read
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const notificationsData = await storage.getItem('@zada_notifications');
      if (!notificationsData) return;
      
      const notifications: Notification[] = JSON.parse(notificationsData);
      const userNotifications = notifications.filter(n => n.user_id === userId && n.status === 'unread');
      
      userNotifications.forEach(notification => {
        notification.status = 'read';
        notification.read_at = new Date().toISOString();
      });
      
      await storage.setItem('@zada_notifications', JSON.stringify(notifications));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }
  
  // Get unread count
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const notificationsData = await storage.getItem('@zada_notifications');
      if (!notificationsData) return 0;
      
      const notifications: Notification[] = JSON.parse(notificationsData);
      return notifications.filter(n => n.user_id === userId && n.status === 'unread').length;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }
  
  // Subscribe to real-time notifications (simplified)
  subscribeToNotifications(userId: string, callback: (notification: Notification) => void): string {
    const subscriptionId = `notification_${userId}_${Date.now()}`;
    this.listeners.set(subscriptionId, callback);
    
    // Simulate real-time by checking for new notifications periodically
    const interval = setInterval(async () => {
      try {
        const notifications = await this.getUserNotifications(userId, { limit: 1 });
        if (notifications.length > 0) {
          const latest = notifications[0];
          const now = new Date();
          const notificationTime = new Date(latest.created_at);
          
          // If notification is less than 5 seconds old, notify
          if (now.getTime() - notificationTime.getTime() < 5000) {
            callback(latest);
          }
        }
      } catch (error) {
        console.error('Error checking for new notifications:', error);
      }
    }, 5000);
    
    // Store interval for cleanup
    (this as any).intervals = (this as any).intervals || new Map();
    (this as any).intervals.set(subscriptionId, interval);
    
    return subscriptionId;
  }
  
  // Unsubscribe from notifications
  unsubscribeFromNotifications(subscriptionId: string): void {
    this.listeners.delete(subscriptionId);
    
    // Clear interval
    if ((this as any).intervals && (this as any).intervals.has(subscriptionId)) {
      clearInterval((this as any).intervals.get(subscriptionId));
      (this as any).intervals.delete(subscriptionId);
    }
  }
  
  // Notify listeners
  private notifyListeners(notification: Notification): void {
    this.listeners.forEach((callback) => {
      try {
        callback(notification);
      } catch (error) {
        console.error('Error notifying listener:', error);
      }
    });
  }
  
  // Send order notification
  async sendOrderNotification(
    userId: string,
    orderId: string,
    status: string,
    orderNumber: string
  ): Promise<void> {
    const templates: Record<string, { title: string; content: string }> = {
      pending: {
        title: 'Order Received',
        content: `Your order #${orderNumber} has been received and is being processed.`
      },
      confirmed: {
        title: 'Order Confirmed',
        content: `Your order #${orderNumber} has been confirmed and is being prepared.`
      },
      shipped: {
        title: 'Order Shipped',
        content: `Your order #${orderNumber} has been shipped and is on its way.`
      },
      delivered: {
        title: 'Order Delivered',
        content: `Your order #${orderNumber} has been delivered successfully.`
      },
      cancelled: {
        title: 'Order Cancelled',
        content: `Your order #${orderNumber} has been cancelled.`
      }
    };
    
    const template = templates[status];
    if (template) {
      await this.createNotification(
        userId,
        'order',
        template.title,
        template.content,
        { order_id: orderId, order_number: orderNumber }
      );
    }
  }
}

export const notificationService = NotificationService.getInstance();
