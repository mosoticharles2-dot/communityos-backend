import express from 'express';
import { supabaseAuth } from '../server.js';
import { OrderService } from '../services/order.service.js';

const router = express.Router();

router.post('/:providerId/orders/:orderId/accept', supabaseAuth, async (req, res) => {
  try {
    const { providerId, orderId } = req.params;
    const userId = req.user.id;

    const updated = await OrderService.acceptOrder({ providerId, orderId, userId });
    return res.json(updated);
  } catch (err) {
    console.error('Provider accept error', err);
    return res.status(403).json({ success: false, error: { message: err.message } });
  }
});

export default router;
