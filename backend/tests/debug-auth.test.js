const request = require('supertest');
const app = require('../src/app');

describe('Debug Authentication', () => {
  let testUser;
  let authToken;
  
  beforeEach(async () => {
    // Create test user and get auth token
    testUser = await global.testHelpers.createTestUser();
    authToken = global.testHelpers.generateTestToken(testUser);
    
    console.log('🔍 DEBUG: Test user created:', {
      id: testUser.id,
      email: testUser.email,
      role: testUser.role
    });
    console.log('🔍 DEBUG: Auth token generated:', authToken ? authToken.substring(0, 50) + '...' : 'NONE');
  });
  
  test('should authenticate successfully with mock token', async () => {
    console.log('🔍 DEBUG: Testing authentication with token:', authToken ? 'YES' : 'NO');
    
    const response = await request(app)
      .get('/api/v1/users/profile')
      .set('Authorization', `Bearer ${authToken}`);
    
    console.log('🔍 DEBUG: Response status:', response.status);
    console.log('🔍 DEBUG: Response body:', JSON.stringify(response.body, null, 2));
    
    expect(response.status).toBe(200);
  });
});