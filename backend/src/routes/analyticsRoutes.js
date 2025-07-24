const express = require('express');
const AnalyticsService = require('../services/analyticsService');
const authMiddleware = require('../middleware/authMiddleware');
const validationMiddleware = require('../middleware/validationMiddleware');
const AppError = require('../utils/AppError');
const { query, body } = require('express-validator');

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware.protect);

// Get user's own activity analytics
router.get('/user/activity', [
  query('start_date').optional().isISO8601().withMessage('Invalid start date format'),
  query('end_date').optional().isISO8601().withMessage('Invalid end date format'),
  query('activity_types').optional().isString().withMessage('Activity types must be a string')
], validationMiddleware.handleValidationErrors, async (req, res, next) => {
  try {
    const {
      start_date,
      end_date,
      activity_types
    } = req.query;

    const options = {};
    
    if (start_date) {
      options.startDate = new Date(start_date);
    }
    
    if (end_date) {
      options.endDate = new Date(end_date);
    }
    
    if (activity_types) {
      options.activityTypes = activity_types.split(',').map(type => type.trim());
    }

    const analytics = await AnalyticsService.getUserActivityAnalytics(req.user.id, options);

    // Calculate summary statistics
    const summary = {};
    let totalActivities = 0;
    
    Object.keys(analytics).forEach(activityType => {
      const typeTotal = analytics[activityType].reduce((sum, day) => sum + day.count, 0);
      summary[activityType] = {
        total: typeTotal,
        daily_average: Math.round(typeTotal / analytics[activityType].length || 0)
      };
      totalActivities += typeTotal;
    });

    res.json({
      success: true,
      data: {
        analytics,
        summary: {
          ...summary,
          total_activities: totalActivities
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Track user activity (for client-side tracking)
router.post('/user/activity', [
  body('activity_type').isString().isLength({ min: 1, max: 50 }).withMessage('Activity type is required and must be 1-50 characters'),
  body('activity_data').optional().isObject().withMessage('Activity data must be an object'),
  body('session_id').optional().isString().withMessage('Session ID must be a string')
], validationMiddleware.handleValidationErrors, async (req, res, next) => {
  try {
    const {
      activity_type,
      activity_data = {},
      session_id
    } = req.body;

    const metadata = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: session_id
    };

    const activityId = await AnalyticsService.trackUserActivity(
      req.user.id,
      activity_type,
      activity_data,
      metadata
    );

    // Update real-time active users
    await AnalyticsService.updateActiveUsers(req.user.id);

    res.status(201).json({
      success: true,
      message: 'Activity tracked successfully',
      data: {
        activity_id: activityId
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get real-time metrics (for dashboard widgets)
router.get('/realtime', async (req, res, next) => {
  try {
    const metrics = await AnalyticsService.getRealTimeMetrics();

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    next(error);
  }
});

// Get user dashboard stats
router.get('/dashboard', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { pool } = require('../config/database');
    
    // Get user's basic stats
    const userStatsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM data_recovery_sessions WHERE user_id = $1) as recovery_sessions,
        (SELECT COUNT(*) FROM phone_transfers WHERE user_id = $1) as phone_transfers,
        (SELECT COUNT(*) FROM devices WHERE user_id = $1) as devices_count,
        (SELECT COALESCE(SUM(CAST(metadata->>'size' AS BIGINT)), 0) FROM data_recovery_sessions WHERE user_id = $1 AND status = 'completed') as total_recovered_data,
        (SELECT COUNT(*) FROM user_activities WHERE user_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '7 days') as recent_activities
    `;
    
    const userStatsResult = await pool.query(userStatsQuery, [userId]);
    const userStats = userStatsResult.rows[0];
    
    // Get recent activities
    const recentActivitiesQuery = `
      SELECT 
        activity_type as type,
        activity_type as description,
        'completed' as status,
        created_at as timestamp,
        activity_data->>'device_name' as device
      FROM user_activities 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    
    const recentActivitiesResult = await pool.query(recentActivitiesQuery, [userId]);
    const recentActivities = recentActivitiesResult.rows.map(activity => ({
      id: `${activity.type}_${Date.parse(activity.timestamp)}`,
      type: activity.type,
      description: activity.description,
      status: activity.status,
      timestamp: activity.timestamp,
      device: activity.device
    }));
    
    // Get user's storage usage (if available)
    const storageUsed = parseInt(userStats.total_recovered_data) || 0;
    
    const dashboardData = {
      recoverySessionsCount: parseInt(userStats.recovery_sessions) || 0,
      phoneTransfersCount: parseInt(userStats.phone_transfers) || 0,
      devicesCount: parseInt(userStats.devices_count) || 0,
      storageUsed: storageUsed,
      recentActivitiesCount: parseInt(userStats.recent_activities) || 0,
      recentActivities: recentActivities
    };

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    next(error);
  }
});

// Admin routes (require admin role)
router.use('/admin', authMiddleware.authorize('admin'));

// Get system performance analytics (admin)
router.get('/admin/performance', [
  query('start_date').optional().isISO8601().withMessage('Invalid start date format'),
  query('end_date').optional().isISO8601().withMessage('Invalid end date format'),
  query('endpoint').optional().isString().withMessage('Endpoint must be a string')
], validationMiddleware.handleValidationErrors, async (req, res, next) => {
  try {
    const {
      start_date,
      end_date,
      endpoint
    } = req.query;

    const options = {};
    
    if (start_date) {
      options.startDate = new Date(start_date);
    }
    
    if (end_date) {
      options.endDate = new Date(end_date);
    }
    
    if (endpoint) {
      options.endpoint = endpoint;
    }

    const analytics = await AnalyticsService.getSystemPerformanceAnalytics(options);

    // Calculate overall statistics
    const totalRequests = analytics.reduce((sum, endpoint) => sum + endpoint.request_count, 0);
    const totalErrors = analytics.reduce((sum, endpoint) => sum + endpoint.error_count, 0);
    const avgResponseTime = analytics.length > 0 
      ? Math.round(analytics.reduce((sum, endpoint) => sum + endpoint.avg_response_time, 0) / analytics.length)
      : 0;

    res.json({
      success: true,
      data: {
        endpoints: analytics,
        summary: {
          total_requests: totalRequests,
          total_errors: totalErrors,
          overall_error_rate: totalRequests > 0 ? parseFloat((totalErrors / totalRequests * 100).toFixed(2)) : 0,
          average_response_time: avgResponseTime
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get business metrics dashboard (admin)
router.get('/admin/business', [
  query('start_date').optional().isISO8601().withMessage('Invalid start date format'),
  query('end_date').optional().isISO8601().withMessage('Invalid end date format'),
  query('metric_types').optional().isString().withMessage('Metric types must be a string')
], validationMiddleware.handleValidationErrors, async (req, res, next) => {
  try {
    const {
      start_date,
      end_date,
      metric_types
    } = req.query;

    const options = {};
    
    if (start_date) {
      options.startDate = new Date(start_date);
    }
    
    if (end_date) {
      options.endDate = new Date(end_date);
    }
    
    if (metric_types) {
      options.metricTypes = metric_types.split(',').map(type => type.trim());
    }

    const dashboard = await AnalyticsService.getBusinessMetricsDashboard(options);

    // Calculate growth rates and trends
    const summary = {};
    Object.keys(dashboard).forEach(metricType => {
      const data = dashboard[metricType];
      if (data.length >= 2) {
        const latest = data[0].value;
        const previous = data[1].value;
        const growthRate = previous > 0 ? ((latest - previous) / previous * 100) : 0;
        
        summary[metricType] = {
          current_value: latest,
          previous_value: previous,
          growth_rate: parseFloat(growthRate.toFixed(2)),
          trend: growthRate > 0 ? 'up' : growthRate < 0 ? 'down' : 'stable'
        };
      } else if (data.length === 1) {
        summary[metricType] = {
          current_value: data[0].value,
          previous_value: 0,
          growth_rate: 0,
          trend: 'stable'
        };
      }
    });

    res.json({
      success: true,
      data: {
        metrics: dashboard,
        summary
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get error analytics (admin)
router.get('/admin/errors', [
  query('start_date').optional().isISO8601().withMessage('Invalid start date format'),
  query('end_date').optional().isISO8601().withMessage('Invalid end date format'),
  query('error_type').optional().isString().withMessage('Error type must be a string')
], validationMiddleware.handleValidationErrors, async (req, res, next) => {
  try {
    const {
      start_date,
      end_date,
      error_type
    } = req.query;

    const options = {};
    
    if (start_date) {
      options.startDate = new Date(start_date);
    }
    
    if (end_date) {
      options.endDate = new Date(end_date);
    }
    
    if (error_type) {
      options.errorType = error_type;
    }

    const analytics = await AnalyticsService.getErrorAnalytics(options);

    // Group by error type for summary
    const errorTypeSummary = {};
    analytics.forEach(error => {
      if (!errorTypeSummary[error.error_type]) {
        errorTypeSummary[error.error_type] = {
          total_occurrences: 0,
          unique_messages: 0,
          last_occurrence: null
        };
      }
      
      errorTypeSummary[error.error_type].total_occurrences += error.occurrence_count;
      errorTypeSummary[error.error_type].unique_messages += 1;
      
      if (!errorTypeSummary[error.error_type].last_occurrence || 
          new Date(error.last_occurrence) > new Date(errorTypeSummary[error.error_type].last_occurrence)) {
        errorTypeSummary[error.error_type].last_occurrence = error.last_occurrence;
      }
    });

    res.json({
      success: true,
      data: {
        errors: analytics,
        summary: {
          total_unique_errors: analytics.length,
          total_occurrences: analytics.reduce((sum, error) => sum + error.occurrence_count, 0),
          error_types: errorTypeSummary
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Generate daily business metrics (admin)
router.post('/admin/business/generate', [
  body('date').optional().isISO8601().withMessage('Invalid date format')
], validationMiddleware.handleValidationErrors, async (req, res, next) => {
  try {
    const { date } = req.body;
    const targetDate = date ? new Date(date) : new Date();

    await AnalyticsService.generateDailyBusinessMetrics(targetDate);

    res.json({
      success: true,
      message: `Business metrics generated for ${targetDate.toISOString().split('T')[0]}`
    });
  } catch (error) {
    next(error);
  }
});

// Record custom system metric (admin)
router.post('/admin/system/metric', [
  body('metric_type').isString().isLength({ min: 1, max: 50 }).withMessage('Metric type is required and must be 1-50 characters'),
  body('metric_name').isString().isLength({ min: 1, max: 100 }).withMessage('Metric name is required and must be 1-100 characters'),
  body('metric_value').isNumeric().withMessage('Metric value must be a number'),
  body('metric_data').optional().isObject().withMessage('Metric data must be an object')
], validationMiddleware.handleValidationErrors, async (req, res, next) => {
  try {
    const {
      metric_type,
      metric_name,
      metric_value,
      metric_data = {}
    } = req.body;

    const metricId = await AnalyticsService.recordSystemMetric(
      metric_type,
      metric_name,
      parseFloat(metric_value),
      metric_data
    );

    res.status(201).json({
      success: true,
      message: 'System metric recorded successfully',
      data: {
        metric_id: metricId
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get user activity overview (admin)
router.get('/admin/users/activity', [
  query('start_date').optional().isISO8601().withMessage('Invalid start date format'),
  query('end_date').optional().isISO8601().withMessage('Invalid end date format'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], validationMiddleware.handleValidationErrors, async (req, res, next) => {
  try {
    const {
      start_date,
      end_date,
      limit = 50
    } = req.query;

    const startDate = start_date ? new Date(start_date) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = end_date ? new Date(end_date) : new Date();

    const query = `
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        COUNT(ua.id) as activity_count,
        MAX(ua.created_at) as last_activity,
        COUNT(DISTINCT ua.activity_type) as unique_activity_types
      FROM users u
      LEFT JOIN user_activities ua ON u.id = ua.user_id 
        AND ua.created_at BETWEEN $1 AND $2
      GROUP BY u.id, u.email, u.first_name, u.last_name
      ORDER BY activity_count DESC
      LIMIT $3
    `;

    const { pool } = require('../config/database');
    const result = await pool.query(query, [startDate, endDate, limit]);

    const userActivity = result.rows.map(row => ({
      user: {
        id: row.id,
        email: row.email,
        name: `${row.first_name} ${row.last_name}`
      },
      activity_count: parseInt(row.activity_count),
      last_activity: row.last_activity,
      unique_activity_types: parseInt(row.unique_activity_types)
    }));

    res.json({
      success: true,
      data: {
        users: userActivity,
        period: {
          start_date: startDate,
          end_date: endDate
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Clean up old analytics data (admin)
router.delete('/admin/cleanup', [
  body('retention_days').optional().isInt({ min: 1, max: 365 }).withMessage('Retention days must be between 1 and 365')
], validationMiddleware.handleValidationErrors, async (req, res, next) => {
  try {
    const { retention_days = 90 } = req.body;

    const deletedCount = await AnalyticsService.cleanupOldData(retention_days);

    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} old analytics records`,
      data: {
        deleted_count: deletedCount,
        retention_days
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get analytics overview (admin dashboard)
router.get('/admin/overview', async (req, res, next) => {
  try {
    const { pool } = require('../config/database');
    
    // Get basic counts
    const overviewQuery = `
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_users_30d,
        (SELECT COUNT(*) FROM data_recovery_sessions) as total_recovery_sessions,
        (SELECT COUNT(*) FROM phone_transfers) as total_phone_transfers,
        (SELECT COUNT(*) FROM subscriptions WHERE status = 'active') as active_subscriptions,
        (SELECT COUNT(DISTINCT user_id) FROM user_activities WHERE created_at >= CURRENT_DATE - INTERVAL '1 day') as daily_active_users,
        (SELECT COUNT(DISTINCT user_id) FROM user_activities WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as weekly_active_users,
        (SELECT COUNT(*) FROM error_logs WHERE created_at >= CURRENT_DATE - INTERVAL '1 day') as errors_24h
    `;

    const overviewResult = await pool.query(overviewQuery);
    const overview = overviewResult.rows[0];

    // Get real-time metrics
    const realTimeMetrics = await AnalyticsService.getRealTimeMetrics();

    // Format response
    const dashboard = {
      users: {
        total: parseInt(overview.total_users),
        new_30d: parseInt(overview.new_users_30d),
        daily_active: parseInt(overview.daily_active_users),
        weekly_active: parseInt(overview.weekly_active_users)
      },
      services: {
        recovery_sessions: parseInt(overview.total_recovery_sessions),
        phone_transfers: parseInt(overview.total_phone_transfers),
        active_subscriptions: parseInt(overview.active_subscriptions)
      },
      system: {
        errors_24h: parseInt(overview.errors_24h),
        ...realTimeMetrics
      }
    };

    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;