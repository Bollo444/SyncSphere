// Global setup for integration tests
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

module.exports = async () => {
  console.log('🚀 Starting global setup for integration tests...');
  
  try {
    // Check if PostgreSQL is running
    console.log('🔍 Checking PostgreSQL connection...');
    
    // Try to connect to PostgreSQL
    const { Pool } = require('pg');
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'syncsphere_user',
      password: process.env.DB_PASSWORD || 'syncsphere_password',
      database: 'postgres' // Connect to default database first
    });
    
    // Test connection
    const client = await pool.connect();
    console.log('✅ PostgreSQL connection successful');
    
    // Check if test database exists, create if not
    const testDbName = process.env.DB_NAME || 'syncsphere_test';
    const dbCheckResult = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [testDbName]
    );
    
    if (dbCheckResult.rows.length === 0) {
      console.log(`📋 Creating test database: ${testDbName}`);
      await client.query(`CREATE DATABASE "${testDbName}"`);
      console.log('✅ Test database created');
    } else {
      console.log('✅ Test database already exists');
    }
    
    client.release();
    await pool.end();
    
    // Connect to the test database and ensure schema exists
    const testPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'syncsphere_user',
      password: process.env.DB_PASSWORD || 'syncsphere_password',
      database: testDbName
    });
    
    const testClient = await testPool.connect();
    
    // Check if uuid-ossp extension exists
    try {
      await testClient.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      console.log('✅ UUID extension ready');
    } catch (error) {
      console.warn('⚠️ UUID extension warning:', error.message);
    }
    
    // Check if main tables exist
    const tablesResult = await testClient.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'devices', 'backup_schedules')
    `);
    
    if (parseInt(tablesResult.rows[0].count) < 3) {
      console.log('📋 Setting up test database schema...');
      
      // Read and execute schema file
      const fs = require('fs');
      const path = require('path');
      const schemaPath = path.join(__dirname, '../../sql/init/01_schema.sql');
      
      if (fs.existsSync(schemaPath)) {
        const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
        
        // Execute schema
        try {
          await testClient.query(schemaSQL);
          console.log('✅ Test database schema initialized');
        } catch (error) {
          console.warn('⚠️ Schema setup warning:', error.message);
        }
      }
    } else {
      console.log('✅ Test database schema already exists');
    }
    
    testClient.release();
    await testPool.end();
    
    console.log('🎉 Global setup completed successfully');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    
    // If PostgreSQL is not running, provide helpful message
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 PostgreSQL appears to be not running.');
      console.error('Please ensure PostgreSQL is running and accessible.');
      console.error('You can start it with: docker-compose -f docker-compose.postgres.yml up -d');
    }
    
    throw error;
  }
};