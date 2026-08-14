# Session packages — shipped on Android · hand-off for iOS

Date: 2026-08-12 · athlete half 2026-08-13 · **group packs 2026-08-14** · Author: pairing session with Yuri
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
| Athlete: pack tracking + pack detail | ✅ | ✅ **new** | ⬜ |
| Athlete: catalog strip, buy sheet, success step | ✅ | ✅ **new** | ⬜ |
| Athlete: redeem a credit at booking | ✅ | ✅ **new** | ⬜ |
| **Group packs** — sell, buy, join/accept with credits, reserve, returns | ✅ **new** | ✅ **new** | ⬜ |
| Self-paced packs | ❌ 422 by design | n/a | n/a |

Personal packs are **merged to main** on both sides (android #149 + #151, poly-backend via
the `dev2 → main` round trip). **Group packs are on `feat/group-session-packages`** in both
repos, not yet merged. **iOS has none of it.**

Group packs needed schema: `group_event_participant.payment_type` (what the athlete chose,
so a series knows it renews on credits), `GroupPaymentStatus.pack`, and
`package_redemption.athlete_profile_id` with the unique key moved to (event, athlete). Two
hand-written migrations — `--autogenerate` against a working database picks up drift from
other branches and proposes dropping unrelated tables.

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

## 2a. What iOS needs to build (athlete)

1. **"Your packages"** on the coach relationship detail — the *same* card as the coach's
   client profile, different action: **Book next** while credits exist, **Buy again** when
   depleted. A depleted pack must never route to the grid.
2. **Pack detail** — the same screen as the coach's, read through
   `/athlete/coaches/{id}/packages/{offerId}`, with one bottom CTA: **Book session**, or
   **Purchase pack** at zero credits.
3. **Pack strip** in the session catalog (`shared/profile.html#s-book-sessions`), in **both**
   states — see §6 below, this is where the prototype is wrong.
4. **Buy sheet** (tier ladder · Cash | Card · prepay note) → **success step** (credits made
   countable, then "Book your first session").
5. **Redeem at booking** — struck price + "Included in pack", the redeem block, CTA
   "Book · use 1 session", and the two-way toggle with "Pay per session instead".

## 2b. What iOS needs to build (group packs, 2026-08-14)

Group money is a **per-date weekly reserve**, not an upfront charge, so a credit behaves
differently from the personal case. The five product decisions behind this are in
`memory: project_group_packs_decisions`; the mechanics iOS has to match:

| Moment | What happens |
|---|---|
| Athlete joins or accepts an invitation with `paymentType=package` | that date is reserved now → **one credit burns now**, seat → `pack` |
| Later dates of the same series | seat → `waiting`; the weekly reserve draws one credit each, ~a week ahead |
| Reserve runs with an empty pack | seat stays and becomes `cash_unpaid`; **both sides** are pushed; nobody is dropped |
| Coach cancels the date | credit returned whole |
| Athlete leaves >24 h before | credit returned; inside the window the seat is spent (there is no half a credit) |

**The athlete arms the payment, never the coach.** A coach's invitation is an offer; the
*accept* is what spends a credit. iOS must therefore ask how it will be paid **in the accept
drawer** — Android reuses its join sheet for this and points the inbox card at the session
rather than accepting in place, so there is one drawer where the decision lives.

**Refusals are loud**: `400` with `code: NO_PACKAGE_CREDITS` when the pack is empty, plain
`400` when the coach sells no pack for that template. Do not fall back silently — the old
behaviour let a `both`-payment template accept `package` and create a seat that owed nothing
and burned nothing.

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
- **`coachId` on a group event is the coach *profile* id**, and every athlete→coach endpoint
  — packs included — keys on the **user** id. Use the `coachUserId` field added 2026-08-14.
  Asking with the profile id 404s silently, and the pack simply never appears.
- **A group seat's payment is not the event's payment.** The session is priced once and
  settled per athlete: `paymentType` says how the template can be paid, `myPaymentStatus`
  says how *this* seat was. Showing the first tells a pack holder to bring cash.
- **`package_redemption` is unique per (event, athlete)**, not per event — a group date has
  a seat per athlete and each spends its own credit.
- **Renewal is rate-limited 1 / 7 days per (athlete, pack)**: per-buyer repeat → `429`,
  bulk repeat → `200 {"sent":0,"skippedRateLimited":1}`. Treat both as "already nudged",
  not as an error.

## 4. Open backend gaps (both clients hit these)

| Issue | Effect |
|---|---|
| **poly-backend#897 → PR #900, merged to `dev2`** | Offer renewal now carries `renewalOfferedAt` + `canOfferRenewal` on buyers and held-package payloads, so "Offer sent" survives a reload. Until #900 reaches main, keep the fallback: hold it in memory and map `429` to "Already nudged this week". |
| **poly-backend#898 → PR #899, merged to `dev2`** | Redemption and return rows now carry `sessionName`, `location`, `sessionAt`, so a ledger row reads "Local Strength / GymBeam / Thu, Aug 13 · 07:00" instead of a bare burn timestamp. Cancelled events still resolve (the repo lookup ignores the soft delete). Fall back to the pack's own session name and the label "Credit used" when the fields are absent. |
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

### Athlete-side decisions (2026-08-13)

- **The catalog strip does not disappear once the pack is bought.** The backend sets
  `showUpsell: false` and the prototype hides the row — right about the *pitch*, wrong about
  the *row*. It is the only place an athlete looking at a session can see they already paid
  for it, so it stays and changes register: `Save with a 5-pack · €32/session` becomes
  `Your pack · 9 of 10 left`. Drop the denominator when stacked lots would print "12 of 10".
- **The upsell quotes the entry tier and its own per-session price.** The prototype's
  "Save with a 5-pack · from €40/session" pairs the small pack's name with a price only the
  big pack gets.
- **The booking screen must fetch its own context**, not trust nav arguments. From a pack
  there is no price and no coach name to pass, and the confirm sheet showed "BOOKING WITH ␣"
  over an unnamed session at €0.00. Take the blanks from the coach's catalog, and rebuild
  the day grid if the duration you assumed was wrong.
- **Redemption is the default on any booking of a covered session**, not only when arriving
  from a pack — an athlete who bought five sessions should not have to remember them. Both
  directions are reversible in the sheet.
- **A pack is prepaid straight to the coach**, so the refund note sits *above* the CTA, and a
  pending cash pack gets a warning tone, never a green tick. Cash is still not a gate.
- **The success step hands off to the first booking.** Credits are worth nothing until one is
  spent, and that moment is the only one where the athlete is already thinking about it.
- **One buy surface.** "Purchase pack" on a used-up pack routes to the catalog with the sheet
  already open, rather than growing a second buy screen.

### Group-pack decisions (2026-08-14)

- **A pack wears the colour of the session it is built on** — teal personal, blue group,
  violet self-paced. Every payload now carries `baseKind`; packs shipped personal-only and
  every card was hard-coded teal, which made the first group pack look personal.
- **"Owed" has one definition**, in `services/cash_owed.py`: finished 1-on-1 cash sessions +
  group seats on dates that already happened + packs bought for cash and unsettled. A
  **future** date is an obligation, not a debt. Seven surfaces read it — both dashboards,
  the clients list and profile, the athlete's coach detail, my-coaches, and the "Owes money"
  cohort. iOS should not recompute any half of it locally.
- **The cash-owed *list* and the *total* must agree.** They did not: the list showed packs
  and sessions while the total counted seats too, so "Owed €300" sat above €240 of cards.
- **The coach's headline counts only people they can open.** A debt from somebody with no
  relationship is logged, not shown — a "collect from N clients" row that cannot be tapped
  through is a dead end.

## 7. Also shipped in the same branch (client profile parity)

The coach's client profile now mirrors the athlete's view of a coach: **chat moved from the
header into the footer**, beside **Schedule training**, and the "No upcoming sessions yet."
card keeps its look but loses the button inside and centres its copy. iOS should mirror this
too — the athlete-side coach detail already has the footer shape.

## 8. Verified with real writes

Real writes end to end: create → tiers → delete · sell cash pack → Unpaid → **Mark
received** → ledger flips to Paid · 5 credits burned by genuine athlete bookings with
`paymentType: "package"` → depleted · one cancelled → **credit returned** → low → amber row,
bar, renewal pill, bulk button · renewal sent.

Athlete half, on a local stand (2026-08-13): bought a 10-session cash pack from the catalog
strip → success step → first booking; booked again from the pack detail and from another
covered session's card. All three opened with coach, session, place and price filled in and
redemption pre-selected; the ledger came back naming the session, the place and its date;
the strip flipped from the pitch to "Your pack · 9 of 10 left".

Group packs, on the local stand (2026-08-14): coach creates an offer on a group template →
athlete buys 10 credits for cash → joins one date with `paymentType=package` (seat `pack`,
1 credit) → joins another with `allFuture` (2 seats `pack`, 13 `waiting`, still 2 credits
spent) → reserve sweep over 120 days: `charged=8 unfunded=5`, the five seats past the empty
pack became `cash_unpaid` with a push to both sides. Athlete leaves a date >24 h out →
credit back (10→9); coach cancels another → `refundedParticipants: 1` (9→8). Invitation
accepted from the inbox with a credit → seat `accepted / pack / package`.

Two backend quirks found on the way, neither blocking, both worth knowing on iOS:
`POST /athlete/training-events` rejects a naive `datetimeStart` with a detail-free 400 (send
the `Z` suffix), and a second booking with the same coach on the same day is refused.
