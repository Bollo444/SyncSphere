require('dotenv').config();
const { Pool } = require('pg');

async function fixDeviceConstraint() {
  const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'syncsphere',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5433,
  });

  try {
    console.log('🔧 Fixing device_type constraint...');
    
    // Drop the existing constraint
    await pool.query(`
      ALTER TABLE devices 
      DROP CONSTRAINT IF EXISTS devices_device_type_check;
    `);
    console.log('✅ Dropped old constraint');
    
    // Add the correct constraint
    await pool.query(`
      ALTER TABLE devices 
      ADD CONSTRAINT devices_device_type_check 
      CHECK (device_type IN ('ios', 'android'));
    `);
    console.log('✅ Added new constraint: device_type IN (\'ios\', \'android\')');
    
    // Verify the new constraint
    const result = await pool.query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = (SELECT oid FROM pg_class WHERE relname = 'devices') 
      AND contype = 'c'
      AND conname = 'devices_device_type_check';
    `);
    
    console.log('\n🔍 Verified new constraint:');
    result.rows.forEach(row => {
      console.log(`  ${row.conname}: ${row.definition}`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing constraint:', error.message);
  } finally {
    await pool.end();
  }
}

fixDeviceConstraint();