# Event Status System & Push Notifications

> Status: Approved (contract) / In Progress — shipped as a **dual-field** model (`ApprovalStatus` + `PaymentStatus`), not the unified single enum. See § 5a.
> Prototype: [flows/coach/calendar.html](https://321-fit.github.io/project-spec/prototypes/flows/coach/calendar.html) — all 6 states demo · [flows/athlete/calendar.html](https://321-fit.github.io/project-spec/prototypes/flows/athlete/calendar.html) — cross-role mirror · [flows/shared/calendar-legend.html](https://321-fit.github.io/project-spec/prototypes/flows/shared/calendar-legend.html) — **visual legend** (all tiles + zones, both themes)
> Component library: [design-tokens/docs/components.md](../../design-tokens/docs/components.md) — FitCalEvent, FitCalEventPill, FitRoleTag
> Last updated: 2026-07-24
> Implementation:
> - iOS:     [321fit_ios/docs/event-statuses-ios.md] (to be created)
> - Backend: [poly-backend/docs/event-statuses-backend.md] (to be created — includes migration)
> - Voice:   [voice_control/docs/event-statuses-voice.md] (to be created)

---

## 1. Overview

Canonical lifecycle states of a **training event** — the base entity for every session between coach and athlete. Replaces the ad-hoc legacy status list (`pending / request / approved / declined / cancelled / auto-declined / rescheduled / paid / cash / invitation / successful`) with a **unified 6-state system for personal events** and a **4-state subset for group events**.

Every client render (calendar card, event sheet, dashboard card) + every backend transition + every push notification references these canonical states. Old legacy names are migrated.

---

## 2. User Stories

### Coach

- As a coach looking at the calendar, I want each event's status to be visually distinct so that I can parse the day at a glance.
- As a coach, I want state transitions to be unambiguous so that I always know whether a session is confirmed, pending, or past.
- As a user with BOTH roles active, I want events from my OTHER role to be visually muted (cross-role) but still clickable, so I can avoid double-booking without losing the ability to switch roles and act on them.

### Athlete

- As an athlete, I want the same visual language across my schedule so that the system behaves consistently for me too.
- As an athlete, when I send a request, I want to see it's **Awaiting** coach's response so that I know what's happening without confusion.

### Voice

- As the voice assistant, when I fetch events, I want a single canonical status enum so that my answers are consistent.

---

## 3. System Stories

- As the backend, every `TrainingEvent` has exactly one current status from the canonical enum. Intermediate legacy statuses are migrated.
- As the backend, allowed transitions are explicit and enforced. Illegal transitions return 409 Conflict.
- As the backend, automatic transitions (e.g., `Planned → Review` after end time) are idempotent scheduled tasks.
- As the client, pill colors and descriptor text map 1:1 from the enum. Clients must not invent state names.
- As any service, `cancelled` is a terminal state but is **NOT displayed** on calendar — events transition to cancelled and are filtered from the normal calendar view. Retained in DB for 2 months for audit, then hard-deleted.
- As the client, **cross-role presentation** (see § 3a) is a separate render mode orthogonal to the 6 statuses. The same event keeps a single canonical status server-side; only the client picks which presentation to use depending on which role is currently active.
- As any service, **custom events** (`type: "custom"` — coach's own calendar blocks per [coach-calendar.md § Flow 5](./coach-calendar.md)) are **stateless** — they do NOT participate in the 6-state lifecycle. They have no Request/Awaiting/Review/Missed/Finished transitions; they exist (visible) or are deleted (gone). Rendering on the timeline uses `FitCalEvent` with `type: .custom` variant — no status pill, no perimeter border, no opacity dimming.
- As the client, **event overlap** is also orthogonal to the 6 statuses — it's a client-side flag (interval intersection on the same day, matches iOS `ScheduleManager.overlapped`). Any status can be overlapped. Visual: `.overlapped` modifier on the tile (or `overlapped: Bool` prop on `FitCalEvent`) adds a red-tinted gradient overlay + corner dot — additive, doesn't replace underlying type/status. Drawer pattern: `cal-overlap-sheet` lists both conflicting events with Reschedule + Open-external actions. See [coach-calendar.md § 4c](./coach-calendar.md).

---

## 3a. Cross-role presentation mode (new 2026-05-20)

When the active user has BOTH roles (coach + athlete), every event from the OTHER role profile shows up on the current role's calendar in a muted **cross-role** presentation. This is **orthogonal** to the 6-state status system — a cross-role tile renders the same regardless of underlying status (Planned / Request / Review / etc.), because the current role can't act on it from here anyway.

### Visual

- Container: muted (opacity 0.75), dashed left stripe (3pt text-tertiary), no perimeter border
- Title row: only the title — no status pill (it would be ambiguous which role's pill it represents)
- Meta row: `{counterparty} · {time}` (e.g. "with Coach Mark · 11:00 – 12:00")
- Location row (Standard tier): `📍 {location}`
- Bottom-right corner: `FitRoleTag` badge — icon + "Athlete" or "Coach" indicating which role profile owns this event

### Behavior

- Not draggable in the current role.
- Counts as a conflict for current-role drag-drop (you can't overlap another session on top of it).
- Does NOT count toward current role's badges / stats / earnings (those belong to the other role).
- Tap → role-switch drawer (see [coach-calendar.md § Flow 9](./coach-calendar.md) / [athlete-schedule.md § Cross-role presentation](./athlete-schedule.md)).

### Why a presentation mode, not a 7th status

The underlying event still has its own real status (Planned, Request, etc.) on the role profile that owns it. Cross-role doesn't replace that — it's just *how the OTHER role sees the event*. Adding it as a 7th status would (a) double the state matrix, (b) make a single event need two statuses simultaneously, (c) confuse backend transitions. As a separate render mode, the backend stays single-status, the client just picks the muted-vs-full presentation based on `role_context` (`own_role` / `other_role`) returned by `GET /{role}/training-events/`.

### API hook

`GET /coach/training-events/?date=...` and `GET /athlete/training-events/?date=...` must include events from the user's OTHER role (when present) with `role_context: "other_role"`. The client uses this flag to switch between full FitCalEvent rendering and the muted `FitCalEventType.crossRole(role)` variant. Server-side filtering should NOT strip these events (they're needed for conflict detection on the active role's calendar).

---

## 4. Flows

### Flow 1: Athlete-initiated booking (personal)

1. Athlete taps "Book" on coach profile → event created in `request` state (coach's perspective) / `awaiting` (athlete's perspective — their outgoing request).
2. Coach opens their Calendar → sees event with yellow `Request` pill. Opens event sheet → Accept or Decline.
3. **Accept:** status → `planned` (both sides). Push to athlete: "Your training session request has been approved." Event appears normally on both calendars.
4. **Decline:** status → `cancelled`. Event removed from calendars. Push to athlete: "Your training session request with {name} has been declined."
5. **No response for 48 h:** auto-transition `request → cancelled` via scheduler. Pushes on both sides: "Request was not answered in time and was automatically cancelled."

### Flow 2: Coach-initiated booking (Schedule training)

1. Coach uses Schedule flow (see [clients-coaches.md](./clients-coaches.md)) → event created in `awaiting` (coach's perspective — waiting for athlete) / `request` (athlete's perspective).
2. Athlete opens notification → event sheet in `request` state → Accept or Decline.
3. Same transitions as Flow 1 but mirror directions.

### Flow 3: Planned event → end time → review → finished/missed

1. Event is `planned`, scheduled date reached, session happens.
2. After session's `endAt`:
   - **Athlete view (optimistic):** event renders as `finished` immediately at `endAt`. View-level mapping at API: when an event in server-state `review` is fetched by athlete, it is returned with `status: finished` (athlete-facing). This avoids the "wasn't my session 3 days ago?" confusion.
   - **Coach view + server state:** event transitions to `review` after a payment-type-aware delay (cash: 10 min after `endAt`; card: end of coach's local day or +4h, whichever first). Handled by scheduled task.
3. Coach opens Dashboard or Review Queue → sees card in Review state → taps **Mark complete** or **Missed**.
4. **Mark complete:** server state `review → finished`. Payment released per [payments.md](./payments.md). Athlete view already shows finished — push is informational ("Session with {coach_name} confirmed").
5. **Missed:** server state `review → missed`. Athlete view updates from optimistic `finished` to `missed` (refresh + push: "Session with {coach_name} was marked missed"). Payment policy per [payments.md](./payments.md).
6. See [review-queue.md](./review-queue.md) for full review screen flow.

**Why optimistic mapping (vs showing athletes the `review` state):** athletes have no action to take during review — exposing the in-progress confirmation creates UX noise. The rare correction (coach marks missed) is acceptable cost for the common case (clean "session done" UX for athlete).

### Flow 4: Reschedule (from any state)

1. Either party taps reschedule on event sheet → opens date/time picker.
2. Confirm → new event created in `request`/`awaiting` state (same Flow 1 lifecycle). Old event transitions to `cancelled`.
3. Push: "The {coach_name/athlete_name} has requested to reschedule the training session."

### Flow 5: Cancellation of planned event

1. Either party taps Cancel on a `planned` event.
2. Confirmation required (destructive — tinted red).
3. Status → `cancelled`. Event disappears from calendars (UI filter). Push to the other party: "Your session on {date} at {time} has been cancelled."

### Flow 6: Group event join (subset)

1. Athlete joins a group session → event gets athlete-as-participant, status stays `planned` (no 1-on-1 request cycle; group slots are auto-confirmed if available).
2. End-of-session flow (review/missed/finished) same as personal — coach marks the whole group.
3. `Request` and `Awaiting` states don't apply to group (no 1-on-1 approval dance).

---

## 5. States

### Personal event — 6 states

| State | Who sees it | Color | Pill | Descriptor (event sheet) | Transitions from | Transitions to |
|---|---|---|---|---|---|---|
| `planned` | Both | teal-500 (left stripe) | none (default) | "Confirmed session" | `request` (accept), `awaiting` (accept by other party), reschedule new | `cancelled`, `review` |
| `request` | Receiver only | yellow-600 | "Request" | "Athlete requested this session" (coach-side) | new creation | `planned` (accept), `cancelled` (decline / 48h auto) |
| `awaiting` | Creator only | yellow-600 **dashed, no fill** (see § 5b) | "Awaiting" (outlined) | "Waiting for athlete's response" | new creation (outgoing) | `planned` (other accepts), `cancelled` (other declines / 48h auto / creator cancels) |
| `review` | Coach only (server state); athletes see this server state mapped to `finished` at the API layer | yellow-600 | "Review" | "Session ended — complete it" | `planned` (past endAt + payment-type delay) | `finished` (mark complete), `missed` (mark missed) |
| `missed` | Both | red-400 | "Missed" | "Marked as missed" | `review` | (terminal, retained 2 months) |
| `finished` | Both | teal-500 (0.5 opacity) | none | "Completed on {date}" | `review` | (terminal, retained indefinitely for history) |

### Group event — 4 states (subset)

| State | Trigger | Notes |
|---|---|---|
| `planned` | Default when session is scheduled | Participants can join/leave; booking window open until start |
| `review` | Past endAt + 30 min | Coach-only view; mark whole group complete/missed |
| `missed` | Coach marks entire session missed | e.g., coach no-show. Terminal. |
| `finished` | Coach marks complete | Terminal. |

Group events skip `request` / `awaiting` because joining is immediate — no 1-on-1 handshake.

### Hidden state: `cancelled`

- Terminal but NOT displayed on calendar.
- Accessible via direct URL / admin tool / audit log only.
- Auto-deleted after 2 months retention.

### Legacy → canonical migration

Old statuses map to canonical:

| Legacy | Canonical | Notes |
|---|---|---|
| `pending` (initiator side) | `awaiting` | |
| `pending` (receiver side, legacy naming overload) | `request` | The same underlying record; view depends on who's asking |
| `approved` | `planned` | |
| `declined`, `cancelled`, `auto_declined` | `cancelled` | All terminal non-completion states collapse |
| `rescheduled` | `cancelled` (original) + `request`/`awaiting` (new event) | Reschedule always creates a new event, cancels old |
| `successful` / `completed` | `finished` | |
| `paid`, `cash` | NOT a status — payment is a separate field on the event (see [payments.md](./payments.md)) |
| `invitation` | NOT a status — invite link is a separate entity in deep-linking-referrals spec |

Backend migration runs once: maps all legacy values to canonical enum + updates dependent tables.

---

## 5a. Shipped reality (2026-07-17) — dual-field, not one enum

The unified single 6-state enum described above (§ 5 / § 6) is the **product contract**, but it was **not shipped as one persisted enum**. What actually ships on `poly-backend` `main`:

- **Persisted status = `ApprovalStatus`** on the `event_approval` table (one row per `training_event`), values: `pending / approved / declined / cancelled / auto_declined / invitation / rescheduled`.
- **A separate persisted `PaymentStatus`** on the same row: `waiting_for_payment / money_on_hold / transfered_to_coach`. Payment is a **field**, not a status — exactly as the legacy-migration table above intends (`paid`/`cash` are NOT statuses).
- **The 6-state names (`planned / request / awaiting / review / missed / finished`) are DERIVED, not stored.** The client/DTO layer computes the canonical presentation state on the fly from `ApprovalStatus` + the event's `datetime_end` + the `event_post_confirmation` record (coach review). Reference impl: `_canonical_event_status()` in the coach dashboard handler. So `review`/`finished`/`missed` are not columns — they are `approved` + past-end + (un)confirmed.

**Mapping (shipped derivation):**

| Derived canonical | Comes from |
|---|---|
| `request` | `ApprovalStatus.pending` (receiver view) |
| `awaiting` | `ApprovalStatus.pending` / `invitation` / `rescheduled` (initiator view) |
| `planned` | `ApprovalStatus.approved`, end time in the future |
| `review` | `ApprovalStatus.approved`, past `datetime_end`, coach not yet confirmed |
| `finished` | `ApprovalStatus.approved`, past `datetime_end`, coach confirmed |
| `missed` / `cancelled` (hidden) | `ApprovalStatus.declined / cancelled / auto_declined` |

**Reconciliation stance:** treat § 5 / § 6's single-enum wording as the *client-facing derived contract*; the *source of truth on the wire* is the `ApprovalStatus` + `PaymentStatus` dual field plus the derivation above. A future migration to one persisted `event_status` column remains optional backend work, not a shipped fact — do not spec it as done.

---

## 5b. Calendar visual language (updated 2026-07-24)

Visual reference screen: **[flows/shared/calendar-legend.html](https://321-fit.github.io/project-spec/prototypes/flows/shared/calendar-legend.html)** — every tile, block and zone in both themes, rendered from the canonical CSS classes (it cannot drift from the product). In-app the same screen is the opt-in `?` sheet in the calendar header (disclosure Layer 2).

### The two axes

The calendar encodes exactly two things, and they never share a channel:

| Channel | Answers | Values |
|---|---|---|
| **Fill / tint** | *What kind of thing is this?* | teal = personal training · blue = group training · neutral surface = not a training (busy time, external, other role) |
| **Border** | *Does it need me?* | solid perimeter + 10% fill = act on it · dashed, no fill = pending on someone else · no perimeter = nothing outstanding |

Consequences of keeping those separate:

- **Awaiting is yellow, not gray.** It sits in the same "not confirmed yet" hue as Request, but outlined instead of filled — filled yellow means *you* act, dashed yellow means *you wait*. It used to be a gray perimeter over the normal surface, which read as an ordinary Planned tile.
- **Yellow stays one lane.** Request (pre-event) and Review (post-event) share it; pill text and position relative to the now-line disambiguate. Splitting yellow into two shades would dilute the "act on this" signal.
- **Personal events carry a teal tint in both themes.** Dark theme previously gave group a blue tint but left personal on a neutral surface, so two training types followed different rules inside one theme and the type lived only in a 3px stripe.
- Because tint now means *type*, the neutral surface is free to mean *not a training* — busy time, external events and cross-role tiles are all readable at a glance without their labels.

### Light-theme tints (2026-07-24)

A tinted surface has to move **away from its canvas** in luminance. On the dark canvas a bright accent at 10–12% lightens the surface and reads; on `#F2F2F7` the same accent at 8% moves only 1.8 ΔL* (its dark counterpart moves 7.1) — the tile looks white. Raising the alpha of the *same bright* accent buys saturation, not separation.

Rule: **light tints derive from the darker accent step at a higher alpha.**

| | dark | light |
|---|---|---|
| Personal | teal-500 @10% | teal-600 @18% |
| Group | blue-500 @12% | blue-600 @16% |
| Request / Review | yellow-600 @10% | yellow-600 @20% |
| Missed | red-400 @10% | red-400 @16% |
| Off-hours wash | black @35% | `#3C3C43` @10% |

Both columns land ~6–7 ΔL* off their own canvas. Landed in the token source 2026-07-24 (design-tokens `dfa9494`): `color.bg.*-{subtle,tinted}.light` in `tokens/color-semantic.json`, plus `color.text.secondary.light` → gray-600, `color.divider.light` → gray-200 and a two-layer `elevation.2.light`. Clients read it from the tokens; the prototype consumes the same vars rather than keeping its own copy.

### Day zones

| Zone | Means | Visual | Class |
|---|---|---|---|
| **Off-hours** | Outside the coach's availability | Flat tonal wash, **full-bleed to the screen edge**, no radius, dimmed hour labels, one centered label per contiguous band | `.fit-cal-offhours` (+ `.fit-hour.offhours`) |
| **Blocked** | Inside working hours but taken (external event, time off) | Diagonal hatch, inset and rounded like a card | `.fit-cal-blocked` |

- **Hatching means "busy" and nothing else.** Using it for both "I don't work then" and "that slot is taken" made the two indistinguishable; a calm wash covers the 8+ off-hours of a 24h day without moire, and the hatch keeps a single meaning.
- **Shape carries the difference too:** a full-bleed, radius-free band reads as a *state of the day*; an inset, rounded block reads as an *object occupying a slot*.
- Every contiguous band repeats the short label ("Outside your hours", no time range — the ruler already shows it) so a fragmented availability day explains itself wherever the user lands. Bands under 32px drop the label and keep the wash.

### Drag targeting

While an event is dragged, the calendar has to answer "can I drop here?". The verdict rides on the **dragged tile**, not on the day:

- The dragged tile gets `.invalid` — red tint + red perimeter + red label — over any target that refuses it: outside available hours, blocked, or already occupied. Same grammar as `.fit-bk-sel.invalid` in the booking time-grid, so "red block = it can't go there" is learned once.
- Off-hours bands deepen (`.fit-timeline.dragging .fit-cal-offhours`) so the boundary is unmistakable mid-drag, and their labels hide so a parked tile doesn't have the caption reading through it. The band does **not** turn red — flooding half the day with an error colour is alarm without information and competes with the tile the user is looking at.
- The snackbar names the reason ("Outside your available hours" / "slot occupied"), which is what distinguishes the refusal types.

Open: whether an off-hours drop should be *refused* at all, or allowed behind a confirm ("This is outside your available hours. Schedule anyway?"). Coaches do take the occasional early client; today the drop is blocked outright.

### Grid

- The day grid is **always 00:00–24:00**. Day height must never depend on availability — a grid that starts at the first available hour changes shape per coach and per day.
- On open, the view **auto-scrolls** to the now-line when it falls inside the working band, otherwise to the first available hour. That is what makes a full 24h grid free of cost.
- Hour rules run to the true right edge; the left is offset by the time gutter (Apple Calendar convention). Content (tiles) keeps its gutter — background and rules bleed, content does not.
- **Known divergence:** the booking/invite time-grid still paints outside-working-hours as a hatched `.fit-bk-off` zone (see [booking-flow.md](./booking-flow.md)). That grid is a *picker*, not the day surface, and was left as-is; if the hatch=busy rule is to hold app-wide, it should switch to the wash. Open.
- **Athlete calendars have no off-hours shading**: an athlete has no availability, so there is nothing to grey out. Zones belong to the coach calendar and to booking grids, where the counterparty's hours constrain the choice.

---

## 6. API

> **Shipped note (2026-07-17):** the enum below is the **client-facing derived** contract. On the wire it is not a single stored field — see § 5a. Endpoints are **role-scoped** (`/{coach|athlete}/training-events/...`), and the write verb is `PATCH .../change-status` carrying an `ApprovalStatus` value, **not** the flat `POST /events/{id}/accept|decline|cancel` originally drafted below. The accept/decline/cancel/review endpoints in this section are retained as the *intent*; the shipped equivalents are listed inline.

### Enum definition

```typescript
type EventStatus =
  | "planned"   // confirmed session, on calendar
  | "request"   // incoming — awaiting current user's response
  | "awaiting"  // outgoing — waiting for other party
  | "review"    // past endAt, coach hasn't resolved yet
  | "missed"    // coach marked missed
  | "finished"  // coach marked complete
  | "cancelled" // terminal, hidden from calendar views
```

Fields on `TrainingEvent` (client-facing view; see § 5a for the shipped storage):
- `status`: `EventStatus` — **derived** at the DTO layer from `ApprovalStatus` + `endAt` + post-confirmation, not a stored column
- `type`: `"personal" | "group" | "custom" | "external"`
- `endAt`: ISO8601 (backend `datetimeEnd`)
- `cancelledAt`: ISO8601 | null (set when transitioning to cancelled)
- `completedAt`: ISO8601 | null (set when transitioning to finished)

### Endpoints (status-related subset)

> **Shipped (2026-07-17).** All status writes go through **role-scoped** routes; the body carries an `ApprovalStatus` value (`approved` / `declined` / `cancelled`) plus an optional `paymentType`. The `accept`/`decline`/`cancel`/`review` verbs below are the *intent* — the shipped equivalent is noted under each.

#### `PATCH /{coach|athlete}/training-events/{id}/change-status`  *(shipped — replaces accept / decline / cancel)*

Body: `{ status, paymentType? }`, where `status ∈ approved | declined | cancelled` (coach is restricted to those three; invalid values → 400/422). Updates the `event_approval` row's `ApprovalStatus`.
- `approved` = the drafted **accept** (`request → planned`). On card events this also schedules the money transfer at `datetimeEnd`.
- `declined` = the drafted **decline** (`request → cancelled`, derived `missed`/hidden).
- `cancelled` = the drafted **cancel** of a planned event (either party).
Returns the updated `TrainingEventDetailResponse`.

#### `POST /{coach|athlete}/training-events/{id}/post-confirm`  *(shipped — replaces the review resolution)*

Body: `{ confirm: bool, feedback?: string }`. Resolves a past-end (`review`) event: `confirm: true` → derived `finished`; `confirm: false` → derived `missed`. Writes the `event_post_confirmation` record that the § 5a derivation reads. See [review-queue.md](./review-queue.md).

#### `PATCH /athlete/training-events/{id}/reschedule`  *(shipped)*

Body: `{ datetimeStart, datetimeEnd, paymentType? }`. Reschedules the event (approval returns to the request/awaiting cycle). (Coach-side reschedule goes through `PATCH /coach/training-events/{id}`.)

#### `DELETE /{coach|athlete}/training-events/{id}`  *(shipped)*

Removes the event. **Athlete returns 200; coach returns 204.**

#### Scheduled tasks (server-side)

- **Auto-cancel on no-response:** every `request` older than 48h → `cancelled`. Run every 15 min.
- **Auto-transition to review (payment-type-aware):** every `planned` event past `endAt` → `review` after delay:
  - **Cash event** (1-on-1 or any group with at least one cash participant): `endAt + 10 min`. Triggers push: "Mark who paid · {N} sessions" → deep-links to review queue (1-on-1) or `s-cash` per-participant screen (group, see [review-queue.md](./review-queue.md)).
  - **Card-only event**: `endAt + 4h` OR end of coach's local day (00:00 of next day in coach's TZ), whichever comes first. Triggers batched morning push: "Yesterday's sessions ready to confirm".
  - Scheduler runs every 5 min for cash precision; card transitions can use coarser cadence (every 30 min).
- **Athlete view mapping:** API serializers for athlete-facing endpoints map server state `review → finished` (optimistic), `missed → missed`, all else 1:1. Coach-facing endpoints return raw state.

---

## 7. Business rules

- **`cancelled` is terminal** — no coming back. Reschedule creates new event.
- **Pack-funded events return the credit** *(new 2026-07-15, see [session-packages.md](./session-packages.md))*. An event booked with a **pack credit** carries no money reservation — the pack was paid upfront. Wherever this spec's transitions would **refund money to the athlete's balance**, they instead **return 1 credit** to the lot that supplied it: `declined`, `cancelled` (either side, per the normal policy), and the **48h auto-decline**. The event lifecycle itself is unchanged — a pack changes *what pays*, not *how the event behaves*.
  - A **late-cancel / no-show** burn that the coach chooses to **forgive** is the *same operation* — a credit return. There is no separate "forgive" mechanism.
- **Server state `review` is coach-only. Athlete view maps it to `finished` optimistically.** API serializer for athlete responses translates `review → finished`. If coach later marks `missed`, athlete view updates (push + next fetch). Decided in Tier 1 Q1 — see Flow 3 rationale.
- **External events** (Google/Apple Calendar sync): separate status-less path. Rendered on calendar as read-only blocks; don't participate in booking lifecycle.
- **Custom events** (coach-created time blocks, see [coach-calendar.md](./coach-calendar.md) Custom Event section): also status-less. Always displayed; can be deleted.
- **Cancellation retention:** 2 months in DB, then hard-delete. Cron task nightly.
- **State transitions are atomic** — server must not allow a partial transition (e.g., status updated but push not sent). Use database transactions + idempotent outgoing events.
- **Every visible transition fires a push** unless recipient disabled notifications. See Push table below.
- **Pill colors map to state, not to role or context.** A yellow pill always means "needs attention" (request or review); gray always means "waiting on other party" (awaiting).
- **Session count rule (unified across all surfaces):** every "N sessions" counter in the product counts only **`finished`** events. All other statuses are excluded:
  - ❌ `cancelled` — did not happen (includes declined, auto-declined, user-cancelled)
  - ❌ `missed` — coach marked the session as missed (not a completed training)
  - ❌ `planned` — future/upcoming, hasn't happened yet
  - ❌ `request` / `awaiting` — not yet confirmed
  - ❌ `review` — waiting for coach confirmation, not yet resolved

  This rule applies uniformly to:
  - **Coach Profile** stat strip → `sessions_count` (lifetime, all athletes)
  - **Athlete Profile** stat strip → `Sessions` / `Hours` / `This month` (lifetime + monthly, all coaches)
  - **Per-relationship counts** → My Coaches list ("12 sessions · last Apr 2"), Coach Detail training history tile ("12 sessions"), Client Detail training history
  - **Coach Maturity** graduation threshold (`sessions_count >= 3` — see [coach-maturity-model.md](./coach-maturity-model.md))
  - **Deleted account badge** → "Account deleted · {date} · N sessions" (Archived & Blocked → Blocked tab)
  - **Dashboard** `todaySummary` → "3 sessions · €180 today" (counts `planned` + `finished` for today — **exception**: dashboard shows scheduled sessions for the day, not historical completions; the counter here is "sessions on the agenda", not lifetime stat)

  **Rationale:** `finished` is the only state that unambiguously means "training actually took place and was confirmed by the coach". Counting `missed` would inflate the number with sessions that didn't happen. Counting `cancelled` would include declined requests and no-shows. One rule, one query filter, consistent across all surfaces.

  **Hours derivation:** `total_hours = SUM(endAt - startAt)` for all `finished` events. Same filter, same consistency.

  **Backend implementation:** a single reusable query filter / scope (e.g., `EventStatus.finished` predicate) should be used across all endpoints that return session counts, to prevent drift between surfaces.

---

## 8. Push Notifications

Map of state transition → push notification, following push-notifications.md convention.

| Trigger | Recipient | Push text | Deeplink |
|---|---|---|---|
| New `request` (athlete created) | Coach | "{athlete_name} requested a training session." | Requests inbox |
| New `request` (coach created — Schedule) | Athlete | "{coach_name} proposed a training session." | Requests inbox |
| `request → planned` (accept) | Creator | "Your training session request has been approved." | Calendar, event day |
| `request → cancelled` (decline) | Creator | "Your training session request with {name} has been declined." | None |
| `request → cancelled` (48h auto) | Both | "Request was not answered in time and has been automatically cancelled." | None |
| `planned → cancelled` | Other party | "Your session on {date} at {time} has been cancelled." | None |
| `planned → review` (cash event, +10min) | Coach | "Mark who paid · {N} sessions" (batched if multiple) | Review queue or s-cash screen |
| `planned → review` (card event, EOD/+4h) | Coach | Morning batch: "Yesterday's sessions ready to confirm" | Review queue |
| `review → finished` (mark complete) | Athlete | Confirmational only — athlete already saw event as finished optimistically; push is informational: "Session with {coach_name} confirmed" + payment info if card. Many push providers will dedupe; OK to send silent if no payment receipt. | Balance |
| `review → missed` | Athlete | "Session with {coach_name} was marked missed" — required because athlete optimistic view is corrected | Event detail |
| Reschedule (new event) | Other party | "The {role_name} has requested to reschedule the session." | Calendar |
| Invite-based signup (deep link) | Inviter coach | "{athlete_name} joined 321.fit — ready to train?" | Client detail |

---

## 9. Platform notes

**Native UI conventions:** see [architecture/design-system.md § Native theming contract](../architecture/design-system.md#native-theming-contract). Don't duplicate cross-platform UI rules here — only platform-specific deviations below.

- **iOS:** `EventStatus` Swift enum matches server enum one-to-one. Calendar rendering uses `FitCalEvent` component with status prop. Deprecation notice on old enum members during migration window.
- **Android:** Kotlin sealed class `EventStatus` with same cases.
- **Backend:** PostgreSQL enum type `event_status_enum` — migration adds new values, updates existing rows, drops legacy. Celery beat schedules auto-transitions.
- **Voice:** `get_my_training_events()` tool returns events with canonical status. Voice-readable descriptor uses state descriptor text (e.g., "You have 3 planned sessions and 1 awaiting confirmation").

---

## 10. Open questions

- [x] ~~**Athlete sees `review` or stays `planned`?**~~ — RESOLVED in Tier 1 Q1: athlete view maps `review → finished` optimistically at the API layer. Correction push fires only on `missed`.
- [x] ~~**Auto-transition delay (`planned → review` after endAt)?**~~ — RESOLVED in Tier 1 Q8: payment-type-aware. Cash = +10 min with prompt push. Card = +4h or EOD (whichever first), batched morning push.
- [x] ~~**Missed: silent or informative push?**~~ — RESOLVED via Q1: `missed` push is mandatory because the athlete already saw `finished` optimistically and needs the correction.
- [ ] **External calendar events re-sync rules** — what if a coach's external event is deleted externally? Currently: next sync removes it. **Owner:** calendar-sync spec owner (cross-reference).

---

## Related specs / references

- [coach-calendar.md](./coach-calendar.md) — primary consumer of these states (calendar rendering, event sheets)
- [review-queue.md](./review-queue.md) — screen that handles `review → finished/missed`
- [payments.md](./payments.md) — state transitions trigger payment flows (planned → release, missed → policy)
- [clients-coaches.md](./clients-coaches.md) — Schedule flow that creates `awaiting` events
- [calendar-sync.md](./calendar-sync.md) — external events (out-of-lifecycle)
- [notifications.md](./notifications.md) — push notification delivery mechanism
- Memory: `project_calendar_event_status_system` — all decisions captured during prototyping
- Prototype: `flows/coach/calendar.html` — state toggle buttons demonstrate all 6 states on event sheets
- Components: FitCalEvent, FitCalEventPill (see [design-tokens/docs/components.md](../../design-tokens/docs/components.md))
