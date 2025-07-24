const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 54322,
  database: 'syncsphere',
  user: 'postgres',
  password: 'postgres'
});

async function fixBackupTables() {
  try {
    console.log('Checking backup_schedules table...');
    
    // Check if backup_schedules table exists
    const checkTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'backup_schedules'
      )
    `);
    
    if (!checkTable.rows[0].exists) {
      console.log('Creating backup_schedules table...');
      
      await pool.query(`
        CREATE TABLE backup_schedules (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          schedule_name VARCHAR(255) NOT NULL,
          backup_type VARCHAR(50) NOT NULL,
          cron_expression VARCHAR(100) NOT NULL,
          enabled BOOLEAN DEFAULT true,
          retention_days INTEGER DEFAULT 30,
          backup_options JSONB DEFAULT '{}',
          last_run TIMESTAMP WITH TIME ZONE,
          next_run TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      await pool.query(`
        CREATE INDEX idx_backup_schedules_enabled ON backup_schedules(enabled)
      `);
      
      await pool.query(`
        CREATE OR REPLACE FUNCTION update_backup_schedules_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);
      
      await pool.query(`
        CREATE TRIGGER trigger_backup_schedules_updated_at
        BEFORE UPDATE ON backup_schedules
        FOR EACH ROW
        EXECUTE FUNCTION update_backup_schedules_updated_at();
      `);
      
      console.log('backup_schedules table created successfully');
    } else {
      console.log('backup_schedules table already exists');
    }
    
    // Test the table
    const count = await pool.query('SELECT COUNT(*) FROM backup_schedules');
    console.log('backup_schedules table count:', count.rows[0].count);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

fixBackupTables();