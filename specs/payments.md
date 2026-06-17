# Payments, Balance & Coach Earnings

> Status: Approved (athlete balance — implemented) / Draft (coach earnings — rewrite)
> Prototype (coach earnings): [flows/coach/balance.html](https://321-fit.github.io/project-spec/prototypes/flows/coach/balance.html)
> Prototype (athlete balance): [flows/athlete/balance.html](https://321-fit.github.io/project-spec/prototypes/flows/athlete/balance.html)
> Component library: [design-tokens/docs/components.md](../../design-tokens/docs/components.md)
> Last updated: 2026-06-17 (txn ledger unified to canonical fit-ui kit across coach + athlete; athlete txn-detail screens added)
> Implementation:
> - iOS:     [321fit_ios/docs/payments-ios.md] (to be created)
> - Backend: [poly-backend/docs/payments-backend.md] (to be created — includes earnings ledger migration)
> - Voice:   [voice_control/docs/payments-voice.md] (to be created — read-only access)
> - Android: (future)

---

## 1. Overview

Two distinct money flows:

- **Athlete side:** prepaid **balance** model. Top up via Stripe → funds held when a session is booked → released on completion or refunded on cancel per policy. Cash as alternative (no balance involvement).
- **Coach side:** **earnings** accumulate from completed card sessions; paid out via **weekly batch** (free, default) or **manual Withdraw** (free for bank, 1% Stripe fee for debit card via Instant Payouts). Stripe Connect (Custom accounts, native UI only) is the payout provider. Architecture supports additional providers (Revolut Merchant planned) behind a `PayoutAccount` abstraction. Onboarding + in-app control are covered in a focused spec: see [stripe-connect-onboarding.md](./stripe-connect-onboarding.md).

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
- As a coach, I want to tap on the Pending amount to **see which specific sessions** are inside that sum and when each one clears — not just a popup explaining the 24h rule. Pending is rarely "just a number" — it's "Anna's session yesterday + Maya's session today" and I want to verify that mental model matches reality.
- As a coach, I want to track **cash owed** separately so that I know whom to chase for outstanding cash.
- As a coach, I want to disconnect / switch to a different payout provider in the future so that I'm not locked in.

> Onboarding-specific user stories live in [stripe-connect-onboarding.md § 2](./stripe-connect-onboarding.md#2-user-stories).

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
- As the backend, the aggregated `pending` snapshot field is paired with a list endpoint `GET /coach/earnings/pending` returning the individual sessions contributing to that sum (event_id, title, athlete_name, completed_at, amount, clears_at). The list endpoint is required by the s-pending breakdown screen — the snapshot total alone is not enough.
- As the athlete client, balance top-up uses Stripe PaymentSheet (iOS native / Android Google Pay); never redirects to external web.
- As the backend, Stripe webhooks update ledger state for async events (payment confirmations, Connect account updates, payout status).

> Onboarding-specific system stories (consent gate, account_session, controller config) live in [stripe-connect-onboarding.md § 3](./stripe-connect-onboarding.md#3-system-stories).

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

### Flow C1 — Athlete: Balance screen (spending ledger) — 2026-06-05 (new)

The athlete-side mirror of the coach **Earnings** screen, flipped from income to **spend**. Reached from **Settings → Payments → Balance** and the **Dashboard balance card** (card tap / "Top up" / "Transactions").

Layout (`s-balance`) — built on the **canonical ledger kit** shared with coach Earnings (`.fit-txn*` / `.fit-filter-chip` / `.fit-stat-strip` / `.fit-empty-state` in `fit-ui.css`; extracted 2026-06-17 — see architecture/design-system.md):
1. **Hero** (brand gradient, role-specific `.bal-hero`) — "Available balance" + amount (e.g. €240.00) + **Top up** pill (vs coach's *Withdraw*) + "Auto top-up off" note.
2. **This month** (section title) — canonical `.fit-stat-strip` underneath: Spent · Topped up · Sessions (the title scopes all three; labels stay clean, no per-metric "this month").
3. **Transactions** — `.fit-filter-chip` **All / Top-ups / Spent / Refunds** (client-side filter on `data-txn`) + date-grouped `.fit-txn` rows with intent icons:
   - **top-up** — `--in` teal **+** (money in) — "Top-up · Visa •• 4242"
   - **spend** — `--out` gray **−** (money out) — "Tennis with {coach}" (session payment from balance)
   - **refund** — `--info` blue icon, teal **+** — "Refund · {session} cancelled"
4. **Row tap → transaction detail** (`s-txn-spend` / `s-txn-topup` / `s-txn-refund`): `.fit-detail-hero` (amount + date + status badge) + `.fit-kv-group` rows — same detail grammar as the coach earning detail. Top-up detail offers **Get receipt** (PDF — TBD).

**Top up** opens the Stripe PaymentSheet (Flow A). No payouts, no Stripe Connect — the athlete only ever pays in.

### Flow D — Coach: Onboard Stripe Connect

Covered in detail in [stripe-connect-onboarding.md § 4](./stripe-connect-onboarding.md#4-flow). Outcome relevant to this spec: on successful completion, `coach.stripeConnected = true` and `charges_enabled = true`, making the coach eligible for weekly payouts (Flow E).

### Flow E — Coach: Weekly batch payout

1. Monday 00:00 UTC — Celery beat fires sweep task.
2. For each coach with `available >= 20 EUR`:
   - Create `payout_initiated` transaction (amount, provider, providerRef)
   - Call Stripe Connect `transfers.create`
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

Maps to prototype `flows/coach/balance.html#s-earnings`.

Coach lands on a **two-card swiper** that separates cash from card income — each is an independent income stream with distinct mental model. Cash is the default visible card (works for every coach day 1, no setup); swipe right reveals Card (Stripe-connected).

**Swiper layout:**
- **Cash card** (default, swipe position 1) — brand gradient. Shows "This month €X received" + tappable row "€Y owed by N athletes" (deep-links to Clients filtered to outstanding cash). Top area of card is tappable → opens Earnings history with Cash filter.
- **Card card** (swipe position 2) — Stripe-indigo gradient. Shows Available / Pending split + "Next payout · {date}". Top area tappable → opens Earnings history with Card filter. **Pending col is independently tappable** (full col is the hit area; chevron after label signals tappability) → opens `s-pending` breakdown screen (per Flow J below). Optional Withdraw pill (Premium, post-MVP).
- **Peek + dots** — 12px of next card visible on right edge + 2-dot indicator below; affordance for swipe gesture.

**Below the swiper:**
- Premium notice banner (visible only when Instant Payout enabled; post-MVP).
- **Recent activity** — unified across cash + card with method badges (Cash / Card) per row + filter chips (All / Cash / Card / Payouts). Tap row → Earning Detail (Card) or Cash Detail.
- **Lifetime footer** — "This month €X · €Y lifetime with 321Fit" — tappable → Earnings history (All filter).

**Card card has 6 substates** mirroring Stripe Connect lifecycle (`controller.stripe_dashboard.type=none`):

| State | Visual | Content |
|---|---|---|
| Lock | Outline indigo border | "Accept card payments" empty title + "Connect Stripe" CTA → s-stripe |
| Verifying | Outline indigo border | Info banner "Stripe is verifying" + tappable "View details" |
| Action required | Outline yellow border | Warn banner "Missing: {requirement}" + "Resolve now" CTA → s-stripe |
| Zero | Filled gradient (muted €0/€0) | "Finish your first card session to start earning" |
| Active | Filled gradient | Available / Pending split + Next payout row |
| Premium | Filled gradient | Same as Active + Withdraw pill enabled |

**Cash card has 2 substates** (no provider lifecycle):

| State | Content |
|---|---|
| Active | "This month €X received" + tappable "€Y owed by N athletes" row |
| Zero | "No cash collected yet — mark sessions paid in Clients to track here" |

**Visual rule:** filled gradient = "money lives here right now"; outline = "frame waiting / needs action" (Stripe Lock / Verifying / Action only).

### Flow J — Coach: Cash earning detail + Manage payment drawer

Maps to prototype `flows/coach/balance.html#s-txn-cash`.

**State machine** for a cash earning event — 3 terminal states:

1. Session marked `finished` → backend creates `coach_transactions` row with `method=cash`, `status=unpaid`. Default state on entry to Cash detail screen is **Unpaid** (yellow hero pill).
2. Coach taps **Manage payment** primary CTA (visible only in Unpaid state).
3. Bottom-sheet drawer opens with 2 large action rows:
   - **Mark as paid** (teal icon) — "Anna handed you €30 in cash — counts as income."
   - **Waive payment** (red icon) — "No charge to Anna — debt cleared. Session still counts toward your stats, €0 income."
4. Tapping either action is final (no second confirm sheet inside the drawer for v1 — the drawer itself IS the confirmation gesture). Backend records the chosen outcome and re-renders.

| Action | Backend transaction status | Hero pill | KV row added | Income | Session count |
|---|---|---|---|---|---|
| Mark as paid | `received` | teal "Received" | "Marked paid · {datetime}" | €amount | counted |
| Waive payment | `payment_waived` (**new**) | grey "Payment waived" | "Waived · {datetime}" | €0 | counted |

**Waive semantics:**
- Used when athlete had a goodwill exception (injury, family emergency, no-show with valid reason) and coach chooses not to charge.
- **Silent to athlete** — no push notification. Athlete sees the waived status only if they look at the event in their own app.
- **Terminal** — no reverse action, same audit-trail rationale as Mark as paid. Mistakes go through Support.

**Entry points:** tap any `data-method="cash"` txn in Recent activity, or tap an athlete in Clients → Cash owed list (filter on Clients screen, future spec). Both routes land on `s-txn-cash`.

**API:**
- `POST /api/v1.0.0/coach/transactions/{id}/mark-paid` (existing) → sets `status=received`.
- `POST /api/v1.0.0/coach/transactions/{id}/waive` (**new**) → sets `status=payment_waived`. Body empty. Returns updated txn.
- Both reject (400) if txn is not `method=cash` or already in non-`unpaid` state (race).

### Flow J1.5 — Coach-confirmed events (2026-06-02 — new)

Maps to prototype `flows/coach/dashboard.html#s-notifications` → Waiting tab → Edit drawer → "Confirm for athlete" → confirmation sheet.

**Context.** Coach sent a cash invite to an athlete; athlete agreed offline (phone / DM / in-person) but didn't open 321Fit to tap Accept. The event sits in `coachInvited` status indefinitely until expiry. Coach wants to confirm the session on the athlete's behalf so the cash-debt flow can activate.

**Flow:**

1. Waiting tab card shows `[Edit] [Cancel]` inline. Coach taps **Edit**.
2. If invite payment type is `cash` → bottom-sheet drawer with 3 options. (If payment type is `card`, Edit pushes directly to the event editor — force-confirm is not applicable for card payments, since coach can't pay on the athlete's behalf via Stripe.)
3. Drawer options:
   - **Confirm for athlete** (primary) — opens confirmation sheet (step 4).
   - **Edit invite details** — pushes to event editor; saving re-pings the athlete via PATCH.
   - **Cancel invite** — destructive withdraw (same as inline Cancel button).
4. Confirmation sheet copy: "Confirm Anna attended this session? Use only if you've agreed offline. Anna will see this confirmation when she next opens 321Fit. Cash debt activates as normal."
5. Coach taps **Confirm for athlete** → `POST /api/v1.0.0/coach/training-events/{id}/coach-confirm` → backend transitions `training_event.status` from `coachInvited` to **`coach_confirmed`** (new enum value, separate from regular `confirmed`).
6. Side effects:
   - Event flows through regular lifecycle (`coach_confirmed` → `review` after end time → `finished` after coach Completion).
   - Cash transaction created in `unpaid` state at lifecycle's `finished` moment, same as regular flow.
   - Audit trail: `training_event.coach_confirmed_at` timestamp + `training_event.coach_confirmed_by_user_id` recorded for dispute resolution.
   - Athlete receives **no push** (silent).
7. Next time athlete opens the event sheet, an informational blue note appears above View Details: "Confirmed by Coach Mark on your behalf. Mark indicated you agreed to this session offline (Apr 14). Reach out to your coach if this doesn't look right."

**Eligibility:**
- Allowed when: `payment_type = cash` AND `training_event.status = coachInvited` AND `coach_id = current_user.coach_id`.
- Allowed **immediately after invite is sent** (no wait for scheduled time). Rationale: coach often agrees offline before sending the invite.

**Backend status enum extension:**
- `training_event.status` adds `coach_confirmed` value, positioned in the lifecycle between `coachInvited` and `review`.
- Status appears in dispute/history queries as `coach_confirmed` (not collapsed to `confirmed`) so legal / Support can prove athlete consented offline rather than in-app.

**API:**
- `POST /api/v1.0.0/coach/training-events/{id}/coach-confirm` → body empty. Returns updated event with `status=coach_confirmed`. Rejects (400) if eligibility check fails; (404) if event not found / not owned by caller.

### Flow J2 — Coach: Pending breakdown (2026-05-20 — new)

Maps to prototype `flows/coach/balance.html#s-pending`. Replaces the old `pending-info-sheet` popup (its ⓘ tap target was sub-10pt, effectively unreachable on touch).

**Entry:** tap anywhere on the Pending col in Card hero (the full col is the hit area now; a chevron after the label signals tappability — same affordance as the Available col).

**Screen content:**
1. Hero — total amount + session count + clearance window (e.g. "€75.00 · 3 sessions · clears Apr 11–13"). Canonical `.earn-detail-hero`.
2. Inline info banner — "Funds wait 24h before becoming available. This window covers cancellations and no-shows — so what moves into your balance is final." Canonical `.earn-banner.info`.
3. Sessions list — each row is a Card session completed but still in Stripe's 24h hold. Row shape mirrors Recent activity (`.earn-txn` + `.earn-txn-group`): icon + title + athlete · datetime + amount + "Clears {datetime}" subline. Tap row → `s-txn-earning` for the session's full detail.
4. Footer — reminds when funds move to Available + next payout date.

**API:** the existing `pending` field on `GET /coach/earnings` snapshot is just an aggregated total — this screen needs an additional list endpoint. Proposed: `GET /coach/earnings/pending` returning array of pending earning rows with `{event_id, title, athlete_name, completed_at, amount, clears_at}`. Same shape can be filtered out of an extended `/coach/transactions?status=pending` if a unified ledger endpoint is preferred — backend choice.

**Scope:** Stripe 24h-hold breakdown only. "Upcoming sessions forecast" (cash + card future bookings — see § 10 Open questions Q1) is a separate, deferred screen — would live alongside or extend this one.

### Flow K — Coach: Earnings history

Maps to prototype `flows/coach/balance.html#s-earnings-history`.

**Three entry points** (all open the same screen, different filter):
- Tap Cash card top → filter = Cash
- Tap Card card top → filter = Card
- Tap lifetime footer → filter = All

**Structure:**
- Hero (`.earn-detail-hero`) with lifetime number per filter ("Lifetime · all sources" / "Lifetime · Card via Stripe" / "Lifetime · Cash").
- Filter chips (All / Card / Cash) — re-filter without leaving.
- Month list grouped by year. Each row shows: month name (current month highlighted in teal with "· current" suffix) + breakdown subline (content varies by filter) + total amount.
- Subline content per filter: All → "€X Card · €Y Cash"; Card → "{N} sessions"; Cash → "{N} sessions". Row height stays constant across filters (consistent tap target).

**Lifetime calculation:** shows **net** earnings (gross minus refunds, disputes, fees). What landed in pocket / bank.

**Month drill-down deferred** — see Open questions. Currently rows are read-only.

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

**Balance screen states** (`s-balance`, `bs-*` — same list pattern as other screens):

| State | Trigger | UI |
|---|---|---|
| `default` | has transactions | hero + summary + filtered ledger |
| `empty` | no transaction history | €0 hero + "No transactions yet" empty-state |
| `loading` | first fetch | skeleton hero + rows |
| `error` | fetch failed | inline error + Retry |

**Athlete transaction types** (`athlete_transactions.type`, for the ledger):

| Type | When | Amount sign |
|---|---|---|
| `top_up` | Stripe top-up succeeded | + (money in) |
| `spend` | Balance held/charged for a booked session | − (money out) |
| `refund` | Session cancelled, funds returned per policy | + (money in) |

### Coach earnings states (Earnings screen — swiper)

State is **decomposed into two independent axes** (Cash card + Card card), each rendering its own UI inside the swiper. Old `st-full / st-premium / st-zero / st-lock` monolithic state class is deprecated.

**Cash card state** (`data-cash` attribute):

| Value | Condition | UI |
|---|---|---|
| `active` | Has any cash income or owed amount | "This month €X" + tappable "€Y owed by N athletes" row |
| `zero` | No cash income, no cash owed | Empty-state copy "No cash collected yet" |

**Card card state** (`data-card` attribute) — mirrors Stripe Connect lifecycle:

| Value | Condition | UI |
|---|---|---|
| `lock` | `coach.stripeConnected = false` | Outline indigo + "Connect Stripe" CTA |
| `verifying` | Stripe account exists, `charges_enabled = false`, `requirements.currently_due = []` | Outline indigo + info banner + "View details" |
| `action` | Stripe account exists, `requirements.currently_due` non-empty | Outline yellow + warn banner + "Resolve now" CTA |
| `zero` | `charges_enabled = true`, available + pending = 0 | Filled gradient muted €0/€0 |
| `active` | `charges_enabled = true`, has balance | Filled gradient with Available / Pending + Next payout (MVP) |
| `premium` | Same as `active` + Instant Payout enabled (post-MVP) | Same as `active` + Withdraw pill |

### Cash earning status (Cash detail screen)

| Status | When | UI |
|---|---|---|
| `unpaid` | Cash session marked finished, no `cash_paid` ledger row yet | Yellow hero pill + "Manage payment" CTA opens drawer |
| `received` | After coach taps "Mark as paid" in drawer (creates `cash_paid` row) | Teal hero pill + "Marked paid {date}" — terminal, no reverse action |
| `payment_waived` (**new 2026-06-02**) | After coach taps "Waive payment" in drawer (no ledger row, but audit log entry) | Grey hero pill + "Waived {date}" — terminal, no reverse, silent to athlete |

### Stripe Connect state

Covered in detail in [stripe-connect-onboarding.md § 3.2](./stripe-connect-onboarding.md#32-account-lifecycle). Summary: 2 lifecycle states (`not_set_up | connected`) + 3 sub-modes inside connected (`clean | verifying | action`), surfaced via `CoachEarningsSnapshot.defaultProvider.status`. Earnings flow regardless of sub-mode — charges work; only payouts pause on `action` / `verifying`.

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
  "available":               340.50,
  "pending":                  75.00,
  "currency":                "EUR",
  "payoutSchedule":          { "kind": "weekly", "nextRunAt": ISO8601, "threshold": 20.00 },
  "defaultProvider":         { "kind": "stripe_connect", "status": "connected", "currentlyDue": [], "deadline": null },
  "cashOwed":                { "count": 2, "total": 40.00 },
  "cashReceivedThisMonth":   120.00,
  "totalIncomeThisMonth":    600.00,
  "lifetimeTotal":          2840.00,
  "lifetimeCard":           2100.00,
  "lifetimeCash":            740.00,
  "cashState":              "active" | "zero",
  "cardState":              "lock" | "verifying" | "action" | "zero" | "active" | "premium"
}
```

`cashState` / `cardState` are derived enums for the Earnings screen swiper (see § 5). Client renders the two swipe cards directly from these — no monolithic `uiState` field.

#### `GET /coach/earnings/history?from=YYYY-MM&to=YYYY-MM&method=all|cash|card`

Monthly aggregated history for the Earnings History screen (`s-earnings-history`).

**Response 200:**
```json
{
  "lifetime":   { "total": 2840.00, "card": 2100.00, "cash": 740.00 },
  "currency":   "EUR",
  "months":     [
    { "year": 2026, "month": 4, "total": 600.00, "card": 480.00, "cash": 120.00, "sessionsCard": 8, "sessionsCash": 4, "current": true },
    { "year": 2026, "month": 3, "total": 580.00, "card": 450.00, "cash": 130.00, "sessionsCard": 9, "sessionsCash": 5, "current": false },
    ...
  ]
}
```

Lifetime totals are **net** (gross minus refunds, disputes, fees). Computed from `coach_transactions` ledger.

#### `GET /coach/earnings/pending`

Pending breakdown — sessions whose Card payment cleared the athlete side but is still inside Stripe's 24h hold (not yet moved to coach Available). Used by Pending breakdown screen (`s-pending`, Flow J2).

**Response 200:**
```json
{
  "total":      75.00,
  "currency":   "EUR",
  "clearsFrom": "2026-04-11T18:00:00Z",
  "clearsTo":   "2026-04-13T20:00:00Z",
  "items": [
    {
      "transactionId": "<uuid>",
      "eventId":       "<uuid>",
      "athleteName":   "Anna K.",
      "athleteAvatar": "https://…",
      "title":         "Basketball Training",
      "completedAt":   "2026-04-10T12:00:00Z",
      "amount":        50.00,
      "clearsAt":      "2026-04-11T12:00:00Z"
    },
    …
  ]
}
```

Empty list → return `items: []` with `total: 0` (clients render empty state).

#### `GET /coach/transactions?type=&month=YYYY-MM&page=&size=`

Paginated transactions. `type` optional filter (earnings / payouts / refunds). `month` optional filter (added per § 10 Q2 Variant A decision — month rows on Earnings history deep-link here with `month` prefilled, displayed as removable filter chip on Transactions screen).

#### `GET /coach/transactions/{id}`

Detail view.

#### `POST /coach/transactions/{id}/mark-paid`

Mark a cash earning as received (Flow J). Idempotent — already-received returns 204.

**Response 200:** updated transaction (now `status: "received"`, with `paidAt` timestamp). Adds a `cash_paid` ledger row server-side. No reverse action — corrections via Support.

**400:** if transaction is not `method=cash` or already in non-`unpaid` state (race).

#### `POST /coach/payouts/instant`

Initiate Instant payout.

**Body:** `{ amount: number, providerKey: string }`
**Response 200:** updated earnings snapshot + transaction id.
**Response 400:** amount exceeds available, provider not available, etc.

`status` is enum: `"not_set_up" | "verifying" | "connected" | "action_required"`. Derived from Stripe webhook `account.updated`. `currentlyDue` mirrors `account.requirements.currently_due` (empty unless `status = action_required`). `deadline` mirrors `account.requirements.current_deadline` (ISO8601 or `null`).

#### Stripe Connect onboarding endpoints

`POST /coach/stripe/consent` and `POST /coach/stripe/connect/session` — defined in [stripe-connect-onboarding.md § 6](./stripe-connect-onboarding.md#6-api).

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

### Legal consent

Onboarding requires explicit consent capture before opening the Stripe SDK — see [stripe-connect-onboarding.md § 7](./stripe-connect-onboarding.md#7-business-rules).

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

**Native UI conventions:** see [architecture/design-system.md § Native theming contract](../architecture/design-system.md#native-theming-contract). Don't duplicate cross-platform UI rules here — only platform-specific deviations below.

- **iOS (Stripe Connect embedded onboarding):** SDK details, controller config, migration plan from the existing Express implementation — see [stripe-connect-onboarding.md § 9 + § 10](./stripe-connect-onboarding.md#9-platform-notes).
- **iOS (Stripe PaymentSheet):** existing integration continues for athlete top-up.
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
- [ ] **Pending sessions view (no current screen):** there is no screen today that surfaces "booked but not yet completed" sessions — card sessions awaiting confirmation/completion + cash sessions in upcoming agenda. Coach loses visibility into "what's coming this week / tomorrow" from the money side. Decide: extend Earnings screen with a "Upcoming" section, or build a dedicated `s-upcoming` screen, or surface from Calendar with a money filter. **Owner:** product + design. Captured 2026-05-15.
- [ ] **Month drill-down approach (Earnings History):** monthly rows on `s-earnings-history` are currently read-only. Two paths to enable drill-down: **(A)** add a month-filter chip to Transactions screen (small change, dual-purpose UI) or **(B)** new dedicated `s-month-detail` screen with summary card + month's transaction list (more focused UX, more work). Also possible third path: surface the breakdown inline on Earnings via a different filter mode on Recent activity. **Owner:** product + design. Captured 2026-05-15.

---

## Related specs / references

- [stripe-connect-onboarding.md](./stripe-connect-onboarding.md) — onboarding flow, consent capture, embedded SDK, 4-state lifecycle, migration plan
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
