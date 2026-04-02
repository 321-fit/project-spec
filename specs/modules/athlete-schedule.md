# Athlete Schedule & Booking

> Last updated: 2026-04-02

## Overview
Athletes use the same Schedule tab as coaches but with a different feature set. Athletes browse coach availability and send booking requests. They cannot create events directly — only request sessions that coaches must approve.

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
