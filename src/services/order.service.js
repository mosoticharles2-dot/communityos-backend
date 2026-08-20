import { getDb } from '../db/connection.js';
import { v4 as uuidv4 } from 'uuid';

export const OrderService = {
  /**
   * Create an order and persist an ORDER_CREATED event.
   * items: [{ serviceId, quantity }]
   */
  async createOrder({ tenantId, residentId, communityId, providerId, items = [], idempotencyKey = null, metadata = {} }) {
    const prisma = getDb();

    // Idempotency: if an event with this idempotencyKey exists, return the related order
    if (idempotencyKey) {
      const existingEvent = await prisma.event.findFirst({ where: { idempotencyKey } });
      if (existingEvent) {
        // Try to return linked order
        const existingOrder = await prisma.order.findUnique({ where: { id: existingEvent.aggregateId } }).catch(() => null);
        if (existingOrder) return existingOrder;
      }
    }

    // compute totals by fetching unitPrice
    const serviceIds = items.map(i => i.serviceId);
    const services = await prisma.service.findMany({ where: { id: { in: serviceIds } } });
    const serviceMap = Object.fromEntries(services.map(s => [s.id, s]));

    let total = 0;
    const orderItemsData = items.map(i => {
      const svc = serviceMap[i.serviceId];
      const unitPrice = svc ? svc.unitPrice : 0;
      const qty = i.quantity || 1;
      const itemTotal = unitPrice * qty;
      total += itemTotal;
      return {
        id: uuidv4(),
        serviceId: i.serviceId,
        quantity: qty,
        unitPrice,
        total: itemTotal,
      };
    });

    // Transaction: create order, items, event
    const orderId = uuidv4();
    const correlationId = uuidv4();

    const created = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          id: orderId,
          tenantId,
          communityId,
          residentId,
          providerId,
          status: 'CREATED',
          total,
          metadata,
        },
      });

      for (const it of orderItemsData) {
        await tx.orderItem.create({ data: { ...it, orderId: order.id } });
      }

      await tx.event.create({
        data: {
          eventName: 'ORDER_CREATED',
          aggregateType: 'order',
          aggregateId: order.id,
          tenantId,
          payload: { orderId: order.id, total, items: orderItemsData, residentId, providerId },
          correlationId,
          idempotencyKey: idempotencyKey || null,
        },
      });

      return order;
    });

    return created;
  },

  async getTimeline({ orderId }) {
    const prisma = getDb();
    const events = await prisma.event.findMany({
      where: { aggregateType: 'order', aggregateId: orderId },
      orderBy: { createdAt: 'asc' },
    });
    return events;
  },

  async acceptOrder({ providerId, orderId, userId }) {
    const prisma = getDb();

    // Verify provider employee mapping
    const emp = await prisma.providerEmployee.findFirst({ where: { providerId, userId } });
    if (!emp) throw new Error('User not authorized for this provider');

    // Update order status and create event
    const correlationId = uuidv4();
    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.order.update({ where: { id: orderId }, data: { status: 'PROVIDER_ACCEPTED', providerId } });

      await tx.event.create({
        data: {
          eventName: 'ORDER_ACCEPTED',
          aggregateType: 'order',
          aggregateId: order.id,
          tenantId: order.tenantId,
          payload: { orderId: order.id, providerId, userId },
          correlationId,
        },
      });

      return order;
    });

    return updated;
  },
};
