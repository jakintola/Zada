/**
 * Notifications management hook
 * Centralized notification state and operations
 */

import { useState, useEffect, useCallback } from 'react';
import { Notification } from '../types';
import { storage } from '../../storageUtils';

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  showNotification: boolean;
  notificationMessage: string;
  isLoading: boolean;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  removeNotification: (notificationId: string) => void;
  clearAllNotifications: () => void;
  showTemporaryNotification: (message: string, type?: Notification['type']) => void;
  hideNotification: () => void;
  loadNotifications: (userId: string) => Promise<void>;
  saveNotifications: (userId: string) => Promise<void>;
}

export const useNotifications = (): UseNotificationsReturn => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const loadNotifications = useCallback(async (userId: string): Promise<void> => {
    try {
      setIsLoading(true);
      const notificationsKey = `@zada_user_${userId}_notifications`;
      const storedNotifications = await storage.getItem(notificationsKey);
      if (storedNotifications) {
        const notificationData = JSON.parse(storedNotifications);
        // Convert date strings back to Date objects
        const formattedNotifications = notificationData.map((notification: any) => ({
          ...notification,
          timestamp: new Date(notification.timestamp),
        }));
        setNotifications(formattedNotifications);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveNotifications = useCallback(async (userId: string): Promise<void> => {
    try {
      const notificationsKey = `@zada_user_${userId}_notifications`;
      await storage.setItem(notificationsKey, JSON.stringify(notifications));
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  }, [notifications]);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>): void => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
    };

    setNotifications(prev => [newNotification, ...prev]);
  }, []);

  const markAsRead = useCallback((notificationId: string): void => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    );
  }, []);

  const markAllAsRead = useCallback((): void => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  }, []);

  const removeNotification = useCallback((notificationId: string): void => {
    setNotifications(prev =>
      prev.filter(notification => notification.id !== notificationId)
    );
  }, []);

  const clearAllNotifications = useCallback((): void => {
    setNotifications([]);
  }, []);

  const showTemporaryNotification = useCallback((
    message: string, 
    type: Notification['type'] = 'info'
  ): void => {
    setNotificationMessage(message);
    setShowNotification(true);
    
    // Add to notifications list
    addNotification({
      type,
      title: 'Notification',
      message,
      read: false,
    });

    // Auto-hide after 5 seconds
    setTimeout(() => {
      setShowNotification(false);
    }, 5000);
  }, [addNotification]);

  const hideNotification = useCallback((): void => {
    setShowNotification(false);
  }, []);

  return {
    notifications,
    unreadCount,
    showNotification,
    notificationMessage,
    isLoading,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
    showTemporaryNotification,
    hideNotification,
    loadNotifications,
    saveNotifications,
  };
};
