# Payments & Balance

> Last updated: 2026-04-02

## Overview
The payment system uses a balance-based model. Athletes prepay by topping up their in-app balance via Stripe. When a session is booked and approved, funds are held. After session completion, funds are transferred to the coach via Stripe Connect Express. Cash payments are also supported as an alternative.

> **Note:** This spec merges the original "Payment User Flow" and "Revisited Payment Flow" specs. The balance model (Revisited) is the implemented version.

## Current State
Implemented across iOS and backend. Voice assistant can check balances but does not process payments.

## Currency
All Stripe balances, transactions, and prices are in **EUR**.

## Components

### Backend
- Stripe service: `infra/services/stripe.py`
- Balance endpoints: `entry/rest/v1/endpoints/athlete/` and `entry/rest/v1/endpoints/coach/`
- Payment webhook: `POST /stripe-webhook`
- Balance replenishment: `POST /balance-replenishment`
- Stripe onboarding: `POST /coach/stripe-onboarding`
- DB tables: `balance`, `balance_replenishment`

### iOS
- Balance flow: `ProfileTab/Settings/Options/BalanceFlow/`
- Payment methods: `Cores/PaymentMethods/`
- Stripe Connect: `ProfileTab/Settings/Options/StripeConnect/`
- Payment service: `TabBar/Tabs/ProfileTab/Settings/Options/BalanceFlow/Common/API/`
- Stripe SDK: `stripe-ios-spm` (PaymentSheet, StripeConnect)

### Voice Assistant
- `get_balance()` tool — check current balance
- No payment processing via voice (intentional — security)

### Android (Planned)
- Same balance flow as iOS
- Stripe Android SDK (PaymentSheet)
- Google Pay integration alongside card payments
- Same Stripe Connect onboarding for coaches (via WebView)

## Athlete Payment Flow

### Balance Model (Primary)

1. **Top-up balance** — Athlete adds funds via Stripe PaymentSheet
   - Card payment (saved cards supported)
   - Apple Pay (iOS)
   - Google Pay (Android — planned)
2. **Book session** — Athlete requests training with coach
3. **Coach accepts** — Funds debited from athlete balance and held by platform
4. **Session completes** — Held funds released to coach
5. **Session canceled** — Funds returned to athlete balance (cancellation policy applies)

### Cash Model (Alternative)

1. **Book session** — Athlete selects "cash" as payment method (if coach allows)
2. **Coach accepts** — No funds held, no cancellation penalties
3. **Session completes** — Coach manually confirms attendance and payment in app
4. **No-show** — No automatic penalty for cash sessions

### Card Saving
- First payment offers "Save card for future bookings"
- Stored securely via Stripe (tokenized)
- Manage saved cards in payment methods settings

### Balance Screens (Athlete)
- **Balance overview** — current balance amount
- **Top-up** — add funds via Stripe
- **Transactions** — payment history
- **Blocked funds** — funds held for upcoming sessions

## Coach Payout Flow

### Stripe Connect Express Onboarding
1. Coach navigates to Settings → Stripe Connect
2. Redirected to Stripe hosted onboarding form
3. Enters personal and banking information (KYC compliance)
4. Returns to app after successful onboarding
5. Coach is now eligible to receive payouts
6. Flag: `isStripeOnboardingCompleted` stored in UserDefaults

### Payout Process
1. Training session completes (status: successful/completed)
2. Platform triggers payout via Stripe Connect
3. Coach receives funds according to payout schedule (2-7 days)
4. Push notification sent with transfer details

### Coach Balance Screens
- **Balance overview** — current earnings
- **Transactions** — earnings & payout history
- **Per-athlete breakdown** — earned from each athlete (finished, upcoming, total revenue)
- **Cash payment tracking** — unpaid sessions where cash was selected

### Revenue Dashboard (Coach)
- Daily/weekly earnings overview
- Revenue chart: `totalPaid`, `totalUpcoming`, `totalUnpaid`, `total`
- Sessions chart: weekly breakdown

## Cancellation & Refund Policy

| Scenario | Refund to Athlete | Payout to Coach |
|---|---|---|
| Athlete cancels > 24h before | Full refund (100%) | None |
| Athlete cancels < 24h before | 50% refund | 50% released to coach |
| Coach cancels (any time) | Full refund (100%) | None |
| Athlete no-show | No refund | Full session price to coach |
| Cash session canceled | N/A | N/A |

> **Note:** Spec mentions coach-configurable cancellation policy — not yet implemented.

## Stripe Webhook Events

Backend handles Stripe events at `POST /stripe-webhook`:
- `payment_intent.succeeded` — balance top-up successful
- `payment_intent.payment_failed` — payment failed
- Account status updates for Stripe Connect

## Affordability Check

Before booking, the system checks if athlete can afford the session:
- `GET /athlete/balance/can-afford` — returns boolean
- `GET /coach/training-sessions/{id}/can-afford` — checks specific session price

## Third-Party Payment Option

Original spec mentions: "Third party have to have an opportunity to pay for the athlete." This is **NOT implemented** currently.

## API Endpoints

### Athlete
| Method | Path | Description |
|---|---|---|
| GET | `/athlete/balance` | Current balance |
| GET | `/athlete/balance/can-afford` | Can afford check |
| GET | `/athlete/payment-details` | Payment details |
| PUT | `/athlete/payment-details` | Update payment details |
| GET | `/athlete/transactions-history` | Transaction history |
| POST | `/balance-replenishment` | Top-up via Stripe |

### Coach
| Method | Path | Description |
|---|---|---|
| GET | `/coach/balance` | Current earnings |
| POST | `/coach/stripe-onboarding` | Start Stripe Connect |
| GET | `/coach/transactions-history` | Earnings history |
| GET | `/coach/training-sessions/{id}/can-afford` | Check athlete affordability |

## Data Model

### Balance
| Field | Description |
|---|---|
| athlete_profile_id | Owner |
| amount | Current balance |
| currency | EUR |

### Balance Replenishment
| Field | Description |
|---|---|
| payment_intent_id | Stripe PaymentIntent ID |
| balance_id | Associated balance |
| amount | Top-up amount |
| currency | EUR |

### Training Session (Payment Fields)
| Field | Description |
|---|---|
| price | Session price |
| currency | EUR |
| price_on_demand | Negotiable price flag |
| payment_type | `card` or `cash` |

## Known Issues / Tech Debt
- Coach-configurable cancellation policy not implemented (spec mentions it)
- Third-party payment for athlete not implemented
- Google Pay for Android not yet integrated
- Apple Pay status in current iOS build needs verification
- `payment_type` values may differ between client and backend naming
