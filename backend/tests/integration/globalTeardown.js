// Global teardown for integration tests
module.exports = async () => {
  console.log('🧹 Starting global teardown for integration tests...');
  
  try {
    // Connect to test database for cleanup
    const { Pool } = require('pg');
    const testDbName = process.env.DB_NAME || 'syncsphere_test';
    
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'syncsphere_user',
      password: process.env.DB_PASSWORD || 'syncsphere_password',
      database: testDbName
    });
    
    const client = await pool.connect();
    
    // Clean up test data (keep schema for next run)
    console.log('🗑️ Cleaning up test data...');
    
    const cleanupQueries = [
      "DELETE FROM backup_operations WHERE created_at > NOW() - INTERVAL '2 hours'",
      "DELETE FROM restore_operations WHERE created_at > NOW() - INTERVAL '2 hours'",
      "DELETE FROM backup_schedules WHERE created_at > NOW() - INTERVAL '2 hours'",
      "DELETE FROM transfers WHERE created_at > NOW() - INTERVAL '2 hours'",
      "DELETE FROM files WHERE created_at > NOW() - INTERVAL '2 hours'",
      "DELETE FROM sync_sessions WHERE created_at > NOW() - INTERVAL '2 hours'",
      "DELETE FROM recovery_operations WHERE created_at > NOW() - INTERVAL '2 hours'",
      "DELETE FROM notifications WHERE created_at > NOW() - INTERVAL '2 hours'",
      "DELETE FROM analytics_events WHERE created_at > NOW() - INTERVAL '2 hours'",
      "DELETE FROM devices WHERE created_at > NOW() - INTERVAL '2 hours'",
      "DELETE FROM subscriptions WHERE created_at > NOW() - INTERVAL '2 hours'",
      "DELETE FROM users WHERE created_at > NOW() - INTERVAL '2 hours'"
    ];
    
    for (const query of cleanupQueries) {
      try {
        const result = await client.query(query);
        if (result.rowCount > 0) {
          console.log(`🗑️ Cleaned ${result.rowCount} records from ${query.split(' ')[2]}`);
        }
      } catch (error) {
        console.warn(`⚠️ Cleanup warning for query: ${error.message}`);
      }
    }
    
    // Reset sequences to avoid ID conflicts in future tests
    try {
      const sequences = await client.query(`
        SELECT sequence_name 
        FROM information_schema.sequences 
        WHERE sequence_schema = 'public'
      `);
      
      for (const seq of sequences.rows) {
        await client.query(`ALTER SEQUENCE ${seq.sequence_name} RESTART WITH 1`);
      }
      
      if (sequences.rows.length > 0) {
        console.log(`🔄 Reset ${sequences.rows.length} sequences`);
      }
    } catch (error) {
      console.warn('⚠️ Sequence reset warning:', error.message);
    }
    
    client.release();
    await pool.end();
    
    console.log('✅ Global teardown completed successfully');
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error in teardown to avoid masking test failures
  }
};