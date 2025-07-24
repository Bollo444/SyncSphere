require('dotenv').config();
const { Pool } = require('pg');

async function checkConstraint() {
  const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'syncsphere',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5433,
  });
  
  console.log('Database config:', {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'syncsphere',
    port: process.env.DB_PORT || 5433,
    password: process.env.DB_PASSWORD ? '***' : 'undefined'
  });

  try {
    console.log('🔍 Checking devices table constraints...');
    
    // Check constraints on devices table
    const result = await pool.query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = (SELECT oid FROM pg_class WHERE relname = 'devices') 
      AND contype = 'c';
    `);
    
    console.log('Found constraints:');
    result.rows.forEach(row => {
      console.log(`  ${row.conname}: ${row.definition}`);
    });
    
    if (result.rows.length === 0) {
      console.log('  No check constraints found on devices table');
    }
    
  } catch (error) {
    console.error('Error checking constraints:', error.message);
  } finally {
    await pool.end();
  }
}

checkConstraint();