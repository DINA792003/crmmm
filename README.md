# DCT CRM

Enterprise Multi-Tenant CRM Platform with AI Intelligence

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Node.js, TypeScript, Express
- **Database**: PostgreSQL, Prisma ORM
- **AI Service**: Python, FastAPI, OpenAI
- **Testing**: Vitest, Playwright, Pytest

## Features

- Multi-tenant architecture
- Role-based access control (RBAC)
- Complete CRM lifecycle (Lead → Booking)
- Site visit management
- Sales pipeline
- Quotation & approval workflow
- Booking & payment management
- Real-time dashboards
- Enterprise reporting
- AI-powered analytics
- Global search
- Audit logging

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Python 3.9+

### Installation

```bash
# Install dependencies
npm install

# Setup database
npm run db:generate
npm run db:push
npm run db:seed

# Start development servers
npm run dev
```

### Default Login

- **Email**: admin@dctcrm.com
- **Password**: password123

## Project Structure

```
dct-crm/
├── apps/
│   ├── web/          # Next.js frontend
│   ├── api/          # Node.js backend
│   └── ai/           # Python AI service
├── packages/
│   ├── shared/       # Shared types and utilities
│   └── db/           # Prisma schema and client
└── prisma/           # Database migrations
```

## Development

```bash
# Start all services
npm run dev

# Start specific service
npm run dev:web
npm run dev:api
npm run dev:ai

# Database
npm run db:generate
npm run db:push
npm run db:seed
npm run db:studio

# Testing
npm run test
npm run test:web
npm run test:api

# Linting
npm run lint
npm run typecheck
```

## API Documentation

The API runs on `http://localhost:3001` and follows REST conventions.

### Authentication

```bash
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me
```

### CRM Endpoints

- `/api/leads` - Lead management
- `/api/contacts` - Contact management
- `/api/accounts` - Account management
- `/api/customers` - Customer management
- `/api/site-visits` - Site visit scheduling
- `/api/opportunities` - Sales pipeline
- `/api/quotations` - Quotation management
- `/api/bookings` - Booking management
- `/api/payments` - Payment tracking
- `/api/projects` - Project management
- `/api/units` - Unit inventory

### Analytics

- `/api/analytics/leads` - Lead analytics
- `/api/analytics/bookings` - Booking analytics
- `/api/analytics/payments` - Payment analytics
- `/api/analytics/pipeline` - Pipeline analytics

### AI Service

The AI service runs on `http://localhost:8001` and provides natural language query capabilities.

```bash
POST /api/ai/chat
{
  "message": "How many new leads today?",
  "conversation_id": "optional-conversation-id"
}
```

## Security

- Multi-tenant data isolation
- Role-based access control
- Server-side authorization
- Audit logging
- Secure session management
- No direct database access from frontend/AI

## License

Proprietary - DCT Real Estate
