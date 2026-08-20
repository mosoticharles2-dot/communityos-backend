import { getDb } from '../db/connection.js';

export async function persistEvent({ eventName, aggregateType, aggregateId, tenantId, payload = {}, correlationId = null, idempotencyKey = null }) {
  const prisma = getDb();
  return await prisma.event.create({
    data: {
      eventName,
      aggregateType,
      aggregateId,
      tenantId,
      payload,
      correlationId,
      idempotencyKey,
    },
  });
}
