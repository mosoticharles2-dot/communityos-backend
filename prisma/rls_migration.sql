-- prisma/rls_migration.sql
-- Example SQL migration to enable Row-Level Security (RLS) on tenant-scoped tables.
-- WARNING: Review and adapt before applying to production.

-- Enable RLS on tenant-scoped tables
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

-- Create policies that restrict access based on a session setting: app.current_tenant
-- This assumes the application sets the tenant using: SELECT set_config('app.current_tenant', '<tenantId>', true);

CREATE POLICY tenant_isolation_order ON "Order"
  USING (tenantId = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_event ON "Event"
  USING (tenantId = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_user ON "User"
  USING (tenantId = current_setting('app.current_tenant', true));

-- Note: you may need additional policies for privileged roles (admins) or for migrations/tools.
