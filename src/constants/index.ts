/**
 * Application constants and configuration
 * Centralized constants for better maintainability
 */

import { Dimensions } from 'react-native';

// Screen dimensions
export const SCREEN_WIDTH = Dimensions.get('window').width;
export const SCREEN_HEIGHT = Dimensions.get('window').height;

// Colors
export const COLORS = {
  // Primary colors
  primary: '#0EA5E9',
  primaryDark: '#0284C7',
  primaryLight: '#7DD3FC',
  
  // Secondary colors
  secondary: '#10B981',
  secondaryDark: '#059669',
  secondaryLight: '#6EE7B7',
  
  // Neutral colors
  white: '#FFFFFF',
  black: '#000000',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  
  // Status colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // Background colors
  background: '#F8FAFC',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  
  // Text colors
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  
  // Border colors
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  borderDark: '#D1D5DB',
} as const;

// Typography
export const TYPOGRAPHY = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

// Spacing
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const;

// Border radius
export const BORDER_RADIUS = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
} as const;

// Shadows
export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;

// Animation durations
export const ANIMATION_DURATION = {
  fast: 150,
  normal: 300,
  slow: 500,
} as const;

// API Configuration
export const API_CONFIG = {
  timeout: 10000,
  retryAttempts: 3,
  retryDelay: 1000,
} as const;

// Storage keys
export const STORAGE_KEYS = {
  USERS: '@zada_users',
  PRODUCTS: '@zada_products',
  SUPPORT_MESSAGES: '@zada_support_messages',
  SEEN_MESSAGE_IDS: '@zada_seen_message_ids',
  USER_ADMIN_DATA: '@zada_user_admin_data',
} as const;

// Validation rules
export const VALIDATION_RULES = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address',
  },
  password: {
    minLength: 6,
    message: 'Password must be at least 6 characters long',
  },
  phone: {
    pattern: /^[\+]?[1-9][\d]{0,15}$/,
    message: 'Please enter a valid phone number',
  },
} as const;

// Admin email domains
export const ADMIN_EMAIL_DOMAINS = [
  '@zadafoods.com',
  '@zada.com',
] as const;

export const ALLOWED_ADMIN_EMAILS = [
  'admin@zada.com',
  'manager@zada.com',
  'supervisor@zada.com',
] as const;

// Pagination
export const PAGINATION = {
  defaultPageSize: 20,
  maxPageSize: 100,
} as const;

// Refresh intervals (in milliseconds)
export const REFRESH_INTERVALS = {
  dataSync: 5000, // 5 seconds
  notifications: 10000, // 10 seconds
  analytics: 30000, // 30 seconds
} as const;

// Feature flags
export const FEATURE_FLAGS = {
  enableRealTimeSync: true,
  enablePushNotifications: true,
  enableAnalytics: true,
  enableOfflineMode: true,
} as const;
