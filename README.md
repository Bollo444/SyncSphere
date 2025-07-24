# SyncSphere - Data Recovery & Phone Transfer Platform

![SyncSphere Logo](https://via.placeholder.com/200x80/4F46E5/FFFFFF?text=SyncSphere)

## 🚀 Overview

SyncSphere is a comprehensive data recovery and phone-to-phone transfer platform that provides users with powerful tools to recover lost data, transfer files between devices, and manage their digital assets securely.

### Key Features

- 📱 **Phone-to-Phone Transfer**: Seamless data transfer between mobile devices
- 🔄 **Data Recovery**: Advanced recovery tools for lost or deleted files
- 💳 **Subscription Management**: Flexible billing with Stripe integration
- 📊 **Analytics Dashboard**: Real-time insights and usage statistics
- 🔒 **Secure File Storage**: Encrypted file uploads and downloads
- 📧 **Multi-Channel Notifications**: Email, push, and in-app notifications
- 💾 **Automated Backups**: Scheduled system and user data backups
- 👥 **User Management**: Role-based access control and authentication

## 🛠 Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Cache**: Redis
- **Authentication**: JWT
- **Payments**: Stripe
- **File Storage**: Multer + Local/Cloud Storage
- **Email**: Nodemailer
- **Scheduling**: node-cron

### Frontend (Planned)
- **Framework**: React.js
- **Styling**: Tailwind CSS
- **State Management**: Context API / Redux
- **Build Tool**: Vite
- **HTTP Client**: Axios

## 📋 Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- Redis (v6 or higher)
- npm or yarn

## 🚀 Quick Start

### Option A: One-Click Development Setup (Recommended)

**For Windows users, we provide automated development scripts:**

```bash
# Interactive launcher with multiple options
dev-launcher.bat

# Or start everything at once
start-dev.bat
```

**Features:**
- 🚀 Starts all services in separate command prompts
- 🐳 Automatically manages Docker containers (PostgreSQL + Redis)
- ⚛️ Launches Frontend and Backend servers
- 🛑 Easy service management and stopping
- 📊 Service status monitoring

**See [DEV_SCRIPTS_README.md](./DEV_SCRIPTS_README.md) for detailed documentation.**

### Option B: Manual Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/syncsphere.git
cd syncsphere
```

### 2. Install Dependencies

```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install
```

### 3. Environment Setup

Create a `.env` file in the backend directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=syncsphere
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRE=7d

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=noreply@syncsphere.com

# File Upload Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=50MB
```

### 4. Database Setup

```bash
# Create PostgreSQL database
psql -U postgres
CREATE DATABASE syncsphere;
\q

# Start Redis server
redis-server
```

### 5. Start the Application

**Option A: Using Development Scripts (Recommended)**
```bash
# Interactive launcher
dev-launcher.bat

# Or start everything at once
start-dev.bat
```

**Option B: Manual Start**
```bash
# Start Docker services
docker-compose up -d

# Start backend server
cd backend
npm run dev

# Start frontend
cd frontend
npm run dev
```

**Service URLs:**
- Backend API: `http://localhost:3000`
- Frontend: `http://localhost:5173`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | User registration |
| POST | `/api/v1/auth/login` | User login |
| POST | `/api/v1/auth/logout` | User logout |
| POST | `/api/v1/auth/forgot-password` | Request password reset |
| POST | `/api/v1/auth/reset-password` | Reset password |
| POST | `/api/v1/auth/verify-email` | Verify email address |

### User Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users/profile` | Get user profile |
| PUT | `/api/v1/users/profile` | Update user profile |
| DELETE | `/api/v1/users/profile` | Delete user account |
| POST | `/api/v1/users/change-password` | Change password |

### Device Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/devices` | Get user devices |
| POST | `/api/v1/devices` | Register new device |
| GET | `/api/v1/devices/:id` | Get device details |
| PUT | `/api/v1/devices/:id` | Update device |
| DELETE | `/api/v1/devices/:id` | Remove device |

### Data Recovery

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/recovery/start` | Start recovery session |
| GET | `/api/v1/recovery/:id` | Get recovery status |
| POST | `/api/v1/recovery/:id/cancel` | Cancel recovery |
| GET | `/api/v1/recovery/:id/files` | Get recovered files |

### Phone Transfer

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/phone-transfer/start` | Start phone transfer |
| GET | `/api/v1/phone-transfer/:id` | Get transfer status |
| POST | `/api/v1/phone-transfer/:id/pause` | Pause transfer |
| POST | `/api/v1/phone-transfer/:id/resume` | Resume transfer |
| POST | `/api/v1/phone-transfer/:id/cancel` | Cancel transfer |

### Subscriptions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/subscriptions` | Get user subscription |
| GET | `/api/v1/subscriptions/plans` | Get available plans |
| POST | `/api/v1/subscriptions/create` | Create subscription |
| PUT | `/api/v1/subscriptions/change-plan` | Change subscription plan |
| POST | `/api/v1/subscriptions/cancel` | Cancel subscription |

### File Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/files/upload` | Upload file |
| GET | `/api/v1/files` | Get user files |
| GET | `/api/v1/files/:id` | Get file details |
| GET | `/api/v1/files/:id/download` | Download file |
| DELETE | `/api/v1/files/:id` | Delete file |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/analytics/user` | Get user analytics |
| GET | `/api/v1/analytics/system` | Get system metrics (admin) |
| GET | `/api/v1/analytics/business` | Get business metrics (admin) |

### Backups

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/backups/create` | Create backup |
| GET | `/api/v1/backups` | Get user backups |
| POST | `/api/v1/backups/:id/restore` | Restore from backup |
| DELETE | `/api/v1/backups/:id` | Delete backup |

## 🏗 Project Structure

```
syncsphere/
├── backend/
│   ├── src/
│   │   ├── config/          # Database and Redis configuration
│   │   ├── middleware/      # Authentication, validation, error handling
│   │   ├── models/          # Database models
│   │   ├── routes/          # API route definitions
│   │   ├── services/        # Business logic services
│   │   ├── utils/           # Utility functions
│   │   ├── app.js           # Express app configuration
│   │   └── server.js        # Server startup
│   ├── uploads/             # File upload directory
│   ├── package.json
│   └── .env
├── frontend/                # React frontend (planned)
├── docs/                    # Project documentation
├── TASKS.md                 # Development task tracking
└── README.md
```

## 🔧 Development

### Available Scripts

```bash
# Backend
npm run dev          # Start development server with nodemon
npm start            # Start production server
npm test             # Run tests
npm run lint         # Run ESLint

# Frontend (when available)
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
```

### Database Models

- **Users**: User accounts and authentication
- **Devices**: Registered user devices
- **DataRecovery**: Recovery session tracking
- **Transfers**: Data transfer operations
- **PhoneTransfers**: Phone-to-phone transfers
- **Subscriptions**: User subscription management
- **FileUploads**: File storage tracking
- **Analytics**: User behavior and system metrics
- **Backups**: Backup management
- **Notifications**: Multi-channel notifications

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- --grep "User Service"
```

## 🚀 Deployment

### Docker Deployment (Planned)

```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Manual Deployment

1. Set up production environment variables
2. Install dependencies: `npm ci --production`
3. Build frontend: `npm run build`
4. Start server: `npm start`

## 📊 Monitoring

- Health check endpoint: `GET /health`
- Analytics dashboard for system metrics
- Error logging and tracking
- Performance monitoring

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting
- CORS protection
- Input validation
- File upload security
- Secure file downloads with tokens

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:
- Email: support@syncsphere.com
- Documentation: [docs.syncsphere.com](https://docs.syncsphere.com)
- Issues: [GitHub Issues](https://github.com/yourusername/syncsphere/issues)

## 🗺 Roadmap

- [ ] Frontend React application
- [ ] Mobile app (React Native)
- [ ] Real-time notifications (WebSocket)
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Cloud storage integration
- [ ] API rate limiting per subscription tier
- [ ] Advanced backup scheduling

---

**Built with ❤️ by the SyncSphere Team**