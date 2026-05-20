# Athlete Schedule & Booking

> Status: Implemented (iOS) · Cross-role + unified tile layout added 2026-05-20
> Prototype: [flows/athlete/calendar.html](https://321-fit.github.io/project-spec/prototypes/flows/athlete/calendar.html)
> Component library: [design-tokens/docs/components.md](../../design-tokens/docs/components.md) — FitCalEvent, FitCalEventPill, FitRoleTag
> Related: [coach-calendar.md](./coach-calendar.md), [event-statuses.md](./event-statuses.md)
> Last updated: 2026-05-20

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
| Drag & drop events | Own events only (today/future) | Own events |
| Create events directly | No — sends request | Yes |
| Create custom events | No | Yes |
| Create events in past | No | Yes |
| Manage work hours | No | Via settings |

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
