import { createClient } from '@supabase/supabase-js';
import { config } from './env.js';

let supabase = null;

export function initializeSupabase() {
  if (supabase) return supabase;

  if (!config.SUPABASE_URL || !config.SUPABASE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_KEY');
  }

  supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    // use service_role key on server for admin operations
    auth: {
      persistSession: false,
    },
  });

  return supabase;
}

export function getSupabase() {
  if (!supabase) throw new Error('Supabase not initialized. Call initializeSupabase() first.');
  return supabase;
}

export async function getUserFromToken(accessToken) {
  // Uses the admin client to get user by access token
  const client = supabase || initializeSupabase();
  try {
    const { data, error } = await client.auth.getUser(accessToken);
    if (error) throw error;
    return data?.user || null;
  } catch (err) {
    console.error('getUserFromToken error', err?.message || err);
    return null;
  }
}
