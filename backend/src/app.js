const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const recoveryRoutes = require('./routes/recoveryRoutes');
const dataRecoveryRoutes = require('./routes/dataRecoveryRoutes');
const transferRoutes = require('./routes/transferRoutes');
const phoneTransferRoutes = require('./routes/phoneTransferRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const fileRoutes = require('./routes/fileRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const backupRoutes = require('./routes/backupRoutes');
const healthRoutes = require('./routes/healthRoutes');
const advancedRoutes = require('./routes/advancedRoutes');

const app = express();

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174'
    ],
    credentials: true
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Logging
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'SyncSphere API',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Health check routes
app.use('/health', healthRoutes);

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/devices', deviceRoutes);
app.use('/api/v1/recovery', recoveryRoutes);
app.use('/api/v1/data-recovery', dataRecoveryRoutes);
app.use('/api/v1/transfer', transferRoutes);
app.use('/api/v1/phone-transfer', phoneTransferRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/files', fileRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/backups', backupRoutes);
app.use('/api/advanced', advancedRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

module.exports = app;
