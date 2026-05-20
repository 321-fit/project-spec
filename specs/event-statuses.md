# Event Status System & Push Notifications

> Status: Approved (contract) / In Progress (implementation migration)
> Prototype: [flows/coach/calendar.html](https://321-fit.github.io/project-spec/prototypes/flows/coach/calendar.html) — all 6 states demo · [flows/athlete/calendar.html](https://321-fit.github.io/project-spec/prototypes/flows/athlete/calendar.html) — cross-role mirror
> Component library: [design-tokens/docs/components.md](../../design-tokens/docs/components.md) — FitCalEvent, FitCalEventPill, FitRoleTag
> Last updated: 2026-05-20
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
| `awaiting` | Creator only | gray-400 | "Awaiting" | "Waiting for athlete's response" | new creation (outgoing) | `planned` (other accepts), `cancelled` (other declines / 48h auto / creator cancels) |
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

## 6. API

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

Fields on `TrainingEvent`:
- `status`: `EventStatus`
- `type`: `"personal" | "group" | "custom" | "external"`
- `endAt`: ISO8601
- `cancelledAt`: ISO8601 | null (set when transitioning to cancelled)
- `completedAt`: ISO8601 | null (set when transitioning to finished)

### Endpoints (status-related subset)

#### `POST /coach/events/{id}/review`

Marks event `review → finished` or `review → missed`. See [review-queue.md](./review-queue.md).

#### `POST /events/{id}/accept`

Transitions `request → planned`. Auth: receiver must be the current user. Returns updated event.
**Response 409:** if event is not in `request` state.

#### `POST /events/{id}/decline`

Transitions `request → cancelled`. Same auth rule.

#### `POST /events/{id}/cancel`

Transitions `planned → cancelled`. Either party can call.

#### `POST /events/{id}/reschedule`

Creates new event with `request`/`awaiting` state + cancels old. Body: `{ newStartAt, newEndAt }`.

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
- **Server state `review` is coach-only. Athlete view maps it to `finished` optimistically.** API serializer for athlete responses translates `review → finished`. If coach later marks `missed`, athlete view updates (push + next fetch). Decided in Tier 1 Q1 — see Flow 3 rationale.
- **External events** (Google/Apple Calendar sync): separate status-less path. Rendered on calendar as read-only blocks; don't participate in booking lifecycle.
- **Custom events** (coach-created time blocks, see [coach-calendar.md](./coach-calendar.md) Custom Event section): also status-less. Always displayed; can be deleted.
- **Cancellation retention:** 2 months in DB, then hard-delete. Cron task nightly.
- **State transitions are atomic** — server must not allow a partial transition (e.g., status updated but push not sent). Use database transactions + idempotent outgoing events.
- **Every visible transition fires a push** unless recipient disabled notifications. See Push table below.
- **Pill colors map to state, not to role or context.** A yellow pill always means "needs attention" (request or review); gray always means "waiting on other party" (awaiting).

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
