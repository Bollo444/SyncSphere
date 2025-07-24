const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedClients = new Map();
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: [process.env.FRONTEND_URL || "http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        logger.info('WebSocket authentication attempt from:', socket.handshake.address);
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          logger.warn('WebSocket authentication failed: No token provided');
          return next(new Error('Authentication error: No token provided'));
        }

        logger.info('WebSocket token received, verifying...');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        
        if (!user) {
          logger.warn('WebSocket authentication failed: User not found for ID:', decoded.id);
          return next(new Error('Authentication error: User not found'));
        }

        logger.info('WebSocket authentication successful for user:', user.email);
        socket.userId = user.id;
        socket.user = user;
        next();
      } catch (error) {
        logger.error('WebSocket authentication error:', error.message);
        next(new Error(`Authentication error: ${error.message}`));
      }
    });

    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    logger.info('WebSocket service initialized');
  }

  handleConnection(socket) {
    const userId = socket.userId;
    logger.info(`User ${userId} connected via WebSocket`);

    // Store client connection
    this.connectedClients.set(userId, socket);

    // Handle heartbeat
    socket.on('heartbeat', () => {
      socket.emit('heartbeat_ack', { timestamp: Date.now() });
    });

    // Handle subscription to updates
    socket.on('subscribe_recovery_updates', (data) => {
      socket.join(`recovery_${data.sessionId}`);
      logger.info(`User ${userId} subscribed to recovery updates for session ${data.sessionId}`);
    });

    socket.on('subscribe_transfer_updates', (data) => {
      socket.join(`transfer_${data.sessionId}`);
      logger.info(`User ${userId} subscribed to transfer updates for session ${data.sessionId}`);
    });

    socket.on('subscribe_device_status', (data) => {
      socket.join(`device_${data.deviceId}`);
      logger.info(`User ${userId} subscribed to device status for device ${data.deviceId}`);
    });

    socket.on('subscribe_notifications', () => {
      socket.join(`user_${userId}`);
      logger.info(`User ${userId} subscribed to notifications`);
    });

    socket.on('subscribe_system_alerts', () => {
      if (socket.user.role === 'admin') {
        socket.join('system_alerts');
        logger.info(`Admin ${userId} subscribed to system alerts`);
      }
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info(`User ${userId} disconnected: ${reason}`);
      this.connectedClients.delete(userId);
    });

    // Send connection confirmation
    socket.emit('connected', {
      message: 'Connected to SyncSphere WebSocket server',
      timestamp: Date.now(),
      userId: userId
    });
  }

  // Emit recovery progress updates
  emitRecoveryProgress(sessionId, progressData) {
    if (this.io) {
      this.io.to(`recovery_${sessionId}`).emit('recovery_progress', {
        sessionId,
        ...progressData,
        timestamp: Date.now()
      });
    }
  }

  // Emit transfer progress updates
  emitTransferProgress(sessionId, progressData) {
    if (this.io) {
      this.io.to(`transfer_${sessionId}`).emit('transfer_progress', {
        sessionId,
        ...progressData,
        timestamp: Date.now()
      });
    }
  }

  // Emit device status updates
  emitDeviceStatus(deviceId, statusData) {
    if (this.io) {
      this.io.to(`device_${deviceId}`).emit('device_status', {
        deviceId,
        ...statusData,
        timestamp: Date.now()
      });
    }
  }

  // Emit notifications to specific user
  emitNotification(userId, notification) {
    if (this.io) {
      this.io.to(`user_${userId}`).emit('notification', {
        ...notification,
        timestamp: Date.now()
      });
    }
  }

  // Emit system alerts to admins
  emitSystemAlert(alertData) {
    if (this.io) {
      this.io.to('system_alerts').emit('system_alert', {
        ...alertData,
        timestamp: Date.now()
      });
    }
  }

  // Get connected clients count
  getConnectedClientsCount() {
    return this.connectedClients.size;
  }

  // Check if user is connected
  isUserConnected(userId) {
    return this.connectedClients.has(userId);
  }

  // Disconnect user
  disconnectUser(userId) {
    const socket = this.connectedClients.get(userId);
    if (socket) {
      socket.disconnect();
      this.connectedClients.delete(userId);
    }
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

module.exports = websocketService;