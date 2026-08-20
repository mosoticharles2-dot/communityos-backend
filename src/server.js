import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config/env.js';
import { initializeSupabase, getUserFromToken } from './config/supabase.js';
import { initializeRedis } from './config/redis.js';
import { initializeDb, closeDb } from './db/connection.js';

// Initialize services
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

app.use(helmet());
app.use(cors({ origin: config.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', env: config.NODE_ENV });
});

// Simple auth middleware using Supabase Auth
export async function supabaseAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  if (!token) return res.status(401).json({ success: false, error: { message: 'No token provided' } });

  const user = await getUserFromToken(token);
  if (!user) return res.status(401).json({ success: false, error: { message: 'Invalid token' } });

  // attach user to request (supabase user object)
  req.user = {
    id: user.id,
    email: user.email,
    phone: user.phone,
    role: user?.role || null,
  };
  next();
}

// Mount placeholder routes
app.get('/api/me', supabaseAuth, (req, res) => {
  res.json({ success: true, user: req.user });
});

// Socket.IO auth
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication error'));
  const user = await getUserFromToken(token);
  if (!user) return next(new Error('Authentication error'));
  socket.user = user;
  next();
});

io.on('connection', (socket) => {
  console.log('Socket connected', socket.id, 'user', socket.user?.id);
  // Join rooms per tenant or user as needed
  socket.on('join:order', (orderId) => {
    socket.join(`order:${orderId}`);
  });

  socket.on('disconnect', () => {
    // cleanup
  });
});

// Start function
async function start() {
  try {
    // Initialize DB and Redis
    initializeDb();
    await initializeRedis();

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
