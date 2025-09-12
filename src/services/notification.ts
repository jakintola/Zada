/**
 * Notification Service
 * Comprehensive notification system with real-time capabilities
 */

import { db } from '../config/database';
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

export interface NotificationTemplate {
  type: string;
  title: string;
  content: string;
  data?: Record<string, any>;
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
      const notificationData = {
        user_id: userId,
        type,
        title,
        content,
        data,
        status: 'unread' as const,
        created_at: new Date().toISOString()
      };
      
      const { data: notification, error } = await db.supabase
        .from('notifications')
        .insert([notificationData])
        .select()
        .single();
      
      if (error) throw new Error(`Failed to create notification: ${error.message}`);
      
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
      let query = db.supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (filters?.type) {
        query = query.eq('type', filters.type);
      }
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      
      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
      }
      
      const { data, error } = await query;
      
      if (error) throw new Error(`Failed to get notifications: ${error.message}`);
      
      return data || [];
    } catch (error) {
      console.error('Error getting notifications:', error);
      return [];
    }
  }
  
  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await db.supabase
        .from('notifications')
        .update({
          status: 'read',
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId);
      
      if (error) throw new Error(`Failed to mark notification as read: ${error.message}`);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }
  
  // Mark all notifications as read
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const { error } = await db.supabase
        .from('notifications')
        .update({
          status: 'read',
          read_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('status', 'unread');
      
      if (error) throw new Error(`Failed to mark all notifications as read: ${error.message}`);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }
  
  // Dismiss notification
  async dismissNotification(notificationId: string): Promise<void> {
    try {
      const { error } = await db.supabase
        .from('notifications')
        .update({
          status: 'dismissed'
        })
        .eq('id', notificationId);
      
      if (error) throw new Error(`Failed to dismiss notification: ${error.message}`);
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  }
  
  // Get unread count
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await db.supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'unread');
      
      if (error) throw new Error(`Failed to get unread count: ${error.message}`);
      
      return count || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }
  
  // Subscribe to real-time notifications
  subscribeToNotifications(userId: string, callback: (notification: Notification) => void): string {
    const subscriptionId = `notification_${userId}_${Date.now()}`;
    this.listeners.set(subscriptionId, callback);
    
    // Set up real-time subscription
    const subscription = db.supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const notification = payload.new as Notification;
          callback(notification);
        }
      )
      .subscribe();
    
    return subscriptionId;
  }
  
  // Unsubscribe from notifications
  unsubscribeFromNotifications(subscriptionId: string): void {
    this.listeners.delete(subscriptionId);
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
    const templates: Record<string, NotificationTemplate> = {
      pending: {
        type: 'order',
        title: 'Order Received',
        content: `Your order #${orderNumber} has been received and is being processed.`,
        data: { order_id: orderId, order_number: orderNumber }
      },
      confirmed: {
        type: 'order',
        title: 'Order Confirmed',
        content: `Your order #${orderNumber} has been confirmed and is being prepared.`,
        data: { order_id: orderId, order_number: orderNumber }
      },
      shipped: {
        type: 'order',
        title: 'Order Shipped',
        content: `Your order #${orderNumber} has been shipped and is on its way.`,
        data: { order_id: orderId, order_number: orderNumber }
      },
      delivered: {
        type: 'order',
        title: 'Order Delivered',
        content: `Your order #${orderNumber} has been delivered successfully.`,
        data: { order_id: orderId, order_number: orderNumber }
      },
      cancelled: {
        type: 'order',
        title: 'Order Cancelled',
        content: `Your order #${orderNumber} has been cancelled.`,
        data: { order_id: orderId, order_number: orderNumber }
      }
    };
    
    const template = templates[status];
    if (template) {
      await this.createNotification(
        userId,
        template.type as Notification['type'],
        template.title,
        template.content,
        template.data || {}
      );
    }
  }
  
  // Send message notification
  async sendMessageNotification(
    userId: string,
    senderName: string,
    messagePreview: string,
    messageId: string
  ): Promise<void> {
    await this.createNotification(
      userId,
      'message',
      `New message from ${senderName}`,
      messagePreview,
      { message_id: messageId, sender_name: senderName }
    );
  }
  
  // Send system notification
  async sendSystemNotification(
    userId: string,
    title: string,
    content: string,
    data: Record<string, any> = {}
  ): Promise<void> {
    await this.createNotification(
      userId,
      'system',
      title,
      content,
      data
    );
  }
  
  // Send promotion notification
  async sendPromotionNotification(
    userId: string,
    title: string,
    content: string,
    promotionId: string
  ): Promise<void> {
    await this.createNotification(
      userId,
      'promotion',
      title,
      content,
      { promotion_id: promotionId }
    );
  }
  
  // Bulk notification for all users
  async sendBulkNotification(
    title: string,
    content: string,
    type: Notification['type'] = 'system',
    data: Record<string, any> = {}
  ): Promise<void> {
    try {
      // Get all active users
      const { data: users, error } = await db.supabase
        .from('users')
        .select('id')
        .eq('status', 'active');
      
      if (error) throw new Error(`Failed to get users: ${error.message}`);
      
      // Create notifications for all users
      const notifications = users.map(user => ({
        user_id: user.id,
        type,
        title,
        content,
        data,
        status: 'unread' as const,
        created_at: new Date().toISOString()
      }));
      
      const { error: insertError } = await db.supabase
        .from('notifications')
        .insert(notifications);
      
      if (insertError) throw new Error(`Failed to send bulk notification: ${insertError.message}`);
    } catch (error) {
      console.error('Error sending bulk notification:', error);
    }
  }
}

export const notificationService = NotificationService.getInstance();
