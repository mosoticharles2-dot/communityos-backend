# CommunityOS Backend

Event-driven multi-community service platform for managing essential services.

## Architecture

- **Multi-tenant** with complete data isolation
- **Event-driven** synchronization system
- **REST API** with WebSocket support
- **PostgreSQL** for reliable data storage
- **Redis + BullMQ** for message queues and caching
- **JWT** authentication with role-based access control

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 7+

### Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Run database migrations
npm run migrate

# Seed test data
npm run seed

# Start development server
npm run dev
```

Server will be available at `http://localhost:3000`

## Project Structure

```
src/
├── config/           # Configuration files
├── middleware/       # Express middleware
├── services/         # Business logic
├── events/           # Event system
├── jobs/            # Background jobs
├── routes/          # API routes
├── models/          # Database models
├── utils/           # Utility functions
├── websocket/       # WebSocket handlers
├── db/              # Database setup
└── server.js        # Entry point
```

## Key Features

- Community Pulse (real-time service status)
- Order synchronization with timeline
- Incident management and grouping
- Multi-party notifications
- Payment processing (M-Pesa)
- Audit logging
- Role-based authorization
