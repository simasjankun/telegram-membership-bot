<div align="center">

# telegram-membership-bot

**Production-grade Telegram membership management with Stripe billing**

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-v0.1.0--dev-orange.svg)](CHANGELOG.md)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/typescript-5.x-blue.svg)](https://www.typescriptlang.org)
[![NestJS](https://img.shields.io/badge/nestjs-10.x-red.svg)](https://nestjs.com)

</div>

---

## Overview

A self-contained backend system that automates access control for paid Telegram communities. One bot manages a private **content channel** and a private **discussion group** — granting or revoking access based on real-time Stripe subscription state.

Built for reliability from day one: idempotent webhook handling, a proper membership state machine, grace periods, automated reminders, and safe member removal.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Journey                            │
│                                                                 │
│  User → /start → Stripe Checkout → Webhook → Access Granted    │
│                                                                 │
│         Renewal fail → Grace Period → Reminder → Removal       │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  Telegram Layer  │    │  Billing Layer   │    │ Membership Layer │
│                  │    │                  │    │                  │
│  /start          │◄───│  Stripe Checkout │───►│  State Machine   │
│  join_request    │    │  Stripe Billing  │    │  Access Policy   │
│  member removal  │    │  Webhooks        │    │  Grace Periods   │
│  DM reminders    │    │  Customer Portal │    │  Entitlements    │
└──────────────────┘    └──────────────────┘    └──────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │       PostgreSQL         │
                    │  users · subscriptions  │
                    │  memberships · events   │
                    └─────────────────────────┘
```

---

## Key Features

**Access Control**
- Invite links with `creates_join_request=true` — no permanent links floating around
- `chat_join_request` approval only for members with active subscriptions
- Automatic removal from channel + group on expiry
- Safe retry logic — tolerates Telegram API hiccups and already-removed members

**Billing**
- Stripe Checkout for new subscriptions
- Full subscription lifecycle via webhooks (created / updated / deleted / past_due)
- Idempotent event processing — `stripe_event_id` deduplication prevents double execution
- Stripe Customer Portal for self-service subscription management

**Membership State Machine**

```
inactive → checkout_started → active → past_due → grace_period → canceled
                                  ↑                                   │
                                  └───────────── resubscribe ─────────┘
                                                          ↓
                                                       blocked
```

**Notifications**
- Templated DM messages for all lifecycle events (v1)
- Optional Claude Sonnet 4.6 AI concierge for DM support (v2)

**Observability**
- All Telegram and Stripe events stored with full payloads
- Message logs per user (direction, channel, template)
- Reconciliation jobs to catch drift between DB and Telegram state

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ |
| Language | TypeScript 5 |
| Framework | NestJS 10 |
| Database | PostgreSQL (Supabase or managed) |
| Queue / Jobs | BullMQ + Redis |
| Payments | Stripe Billing + Checkout |
| Messaging | Telegram Bot API |
| AI (v2) | Claude Sonnet 4.6 |

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
  stripe_price_id, status, current_period_start, current_period_end
  cancel_at_period_end, grace_until, last_stripe_event_at
  created_at, updated_at

telegram_memberships
  id, user_id → users
  discussion_group_chat_id, content_channel_chat_id
  group_member_status, channel_member_status
  last_verified_at, removed_at

billing_events
  id, stripe_event_id (unique), type, payload_json
  processed_at, status

telegram_events
  id, update_id (unique), type, payload_json, processed_at

message_logs
  id, user_id → users, direction (inbound/outbound)
  channel, template_key, content, created_at

ai_threads  [v2]
  id, user_id → users, provider, thread_state_json, last_message_at
```

</details>

---

## Project Structure

```
src/
├── modules/
│   ├── auth/           # Identity & account linking
│   ├── telegram/       # Bot, join requests, member sync
│   ├── stripe/         # Checkout, webhooks, portal
│   ├── membership/     # State machine, access policy, entitlements
│   ├── notifications/  # Templated DMs
│   ├── jobs/           # Reminders, grace period, reconciliation
│   ├── ai/             # Claude DM concierge [v2]
│   └── admin/          # Admin overrides, audit logs
├── common/             # Guards, interceptors, pipes
├── config/             # Env validation, constants
└── main.ts
```

---

## Versioning Roadmap

| Version | Scope | Status |
|---|---|---|
| `v0.1.0` | NestJS scaffold, DB schema, Telegram bot foundation | planned |
| `v0.2.0` | Stripe Checkout + webhook pipeline | planned |
| `v0.3.0` | Channel & group access control + join request flow | planned |
| `v0.4.0` | Grace periods, reminders, auto-removal | planned |
| `v0.5.0` | Admin tools, reconciliation jobs | planned |
| `v1.0.0` | Production-ready MVP | planned |
| `v1.1.0` | Stripe Customer Portal, manual admin overrides | planned |
| `v2.0.0` | Claude Sonnet 4.6 AI DM concierge | planned |

---

## API Endpoints

```
POST  /webhooks/stripe           # Stripe event ingestion
POST  /webhooks/telegram         # Telegram update ingestion

POST  /billing/create-checkout-session
POST  /billing/customer-portal

GET   /membership/me

POST  /telegram/join-link/channel
POST  /telegram/join-link/group
```

---

## Getting Started

> Full setup guide will be added with `v0.1.0`. Below is a quick orientation.

### Prerequisites

- Node.js 20+
- PostgreSQL
- Redis (for job queues)
- Stripe account
- Telegram Bot Token (`@BotFather`)

### Environment Variables

```bash
# App
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://...

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_DISCUSSION_GROUP_ID=
TELEGRAM_CONTENT_CHANNEL_ID=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=

# AI (optional, v2)
ANTHROPIC_API_KEY=
```

> Never commit `.env` files. Use a secrets manager in production.

---

## Security Considerations

- Stripe webhook signature verification on every request
- Identity bound to `telegram_user_id`, never username
- `stripe_event_id` deduplication — idempotent by design
- Telegram `update_id` deduplication
- Rate limiting on all user-facing endpoints
- No persistent invite links — join request flow only

---

## License

Licensed under the [Apache License 2.0](LICENSE).
