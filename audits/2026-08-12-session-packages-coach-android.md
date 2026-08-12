# Session packages, coach side — shipped on Android · hand-off for iOS

Date: 2026-08-12 · Author: pairing session with Yuri
Spec: [`specs/session-packages.md`](../specs/session-packages.md) ·
API: [`poly-backend/docs/session-packages-api.md`](https://github.com/321-fit/poly-backend/blob/main/docs/session-packages-api.md) ·
Android impl-doc: [`321fit_android_new/docs/session-packages-android.md`](https://github.com/321-fit/321fit_android_new/blob/main/docs/session-packages-android.md)

Same shape as [the group-training hand-off](./2026-08-06-group-training-shipped-android-backend.md):
what is now real, what iOS has to build to match, and the traps that cost time on Android.

---

## 1. Status by platform

| | Backend | Android | iOS |
|---|---|---|---|
| Coach: packages tab, create, tiers, delete | ✅ shipped | ✅ **new** | ⬜ |
| Coach: Buyers + renewal (single + bulk) | ✅ | ✅ **new** | ⬜ |
| Coach: client's packs, pack detail, history | ✅ | ✅ **new** | ⬜ |
| Coach: sell a pack, mark cash received | ✅ | ✅ **new** | ⬜ |
| Athlete: buy, first-book, redeem, tracking | ✅ | ⬜ android#119–120 | ⬜ |
| Group / self-paced packs | ❌ 422 by design | n/a | n/a |

The backend has been complete since late July; nothing was added for this work. Android is
issues #114–#118. **iOS has none of it**, and the athlete half is unbuilt everywhere.

## 2. What iOS needs to build (coach)

Screens, in the order they depend on each other:

1. **`[ Sessions | Packages ]`** on My training sessions. Card per pack: gradient header
   (name · single price · N packs) + a tier row each + a footer that **deep-links into
   Buyers** ("18 sold · 6 active", or amber "N running low").
2. **Pick a base session** → **Package detail** (`Overview | Buyers`) → **Tier edit**
   (its own pushed screen).
3. **Packages section on the client profile** + **Sell a package** sheet.
4. **One client's pack**: summary → Activity (3 rows) → **See all** → history with the
   canonical chips `All · Sessions · Purchases · Returned`.

## 3. Contract notes that are easy to get wrong

- **Every tier write returns the whole offer** (`POST`/`PATCH`/`DELETE …/tiers`), because
  per-session price and the "Best seller" tag are derived across the ladder. Replace the
  offer you hold; do not patch one tier locally.
- **One active offer per template.** Filter the base-session picker by what already has a
  pack, or the coach walks the whole create flow into a 409 at the end.
- **`sessionsCount ≥ 2`, max 3 tiers**, duplicate size → 409, fourth tier → 422, last tier
  and any sold tier cannot be removed.
- **Money is minor units** `{amount, currency, currencySymbol}` everywhere.
- **Holder status is derived, never stored**: `pending → depleted → low → active`. Running
  low is `max(1, ceil(activePackSize × 0.2))`, and **the UI threshold must equal the
  notification threshold** or the coach gets "Anna is running low" and opens a green card.
- **The bar is scoped to the current FIFO lot** (`currentPackSize/Used/Left`), while
  `sessionsLeft` sums every lot. A lifetime denominator drifts to "900 of 920".
- **Cash is not a gate.** A cash pack is bookable from purchase; `mark-cash-received` only
  updates visibility. Do not block redemption.
- **Renewal is rate-limited 1 / 7 days per (athlete, pack)**: per-buyer repeat → `429`,
  bulk repeat → `200 {"sent":0,"skippedRateLimited":1}`. Treat both as "already nudged",
  not as an error.

## 4. Open backend gaps (both clients hit these)

| Issue | Effect |
|---|---|
| **poly-backend#897** | Offer renewal has **no read-side state**. The send is recorded and rate-limited, but no payload exposes it, so "Offer sent" cannot survive a reload. Android holds it in memory and maps 429 to "Already nudged this week" — **iOS should do the same, not invent a third behaviour.** Asked for: `renewalOfferedAt` + `canOfferRenewal` on buyers and held-package payloads. |
| `fix/held-package-cash-owed-amount` | Unmerged branch adding `cashOwed` and `packageInfo`. Until it lands, the pending-cash card has nowhere to show "Pay €200 in person" and the booking request cannot carry its pack note (spec §6.2). |

## 5. Design-system additions to consume

Both live in `design-tokens` and are already mirrored in SwiftUI:

- **`FitProgressBar`** — bare determinate bar. `tone: brand | warning | neutral`,
  `track: surface | divider`. Use **`.divider`** inside a plain list row: `surfaceHigh` is
  so close to the background there that an empty bar disappears and "0 of 5 used" loses its
  picture. `FitSpotCounter` now draws through it, so do not add a third bar.
- `MoneyDto` carries an optional `currencySymbol` (additive).

## 6. UX decisions taken during the build

Recorded here because they are not in the prototype and iOS should match rather than re-decide:

- **Create holds a draft** — nothing is written until "Create package", which POSTs the
  offer then its tiers; a failed tier archives the offer again instead of leaving a sizeless
  pack on the tab.
- **Tier edit is a pushed screen** (typed € total; a sheet keyboard buries the live maths,
  Save and Remove). Back cancels.
- **Overview is outlined, not filled** — tier cards, base row and add row use a 1px divider
  border; a stack of filled surfaces reads as three separate things to act on.
- **Mark received lives on the pack detail**, not the card — it needs a lot id, and FIFO
  means exactly one unpaid lot is worth chasing.
- **Credit ledger = the money ledger's vocabulary**: buy `in` teal, redeem `out` **gray**
  (spend is not a problem), returned `info` blue with a teal `+`.

## 7. Also shipped in the same branch (client profile parity)

The coach's client profile now mirrors the athlete's view of a coach: **chat moved from the
header into the footer**, beside **Schedule training**, and the "No upcoming sessions yet."
card keeps its look but loses the button inside and centres its copy. iOS should mirror this
too — the athlete-side coach detail already has the footer shape.

## 8. Verified on dev2

Real writes end to end: create → tiers → delete · sell cash pack → Unpaid → **Mark
received** → ledger flips to Paid · 5 credits burned by genuine athlete bookings with
`paymentType: "package"` → depleted · one cancelled → **credit returned** → low → amber row,
bar, renewal pill, bulk button · renewal sent.

Two backend quirks found on the way, neither blocking, both worth knowing on iOS:
`POST /athlete/training-events` rejects a naive `datetimeStart` with a detail-free 400 (send
the `Z` suffix), and a second booking with the same coach on the same day is refused.
