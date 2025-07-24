const mongoose = require('mongoose');

const recoverySessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true,
    index: true
  },
  recoveryType: {
    type: String,
    required: true,
    enum: [
      'deleted_files',
      'system_restore',
      'partition_recovery',
      'photo_recovery',
      'video_recovery',
      'document_recovery',
      'contact_recovery',
      'message_recovery',
      'app_data_recovery',
      'full_device_recovery'
    ],
    index: true
  },
  status: {
    type: String,
    required: true,
    enum: [
      'pending',
      'scanning',
      'analyzing',
      'recovering',
      'completed',
      'failed',
      'cancelled',
      'paused'
    ],
    default: 'pending',
    index: true
  },
  scanDepth: {
    type: String,
    enum: ['quick', 'deep', 'thorough'],
    default: 'quick'
  },
  fileTypes: [{
    type: String,
    enum: [
      'photos',
      'videos',
      'documents',
      'audio',
      'contacts',
      'messages',
      'call_logs',
      'app_data',
      'system_files',
      'all'
    ]
  }],
  // Progress tracking
  progress: {
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    currentPhase: {
      type: String,
      default: 'initializing'
    },
    filesScanned: {
      type: Number,
      default: 0
    },
    filesFound: {
      type: Number,
      default: 0
    },
    filesRecovered: {
      type: Number,
      default: 0
    },
    totalSize: {
      type: Number,
      default: 0
    },
    recoveredSize: {
      type: Number,
      default: 0
    },
    estimatedTimeRemaining: {
      type: Number // milliseconds
    }
  },
  // Legacy fields for backward compatibility
  filesFound: {
    type: Number,
    default: 0
  },
  filesRecovered: {
    type: Number,
    default: 0
  },
  // Scan results
  scanResults: {
    deletedFiles: [{
      path: String,
      name: String,
      size: Number,
      type: String,
      deletedAt: Date,
      recoverable: Boolean,
      confidence: Number // 0-100
    }],
    corruptedFiles: [{
      path: String,
      name: String,
      size: Number,
      type: String,
      corruptionLevel: String, // 'minor', 'moderate', 'severe'
      repairable: Boolean
    }],
    systemIssues: [{
      type: String,
      severity: String, // 'low', 'medium', 'high', 'critical'
      description: String,
      fixable: Boolean
    }]
  },
  // Recovery options and settings
  recoveryOptions: {
    outputPath: String,
    preserveStructure: {
      type: Boolean,
      default: true
    },
    overwriteExisting: {
      type: Boolean,
      default: false
    },
    verifyRecovery: {
      type: Boolean,
      default: true
    },
    createBackup: {
      type: Boolean,
      default: false
    }
  },
  // Selected items for recovery
  selectedItems: [{
    id: String,
    path: String,
    name: String,
    size: Number,
    type: String,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    }
  }],
  // Timing information
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  pausedAt: {
    type: Date
  },
  resumedAt: {
    type: Date
  },
  // Error handling
  errorMessage: {
    type: String
  },
  errorDetails: {
    type: mongoose.Schema.Types.Mixed
  },
  // Logs and events
  logs: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    level: {
      type: String,
      enum: ['info', 'warning', 'error', 'debug'],
      default: 'info'
    },
    message: {
      type: String,
      required: true
    },
    data: {
      type: mongoose.Schema.Types.Mixed
    }
  }],
  // Metadata
  metadata: {
    deviceInfo: {
      type: mongoose.Schema.Types.Mixed
    },
    scanSettings: {
      type: mongoose.Schema.Types.Mixed
    },
    userAgent: String,
    ipAddress: String
  }
}, {
  timestamps: true,
  collection: 'recovery_sessions'
});

// Indexes for performance
recoverySessionSchema.index({ userId: 1, status: 1 });
recoverySessionSchema.index({ deviceId: 1, status: 1 });
recoverySessionSchema.index({ recoveryType: 1, status: 1 });
recoverySessionSchema.index({ startedAt: -1 });
recoverySessionSchema.index({ completedAt: -1 });

// Virtual for session duration
recoverySessionSchema.virtual('duration').get(function() {
  if (this.completedAt && this.startedAt) {
    return this.completedAt - this.startedAt;
  }
  if (this.startedAt) {
    return Date.now() - this.startedAt;
  }
  return null;
});

// Virtual for recovery rate
recoverySessionSchema.virtual('recoveryRate').get(function() {
  if (this.filesFound > 0) {
    return (this.filesRecovered / this.filesFound) * 100;
  }
  return 0;
});

// Instance methods
recoverySessionSchema.methods.addLog = function(level, message, data = null) {
  this.logs.push({
    level,
    message,
    data,
    timestamp: new Date()
  });
  return this.save();
};

recoverySessionSchema.methods.updateProgress = function(progressData) {
  Object.assign(this.progress, progressData);
  
  // Update legacy fields for backward compatibility
  if (progressData.filesFound !== undefined) {
    this.filesFound = progressData.filesFound;
  }
  if (progressData.filesRecovered !== undefined) {
    this.filesRecovered = progressData.filesRecovered;
  }
  
  return this.save();
};

recoverySessionSchema.methods.markAsCompleted = function(result = {}) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.progress.percentage = 100;
  
  if (result.filesRecovered !== undefined) {
    this.filesRecovered = result.filesRecovered;
    this.progress.filesRecovered = result.filesRecovered;
  }
  
  return this.save();
};

recoverySessionSchema.methods.markAsFailed = function(errorMessage, errorDetails = null) {
  this.status = 'failed';
  this.completedAt = new Date();
  this.errorMessage = errorMessage;
  if (errorDetails) {
    this.errorDetails = errorDetails;
  }
  return this.save();
};

recoverySessionSchema.methods.pause = function() {
  if (this.status === 'scanning' || this.status === 'recovering') {
    this.status = 'paused';
    this.pausedAt = new Date();
    return this.save();
  }
  throw new Error('Can only pause active sessions');
};

recoverySessionSchema.methods.resume = function() {
  if (this.status === 'paused') {
    this.status = this.progress.percentage === 0 ? 'scanning' : 'recovering';
    this.resumedAt = new Date();
    return this.save();
  }
  throw new Error('Can only resume paused sessions');
};

// Static methods
recoverySessionSchema.statics.findByUser = function(userId, options = {}) {
  const query = { userId };
  
  if (options.status) {
    query.status = options.status;
  }
  if (options.recoveryType) {
    query.recoveryType = options.recoveryType;
  }
  if (options.deviceId) {
    query.deviceId = options.deviceId;
  }
  
  return this.find(query)
    .populate('deviceId', 'deviceName deviceType')
    .sort({ startedAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

recoverySessionSchema.statics.findActiveByUser = function(userId) {
  return this.find({
    userId,
    status: { $in: ['pending', 'scanning', 'analyzing', 'recovering', 'paused'] }
  }).populate('deviceId', 'deviceName deviceType');
};

recoverySessionSchema.statics.getSessionStats = function(userId, timeframe = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeframe);
  
  return this.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        startedAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$recoveryType',
        total: { $sum: 1 },
        completed: {
          $sum: {
            $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
          }
        },
        failed: {
          $sum: {
            $cond: [{ $eq: ['$status', 'failed'] }, 1, 0]
          }
        },
        totalFilesRecovered: { $sum: '$filesRecovered' },
        avgRecoveryRate: { $avg: '$recoveryRate' },
        avgDuration: {
          $avg: {
            $cond: [
              { $and: ['$startedAt', '$completedAt'] },
              { $subtract: ['$completedAt', '$startedAt'] },
              null
            ]
          }
        }
      }
    }
  ]);
};

// Pre-save middleware
recoverySessionSchema.pre('save', function(next) {
  // Ensure progress percentage is within bounds
  if (this.progress && this.progress.percentage) {
    this.progress.percentage = Math.max(0, Math.min(100, this.progress.percentage));
  }
  
  // Auto-complete if progress reaches 100%
  if (this.progress && this.progress.percentage === 100 && this.status === 'recovering') {
    this.status = 'completed';
    this.completedAt = new Date();
  }
  
  // Update legacy fields
  if (this.progress) {
    if (this.progress.filesFound !== undefined) {
      this.filesFound = this.progress.filesFound;
    }
    if (this.progress.filesRecovered !== undefined) {
      this.filesRecovered = this.progress.filesRecovered;
    }
  }
  
  next();
});

// Post-save middleware for logging
recoverySessionSchema.post('save', function(doc) {
  if (doc.isNew) {
    console.log(`Recovery session created: ${doc._id} (${doc.recoveryType})`);
  }
});

module.exports = mongoose.model('RecoverySession', recoverySessionSchema);