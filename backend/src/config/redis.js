const redis = require('redis');

let client;

const connectRedis = async () => {
  // Skip Redis in development if not explicitly enabled
  if (process.env.NODE_ENV !== 'production' && process.env.REDIS_ENABLED !== 'true') {
    console.log('⚠️ Redis disabled for development (set REDIS_ENABLED=true to enable)');
    return;
  }

  try {
    client = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: process.env.REDIS_DB || 0,
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          console.error('❌ Redis server connection refused');
          return new Error('Redis server connection refused');
        }
        if (options.total_retry_time > 1000 * 10) { // Reduced retry time
          console.error('❌ Redis retry time exhausted');
          return new Error('Retry time exhausted');
        }
        if (options.attempt > 3) { // Reduced retry attempts
          console.error('❌ Redis max retry attempts reached');
          return undefined;
        }
        return Math.min(options.attempt * 100, 1000);
      }
    });

    client.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    client.on('error', (err) => {
      console.error('❌ Redis connection error:', err.message);
    });

    client.on('ready', () => {
      console.log('✅ Redis ready to accept commands');
    });

    client.on('end', () => {
      console.log('🔌 Redis connection ended');
    });

    // Connect to Redis with timeout
    const connectPromise = client.connect();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Redis connection timeout')), 5000);
    });
    
    await Promise.race([connectPromise, timeoutPromise]);

  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
    client = null; // Reset client on failure
    // Don't exit process for Redis failures in development
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

const getRedisClient = () => {
  if (!client) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return client;
};

// Helper functions for common Redis operations
const setCache = async (key, value, expireInSeconds = 3600) => {
  try {
    if (!client) return false;
    await client.setEx(key, expireInSeconds, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('❌ Redis set error:', error.message);
    return false;
  }
};

const getCache = async (key) => {
  try {
    if (!client) return null;
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('❌ Redis get error:', error.message);
    return null;
  }
};

const deleteCache = async (key) => {
  try {
    if (!client) return false;
    await client.del(key);
    return true;
  } catch (error) {
    console.error('❌ Redis delete error:', error.message);
    return false;
  }
};

const flushCache = async () => {
  try {
    if (!client) return false;
    await client.flushDb();
    return true;
  } catch (error) {
    console.error('❌ Redis flush error:', error.message);
    return false;
  }
};

module.exports = {
  connectRedis,
  getRedisClient,
  setCache,
  getCache,
  deleteCache,
  flushCache,
  get client() {
    return client;
  }
};