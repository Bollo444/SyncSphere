const { body, param, query, validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));
    
    return next(new AppError(`Validation failed: ${errorMessages.map(e => e.message).join(', ')}`, 400));
  }
  
  next();
};

// User validation rules
const validateUserRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('acceptTerms')
    .isBoolean()
    .custom(value => value === true)
    .withMessage('You must accept the terms and conditions'),
  handleValidationErrors
];

const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

const validatePasswordReset = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  handleValidationErrors
];

const validatePasswordUpdate = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  handleValidationErrors
];

const validateUpdateProfile = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('phoneNumber')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('timezone')
    .optional()
    .isString()
    .withMessage('Timezone must be a string'),
  body('language')
    .optional()
    .isIn(['en', 'es', 'fr', 'de', 'zh', 'ja'])
    .withMessage('Invalid language'),
  handleValidationErrors
];

// Device validation rules
const validateDeviceConnection = [
  body('deviceType')
    .isIn(['ios', 'android'])
    .withMessage('Device type must be either ios or android'),
  body('deviceModel')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Device model is required and must be less than 100 characters'),
  body('osVersion')
    .trim()
    .matches(/^\d+\.\d+(\.\d+)?$/)
    .withMessage('OS version must be in format x.x or x.x.x'),
  body('serialNumber')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Serial number must be less than 50 characters'),
  body('deviceName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Device name must be less than 100 characters'),
  body('capabilities')
    .optional()
    .isObject()
    .withMessage('Capabilities must be an object'),
  handleValidationErrors
];

// Recovery validation rules
const validateRecoveryStart = [
  body('deviceId')
    .isUUID()
    .withMessage('Valid device ID is required'),
  body('recoveryType')
    .isIn(['photos', 'contacts', 'messages', 'videos', 'documents', 'all'])
    .withMessage('Invalid recovery type'),
  body('deepScan')
    .optional()
    .isBoolean()
    .withMessage('Deep scan must be a boolean value'),
  handleValidationErrors
];

const validateRecoveryDownload = [
  param('jobId')
    .isUUID()
    .withMessage('Valid job ID is required'),
  body('selectedFiles')
    .isArray({ min: 1 })
    .withMessage('At least one file must be selected'),
  body('selectedFiles.*')
    .isString()
    .withMessage('File IDs must be strings'),
  handleValidationErrors
];

// Transfer validation rules
const validateTransferStart = [
  body('sourceDeviceId')
    .isUUID()
    .withMessage('Valid source device ID is required'),
  body('targetDeviceId')
    .isUUID()
    .withMessage('Valid target device ID is required'),
  body('transferTypes')
    .isArray({ min: 1 })
    .withMessage('At least one transfer type must be selected'),
  body('transferTypes.*')
    .isIn(['contacts', 'photos', 'messages', 'videos', 'documents', 'apps'])
    .withMessage('Invalid transfer type'),
  handleValidationErrors
];

// Subscription validation rules
const validateSubscriptionCreate = [
  body('planId')
    .isIn(['basic_monthly', 'basic_yearly', 'premium_monthly', 'premium_yearly', 'enterprise_monthly', 'enterprise_yearly'])
    .withMessage('Invalid subscription plan'),
  body('paymentMethodId')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Payment method ID is required'),
  handleValidationErrors
];

// General validation rules
const validateUUID = (paramName = 'id') => [
  param(paramName)
    .isUUID()
    .withMessage(`Valid ${paramName} is required`),
  handleValidationErrors
];

const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sortBy')
    .optional()
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('Sort field must be a valid string'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  handleValidationErrors
];

const validateEmail = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  handleValidationErrors
];

const validateFileUpload = [
  body('fileName')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('File name is required and must be less than 255 characters'),
  body('fileSize')
    .isInt({ min: 1 })
    .withMessage('File size must be a positive integer'),
  body('fileType')
    .isIn(['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/mov', 'application/pdf', 'text/plain'])
    .withMessage('Invalid file type'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateRequest: handleValidationErrors, // Alias for backward compatibility
  validateUserRegistration,
  validateUserLogin,
  validatePasswordReset,
  validatePasswordUpdate,
  validateUpdateProfile,
  validateDeviceConnection,
  validateRecoveryStart,
  validateRecoveryDownload,
  validateTransferStart,
  validateSubscriptionCreate,
  validateUUID,
  validatePagination,
  validateEmail,
  validateFileUpload
};