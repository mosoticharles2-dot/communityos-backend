-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ==================== IDENTITY DOMAIN ====================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  full_name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_is_active ON users(is_active);

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  community_id UUID,
  role VARCHAR(50) NOT NULL CHECK (role IN ('resident', 'manager', 'provider', 'worker', 'admin')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_user_roles_community_id ON user_roles(community_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_user_roles_unique ON user_roles(user_id, community_id, role) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(token);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

-- ==================== COMMUNITY DOMAIN ====================

CREATE TABLE IF NOT EXISTS communities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  country VARCHAR(3) DEFAULT 'KE',
  currency VARCHAR(3) DEFAULT 'KES',
  created_by UUID NOT NULL REFERENCES users(id),
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_communities_created_by ON communities(created_by);
CREATE INDEX idx_communities_is_active ON communities(is_active);
CREATE INDEX idx_communities_deleted_at ON communities(deleted_at);

CREATE TABLE IF NOT EXISTS buildings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  floors INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_buildings_community_id ON buildings(community_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  unit_number VARCHAR(50) NOT NULL,
  resident_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  CONSTRAINT unique_unit_per_building UNIQUE(building_id, unit_number)
);

CREATE INDEX idx_units_community_id ON units(community_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_units_building_id ON units(building_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_units_resident_id ON units(resident_id) WHERE deleted_at IS NULL;

-- ==================== SERVICE DOMAIN ====================

CREATE TABLE IF NOT EXISTS service_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  icon VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES service_categories(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'operational' CHECK (status IN ('operational', 'issues', 'maintenance', 'offline')),
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_services_community_id ON services(community_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_services_category_id ON services(category_id);
CREATE INDEX idx_services_status ON services(status);

CREATE TABLE IF NOT EXISTS service_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  company_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  average_rating DECIMAL(3,2) DEFAULT 5.0,
  total_orders INT DEFAULT 0,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_service_providers_user_id ON service_providers(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_service_providers_community_id ON service_providers(community_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_service_providers_service_id ON service_providers(service_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_service_providers_status ON service_providers(status);

-- ==================== ORDER DOMAIN ====================

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  resident_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id),
  provider_id UUID NOT NULL REFERENCES service_providers(id),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'cancelled')),
  quantity INT,
  amount DECIMAL(10,2) NOT NULL,
  delivery_location VARCHAR(255),
  delivery_latitude DECIMAL(10, 8),
  delivery_longitude DECIMAL(11, 8),
  scheduled_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_orders_community_id ON orders(community_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_resident_id ON orders(resident_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_provider_id ON orders(provider_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_service_id ON orders(service_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

CREATE TABLE IF NOT EXISTS order_timeline_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  triggered_by UUID REFERENCES users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_timeline_events_order_id ON order_timeline_events(order_id);
CREATE INDEX idx_order_timeline_events_event_type ON order_timeline_events(event_type);
CREATE INDEX idx_order_timeline_events_created_at ON order_timeline_events(created_at DESC);

CREATE TABLE IF NOT EXISTS order_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_order_assignments_order_id ON order_assignments(order_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_order_assignments_worker_id ON order_assignments(worker_id) WHERE deleted_at IS NULL;

-- ==================== INCIDENT DOMAIN ====================

CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id),
  status VARCHAR(50) DEFAULT 'reported' CHECK (status IN ('reported', 'investigating', 'assigned', 'resolved', 'confirmed_resolved')),
  severity VARCHAR(50) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assigned_provider_id UUID REFERENCES service_providers(id),
  assigned_worker_id UUID REFERENCES users(id),
  affected_units INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_incidents_community_id ON incidents(community_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_incidents_service_id ON incidents(service_id);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_created_at ON incidents(created_at DESC);

CREATE TABLE IF NOT EXISTS incident_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES users(id),
  unit_id UUID REFERENCES units(id),
  location VARCHAR(255),
  description TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_incident_reports_incident_id ON incident_reports(incident_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_incident_reports_reporter_id ON incident_reports(reporter_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS incident_timeline_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  triggered_by UUID REFERENCES users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_incident_timeline_events_incident_id ON incident_timeline_events(incident_id);
CREATE INDEX idx_incident_timeline_events_created_at ON incident_timeline_events(created_at DESC);

-- ==================== PAYMENT DOMAIN ====================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  resident_id UUID NOT NULL REFERENCES users(id),
  provider_id UUID NOT NULL REFERENCES service_providers(id),
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed', 'refunded')),
  payment_method VARCHAR(50) DEFAULT 'mpesa' CHECK (payment_method IN ('mpesa', 'card', 'bank_transfer')),
  mpesa_transaction_id VARCHAR(255),
  idempotency_key VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_payments_community_id ON payments(community_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_resident_id ON payments(resident_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_payments_provider_id ON payments(provider_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_idempotency_key ON payments(idempotency_key);

CREATE TABLE IF NOT EXISTS payment_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  event VARCHAR(100) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_audit_payment_id ON payment_audit(payment_id);
CREATE INDEX idx_payment_audit_created_at ON payment_audit(created_at DESC);

-- ==================== NOTIFICATION DOMAIN ====================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  related_order_id UUID REFERENCES orders(id),
  related_incident_id UUID REFERENCES incidents(id),
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_notifications_community_id ON notifications(community_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_notifications_recipient_id ON notifications(recipient_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_notifications_read_at ON notifications(read_at);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- ==================== AUDIT DOMAIN ====================

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID REFERENCES communities(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id VARCHAR(255),
  changes JSONB DEFAULT '{}',
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_log_community_id ON audit_log(community_id);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_entity_type ON audit_log(entity_type);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_action ON audit_log(action);

-- ==================== EVENT LOG DOMAIN ====================

CREATE TABLE IF NOT EXISTS event_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID REFERENCES communities(id) ON DELETE SET NULL,
  event_type VARCHAR(100) NOT NULL,
  aggregate_id VARCHAR(255),
  aggregate_type VARCHAR(100),
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_event_log_community_id ON event_log(community_id);
CREATE INDEX idx_event_log_event_type ON event_log(event_type);
CREATE INDEX idx_event_log_processed ON event_log(processed);
CREATE INDEX idx_event_log_created_at ON event_log(created_at DESC);
