import { getSupabase } from '../config/supabase.js';
import { createError } from './response.js';
import logger from './logger.js';

export async function getUserById(userId) {
  try {
    const { data, error } = await getSupabase()
      .from('users')
      .select('*')
      .eq('id', userId)
      .is('deleted_at', null)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Error fetching user:', error.message);
    return null;
  }
}

export async function getUserByEmail(email) {
  try {
    const { data, error } = await getSupabase()
      .from('users')
      .select('*')
      .eq('email', email)
      .is('deleted_at', null)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Error fetching user by email:', error.message);
    return null;
  }
}

export async function getUserRoles(userId) {
  try {
    const { data, error } = await getSupabase()
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('Error fetching user roles:', error.message);
    return [];
  }
}

export async function getUserCommunityRole(userId, communityId) {
  try {
    const { data, error } = await getSupabase()
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('community_id', communityId)
      .is('deleted_at', null)
      .single();

    if (error) throw error;
    return data?.role || null;
  } catch (error) {
    logger.error('Error fetching community role:', error.message);
    return null;
  }
}

export async function getCommunityById(communityId) {
  try {
    const { data, error } = await getSupabase()
      .from('communities')
      .select('*')
      .eq('id', communityId)
      .is('deleted_at', null)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Error fetching community:', error.message);
    return null;
  }
}

export async function createAuditLog(communityId, userId, action, entityType, entityId, changes, ipAddress, userAgent) {
  try {
    const { data, error } = await getSupabase()
      .from('audit_log')
      .insert([
        {
          community_id: communityId,
          user_id: userId,
          action,
          entity_type: entityType,
          entity_id: entityId,
          changes,
          ip_address: ipAddress,
          user_agent: userAgent,
        },
      ])
      .select();

    if (error) throw error;
    return data?.[0] || null;
  } catch (error) {
    logger.error('Error creating audit log:', error.message);
    return null;
  }
}
