import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../config/env.js';

const connection = new IORedis(config.REDIS_URL);
const notificationQueue = new Queue('notifications', { connection });

// Simple worker to log notification jobs
const worker = new Worker('notifications', async (job) => {
  console.log('Processing notification job', job.id, job.name, job.data);
  // TODO: integrate with SMS/email providers
}, { connection });

worker.on('completed', (job) => {
  console.log('Notification job completed', job.id);
});

worker.on('failed', (job, err) => {
  console.error('Notification job failed', job.id, err);
});

export { notificationQueue };
