<div align="center">

# telegram-membership-bot

**Production-grade Telegram membership management with Stripe billing**

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-v0.5.0-brightgreen.svg)](https://github.com/simasjankun/telegram-membership-bot/releases)
[![Node.js](https://img.shields.io/badge/node-24-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/typescript-5.x-blue.svg)](https://www.typescriptlang.org)
[![NestJS](https://img.shields.io/badge/nestjs-11.x-red.svg)](https://nestjs.com)

</div>

---

## Overview

A self-contained backend system that automates access control for paid Telegram communities. One bot manages a private **content channel** and a private **discussion group** — granting or revoking access based on real-time Stripe subscription state.

Built for reliability from day one: idempotent webhook handling, a proper membership state machine, grace periods, automated reminders, safe member removal, and Lithuanian/English localisation.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Journey                            │
│                                                                 │
│  /start → Stripe Checkout → Webhook → join_request → Access    │
│                                                                 │
│  Payment fail → Grace Period → Reminder → Auto-removal         │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  Telegram Layer  │    │  Billing Layer   │    │ Membership Layer │
│                  │    │                  │    │                  │
│  /start          │◄───│  Stripe Checkout │───►│  State Machine   │
│  join_request    │    │  Stripe Billing  │    │  Access Policy   │
│  member removal  │    │  Webhooks        │    │  Grace Periods   │
│  DM notifications│    │  Idempotency     │    │  Tier entitlement│
└──────────────────┘    └──────────────────┘    └──────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Supabase PostgreSQL    │
                    │  users · subscriptions  │
                    │  memberships · events   │
                    └─────────────────────────┘
```

---

## Implemented Features

**Access Control**
- Invite links with `creates_join_request=true` — no permanent links floating around
- `chat_join_request` approval only for subscribers with `ACTIVE` status
- Automatic member removal from channel + group on subscription expiry
- Ban + unban pattern on removal so users can rejoin after resubscribing
- `chat_member` / `my_chat_member` tracking in DB

**Billing**
- Stripe Checkout for new subscriptions
- Full subscription lifecycle via webhooks (`created` / `updated` / `deleted`)
- `invoice.payment_succeeded` / `invoice.payment_failed` handling
- Race condition handling — `checkout.session.completed` fetches subscription directly
- Idempotent event processing — `stripe_event_id` deduplication

**Membership State Machine**

```
INACTIVE → CHECKOUT_STARTED → ACTIVE → PAST_DUE → CANCELED
                                 ↑                     │
                                 └─── resubscribe ──────┘
                                              ↓
                                          BLOCKED
```

**Grace Period & Auto-removal**
- Configurable grace period (`GRACE_PERIOD_DAYS`) set on payment failure
- Cron job (`CRON_SCHEDULE`) checks expired grace periods hourly
- 24-hour warning DM sent once before removal
- Removal logged to `telegram_memberships` with `removed_at` timestamp

**Localisation**
- Lithuanian (`lt`) default, English (`en`) fallback based on Telegram `language_code`
- All bot messages localised — warm, friendly tone in "Jūs" form for LT
- Community name configurable via `COMMUNITY_NAME` env var
- Group welcome message always in Lithuanian

**Notifications (all localised)**
- Subscription activated with join buttons
- Payment failed with grace deadline
- Grace period 24h warning
- Access removed with resubscribe prompt
- Subscription canceled
- Join request approved/declined confirmations

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 24 |
| Language | TypeScript 5 |
| Framework | NestJS 11 |
| Database | PostgreSQL via Supabase |
| ORM | Prisma 6 |
| Cron / Jobs | `@nestjs/schedule` |
| Payments | Stripe Billing + Checkout |
| Messaging | Telegram Bot API (via Telegraf) |
| Hosting (prod) | DigitalOcean droplet + Docker |

---

## Project Structure

```
src/
├── common/
│   ├── bot/
│   │   ├── bot.module.ts              # Global TelegrafModule wrapper
│   │   └── telegram.access.service.ts # Invite links, join approval, removal
│   ├── i18n/
│   │   ├── i18n.module.ts             # Global i18n module
│   │   ├── i18n.service.ts            # t() translation helper
│   │   └── messages.ts                # LT + EN message templates
│   └── prisma/
│       ├── prisma.module.ts
│       └── prisma.service.ts
├── config/
│   ├── configuration.ts
│   └── validation.schema.ts
├── modules/
│   ├── health/                        # GET /health
│   ├── jobs/
│   │   └── expiry.job.ts              # Grace period + removal cron
│   ├── membership/
│   │   └── membership.service.ts      # Stripe event → state machine
│   ├── notifications/
│   │   └── notifications.service.ts   # Localised DM templates
│   ├── stripe/
│   │   ├── stripe.service.ts          # Stripe client + webhook verification
│   │   ├── stripe.checkout.service.ts # Checkout session creation
│   │   └── stripe.webhook.controller.ts
│   └── telegram/
│       ├── telegram.service.ts        # /start handler
│       ├── telegram.update.ts         # Telegraf update handlers
│       └── telegram.webhook.controller.ts
├── app.module.ts
└── main.ts
prisma/
├── schema.prisma
└── migrations/
```

---

## Database Schema

<details>
<summary>View full schema</summary>

```
users
  id, telegram_user_id (unique), telegram_username
  first_name, last_name, language_code
  dm_opt_in, dm_started_at, created_at, updated_at

stripe_customers
  id, user_id → users, stripe_customer_id (unique)

subscriptions
  id, user_id → users, stripe_subscription_id (unique)
  stripe_price_id, status (enum), tier (enum) [v0.6.0]
  current_period_start, current_period_end
  cancel_at_period_end, grace_until, last_stripe_event_at
  created_at, updated_at

telegram_memberships
  id, user_id → users
  discussion_group_chat_id, content_channel_chat_id
  group_member_status (enum), channel_member_status (enum)
  last_verified_at, removed_at

billing_events
  id, stripe_event_id (unique), type, payload_json
  status (enum), processed_at

telegram_events
  id, update_id (unique), type, payload_json
  status (enum), processed_at

message_logs
  id, user_id → users, direction (inbound/outbound)
  channel, template_key, content, created_at
```

</details>

---

## Versioning Roadmap

| Version | Scope | Status |
|---|---|---|
| `v0.1.0` | NestJS scaffold, Prisma schema, Telegram `/start`, DB foundation | ✅ done |
| `v0.2.0` | Stripe Checkout + full webhook pipeline, membership state machine | ✅ done |
| `v0.3.0` | Join request flow, channel/group access control, welcome messages | ✅ done |
| `v0.4.0` | Grace period, 24h reminders, auto-removal cron, configurable intervals | ✅ done |
| `v0.5.0` | Lithuanian/English i18n, UX polish, community name config | ✅ done |
| `v0.6.0` | Two membership tiers (Standard / VIP), VIP badge in group | 🔜 next |
| `v0.7.0` | Admin commands, manual overrides, reconciliation job | 🔜 planned |
| `v1.0.0` | Production deploy — Docker, Nginx, SSL, DigitalOcean | 🔜 planned |

---

## Environment Variables

```bash
# App
NODE_ENV=development
PORT=3000
APP_URL=https://your-app.example.com

# Database (Supabase)
DATABASE_URL=postgresql://...          # Session pooler — used for migrations
DATABASE_POOL_URL=postgresql://...     # Session pooler — used at runtime

# Redis (reserved for future queue use)
REDIS_URL=redis://localhost:6379

# Community
COMMUNITY_NAME=Ieva Voveris Club

# Jobs
CRON_SCHEDULE=0 * * * *               # every hour; use '* * * * *' for testing
GRACE_PERIOD_DAYS=2                   # use 0.002 (~3 min) for testing

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_DISCUSSION_GROUP_ID=         # negative number e.g. -1001234567890
TELEGRAM_CONTENT_CHANNEL_ID=
TELEGRAM_WEBHOOK_SECRET=              # openssl rand -hex 32

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...       # from: stripe listen (dev) or dashboard (prod)
STRIPE_PRICE_ID=price_...             # v0.5.0 — single tier
# STANDARD_STRIPE_PRICE_ID=price_... # v0.6.0 — two tiers
# VIP_STRIPE_PRICE_ID=price_...
```

> Never commit `.env` files. See `.env.example` for a full template.

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start Redis (requires OrbStack or Docker)
docker run -d -p 6379:6379 redis:alpine

# 3. Start ngrok tunnel
ngrok http 3000

# 4. Update APP_URL in .env with ngrok URL

# 5. Start Stripe CLI webhook forwarding
stripe login
stripe listen --forward-to localhost:3000/webhooks/stripe

# 6. Run DB migrations
npm run db:migrate:dev

# 7. Start app
npm run start:dev
```

---

## Security

- Stripe webhook signature verified on every request (`stripe-signature` header)
- Telegram webhook validated via `x-telegram-bot-api-secret-token`
- Identity bound to `telegram_user_id` — never username
- `stripe_event_id` deduplication — idempotent by design
- Telegram `update_id` deduplication
- No persistent invite links — join request flow only
- Ban + unban on removal (not permanent ban)
- All secrets in env — never in source code

---

## License

Licensed under the [Apache License 2.0](LICENSE).
