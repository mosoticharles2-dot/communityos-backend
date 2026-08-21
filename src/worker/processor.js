import { initializeDb, getDb } from '../db/connection.js';
import { publishEvent } from '../utils/pubsub.js';

async function processPending() {
  const prisma = getDb();
  const now = new Date();

  // Find pending events that are due (or all pending)
  const events = await prisma.event.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    take: 50,
  });

  for (const ev of events) {
    try {
      // Try publish via internal pubsub (Socket.IO) where possible
      const payload = typeof ev.payload === 'object' ? ev.payload : JSON.parse(ev.payload || '{}');

      // publishEvent expects (eventName, { orderId, tenantId, providerId, payload }) pattern
      await publishEvent(ev.eventName, {
        orderId: ev.aggregateId,
        tenantId: ev.tenantId,
        providerId: payload.providerId || null,
        payload,
      });

      await prisma.event.update({ where: { id: ev.id }, data: { status: 'PUBLISHED', attempts: ev.attempts + 1 } });
    } catch (err) {
      const attempts = (ev.attempts || 0) + 1;
      const maxAttempts = 5;
      const update = {
        attempts,
        lastError: err?.message || String(err),
      };
      if (attempts >= maxAttempts) {
        update.status = 'DEAD_LETTER';
      } else {
        // exponential backoff: nextRetryAt
        const backoffMs = Math.pow(2, attempts) * 1000;
        update.nextRetryAt = new Date(Date.now() + backoffMs);
      }
      await prisma.event.update({ where: { id: ev.id }, data: update });
      console.warn(`Event ${ev.id} publish failed (attempt ${attempts}):`, err?.message || err);
    }
  }
}

async function loop() {
  await initializeDb();
  console.log('Worker processor started. Polling for events...');

  // Poll every 5 seconds
  setInterval(async () => {
    try {
      await processPending();
    } catch (err) {
      console.error('Worker loop error:', err?.message || err);
    }
  }, 5000);
}

if (process.argv[1] && process.argv[1].includes('processor.js')) {
  loop().catch(err => {
    console.error('Worker failed to start:', err);
    process.exit(1);
  });
}

export default loop;
