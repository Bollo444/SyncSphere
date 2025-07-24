const app = require('./app');
const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const AnalyticsService = require('./services/analyticsService');
const backupService = require('./services/backupService');
const notificationService = require('./services/notificationService');
const PhoneTransfer = require('./models/PhoneTransfer');
const websocketService = require('./services/websocketService');
const { createServer } = require('http');

const PORT = process.env.PORT || 5000;

// Initialize application
async function initializeApp() {
  try {
    // Connect to databases
    await connectDB();
    await connectRedis();

    // Initialize services
    await AnalyticsService.initializeTables();
    await backupService.initializeTables();
    await notificationService.initializeTables();
    await PhoneTransfer.createTable();

    console.log('✅ All services initialized successfully');

    // Create HTTP server
    const httpServer = createServer(app);
    
    // Initialize WebSocket service
    websocketService.initialize(httpServer);

    // Start server
    const server = httpServer.listen(PORT, () => {
      console.log(`🚀 SyncSphere API Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Database: Connected`);
      console.log(`🔴 Redis: Connected`);
      console.log(`🔌 WebSocket: Initialized`);
    });

    return server;
  } catch (error) {
    console.error('❌ Failed to initialize application:', error);
    process.exit(1);
  }
}

// Initialize and start the application
let server;
initializeApp().then((serverInstance) => {
  server = serverInstance;
}).catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  if (server) {
    server.close(() => {
      console.log('Process terminated');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  if (server) {
    server.close(() => {
      console.log('Process terminated');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

module.exports = { app };

