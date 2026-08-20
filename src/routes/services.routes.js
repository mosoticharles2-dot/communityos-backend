// src/routes/services.routes.js
import express from 'express';
import { supabaseAuth } from '../server.js';
import { getDb } from '../db/connection.js';

const router = express.Router();

// Public list of services (optionally tenant-scoped)
router.get('/', async (req, res) => {
  try {
    const prisma = getDb();
    const tenantId = req.query.tenantId || null;

    const where = {};
    if (tenantId) where.tenantId = tenantId;

    const services = await prisma.service.findMany({ where, orderBy: { createdAt: 'desc' } });
    return res.json({ data: services });
  } catch (err) {
    console.error('GET /api/services error', err);
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// Optional: tenant-authenticated list (uncomment if you prefer to require auth):
/*
router.get('/', supabaseAuth, async (req, res) => {
  try {
    const prisma = getDb();
    const tenantId = req.user?.app_metadata?.tenantId || req.user?.tenantId || req.query.tenantId;
    const services = await prisma.service.findMany({ where: { tenantId } });
    return res.json({ data: services });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});
*/

export default router;
