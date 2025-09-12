/**
 * Environment Configuration
 * Production-scale configuration management
 */

export interface EnvironmentConfig {
  // App Configuration
  APP_NAME: string;
  APP_VERSION: string;
  ENVIRONMENT: 'development' | 'staging' | 'production';
  
  // Database Configuration
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  DATABASE_URL?: string;
  DATABASE_POOL_SIZE: number;
  
  // Security Configuration
  JWT_SECRET: string;
  ENCRYPTION_KEY: string;
  
  // API Configuration
  API_BASE_URL: string;
  API_TIMEOUT: number;
  
  // Payment Configuration
  STRIPE_PUBLISHABLE_KEY?: string;
  PAYSTACK_PUBLIC_KEY?: string;
  
  // Notification Configuration
  FCM_SERVER_KEY?: string;
  ONESIGNAL_APP_ID?: string;
  
  // Analytics Configuration
  GOOGLE_ANALYTICS_ID?: string;
  MIXPANEL_TOKEN?: string;
  
  // Feature Flags
  ENABLE_ANALYTICS: boolean;
  ENABLE_CRASH_REPORTING: boolean;
  ENABLE_PUSH_NOTIFICATIONS: boolean;
  ENABLE_OFFLINE_MODE: boolean;
}

const getEnvironmentConfig = (): EnvironmentConfig => {
  // Default configuration
  const defaultConfig: EnvironmentConfig = {
    APP_NAME: 'ZADA Water Delivery',
    APP_VERSION: '1.0.0',
    ENVIRONMENT: 'production',
    
    SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key',
    DATABASE_URL: process.env.EXPO_PUBLIC_DATABASE_URL,
    DATABASE_POOL_SIZE: 10,
    
    JWT_SECRET: process.env.EXPO_PUBLIC_JWT_SECRET || 'default-jwt-secret-change-in-production',
    ENCRYPTION_KEY: process.env.EXPO_PUBLIC_ENCRYPTION_KEY || 'default-encryption-key-change-in-production',
    
    API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.zadafoods.com',
    API_TIMEOUT: 30000,
    
    STRIPE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    PAYSTACK_PUBLIC_KEY: process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY,
    
    FCM_SERVER_KEY: process.env.EXPO_PUBLIC_FCM_SERVER_KEY,
    ONESIGNAL_APP_ID: process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID,
    
    GOOGLE_ANALYTICS_ID: process.env.EXPO_PUBLIC_GOOGLE_ANALYTICS_ID,
    MIXPANEL_TOKEN: process.env.EXPO_PUBLIC_MIXPANEL_TOKEN,
    
    ENABLE_ANALYTICS: process.env.EXPO_PUBLIC_ENABLE_ANALYTICS === 'true',
    ENABLE_CRASH_REPORTING: process.env.EXPO_PUBLIC_ENABLE_CRASH_REPORTING === 'true',
    ENABLE_PUSH_NOTIFICATIONS: process.env.EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS === 'true',
    ENABLE_OFFLINE_MODE: process.env.EXPO_PUBLIC_ENABLE_OFFLINE_MODE === 'true',
  };

  // Environment-specific overrides
  const environment = process.env.NODE_ENV || 'production';
  
  if (environment === 'development') {
    return {
      ...defaultConfig,
      ENVIRONMENT: 'development',
      API_BASE_URL: 'http://localhost:3000',
      ENABLE_ANALYTICS: false,
      ENABLE_CRASH_REPORTING: false,
    };
  }
  
  if (environment === 'staging') {
    return {
      ...defaultConfig,
      ENVIRONMENT: 'staging',
      API_BASE_URL: 'https://staging-api.zadafoods.com',
    };
  }

  return defaultConfig;
};

export const config = getEnvironmentConfig();

// Validation
export const validateConfig = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!config.SUPABASE_URL || config.SUPABASE_URL.includes('placeholder')) {
    errors.push('SUPABASE_URL is not configured');
  }
  
  if (!config.SUPABASE_ANON_KEY || config.SUPABASE_ANON_KEY.includes('placeholder')) {
    errors.push('SUPABASE_ANON_KEY is not configured');
  }
  
  if (config.JWT_SECRET.includes('default')) {
    errors.push('JWT_SECRET should be changed from default value');
  }
  
  if (config.ENCRYPTION_KEY.includes('default')) {
    errors.push('ENCRYPTION_KEY should be changed from default value');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Log configuration status
export const logConfigStatus = (): void => {
  const validation = validateConfig();
  
  console.log('🔧 Environment Configuration:');
  console.log(`   App: ${config.APP_NAME} v${config.APP_VERSION}`);
  console.log(`   Environment: ${config.ENVIRONMENT}`);
  console.log(`   Database: ${config.SUPABASE_URL.includes('placeholder') ? '❌ Not configured' : '✅ Configured'}`);
  console.log(`   Security: ${validation.errors.some(e => e.includes('SECRET') || e.includes('KEY')) ? '❌ Using defaults' : '✅ Configured'}`);
  console.log(`   API: ${config.API_BASE_URL}`);
  console.log(`   Features: Analytics=${config.ENABLE_ANALYTICS}, Notifications=${config.ENABLE_PUSH_NOTIFICATIONS}, Offline=${config.ENABLE_OFFLINE_MODE}`);
  
  if (!validation.isValid) {
    console.warn('⚠️ Configuration issues:', validation.errors);
  }
};
