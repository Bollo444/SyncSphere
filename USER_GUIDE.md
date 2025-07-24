# SyncSphere User Guide

## Table of Contents
1. [Overview](#overview)
2. [System Requirements](#system-requirements)
3. [Installation & Setup](#installation--setup)
4. [Getting Started](#getting-started)
5. [User Authentication](#user-authentication)
6. [Dashboard Overview](#dashboard-overview)
7. [Device Management](#device-management)
8. [Data Recovery](#data-recovery)
9. [Phone Transfer](#phone-transfer)
10. [WhatsApp Transfer](#whatsapp-transfer)
11. [File Management](#file-management)
12. [Backup & Sync](#backup--sync)
13. [Advanced Features](#advanced-features)
14. [User Profile & Settings](#user-profile--settings)
15. [Admin Features](#admin-features)
16. [Troubleshooting](#troubleshooting)
17. [API Reference](#api-reference)

## Overview

SyncSphere is a comprehensive data synchronization and recovery platform that enables users to:
- Sync data across multiple devices
- Recover lost or corrupted data
- Transfer data between phones
- **Transfer WhatsApp chats and media between devices**
- Manage device backups
- Monitor sync analytics
- Collaborate with team members
- Access advanced device management features

## System Requirements

### Prerequisites
- **Node.js** (v18 or higher)
- **PostgreSQL** (v12 or higher)
- **Redis** (v6 or higher)
- **npm** or **yarn** package manager
- **Modern web browser** (Chrome, Firefox, Safari, Edge)

### Hardware Requirements
- **RAM**: Minimum 4GB, Recommended 8GB
- **Storage**: Minimum 10GB free space
- **Network**: Stable internet connection

## Installation & Setup

### Quick Start

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-org/syncsphere.git
   cd syncsphere
   ```

2. **Install Dependencies**
   ```bash
   # Backend dependencies
   cd backend
   npm install
   
   # Frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Environment Configuration**
   
   Create `.env` files in both backend and frontend directories:
   
   **Backend `.env`:**
   ```env
   NODE_ENV=development
   PORT=5000
   
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=syncsphere
   DB_USER=your_username
   DB_PASSWORD=your_password
   
   # Redis Configuration
   REDIS_HOST=localhost
   REDIS_PORT=6379
   
   # JWT Configuration
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRES_IN=24h
   
   # File Upload Configuration
   UPLOAD_PATH=./uploads
   MAX_FILE_SIZE=100MB
   
   # Email Configuration (optional)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   ```
   
   **Frontend `.env`:**
   ```env
   VITE_API_BASE_URL=http://localhost:5000/api
   VITE_WS_URL=ws://localhost:5000
   ```

4. **Database Setup**
   ```bash
   # Create PostgreSQL database
   createdb syncsphere
   
   # Run migrations (if available)
   cd backend
   npm run migrate
   ```

5. **Start the Application**
   ```bash
   # Start backend server
   cd backend
   npm run dev
   
   # Start frontend (in new terminal)
   cd frontend
   npm run dev
   ```

6. **Access the Application**
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:5000`

### Docker Setup (Alternative)

```bash
# Build and run with Docker Compose
docker-compose up --build
```

## Getting Started

### First Time Setup

1. **Access the Application**
   - Open your web browser and navigate to `http://localhost:3000`
   - You'll be redirected to the login page

2. **Create an Account**
   - Click "Sign Up" on the login page
   - Fill in your details (name, email, password)
   - Verify your email (if email verification is enabled)

3. **Initial Configuration**
   - Complete your profile setup
   - Configure your first device
   - Set up backup preferences

## User Authentication

### Login Process

1. **Standard Login**
   - Enter your email and password
   - Click "Sign In"
   - You'll be redirected to the dashboard

2. **Password Recovery**
   - Click "Forgot Password?" on the login page
   - Enter your email address
   - Check your email for reset instructions
   - Follow the link to create a new password

3. **Account Security**
   - Enable two-factor authentication (if available)
   - Use strong, unique passwords
   - Regularly update your password

## Dashboard Overview

The main dashboard provides an overview of your sync activities:

### Key Sections

1. **Sync Status Widget**
   - Shows current sync operations
   - Displays last sync time
   - Indicates any sync errors

2. **Device Overview**
   - Lists all connected devices
   - Shows device status (online/offline)
   - Quick device management actions

3. **Recent Activity**
   - Timeline of recent sync operations
   - File transfer history
   - Recovery session logs

4. **Storage Usage**
   - Current storage consumption
   - Available space
   - Storage optimization suggestions

5. **Quick Actions**
   - Start new sync
   - Initiate data recovery
   - Add new device
   - Create backup

## Device Management

### Adding a New Device

1. **Navigate to Devices**
   - Click "Devices" in the sidebar
   - Click "Add Device" button

2. **Device Registration**
   - Enter device name and type
   - Select operating system
   - Configure sync preferences
   - Click "Register Device"

3. **Device Verification**
   - Install SyncSphere client on the device
   - Enter the provided device code
   - Complete the pairing process

### Managing Existing Devices

1. **Device List View**
   - View all registered devices
   - Check device status and last sync
   - Access device-specific settings

2. **Device Actions**
   - **Sync Now**: Force immediate sync
   - **Edit**: Modify device settings
   - **Pause**: Temporarily disable sync
   - **Remove**: Unregister device

3. **Device Settings**
   - Sync frequency configuration
   - File type filters
   - Bandwidth limitations
   - Conflict resolution preferences

## Data Recovery

### Starting a Recovery Session

1. **Access Recovery**
   - Navigate to "Recovery" section
   - Click "Start New Recovery"

2. **Recovery Configuration**
   - Select recovery type:
     - **Full Recovery**: Complete data restoration
     - **Selective Recovery**: Choose specific files/folders
     - **Point-in-Time Recovery**: Restore to specific date
   - Choose source device or backup
   - Select destination device

3. **Recovery Process**
   - Review recovery summary
   - Start the recovery process
   - Monitor progress in real-time
   - Receive completion notification

### Recovery Types

1. **File Recovery**
   - Recover deleted files
   - Restore corrupted files
   - Retrieve files from specific dates

2. **System Recovery**
   - Restore system settings
   - Recover application data
   - Restore user preferences

3. **Database Recovery**
   - Recover database files
   - Restore database backups
   - Point-in-time database recovery

## Phone Transfer

### Initiating Phone Transfer

1. **Start Transfer**
   - Navigate to "Phone Transfer"
   - Click "Start New Transfer"

2. **Device Selection**
   - Select source phone
   - Select destination phone
   - Choose transfer method (WiFi/Cable)

3. **Content Selection**
   - **Contacts**: Phone contacts and address book
   - **Messages**: SMS and messaging history
   - **Photos**: Camera roll and albums
   - **Apps**: Application data and settings
   - **Documents**: Files and documents
   - **Settings**: System preferences

4. **Transfer Process**
   - Review transfer summary
   - Start the transfer
   - Monitor progress
   - Verify completion

### Transfer Options

1. **Quick Transfer**
   - Transfer essential data only
   - Faster completion time
   - Basic content types

2. **Complete Transfer**
   - Transfer all available data
   - Comprehensive migration
   - Longer processing time

3. **Custom Transfer**
   - Select specific content types
   - Configure transfer preferences
   - Flexible options

## WhatsApp Transfer

### Overview

SyncSphere provides specialized WhatsApp transfer functionality to migrate WhatsApp chats, media, and data between devices seamlessly.

### Starting WhatsApp Transfer

1. **Access WhatsApp Transfer**
   - Navigate to "WhatsApp Transfer" in the main menu
   - Click "Start New WhatsApp Transfer"

2. **Device Connection**
   - Connect both source and target devices
   - Ensure both devices have WhatsApp installed
   - Verify device compatibility and connection status

3. **Device Selection**
   - **Source Device**: Select the device with WhatsApp data to transfer
   - **Target Device**: Select the destination device
   - Verify device information (OS, version, WhatsApp version)

### Transfer Methods

1. **Direct Transfer**
   - **Speed**: Fast
   - **Reliability**: High
   - **Requirements**: Both devices connected via USB
   - **Best for**: Quick transfers with stable connection

2. **Backup & Restore**
   - **Speed**: Medium
   - **Reliability**: High
   - **Requirements**: Creates intermediate backup
   - **Best for**: Cross-platform transfers (iOS ↔ Android)

3. **Cloud Sync**
   - **Speed**: Slow
   - **Reliability**: Medium
   - **Requirements**: Internet connection
   - **Best for**: Remote transfers

### Data Selection

Choose what WhatsApp data to transfer:

1. **Chat Data**
   - Individual chats
   - Group conversations
   - Message history
   - Chat metadata

2. **Media Files**
   - Photos and images
   - Videos
   - Audio messages
   - Documents and files
   - Voice notes

3. **Settings & Preferences**
   - Chat settings
   - Notification preferences
   - Privacy settings
   - Blocked contacts

### Transfer Process

1. **Pre-Transfer Checks**
   - Verify sufficient storage space
   - Check battery levels (>50% recommended)
   - Ensure stable connections
   - Create backup if required

2. **Data Analysis**
   - Scan WhatsApp data on source device
   - Calculate transfer size and time estimate
   - Identify any potential conflicts

3. **Transfer Execution**
   - Monitor real-time progress
   - View transfer statistics
   - Handle any errors or interruptions

4. **Verification**
   - Verify data integrity
   - Check transferred content
   - Confirm successful completion

### Important Considerations

1. **Backup Recommendations**
   - Always create a backup before transfer
   - Verify backup integrity
   - Keep backup until transfer is confirmed successful

2. **Data Overwrite Warning**
   - ⚠️ **Warning**: Transfer will overwrite existing WhatsApp data on target device
   - Ensure target device backup is created if needed
   - Confirm understanding before proceeding

3. **Cross-Platform Limitations**
   - Some features may not transfer between iOS and Android
   - Payment history may not be preserved
   - Some media formats may need conversion

4. **Legal and Privacy**
   - Only transfer data you own or have permission to access
   - Respect privacy of chat participants
   - Comply with local data protection laws

## File Management

### File Browser

1. **Navigation**
   - Browse files and folders
   - Search for specific files
   - Filter by file type or date

2. **File Operations**
   - **Upload**: Add new files
   - **Download**: Save files locally
   - **Share**: Generate sharing links
   - **Delete**: Remove files
   - **Move**: Organize files

3. **File Versioning**
   - View file history
   - Restore previous versions
   - Compare file versions

### Sync Folders

1. **Creating Sync Folders**
   - Navigate to "Sync Folders"
   - Click "Create New Folder"
   - Configure sync settings
   - Add devices to sync

2. **Folder Management**
   - Monitor sync status
   - Resolve sync conflicts
   - Adjust sync preferences
   - Share folders with others

## Backup & Sync

### Automatic Backups

1. **Backup Configuration**
   - Navigate to "Backups"
   - Click "Configure Backups"
   - Set backup schedule
   - Choose backup content

2. **Backup Types**
   - **Incremental**: Only changed files
   - **Full**: Complete backup
   - **Differential**: Changes since last full backup

3. **Backup Management**
   - View backup history
   - Restore from backups
   - Delete old backups
   - Verify backup integrity

### Manual Sync

1. **Immediate Sync**
   - Click "Sync Now" on dashboard
   - Select devices to sync
   - Monitor sync progress

2. **Scheduled Sync**
   - Configure sync schedules
   - Set sync frequency
   - Define sync windows

## Advanced Features

SyncSphere provides advanced device management and bypass capabilities for professional users and technicians.

### Screen Unlock

Unlock devices when access codes are forgotten or unavailable.

1. **Supported Methods**
   - **PIN Brute Force**: Systematically try PIN combinations
   - **Pattern Analysis**: Analyze and crack pattern locks
   - **Password Dictionary**: Use dictionary attacks for passwords
   - **Biometric Bypass**: Bypass fingerprint and face recognition
   - **Exploit Vulnerability**: Use security vulnerabilities

2. **Starting Screen Unlock**
   - Navigate to "Advanced Features" → "Screen Unlock"
   - Connect and select your device
   - Choose unlock method based on device type
   - Configure method-specific settings
   - Start the unlock process

3. **Safety Considerations**
   - ⚠️ **Warning**: Only use on devices you own or have permission to access
   - Multiple failed attempts may trigger device security measures
   - Some methods may void device warranty
   - Always backup device data before attempting unlock

### System Repair

Repair corrupted or damaged device systems.

1. **Repair Types**
   - **iOS System Repair**: Fix iOS boot loops and system errors
   - **Android System Repair**: Repair Android system corruption
   - **Bootloop Fix**: Resolve boot loop issues
   - **Firmware Restore**: Restore original firmware
   - **Factory Reset**: Complete device reset

2. **System Repair Process**
   - Navigate to "Advanced Features" → "System Repair"
   - Connect your device via USB
   - Select device model and repair type
   - Download required firmware (if needed)
   - Start repair process and monitor progress

3. **Important Notes**
   - System repair may erase all device data
   - Ensure device has sufficient battery (>50%)
   - Do not disconnect device during repair
   - Keep original firmware files for recovery

### Data Eraser

Securely erase sensitive data from devices.

1. **Erasure Methods**
   - **Quick Erase**: Fast data deletion
   - **Secure Erase**: DOD 5220.22-M standard
   - **Military Grade**: NSA/CSS specification
   - **Custom Patterns**: User-defined erasure patterns

2. **Data Erasure Process**
   - Navigate to "Advanced Features" → "Data Eraser"
   - Select target device
   - Choose erasure method and scope
   - Configure verification settings
   - Start erasure and verify completion

3. **Compliance Features**
   - Generate erasure certificates
   - Audit trail logging
   - Compliance reporting
   - Chain of custody documentation

### FRP Bypass

Bypass Google Factory Reset Protection (FRP) on Android devices.

1. **Supported Devices**
   - **Samsung**: Galaxy series bypass methods
   - **LG**: LG-specific FRP bypass techniques
   - **Huawei**: Huawei FRP removal tools
   - **Xiaomi**: Mi account and FRP bypass
   - **OnePlus**: OnePlus FRP bypass methods
   - **Generic Android**: Universal bypass techniques

2. **FRP Bypass Process**
   - Navigate to "Advanced Features" → "FRP Bypass"
   - Connect Android device via USB
   - Select device manufacturer and model
   - Choose appropriate bypass method
   - Follow on-screen instructions
   - Complete bypass verification

3. **Prerequisites**
   - Device must be in FRP locked state
   - USB debugging may need to be enabled
   - Some methods require specific Android versions
   - Ensure stable USB connection throughout process

4. **Legal Considerations**
   - ⚠️ **Important**: Only use on devices you own
   - Bypassing FRP on stolen devices is illegal
   - Some regions have specific laws regarding FRP bypass
   - Always verify device ownership before proceeding

### iCloud Bypass

Bypass iCloud Activation Lock on iOS devices.

1. **Bypass Methods**
   - **Checkra1n Bypass**: Hardware-based bypass for older devices
   - **iCloud DNS Bypass**: DNS redirection method
   - **Sliver Bypass**: Advanced bypass technique
   - **3uTools Bypass**: Tool-assisted bypass
   - **iMyFone Bypass**: Commercial bypass solution

2. **iCloud Bypass Process**
   - Navigate to "Advanced Features" → "iCloud Bypass"
   - Connect iOS device via USB
   - Select device model and iOS version
   - Choose compatible bypass method
   - Follow method-specific instructions
   - Verify bypass completion

3. **Device Compatibility**
   - Different methods support different iOS versions
   - Some bypasses are temporary (until reboot)
   - Newer devices may have limited bypass options
   - Check compatibility before starting process

4. **Limitations and Warnings**
   - ⚠️ **Legal Warning**: Only use on devices you own
   - Bypassed devices may have limited functionality
   - Some features (calls, cellular) may not work
   - Apple may patch bypass methods in updates
   - Always backup device before attempting bypass

### Advanced Features Best Practices

1. **Before Using Advanced Features**
   - Verify device ownership and legal right to modify
   - Backup all important data
   - Ensure stable power supply and connections
   - Read all warnings and disclaimers

2. **During Operations**
   - Do not interrupt processes once started
   - Monitor progress and error messages
   - Keep devices connected and powered
   - Follow all safety guidelines

3. **After Completion**
   - Verify operation success
   - Test device functionality
   - Document any issues or limitations
   - Keep records for warranty/legal purposes

4. **Troubleshooting Advanced Features**
   - Check device compatibility lists
   - Verify USB drivers are installed
   - Try different USB ports/cables
   - Restart both device and computer
   - Contact support for persistent issues

## User Profile & Settings

### Profile Management

1. **Personal Information**
   - Update name and email
   - Change profile picture
   - Modify contact details

2. **Account Settings**
   - Change password
   - Enable two-factor authentication
   - Manage API keys
   - Configure notifications

3. **Preferences**
   - Set default sync options
   - Configure UI preferences
   - Adjust notification settings
   - Set timezone and language

### Security Settings

1. **Password Management**
   - Change current password
   - Set password requirements
   - Enable password expiration

2. **Access Control**
   - Manage active sessions
   - Review login history
   - Configure IP restrictions

3. **Data Privacy**
   - Configure data retention
   - Manage data sharing
   - Export personal data

## Admin Features

### User Management (Admin Only)

1. **User Administration**
   - View all users
   - Create new users
   - Modify user permissions
   - Deactivate users

2. **Role Management**
   - Define user roles
   - Assign permissions
   - Manage access levels

3. **User Analytics**
   - Monitor user activity
   - Track usage statistics
   - Generate user reports

### System Administration

1. **System Monitoring**
   - Monitor system health
   - View performance metrics
   - Check resource usage

2. **Configuration Management**
   - Modify system settings
   - Configure integrations
   - Manage system policies

3. **Maintenance**
   - Schedule maintenance windows
   - Perform system updates
   - Manage system backups

## Troubleshooting

### Common Issues

1. **Sync Problems**
   - **Issue**: Sync not working
   - **Solution**: Check network connection, verify device status, restart sync service

2. **Login Issues**
   - **Issue**: Cannot log in
   - **Solution**: Verify credentials, check account status, reset password if needed

3. **Performance Issues**
   - **Issue**: Slow sync speeds
   - **Solution**: Check bandwidth settings, optimize file selection, schedule sync during off-peak hours

4. **Storage Issues**
   - **Issue**: Storage full
   - **Solution**: Clean up old backups, optimize file storage, upgrade storage plan

### Error Messages

1. **"Device Not Found"**
   - Verify device is online
   - Check device registration
   - Re-register device if necessary

2. **"Sync Conflict"**
   - Review conflicted files
   - Choose resolution strategy
   - Apply conflict resolution

3. **"Authentication Failed"**
   - Verify login credentials
   - Check account status
   - Contact administrator if needed

### Getting Help

1. **Documentation**
   - Check this user guide
   - Review API documentation
   - Browse FAQ section

2. **Support Channels**
   - Submit support ticket
   - Contact technical support
   - Join community forums

3. **Logs and Diagnostics**
   - Check application logs
   - Run diagnostic tools
   - Export error reports

## API Reference

### Authentication Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/forgot-password` - Password reset

### User Management

- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users` - List users (admin)
- `POST /api/users` - Create user (admin)
- `DELETE /api/users/:id` - Delete user (admin)

### Device Management

- `GET /api/devices` - List user devices
- `POST /api/devices` - Register new device
- `PUT /api/devices/:id` - Update device
- `DELETE /api/devices/:id` - Remove device
- `POST /api/devices/:id/sync` - Trigger device sync

### Data Recovery

- `GET /api/recovery/sessions` - List recovery sessions
- `POST /api/recovery/sessions` - Start recovery session
- `GET /api/recovery/sessions/:id` - Get recovery status
- `POST /api/recovery/sessions/:id/cancel` - Cancel recovery

### File Management

- `GET /api/files` - List files
- `POST /api/files/upload` - Upload file
- `GET /api/files/:id/download` - Download file
- `DELETE /api/files/:id` - Delete file
- `POST /api/files/:id/share` - Share file

### Backup Management

- `GET /api/backups` - List backups
- `POST /api/backups` - Create backup
- `GET /api/backups/:id` - Get backup details
- `POST /api/backups/:id/restore` - Restore backup
- `DELETE /api/backups/:id` - Delete backup

### Analytics

- `GET /api/analytics/dashboard` - Dashboard metrics
- `GET /api/analytics/usage` - Usage statistics
- `GET /api/analytics/devices` - Device analytics
- `GET /api/analytics/sync` - Sync analytics

### WhatsApp Transfer

- `GET /api/whatsapp-transfer/sessions` - List WhatsApp transfer sessions
- `POST /api/whatsapp-transfer/sessions` - Start WhatsApp transfer session
- `GET /api/whatsapp-transfer/sessions/:id` - Get transfer status
- `POST /api/whatsapp-transfer/sessions/:id/pause` - Pause transfer
- `POST /api/whatsapp-transfer/sessions/:id/resume` - Resume transfer
- `POST /api/whatsapp-transfer/sessions/:id/cancel` - Cancel transfer
- `GET /api/whatsapp-transfer/devices/:id/scan` - Scan WhatsApp data
- `POST /api/whatsapp-transfer/backup` - Create WhatsApp backup
- `POST /api/whatsapp-transfer/restore` - Restore WhatsApp backup

### Advanced Features

#### Screen Unlock
- `POST /api/advanced/screen-unlock/start` - Start screen unlock session
- `GET /api/advanced/screen-unlock/:sessionId/progress` - Get unlock progress
- `POST /api/advanced/screen-unlock/:sessionId/pause` - Pause unlock session
- `POST /api/advanced/screen-unlock/:sessionId/resume` - Resume unlock session
- `POST /api/advanced/screen-unlock/:sessionId/cancel` - Cancel unlock session

#### System Repair
- `POST /api/advanced/system-repair/start` - Start system repair session
- `GET /api/advanced/system-repair/:sessionId/progress` - Get repair progress
- `POST /api/advanced/system-repair/:sessionId/pause` - Pause repair session
- `POST /api/advanced/system-repair/:sessionId/resume` - Resume repair session
- `POST /api/advanced/system-repair/:sessionId/cancel` - Cancel repair session

#### Data Eraser
- `POST /api/advanced/data-eraser/start` - Start data erasure session
- `GET /api/advanced/data-eraser/:sessionId/progress` - Get erasure progress
- `POST /api/advanced/data-eraser/:sessionId/pause` - Pause erasure session
- `POST /api/advanced/data-eraser/:sessionId/resume` - Resume erasure session
- `POST /api/advanced/data-eraser/:sessionId/cancel` - Cancel erasure session

#### FRP Bypass
- `POST /api/advanced/frp-bypass/start` - Start FRP bypass session
- `GET /api/advanced/frp-bypass/:sessionId/progress` - Get bypass progress
- `POST /api/advanced/frp-bypass/:sessionId/pause` - Pause bypass session
- `POST /api/advanced/frp-bypass/:sessionId/resume` - Resume bypass session
- `POST /api/advanced/frp-bypass/:sessionId/cancel` - Cancel bypass session

#### iCloud Bypass
- `POST /api/advanced/icloud-bypass/start` - Start iCloud bypass session
- `GET /api/advanced/icloud-bypass/:sessionId/progress` - Get bypass progress
- `POST /api/advanced/icloud-bypass/:sessionId/pause` - Pause bypass session
- `POST /api/advanced/icloud-bypass/:sessionId/resume` - Resume bypass session
- `POST /api/advanced/icloud-bypass/:sessionId/cancel` - Cancel bypass session

#### Advanced Session Management
- `GET /api/advanced/sessions` - List all advanced sessions
- `GET /api/advanced/sessions/:sessionId` - Get session details
- `DELETE /api/advanced/sessions/:sessionId` - Delete session record

---

## Support

For additional support or questions:

- **Documentation**: Check the `/docs` directory for technical documentation
- **Issues**: Report bugs on the project repository
- **Community**: Join our community forums for discussions

---

*Last updated: December 2024*
*Version: 1.1.0*

**Recent Updates:**
- Added comprehensive WhatsApp Transfer documentation
- Updated API reference with WhatsApp transfer endpoints
- Enhanced transfer method descriptions
- Added cross-platform transfer considerations