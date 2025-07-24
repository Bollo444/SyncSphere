const express = require('express');
const { query, pool, usingSQLite, sqliteDb } = require('../config/database');

const router = express.Router();

/**
 * Basic health check endpoint
 */
router.get('/', async (req, res) => {
  try {
    const healthStatus = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'SyncSphere API',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime()
    };

    res.status(200).json(healthStatus);
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * Database health check endpoint
 */
router.get('/database', async (req, res) => {
  try {
    const startTime = Date.now();

    // Test database connection
    const testResult = await query('SELECT version(), current_database(), current_user, now()');
    const queryTime = Date.now() - startTime;

    const dbInfo = testResult.rows[0];

    // Get connection pool info (if using PostgreSQL)
    let poolInfo = null;
    if (!usingSQLite && pool) {
      poolInfo = {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
      };
    }

    // Get database statistics
    let dbStats = null;
    try {
      if (!usingSQLite) {
        const sizeResult = await query(
          'SELECT pg_size_pretty(pg_database_size(current_database())) as size'
        );
        const tableCountResult = await query(
          "SELECT count(*) as count FROM information_schema.tables WHERE table_schema = 'public'"
        );

        dbStats = {
          size: sizeResult.rows[0].size,
          tableCount: parseInt(tableCountResult.rows[0].count)
        };
      } else {
        // SQLite stats
        const tableCountResult = await query(
          "SELECT count(*) as count FROM sqlite_master WHERE type='table'"
        );
        dbStats = {
          size: 'N/A (SQLite)',
          tableCount: parseInt(tableCountResult.rows[0].count)
        };
      }
    } catch (statsError) {
      console.warn('Could not gather database statistics:', statsError.message);
    }

    const healthStatus = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: {
        type: usingSQLite ? 'SQLite' : 'PostgreSQL',
        connected: true,
        database: dbInfo.current_database,
        user: dbInfo.current_user,
        version: dbInfo.version,
        serverTime: dbInfo.now,
        queryTime: `${queryTime}ms`,
        pool: poolInfo,
        statistics: dbStats
      }
    };

    res.status(200).json(healthStatus);
  } catch (error) {
    console.error('Database health check failed:', error);

    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      database: {
        type: usingSQLite ? 'SQLite' : 'PostgreSQL',
        connected: false,
        error: error.message,
        code: error.code
      }
    });
  }
});

/**
 * Detailed system health check
 */
router.get('/system', async (req, res) => {
  try {
    const startTime = Date.now();

    // Memory usage
    const memUsage = process.memoryUsage();

    // CPU usage (approximate)
    const cpuUsage = process.cpuUsage();

    // Database test
    let databaseHealth = { connected: false };
    try {
      const dbTest = await query('SELECT 1');
      databaseHealth = {
        connected: true,
        type: usingSQLite ? 'SQLite' : 'PostgreSQL',
        queryTime: Date.now() - startTime
      };
    } catch (dbError) {
      databaseHealth = {
        connected: false,
        error: dbError.message
      };
    }

    // Redis test (if configured)
    let redisHealth = { configured: false };
    try {
      const redis = require('../config/redis');
      if (redis && redis.ping) {
        await redis.ping();
        redisHealth = { configured: true, connected: true };
      }
    } catch (redisError) {
      redisHealth = {
        configured: true,
        connected: false,
        error: redisError.message
      };
    }

    const systemHealth = {
      status: databaseHealth.connected ? 'OK' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
        memory: {
          rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
          external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        }
      },
      services: {
        database: databaseHealth,
        redis: redisHealth
      }
    };

    const statusCode = databaseHealth.connected ? 200 : 503;
    res.status(statusCode).json(systemHealth);
  } catch (error) {
    console.error('System health check failed:', error);

    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * Database schema validation endpoint
 */
router.get('/schema', async (req, res) => {
  try {
    const requiredTables = [
      'users',
      'devices',
      'data_transfers',
      'subscriptions',
      'user_activity_logs',
      'device_activity_logs',
      'data_recovery_sessions',
      'api_keys',
      'system_settings',
      'file_uploads'
    ];

    const requiredViews = ['active_user_devices', 'user_statistics'];

    const tableResults = [];
    const viewResults = [];

    // Check tables
    for (const table of requiredTables) {
      try {
        const result = await query('SELECT to_regclass($1) as exists', [table]);
        tableResults.push({
          name: table,
          exists: !!result.rows[0].exists,
          type: 'table'
        });
      } catch (error) {
        tableResults.push({
          name: table,
          exists: false,
          type: 'table',
          error: error.message
        });
      }
    }

    // Check views
    for (const view of requiredViews) {
      try {
        const result = await query('SELECT to_regclass($1) as exists', [view]);
        viewResults.push({
          name: view,
          exists: !!result.rows[0].exists,
          type: 'view'
        });
      } catch (error) {
        viewResults.push({
          name: view,
          exists: false,
          type: 'view',
          error: error.message
        });
      }
    }

    const allObjects = [...tableResults, ...viewResults];
    const missingObjects = allObjects.filter(obj => !obj.exists);
    const isValid = missingObjects.length === 0;

    const schemaHealth = {
      status: isValid ? 'OK' : 'INVALID',
      timestamp: new Date().toISOString(),
      schema: {
        valid: isValid,
        totalObjects: allObjects.length,
        existingObjects: allObjects.filter(obj => obj.exists).length,
        missingObjects: missingObjects.length,
        objects: allObjects,
        missing: missingObjects
      }
    };

    const statusCode = isValid ? 200 : 503;
    res.status(statusCode).json(schemaHealth);
  } catch (error) {
    console.error('Schema validation failed:', error);

    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

module.exports = router;
