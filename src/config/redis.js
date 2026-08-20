import Redis from 'redis';
import { config } from './env.js';

let redisClient = null;

export async function initializeRedis() {
  if (redisClient) return redisClient;

  redisClient = Redis.createClient({ url: config.REDIS_URL });

  redisClient.on('error', (err) => console.error('Redis Client Error', err));
  redisClient.on('connect', () => console.log('✓ Redis connected'));
  redisClient.on('ready', () => console.log('✓ Redis ready'));

  try {
    await redisClient.connect();
  } catch (err) {
    console.error('Redis connection failed:', err?.message || err);
    throw err;
  }

  return redisClient;
}

export function getRedis() {
  if (!redisClient) throw new Error('Redis not initialized. Call initializeRedis() first.');
  return redisClient;
}

export async function closeRedis() {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch (err) {
      try { await redisClient.disconnect(); } catch (_) {}
    } finally {
      redisClient = null;
    }
  }
}
