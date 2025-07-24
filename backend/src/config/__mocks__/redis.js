// Mock Redis for testing
const mockClient = {
  connect: jest.fn().mockResolvedValue(true),
  quit: jest.fn().mockResolvedValue(true),
  ping: jest.fn().mockResolvedValue('PONG'),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  setEx: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  flushDb: jest.fn().mockResolvedValue('OK')
};

const connectRedis = jest.fn().mockResolvedValue(true);
const getRedisClient = jest.fn().mockReturnValue(mockClient);
const setCache = jest.fn().mockResolvedValue(true);
const getCache = jest.fn().mockResolvedValue(null);
const deleteCache = jest.fn().mockResolvedValue(true);
const flushCache = jest.fn().mockResolvedValue(true);

module.exports = {
  connectRedis,
  getRedisClient,
  setCache,
  getCache,
  deleteCache,
  flushCache,
  get client() {
    return mockClient;
  }
};