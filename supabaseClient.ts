import { createClient } from '@supabase/supabase-js';
import { config, logConfigStatus } from './src/config/environment';

// Log configuration status
logConfigStatus();

// Create Supabase client with proper configuration
export const supabase = createClient(
  config.SUPABASE_URL, 
  config.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
);

// Test connection
export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    console.log('🔍 Testing Supabase connection...');
    
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error) {
      console.warn('⚠️ Supabase connection failed:', error.message);
      return false;
    }

    console.log('✅ Supabase connection successful');
    return true;
  } catch (error) {
    console.warn('⚠️ Supabase connection error:', error);
    return false;
  }
};


