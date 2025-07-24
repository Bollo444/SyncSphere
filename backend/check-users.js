require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkAndCreateUsers() {
  try {
    // Check existing users
    const result = await pool.query('SELECT id, email, first_name, last_name, role, is_active FROM users LIMIT 10');
    console.log('Users in database:', result.rows.length);
    
    if (result.rows.length > 0) {
      console.log('Existing users:');
      result.rows.forEach(user => {
        console.log(`  - ${user.email} (${user.role}) - Active: ${user.is_active}`);
      });
    } else {
      console.log('No users found in database');
      console.log('Creating admin user...');
      
      // Create admin user
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const passwordHash = await bcrypt.hash('admin123', saltRounds);
      
      const insertResult = await pool.query(`
        INSERT INTO users (
          email, password_hash, first_name, last_name, role, 
          is_active, email_verified, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) RETURNING id, email, role
      `, [
        'admin@syncsphere.com',
        passwordHash,
        'Admin',
        'User',
        'admin',
        true,
        true
      ]);
      
      console.log('Admin user created:', insertResult.rows[0]);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkAndCreateUsers();