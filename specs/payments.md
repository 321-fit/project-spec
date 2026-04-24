# Payments, Balance & Coach Earnings

> Status: Approved (athlete balance — implemented) / Draft (coach earnings — rewrite)
> Prototype: [flows/coach/balance.html](https://321-fit.github.io/project-spec/prototypes/flows/coach/balance.html)
> Component library: [design-tokens/docs/components.md](../../design-tokens/docs/components.md)
> Last updated: 2026-04-24
> Implementation:
> - iOS:     [321fit_ios/docs/payments-ios.md] (to be created)
> - Backend: [poly-backend/docs/payments-backend.md] (to be created — includes earnings ledger migration)
> - Voice:   [voice_control/docs/payments-voice.md] (to be created — read-only access)
> - Android: (future)

---

## 1. Overview

Two distinct money flows:

- **Athlete side:** prepaid **balance** model. Top up via Stripe → funds held when a session is booked → released on completion or refunded on cancel per policy. Cash as alternative (no balance involvement).
- **Coach side:** **earnings** accumulate from completed card sessions; paid out via **weekly batch** (free) or **Instant payout** (premium, fee-bearing). Stripe Connect Express is the initial payout provider; architecture supports additional providers (Revolut Merchant planned) behind a `PayoutAccount` abstraction.

Currency: **EUR** only in v1.

This spec consolidates the previous "Payment User Flow" + "Revisited Payment Flow" and adds the **Coach Earnings rewrite** from `project_pending_spec_updates` #10 and `project_coach_balance_decisions`.

---

## 2. User Stories

### Athlete

- As an athlete, I want to top up my balance with a card so that I can book sessions quickly without entering payment details each time.
- As an athlete, I want to see my available vs. held (blocked) balance separately so that I know what's bookable vs. committed.
- As an athlete, I want to pay in cash at the coach's discretion so that I have flexibility when booking.

### Coach

- As a coach, I want my earnings to accumulate automatically from completed card sessions so that I don't have to invoice anyone.
- As a coach, I want a **predictable weekly payout** (free) so that I know when money lands.
- As a coach, I want an **Instant payout** option for a small fee so that I can pull funds the same day when I need cash flow.
- As a coach, I want to see **pending vs. available** balance so that I understand what's held in 24h clearance vs. ready to withdraw.
- As a coach, I want to track **cash owed** separately so that I know whom to chase for outstanding cash.
- As a coach, I want Stripe Connect onboarding inside the app (not a clunky WebView) so that setup feels native.
- As a coach, I want to disconnect / switch to a different payout provider in the future so that I'm not locked in.

### Platform

- As the platform, we want a **24h hold** on newly completed card sessions to catch fraud, chargebacks, and session disputes before funds leave.
- As the platform, we want earnings + payouts as an **append-only ledger** (`coach_transactions` table) for audit, analytics, and tax purposes.

---

## 3. System Stories

- As the backend, `coach_balance` is a **derived table** maintained via append-only transactions. Every mutation goes through `coach_transactions` first; cached balance updates are idempotent.
- As the backend, every completed card session creates an `earning` transaction that enters a **24h hold** window. A scheduled `hold_release` transaction moves it to `available` after 24h.
- As the backend, a weekly sweep job runs Mondays 00:00 UTC: takes all `available` funds per coach ≥ threshold (€20 default), creates `payout_initiated` transaction, calls Stripe Connect, updates to `payout_completed` on success or `payout_failed` on error.
- As the backend, Instant payout is a user-initiated call: same ledger flow, higher fee, same-day settlement (Stripe Instant Payouts).
- As the client, the coach Earnings screen renders entirely from snapshot fields (`available`, `pending`, `payoutSchedule`, etc.) — no direct ledger queries in v1.
- As the athlete client, balance top-up uses Stripe PaymentSheet (iOS native / Android Google Pay); never redirects to external web.
- As the backend, Stripe webhooks update ledger state for async events (payment confirmations, Connect account updates, payout status).

---

## 4. Flows

### Flow A — Athlete: Top up balance

1. Athlete taps Balance → Top up → amount grid (€50 / €100 / custom) + saved cards list.
2. Tap amount → Stripe PaymentSheet opens (card / Apple Pay).
3. On success:
   - Stripe sends `payment_intent.succeeded` webhook
   - Backend creates `balance_replenishment` record + increments `athlete_balance.amount`
   - Client gets push / snapshot refresh
4. On failure: error message + retry option.

### Flow B — Athlete: Book session with balance

1. Athlete selects training session (price = €50).
2. `GET /athlete/balance/can-afford` returns `true`.
3. Athlete confirms → booking request created (see [event-statuses.md](./event-statuses.md)).
4. Coach accepts → backend:
   - Transitions event to `planned`
   - Moves €50 from `athlete_balance.amount` to `athlete_balance.blocked` (held on athlete side)
   - No coach-side money movement yet
5. Session completes (coach marks `finished`) → backend:
   - Releases €50 from held → creates `earning` transaction on coach side in `pending` (24h hold)
   - Removes €50 from athlete's `blocked`
6. After 24h → `hold_release` transaction: coach's `pending` → `available`.

### Flow C — Athlete: Book with cash

1. Session has `paymentType: cash` (set by coach on training template).
2. Athlete books → event → `planned`. No athlete balance impact.
3. Session completes → coach marks `finished`. Session logged, cash expected at session. No automatic ledger entry on coach side.
4. Coach manually marks paid via **Mark Paid** flow (see [clients-coaches.md](./clients-coaches.md)) — creates `cash_paid` transaction on coach side.

### Flow D — Coach: Onboard Stripe Connect

1. Settings → Stripe Connect.
2. Native embedded component (`StripeConnect` iOS SDK / Android equivalent) opens — renders inside the app, not a WebView or external redirect.
3. Coach enters KYC + banking info via Stripe's form.
4. On completion: Stripe calls backend webhook → `coach.stripeConnected: true`.
5. Coach returns to app; Settings shows Stripe Connect as Connected with subtle indicator. Weekly payouts eligible from this point.

### Flow E — Coach: Weekly batch payout

1. Monday 00:00 UTC — Celery beat fires sweep task.
2. For each coach with `available >= 20 EUR`:
   - Create `payout_initiated` transaction (amount, provider, providerRef)
   - Call Stripe Connect Express `transfers.create`
   - On success: `payout_completed` transaction, `available -= amount`
   - On failure: `payout_failed` transaction, `available` unchanged, alert coach
3. Push notification: "€480 is on its way to your bank. Typical arrival: 2 days."

### Flow F — Coach: Instant payout

1. Earnings screen → **Withdraw** CTA → sheet opens listing default provider + fee.
2. Coach confirms amount + provider.
3. Backend creates `payout_initiated` transaction, calls Stripe Instant Payouts API.
4. Fee deducted as separate `fee` transaction line.
5. Success → same-day settlement (usually within 30 min).

### Flow G — Cancellation & refund

See § 7 Business rules — cancellation policy table.

1. Athlete cancels > 24h before session: athlete's `blocked` → `available` (full return). No coach earning.
2. Athlete cancels < 24h before: 50% returns to athlete, 50% becomes coach `earning` → standard 24h hold + weekly payout.
3. Coach cancels: full refund to athlete. No coach earning.
4. Cash session cancellation: no system action.

### Flow H — Coach: View Earnings dashboard

Maps to prototype `flows/coach/balance.html`.

Main `#s-earnings` screen shows:
- Hero: Available / Pending (€340.50 / €75.00)
- Next payout indicator ("Mon, Apr 28 · €480 via Stripe")
- Withdraw CTA (premium — Instant)
- Transactions link → detailed ledger view
- Stripe Connect status row (Connected / Action required / Not connected)
- Cash owed summary (link to Clients outstanding)

State variants on this screen:
- `st-full` — connected + has balance (default happy path)
- `st-premium` — Instant tier visible + withdraw enabled
- `st-zero` — no earnings yet, show welcome info
- `st-lock` — Stripe not connected → CTA to connect

### Flow I — Coach: Transaction ledger

Screen `#s-transactions` lists append-only transactions (newest first) with filters:
- All
- Earnings
- Payouts
- Cash

Each row: icon + label + amount + date + status. Tap → Transaction Detail screen (`#s-txn-earning` or `#s-txn-payout`) with full context: session link, hold-release schedule, payout provider ref, fee breakdown.

---

## 5. States

### Athlete balance states

| State | Trigger | UI |
|---|---|---|
| `has_balance` | `amount > 0` | Balance screen normal |
| `insufficient` | `amount < session_price` at book time | Red warning + "Top up" CTA |
| `topup_pending` | PaymentIntent processing | Loading indicator, no action |

### Coach earnings states

| State class (prototype) | Condition | UI |
|---|---|---|
| `st-full` | Stripe connected + available > 0 | Default happy path (see Flow H) |
| `st-premium` | Same + Instant tier enabled | Withdraw CTA shown as primary |
| `st-zero` | No earnings yet | Welcome screen + "Finish your first session to get paid" |
| `st-lock` | Stripe not connected | Earnings locked with connect-Stripe CTA prominent |

### Stripe Connect state

| Backend flag | Value | Meaning |
|---|---|---|
| `stripeConnected` | `false` | Onboarding not started or incomplete |
| `stripeConnected` | `true`, `stripeActionRequired: false` | Ready to receive payouts |
| `stripeConnected` | `true`, `stripeActionRequired: true` | Stripe flagged something (KYC update, bank issue). Payouts paused until resolved. Show prominent banner. |

### Coach transaction types

`coach_transactions.type` enum:

| Type | When created | Effect on balance |
|---|---|---|
| `earning` | Session finished (card payment) | +amount to `pending` |
| `hold_release` | 24h after earning | Move amount `pending → available` |
| `cash_paid` | Coach marks cash paid | (Informational; no payout balance change) |
| `payout_initiated` | Sweep job or Instant | -amount from `available` |
| `payout_completed` | Stripe confirms | (Informational; balance already decremented) |
| `payout_failed` | Stripe error | +amount back to `available` |
| `fee` | Instant payout fee deducted | -fee from `available` |
| `refund` | Session cancelled after earning created | -amount from `pending` or `available` |
| `dispute_reversal` | Admin resolves in-app dispute or Stripe chargeback affects coach earnings | -amount from `pending` or `available` (or pushes balance negative if already paid out — see § 7 Disputes) |
| `adjustment` | Admin manual correction | +/- amount |

---

## 6. API

### Athlete endpoints

- `GET /athlete/balance` → `{ amount, blocked, currency }`
- `GET /athlete/balance/can-afford?sessionId=...` → `{ canAfford: bool }`
- `POST /balance-replenishment` → initiates Stripe PaymentSheet intent
- `GET /athlete/transactions-history?page=&size=` → paginated list
- `GET /athlete/payment-details` / `PUT /athlete/payment-details` → saved cards

### Coach endpoints (updated — rewrite from prior auto-payout model)

#### `GET /coach/earnings`

Returns dashboard snapshot.

**Response 200 — `CoachEarningsSnapshot`:**

```json
{
  "available":           340.50,
  "pending":             75.00,
  "currency":            "EUR",
  "payoutSchedule":      { "kind": "weekly", "nextRunAt": ISO8601, "threshold": 20.00 },
  "defaultProvider":     { "kind": "stripe_connect", "status": "connected", "actionRequired": false },
  "cashOwed":            { "count": 2, "total": 40.00 },
  "uiState":             "st-full" | "st-premium" | "st-zero" | "st-lock"
}
```

#### `GET /coach/transactions?type=&page=&size=`

Paginated transactions. `type` optional filter.

#### `GET /coach/transactions/{id}`

Detail view.

#### `POST /coach/payouts/instant`

Initiate Instant payout.

**Body:** `{ amount: number, providerKey: string }`
**Response 200:** updated earnings snapshot + transaction id.
**Response 400:** amount exceeds available, provider not available, etc.

#### `POST /coach/stripe/connect/session`

Returns `{ accountSession: string, publishableKey: string }` — used by `StripeConnect` native SDK to render embedded onboarding. Replaces old WebView flow.

#### `DELETE /coach/payout-accounts/{id}`

Disconnect a provider (Stripe or future). Only allowed if not default or another provider connected.

### Webhooks (Stripe)

`POST /stripe-webhook` continues to handle:
- `payment_intent.succeeded` — athlete top-up confirmation
- `payment_intent.payment_failed` — top-up failure
- `account.updated` — Stripe Connect status change (updates `stripeActionRequired`)
- `transfer.created` / `transfer.failed` / `transfer.updated` — payout lifecycle
- `charge.refunded` — refund confirmation

### Scheduled tasks

- **Weekly sweep:** every Monday 00:00 UTC. Celery beat.
- **Hold release:** every 15 min, finds `earning` transactions > 24h old, creates `hold_release`.

---

## 7. Business rules

### Cancellation & refund policy

| Scenario | Athlete refund | Coach earning |
|---|---|---|
| Athlete cancels > 24h before session | 100% | None |
| Athlete cancels < 24h before | 50% | 50% (24h hold + weekly payout) |
| Coach cancels (any time) | 100% | None |
| Athlete no-show (coach marks `missed`) | **0%** | **100%** (24h hold + weekly payout, same as completed) |
| Cash session cancelled | N/A | N/A |

**Tier 1 decisions baked in:**
- **Q2 — Missed = 100% to coach (strict no-show forfeit):** Athletes who book and don't show forfeit the full amount. This protects coach time and discourages no-shows. Athlete may dispute via Support if extenuating circumstances (admin can override per Q10 dispute flow).
- **Q3 — Fixed 24h cancellation window:** Window is platform-wide, not coach-configurable in v1. Coaches don't choose 48h/72h/etc. Reduces matrix of edge cases and athlete confusion ("what's my cancellation window for this coach?"). Configurable per-coach deferred until product data shows demand.

### Coach earnings

- **Threshold for auto-payout: €20 EUR.** Below threshold, available stays on coach's balance until next week pushes them over.
- **24h hold window:** every completed card earning waits 24h before becoming available. Gives dispute window.
- **Instant payout fee:** 1% + €0.50 minimum (subject to Stripe fee structure; update as needed).
- **Weekly batch fee:** none in v1 (platform absorbs).
- **Single default provider per coach** in v1. Multi-provider listing in UI but one active payout target.
- **Currency:** EUR only. Multi-currency deferred.

### Athlete balance

- **Max balance cap:** €2000 to reduce fraud surface. Top-ups beyond → reject.
- **Held (blocked) funds are non-withdrawable** — only released via session cancellation or completion.
- **Withdrawal:** not supported in v1 (no pathway for athlete to withdraw from in-app balance). Balance is for booking only.

### Provider abstraction

- Backend `PayoutAccount` is provider-agnostic: `provider_kind: "stripe_connect" | "revolut_merchant" | ...`, `provider_account_id`, `status`, `action_required`.
- iOS/Android UI uses provider-specific native SDKs per account kind.
- A coach may have multiple accounts listed; only one active as default for weekly sweep.

### Disputes & chargebacks (Tier 1 Q10)

**Architectural principle: balance-based, internal-ledger-first.** Athletes never pay coaches directly — they top up an in-app balance and our backend orchestrates the session-level money movements. Disputes resolve through our ledger, not Stripe-level reversals (except for raw bank chargebacks against top-ups).

**Two distinct dispute surfaces:**

| Surface | Trigger | Mechanics |
|---|---|---|
| **In-app dispute** (athlete unhappy with a session) | Athlete opens event detail → "Report an issue" → Contact Support deep-link with pre-filled context (event ID, coach, amount, date). | Admin reviews via Support thread (offline tooling, no in-app dispute messaging in v1 per Q10 Option A). Resolution = ledger entry pair: `+€X` to athlete balance + `dispute_reversal` (`-€X`) on coach earnings ledger. **No Stripe API calls** — all internal arithmetic. |
| **Bank chargeback** (athlete contests a top-up via their bank) | Stripe webhook `charge.dispute.created` fires against a top-up `payment_intent`. | Backend automatically reverses athlete balance for the disputed top-up amount. Coach earnings are NOT directly affected (top-up is decoupled from any specific session). If athlete's balance goes negative, `athlete_balance.amount < 0` is allowed (debt state). |

**Negative athlete balance:**
- Permitted state when chargebacks reverse spent funds.
- Athlete sees: "Account balance: −€20 · Top up to clear before booking again".
- All booking blocked until balance ≥ session price.
- Future top-ups apply to debt first (transparently to user), then to spendable amount.
- Admin tool can manually zero out negative balance for goodwill cases.

**Coach payout reversal (rare edge case):**
- If admin issues a `dispute_reversal` after coach payout has already cleared, coach's `available` may go negative.
- Next weekly sweep withholds payouts until earnings net to ≥ €20 again.
- Stripe-side payout reversal (calling Stripe Connect to claw back) is **only** invoked for fraud or legal mandates, not for routine disputes — admin manual action.

**Admin tool (out of project-spec scope):**
- `poly-backend` admin panel surfaces dispute queue from Support tickets.
- Per-event resolution actions: Refund full / Refund partial / Reject.
- All actions create paired ledger entries (athlete refund + coach withhold) via single transaction.
- Audit trail mandatory: who resolved, when, reason text.

**Push notifications:**
- Athlete opens dispute → silent (admin contacts via Support thread).
- Bank chargeback received → coach push: "Funds reversed for {event} — see Earnings".
- Admin resolution → both parties notified with outcome.

**v2 plans (deferred):** structured Resolution Center à la Airbnb (athlete + coach inputs, time-boxed responses). Revisit after volume justifies build cost.

---

## 8. Edge cases

- **Athlete tops up, then session cancels, they have more balance than expected:** fine. Balance grows; top-up is not session-specific.
- **Coach disconnects Stripe while weekly sweep pending:** if sweep already running, that payout proceeds; future sweeps halt until reconnect.
- **Dual device Instant payout (race):** backend idempotency key tied to ledger transaction id. Second attempt fails gracefully.
- **Stripe webhook delayed / lost:** reconciliation job every 4h fetches pending transfers from Stripe API and updates local ledger.
- **Coach fulfills session but is in vacation mode:** payout logic unaffected; vacation mode doesn't halt earnings flows.
- **Chargeback on a top-up:** Stripe webhook `charge.dispute.created` automatically reverses athlete balance per § 7 Disputes. Coach earnings unaffected (top-ups decoupled from sessions). Athlete may go negative balance.
- **Session marked missed then coach restores via Undo (within 4s):** during undo window, no earning transaction created yet. If undo after 4s, manual reversal via admin.
- **Fee deducted but payout fails:** fee is also reverted via a `fee_reversal` transaction. Audit visible.

---

## 9. Platform notes

- **iOS (Stripe Connect embedded):** replaces old `WebView` approach. Use `StripeConnect` SDK (Connect iOS) — embedded UI component, native feel. Requires `account_session` from backend (new endpoint `/coach/stripe/connect/session`).
- **iOS (Stripe PaymentSheet):** existing integration continues for athlete top-up.
- **Android (future):** `StripeConnect` Android SDK equivalent (in beta). Same backend contract.
- **Backend (ledger):** new table `coach_transactions` (append-only), new derived view `coach_balance`. Migration from existing `balance` + one-time reconciliation script.
- **Voice:** `get_balance()` works for athlete. New `get_earnings()` for coach — returns `available`, `pending`, `nextPayoutDate`. No Instant payout via voice (security).

---

## 10. Open questions

- [x] ~~**Missed session refund:**~~ RESOLVED in Tier 1 Q2: 0% refund / 100% to coach (strict no-show forfeit). Disputes via Support per Q10.
- [x] ~~**Coach-configurable cancellation window:**~~ RESOLVED in Tier 1 Q3: fixed 24h platform-wide in v1. Configurable per-coach deferred until product data demands.
- [x] ~~**Dispute / chargeback flow:**~~ RESOLVED in Tier 1 Q10: balance-based internal ledger resolution + Stripe-native top-up chargebacks. Admin tool surfaces from Support tickets. v2: structured Resolution Center.
- [ ] **Weekly sweep day:** Monday vs. Friday vs. coach-choice? Some coaches prefer weekend arrival. **Owner:** product.
- [ ] **Instant payout fee structure:** flat 1% + €0.50 or tiered? Align with Stripe pass-through. **Owner:** finance.
- [ ] **Multi-currency support:** EUR only v1. When to add USD / GBP etc.? Depends on international rollout. **Owner:** growth.
- [ ] **Third-party payment** ("pay for a friend"): mentioned in legacy spec, not implemented. Scope? **Owner:** product.
- [ ] **Revolut Merchant timing:** when second provider lands, do we let coaches switch mid-week (breaking the sweep)? **Owner:** backend architecture.

---

## Related specs / references

- [event-statuses.md](./event-statuses.md) — transitions that trigger earnings (`finished`), refunds (`cancelled`, `missed` policy)
- [review-queue.md](./review-queue.md) — `Mark complete` triggers earning; `Missed` triggers policy
- [coach-calendar.md](./coach-calendar.md) — cancellation flow entry
- [clients-coaches.md](./clients-coaches.md) — Cash owed surfacing, Mark Paid flow
- [dashboard.md](./dashboard.md) — dashboard shows weekly earnings preview; links to full Earnings
- [authentication.md](./authentication.md) — Stripe onboarding requires verified coach identity
- Architecture doc (pending): `architecture/payments-ledger.md` — detailed ledger schema + migration
- Memory: `reference_payment_backend`, `project_coach_balance_decisions`
- Prototype: `flows/coach/balance.html` (Earnings + Transactions + Stripe Connect + Payout Methods)
- Components: FitCard (earn-hero variants), FitButton, FitBadge, FitSheet (withdraw), FitSkeleton. See [design-tokens/docs/components.md](../../design-tokens/docs/components.md).
