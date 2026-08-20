import { getSupabase } from '../config/supabase.js';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export class CommunityService {
  static async createCommunity(name, location, country, currency, createdBy) {
    try {
      const communityId = uuidv4();
      const { data, error } = await getSupabase()
        .from('communities')
        .insert([
          {
            id: communityId,
            name,
            location,
            country,
            currency,
            created_by: createdBy,
            is_active: true,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      logger.info(`Community created: ${name} (${communityId})`);
      return data;
    } catch (error) {
      logger.error('Error creating community:', error.message);
      throw error;
    }
  }

  static async getCommunityById(communityId) {
    try {
      const { data, error } = await getSupabase()
        .from('communities')
        .select('*')
        .eq('id', communityId)
        .is('deleted_at', null)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      logger.error('Error fetching community:', error.message);
      throw error;
    }
  }

  static async getAllCommunities(limit = 20, offset = 0) {
    try {
      const { data, error, count } = await getSupabase()
        .from('communities')
        .select('*', { count: 'exact' })
        .is('deleted_at', null)
        .is('is_active', true)
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return { data, total: count };
    } catch (error) {
      logger.error('Error fetching communities:', error.message);
      throw error;
    }
  }

  static async getCommunityPulse(communityId) {
    try {
      // Get all services for this community
      const { data: services, error: servicesError } = await getSupabase()
        .from('services')
        .select('id, name, category_id, status')
        .eq('community_id', communityId)
        .is('deleted_at', null);

      if (servicesError) throw servicesError;

      // Map services to pulse status
      const pulse = {};
      for (const service of services) {
        pulse[service.name] = service.status; // operational, issues, maintenance, offline
      }

      return pulse;
    } catch (error) {
      logger.error('Error fetching community pulse:', error.message);
      throw error;
    }
  }

  static async updateCommunity(communityId, updates) {
    try {
      const { data, error } = await getSupabase()
        .from('communities')
        .update({
          ...updates,
          updated_at: new Date(),
        })
        .eq('id', communityId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error updating community:', error.message);
      throw error;
    }
  }

  static async getResidents(communityId, limit = 20, offset = 0) {
    try {
      const { data, error, count } = await getSupabase()
        .from('users')
        .select(
          `
          id,
          email,
          full_name,
          phone,
          created_at,
          user_roles!inner(role)
        `,
          { count: 'exact' }
        )
        .eq('user_roles.community_id', communityId)
        .eq('user_roles.role', 'resident')
        .is('deleted_at', null)
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return { data, total: count };
    } catch (error) {
      logger.error('Error fetching residents:', error.message);
      throw error;
    }
  }
}
