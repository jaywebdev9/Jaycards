# SMS Credit SaaS

Prepaid multi-tenant SMS credit platform for Tanzanian businesses. A business registers, buys SMS credits, sends SMS through a provider adapter, and sees delivery status after the provider webhook. The platform records usage and estimated gross margin.

This V1 is scoped to the first paying customer. It does not include WhatsApp, CRM, campaigns, or a public developer API.

## Stack

- Next.js 14 App Router, TypeScript, Tailwind CSS
- PostgreSQL and Prisma
- httpOnly JWT session cookie (not localStorage)
- SMS provider interface with Beem and sandbox adapters
- Payment provider interface with Selcom and signed sandbox adapters
- In-process SMS queue, drained by the API response path and `npm run worker` or Vercel cron

## Architecture

```
Business UI
  -> POST /api/payments/create
  -> PaymentProvider.createPayment
  -> provider webhook POST /api/webhooks/payment
  -> verify signature, idempotent credit of wallet
  -> POST /api/messages/send
  -> lock wallet, deduct integer credits, write ledger, queue messages
  -> SMS worker -> SmsProvider.sendSms
  -> provider webhook POST /api/webhooks/sms
  -> message status updated
```

Every tenant query is filtered by `businessId` on the server. Admin routes require `PLATFORM_ADMIN`.

## Local development

```bash
cp .env.example .env
docker compose up -d
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

In another terminal, for a dedicated worker:

```bash
npm run worker
```

Development credentials are local only and must be changed before any shared deployment:

- Admin: `admin@smscredit.local` / `ChangeMeAdmin123!`
- Demo hotel: `hotel@demo.local` / `ChangeMeHotel123!`

## Environment variables

See `.env.example`.

SMS credentials go only in server environment variables:

- `SMS_PROVIDER=beem`
- `BEEM_API_KEY`
- `BEEM_SECRET_KEY`
- `BEEM_SENDER_ID`
- `BEEM_WEBHOOK_SECRET` optional HMAC secret for delivery webhooks

Payment credentials go only in server environment variables:

- `PAYMENT_PROVIDER=selcom`
- `PAYMENT_API_KEY`
- `PAYMENT_SECRET`
- `PAYMENT_VENDOR_ID`
- `PAYMENT_API_URL`
- `PAYMENT_SANDBOX=false` for live checkout

Never put these values in frontend code or commit `.env`.

## Sandbox vs live

`SMS_PROVIDER=sandbox` accepts a send and returns a provider message id. It does not mark the message delivered. Delivery changes only when a signed payload hits `/api/webhooks/sms`. The messages page can request that signed webhook while sandbox mode is on.

`PAYMENT_PROVIDER=sandbox` opens `/pay/checkout/[orderId]`. That page does not credit the wallet. It calls `/api/payments/sandbox-complete`, which signs the payload with `PAYMENT_SECRET` and posts it to `/api/webhooks/payment`. Credits are added only if signature verification and the pending-status lock succeed. A repeated webhook does not add credits again.

For the first live customer set `SMS_PROVIDER=beem` and `PAYMENT_PROVIDER=selcom` with real credentials, and set `PAYMENT_SANDBOX=false`.

## Webhooks

- SMS delivery: `POST {APP_URL}/api/webhooks/sms`
- Payment: `POST {APP_URL}/api/webhooks/payment`

Configure those URLs in Beem and Selcom. Beem send uses `https://apisms.beem.africa/v1/send` with HTTP Basic auth. Selcom checkout uses the create-order-minimal endpoint and signed callback headers.

## Queue and deployment

Recommended hosting is Vercel plus Neon Postgres.

1. Create a Neon database and set `DATABASE_URL`.
2. Set `AUTH_SECRET`, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`, provider secrets.
3. Run `npx prisma migrate deploy` and `npm run db:seed` only for a non-production demo.
4. Deploy. `vercel.json` calls `/api/internal/process-queue` every minute with `Authorization: Bearer $CRON_SECRET`.

For a long-running worker, set `REDIS_URL` later and keep `npm run worker` on a small VM. The current queue is in-process plus the cron drain, which is enough for the first customers. Do not send bulk SMS inside a request handler beyond creating records and enqueueing.

## Margin

Configurable assumptions live in `PricingConfig`:

- `customerSmsPrice` default 25 TZS
- `providerSmsCost` default 18 TZS
- estimated gross margin per SMS = customer price minus provider cost

Admin revenue uses SMS usage volume times those values. It is labeled estimated gross margin because gateway fees, taxes, refunds, and real provider invoices are not included.

## Tests

```bash
npm test
```

Critical rules covered in unit tests: segmentation, phone normalization, webhook signature, payment credit only from `PENDING`, margin math. Wallet deduction and idempotent credit use a database transaction with `SELECT ... FOR UPDATE` and `updateMany` on `status = PENDING`.

## Production checklist

- Change seed passwords or do not seed production
- `PAYMENT_SANDBOX=false` and `SMS_PROVIDER=beem`
- HTTPS app URL
- Webhooks reachable and secrets set
- `AUTH_SECRET` and `CRON_SECRET` rotated
- No `.env` committed
- Prisma migration applied
- First hotel flow: register, pay, balance increases once, send, provider accepts, webhook sets DELIVERED, admin margin updates

## API

Auth: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`

Business: `GET/PATCH /api/business`

Wallet: `GET /api/wallet`, `GET /api/wallet/transactions`, `GET /api/pricing`

Payments: `GET /api/payments`, `POST /api/payments/create`, `GET /api/payments/:id`

Messages: `POST /api/messages/send`, `GET /api/messages`, `GET /api/messages/:id`

Webhooks: `POST /api/webhooks/sms`, `POST /api/webhooks/payment`

Admin: `GET /api/admin/businesses`, `GET /api/admin/messages`, `GET /api/admin/payments`, `GET /api/admin/analytics`, `GET/PATCH /api/admin/pricing`, `GET /api/admin/audit`, `POST /api/admin/businesses/:id/suspend`, `POST /api/admin/businesses/:id/activate`, `POST /api/admin/wallet/adjust`

Errors use `{ success: false, error: { code, message } }`.
