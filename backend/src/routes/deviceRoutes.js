const express = require('express');
const DeviceService = require('../services/devices/deviceService');
const { protect, checkOwnership } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { 
  validateDeviceConnection,
  validatePagination,
  validateUUID,
  handleValidationErrors 
} = require('../middleware/validationMiddleware');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// @desc    Connect a new device
// @route   POST /api/devices/connect
// @access  Private
router.post('/connect',
  validateDeviceConnection,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const device = await DeviceService.connectDevice(req.user.id, req.body);
    
    res.status(201).json({
      success: true,
      message: 'Device connected successfully',
      data: device
    });
  })
);

// @desc    Register a new device (alias for connect)
// @route   POST /api/devices/register
// @access  Private
router.post('/register',
  validateDeviceConnection,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const device = await DeviceService.connectDevice(req.user.id, req.body);
    
    res.status(201).json({
      success: true,
      message: 'Device registered successfully',
      data: device
    });
  })
);

// @desc    Get all user devices
// @route   GET /api/devices
// @access  Private
router.get('/',
  validatePagination,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { page, limit, status, deviceType, sortBy, sortOrder, search } = req.query;
    
    const result = await DeviceService.getUserDevices(req.user.id, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      status,
      deviceType,
      sortBy,
      sortOrder,
      search
    });
    
    res.json({
      success: true,
      data: result.devices,
      pagination: result.pagination
    });
  })
);

// @desc    Get device by ID
// @route   GET /api/devices/:id
// @access  Private
router.get('/:id',
  validateUUID('id'),
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const device = await DeviceService.getDevice(req.user.id, req.params.id);
    
    res.json({
      success: true,
      data: device
    });
  })
);

// @desc    Update device
// @route   PUT /api/devices/:id
// @access  Private
router.put('/:id',
  validateUUID('id'),
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const device = await DeviceService.updateDevice(req.user.id, req.params.id, req.body);
    
    res.json({
      success: true,
      message: 'Device updated successfully',
      data: device
    });
  })
);

// @desc    Disconnect device
// @route   POST /api/devices/:id/disconnect
// @access  Private
router.post('/:id/disconnect',
  validateUUID('id'),
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    await DeviceService.disconnectDevice(req.user.id, req.params.id);
    
    res.json({
      success: true,
      message: 'Device disconnected successfully'
    });
  })
);

// @desc    Delete device
// @route   DELETE /api/devices/:id
// @access  Private
router.delete('/:id',
  validateUUID('id'),
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    await DeviceService.deleteDevice(req.user.id, req.params.id);
    
    res.json({
      success: true,
      message: 'Device deleted successfully'
    });
  })
);

// @desc    Get device statistics
// @route   GET /api/devices/:id/stats
// @access  Private
router.get('/:id/stats',
  validateUUID('id'),
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const stats = await DeviceService.getDeviceStats(req.user.id, req.params.id);
    
    res.json({
      success: true,
      data: stats
    });
  })
);

// @desc    Check device compatibility
// @route   POST /api/devices/compatibility
// @access  Private
router.post('/compatibility', asyncHandler(async (req, res) => {
  const compatibility = await DeviceService.checkCompatibility(req.body);
  
  res.json({
    success: true,
    data: compatibility
  });
}));

// @desc    Get device by connection ID (for device-initiated requests)
// @route   GET /api/devices/connection/:connectionId
// @access  Private
router.get('/connection/:connectionId', asyncHandler(async (req, res) => {
  const device = await DeviceService.getDeviceByConnectionId(req.params.connectionId);
  
  // Verify the device belongs to the authenticated user
  if (device.userId !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }
  
  res.json({
    success: true,
    data: device
  });
}));

// @desc    Update device status (for device-initiated status updates)
// @route   PUT /api/devices/connection/:connectionId/status
// @access  Private
router.put('/connection/:connectionId/status', asyncHandler(async (req, res) => {
  const { status, metadata } = req.body;
  
  if (!['connected', 'disconnected', 'syncing', 'error'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status. Must be connected, disconnected, syncing, or error'
    });
  }
  
  const device = await DeviceService.getDeviceByConnectionId(req.params.connectionId);
  
  // Verify the device belongs to the authenticated user
  if (device.userId !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }
  
  // Update device status
  const { query } = require('../config/database');
  await query(
    'UPDATE devices SET status = $1, metadata = $2, last_connected = NOW(), updated_at = NOW() WHERE id = $3',
    [status, JSON.stringify(metadata || {}), device.id]
  );
  
  // Clear cache
  const { deleteCache } = require('../config/redis');
  await deleteCache(`device:${device.id}`);
  
  res.json({
    success: true,
    message: 'Device status updated successfully'
  });
}));

// @desc    Update device capabilities (for device-initiated capability updates)
// @route   PUT /api/devices/connection/:connectionId/capabilities
// @access  Private
router.put('/connection/:connectionId/capabilities', asyncHandler(async (req, res) => {
  const { capabilities } = req.body;
  
  if (!capabilities || typeof capabilities !== 'object') {
    return res.status(400).json({
      success: false,
      message: 'Capabilities must be a valid object'
    });
  }
  
  const device = await DeviceService.getDeviceByConnectionId(req.params.connectionId);
  
  // Verify the device belongs to the authenticated user
  if (device.userId !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }
  
  // Update device capabilities
  const { query } = require('../config/database');
  await query(
    'UPDATE devices SET capabilities = $1, updated_at = NOW() WHERE id = $2',
    [JSON.stringify(capabilities), device.id]
  );
  
  // Clear cache
  const { deleteCache } = require('../config/redis');
  await deleteCache(`device:${device.id}`);
  
  res.json({
    success: true,
    message: 'Device capabilities updated successfully'
  });
}));

// @desc    Get supported device types
// @route   GET /api/devices/types
// @access  Private
router.get('/types', asyncHandler(async (req, res) => {
  const deviceTypes = {
    mobile: {
      name: 'Mobile Phone',
      supportedOS: ['iOS', 'Android'],
      features: ['backup', 'sync', 'transfer'],
      limitations: []
    },
    tablet: {
      name: 'Tablet',
      supportedOS: ['iOS', 'Android', 'Windows'],
      features: ['backup', 'sync', 'transfer'],
      limitations: []
    },
    laptop: {
      name: 'Laptop',
      supportedOS: ['Windows', 'macOS', 'Linux'],
      features: ['backup', 'sync', 'transfer', 'remote_access'],
      limitations: []
    },
    desktop: {
      name: 'Desktop Computer',
      supportedOS: ['Windows', 'macOS', 'Linux'],
      features: ['backup', 'sync', 'transfer', 'remote_access'],
      limitations: []
    },
    smartwatch: {
      name: 'Smart Watch',
      supportedOS: ['watchOS', 'Wear OS'],
      features: ['sync'],
      limitations: ['Limited storage', 'Basic sync only']
    }
  };
  
  res.json({
    success: true,
    data: deviceTypes
  });
}));

// @desc    Get device connection guide
// @route   GET /api/devices/connection-guide/:deviceType
// @access  Private
router.get('/connection-guide/:deviceType', asyncHandler(async (req, res) => {
  const { deviceType } = req.params;
  
  const guides = {
    mobile: {
      steps: [
        'Download the SyncSphere mobile app from your device\'s app store',
        'Open the app and tap "Connect Device"',
        'Scan the QR code displayed on this screen',
        'Follow the on-screen instructions to complete the connection',
        'Grant necessary permissions when prompted'
      ],
      requirements: [
        'iOS 12.0+ or Android 8.0+',
        'Active internet connection',
        'Camera access for QR code scanning'
      ],
      troubleshooting: [
        'Ensure both devices are on the same network',
        'Check that camera permissions are granted',
        'Try refreshing the QR code if connection fails'
      ]
    },
    laptop: {
      steps: [
        'Download the SyncSphere desktop application',
        'Install and launch the application',
        'Click "Add Device" in the main interface',
        'Enter the connection code displayed on this screen',
        'Complete the device verification process'
      ],
      requirements: [
        'Windows 10+, macOS 10.14+, or Ubuntu 18.04+',
        'Stable internet connection',
        'Administrator privileges for installation'
      ],
      troubleshooting: [
        'Run the application as administrator if needed',
        'Check firewall settings',
        'Ensure the connection code is entered correctly'
      ]
    },
    tablet: {
      steps: [
        'Download the SyncSphere app from your tablet\'s app store',
        'Open the app and select "Connect New Device"',
        'Choose "Tablet" as your device type',
        'Scan the QR code or enter the connection code',
        'Complete the setup wizard'
      ],
      requirements: [
        'iOS 12.0+ or Android 8.0+',
        'Sufficient storage space (minimum 1GB free)',
        'Active internet connection'
      ],
      troubleshooting: [
        'Clear app cache if connection issues occur',
        'Restart the app and try again',
        'Check device storage space'
      ]
    }
  };
  
  const guide = guides[deviceType];
  if (!guide) {
    return res.status(404).json({
      success: false,
      message: 'Connection guide not found for this device type'
    });
  }
  
  res.json({
    success: true,
    data: {
      deviceType,
      guide
    }
  });
}));

module.exports = router;