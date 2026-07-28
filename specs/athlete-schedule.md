# Athlete Schedule & Booking

> Status: In Progress (iOS booking implemented) · state-aware event drawer specced 2026-06-30
> Prototype: [flows/athlete/calendar.html](https://321-fit.github.io/project-spec/prototypes/flows/athlete/calendar.html)
> Component library: [design-tokens/docs/components.md](../../design-tokens/docs/components.md) — FitCalEvent, FitCalEventPill, FitRoleTag
> Related: [coach-calendar.md](./coach-calendar.md), [event-statuses.md](./event-statuses.md)
> Last updated: 2026-07-28 (athlete **drag-reschedule of own 1-1 sessions** documented — retires the earlier "no drag & drop" note; see "Drag-reschedule — athlete side")

## Overview
Athletes use the same Schedule tab as coaches but with a different feature set. Athletes browse coach availability and send booking requests. They cannot create events directly — only request sessions that coaches must approve.

---

## User Stories

### Athlete

- As an athlete, I want to see my upcoming training sessions on a daily timeline so that I can plan my day around them.
- As an athlete, I want to scan a single tile and know **who** my coach is, **when** the session is, and **where** it takes place — without opening a drawer.
- As an athlete, I want to distinguish a confirmed session from one I've requested (Awaiting) or that a coach invited me to (Request), so I know if I owe anyone an answer.
- As an athlete, I want my external Google/Apple Calendar events to block me out so I don't double-book myself with a training.
- As an athlete, I want to tap a planned session and see the full detail (coach, time, location, price, payment method) + actions (cancel, message coach) without leaving the calendar context.
- As an athlete, I want to drag one of my own 1-1 sessions to a new time on the grid and have it sent to the coach as a reschedule request, so moving a session is as direct as booking one — while my original slot stays held until they answer.
- As an athlete, I want group sessions and my synced Google/Apple events to refuse the drag, so I can't imply a change I'm not allowed to make.
- As an athlete, I want to leave a star rating after a session via a post-training sheet (triggered by push or tap on a finished event).
- As an athlete who is also a coach, I want to see the coaching sessions on my OWN coach roster appear here too — muted, but tappable — so I don't double-book training time when I have an upcoming class to run. Switching to coach view from that tile should be one tap.

---

## System Stories

- As the backend, `GET /athlete/training-events?date=YYYY-MM-DD` returns all events for the day — own bookings + external calendar events. When the user also has a coach profile, the day events endpoint must include their cross-role coach sessions (carrying `role_context: "other_role"`) so the client can render the muted cross-role tile.
- As the client, every event tile on the timeline is rendered by the same `FitCalEvent` component from design-tokens. 3-tier adaptive layout (Tiny / Compact / Standard) driven by tile height. Recipient slot for athlete events = `"with Coach {name}"`; for cross-role coach sessions = `"{N}/{max} athletes"` (or coach-specific recipient).
- As the client, athlete events use the SAME 6-status enum as coach events but a subset of pills appear (Request when coach invited, Awaiting when athlete requested, Missed; never Review — Review is coach-only post-event action).
- As the client, cross-role tiles cannot be dragged and have no inline status pill — tapping them opens `ath-cross-role-sheet` with a primary `Switch to coach →` CTA.
- As the backend, cross-role event presentation does NOT affect the underlying status lifecycle; the coach session keeps its own status on the coach side regardless of how it's shown on the athlete calendar.
- As any service, cancelled events do not appear on the timeline.

## Current State
Fully implemented in iOS and backend. Voice assistant supports athlete booking via tools.

## Components

### Backend
- Athlete events: `GET/POST/PUT/DELETE /athlete/training-events`
- Coach availability: `GET /athlete/coaches/{id}/available-booking-slots`
- Coach occupied slots: `GET /athlete/events/coaches/{id}/occupied-slots`
- Pending requests: `GET /athlete/pending-requests`

### iOS
- Shared schedule view: `TabBar/Tabs/ScheduleTab/Schedule/` (same as coach)
- Athlete booking flow: `TabBar/Tabs/ScheduleTab/Event/Create/FromAthlete/`
- Shared slot selection: `TabBar/Tabs/ScheduleTab/Event/Create/Common/SelectSlots/`
- Event request: `TabBar/Tabs/ScheduleTab/Event/Create/SendEventRequest/`

### Voice Assistant
- `athlete_create_training_event_with_ids()` → preview booking
- `athlete_confirm_training_event()` → confirm
- `get_coach_available_slots_by_id()` → check availability
- `get_available_coaches_at_time()` → who's free now

### Android (Planned)
- Same schedule view and booking flow as iOS
- Same slot selection UI

## Event tile layout (unified)

Same `FitCalEvent` component as Coach Calendar with adaptive 3-tier layout. See [coach-calendar.md § 4a](./coach-calendar.md#4a-event-tile-layout-unified) for the canonical tier table — athlete uses identical rules, only the **recipient** content differs (`"with Coach {name}"` vs coach's `"{athlete name}"`).

3pt hairline gap is reserved between back-to-back events the same way (outer-inner padding pattern in `FitCalEvent`).

## Cross-role presentation (when user has both roles)

When the athlete is ALSO a coach, their coaching sessions appear on the athlete calendar as muted cross-role tiles — dashed left stripe, opacity 0.75, `[🏃 Coach]` badge in the bottom-right.

Tap → `ath-cross-role-sheet` opens:
- Status header: "Coaching session" + Coach badge
- Group icon + session name ("You're the coach · 7 athletes joined")
- Time + location + price/person
- Info banner: "This session is on your coach profile. To manage participants, reschedule, or complete training — switch to coach view."
- Footer: `[Close]` + `[Switch to coach →]` (primary).

Switching to coach role navigates to the same event in coach-calendar with the full coach event drawer ready for action. Cancel just dismisses.

See [coach-calendar.md § 4b](./coach-calendar.md#4b-cross-role-presentation) for the mirror behavior + conflict rules. The `cross-role` presentation is orthogonal to the 6 status states — see [event-statuses.md](./event-statuses.md).

## Calendar View

Athletes and coaches share the **same** `ScheduleView` and `ScheduleViewModel`. Role-based differences are handled via `userRole` property checks.

### What Athletes See
- Own events (all statuses)
- Coach events they're part of (read-only)
- External calendar events (Google/Apple) blocking their time
- 24-hour vertical timeline, same as coach view

### What Athletes CAN'T Do (vs Coach)
| Feature | Athlete | Coach |
|---|---|---|
| Drag & drop events | Own **1-1** sessions only (future) — see below | Own events (personal + group + custom) |
| Create events directly | No — sends request | Yes |
| Create custom events | No | Yes |
| Create events in past | No | Yes |
| Manage work hours | No | Via settings |

### Drag-reschedule — athlete side (2026-07-28)

The athlete drags a session on the timeline exactly like the coach does, but the drop is a **reschedule request**, never a unilateral move: the event goes to **Awaiting** and the athlete keeps the original slot until the coach accepts. Endpoint: `PATCH /athlete/training-events/{id}/reschedule`.

**Draggable predicate** (mirrors prod iOS `ScheduleViewModel.isDraggable`):
`future && ownRole && type == Personal` — i.e. **own 1-1 sessions only**.

Excluded, and why:

| Not draggable | Reason |
|---|---|
| Group sessions | Coach-owned; a group move ripples across every participant, so the coach drives it (with this/following/all scope) |
| External Google/Apple events | Not 321Fit entities — non-draggable for both roles |
| Cross-role coach tiles (user is also a coach) | Read-only on this side; tap opens `ath-cross-role-sheet` → Switch to coach |
| Anything in the past | Clamped by the shared scaffold for both roles |

While dragging, the grid shows the **coach's** occupied/unavailable zones (the counterparty constrains the choice — the athlete has no availability of their own). An invalid target paints the dragged tile `.invalid` and the snackbar names the reason. Same drag grammar as the coach calendar — see [event-statuses.md § Drag targeting](./event-statuses.md).

Shipped: Android epic `321fit_android_new#122` (step 4). iOS: already prod.

### Event drawer — states & actions (2026-06-30)

Tapping an event opens a **unified, state-aware bottom drawer** — the athlete-side mirror of the coach's `cal-event-sheet`. It reuses the **canonical** status grammar (`fit-ui.css` `.fit-cal-event.request / .awaiting / .missed / .finished` tile tints + `.fit-cal-event-pill--*` pills) and the canonical `data-event-state` + `.fit-sheet-footer-variant` mechanism — shared verbatim with the coach calendar. **Accept/Decline happens right on the calendar** (no deep-link into the Inbox); the same action also lives in the Inbox "To reply" tab (`dashboard.html#s-notifications`) — the calendar is the time-view shortcut. See [event-statuses.md](./event-statuses.md) for the shared 6-state system.

**Header (all states):** descriptor + status pill + a **message icon** opening the chat with the coach. Messaging works in every state, so it is sheet chrome rather than a state action — the footer below lists only the state's response. (Revised 2026-07-28; it previously sat inside the Planned footer.) Same rule on the coach drawer, whose header additionally carries the `⋯` action hub.

| State | Tile | Drawer descriptor + pill | Footer actions |
|---|---|---|---|
| **Planned** | teal/blue, no pill | "Confirmed session" | **Reschedule** (→ new request, coach approves; current slot held) · **Cancel** → cancel-with-refund sheet |
| **Request** (incoming — coach scheduled, athlete must respond) | yellow tint + "Request" pill | "Coach invited you" | **Decline / Accept** (inline) |
| **Awaiting** (outgoing — athlete requested, waiting on coach) | gray + "Awaiting" pill | "Waiting for coach" + expiry note ("Expires in 22h — auto-cancelled & refunded", the 48h window) | **Cancel request** |
| **Finished** | faded (opacity 0.5), no pill | "Completed" | **Rate this session** → star sheet |
| **Missed** | red tint + "Missed" pill | "Missed — no-show" | Book again |

- **Cancel-with-refund:** free cancellation up to **24h** before → amount returned to balance; within 24h a policy warning is shown (may be non-refundable per the coach's policy). See [payments.md](payments.md).
- **Rate vs review:** the Finished footer gives a quick **star rating** only. The written **review** is prompted by a **separate follow-up notification the day after the athlete's first session** (notifications-catalog), not from the calendar.
- **Coach-confirmed note:** when the coach proxied the athlete's Accept after an offline agreement (status `coach_confirmed`), a Planned event shows an informational blue note (transparency without push).
- **Cross-role events:** when the user is also a coach, their own coaching sessions appear as muted dashed-stripe tiles with a "Coach" tag → read-only drawer + **Switch to coach**.

## Athlete Booking Flow

### Entry Points
1. FAB (Floating Action Button) on schedule
2. Coach profile → Book session
3. Voice assistant ("Book a session with {coach}")

### Step-by-Step Flow

**Step 1: Select Coach** (`FromAthlete/SelectCoach/SelectCoachView.swift`)
- Browse/search connected coaches
- Includes filters, sorting, favorites
- Tap coach to proceed

**Step 2: Coach Profile** (`FromAthlete/CoachProfile/CoachProfileView.swift`)
- View coach details, specializations
- See available training session templates (with prices)
- Tap a session to proceed to slot selection

**Step 3: Select Slots** (`Common/SelectSlots/SelectSlotsView.swift`)
- Calendar view showing coach's availability
- Calls `athleteService.getCoacheSchedule()` for availability data
- Shows:
  - Coach's working hours (available slots)
  - Coach's occupied slots (already booked)
  - Athlete's own occupied slots
- Unavailable areas highlighted in red
- Tap available slot to select time

**Step 4: Send Event Request** (`SendEventRequest/SendEventRequestView.swift`)
- Review all details: coach, session, date, time, price, location
- Add optional comment
- Select payment method (card/cash)
- Confirm → sends request to coach
- Event created with status: `pending` (athlete) / `request` (coach)

## Availability Calculation

When selecting a slot, the system shows:
- **Green/available**: Coach working hours with no conflicts
- **Red/unavailable**: Time occupied by coach's other events, athlete's own events, or outside coach working hours

Data sources:
- `GET /athlete/coaches/{id}/available-booking-slots` — coach's free slots
- `GET /athlete/events/coaches/{id}/occupied-slots` — coach's busy times
- Athlete's own events (fetched locally)

## Event Lifecycle (Athlete Perspective)

```
Athlete books session → pending (athlete view)
  ↓
Coach receives request → request (coach view)
  ↓
Coach approves → approved (both) → session takes place → completed
Coach declines → declined (both)
48h no response → auto-declined (both)
```

### Reschedule
- Athlete can reschedule approved events
- Reschedule creates new pending/request cycle
- Coach must approve the new time

### Cancellation
- Athlete can cancel approved events
- Cancellation policy applies (see [Payments spec](payments.md))

## Known Issues / Tech Debt
- Booking flow requires multiple screens — could be streamlined
- Coach availability can be stale if not refreshed (no real-time updates)
- No "suggest alternative time" feature when preferred slot is taken

## Platform notes

**Native UI conventions:** see [architecture/design-system.md § Native theming contract](../architecture/design-system.md#native-theming-contract). Don't duplicate cross-platform UI rules here — only platform-specific deviations below.
