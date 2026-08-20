import express from 'express';
import { supabaseAuth } from '../server.js';
import { OrderService } from '../services/order.service.js';
// List orders (paged) for current user/tenant
router.get('/', supabaseAuth, async (req, res) => {
  try {
    const prisma = (await import('../db/connection.js')).getDb();
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
    const skip = (page - 1) * limit;

    // tenantId may come from body, user metadata, or query
    const tenantId = req.user?.app_metadata?.tenantId || req.user?.tenantId || req.query.tenantId;
    if (!tenantId) return res.status(400).json({ success: false, error: { message: 'Missing tenantId' } });

    // For MVP, return orders for the resident (user) only
    const where = { tenantId, residentId: req.user.id };

    const [data, total] = await Promise.all([
      prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit, skip, include: { items: true } }),
      prisma.order.count({ where }),
    ]);

    return res.json({ data, total, page, limit });
  } catch (err) {
    console.error('GET /api/orders error', err);
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

const router = express.Router();

// Create order
router.post('/', supabaseAuth, async (req, res) => {
  try {
    const tenantId = req.body.tenantId || req.user?.app_metadata?.tenantId || req.user?.tenantId;
    const residentId = req.user.id;
    const { communityId, providerId, items, idempotencyKey } = req.body;

    if (!tenantId || !communityId || !items || items.length === 0) {
      return res.status(400).json({ success: false, error: { message: 'Missing required fields' } });
    }

    const order = await OrderService.createOrder({ tenantId, residentId, communityId, providerId, items, idempotencyKey });
    return res.status(201).json(order);
  } catch (err) {
    console.error('Create order error', err);
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// Get order
router.get('/:orderId', supabaseAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const prisma = (await import('../db/connection.js')).getDb();
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) return res.status(404).json({ success: false, error: { message: 'Order not found' } });
    return res.json(order);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// Get timeline
router.get('/:orderId/timeline', supabaseAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const events = await OrderService.getTimeline({ orderId });
    return res.json(events);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

export default router;
