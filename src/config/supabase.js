import { createClient } from '@supabase/supabase-js';
import { config } from './env.js';

let supabaseInstance = null;

export function initializeSupabase() {
  if (supabaseInstance) return supabaseInstance;

  supabaseInstance = createClient(
    config.SUPABASE_URL,
    config.SUPABASE_KEY
  );

  return supabaseInstance;
}

export function getSupabase() {
  if (!supabaseInstance) {
    throw new Error('Supabase not initialized. Call initializeSupabase() first.');
  }
  return supabaseInstance;
}

export async function testConnection() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('users')
      .select('count', { count: 'exact' })
      .limit(0);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Supabase connection test failed:', error.message);
    return false;
  }
}
