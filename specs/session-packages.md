# Session Packages

> Status: Draft — 🚧 Work in Progress (still shaping; UX + copy will change)
> Prototype (coach create/manage): [flows/coach/sessions.html](https://321-fit.github.io/project-spec/prototypes/flows/coach/sessions.html)
> Prototype (athlete buy/redeem): [flows/shared/profile.html](https://321-fit.github.io/project-spec/prototypes/flows/shared/profile.html)
> Prototype (athlete pack tracking): [flows/athlete/my-coaches.html](https://321-fit.github.io/project-spec/prototypes/flows/athlete/my-coaches.html)
> Prototype (coach pack tracking): [flows/coach/clients.html](https://321-fit.github.io/project-spec/prototypes/flows/coach/clients.html)
> Prototype (coach inbox): [flows/coach/dashboard.html](https://321-fit.github.io/project-spec/prototypes/flows/coach/dashboard.html)
> Feature map: [flows/journeys/packages.html](https://321-fit.github.io/project-spec/prototypes/flows/journeys/packages.html)
> Related specs: [payments.md](./payments.md) · [session-creation.md](./session-creation.md) · [booking-flow.md](./booking-flow.md) · [clients-coaches.md](./clients-coaches.md) · [notifications-catalog.md](./notifications-catalog.md)
> Last updated: 2026-08-11 (implementation pointers reconciled — [audit](../audits/2026-08-11-specs-vs-android.md))
> Implementation:
> - iOS:     321fit_ios/docs/session-packages-ios.md (to be created)
> - Android: not built
> - Backend: **shipped, and the doc exists** — [poly-backend/docs/session-packages-api.md](../../poly-backend/docs/session-packages-api.md).
>   Live surface: coach `package-offers` (+ `/tiers`, `/sell`, `/buyers`, `/offer-renewal`),
>   `package-lots/{id}/mark-cash-received`, `coach/clients/{id}/packages[/{offerId}[/history]]`;
>   athlete `coaches/{id}/packages[/{offerId}[/history]]` and
>   `coaches/{id}/training-sessions/{sessionId}/package-offer`.
>   The spec's own status stays **Draft** on purpose — the UX is still shaping, and the backend
>   arriving first is exactly the reference-stand order, not a signal that the design is settled.

---

## 1. Overview

A **session package** ("pack") lets a coach sell N sessions of one training template at a discount. The athlete pays the whole amount **upfront** and **redeems** the credits one booking at a time. It's a coach retention/business tool (fits our subscription model — packs are **not** a 321Fit revenue stream; the coach keeps the money).

A pack is a **third "what you buy"** alongside a single session — a **separate credit-ledger object** (N credits of template X with coach Y), *not* a payment method and *not* a property of the template.

Researched ~18 competitor apps (Mindbody / TeamUp / PushPress / Everfit closest). Nobody ships a progress visual better than "3/5" or ties packs to goals — those are our openings. Low-balance renewal nudges (only TeamUp/FitBudd do them) are our cheap differentiator.

---

## 2. Locked model decisions

1. **Pack = separate credit-ledger** (N credits for template X, coach Y). A third purchasable alongside single session — not a payment method. Cash/card are the payment axis; both valid.
2. **Paid upfront, full amount, straight to the coach** (gym-pass model, not staged hold/release). Coach paid immediately (card) / on receipt (cash) — **the platform holds nothing back**. Booking **burns 1 credit**, no charge at booking.
   - *Escrow was considered and rejected 2026-07-15.* Holding pack funds and releasing them per redemption would have made refunds automatic and capped chargeback exposure — but it makes **card strictly worse than cash for the coach**, who is paid instantly in cash. That pushes the whole flow to cash, which has no visibility and no protection at all. (The same incentive exists for single sessions — card held 24h vs cash instant — but the difference is **magnitude, not principle**: a coach tolerates 24h on €25 and won't tolerate months on €400.) Mitigation is a **plain-spoken disclaimer at purchase** instead (§6.1). Alternatives kept on the table if the legal check (§9) comes back negative: timed escrow (~14d release), or caps + rolling reserve.
   - **Risk we are knowingly carrying:** money flows through the platform and the coach is paid out by us ⇒ **we are merchant of record ⇒ chargebacks land on us**, not the coach — no in-app copy changes that. And because 321Fit is a **subscription** business, we earn nothing on the pack while carrying full dispute liability (a commission marketplace would price this into its take rate; we have none). Accepted deliberately; see §9.
3. **Cash OR card both allowed.**
   - **Card** → credits active instantly.
   - **Cash** → pack is **"pending payment"** but **credits are bookable immediately** *(revised 2026-07-14)*. Original hard redeem-gate was dropped: every booking already needs coach approval, so blocking redemption is redundant friction. Visibility replaces the gate (see §6.2). Coach still tracks payment via **"Mark received"**.
4. **No expiration.** This (not staged payout) is what defuses the **gift-card-expiry** legal risk (ClassPass class-action; SoulCycle $9.2M CARD-Act). There is **no expiry field** in the UI.
   - **Refund of unused credits = the coach's call**, never automatic and **not a platform mechanism** — since we hold no funds (#2), there is nothing for us to return. Do **not** build a refund flow in the app expecting money to move behind it. The athlete is told this plainly at purchase (§6.1) rather than being left to assume a guarantee.
   - Note what no-expiry does **not** cover: it answers *credits lapsing*, not *the coach not delivering*. Prepayment creates that second risk independently, and forever-credits extend its window. See §9.
5. **1 pack tier = 1 session type.** Value-based / mixed-credit packs are cut.
6. **A credit-funded session follows the normal session rules** *(settled 2026-07-15)* — the pack changes *what pays*, not *how booking behaves*. **Cancelling a booking returns the credit** (mirrors the money path: a cancelled card session is refunded to balance). Late-cancel/no-show inherit whatever `event-statuses.md` defines for sessions; a burn the coach wants to forgive is a **credit return**, the same operation. Configurable-per-coach policy deferred.
7. **Works on all training types** (personal / group / self-paced). Goals/milestone tie-in = Phase 2 (a framing layer over the credit primitive, not a new billing object).
8. **Low-balance milestones — to BOTH sides** *(revised 2026-07-15; was coach-only)*. Threshold = **20% of the active pack, floored at 1** (`max(1, ceil(active_pack_size × 0.2))` → 5-pack: 1 · 10-pack: 2 · 20-pack: 4). A flat "1 left" warns on the *last* session of a 20-pack. Two fires per cycle, once each: **running low** and **used up (0)**; re-armed when a new lot is bought. The coach's manual **Offer renewal** stays on top as a coach-initiated nudge, rate-limited to once per 7 days per pack. Full rules + copy: [notifications-catalog.md § 1.1](./notifications-catalog.md) (categories 25–29). The differentiator (only TeamUp/FitBudd nudge at all) is the coach half; the athlete half is what closes the loop — before this, tapping "Offer renewal" landed nowhere.
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
- As a coach, I want a client's **history** for a pack — what they bought, when, and where the credits went — without scrolling past a hundred sessions to find it.
- As a coach, I want to be told **before** a client runs out, with enough notice to sell the next pack — not on their last session.

### Athlete
- As an athlete, when booking a session with a coach, I want to see if I can **save by buying a pack** instead of paying per session.
- As an athlete, I want to **buy a pack** (cash or card) and immediately **book my first session** without hunting for where to go.
- As an athlete, I want to **redeem** a pack credit at booking with the price clearly shown as **"included in pack"**.
- As an athlete, I want to see my **remaining sessions** per coach and my **purchase history** for each pack.
- As an athlete paying cash, I want to still book while my payment is **pending** the coach's confirmation, and understand what "pending" means.
- As an athlete, I want to know **before I run out** that my pack is ending, so training doesn't stop while I sort out the next one.
- As an athlete, I want to know **up front what I'm paying for and who holds the money**, so a prepayment isn't a surprise later.
- As an athlete, I want a **cancelled booking to give my credit back**, exactly as a cancelled paid session gives my money back.

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
- **Editing is per-tier on its own screen** (`#pkg-tier-edit`): the pencil (edit) or "+ Add package tier" pushes a focused screen — base-session context row + sessions stepper + € total + live per-session/discount math + footer **Save tier**; **back = cancel** (nothing is written until Save). It touches only that one tier. A **header trash** removes the tier (edit mode only, hidden on the last remaining tier) → confirm sheet. A screen, not a bottom sheet: the € total is a typed field, and a keyboard over a sheet buries the live math, the Save button, and Remove.
- **Create** mode shows a "Create package" footer to finalize; **detail** mode has no footer (each tier saves on the tier screen). The two Saves are at different levels: the tier screen saves a *tier*, the package screen creates the *package*.
- **No expiry field** (decision #4). Payment axis (cash/card) is not set here — both are always allowed.
- Header trash deletes the pack; existing credit holders keep their sessions (refund is manual).

**Buyers:**
- Every athlete holding this pack + remaining sessions. The bar and counter follow the **current pack**, not the lifetime total ("2 packs · 6 of 20 used · 14 left") — same reasoning as §4.4.
- **Running-low** rows turn amber with an inline **Offer renewal** (→ "Offer sent"). Threshold = the milestone rule in #8 (`max(1, ceil(active_pack_size × 0.2))`), **not** a hardcoded 1 — the UI and the notification must agree.
- Bulk **"Offer renewal → N running low"** at the bottom (→ "Renewal sent"). **Zero state** when nothing sold.

### 4.4 Per-client pack view (`clients.html` `#s-client-detail`)
The client's packages appear on their profile: one card per session type, aggregating that type's lots → tap → **Package detail** (`#s-pkg-detail`, coach). Cash-pending packs show an **"Unpaid"** pill + "Mark received" ("Cash not received yet · you still approve each booking"). Section **+** → **Sell a package** (§4.5).

**Status is derived from the lots, never stored** (a stored status goes stale on sell / mark-paid / redeem, and had no depleted case — a paid, used-up pack rendered as "Unpaid"): unpaid → *pending*; 0 left → *depleted* ("Used up" + Offer renewal); `left ≤ max(1, ceil(active_pack_size × 0.2))` → *low* (amber + Offer renewal — same threshold as the milestone push, #8); else *active*.

**Pack detail layout** (identical on the athlete side — see §5.4):
1. **Summary** — leads with **"N left"**; the bar is scoped to the **current (unexhausted) pack**, not lifetime. A lifetime denominator drifts to "900 of 920", reads ~97% full (*nearly done*) for the most loyal client, and at that scale can't separate "14 left" from "2 left". Used-up lots leave the bar; they remain visible as `+N` events in Activity.
2. **Activity — one stream.** A purchase (`+20`) and a redemption (`−1`) are events on the **same credit account**, so they read chronologically together on canonical **`.fit-txn`** rows (intent icon + title + sub + date 3rd line + amount) — the same grammar as the Earnings/balance ledger. Detail shows the **3 most recent + See all N**.
   - **A separate Purchases section was tried and removed** (2026-07-15). It broke at ~20 lots exactly as the redemption log did, and **per-lot status isn't actionable**: FIFO decides which lot burns, not the user — so "which lot is live / used up" is trivia. The only actionable facts are **how many left** (summary) and **what was paid** (History → Purchases chip).
3. **History (`#s-pkg-history`)** — the full stream + canonical quick chips **`All · Sessions · Purchases · Returned`** (`.fit-filter-row`, same one-axis pattern as the balance ledger). "How many packs, when, how much" = one tap, and it holds at 46 lots. Header line carries the lifetime stat ("2 packs · €510 · 11 of 25 credits used").

### 4.5 Sell a package (`#cd-sell-package-sheet`)
Tiers **grouped by session**, each showing the same **€/session + save%** math the athlete sees (same `.pkg-buy-tier` component as the buy sheet), + Cash/Card + a live CTA ("Sell 20 sessions · €400"). A repeat purchase of the same session type **appends a lot** to the existing pack (decision #10) rather than adding a card. Cash → pack opens *pending*; card → active. Empty: client with no packs → "No packages yet"; coach with no packages configured → CTA into the Packages tab.

---

## 5. Athlete — buy, first-book & redeem

### 5.1 Discover (session-first)
Packs are discovered **in the context of a session** — no separate athlete "Packages" tab (packs are always 1 session type, so context = the session). On the coach's catalog (`profile.html` `#s-book-sessions`), a session card shows a **"Save with a 5-pack"** strip when that session has packs **and the athlete holds no credits for it** — re-pitching a pack you already own is noise, and running out is the milestone notifications' job (#8), which deep-link straight back here. → opens the **buy sheet** (`#pkg-buy-sheet`) with tier radios + Cash/Card + dynamic CTA.

### 5.2 Buy → first-book handoff
On confirm, a **buy-success sheet** (`#pkg-success-sheet`) replaces the old snackbar:
- **Card:** ✓ "N sessions ready" + mini punch + **[Book your first session]** / [I'll book later].
- **Cash:** ⏳ "N sessions reserved" + amber note "Pay John in person · pack pending until confirmed — you can still book now; he approves each booking anyway" + same CTAs.
- **Book first session** → the athlete's booking calendar (`#s-booking`) with a **"Booking your 1st of N"** banner → pick a slot → **booking-confirm** in pack-redemption mode showing "1st of N · Basketball pack", price struck → "Included in pack", CTA "Book · use 1 session".

### 5.3 Redeem (later bookings)
Any subsequent booking of a session the athlete holds credits for auto-offers redemption in the confirm sheet (`pm-pack`): "Use 1 session from your pack · X left after this booking" + "Pay per session instead" fallback. The booking is otherwise **completely normal** — still a request, still needs the coach's approval, still inside the 48h window. See [booking-flow.md § 8](./booking-flow.md).

**Credit returns** whenever money would have been refunded — coach declines, either side cancels per policy, or the request expires at 48h. A late-cancel burn the coach chooses to forgive is the *same* operation (a return), not a separate mechanism. See [event-statuses.md § 7](./event-statuses.md).

### 5.5 Running low / used up
The athlete is nudged by the **milestone notifications** (#8), not by the catalog upsell — the strip is suppressed once they hold credits (§5.1). Both pushes deep-link back to the buy sheet for that session.

### 5.4 Athlete pack tracking (`my-coaches.html` `#s-coach-detail`)
"Your packages" section: one card per session type, aggregating its lots, with a **Pending payment** pill for unpaid cash packs ("Pay John €200 in person · bookable now"). Tap → **Package detail** (`#s-pkg-detail`, athlete) — **same layout as the coach's** (§4.4): "N left" + current-pack bar → **Activity** (3 most recent) + See all → `#s-pkg-history` (full stream + chips). Action is contextual: *Book your 1st session* (pending cash) / *Book next session* / **"Buy again"** when depleted — offering a booking on a pack with no credits would burn one that doesn't exist.

---

## 6. Payment disclosure & cash handling

### 6.1 Prepay disclaimer (both payment methods)

Because the coach is paid upfront and the platform holds nothing (#2), the athlete is prepaying an individual. We say so at the point of purchase — soft, not alarming — in the buy sheet (`#pkg-buy-sheet`), above the CTA, as a canonical `.fit-banner--info`:

> **Paid upfront, directly to {coach}. Any refund for unused sessions is arranged with him.**

- **Method-independent** — it's true of cash and card alike, so it sits outside the Cash/Card explainer line.
- Its job is **expectation-setting, not protection**. It is not a liability shield: in-app copy does not transfer liability (only the ToS and the Stripe Connect merchant-of-record configuration do), it does not stop a chargeback, and it cannot waive the consumer's statutory withdrawal right. Treat it as UX.
- **No maturity/relationship gate** on who may buy: gating packs behind N shared sessions was considered and rejected — a coach's **first sale is often the pack**, so the gate reinstates the friction packs exist to remove. Gating on coach maturity (`coach-maturity-model.md`: `reviews_count < 1 OR sessions_count < 3`) was also offered and declined. Packs are open to all coaches — a deliberate choice.
- **Planned, not built:** an athlete → coach **report/dispute** channel. None exists today (`reviews.md` defers a report flow; `block` is coach→athlete only), so an athlete currently has no way to report a coach at all. It is an operational lever (ban, pattern-detect, decide on a goodwill refund) — **it does not return money**. Wider than packages; likely its own spec.

### 6.2 Cash handling (both sides)

Cash packs are **bookable while pending** (decision #3, revised). Payment tracking + visibility replace the old hard gate:
- **Athlete:** pack card shows **"Pending payment"** until the coach confirms; the buy sheet explains it.
- **Coach — inbox** (`dashboard.html` `#s-notifications`): (1) Activity notification "Anna bought a 5-pack · Cash · €200 — collect in person, then mark received"; (2) To-reply booking request from an unpaid cash pack carries a note "From an **unpaid** 5-pack · €200 cash owed. Accepting books the session — mark the pack received once Anna pays."
- **Coach — client detail:** the pack shows **"Unpaid"** + **"Mark received"** until confirmed.

---

## 7. Stacking (repeat / upgrade purchases)

An athlete can hold multiple **credit lots** of the same session type. Display = **aggregate in lists + lots in the detail**:
- **Lists** (coach client detail, athlete coach detail, Buyers rows): one card/row per session type — "Personal · 2 packs", `Y left` leading, and a bar scoped to the **current** pack ("6 of 20 used · current pack"). `sessions_left` is the sum across lots, so an athlete holding 14 across two packs is not "low".
- **Package detail:** the summary aggregates all lots; **Activity** is one combined FIFO stream where each lot appears as a `+N` event (size, price, date, method, pay status). No Renewal/Upgrade labels — a repeat buy upgrades nothing (the earlier lot keeps its credits and burns first); it's just another purchase.

---

## 8. System design

### 8.1 Data model (proposed — backend TBD)
- **`package_offer`** — coach-defined product: `{ id, coach_id, training_session_id (template), status }`.
- **`package_tier`** — `{ id, package_offer_id, sessions_count, total_price {amount_minor, currency}, sold_count }`. Max 3 per offer. No expiry.
- **`package_credit_lot`** (a purchase) — `{ id, package_tier_id, athlete_id, coach_id, sessions_total, sessions_used, purchased_at, payment_method (cash|card), payment_status (paid|pending), price }`. An athlete may hold multiple lots per session type.
- **Redemption** — booking a session burns 1 credit from the **oldest active lot (FIFO)**; recorded as a `package_redemption` linked to the training event. No charge at booking.
- Money on the wire: `{ amount: int (minor units), currency }` (see [payments.md](./payments.md)).

### 8.1a Where a pack shows up in the ledgers *(settled 2026-07-15)*
A pack sale is **an ordinary transaction** in both existing ledgers — no new money surface:
- **Athlete balance** — appears in **Recent** while fresh, and in **History** as a transaction like any other (`.fit-txn` row + the existing type chips — see [payments.md § 7 "Session packages — where the money shows up"](./payments.md)).
- **Coach earnings** — same: **Recent**, then the earnings **History**.
- The pack's own **Activity / History** (`#s-pkg-history`) is the *credit* ledger for that pack, and it already uses the same grammar — so the two read consistently.

**Credit-ledger intents map 1:1 onto the balance's money intents**, so the icon vocabulary is reused rather than invented:

| Pack event | Balance analogue | Icon intent | Amount |
|---|---|---|---|
| Bought a pack (`+N`) | top-up | `--in` (teal) + pack glyph | `--plus` |
| Redeemed a credit (`−1`) | spend | `--out` (**gray**) + session glyph | `--minus` |
| **Credit returned (`+1`)** | refund | `--info` (**blue**) + return-arrow glyph | `--plus` (teal) |

Note the colours follow the existing convention, not intuition: spend is **gray, not red**, and a return is **blue + teal `+`** (`payments.md`: *"refund — `--info` blue icon, teal +"*). `--danger` red stays reserved for actual problems; a returned credit isn't one.

### 8.2 Backend responsibilities
- Card purchase → Stripe upfront charge (reuse existing top-up/charge path), lot `paid`.
- Cash purchase → lot `pending`; coach "Mark received" flips to `paid`. **Booking allowed while pending** (coach approval is the control).
- **Milestones** → push + inbox to **both** sides at `left == max(1, ceil(active_pack_size × 0.2))` and again at `left == 0`; **fire once per crossing**, re-armed when a new lot is bought. The coach's manual "Offer renewal" is separate and rate-limited to 1 / 7 days / pack. See [notifications-catalog.md § 1.1](./notifications-catalog.md).
- Refund of unused credits = manual coach action (no auto-refund on delete/expiry).
- **Cancelled booking → return the credit** to the lot it burned (FIFO order is preserved: return to the oldest lot that gave it).
- **Credits survive relationship changes** *(settled 2026-07-15)*: blocking, archiving or deleting a client does **not** void their credits. They keep what they paid for. (Booking while blocked is a `clients-coaches.md` question — the credits themselves are not the lever.)

### 8.3 API (additive — see backward-compat rule)
Client-facing per-endpoint reference will live in `poly-backend/docs/session-packages-api.md`. Expected surface (to be finalized with backend):
- Coach: create/update/delete `package_offer` + tiers; list buyers; mark cash received; send renewal.
- Athlete: list buyable packs for a coach's session; buy pack (cash/card); list held packs + lots; redeem at booking.
- **Extend** the existing booking-confirm endpoint additively to accept "pay with pack credit" (new optional field), never a breaking change.

---

## 9. Open questions / WIP

*Resolved 2026-07-15 and now written into the specs that own them — kept as an audit trail: depleted state · stacked-pack progress · sell sheet wiring · upsell suppression · low/used-up milestones (both sides) · pack sale in both ledgers (`payments.md`) · credit as a third pay path (`booking-flow.md`) · credit returned on cancel/decline/expiry (`event-statuses.md`) · credits survive block/archive/delete (`clients-coaches.md`) · 9 notification categories + § 1.1 milestone rules (`notifications-catalog.md`).*

- 🔴 **LEGAL CHECK — the only hard blocker.** Shipping as designed is conditional on a lawyer answering two narrow questions:
  1. May we sell prepaid packages where **refund is at the coach's discretion**, given the consumer's **14-day right of withdrawal** (distance-sold services)?
  2. Is the **platform jointly liable for non-delivery** when it processed the payment and paid the coach out?
  If either answer is unacceptable → fall back to **timed escrow** (hold, release ~14d — covers the withdrawal window while still paying the coach fast) or **caps + rolling reserve**. Both were designed and are recorded; neither is built.
- 🔴 **Chargeback ownership.** We are merchant of record (funds flow through us, coach is paid out by us), so disputes land on the platform — with **zero revenue** from the transaction to offset them (subscription model, no take rate). No backend change is needed for this; it is a risk to accept knowingly, not a task.
- **Backend model not yet ratified** — §8 is a proposal; confirm entity shapes + FIFO redemption (and FIFO *return* on cancel) with backend before issue creation.
- **Athlete → coach report / dispute channel doesn't exist** (§6.1). Not a packages feature — an athlete currently has no way to report any coach — but prepayment makes it urgent. Likely its own spec. It does **not** return money.
- Sales stats widget (sold / collected / earned) on the coach Overview was **removed for now** — revisit whether/where the coach sees aggregate pack revenue. (Per-pack lifetime is on the pack's History header; per-client is on the pack detail.)
- Per-coach configurable cancel/no-show policy deferred — packs inherit whatever `event-statuses.md` defines (#6), so there is nothing pack-specific to decide here.
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
| Tier edit (add / edit one tier) | coach/sessions.html | `#pkg-tier-edit` |
| Athlete buy sheet | shared/profile.html | `#pkg-buy-sheet` |
| Buy success | shared/profile.html | `#pkg-success-sheet` |
| First-book banner | shared/profile.html | `#s-booking` `.bk-first-banner` |
| Redeem at booking | shared/profile.html | `#booking-confirm-sheet` `.pm-pack` |
| Athlete pack cards | athlete/my-coaches.html | `#s-coach-detail` "Your packages" |
| Athlete pack detail | athlete/my-coaches.html | `#s-pkg-detail` |
| Coach client packs | coach/clients.html | `#s-client-detail` Packages |
| Coach pack detail | coach/clients.html | `#s-pkg-detail` |
| Coach pack history (See all) | coach/clients.html | `#s-pkg-history` |
| Athlete pack history (See all) | athlete/my-coaches.html | `#s-pkg-history` |
| Sell a package | coach/clients.html | `#cd-sell-package-sheet` |
| Cash purchase notif + request | coach/dashboard.html | `#s-notifications` |
