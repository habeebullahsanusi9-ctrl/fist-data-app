# FIST DATA

FIST DATA is a Next.js 16 Nigerian data-reselling MVP backed by Neon Postgres on Vercel.

## Current build
- User registration/login with secure server-side password hashing and sessions
- Neon-backed users and wallets
- Database-backed data plans
- Wallet balance display
- Transaction history
- Data purchase workflow that records pending purchases and deducts wallet balance after a balance check

## Still required before real sales
- Payment gateway (e.g. Paystack/Flutterwave) for wallet funding
- Telecom/VTU API for actual data fulfilment
- Production-grade fraud/rate-limit controls
- Admin authentication and controls

Set `DATABASE_URL` in Vercel. The Neon integration can inject this automatically.
