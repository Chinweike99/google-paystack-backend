# Google Sign-In & Paystack Payment API

A NestJS-based backend API that provides Google OAuth authentication and Paystack payment integration. This application allows users to authenticate via Google Sign-In and process payments through Paystack.

## Features

- 🔐 **Google OAuth 2.0 Authentication**
  - Secure Google Sign-In integration
  - User profile management
  - Token management (access & refresh tokens)

- 💳 **Paystack Payment Integration**
  - Initialize payment transactions
  - Verify payment status
  - Webhook handling for real-time payment updates
  - Transaction history tracking

- 📊 **Database Management**
  - PostgreSQL database with TypeORM
  - User and transaction entities
  - Automated migrations

- 📝 **API Documentation**
  - Swagger/OpenAPI documentation
  - Interactive API explorer at `/api`

## Tech Stack

- **Framework**: NestJS 11.x
- **Database**: PostgreSQL with TypeORM
- **Authentication**: Google OAuth 2.0 (Passport.js)
- **Payment Gateway**: Paystack
- **Validation**: class-validator, class-transformer
- **Documentation**: Swagger/OpenAPI
- **Package Manager**: pnpm

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL database
- Google Cloud Console project (for OAuth credentials)
- Paystack account (for payment processing)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd google-paystack-backend
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory with the following variables:

   ```env
   # Application
   PORT=3000
   NODE_ENV=development

   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=your_db_username
   DB_PASSWORD=your_db_password
   DB_NAME=your_db_name

   # Google OAuth
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

   # Paystack Configuration
   PAYSTACK_SECRET_KEY=your_paystack_secret_key
   PAYSTACK_PUBLIC_KEY=your_paystack_public_key
   PAYSTACK_API_URL=https://api.paystack.co
   PAYSTACK_CALLBACK_URL=http://localhost:3000/payments/paystack/callback
   ```

4. **Set up the database**
   
   Ensure PostgreSQL is running and create the database:
   ```bash
   createdb your_db_name
   ```

## Running the Application

### Development Mode
```bash
pnpm run start:dev
```

### Production Mode
```bash
pnpm run build
pnpm run start:prod
```

### Debug Mode
```bash
pnpm run start:debug
```

The application will start on `http://localhost:3000` (or the port specified in your `.env` file).

## API Documentation

Once the application is running, access the Swagger documentation at:
```
http://localhost:3000/api
```

## API Endpoints

### Authentication

#### **Initiate Google Sign-In**
```http
GET /auth/google
```
Returns the Google authentication URL for user sign-in.

**Response:**
```json
{
  "google_auth_url": "https://accounts.google.com/o/oauth2/auth?...",
  "message": "Use this URL to authenticate with Google"
}
```

#### **Google OAuth Callback**
```http
GET /auth/google/callback?code={authorization_code}
```
Handles the Google OAuth callback and creates/updates user in the database.

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "picture": "https://...",
    "emailVerified": true
  },
  "message": "Authentication successful"
}
```

### Payments

#### **Initialize Payment**
```http
POST /payments/paystack/initiate
```
Initialize a new Paystack payment transaction.

**Request Body:**
```json
{
  "userId": "user-uuid",
  "amount": 5000,
  "metadata": {
    "productId": "prod-123",
    "orderId": "order-456"
  }
}
```

**Response:**
```json
{
  "status": true,
  "message": "Authorization URL created",
  "data": {
    "authorization_url": "https://checkout.paystack.com/...",
    "access_code": "...",
    "reference": "..."
  }
}
```

#### **Verify Payment**
```http
GET /payments/paystack/verify/:reference
```
Verify the status of a payment transaction.

**Response:**
```json
{
  "status": true,
  "message": "Verification successful",
  "data": {
    "reference": "...",
    "status": "success",
    "amount": 5000,
    "paid_at": "2024-01-01T00:00:00Z"
  }
}
```

#### **Get User Transactions**
```http
GET /payments/user/:userId/transactions?status=success&limit=10&offset=0
```
Retrieve transaction history for a specific user.

#### **Paystack Webhook**
```http
POST /payments/paystack/webhook
```
Handles Paystack webhook events for real-time payment updates.

## Database Schema

### User Entity
```typescript
{
  id: UUID (PK)
  googleId: string (unique)
  email: string (unique)
  name: string
  picture: string
  emailVerified: boolean
  accessToken: string
  refreshToken: string
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Transaction Entity
```typescript
{
  id: UUID (PK)
  reference: string (unique)
  amount: decimal
  status: enum (pending, success, failed, abandoned)
  currency: string
  channel: string
  gatewayResponse: string
  paidAt: timestamp
  userId: UUID (FK)
  metadata: jsonb
  createdAt: timestamp
  updatedAt: timestamp
}
```

## Testing

```bash
# Unit tests
pnpm run test

# E2E tests
pnpm run test:e2e

# Test coverage
pnpm run test:cov
```

## Project Structure

```
src/
├── auth/                    # Authentication module
│   ├── auth.controller.ts   # Google auth endpoints
│   ├── auth.service.ts      # Google OAuth logic
│   └── auth.module.ts
├── payments/                # Payments module
│   ├── payments.controller.ts  # Payment endpoints
│   ├── payments.service.ts     # Paystack integration
│   ├── payments.module.ts
│   └── dto/
│       └── initializepay.dto.ts
├── config/                  # Configuration files
│   ├── database.config.ts
│   ├── database.module.ts
│   ├── google.config.ts
│   └── paystack.config.ts
├── entities/                # Database entities
│   ├── user.entity.ts
│   └── transaction.entity.ts
├── app.module.ts           # Root module
└── main.ts                 # Application entry point
```

## Configuration

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs: `http://localhost:3000/auth/google/callback`
6. Copy the Client ID and Client Secret to your `.env` file

### Paystack Setup

1. Sign up at [Paystack](https://paystack.com/)
2. Navigate to Settings > API Keys & Webhooks
3. Copy your Secret Key and Public Key
4. Set up webhook URL: `http://your-domain.com/payments/paystack/webhook`
5. Add keys to your `.env` file

## Security Considerations

- Store sensitive keys in environment variables
- Use HTTPS in production
- Validate webhook signatures from Paystack
- Implement rate limiting for API endpoints
- Use secure session management
- Keep dependencies updated

## Scripts

```bash
# Development
pnpm run start:dev          # Start with hot-reload
pnpm run start:debug        # Start in debug mode

# Production
pnpm run build              # Build the project
pnpm run start:prod         # Start production server

# Code Quality
pnpm run lint               # Run ESLint
pnpm run format             # Format code with Prettier

# Testing
pnpm run test               # Run unit tests
pnpm run test:watch         # Run tests in watch mode
pnpm run test:cov           # Generate coverage report
pnpm run test:e2e           # Run e2e tests
```