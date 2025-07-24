# SyncSphere Backend

A comprehensive data recovery and phone transfer platform backend built with Node.js, Express, and PostgreSQL.

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Set up database
npm run db:setup
npm run db:create
npm run db:init

# Start development server
npm run dev
```

## Testing

### Quick Testing Commands

```bash
# Run unit tests (with mocks)
npm test

# Run integration tests (real database)
npm run test:integration:nomocks

# Run all tests (unit + integration)
npm run test:all

# Run tests with coverage
npm run test:coverage
```

### Testing Strategy

We use two different Jest configurations:

- **Unit Tests**: Use `jest.config.js` with database mocking for fast, isolated testing
- **Integration Tests**: Use `jest.config.nomocks.js` with real database connections for end-to-end testing

**📖 For detailed testing guidelines, see [docs/TESTING_GUIDE.md](./docs/TESTING_GUIDE.md)**

## Project Structure

```
src/
├── controllers/     # Request handlers
├── middleware/      # Express middleware
├── models/         # Database models
├── routes/         # API route definitions
├── services/       # Business logic
├── utils/          # Utility functions
├── config/         # Configuration files
└── validators/     # Input validation

tests/
├── unit/           # Unit tests (mocked)
├── integration/    # Integration tests (real DB)
├── fixtures/       # Test data
└── utils/          # Test utilities

docs/
├── API_DOCS.md
├── TESTING_GUIDE.md
└── ...
```

## Available Scripts

### Development
- `npm run dev` - Start development server with hot reload
- `npm start` - Start production server

### Testing
- `npm test` - Run unit tests
- `npm run test:integration` - Run integration tests
- `npm run test:all` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

### Database
- `npm run db:setup` - Set up PostgreSQL
- `npm run db:create` - Create database
- `npm run db:init` - Initialize schema
- `npm run db:reset` - Reset database
- `npm run db:test` - Test database connection

### Code Quality
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier

## API Documentation

The API follows RESTful conventions with the following base structure:

```
GET    /api/v1/auth/me
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout

GET    /api/v1/devices
POST   /api/v1/devices/register
GET    /api/v1/devices/:id
PUT    /api/v1/devices/:id
DELETE /api/v1/devices/:id

# ... more endpoints
```

For complete API documentation, see [docs/API_DOCS.md](./docs/API_DOCS.md)

## Environment Variables

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5433
DB_NAME=syncsphere
DB_USER=postgres
DB_PASSWORD=your_password

# Authentication
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# Security
ENCRYPTION_KEY=your_encryption_key
ENABLE_REGISTRATION=true

# External Services
REDIS_URL=redis://localhost:6379
STRIPE_SECRET_KEY=sk_test_...
```

## Database Schema

The application uses PostgreSQL with the following main tables:

- `users` - User accounts and authentication
- `devices` - Registered devices
- `device_activity_logs` - Device activity tracking
- `backup_sessions` - Data backup sessions
- `recovery_sessions` - Data recovery sessions

For complete schema documentation, see [docs/DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md)

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting
- CORS protection
- Helmet security headers
- Input validation and sanitization
- SQL injection prevention

## Development Guidelines

### Code Style
- Use ESLint and Prettier for consistent formatting
- Follow RESTful API conventions
- Write comprehensive tests for new features
- Use meaningful commit messages

### Testing Best Practices
- Write unit tests for business logic
- Write integration tests for API endpoints
- Use the appropriate Jest configuration (mocked vs real DB)
- Clean up test data properly
- See [docs/TESTING_GUIDE.md](./docs/TESTING_GUIDE.md) for detailed guidelines

### Database Best Practices
- Use parameterized queries to prevent SQL injection
- Implement proper indexing for performance
- Use transactions for data consistency
- Follow naming conventions (snake_case for columns)

## Troubleshooting

### Common Issues

**Database Connection Issues**
```bash
# Test database connection
npm run db:test

# Check PostgreSQL status
sudo systemctl status postgresql
# or on Windows:
net start postgresql-x64-14
```

**Test Failures**
```bash
# Clear Jest cache
npx jest --clearCache

# Run tests with verbose output
npm test -- --verbose

# Check testing guide for authentication issues
cat docs/TESTING_GUIDE.md
```

**Port Already in Use**
```bash
# Find process using port 3000
lsof -i :3000
# or on Windows:
netstat -ano | findstr :3000

# Kill the process
kill -9 <PID>
# or on Windows:
taskkill /PID <PID> /F
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## Documentation

- [API Documentation](./docs/API_DOCS.md)
- [Testing Guide](./docs/TESTING_GUIDE.md)
- [Database Schema](./docs/DATABASE_SCHEMA.md)
- [Backend Stack](./docs/BACKEND_STACK.md)
- [Platform Architecture](./docs/PLATFORM_ARCHITECTURE.md)

## License

ISC License