# Coach Calendar

> Last updated: 2026-04-02

## Overview
The calendar is the primary scheduling interface for coaches. It displays all events (training sessions, custom events, external calendar events) and allows coaches to create, edit, and manage their schedule.

## Current State
Implemented in iOS. Backend supports all event operations. Voice assistant can create/update events.

## Components

### Backend
- Training event endpoints: `entry/rest/v1/endpoints/coach/` — CRUD for events
- Available booking slots: `GET /coach/available-booking-slots`
- Occupied slots: `GET /coach/occupied-slots`
- Schedule (work hours): `GET/POST/PUT/DELETE /coach/schedule`
- Training sessions (templates): `GET/POST/PUT/DELETE /coach/training-sessions`

### iOS
- Schedule tab: `TabBar/Tabs/ScheduleTab/`
- Calendar UI: `TabBar/Tabs/ScheduleTab/Calendar/` (HorizonCalendar)
- Event creation: `TabBar/Tabs/ScheduleTab/Event/Create/FromCoach/`
- Event editing: `TabBar/Tabs/ScheduleTab/Event/Edit/`
- Schedule API: `TabBar/Tabs/ScheduleTab/API/`

### Voice Assistant
- Coach tools: `coach_create_training_event_with_ids()`, `coach_update_training_event_by_id()`
- Availability check: `get_athlete_available_slots_by_id()`, `get_available_clients_at_time()`
- Schedule management: `get_coach_week_work_hours()`, `update_day_hours()`

### Android (Planned)
- Same calendar view and event management as iOS
- HorizonCalendar equivalent (custom calendar component)
- Same event creation/editing flows
- Drag & drop support

## General Rules
- Events cannot overlap
- Events respect coach work hours (schedule)
- Events respect athlete availability (occupied slots from their calendar)
- External calendar events (Google/Apple) block time slots

## Calendar View

### Layout
- 24-hour vertical time axis
- Events positioned by start time, height proportional to duration
- Background grid with time lines
- Inline horizontal date picker for quick navigation

### Event Display
- Color-coded by status (approved, pending, request, etc.)
- Shows: title, time, participant name
- External calendar events displayed with distinct visual style
- Conflict detection: overlapping events flagged via `isConflicted`
- Reserved/unavailable slots shown as blocked regions

### Data Fetching
```
GET {role}/training-events/?startDate=X&endDate=Y
→ Events grouped by date
```

## Creating Events

### Entry Points
1. Tap on empty slot in calendar → modal with pre-filled date/time
2. FAB (Floating Action Button) → modal

### Modal Options
- **Add Training Session** — full booking flow
- **Add Custom Event** — simple event with name and time

### Training Session Creation Flow
1. **Select Athlete** — choose from connected athletes list
2. **Select Training Session** — choose from coach's pre-created templates (services)
3. **Create Event** — form with pre-filled data:
   - Athlete (editable)
   - Training session template (editable)
   - Date
   - Start time / end time (editable)
   - Price (editable, from template)
   - Location (editable, from template)
4. Submit → event created with status `pending` (coach) / `request` (athlete)

### Custom Event Creation
- Fields: event name, start time, end time, date
- If created from calendar slot → date and start time pre-filled
- No athlete involved, no approval workflow
- Used for blocking personal time

## Editing Events

### Drag & Drop
- Events can be dragged within the same day
- During drag:
  - Unavailable areas highlighted (existing events, athlete's busy times)
  - Drop on unavailable area is prevented
- Drop → triggers reschedule flow (pending/request)

### Edit Screen
- Same layout and fields as creation screen
- All fields editable
- Submit → creates reschedule request (status transitions to pending/request)

## Creating Events in the Past

**Special rules:**
- Coach CAN create events for past dates
- Past events automatically get status `approved` (no approval flow)
- Athlete availability is NOT checked for past events
- If athlete already has an event at that time → the past event is NOT shown in athlete's calendar (prevents overlap confusion)

**Use case:** Coach logs a session that already happened (e.g., cash payment session).

## Available Time Calculation

When creating/editing an event, the system calculates available slots by excluding:
1. Coach's existing events (all statuses except declined/auto-declined/canceled)
2. Coach's external calendar events (Google/Apple)
3. Athlete's existing events (if athlete selected)
4. Athlete's external calendar events
5. Time outside coach's work hours

## Data Model

### Training Session (Template)
| Field | Description |
|---|---|
| training_name | Session type name |
| duration | Duration in minutes |
| price | Price per session |
| currency | Currency code |
| price_on_demand | Price negotiable flag |
| payment_type | card / cash |
| address_id | Default location |

### Training Event (Instance)
| Field | Description |
|---|---|
| coach_profile_id | Coach |
| athlete_profile_id | Athlete (null for custom events) |
| training_session_id | Template reference |
| datetime_start | Start time |
| datetime_end | End time |
| price | Actual price |
| currency | Currency |
| payment_type | card / cash |
| comment | Optional note |
| event_source | internal / google / apple |

## Implementation Status

### Custom Events — Verified Implemented
- Location: `ScheduleTab/Event/Create/FromCoach/CreateEvent/`
- Components: `CustomEventTitleView`, `CustomEventDateView`, `CustomEventEdgesView`
- Detection: `Event.isCustom` returns true when no training session attached
- Built with `EventBuilder` in `CreateCoachEventViewModel`

### Drag & Drop — Verified Implemented
- Location: `ScheduleTab/Schedule/Helpers/ScheduleManager.swift`
- Gesture: `@GestureState dragState = ScheduleDragState.inactive`
- Method: `onDragGestureChangedForSlotSelection()` handles repositioning
- State tracking: `isRearrangingActive`, `previousOffset`, `previousTranslation`
- Updates via: `onUpdateEventOnChangePosition` subject

## Known Issues / Tech Debt
- Past event creation overlap detection could be improved
- Drag & drop limited to same-day (cross-day drag not supported)
