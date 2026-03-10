<div align="center">

# telegram-membership-bot

**Production-grade Telegram membership management with Stripe billing**

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-v0.6.0-brightgreen.svg)](https://github.com/simasjankun/telegram-membership-bot/releases)
[![Node.js](https://img.shields.io/badge/node-24-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/typescript-5.x-blue.svg)](https://www.typescriptlang.org)
[![NestJS](https://img.shields.io/badge/nestjs-11.x-red.svg)](https://nestjs.com)

</div>

---

## Overview

A self-contained backend system that automates access control for paid Telegram communities. One bot manages a private **content channel** and a private **discussion group** — granting or revoking access based on real-time Stripe subscription state.

Supports two membership tiers, Lithuanian/English localisation, grace periods, automated reminders, and safe member removal.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Journey                            │
│                                                                 │
│  /start → Pick tier → Stripe Checkout → Webhook → Access       │
│                                                                 │
│  Payment fail → Grace Period → Reminder → Auto-removal         │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  Telegram Layer  │    │  Billing Layer   │    │ Membership Layer │
│                  │    │                  │    │                  │
│  /start          │◄───│  Stripe Checkout │───►│  State Machine   │
│  join_request    │    │  Stripe Billing  │    │  Tier entitlement│
│  member removal  │    │  Webhooks        │    │  Grace Periods   │
│  DM notifications│    │  Idempotency     │    │  Access Policy   │
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

## Membership Tiers

| Tier | Price | Included |
|---|---|---|
| 🌿 **Inner Light** | 29 €/mėn. | Channel + group access |
| 🌸 **Inner Light Plus** | 49 €/mėn. | Channel + group + 1h personal consultation/month |

Both tiers use the same access control logic. Tier is stored on the subscription and passed via Stripe Checkout metadata.

---

## Implemented Features

**Access Control**
- Invite links with `creates_join_request=true` — no permanent links
- `chat_join_request` approval only for `ACTIVE` subscribers
- Automatic removal from channel + group on expiry
- Ban + unban on removal so users can rejoin after resubscribing

**Billing**
- Stripe Checkout with tier selection (callback buttons) before payment
- Full subscription lifecycle via webhooks
- Race condition handling — `checkout.session.completed` fetches subscription directly
- Idempotent event processing — `stripe_event_id` deduplication

**Membership State Machine**

```
INACTIVE → CHECKOUT_STARTED → ACTIVE → PAST_DUE → CANCELED
                                 ↑                     │
                                 └─── resubscribe ──────┘
```

**Grace Period & Auto-removal**
- Configurable `GRACE_PERIOD_DAYS` set on payment failure
- Cron job checks expired grace periods (`CRON_SCHEDULE`)
- 24h warning DM before removal

**Localisation**
- Lithuanian (`lt`) default, English (`en`) fallback
- All messages warm and friendly in "Jūs" form
- Community name and package names fully configurable via env

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
| Messaging | Telegram Bot API (Telegraf) |
| Hosting (prod) | DigitalOcean + Docker |

---

## Project Structure

```
src/
├── common/
│   ├── bot/
│   │   ├── bot.module.ts              # Global TelegrafModule wrapper
│   │   └── telegram.access.service.ts # Invite links, join approval, removal
│   ├── i18n/
│   │   ├── i18n.module.ts
│   │   ├── i18n.service.ts            # t() with communityName + packageNames
│   │   └── messages.ts                # LT + EN message templates
│   └── prisma/
├── config/
├── modules/
│   ├── health/
│   ├── jobs/                          # ExpiryJob cron
│   ├── membership/                    # Stripe event → state machine + tier
│   ├── notifications/                 # Localised DMs
│   ├── stripe/                        # Checkout (tier-aware), webhooks
│   └── telegram/                      # /start, tier selection, update handlers
├── app.module.ts
└── main.ts
prisma/
└── schema.prisma
```

---

## Versioning Roadmap

| Version | Scope | Status |
|---|---|---|
| `v0.1.0` | NestJS scaffold, Prisma schema, Telegram `/start` | ✅ |
| `v0.2.0` | Stripe Checkout + webhook pipeline | ✅ |
| `v0.3.0` | Join request flow, channel/group access control | ✅ |
| `v0.4.0` | Grace period, reminders, auto-removal cron | ✅ |
| `v0.5.0` | Lithuanian/English i18n, UX polish | ✅ |
| `v0.6.0` | Two membership tiers (Inner Light / Inner Light Plus) | ✅ |
| `v0.7.0` | Admin commands, reconciliation job | 🔜 next |
| `v1.0.0` | Production deploy — Docker, Nginx, SSL, DigitalOcean | 🔜 planned |

---

## Environment Variables

```bash
# App
NODE_ENV=development
PORT=3000
APP_URL=https://your-app.example.com

# Database (Supabase — session pooler for both)
DATABASE_URL=postgresql://...
DATABASE_POOL_URL=postgresql://...

# Redis
REDIS_URL=redis://localhost:6379

# Community
COMMUNITY_NAME=Inner Light
STANDARD_PACKAGE_NAME=Inner Light
VIP_PACKAGE_NAME=Inner Light Plus

# Jobs
CRON_SCHEDULE=0 * * * *          # use '* * * * *' for testing
GRACE_PERIOD_DAYS=2               # use 0.002 for testing

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_DISCUSSION_GROUP_ID=
TELEGRAM_CONTENT_CHANNEL_ID=
TELEGRAM_WEBHOOK_SECRET=

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STANDARD_STRIPE_PRICE_ID=price_...
VIP_STRIPE_PRICE_ID=price_...
STANDARD_PRICE_DISPLAY=29 €/mėn.
VIP_PRICE_DISPLAY=49 €/mėn.
```

---

## Local Development

```bash
npm install
docker run -d -p 6379:6379 redis:alpine
ngrok http 3000                          # update APP_URL in .env
stripe listen --forward-to localhost:3000/webhooks/stripe
npm run db:migrate:dev
npm run start:dev
```

---

## Security

- Stripe webhook signature verified on every request
- Telegram webhook validated via secret token
- Identity bound to `telegram_user_id` — never username
- `stripe_event_id` deduplication — idempotent by design
- No permanent invite links — join request flow only

---

## License

Licensed under the [Apache License 2.0](LICENSE).
