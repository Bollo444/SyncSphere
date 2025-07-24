const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

async function createTestUser() {
  try {
    console.log('🔧 Creating test user...');
    
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    // First check if user exists
    const existingUser = await pool.query('SELECT id, email FROM users WHERE email = $1', ['test@syncsphere.com']);
    
    if (existingUser.rows.length > 0) {
      // Update existing user
      const result = await pool.query(
        'UPDATE users SET password_hash = $1, is_active = true, email_verified = true WHERE email = $2 RETURNING id, email',
        [hashedPassword, 'test@syncsphere.com']
      );
      console.log('✅ Test user updated:', result.rows[0]);
    } else {
      // Create new user
      const result = await pool.query(
        'INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, email_verified) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, email',
        ['test@syncsphere.com', hashedPassword, 'Test', 'User', 'admin', true, true]
      );
      console.log('✅ Test user created:', result.rows[0]);
    }
    
    console.log('📧 Email: test@syncsphere.com');
    console.log('🔑 Password: password123');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
    console.error('Stack:', error.stack);
    await pool.end();
    process.exit(1);
  }
}

createTestUser();