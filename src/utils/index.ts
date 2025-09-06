/**
 * Utility functions for the ZADA Water Delivery App
 * Reusable utility functions for common operations
 */

import { Alert } from 'react-native';
import { VALIDATION_RULES } from '../constants';

// Validation utilities
export const validateEmail = (email: string): boolean => {
  return VALIDATION_RULES.email.pattern.test(email);
};

export const validatePassword = (password: string): boolean => {
  return password.length >= VALIDATION_RULES.password.minLength;
};

export const validatePhone = (phone: string): boolean => {
  return VALIDATION_RULES.phone.pattern.test(phone);
};

// Format utilities
export const formatCurrency = (amount: number, currency = 'NGN'): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

export const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
};

export const formatRelativeTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return formatDate(dateObj);
};

// String utilities
export const capitalizeFirst = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Array utilities
export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
  return array.reduce((groups, item) => {
    const group = String(item[key]);
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {} as Record<string, T[]>);
};

export const sortBy = <T>(array: T[], key: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] => {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
};

export const uniqueBy = <T>(array: T[], key: keyof T): T[] => {
  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
};

// Object utilities
export const pick = <T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
};

export const omit = <T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
  const result = { ...obj };
  keys.forEach(key => {
    delete result[key];
  });
  return result;
};

// Error handling utilities
export const handleError = (error: any, defaultMessage = 'An error occurred'): string => {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.error) return error.error;
  return defaultMessage;
};

export const showError = (error: any, defaultMessage = 'An error occurred'): void => {
  const message = handleError(error, defaultMessage);
  Alert.alert('Error', message);
};

export const showSuccess = (message: string): void => {
  Alert.alert('Success', message);
};

// Async utilities
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const retry = async <T>(
  fn: () => Promise<T>,
  attempts = 3,
  delayMs = 1000
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (attempts <= 1) throw error;
    await delay(delayMs);
    return retry(fn, attempts - 1, delayMs);
  }
};

// Storage utilities
export const getUserStorageKey = (userId: string, key: string): string => {
  return `@zada_user_${userId}_${key}`;
};

export const getGlobalStorageKey = (key: string): string => {
  return `@zada_${key}`;
};

// Math utilities
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export const roundTo = (value: number, decimals: number): number => {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

export const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return roundTo((value / total) * 100, 2);
};

// Business logic utilities
export const calculateOrderTotal = (items: Array<{ product: { price: number }; quantity: number }>): number => {
  return items.reduce((total, item) => total + (item.product.price * item.quantity), 0);
};

export const isLowStock = (stock: number, minStock: number): boolean => {
  return stock <= minStock;
};

export const getOrderStatusColor = (status: string): string => {
  const statusColors = {
    pending: '#F59E0B',
    confirmed: '#3B82F6',
    out_for_delivery: '#8B5CF6',
    delivered: '#10B981',
    cancelled: '#EF4444',
  };
  return statusColors[status as keyof typeof statusColors] || '#6B7280';
};

export const getPriorityColor = (priority: string): string => {
  const priorityColors = {
    low: '#10B981',
    medium: '#F59E0B',
    high: '#EF4444',
  };
  return priorityColors[priority as keyof typeof priorityColors] || '#6B7280';
};

// Platform utilities
export const isWeb = (): boolean => {
  return typeof window !== 'undefined';
};

export const isMobile = (): boolean => {
  return !isWeb();
};

// Debounce utility
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle utility
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};
