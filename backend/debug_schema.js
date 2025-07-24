const { connectDB, query } = require('./src/config/database');

async function checkIsActiveIssue() {
  try {
    await connectDB();
    console.log('Connected to database\n');
    
    // Test creating a user without explicitly setting is_active
    console.log('=== Testing User Creation ===');
    const testUserId = require('crypto').randomUUID();
    const testEmail = `debug_test_${Date.now()}@example.com`;
    
    console.log('Creating user without explicit is_active...');
    await query(`
      INSERT INTO users (id, email, password_hash, first_name, last_name, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [testUserId, testEmail, 'test_hash', 'Debug', 'User', 'user']);
    
    // Check what was actually inserted
    const insertedUser = await query('SELECT id, email, is_active, email_verified FROM users WHERE id = ?', [testUserId]);
    console.log('\nInserted user data:');
    if (insertedUser.rows.length > 0) {
      const user = insertedUser.rows[0];
      console.log(`  ID: ${user.id}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  is_active: ${user.is_active} (type: ${typeof user.is_active})`);
      console.log(`  email_verified: ${user.email_verified} (type: ${typeof user.email_verified})`);
    }
    
    // Test the User model creation
    console.log('\n=== Testing User Model ===');
    const User = require('./src/models/User');
    
    try {
      const modelUser = await User.create({
        email: `model_test_${Date.now()}@example.com`,
        password: 'TestPassword123!',
        firstName: 'Model',
        lastName: 'Test'
      });
      
      console.log('User created via User.create():');
      console.log(`  ID: ${modelUser.id}`);
      console.log(`  Email: ${modelUser.email}`);
      console.log(`  isActive: ${modelUser.isActive} (type: ${typeof modelUser.isActive})`);
      console.log(`  emailVerified: ${modelUser.emailVerified} (type: ${typeof modelUser.emailVerified})`);
      
      // Clean up model user
      await query('DELETE FROM users WHERE id = ?', [modelUser.id]);
    } catch (error) {
      console.log('Error creating user via User.create():', error.message);
    }
    
    // Clean up direct insert user
    await query('DELETE FROM users WHERE id = ?', [testUserId]);
    console.log('\nTest users cleaned up');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkIsActiveIssue();