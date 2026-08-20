import Redis from 'redis';
import { config } from './env.js';

let redisClient = null;

export async function initializeRedis() {
  if (redisClient) return redisClient;

  redisClient = Redis.createClient({
    url: config.REDIS_URL,
  });

  redisClient.on('error', (err) => console.error('Redis Client Error', err));
  redisClient.on('connect', () => console.log('✓ Redis connected'));

  await redisClient.connect();
  return redisClient;
}

export function getRedis() {
  if (!redisClient) {
    throw new Error('Redis not initialized. Call initializeRedis() first.');
  }
  return redisClient;
}

export async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
