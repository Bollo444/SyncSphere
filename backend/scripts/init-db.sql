-- SyncSphere Database Schema
-- This script creates all the necessary tables for the SyncSphere application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
    subscription_tier VARCHAR(20) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic', 'premium', 'enterprise')),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    email_verification_token VARCHAR(255),
    email_verification_expires TIMESTAMP,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    last_login TIMESTAMP,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    timezone VARCHAR(50) DEFAULT 'UTC',
    language VARCHAR(10) DEFAULT 'en',
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- Create indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_email_verification_token ON users(email_verification_token);
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);

-- Devices table
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_type VARCHAR(50) NOT NULL CHECK (device_type IN ('mobile', 'tablet', 'laptop', 'desktop', 'smartwatch')),
    device_model VARCHAR(100) NOT NULL,
    os_version VARCHAR(50),
    serial_number VARCHAR(255),
    device_name VARCHAR(100) NOT NULL,
    connection_id VARCHAR(255) UNIQUE,
    status VARCHAR(20) DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'syncing', 'error')),
    last_connected TIMESTAMP,
    capabilities JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- Create indexes for devices table
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_device_type ON devices(device_type);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_connection_id ON devices(connection_id);
CREATE INDEX IF NOT EXISTS idx_devices_serial_number ON devices(serial_number);
CREATE INDEX IF NOT EXISTS idx_devices_deleted_at ON devices(deleted_at);
CREATE INDEX IF NOT EXISTS idx_devices_last_connected ON devices(last_connected);

-- Data transfers table
CREATE TABLE IF NOT EXISTS data_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    target_device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    transfer_type VARCHAR(50) NOT NULL CHECK (transfer_type IN ('backup', 'restore', 'sync', 'migration')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
    data_types TEXT[] DEFAULT '{}', -- Array of data types being transferred
    total_size BIGINT DEFAULT 0,
    transferred_size BIGINT DEFAULT 0,
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for data_transfers table
CREATE INDEX IF NOT EXISTS idx_data_transfers_user_id ON data_transfers(user_id);
CREATE INDEX IF NOT EXISTS idx_data_transfers_source_device_id ON data_transfers(source_device_id);
CREATE INDEX IF NOT EXISTS idx_data_transfers_target_device_id ON data_transfers(target_device_id);
CREATE INDEX IF NOT EXISTS idx_data_transfers_status ON data_transfers(status);
CREATE INDEX IF NOT EXISTS idx_data_transfers_transfer_type ON data_transfers(transfer_type);
CREATE INDEX IF NOT EXISTS idx_data_transfers_created_at ON data_transfers(created_at);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id VARCHAR(50) NOT NULL,
    plan_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'suspended')),
    billing_cycle VARCHAR(20) CHECK (billing_cycle IN ('monthly', 'yearly')),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method_id VARCHAR(255),
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    trial_start TIMESTAMP,
    trial_end TIMESTAMP,
    cancelled_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for subscriptions table
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_current_period_end ON subscriptions(current_period_end);

-- User activity logs table
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for user_activity_logs table
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_action ON user_activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON user_activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_resource_type ON user_activity_logs(resource_type);

-- Device activity logs table
CREATE TABLE IF NOT EXISTS device_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for device_activity_logs table
CREATE INDEX IF NOT EXISTS idx_device_activity_logs_user_id ON device_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_device_activity_logs_device_id ON device_activity_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_device_activity_logs_action ON device_activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_device_activity_logs_created_at ON device_activity_logs(created_at);

-- Data recovery sessions table
CREATE TABLE IF NOT EXISTS data_recovery_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    session_type VARCHAR(50) NOT NULL CHECK (session_type IN ('backup', 'restore', 'scan')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
    data_types TEXT[] DEFAULT '{}',
    scan_results JSONB DEFAULT '{}',
    recovery_options JSONB DEFAULT '{}',
    selected_items JSONB DEFAULT '{}',
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for data_recovery_sessions table
CREATE INDEX IF NOT EXISTS idx_data_recovery_sessions_user_id ON data_recovery_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_data_recovery_sessions_device_id ON data_recovery_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_data_recovery_sessions_status ON data_recovery_sessions(status);
CREATE INDEX IF NOT EXISTS idx_data_recovery_sessions_session_type ON data_recovery_sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_data_recovery_sessions_expires_at ON data_recovery_sessions(expires_at);

-- API keys table (for external integrations)
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(20) NOT NULL,
    permissions TEXT[] DEFAULT '{}',
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for api_keys table
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_expires_at ON api_keys(expires_at);

-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for system_settings table
CREATE INDEX IF NOT EXISTS idx_system_settings_setting_key ON system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_system_settings_is_public ON system_settings(is_public);

-- File uploads table (for temporary file storage references)
CREATE TABLE IF NOT EXISTS file_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    transfer_id UUID REFERENCES data_transfers(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(100),
    mime_type VARCHAR(100),
    checksum VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'deleted')),
    metadata JSONB DEFAULT '{}',
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for file_uploads table
CREATE INDEX IF NOT EXISTS idx_file_uploads_user_id ON file_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_device_id ON file_uploads(device_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_transfer_id ON file_uploads(transfer_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_status ON file_uploads(status);
CREATE INDEX IF NOT EXISTS idx_file_uploads_expires_at ON file_uploads(expires_at);
CREATE INDEX IF NOT EXISTS idx_file_uploads_checksum ON file_uploads(checksum);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all tables with updated_at column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_data_transfers_updated_at BEFORE UPDATE ON data_transfers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_data_recovery_sessions_updated_at BEFORE UPDATE ON data_recovery_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_file_uploads_updated_at BEFORE UPDATE ON file_uploads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, description, is_public) VALUES
('app_name', '"SyncSphere"', 'Application name', true),
('app_version', '"1.0.0"', 'Application version', true),
('maintenance_mode', 'false', 'Enable/disable maintenance mode', false),
('registration_enabled', 'true', 'Enable/disable user registration', true),
('email_verification_required', 'false', 'Require email verification for new accounts', true),
('max_devices_free', '3', 'Maximum devices for free tier', true),
('max_devices_basic', '10', 'Maximum devices for basic tier', true),
('max_devices_premium', '50', 'Maximum devices for premium tier', true),
('max_file_size', '104857600', 'Maximum file upload size in bytes (100MB)', true),
('supported_file_types', '["jpg", "jpeg", "png", "gif", "pdf", "doc", "docx", "txt", "mp4", "mov", "avi"]', 'Supported file types for upload', true)
ON CONFLICT (setting_key) DO NOTHING;

-- Create a view for active user devices
CREATE OR REPLACE VIEW active_user_devices AS
SELECT 
    u.id as user_id,
    u.email,
    u.first_name,
    u.last_name,
    u.subscription_tier,
    d.id as device_id,
    d.device_type,
    d.device_model,
    d.device_name,
    d.status,
    d.last_connected,
    d.created_at as device_added_at
FROM users u
JOIN devices d ON u.id = d.user_id
WHERE u.deleted_at IS NULL 
    AND u.is_active = true 
    AND d.deleted_at IS NULL;

-- Create a view for user statistics
CREATE OR REPLACE VIEW user_statistics AS
SELECT 
    u.id as user_id,
    u.email,
    u.subscription_tier,
    u.created_at as user_since,
    u.last_login,
    COUNT(d.id) as total_devices,
    COUNT(CASE WHEN d.status = 'connected' THEN 1 END) as connected_devices,
    COUNT(dt.id) as total_transfers,
    COUNT(CASE WHEN dt.status = 'completed' THEN 1 END) as completed_transfers,
    COALESCE(SUM(dt.total_size), 0) as total_data_transferred
FROM users u
LEFT JOIN devices d ON u.id = d.user_id AND d.deleted_at IS NULL
LEFT JOIN data_transfers dt ON u.id = dt.user_id
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.email, u.subscription_tier, u.created_at, u.last_login;

-- Recovery sessions table (for integration tests)
CREATE TABLE IF NOT EXISTS recovery_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    scan_type VARCHAR(50) NOT NULL CHECK (scan_type IN ('quick', 'deep', 'selective')),
    status VARCHAR(20) DEFAULT 'scanning' CHECK (status IN ('scanning', 'completed', 'failed', 'cancelled')),
    data_types TEXT[] DEFAULT '{}',
    scan_results JSONB DEFAULT '{}',
    recovery_options JSONB DEFAULT '{}',
    selected_items JSONB DEFAULT '{}',
    progress INTEGER DEFAULT 0,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for recovery_sessions table
CREATE INDEX IF NOT EXISTS idx_recovery_sessions_user_id ON recovery_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_recovery_sessions_device_id ON recovery_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_recovery_sessions_status ON recovery_sessions(status);
CREATE INDEX IF NOT EXISTS idx_recovery_sessions_scan_type ON recovery_sessions(scan_type);

-- Transfer sessions table (for integration tests)
CREATE TABLE IF NOT EXISTS transfer_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    target_device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    transfer_type VARCHAR(50) NOT NULL CHECK (transfer_type IN ('full', 'selective', 'quick')),
    status VARCHAR(20) DEFAULT 'preparing' CHECK (status IN ('preparing', 'in_progress', 'completed', 'failed', 'cancelled')),
    data_types TEXT[] DEFAULT '{}',
    transfer_method VARCHAR(50) DEFAULT 'wireless' CHECK (transfer_method IN ('wireless', 'cable', 'cloud')),
    progress INTEGER DEFAULT 0,
    total_items INTEGER DEFAULT 0,
    transferred_items INTEGER DEFAULT 0,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for transfer_sessions table
CREATE INDEX IF NOT EXISTS idx_transfer_sessions_user_id ON transfer_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_transfer_sessions_source_device_id ON transfer_sessions(source_device_id);
CREATE INDEX IF NOT EXISTS idx_transfer_sessions_target_device_id ON transfer_sessions(target_device_id);
CREATE INDEX IF NOT EXISTS idx_transfer_sessions_status ON transfer_sessions(status);
CREATE INDEX IF NOT EXISTS idx_transfer_sessions_transfer_type ON transfer_sessions(transfer_type);

-- Add triggers for new tables
CREATE TRIGGER update_recovery_sessions_updated_at BEFORE UPDATE ON recovery_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transfer_sessions_updated_at BEFORE UPDATE ON transfer_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Backup operations table
CREATE TABLE IF NOT EXISTS backup_operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    backup_type VARCHAR(50) NOT NULL CHECK (backup_type IN ('database', 'files', 'full')),
    backup_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    checksum VARCHAR(255),
    compression_type VARCHAR(20) DEFAULT 'zip',
    encryption_enabled BOOLEAN DEFAULT false,
    backup_metadata JSONB DEFAULT '{}',
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for backup_operations table
CREATE INDEX IF NOT EXISTS idx_backup_operations_type ON backup_operations(backup_type);
CREATE INDEX IF NOT EXISTS idx_backup_operations_status ON backup_operations(status);
CREATE INDEX IF NOT EXISTS idx_backup_operations_created_at ON backup_operations(created_at);
CREATE INDEX IF NOT EXISTS idx_backup_operations_user_id ON backup_operations(user_id);

-- Backup schedules table
CREATE TABLE IF NOT EXISTS backup_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_name VARCHAR(255) NOT NULL,
    backup_type VARCHAR(50) NOT NULL CHECK (backup_type IN ('database', 'files', 'full')),
    cron_expression VARCHAR(100) NOT NULL,
    enabled BOOLEAN DEFAULT true,
    retention_days INTEGER DEFAULT 30,
    backup_options JSONB DEFAULT '{}',
    last_run TIMESTAMP WITH TIME ZONE,
    next_run TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for backup_schedules table
CREATE INDEX IF NOT EXISTS idx_backup_schedules_enabled ON backup_schedules(enabled);
CREATE INDEX IF NOT EXISTS idx_backup_schedules_next_run ON backup_schedules(next_run);
CREATE INDEX IF NOT EXISTS idx_backup_schedules_backup_type ON backup_schedules(backup_type);

-- Restore operations table
CREATE TABLE IF NOT EXISTS restore_operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    backup_id UUID REFERENCES backup_operations(id) ON DELETE CASCADE,
    restore_type VARCHAR(50) NOT NULL,
    target_location VARCHAR(500),
    status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed')),
    progress INTEGER DEFAULT 0,
    error_message TEXT,
    restore_metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for restore_operations table
CREATE INDEX IF NOT EXISTS idx_restore_operations_backup_id ON restore_operations(backup_id);
CREATE INDEX IF NOT EXISTS idx_restore_operations_status ON restore_operations(status);
CREATE INDEX IF NOT EXISTS idx_restore_operations_created_by ON restore_operations(created_by);

-- Add triggers for backup tables
CREATE TRIGGER update_backup_operations_updated_at BEFORE UPDATE ON backup_operations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_backup_schedules_updated_at BEFORE UPDATE ON backup_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_restore_operations_updated_at BEFORE UPDATE ON restore_operations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO syncsphere_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO syncsphere_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO syncsphere_user;

COMMIT;