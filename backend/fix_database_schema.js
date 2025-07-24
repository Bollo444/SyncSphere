const { Pool } = require('pg');
require('dotenv').config();

async function fixDatabaseSchema() {
  const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'syncsphere',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5433,
  });

  try {
    console.log('🔍 Checking current devices table structure...');
    
    // Check current table structure
    const currentStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'devices' 
      ORDER BY ordinal_position;
    `);
    
    console.log('Current devices table columns:');
    currentStructure.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });
    
    console.log('\n🔧 Dropping and recreating devices table with correct schema...');
    
    // Drop the table and recreate with correct schema
    await pool.query('DROP TABLE IF EXISTS devices CASCADE;');
    
    // Create devices table with correct schema
    await pool.query(`
      CREATE TABLE devices (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        device_type VARCHAR(50) NOT NULL CHECK (device_type IN ('mobile', 'tablet', 'laptop', 'desktop', 'smartwatch', 'ios', 'android')),
        device_model VARCHAR(100) NOT NULL,
        os_version VARCHAR(50),
        serial_number VARCHAR(255),
        device_name VARCHAR(100) NOT NULL,
        connection_id VARCHAR(255) UNIQUE,
        status VARCHAR(20) DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'syncing', 'error', 'connecting')),
        last_connected TIMESTAMP,
        capabilities JSONB DEFAULT '{}',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
      CREATE INDEX IF NOT EXISTS idx_devices_device_type ON devices(device_type);
      CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
      CREATE INDEX IF NOT EXISTS idx_devices_connection_id ON devices(connection_id);
      CREATE INDEX IF NOT EXISTS idx_devices_serial_number ON devices(serial_number);
      CREATE INDEX IF NOT EXISTS idx_devices_last_connected ON devices(last_connected);
    `);
    
    console.log('✅ Devices table recreated with correct schema');
    
    // Verify the new structure
    const newStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'devices' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\nNew devices table columns:');
    newStructure.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing database schema:', error.message);
  } finally {
    await pool.end();
  }
}

fixDatabaseSchema();