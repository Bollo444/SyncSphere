require('dotenv').config();
const http = require('http');

const postData = JSON.stringify({
  email: 'admin@syncsphere.com',
  password: 'admin123'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/v1/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      if (res.statusCode === 200) {
        console.log('Login successful!');
        console.log('User:', response.data?.user?.email);
        console.log('Access Token received:', !!response.data?.tokens?.accessToken);
        console.log('Refresh Token received:', !!response.data?.tokens?.refreshToken);
      } else {
        console.log('Login failed:', response);
      }
    } catch (error) {
      console.log('Response parsing error:', error.message);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error.message);
});

req.write(postData);
req.end();