const fs = require('fs');
const path = require('path');

/**
 * Logger utility for SyncSphere application
 * Provides structured logging with different levels and output formats
 */
class Logger {
  constructor() {
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
    
    this.colors = {
      error: '\x1b[31m', // Red
      warn: '\x1b[33m',  // Yellow
      info: '\x1b[36m',  // Cyan
      debug: '\x1b[37m', // White
      reset: '\x1b[0m'   // Reset
    };
    
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.logFile = process.env.LOG_FILE || path.join(process.cwd(), 'logs', 'app.log');
    this.maxFileSize = this.parseSize(process.env.LOG_MAX_SIZE || '10MB');
    this.maxFiles = parseInt(process.env.LOG_MAX_FILES || '5');
    
    this.ensureLogDirectory();
  }

  /**
   * Parse file size string to bytes
   * @param {string} size - Size string (e.g., '10MB', '1GB')
   * @returns {number} Size in bytes
   */
  parseSize(size) {
    const units = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
    const match = size.match(/^(\d+)(\w+)$/);
    if (!match) return 10 * 1024 * 1024; // Default 10MB
    return parseInt(match[1]) * (units[match[2]] || 1);
  }

  /**
   * Ensure log directory exists
   */
  ensureLogDirectory() {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * Check if log level should be logged
   * @param {string} level - Log level to check
   * @returns {boolean} Whether to log this level
   */
  shouldLog(level) {
    return this.levels[level] <= this.levels[this.logLevel];
  }

  /**
   * Format log message
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   * @returns {Object} Formatted log object
   */
  formatMessage(level, message, meta = {}) {
    return {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      ...meta,
      pid: process.pid,
      hostname: require('os').hostname()
    };
  }

  /**
   * Write log to console with colors
   * @param {string} level - Log level
   * @param {Object} logObj - Log object
   */
  writeToConsole(level, logObj) {
    const color = this.colors[level] || this.colors.reset;
    const timestamp = logObj.timestamp.replace('T', ' ').replace('Z', '');
    
    let output = `${color}[${timestamp}] ${logObj.level}${this.colors.reset}: ${logObj.message}`;
    
    // Add metadata if present
    const metaKeys = Object.keys(logObj).filter(key => 
      !['timestamp', 'level', 'message', 'pid', 'hostname'].includes(key)
    );
    
    if (metaKeys.length > 0) {
      const meta = {};
      metaKeys.forEach(key => meta[key] = logObj[key]);
      output += ` ${JSON.stringify(meta)}`;
    }
    
    console.log(output);
  }

  /**
   * Write log to file
   * @param {Object} logObj - Log object
   */
  async writeToFile(logObj) {
    try {
      // Check file size and rotate if necessary
      await this.rotateLogIfNeeded();
      
      const logLine = JSON.stringify(logObj) + '\n';
      fs.appendFileSync(this.logFile, logLine);
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }

  /**
   * Rotate log file if it exceeds max size
   */
  async rotateLogIfNeeded() {
    try {
      if (!fs.existsSync(this.logFile)) return;
      
      const stats = fs.statSync(this.logFile);
      if (stats.size < this.maxFileSize) return;
      
      // Rotate existing files
      for (let i = this.maxFiles - 1; i > 0; i--) {
        const oldFile = `${this.logFile}.${i}`;
        const newFile = `${this.logFile}.${i + 1}`;
        
        if (fs.existsSync(oldFile)) {
          if (i === this.maxFiles - 1) {
            fs.unlinkSync(oldFile); // Delete oldest file
          } else {
            fs.renameSync(oldFile, newFile);
          }
        }
      }
      
      // Move current log to .1
      fs.renameSync(this.logFile, `${this.logFile}.1`);
    } catch (error) {
      console.error('Failed to rotate log file:', error.message);
    }
  }

  /**
   * Core logging method
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  log(level, message, meta = {}) {
    if (!this.shouldLog(level)) return;
    
    const logObj = this.formatMessage(level, message, meta);
    
    // Write to console in development
    if (process.env.NODE_ENV !== 'production') {
      this.writeToConsole(level, logObj);
    }
    
    // Always write to file
    this.writeToFile(logObj);
  }

  /**
   * Log error message
   * @param {string} message - Error message
   * @param {Object} meta - Additional metadata
   */
  error(message, meta = {}) {
    // If meta is an Error object, extract useful properties
    if (meta instanceof Error) {
      meta = {
        error: meta.message,
        stack: meta.stack,
        name: meta.name,
        ...meta
      };
    }
    this.log('error', message, meta);
  }

  /**
   * Log warning message
   * @param {string} message - Warning message
   * @param {Object} meta - Additional metadata
   */
  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  /**
   * Log info message
   * @param {string} message - Info message
   * @param {Object} meta - Additional metadata
   */
  info(message, meta = {}) {
    this.log('info', message, meta);
  }

  /**
   * Log debug message
   * @param {string} message - Debug message
   * @param {Object} meta - Additional metadata
   */
  debug(message, meta = {}) {
    this.log('debug', message, meta);
  }

  /**
   * Log HTTP request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {number} duration - Request duration in ms
   */
  request(req, res, duration) {
    const meta = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.id
    };
    
    const level = res.statusCode >= 400 ? 'warn' : 'info';
    this.log(level, `${req.method} ${req.originalUrl} ${res.statusCode}`, meta);
  }

  /**
   * Log database query
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @param {number} duration - Query duration in ms
   */
  query(query, params = [], duration) {
    const meta = {
      query: query.replace(/\s+/g, ' ').trim(),
      params: params.length > 0 ? params : undefined,
      duration: `${duration}ms`
    };
    
    this.debug('Database query executed', meta);
  }

  /**
   * Log authentication event
   * @param {string} event - Auth event type
   * @param {string} userId - User ID
   * @param {Object} meta - Additional metadata
   */
  auth(event, userId, meta = {}) {
    this.info(`Auth: ${event}`, { userId, ...meta });
  }

  /**
   * Log business event
   * @param {string} event - Business event type
   * @param {Object} data - Event data
   */
  business(event, data = {}) {
    this.info(`Business: ${event}`, data);
  }

  /**
   * Log security event
   * @param {string} event - Security event type
   * @param {Object} data - Event data
   */
  security(event, data = {}) {
    this.warn(`Security: ${event}`, data);
  }

  /**
   * Create child logger with additional context
   * @param {Object} context - Additional context to include in all logs
   * @returns {Object} Child logger
   */
  child(context = {}) {
    const parent = this;
    
    return {
      error: (message, meta = {}) => parent.error(message, { ...context, ...meta }),
      warn: (message, meta = {}) => parent.warn(message, { ...context, ...meta }),
      info: (message, meta = {}) => parent.info(message, { ...context, ...meta }),
      debug: (message, meta = {}) => parent.debug(message, { ...context, ...meta }),
      request: (req, res, duration) => parent.request(req, res, duration),
      query: (query, params, duration) => parent.query(query, params, duration),
      auth: (event, userId, meta = {}) => parent.auth(event, userId, { ...context, ...meta }),
      business: (event, data = {}) => parent.business(event, { ...context, ...data }),
      security: (event, data = {}) => parent.security(event, { ...context, ...data })
    };
  }
}

// Create singleton instance
const logger = new Logger();

module.exports = logger;