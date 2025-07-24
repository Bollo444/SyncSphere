const mongoose = require('mongoose');

const advancedSessionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  deviceId: {
    type: String,
    required: true,
    index: true
  },
  serviceType: {
    type: String,
    required: true,
    enum: ['screen_unlock', 'system_repair', 'data_eraser', 'frp_bypass', 'icloud_bypass'],
    index: true
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'running', 'paused', 'completed', 'failed', 'cancelled', 'stopped', 'scanning', 'analyzing', 'recovering', 'preparing', 'erasing'],
    default: 'pending'
  },
  // Screen Unlock specific fields
  unlockMethod: {
    type: String,
    enum: [
      'pattern', 'pin', 'password', 'fingerprint', 'face', 'bypass',
      'pin_bruteforce', 'pattern_analysis', 'password_dictionary',
      'fingerprint_bypass', 'face_bypass', 'smart_unlock'
    ]
  },
  // Bypass specific fields
  bypassMethod: {
    type: String,
    enum: [
      // FRP Bypass methods
      'samsung_frp_bypass', 'lg_frp_bypass', 'huawei_frp_bypass', 'xiaomi_frp_bypass',
      'oppo_frp_bypass', 'vivo_frp_bypass', 'oneplus_frp_bypass', 'generic_android_frp',
      'adb_frp_bypass', 'fastboot_frp_bypass', 'odin_frp_bypass',
      // iCloud Bypass methods
      'checkra1n_bypass', 'unc0ver_bypass', 'palera1n_bypass', 'icloud_dns_bypass',
      'activation_lock_bypass', 'generic_ios_bypass'
    ]
  },
  // System Repair specific fields
  repairType: {
    type: String,
    enum: [
      'boot_repair', 'system_restore', 'registry_fix', 'driver_repair', 'file_system_check',
      'ios_system_recovery', 'android_system_recovery', 'firmware_repair', 'bootloader_repair'
    ]
  },
  repairMode: {
    type: String,
    enum: ['standard', 'advanced', 'safe_mode'],
    default: 'standard'
  },
  preserveData: {
    type: Boolean,
    default: true
  },
  issues: [{
    type: String
  }],
  // Data Eraser specific fields
  erasureType: {
    type: String,
    enum: ['quick_erase', 'secure_erase', 'military_grade', 'custom_pattern']
  },
  eraseMethod: {
    type: String,
    enum: ['dod_5220_22_m', 'gutmann', 'random_overwrite', 'zero_fill', 'custom']
  },
  dataCategories: [{
    type: String,
    enum: ['photos', 'videos', 'documents', 'messages', 'contacts', 'apps', 'system', 'all']
  }],
  securityLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'military'],
    default: 'medium'
  },
  verifyErasure: {
    type: Boolean,
    default: true
  },
  // Common configuration options
  options: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
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
    currentPass: {
      type: Number,
      default: 0
    },
    totalPasses: {
      type: Number,
      default: 1
    },
    bytesProcessed: {
      type: Number,
      default: 0
    },
    totalBytes: {
      type: Number,
      default: 0
    },
    bytesErased: {
      type: Number,
      default: 0
    },
    estimatedTimeRemaining: {
      type: Number, // milliseconds
      default: null
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  // Session timing
  startedAt: {
    type: Date,
    default: Date.now
  },
  pausedAt: {
    type: Date
  },
  resumedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  // Diagnosis results (for system repair)
  diagnosis: {
    detectedIssues: [{
      issue: String,
      severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical']
      },
      description: String,
      fixable: Boolean
    }],
    systemHealth: {
      type: Number,
      min: 0,
      max: 100
    },
    recommendedActions: [String]
   },
   // Verification results (for data eraser)
   verification: {
     verified: Boolean,
     verificationMethod: {
       type: String,
       enum: ['forensic_scan', 'pattern_check', 'manual_verification']
     },
     dataRecoverable: Boolean,
     confidence: {
       type: Number,
       min: 0,
       max: 100
     },
     verifiedCategories: {
       type: mongoose.Schema.Types.Mixed
     }
   },
   // Results and logs
   result: {
    success: {
      type: Boolean
    },
    errorMessage: {
      type: String
    },
    details: {
      type: mongoose.Schema.Types.Mixed
    },
    // Screen unlock specific results
    unlockCode: {
      type: String
    },
    unlockPattern: {
      type: Array
    },
    // System repair specific results
    repairSummary: {
      type: String
    },
    issuesFound: {
      type: Array,
      default: []
    },
    issuesFixed: {
      type: Array,
      default: []
    },
    // Data eraser specific results
    erasureSummary: {
      type: String
    },
    passesCompleted: {
      type: Number
    },
    bytesErased: {
      type: Number
    },
    verificationPassed: {
      type: Boolean
    }
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
    userAgent: String,
    ipAddress: String,
    deviceInfo: {
      type: mongoose.Schema.Types.Mixed
    },
    sessionInfo: {
      type: mongoose.Schema.Types.Mixed
    }
  }
}, {
  timestamps: true,
  collection: 'advanced_sessions'
});

// Indexes for performance
advancedSessionSchema.index({ userId: 1, deviceId: 1 });
advancedSessionSchema.index({ serviceType: 1, status: 1 });
advancedSessionSchema.index({ startedAt: -1 });
advancedSessionSchema.index({ completedAt: -1 });

// Virtual for session duration
advancedSessionSchema.virtual('duration').get(function() {
  if (this.completedAt && this.startedAt) {
    return this.completedAt - this.startedAt;
  }
  if (this.startedAt) {
    return Date.now() - this.startedAt;
  }
  return null;
});

// Instance methods
advancedSessionSchema.methods.addLog = function(level, message, data = null) {
  this.logs.push({
    level,
    message,
    data,
    timestamp: new Date()
  });
  return this.save();
};

advancedSessionSchema.methods.updateProgress = function(progressData) {
  Object.assign(this.progress, progressData);
  return this.save();
};

advancedSessionSchema.methods.complete = function(success, result = {}) {
  this.status = success ? 'completed' : 'failed';
  this.completedAt = new Date();
  this.result = { success, ...result };
  return this.save();
};

// Static methods
advancedSessionSchema.statics.findActiveByUser = function(userId, serviceType = null) {
  const query = {
    userId,
    status: { $in: ['pending', 'running', 'paused'] }
  };
  if (serviceType) {
    query.serviceType = serviceType;
  }
  return this.find(query).sort({ startedAt: -1 });
};

advancedSessionSchema.statics.findByDevice = function(deviceId, serviceType = null) {
  const query = { deviceId };
  if (serviceType) {
    query.serviceType = serviceType;
  }
  return this.find(query).sort({ startedAt: -1 });
};

advancedSessionSchema.statics.getSessionStats = function(userId, timeframe = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeframe);
  
  return this.aggregate([
    {
      $match: {
        userId,
        startedAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$serviceType',
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
advancedSessionSchema.pre('save', function(next) {
  // Ensure progress percentage is within bounds
  if (this.progress && this.progress.percentage) {
    this.progress.percentage = Math.max(0, Math.min(100, this.progress.percentage));
  }
  
  // Auto-complete if progress reaches 100%
  if (this.progress && this.progress.percentage === 100 && this.status === 'running') {
    this.status = 'completed';
    this.completedAt = new Date();
  }
  
  next();
});

// Post-save middleware for logging
advancedSessionSchema.post('save', function(doc) {
  if (doc.isNew) {
    console.log(`Advanced session created: ${doc._id} (${doc.serviceType})`);
  }
});

module.exports = mongoose.model('AdvancedSession', advancedSessionSchema);