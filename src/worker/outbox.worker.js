import { initializeDb, getDb } from '../db/connection.js';
import Pino from 'pino';

const logger = Pino({ level: process.env.LOG_LEVEL || 'info' });
const POLL_INTERVAL_MS = 2000;
const BATCH_SIZE = 20;
const MAX_ATTEMPTS = 5;

async function processBatch() {
  const prisma = getDb();
  const now = new Date();
  const events = await prisma.event.findMany({
    where: {
      status: 'PENDING',
      OR: [
        { nextRetryAt: null },
        { nextRetryAt: { lte: now } }
      ]
    },
    orderBy: { createdAt: 'asc' },
    take: BATCH_SIZE,
  });

  if (!events.length) return;

  for (const ev of events) {
    try {
      // TODO: publish to BullMQ or external webhook depending on event type
      // For MVP we log the event and simulate publish success.
      logger.info({ eventId: ev.id, eventName: ev.eventName }, 'Publishing event');

      // Simulate publish...
      await prisma.event.update({
        where: { id: ev.id },
        data: { status: 'PUBLISHED', attempts: ev.attempts + 1 },
      });
    } catch (err) {
      const attempts = ev.attempts + 1;
      const nextRetry = new Date(Date.now() + Math.pow(2, attempts) * 1000);
      const status = attempts >= MAX_ATTEMPTS ? 'DEAD_LETTER' : 'FAILED';

      logger.warn({ eventId: ev.id, attempts, error: String(err) }, 'Event publish failed');
      await prisma.event.update({
        where: { id: ev.id },
        data: {
          attempts,
          lastError: String(err),
          nextRetryAt: nextRetry,
          status,
        },
      });
    }
  }
}

async function run() {
  try {
    initializeDb();
    logger.info('Outbox worker started');

    setInterval(async () => {
      try {
        await processBatch();
      } catch (err) {
        logger.error({ err: String(err) }, 'Worker error');
      }
    }, POLL_INTERVAL_MS);
  } catch (err) {
    logger.error({ err: String(err) }, 'Failed to start outbox worker');
    process.exit(1);
  }
}

run();
