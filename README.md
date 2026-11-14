# RentNest Backend API

**RentNest** is a robust, backend-only rental property marketplace API built for **Programming Hero Assignment 4**. It features role-based access control (Admin, Landlord, Tenant), rental workflows, database seeding, server-side input validation, global error handling, OpenAPI/Swagger interactive documentation, and complete server-to-server **SSLCommerz payment gateway** integration.

---

## 🛠 Technology Stack

- **Runtime & Language:** Node.js, TypeScript
- **Framework:** Express.js (v5)
- **Database & ORM:** PostgreSQL (Neon Serverless), Prisma ORM (v7) with `@prisma/adapter-neon`
- **Authentication & Security:** JWT (JSON Web Tokens), Bcrypt.js, Helmet, CORS
- **Validation:** Zod v4 (reusable schema validation for body, query, and params)
- **Payment Gateway:** SSLCommerz Sandbox Hosted Checkout & Server-to-Server Validation API
- **API Documentation:** Swagger UI Express, OpenAPI 3.0 (YAML)

---

## 👥 Three Required User Roles

| Role | Responsibilities & Capabilities |
| :--- | :--- |
| **TENANT** | Register, login, view/update profile, browse/filter properties, submit rental requests, view rental history, pay approved rentals via SSLCommerz sandbox, view payments, and post property reviews on completed rentals. |
| **LANDLORD** | Register, login, view/update profile, create and manage property listings (update, delete when without history, change availability status), view own properties, view and approve/reject rental requests, complete active rentals. |
| **ADMIN** | Log in using seeded credentials, monitor all marketplace users, ban/unban users, monitor all properties, view all rental requests, manage categories (CRUD), and monitor all payment transactions with revenue analytics. Cannot be assigned via public registration. |

---

## 🔑 Pre-Seeded Test Accounts

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@rentnest.com` | `15025` | Full administrative control |
| **TENANT** | `tenant@example.com` | `TenantPass123!` | Property search, rental requests, payments, reviews |
| **LANDLORD** | `landlord@example.com` | `LandlordPass123!` | Property listing, request approvals, rental completion |

---

## 💳 SSLCommerz Payment Integration Lifecycle

1. **Rental Request Approval:** A tenant submits a rental request for an available property. The landlord reviews and marks it `APPROVED`.
2. **Session Initialization (`POST /api/payments/create`):**
   - The backend validates that the rental request is approved and the property is available.
   - If an existing pending session was previously validated at SSLCommerz, it auto-reconciles immediately.
   - If previous attempts failed or timed out, a fresh attempt with a unique merchant transaction reference (`RN...`) is created.
   - Calls SSLCommerz `/gwprocess/v4/api.php` and returns the hosted checkout URL (`GatewayPageURL`).
3. **Checkout & Card Simulator:** The tenant visits the `GatewayPageURL`, selects payment options (bKash, Nagad, or Test Visa cards in sandbox), and completes payment.
4. **Server-to-Server Verification (`POST /api/payments/confirm` / `/api/payments/ipn`):**
   - Receives gateway callbacks and IPN hooks.
   - Queries SSLCommerz transaction verification server API (`validationserverAPI.php`) using the gateway `val_id`.
   - Verifies transaction reference, Decimal amount, currency (`BDT`), and fraud risk level.
   - In a serializable database transaction:
     - Updates payment status to `COMPLETED` and saves bank transaction ID.
     - Sets rental request to `ACTIVE`.
     - Marks property status to `RENTED`.
     - Automatically cancels all competing pending rental requests for that property.

---

## 📂 Project Architecture

```
rentnest_backend/
├── docs/
│   └── openapi.yaml           # Complete OpenAPI 3.0 specification
├── prisma/
│   ├── migrations/            # Version-controlled SQL migrations
│   ├── schema.prisma          # Database models, relations & enums
│   └── seed.ts                # Idempotent database seeder (Admin, Tenant, Landlord, Categories)
├── src/
│   ├── controllers/           # HTTP Request handlers
│   │   ├── admin.controller.ts
│   │   ├── auth.controller.ts
│   │   ├── category.controller.ts
│   │   ├── payment.controller.ts
│   │   ├── property.controller.ts
│   │   ├── rental.controller.ts
│   │   └── review.controller.ts
│   ├── middlewares/           # Auth, error handling, input validation
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── validate.middleware.ts
│   ├── routes/                # Modular Express routers
│   ├── services/              # External service integrations (SSLCommerz)
│   ├── utils/                 # AppError, JWT sign/verify
│   ├── validations/           # Zod validation schemas
│   ├── app.ts                 # Express application setup
│   └── server.ts              # Entry point & port listener
├── .env.example               # Sanitized environment template
├── package.json
└── tsconfig.json
```

---

## 🚀 Installation & Local Setup

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd rentnest_backend
npm install
```

### 2. Environment Variables Configuration
Copy `.env.example` to `.env` and fill in your database credentials:
```bash
cp .env.example .env
```
Ensure the following keys are defined:
```ini
PORT=5000
DATABASE_URL="your-postgresql-url"
DIRECT_URL="your-postgresql-direct-url"

ADMIN_NAME="RentNest Admin"
ADMIN_EMAIL="admin@rentnest.com"
ADMIN_PASSWORD="15025"

JWT_ACCESS_SECRET="your-super-secret-random-key-with-at-least-32-chars"

SSLCOMMERZ_STORE_ID="your_store_id"
SSLCOMMERZ_STORE_PASSWORD="your_store_password"
SSLCOMMERZ_IS_LIVE=false

API_BASE_URL="http://localhost:5000"
```

### 3. Database Migration & Seeding
```bash
# Generate Prisma Client
npm run db:generate

# Run Migrations
npm run db:migrate

# Seed Database (Admin, Tenant, Landlord test accounts and categories)
npm run db:seed
```

### 4. Start Development Server
```bash
npm run dev
```
The server will start on `http://localhost:5000`.

---

## 📖 API Documentation (Swagger UI)

Interactive Swagger / OpenAPI 3.0 documentation is available at:
```
http://localhost:5000/api/docs
```
It includes all endpoints, query parameters, request bodies, role authorization badges (Bearer Token), and schemas.

---

## 🧪 Testing

### Typecheck & Compilation
```bash
# Run TypeScript type check
npm run typecheck

# Production build verification
npm run build
```

---

## 📋 Assignment Submission Checklist

- [x] **Backend GitHub Repository:** All source code and version control.
- [x] **20+ Meaningful Backend Commits:** Clean, descriptive history spanning all features (>38 commits).
- [x] **Working Admin Credentials:** `admin@rentnest.com` / `15025` seeded and operational.
- [x] **Test Accounts:** Verified credentials for Tenant (`tenant@example.com`) and Landlord (`landlord@example.com`).
- [x] **Complete Role-Based Authorization:** Strict protection for Admin, Landlord, and Tenant routes.
- [x] **Consistent Error Format:** `{ "success": false, "message": "...", "errorDetails": null }` globally enforced.
- [x] **Real SSLCommerz Payment Integration:** Live sandbox checkout and server-to-server verification working.
- [x] **OpenAPI / Swagger Documentation:** Fully documented at `/api/docs`.
