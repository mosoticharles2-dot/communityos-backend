import { getSupabase } from '../config/supabase.js';
import { hashPassword, comparePassword } from '../utils/crypto.js';
import { generateToken } from '../utils/jwt.js';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export class AuthService {
  static async register(email, password, fullName, phone, role) {
    try {
      const supabase = getSupabase();
      const userId = uuidv4();

      // Check if user already exists
      const existingUser = await this.getUserByEmail(email);
      if (existingUser) {
        const error = new Error('User with this email already exists');
        error.statusCode = 409;
        throw error;
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Insert user
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert([
          {
            id: userId,
            email,
            password_hash: passwordHash,
            full_name: fullName,
            phone: phone || null,
            is_active: true,
          },
        ])
        .select()
        .single();

      if (userError) throw userError;

      // Assign role (for platform-level roles like admin)
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .insert([
          {
            user_id: userId,
            community_id: null,
            role: role || 'resident',
          },
        ])
        .select()
        .single();

      if (roleError) throw roleError;

      logger.info(`User registered: ${email}`);

      return {
        id: userData.id,
        email: userData.email,
        full_name: userData.full_name,
        role: roleData.role,
      };
    } catch (error) {
      logger.error('Registration error:', error.message);
      throw error;
    }
  }

  static async login(email, password) {
    try {
      const user = await this.getUserByEmail(email);
      if (!user) {
        const error = new Error('Invalid credentials');
        error.statusCode = 401;
        throw error;
      }

      // Verify password
      const isValid = await comparePassword(password, user.password_hash);
      if (!isValid) {
        const error = new Error('Invalid credentials');
        error.statusCode = 401;
        throw error;
      }

      // Check if user is active
      if (!user.is_active) {
        const error = new Error('User account is inactive');
        error.statusCode = 403;
        throw error;
      }

      // Fetch user roles
      const roles = await this.getUserRoles(user.id);

      // Generate JWT token
      const token = generateToken({
        userId: user.id,
        email: user.email,
        roles: roles.map(r => r.role),
      });

      logger.info(`User logged in: ${email}`);

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          phone: user.phone,
          roles: roles.map(r => ({
            role: r.role,
            community_id: r.community_id,
          })),
        },
      };
    } catch (error) {
      logger.error('Login error:', error.message);
      throw error;
    }
  }

  static async getUserByEmail(email) {
    try {
      const { data, error } = await getSupabase()
        .from('users')
        .select('*')
        .eq('email', email)
        .is('deleted_at', null)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data || null;
    } catch (error) {
      logger.error('Error fetching user by email:', error.message);
      return null;
    }
  }

  static async getUserById(userId) {
    try {
      const { data, error } = await getSupabase()
        .from('users')
        .select('*')
        .eq('id', userId)
        .is('deleted_at', null)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data || null;
    } catch (error) {
      logger.error('Error fetching user by id:', error.message);
      return null;
    }
  }

  static async getUserRoles(userId) {
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

  static async assignCommunityRole(userId, communityId, role) {
    try {
      const { data, error } = await getSupabase()
        .from('user_roles')
        .insert([
          {
            user_id: userId,
            community_id: communityId,
            role,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error assigning community role:', error.message);
      throw error;
    }
  }

  static async getCurrentUser(userId) {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
      }

      const roles = await this.getUserRoles(userId);

      return {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        avatar_url: user.avatar_url,
        roles: roles.map(r => ({
          role: r.role,
          community_id: r.community_id,
        })),
      };
    } catch (error) {
      logger.error('Error getting current user:', error.message);
      throw error;
    }
  }
}
