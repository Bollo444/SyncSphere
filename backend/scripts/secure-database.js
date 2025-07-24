#!/usr/bin/env node

/**
 * SyncSphere Database Security Configuration
 * Applies security hardening to PostgreSQL database
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

/**
 * Database security configuration
 */
class DatabaseSecurity {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'syncsphere',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres'
    });
  }

  /**
   * Execute SQL query
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} Query result
   */
  async query(query, params = []) {
    try {
      const result = await this.pool.query(query, params);
      return result;
    } catch (error) {
      console.error(`${colors.red}SQL Error: ${error.message}${colors.reset}`);
      throw error;
    }
  }

  /**
   * Create application-specific database user
   */
  async createAppUser() {
    console.log(`${colors.blue}Creating application database user...${colors.reset}`);

    const username = process.env.DB_APP_USER || 'syncsphere_app';
    const password = process.env.DB_APP_PASSWORD || this.generateSecurePassword();

    try {
      // Check if user already exists
      const userExists = await this.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [username]);

      if (userExists.rows.length > 0) {
        console.log(
          `${colors.yellow}User ${username} already exists, updating password...${colors.reset}`
        );
        const escapedPassword = password.replace(/'/g, "''");
        await this.query(`ALTER USER ${username} WITH PASSWORD '${escapedPassword}'`);
      } else {
        // Create new user
        const escapedPassword = password.replace(/'/g, "''");
        await this.query(`CREATE USER ${username} WITH PASSWORD '${escapedPassword}'`);
        console.log(`${colors.green}✓ Created user: ${username}${colors.reset}`);
      }

      // Grant necessary privileges
      await this.query(`GRANT CONNECT ON DATABASE ${process.env.DB_NAME} TO ${username}`);
      await this.query(`GRANT USAGE ON SCHEMA public TO ${username}`);
      await this.query(
        `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${username}`
      );
      await this.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${username}`);

      // Grant privileges on future tables
      await this.query(
        `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${username}`
      );
      await this.query(
        `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${username}`
      );

      console.log(`${colors.green}✓ Granted privileges to ${username}${colors.reset}`);

      return { username, password };
    } catch (error) {
      console.error(
        `${colors.red}✗ Failed to create application user: ${error.message}${colors.reset}`
      );
      throw error;
    }
  }

  /**
   * Configure database security settings
   */
  async configureSecuritySettings() {
    console.log(`${colors.blue}Configuring database security settings...${colors.reset}`);

    const securityQueries = [
      // Disable unnecessary extensions
      'DROP EXTENSION IF EXISTS plpgsql CASCADE;',

      // Set secure connection settings
      "ALTER SYSTEM SET ssl = 'on';",
      "ALTER SYSTEM SET ssl_prefer_server_ciphers = 'on';",

      // Configure logging for security monitoring
      "ALTER SYSTEM SET log_connections = 'on';",
      "ALTER SYSTEM SET log_disconnections = 'on';",
      "ALTER SYSTEM SET log_failed_connections = 'on';",
      "ALTER SYSTEM SET log_statement = 'ddl';",

      // Set connection limits
      "ALTER SYSTEM SET max_connections = '100';",
      "ALTER SYSTEM SET superuser_reserved_connections = '3';",

      // Configure authentication timeout
      "ALTER SYSTEM SET authentication_timeout = '60s';",

      // Set statement timeout to prevent long-running queries
      "ALTER SYSTEM SET statement_timeout = '300000';", // 5 minutes

      // Configure shared preload libraries for security
      "ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';"
    ];

    for (const query of securityQueries) {
      try {
        await this.query(query);
        console.log(
          `${colors.green}✓ Applied: ${query.split(' ').slice(0, 4).join(' ')}...${colors.reset}`
        );
      } catch (error) {
        // Some settings might not be applicable in all environments
        console.log(
          `${colors.yellow}⚠ Skipped: ${query.split(' ').slice(0, 4).join(' ')}... (${error.message})${colors.reset}`
        );
      }
    }

    // Reload configuration
    try {
      await this.query('SELECT pg_reload_conf();');
      console.log(`${colors.green}✓ Reloaded PostgreSQL configuration${colors.reset}`);
    } catch (error) {
      console.log(
        `${colors.yellow}⚠ Could not reload configuration: ${error.message}${colors.reset}`
      );
    }
  }

  /**
   * Create security views and functions
   */
  async createSecurityViews() {
    console.log(`${colors.blue}Creating security monitoring views...${colors.reset}`);

    const securityViews = [
      // View for monitoring active connections
      `CREATE OR REPLACE VIEW active_connections AS
       SELECT 
         pid,
         usename,
         application_name,
         client_addr,
         client_hostname,
         client_port,
         backend_start,
         state,
         query_start,
         LEFT(query, 100) as query_preview
       FROM pg_stat_activity 
       WHERE state = 'active' AND pid <> pg_backend_pid();`,

      // View for monitoring failed login attempts
      `CREATE OR REPLACE VIEW failed_logins AS
       SELECT 
         session_start_time,
         user_name,
         database_name,
         remote_host,
         session_id,
         error_severity,
         message
       FROM pg_log 
       WHERE error_severity = 'FATAL' 
         AND message LIKE '%authentication failed%'
       ORDER BY session_start_time DESC;`,

      // Function to check for suspicious activity
      `CREATE OR REPLACE FUNCTION check_suspicious_activity()
       RETURNS TABLE(
         alert_type TEXT,
         details TEXT,
         severity TEXT
       ) AS $$
       BEGIN
         -- Check for too many connections from single IP
         RETURN QUERY
         SELECT 
           'Multiple Connections' as alert_type,
           'IP ' || client_addr::text || ' has ' || count(*)::text || ' connections' as details,
           'WARNING' as severity
         FROM pg_stat_activity 
         WHERE client_addr IS NOT NULL
         GROUP BY client_addr 
         HAVING count(*) > 10;
         
         -- Check for long-running queries
         RETURN QUERY
         SELECT 
           'Long Running Query' as alert_type,
           'Query running for ' || EXTRACT(EPOCH FROM (now() - query_start))::text || ' seconds' as details,
           'WARNING' as severity
         FROM pg_stat_activity 
         WHERE state = 'active' 
           AND query_start < now() - interval '5 minutes'
           AND pid <> pg_backend_pid();
       END;
       $$ LANGUAGE plpgsql;`
    ];

    for (const view of securityViews) {
      try {
        await this.query(view);
        const viewName = view.match(/CREATE.*?VIEW (\w+)|CREATE.*?FUNCTION (\w+)/i);
        const name = viewName ? viewName[1] || viewName[2] : 'security object';
        console.log(`${colors.green}✓ Created: ${name}${colors.reset}`);
      } catch (error) {
        console.error(
          `${colors.red}✗ Failed to create security view: ${error.message}${colors.reset}`
        );
      }
    }
  }

  /**
   * Set up row-level security policies
   */
  async setupRowLevelSecurity() {
    console.log(`${colors.blue}Setting up row-level security...${colors.reset}`);

    const rlsPolicies = [
      // Enable RLS on users table
      'ALTER TABLE users ENABLE ROW LEVEL SECURITY;',

      // Policy: Users can only see their own data
      `CREATE POLICY user_isolation ON users
       FOR ALL TO syncsphere_app
       USING (id = current_setting('app.current_user_id')::uuid);`,

      // Enable RLS on devices table
      'ALTER TABLE devices ENABLE ROW LEVEL SECURITY;',

      // Policy: Users can only see their own devices
      `CREATE POLICY device_isolation ON devices
       FOR ALL TO syncsphere_app
       USING (user_id = current_setting('app.current_user_id')::uuid);`,

      // Enable RLS on data_transfers table
      'ALTER TABLE data_transfers ENABLE ROW LEVEL SECURITY;',

      // Policy: Users can only see their own transfers
      `CREATE POLICY transfer_isolation ON data_transfers
       FOR ALL TO syncsphere_app
       USING (user_id = current_setting('app.current_user_id')::uuid);`
    ];

    for (const policy of rlsPolicies) {
      try {
        await this.query(policy);
        console.log(`${colors.green}✓ Applied RLS policy${colors.reset}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`${colors.yellow}⚠ RLS policy already exists${colors.reset}`);
        } else {
          console.error(
            `${colors.red}✗ Failed to apply RLS policy: ${error.message}${colors.reset}`
          );
        }
      }
    }
  }

  /**
   * Create audit triggers
   */
  async createAuditTriggers() {
    console.log(`${colors.blue}Creating audit triggers...${colors.reset}`);

    const auditSetup = [
      // Create audit log table
      `CREATE TABLE IF NOT EXISTS audit_log (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         table_name TEXT NOT NULL,
         operation TEXT NOT NULL,
         old_values JSONB,
         new_values JSONB,
         user_id UUID,
         ip_address INET,
         user_agent TEXT,
         created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
       );`,

      // Create audit trigger function
      `CREATE OR REPLACE FUNCTION audit_trigger_function()
       RETURNS TRIGGER AS $$
       BEGIN
         INSERT INTO audit_log (
           table_name,
           operation,
           old_values,
           new_values,
           user_id,
           ip_address,
           user_agent
         ) VALUES (
           TG_TABLE_NAME,
           TG_OP,
           CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
           CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
           COALESCE(current_setting('app.current_user_id', true)::uuid, NULL),
           COALESCE(inet_client_addr(), NULL),
           COALESCE(current_setting('app.user_agent', true), NULL)
         );
         
         RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
       END;
       $$ LANGUAGE plpgsql;`,

      // Create triggers on sensitive tables
      `CREATE TRIGGER users_audit_trigger
       AFTER INSERT OR UPDATE OR DELETE ON users
       FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();`,

      `CREATE TRIGGER devices_audit_trigger
       AFTER INSERT OR UPDATE OR DELETE ON devices
       FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();`,

      `CREATE TRIGGER subscriptions_audit_trigger
       AFTER INSERT OR UPDATE OR DELETE ON subscriptions
       FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();`
    ];

    for (const sql of auditSetup) {
      try {
        await this.query(sql);
        console.log(`${colors.green}✓ Created audit component${colors.reset}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`${colors.yellow}⚠ Audit component already exists${colors.reset}`);
        } else {
          console.error(
            `${colors.red}✗ Failed to create audit component: ${error.message}${colors.reset}`
          );
        }
      }
    }
  }

  /**
   * Generate secure password
   * @returns {string} Secure password
   */
  generateSecurePassword() {
    const crypto = require('crypto');
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
    let password = '';

    for (let i = 0; i < 16; i++) {
      const randomIndex = crypto.randomBytes(1)[0] % charset.length;
      password += charset[randomIndex];
    }

    return password;
  }

  /**
   * Run all security configurations
   */
  async runSecurityHardening() {
    console.log(`${colors.cyan}Starting database security hardening...${colors.reset}\n`);

    try {
      // Create application user
      const appUser = await this.createAppUser();

      // Configure security settings
      await this.configureSecuritySettings();

      // Create security monitoring views
      await this.createSecurityViews();

      // Set up row-level security
      await this.setupRowLevelSecurity();

      // Create audit triggers
      await this.createAuditTriggers();

      console.log(
        `\n${colors.green}✓ Database security hardening completed successfully!${colors.reset}`
      );
      console.log(`${colors.yellow}Application User: ${appUser.username}${colors.reset}`);
      console.log(`${colors.yellow}Application Password: ${appUser.password}${colors.reset}`);
      console.log(
        `${colors.yellow}⚠️  Update your .env file with the new application credentials${colors.reset}`
      );
    } catch (error) {
      console.error(`${colors.red}✗ Security hardening failed: ${error.message}${colors.reset}`);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async close() {
    await this.pool.end();
  }
}

/**
 * Main execution
 */
async function main() {
  const security = new DatabaseSecurity();

  try {
    await security.runSecurityHardening();
  } catch (error) {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    process.exit(1);
  } finally {
    await security.close();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = DatabaseSecurity;
