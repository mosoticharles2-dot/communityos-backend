# CommunityOS ERD (water-delivery MVP)

This document describes the core entities and relationships for the initial MVP focused on a single concrete service: water delivery.

Design goals
- Tenant-aware: every relevant row includes tenantId (string UUID) to isolate multi-community data.
- Event-driven: actions create events persisted in the events table for traceability and the Sync Timeline.
- Minimal but extensible schema to allow adding features (inventory, vehicles, invoices) later.

Core entities

- User
  - Represents any human actor: resident, manager, worker, provider representative.
  - Fields: id, tenantId, email, passwordHash, fullName, phone, isActive
  - Relations: roles, orders (as resident), audit logs

- UserRole
  - Per-user role assignments, with optional resource scope (e.g., communityId)
  - Roles include: RESIDENT, MANAGER, PROVIDER_REP, WORKER, PLATFORM_ADMIN

- Community
  - A logical boundary (estate) containing residents, buildings, etc.
  - Fields: id, tenantId, name, address, meta

- Provider
  - Companies or organizations offering services.
  - Fields: id, tenantId, companyName, contact, verificationStatus
  - Relations: services, employees

- Service
  - A service offered by a provider (e.g., Water Delivery)
  - Fields: id, providerId, tenantId, name, description, unitPrice

- Order
  - Represents a resident-initiated request for a service. Core for the Sync Timeline.
  - Fields: id, tenantId, communityId, residentId, providerId, status, total
  - Relations: items, jobs, events, payment

- OrderItem
  - Line items for Orders. For water delivery, usually a single item describing quantity.

- Job
  - Operational unit assigned to a worker. Tracks scheduledAt, startedAt, completedAt, status.

- Event
  - Append-only event store for domain events. Fields include eventName, aggregateType, aggregateId, payload, correlationId, idempotencyKey.
  - Used to populate Sync Timeline and for debugging/monitoring.

- AuditLog
  - Records user actions for compliance and forensic analysis.

- Payment
  - Stores payment attempts/results for orders. Includes external provider references and status.

Indexes & performance
- Indexes on tenantId + status for Orders to enable fast manager queries.
- Indexes on Events by (tenantId, aggregateType, aggregateId) to build timelines quickly.

Security and multi-tenancy
- The application must always ensure tenantId is applied server-side. Never accept tenantId from untrusted clients in operations that modify data.
- Consider adding PostgreSQL Row-Level Security (RLS) in production as an additional enforcement layer.

Migration & tooling
- A Prisma schema is included (prisma/schema.prisma). Use Prisma Migrate (or hand-crafted SQL) to apply the DDL.

Next steps after schema
- Implement auth with secure password hashing (argon2 recommended) and JWT + refresh tokens.
- Implement order lifecycle endpoints and background jobs to handle notifications and provider retries.
- Implement events persistence whenever state changes occur (order created, provider accepted, job started, job completed, payment updated).
