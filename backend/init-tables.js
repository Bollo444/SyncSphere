const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 54322,
  database: 'syncsphere',
  user: 'postgres',
  password: 'postgres'
});

async function initializeTables() {
  try {
    console.log('Reading SQL file...');
    const sql = fs.readFileSync('./scripts/init-db.sql', 'utf8');
    
    console.log('Executing SQL...');
    await pool.query(sql);
    
    console.log('✅ Database tables initialized successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    process.exit(1);
  }
}

initializeTables();