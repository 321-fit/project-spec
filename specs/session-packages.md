# Session Packages

> Status: Draft — 🚧 Work in Progress (still shaping; UX + copy will change)
> Prototype (coach create/manage): [flows/coach/sessions.html](https://321-fit.github.io/project-spec/prototypes/flows/coach/sessions.html)
> Prototype (athlete buy/redeem): [flows/shared/profile.html](https://321-fit.github.io/project-spec/prototypes/flows/shared/profile.html)
> Prototype (athlete pack tracking): [flows/athlete/my-coaches.html](https://321-fit.github.io/project-spec/prototypes/flows/athlete/my-coaches.html)
> Prototype (coach pack tracking): [flows/coach/clients.html](https://321-fit.github.io/project-spec/prototypes/flows/coach/clients.html)
> Prototype (coach inbox): [flows/coach/dashboard.html](https://321-fit.github.io/project-spec/prototypes/flows/coach/dashboard.html)
> Feature map: [flows/journeys/packages.html](https://321-fit.github.io/project-spec/prototypes/flows/journeys/packages.html)
> Related specs: [payments.md](./payments.md) · [session-creation.md](./session-creation.md) · [booking-flow.md](./booking-flow.md) · [clients-coaches.md](./clients-coaches.md) · [notifications-catalog.md](./notifications-catalog.md)
> Last updated: 2026-07-14
> Implementation:
> - iOS:     321fit_ios/docs/session-packages-ios.md (to be created)
> - Android: 321fit_android/docs/session-packages-android.md (to be created)
> - Backend: poly-backend/docs/session-packages-api.md (to be created)

---

## 1. Overview

A **session package** ("pack") lets a coach sell N sessions of one training template at a discount. The athlete pays the whole amount **upfront** and **redeems** the credits one booking at a time. It's a coach retention/business tool (fits our subscription model — packs are **not** a 321Fit revenue stream; the coach keeps the money).

A pack is a **third "what you buy"** alongside a single session — a **separate credit-ledger object** (N credits of template X with coach Y), *not* a payment method and *not* a property of the template.

Researched ~18 competitor apps (Mindbody / TeamUp / PushPress / Everfit closest). Nobody ships a progress visual better than "3/5" or ties packs to goals — those are our openings. Low-balance renewal nudges (only TeamUp/FitBudd do them) are our cheap differentiator.

---

## 2. Locked model decisions

1. **Pack = separate credit-ledger** (N credits for template X, coach Y). A third purchasable alongside single session — not a payment method. Cash/card are the payment axis; both valid.
2. **Paid upfront, full amount** (gym-pass model, not staged hold/release). Coach paid immediately (card) / on receipt (cash). Booking **burns 1 credit**, no charge at booking.
3. **Cash OR card both allowed.**
   - **Card** → credits active instantly.
   - **Cash** → pack is **"pending payment"** but **credits are bookable immediately** *(revised 2026-07-14)*. Original hard redeem-gate was dropped: every booking already needs coach approval, so blocking redemption is redundant friction. Visibility replaces the gate (see §7). Coach still tracks payment via **"Mark received"**.
4. **No expiration.** This (not staged payout) is what defuses the refund / gift-card-expiry legal risk (ClassPass class-action; SoulCycle $9.2M CARD-Act). Refund of unused credits = **manual coach action**, never automatic. There is **no expiry field** in the UI.
5. **1 pack tier = 1 session type.** Value-based / mixed-credit packs are cut.
6. **No-show:** default rule (late-cancel burns a credit, coach can forgive). Configurable-per-coach policy deferred.
7. **Works on all training types** (personal / group / self-paced). Goals/milestone tie-in = Phase 2 (a framing layer over the credit primitive, not a new billing object).
8. **Low-balance alert** to the coach ("Offer renewal" when a client is running low) = the differentiator.
9. **Max 3 tiers per session** (market avg is 2–3 pack sizes; good/better/best; more causes choice paralysis — Hick's law — and dilutes the discount ladder).
10. **Stacking:** a client may hold **multiple credit lots** of the same session type (repeat or upgrade purchase). Credits burn **FIFO** (oldest lot first). An "upgrade" (buying a bigger tier) is simply another lot — no proration.

---

## 3. User stories

### Coach
- As a coach, I want to sell a bundle of my sessions at a discount so clients commit and pre-pay, improving retention and cash flow.
- As a coach, I want to define **package tiers** (e.g. 5-pack, 20-pack) on a session and see the per-session rate + discount as I set the price.
- As a coach, I want to see **which pack size sells best** so I can tune my offer.
- As a coach, I want to see **who holds a pack and how many sessions they have left**, and nudge clients who are running low to renew.
- As a coach, I want to know when a client **bought a pack in cash** and be able to mark it **received**, while still being able to approve their bookings in the meantime.
- As a coach, I want a client's **redemption history** for a pack (which sessions burned credits, and each purchase lot).

### Athlete
- As an athlete, when booking a session with a coach, I want to see if I can **save by buying a pack** instead of paying per session.
- As an athlete, I want to **buy a pack** (cash or card) and immediately **book my first session** without hunting for where to go.
- As an athlete, I want to **redeem** a pack credit at booking with the price clearly shown as **"included in pack"**.
- As an athlete, I want to see my **remaining sessions** per coach and my **purchase history** for each pack.
- As an athlete paying cash, I want to still book while my payment is **pending** the coach's confirmation, and understand what "pending" means.

---

## 4. Coach — create & manage packs

Package management lives **outside** the template form (a pack is its own object). Entry: **My training sessions** (`sessions.html` `#s-list`) has a segmented **[ Sessions | Packages ]** control.

### 4.1 Packages tab (`#s-list`, packages pane)
- Cards **grouped by base session** (one card per template that has packs). Each card: session name + base single price + tier summary rows (`5 sessions · €22/ea · save 12% · €110`) + a footer.
- Footer = a **drill-down**: "18 sold · 6 active" (or "N clients running low" + "Offer renewal") → taps straight into the pack's **Buyers** tab.
- Tapping the card **body** → the pack **Overview**.
- **Empty state** when no packs yet + "Create a package" CTA.

### 4.2 Create flow
Header `+` (or empty-state CTA) → **Pick a session** (`#pkg-pick`, the session list as a selectable picker) → **Package editor** (`#pkg-editor`) with that session preselected. A pack is always based on one session, so the base is chosen first (no template-picker step needed when entering from a specific session).

### 4.3 Package detail (`#pkg-editor`) — edit mode
Segmented **[ Overview | Buyers ]**. In **create** mode there are no buyers yet, so only Overview shows.

**Overview (view-first):**
- Read-only base-session context row ("Basketball Training · €25 single · Based on") — feeds the discount math.
- Tiers as **read-only info cards**: "N sessions" + `Best seller` badge on the leader + "€/ea · save% · N sold" + "€total" + a pencil.
- **Editing is per-tier via a drawer** (`#pkg-tier-sheet`): the pencil (edit) or "+ Add package tier" opens a focused bottom sheet — sessions stepper + € total + live per-session/discount math + **Save tier** (and **Remove tier** when editing an existing tier, hidden on the last remaining tier). It touches only that one tier.
- **Create** mode shows a "Create package" footer to finalize; **detail** mode has no footer (each tier saves on drawer Save).
- **No expiry field** (decision #4). Payment axis (cash/card) is not set here — both are always allowed.
- Header trash deletes the pack; existing credit holders keep their sessions (refund is manual).

**Buyers:**
- Every athlete holding this pack + remaining sessions (progress bar; scales to any pack size). Stacked holders show aggregate ("2 packs · 11 of 25 used · 14 left").
- **Running-low** rows (≤1 left / used up) turn amber with an inline **Offer renewal** (→ "Offer sent").
- Bulk **"Offer renewal → N running low"** at the bottom (→ "Renewal sent"). **Zero state** when nothing sold.

### 4.4 Per-client pack view (`clients.html` `#s-client-detail`)
The client's packages appear on their profile: aggregate card per session type (progress bar + "X of N used · Y left") → tap → **Package detail** (`#s-pkg-detail`, coach): summary + contextual action (Offer renewal / Mark received) + **Sessions used** ledger + **Purchases** (one row per lot with badge, price, date·method, pay status, per-lot remaining). Cash-pending packs show an **"Unpaid"** pill + "Mark received" ("Cash not received yet · you still approve each booking").

---

## 5. Athlete — buy, first-book & redeem

### 5.1 Discover (session-first)
Packs are discovered **in the context of a session** — no separate athlete "Packages" tab (packs are always 1 session type, so context = the session). On the coach's catalog (`profile.html` `#s-book-sessions`), a session card shows a **"Save with a 5-pack"** strip when that session has packs → opens the **buy sheet** (`#pkg-buy-sheet`) with tier radios + Cash/Card + dynamic CTA.

### 5.2 Buy → first-book handoff
On confirm, a **buy-success sheet** (`#pkg-success-sheet`) replaces the old snackbar:
- **Card:** ✓ "N sessions ready" + mini punch + **[Book your first session]** / [I'll book later].
- **Cash:** ⏳ "N sessions reserved" + amber note "Pay John in person · pack pending until confirmed — you can still book now; he approves each booking anyway" + same CTAs.
- **Book first session** → the athlete's booking calendar (`#s-booking`) with a **"Booking your 1st of N"** banner → pick a slot → **booking-confirm** in pack-redemption mode showing "1st of N · Basketball pack", price struck → "Included in pack", CTA "Book · use 1 session".

### 5.3 Redeem (later bookings)
Any subsequent booking of a session the athlete holds credits for auto-offers redemption in the confirm sheet (`pm-pack`): "Use 1 session from your pack · X left after this booking" + "Pay per session instead" fallback.

### 5.4 Athlete pack tracking (`my-coaches.html` `#s-coach-detail`)
"Your packages" section: aggregate card per session type (progress bar + "X of N used · Y left"), with a **Pending payment** pill for unpaid cash packs ("Pay John €200 in person · bookable now"). Tap → **Package detail** (`#s-pkg-detail`, athlete): summary + "Book next / Book your 1st session" + **Your sessions** ledger + **Purchases** (lots).

---

## 6. Cash handling (both sides)

Cash packs are **bookable while pending** (decision #3, revised). Payment tracking + visibility replace the old hard gate:
- **Athlete:** pack card shows **"Pending payment"** until the coach confirms; the buy sheet explains it.
- **Coach — inbox** (`dashboard.html` `#s-notifications`): (1) Activity notification "Anna bought a 5-pack · Cash · €200 — collect in person, then mark received"; (2) To-reply booking request from an unpaid cash pack carries a note "From an **unpaid** 5-pack · €200 cash owed. Accepting books the session — mark the pack received once Anna pays."
- **Coach — client detail:** the pack shows **"Unpaid"** + **"Mark received"** until confirmed.

---

## 7. Stacking (repeat / upgrade purchases)

An athlete can hold multiple **credit lots** of the same session type. Display = **aggregate in lists + lots in the detail**:
- **Lists** (coach client detail, athlete coach detail, Buyers rows): one aggregate card/row per session type — "Personal · 2 packs", combined progress + "X of N used · Y left".
- **Package detail:** summary aggregates all lots; **Sessions used** ledger is combined FIFO; **Purchases** lists each lot with a badge — **"Renewal"** (same size) / **"Upgrade → 20-pack"** (bigger) — plus price, date·method, pay status, and per-lot remaining ("14 left" / "Used up").

---

## 8. System design

### 8.1 Data model (proposed — backend TBD)
- **`package_offer`** — coach-defined product: `{ id, coach_id, training_session_id (template), status }`.
- **`package_tier`** — `{ id, package_offer_id, sessions_count, total_price {amount_minor, currency}, sold_count }`. Max 3 per offer. No expiry.
- **`package_credit_lot`** (a purchase) — `{ id, package_tier_id, athlete_id, coach_id, sessions_total, sessions_used, purchased_at, payment_method (cash|card), payment_status (paid|pending), price }`. An athlete may hold multiple lots per session type.
- **Redemption** — booking a session burns 1 credit from the **oldest active lot (FIFO)**; recorded as a `package_redemption` linked to the training event. No charge at booking.
- Money on the wire: `{ amount: int (minor units), currency }` (see [payments.md](./payments.md)).

### 8.2 Backend responsibilities
- Card purchase → Stripe upfront charge (reuse existing top-up/charge path), lot `paid`.
- Cash purchase → lot `pending`; coach "Mark received" flips to `paid`. **Booking allowed while pending** (coach approval is the control).
- Low-balance signal (client running low) → coach notification + "Offer renewal" nudge (push).
- Refund of unused credits = manual coach action (no auto-refund on delete/expiry).

### 8.3 API (additive — see backward-compat rule)
Client-facing per-endpoint reference will live in `poly-backend/docs/session-packages-api.md`. Expected surface (to be finalized with backend):
- Coach: create/update/delete `package_offer` + tiers; list buyers; mark cash received; send renewal.
- Athlete: list buyable packs for a coach's session; buy pack (cash/card); list held packs + lots; redeem at booking.
- **Extend** the existing booking-confirm endpoint additively to accept "pay with pack credit" (new optional field), never a breaking change.

---

## 9. Open questions / WIP

- **Backend model not yet ratified** — §8 is a proposal; confirm entity shapes + FIFO redemption with backend before issue creation.
- Sales stats widget (sold / collected / earned) on the coach Overview was **removed for now** — revisit whether/where coach sees aggregate pack revenue.
- No-show credit-burn policy: currently default (late-cancel burns); per-coach config deferred.
- Goals/milestone tie-in (Phase 2).
- Buyer lists in the prototype are illustrative/mock.
- Post-purchase first-book: single "Book first session" variant chosen (sheet → calendar); auto-jump variant parked.

---

## 10. Prototype anchor reference

| Surface | File | Anchor |
|---|---|---|
| Coach Packages tab | coach/sessions.html | `#s-list` packages pane |
| Pick base session | coach/sessions.html | `#pkg-pick` |
| Package editor (Overview/Buyers) | coach/sessions.html | `#pkg-editor` |
| Tier drawer | coach/sessions.html | `#pkg-tier-sheet` |
| Athlete buy sheet | shared/profile.html | `#pkg-buy-sheet` |
| Buy success | shared/profile.html | `#pkg-success-sheet` |
| First-book banner | shared/profile.html | `#s-booking` `.bk-first-banner` |
| Redeem at booking | shared/profile.html | `#booking-confirm-sheet` `.pm-pack` |
| Athlete pack cards | athlete/my-coaches.html | `#s-coach-detail` "Your packages" |
| Athlete pack detail | athlete/my-coaches.html | `#s-pkg-detail` |
| Coach client packs | coach/clients.html | `#s-client-detail` Packages |
| Coach pack detail | coach/clients.html | `#s-pkg-detail` |
| Cash purchase notif + request | coach/dashboard.html | `#s-notifications` |
