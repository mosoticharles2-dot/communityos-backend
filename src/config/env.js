import dotenv from 'dotenv';

dotenv.config();

export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  API_URL: process.env.API_URL || 'http://localhost:3000',

  // Supabase (server)
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_KEY: process.env.SUPABASE_KEY || '', // anon key (public)
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '', // service_role (secret)

  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

  // JWT (used if we issue our own tokens; with Supabase Auth this may be unused)
  JWT_SECRET: process.env.JWT_SECRET || '',

  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  validate() {
    // For server, require critical secrets when not in development/test
    if (this.NODE_ENV === 'development' || this.NODE_ENV === 'test') return;

    const required = ['DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'JWT_SECRET'];
    const missing = required.filter(k => !process.env[k]);
    if (missing.length) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  },
};

// Validate at import for production modes
if (process.env.NODE_ENV && process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
  config.validate();
}
