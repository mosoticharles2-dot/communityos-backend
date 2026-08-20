# Deployment runbook for CommunityOS MVP

This document explains how to deploy the backend (Node.js) and frontend (Vercel) using Supabase (Postgres) and a managed Redis service.

Overview
- Frontend: Vercel (deploy the /web directory in this repo)
- Backend: Render / Fly / Railway (long-running Node service)
- Database: Supabase (managed Postgres) — use DATABASE_URL from Supabase
- Redis: Upstash or another managed Redis — provide REDIS_URL to backend

Required environment variables (set these on Render's environment settings)
- DATABASE_URL (Postgres connection string)  -- from Supabase
- SUPABASE_URL (e.g. https://xxxxx.supabase.co)
- SUPABASE_KEY (anon/public key) - optional for server ops
- SUPABASE_SERVICE_ROLE_KEY (service_role key) - REQUIRED for server admin operations; keep secret
- REDIS_URL (redis://:password@host:port) or Upstash connection string
- JWT_SECRET (if issuing server JWTs; still required for some ops)
- FRONTEND_URL (Vercel app URL)
- NODE_ENV=production

Steps to deploy backend on Render (example)
1. Push branch to GitHub (we created chore/mvp-infra).
2. In Render, create a new Web Service and connect to this repo and branch.
3. Set the build command: npm install --production
4. Set the start command: node src/server.js
5. Add environment variables listed above in Render's dashboard.
6. Deploy and check logs.

Migrations (Prisma)
- If using Prisma, run migrations with DATABASE_URL set. Example locally (or in a one-off job on Render):
  npx prisma migrate deploy

Frontend (Vercel)
- Configure Vercel to deploy the /web directory as the project root for the frontend.
- Set the environment variable FRONTEND_API_URL to the backend public URL.

Notes
- Keep SUPABASE_SERVICE_ROLE_KEY secret — only in server env.
- For socket.io and background workers, the backend must be a long-running Node service (Render, Fly, Railway). Vercel serverless is not suitable for persistent sockets or BullMQ workers.

