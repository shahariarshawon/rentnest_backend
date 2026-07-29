# RentNest Backend API

RentNest is a backend-only rental property marketplace built with Node.js, Express, TypeScript, PostgreSQL, Prisma, JWT, Zod, Swagger/OpenAPI, and Stripe Checkout.

## Roles

- **Tenant:** browse properties, submit rental requests, pay approved requests, view payment/rental history, and review completed rentals.
- **Landlord:** create and manage property listings, approve or reject requests, view tenant/rental history, and complete active rentals.
- **Admin:** view users, ban/unban accounts, view all properties and rentals, and manage categories.

## Main URLs

After deployment, replace `<BASE_URL>` with the Vercel URL:

- Health: `<BASE_URL>/api/health`
- Swagger UI: `<BASE_URL>/api/docs`
- OpenAPI JSON: `<BASE_URL>/api/docs.json`
- Stripe webhook: `<BASE_URL>/api/payments/webhook`

## Requirements

- Node.js 22.x
- pnpm 10.17.1
- PostgreSQL database, preferably with both a pooled runtime URL and a direct migration URL
- Stripe test or live account

## Environment Variables

Copy `.env.example` to `.env` for local development. Never commit or upload `.env`.

```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://USER:PASSWORD@POOLER_HOST:5432/DATABASE?sslmode=require
DIRECT_URL=postgresql://USER:PASSWORD@DIRECT_HOST:5432/DATABASE?sslmode=require
JWT_SECRET=replace-with-at-least-32-random-characters
JWT_EXPIRES_IN=7d
APP_URL=http://localhost:5000
STRIPE_SECRET_KEY=sk_test_replace_with_real_key
STRIPE_WEBHOOK_SECRET=whsec_replace_with_real_secret
ADMIN_EMAIL=admin@rentnest.com
ADMIN_PASSWORD=replace-with-a-strong-password
ADMIN_NAME=RentNest Admin
```

For Vercel, add every variable in **Project Settings → Environment Variables** for Production and Preview. Use the provider's pooled connection string for `DATABASE_URL`, its direct/non-pooler connection string for `DIRECT_URL`, and set `APP_URL` to the deployed HTTPS URL rather than localhost. Prisma CLI migration commands read `DIRECT_URL`; the running API and seed script use `DATABASE_URL`.

## Local Setup

```bash
pnpm install --frozen-lockfile
pnpm prisma:generate
pnpm prisma:deploy
pnpm prisma:seed
pnpm dev
```

The seed command creates or updates the admin account from `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_NAME`, and creates the default categories.

## Build Check

```bash
pnpm build
pnpm preflight
```

## Stripe Setup

1. Put a real Stripe secret key in `STRIPE_SECRET_KEY`.
2. Deploy the API.
3. In Stripe Dashboard, create a webhook endpoint:
   - URL: `https://<your-domain>/api/payments/webhook`
   - Events: `checkout.session.completed` and `checkout.session.async_payment_succeeded`
4. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET` in Vercel.
5. Redeploy after changing environment variables.

The API does **not** use simulated payment sessions. A payment becomes completed only after Stripe marks the Checkout session paid and the API verifies the session amount, currency, rental reference, and signature or server-side session retrieval.

## Payment Test Flow

1. Register and login as landlord.
2. Create a property.
3. Register and login as tenant.
4. Submit a rental request.
5. Landlord approves the request.
6. Tenant calls `POST /api/payments/create` and opens `checkoutUrl`.
7. Pay with a Stripe test card.
8. Stripe webhook updates the payment to `COMPLETED` and rental to `ACTIVE`.
9. Alternatively, the tenant may call `POST /api/payments/confirm` with both `rentalRequestId` and the real `stripeSessionId`; the server retrieves and verifies the session from Stripe.
10. Landlord marks the active rental completed using `PATCH /api/landlord/requests/:id/complete`.
11. Tenant can then leave one review.

## Vercel Deployment

1. Push this project to GitHub.
2. Import the repository into Vercel.
3. Keep the project root at the folder containing `package.json`.
4. Add all environment variables, including pooled `DATABASE_URL` and direct `DIRECT_URL`.
5. Select Node.js 22.x.
6. Deploy. The Vercel build applies migrations and runs the idempotent admin/category seed.
7. Confirm `<BASE_URL>/api/health` and `<BASE_URL>/api/docs`.
8. Configure the Stripe webhook and redeploy if needed.

The project includes:

- a corrected single-document `pnpm-lock.yaml`
- a pinned pnpm version
- Prisma generation during installation
- direct database access for Prisma migrations, plus pooled runtime access
- Prisma migration deployment and idempotent admin/category seeding during the Vercel build
- a Vercel serverless Express entry point
- Swagger YAML explicitly included in the function bundle

## API Documentation

Swagger documents authentication, users, categories, public properties, landlord properties, rentals, verified payments, reviews, and admin endpoints. All handled errors follow this format:

```json
{
  "success": false,
  "message": "Validation failed",
  "errorDetails": [
    {
      "field": "email",
      "message": "Please provide a valid email address"
    }
  ]
}
```

## Submission Credentials Template

Do not publish the real password in source code. Put the actual values in the submission form or private instructor message.

```text
Backend Repo   : https://github.com/<username>/rentnest-backend
Live API       : https://<project>.vercel.app
API Docs       : https://<project>.vercel.app/api/docs
Demo Video     : <video-link>
Admin Email    : <ADMIN_EMAIL used during seed>
Admin Password : <ADMIN_PASSWORD used during seed>
```

## Mandatory Requirement Checklist

- [x] Swagger/OpenAPI documentation for all implemented routes
- [x] Consistent `{ success, message, errorDetails }` error responses
- [x] 20 meaningful Git commits in the packaged repository
- [x] Server-side Zod validation and validation messages
- [x] Admin seed credentials supplied through environment variables
- [x] Real Stripe Checkout, server-side verification, and signed webhook
- [x] Prisma schema, migration, and seed script
- [x] JWT authentication and role-based authorization
- [ ] Add final GitHub, live API, video, and admin credentials to the submission form

## Security

- Rotate any database, JWT, Stripe, or admin secret that has previously been shared in a ZIP, screenshot, chat, or public repository.
- Never commit `.env`.
- Use Stripe test keys for demonstrations unless production payments are intended.
- Use a pooled PostgreSQL connection URL on serverless hosting.
