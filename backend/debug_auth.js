const { protect } = require('./src/middleware/authMiddleware');
const User = require('./src/models/User');
const jwt = require('jsonwebtoken');
const { connectDB, query } = require('./src/config/database');

async function testAuthMiddleware() {
  try {
    console.log('=== Testing Auth Middleware ===');
    
    // Set JWT secret for testing
    process.env.JWT_SECRET = 'test-secret-key-for-debugging';
    
    // Initialize database
    await connectDB();
    
    // Clean up any existing test user first
    await query('DELETE FROM users WHERE email = ?', ['test@example.com']);
    
    // Create a test user
    const testUser = await User.create({
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      role: 'user'
    });
    
    console.log('Created test user:', {
      id: testUser.id,
      email: testUser.email,
      isActive: testUser.isActive,
      typeof_isActive: typeof testUser.isActive
    });
    
    // Generate a token for the user (matching User.generateToken() structure)
    const tokenPayload = { id: testUser.id, email: testUser.email, role: testUser.role };
    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    console.log('Generated token for user:', testUser.id);
    console.log('Token payload:', tokenPayload);
    
    // Verify the token can be decoded
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);
    
    // Create mock request and response objects
    const req = {
      headers: {
        authorization: `Bearer ${token}`
      }
    };
    
    const res = {
      status: (code) => {
        console.log('Response status:', code);
        return {
          json: (data) => {
            console.log('Response data:', data);
            throw new Error('Auth failed: ' + JSON.stringify(data));
          }
        };
      }
    };
    
    const next = (error) => {
      if (error) {
        console.log('Auth middleware error:', error.message);
        throw error;
      } else {
        console.log('Auth middleware passed successfully');
        console.log('req.user:', {
          id: req.user?.id,
          email: req.user?.email,
          isActive: req.user?.isActive,
          typeof_isActive: typeof req.user?.isActive
        });
      }
    };
    
    // Test the auth middleware
    await protect(req, res, next);
    
    // Clean up
    await query('DELETE FROM users WHERE email = ?', ['test@example.com']);
    console.log('Test completed successfully');
    
  } catch (error) {
    console.error('Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

testAuthMiddleware();