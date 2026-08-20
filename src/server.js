import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config/env.js';
import { initializeSupabase, getUserFromToken } from './config/supabase.js';
import { initializeDb, closeDb } from './db/connection.js';
import authRoutes from './routes/auth.routes.js';
import ordersRoutes from './routes/orders.routes.js';
import providerRoutes from './routes/provider.routes.js';
import { AuthService } from './services/auth.service.js';
import { setPubSub } from './utils/pubsub.js';

// Initialize Supabase client (server)
initializeSupabase();

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: config.FRONTEND_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Make io available to services via pubsub
setPubSub(io);

app.use(helmet());
app.use(cors({ origin: config.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', env: config.NODE_ENV });
});

// Supabase-based auth middleware that also links user to local DB
export async function supabaseAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token) return res.status(401).json({ success: false, error: { message: 'No token provided' } });

    const user = await getUserFromToken(token);
    if (!user) return res.status(401).json({ success: false, error: { message: 'Invalid token' } });

    // Ensure DB is initialized and link user to local users/roles
    const tenantId = user?.user_metadata?.tenantId || null;
    try {
      await initializeDb();
      // Link user in background but wait so req.user has local id
      const localUser = await AuthService.linkUser(user, tenantId, []);
      req.user = { ...user, localUser };
    } catch (err) {
      console.error('Error linking user:', err?.message || err);
      // proceed with supabase user even if linking fails
      req.user = { ...user };
    }

    next();
  } catch (err) {
    console.error('supabaseAuth error', err?.message || err);
    return res.status(500).json({ success: false, error: { message: 'Authentication failed' } });
  }
}

import servicesRoutes from './routes/services.routes.js';


// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/services', servicesRoutes);

// Socket.IO auth and connection handling
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error'));
    const user = await getUserFromToken(token);
    if (!user) return next(new Error('Authentication error'));
    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log('Socket connected', socket.id, 'user', socket.user?.id);

  // join rooms as needed
  socket.on('join:order', (orderId) => socket.join(`order:${orderId}`));
  socket.on('join:provider', (providerId) => socket.join(`provider:${providerId}`));

  socket.on('disconnect', () => {
    // cleanup
  });
});

// Start function
async function start() {
  try {
    // Initialize DB
    initializeDb();

    const port = config.PORT || 3000;
    server.listen(port, () => console.log(`Server listening on port ${port}`));

    // graceful shutdown
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

async function shutdown() {
  console.log('Shutting down...');
  server.close(async () => {
    try {
      await closeDb();
    } catch (err) {}
    process.exit(0);
  });
}

if (process.env.NODE_ENV !== 'test') {
  start();
}

export default app;
