// services/supabase.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto'; // Required for Supabase to work in React Native




// Load environment variables
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Safety check for environment variables
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    '⚠️ Supabase configuration error: Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
    'Please ensure these are defined in your .env file or app.config.js.'
  );
  throw new Error('Supabase configuration missing. Check environment variables.');
}

// Initialize Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage, // Use AsyncStorage for session persistence
    autoRefreshToken: true, // Automatically refresh auth tokens
    persistSession: true, // Persist auth sessions across app restarts
    detectSessionInUrl: false, // Disable URL-based session detection (not applicable in React Native)
  },
});

// Optional: Log successful initialization (useful for debugging)
console.log('Supabase client initialized successfully:', {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY.slice(0, 5) + '...', // Partially mask key for security
});