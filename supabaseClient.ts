import { createClient } from '@supabase/supabase-js';

// Expect these to be provided at runtime (Expo public env vars)
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

// Fallback values for development/testing
const DEFAULT_URL = 'https://placeholder.supabase.co';
const DEFAULT_KEY = 'placeholder-key';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase env vars missing: EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY');
  console.log('Using placeholder values - app will work with mock data');
}

export const supabase = createClient(
  SUPABASE_URL || DEFAULT_URL, 
  SUPABASE_ANON_KEY || DEFAULT_KEY
);


