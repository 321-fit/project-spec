# Coach Calendar

> Status: Approved (contract) / In Progress (event sheet + custom event migration)
> Prototype: [flows/coach/calendar.html](https://321-fit.github.io/project-spec/prototypes/flows/coach/calendar.html)
> Component library: [design-tokens/docs/components.md](../../design-tokens/docs/components.md)
> Last updated: 2026-04-24
> Implementation:
> - iOS:     [321fit_ios/docs/coach-calendar-ios.md] (to be created)
> - Backend: [poly-backend/docs/coach-calendar-backend.md] (to be created)
> - Voice:   [voice_control/docs/coach-calendar-voice.md] (to be created)
> - Android: (future)

---

## 1. Overview

Primary scheduling interface for coaches. A 24-hour vertical timeline per day with a horizontal date navigator at the top. Displays all events a coach has — training sessions (personal + group), custom time blocks, external calendar events (Google / Apple) — and provides create/edit/reschedule/cancel workflows via a **unified event sheet** driven by `data-event-state`.

Root tab screen, has the nav bar footer. Acts as both agenda view (for the coach) and scheduling instrument (for booking flows, availability checks).

---

## 2. User Stories

### Coach

- As a coach, I want to see my whole day at a glance so that I can plan my time around booked sessions.
- As a coach, I want to switch days via a horizontal day-chip strip so that navigation is quick.
- As a coach, I want to distinguish between different event types and statuses visually so that I don't mix up a planned session with an incoming request.
- As a coach, I want to tap an event and see its full detail + actions in a bottom sheet so that I don't leave the calendar context.
- As a coach, I want to create a new session or a custom time-block directly from the calendar so that adding events doesn't require deep navigation.
- As a coach, I want to drag an event to a new slot on the same day so that rescheduling is physical and intuitive.
- As a coach, I want to see when I have conflicts or unavailable windows so that I can't overbook myself.
- As a coach, I want to log a past session (cash payment already collected) so that my records stay accurate.

---

## 3. System Stories

- As the backend, the calendar data API must return a day's worth of events in ≤ 500 ms.
- As the backend, event status transitions (planned → review, request → cancelled auto) are handled via scheduled tasks; the calendar always reflects the latest state.
- As the client, the event sheet is a **single shared component** (`FitUI.openEventSheet`) — one markup, one state machine, six visual variants via `data-event-state`.
- As the client, conflict detection on drag must be computed from the visible day's events + external calendar + athlete availability (if applicable).
- As any service, the calendar must not display `cancelled` events (filtered server-side or client-side).

---

## 4. Flows

### Flow 1: View a day

1. Coach opens Calendar (nav bar tab or app launch) → `#s-calendar` renders.
2. Header: month + year + Today button + Sync button.
3. Day strip below header: 7-day horizontal strip centered on today, shows dots for days with events (personal, group, external colors).
4. Timeline below: 24h vertical grid, current hour indicated by horizontal "now" line + dot.
5. Events positioned absolutely: `top = startMinute * 96px/60min`, `height = durationMin * 96px/60min`.
6. Scroll auto-centers near the current time on first load.

### Flow 2: Open event detail

1. Coach taps an event block on the timeline.
2. `FitUI.openEventSheet(state: '<current>', event: {...})` → sheet slides up.
3. Sheet content:
   - Status header (descriptor + optional pill)
   - Avatar + athlete name (tap → opens their client detail via push)
   - Event info (title 18pt, time 14pt, location with location icon, price + payment badge)
   - State-aware footer:
     - `planned`: Message icon + Reschedule (secondary) + Cancel (destructive)
     - `request`: Decline (destructive) + Accept (primary)
     - `awaiting`: Cancel request (destructive-low)
     - `review`: Complete training (primary)
     - `missed`: Reschedule (secondary)
     - `finished`: View history (secondary)
4. Footer buttons dispatch: `complete`, `cancel`, `accept`, `decline`, `cancel-request`, `reschedule`, `message`, `view-history`.
5. Tap outside or swipe down → sheet dismisses.
6. Tapping Reschedule → sheet closes, Reschedule flow starts.
7. Tapping Cancel → confirmation sheet (destructive).

### Flow 3: Create new event

1. Long-press on empty timeline slot OR tap FAB (`+`) → action sheet with 3 options:
   - Personal session
   - Group session
   - Custom event
2. **Personal session:** routes to Select Athlete flow → Select Training Session template → Create/Edit event screen (pre-filled from long-press slot if applicable).
3. **Group session:** routes to Group Session creation flow (see [group-training.md](./group-training.md)).
4. **Custom event:** routes to Custom Event creation screen (see Flow 5).

### Flow 4: Reschedule via drag & drop (same day)

1. Coach long-presses a `planned` event → event lifts slightly (haptic feedback on iOS).
2. Drag → event follows pointer, visual indicators:
   - Unavailable zones (existing events, external events, out-of-work-hours) shown with red tint
   - Drop indicator snaps to 15-minute grid
3. Drop on valid slot → confirm sheet "Reschedule to {new time}?" → on confirm, create new event at new time with `awaiting`/`request` state; old event → `cancelled`.
4. Drop on invalid (conflict) → snackbar "Slot conflicts with another event"; event snaps back.
5. Cross-day drag not supported in v1.

### Flow 5: Create custom event (new in this spec)

1. From FAB action sheet → "Custom event" option.
2. Screen `s-custom-event-create` (to be prototyped):
   - Title input (required, 1–60 chars, placeholder "Gym class", "Family")
   - Date + start time + end time
   - Location (optional freeform text, 0–80 chars)
   - Notes (optional, 0–300 chars)
3. Create → event of `type: "custom"` added to calendar. No athlete, no price, no training template.
4. Rendering on timeline: gray muted block (different from personal/group) — no athlete info, no status pill.
5. Blocks availability: athlete booking calendars show this slot as busy (anonymized as "Coach unavailable" in athlete view).
6. Drag & drop within same day supported.
7. Delete: tap event → sheet → Delete button (destructive high, confirmation required).

### Flow 6: Create a past event (log cash session)

1. Coach navigates to a past date via day strip or date picker.
2. Tap empty slot or FAB → "Personal session" option.
3. Fill event details; system skips availability check for past dates.
4. Submit → event created with status `finished` directly (no approval flow, already happened).
5. Athlete sees this event retroactively in their completed sessions list only; NOT on their live calendar (prevents overlap confusion).
6. Used for cash-payment tracking after the fact.

### Flow 7: Cancel a planned event

1. Open event sheet (state `planned`) → Cancel button (destructive tinted).
2. Confirmation sheet with warning: "Cancel the session with {athlete} on {date}? They will be notified."
3. Confirm → event status `cancelled`; event hides from calendar; push to athlete.
4. If within 24h of session start → extra warning about coach's cancellation policy (TBD per [payments.md](./payments.md)).

### Flow 8: Event sheet state variants — summary

All 6 variants share the same DOM structure (avatar row + info + footer). Only the descriptor text + optional pill + footer buttons differ per `data-event-state`. See [event-statuses.md](./event-statuses.md) for the state enum. The unified sheet rules out the old parallel `cal-event-sheet` / `cal-invite-sheet` / `cal-group-sheet` divergence.

---

## 5. States

Calendar view itself is not state-ful (always renders the selected day). States are on individual events (see [event-statuses.md](./event-statuses.md)) and on the event sheet (6 variants via `data-event-state`).

Timeline-level states that do exist:

| State | When | What's shown |
|---|---|---|
| `default` | Normal day with events | Timeline + events rendered |
| `loading` | First fetch | Spinner centered inside timeline area, timeline greyed |
| `empty` | No events for the day | Timeline rendered without events (not an empty-state screen — calendar still useful to create events on) |
| `offline` | Network unreachable, cached available | Timeline rendered from cache + subtle banner |

---

## 6. API

### Endpoints

#### `GET /coach/calendar?date=YYYY-MM-DD`

Returns day-worth of events + availability metadata for the coach.

**Response 200 — `CoachCalendarDay`:**

```json
{
  "date":            "2026-04-24",
  "timezone":        "Europe/Vienna",
  "workHours":       { "startMin": 480, "endMin": 1200 },
  "events": [
    {
      "id":           UUID,
      "type":         "personal" | "group" | "custom" | "external",
      "status":       EventStatus,
      "startAt":      ISO8601,
      "endAt":        ISO8601,
      "title":        "Tennis training",
      "athlete":      AthleteSummary | null,   // null for custom / external
      "location":     "Court A" | null,
      "price":        50.0 | null,
      "currency":     "EUR" | null,
      "paymentType":  "card" | "cash" | null,
      "externalSource": "google" | "apple" | null
    },
    ...
  ],
  "unavailableBlocks": [
    { "startMin": 720, "endMin": 780, "reason": "athlete_busy" | "external" }
  ]
}
```

#### `GET /coach/month-dots?month=YYYY-MM`

Returns per-day event-type indicators for the month grid above the day strip.

**Response 200:**
```json
{
  "2026-04-10": ["personal"],
  "2026-04-11": ["personal", "group", "external"],
  ...
}
```

#### Event CRUD (status-aware)

- `POST /coach/events` — create new event (personal, group, or custom)
- `PATCH /coach/events/{id}` — update event (title, time, location, etc.)
- `POST /coach/events/{id}/reschedule` — creates new event in `awaiting`, cancels old
- `POST /events/{id}/cancel` — see [event-statuses.md](./event-statuses.md)
- `POST /coach/events/{id}/review` — mark complete / missed, see [review-queue.md](./review-queue.md)
- `DELETE /coach/events/{id}` — custom events only; full deletion (not cancellation)

---

## 7. Business rules

- **Events cannot overlap within the coach's calendar.** Enforced at create/reschedule time.
- **Events respect coach's work hours** (see [profile-settings.md](./profile-settings.md) Available Hours). Creating outside work hours is blocked for new events; existing events from before a schedule change are grandfathered.
- **Events respect athlete availability** — server checks athlete's `external-calendar busy` + existing `planned` events before accepting a booking.
- **External calendar events** (Google/Apple) block time slots but can't be modified inside 321Fit. They're read-only, shown in a muted style.
- **Cancelled events hidden from calendar.** Retention 2 months, then hard-deleted.
- **Past events auto-`finished` on creation** (no approval cycle).
- **Drag & drop restricted to same day** in v1. Cross-day rescheduling via Reschedule button in event sheet.
- **15-minute snap grid** on drag.
- **Custom events** (type `custom`): no athlete, no price, no training template. Blocks availability. Anonymized in athlete-facing views.

---

## 8. Edge cases

- **Clock drift across devices:** server time is source of truth. Clients compute "now" against server timestamp.
- **Overlapping events from external calendar:** external events can overlap each other (outside our system); we render them layered with slight horizontal offset.
- **Athlete time-zone differs from coach:** displayed in the viewing user's local TZ. Event stored in UTC.
- **Coach deletes a custom event with athlete booking already made for that slot (edge):** should not be possible — custom events are always blocking-only, don't share slots with bookings. If accidental overlap from race, last-write-wins with warning push.
- **Coach on vacation (see [vacation-mode.md](./vacation-mode.md)):** existing `planned` events remain on calendar; new booking requests blocked server-side. Calendar renders normally.
- **Past event created for a date before coach's first active day on the platform:** allowed for historical logging; enforced `startAt ≥ coach.createdAt - 6 months` max backdate.

---

## 9. Platform notes

- **iOS:** SwiftUI `ScrollView` with absolute-positioned event blocks (using `.offset(y:)`). HorizonCalendar for date navigation. Long-press gesture for drag mode. Haptic: `.medium` on grab, `.light` on drop.
- **Android:** Compose LazyColumn for hour rows + `Box` for absolute positioning of events. Material 3 bottom sheet for event detail.
- **Backend:** Day-worth query is a composite (events + work_hours + external + athlete busy). Benefits from materialized view per coach updated on event CUD.
- **Voice:** `get_my_training_events(date)` returns same shape as calendar API. Voice reads aggregated summary ("3 sessions today — 10:30, 14:00, 18:00").

---

## 10. Open questions

- [ ] **Cross-day drag:** v2 scope? Or stick with Reschedule sheet? **Owner:** product.
- [ ] **Custom event — recurring option?** Current spec: one-off only. Some coaches want "every Friday gym class". Defer to v2. **Owner:** product.
- [ ] **Past event backdate limit:** 6 months enough? Some coaches may want full year history. **Owner:** product.
- [ ] **External calendar event modification:** read-only in our app. Any use case where we'd want to allow edit → bidirectional sync? Probably no. **Owner:** calendar-sync spec owner.
- [ ] **Month grid view:** currently expandable from date strip. Rich month view (full grid) as separate screen? **Owner:** design.

---

## Related specs / references

- [event-statuses.md](./event-statuses.md) — 6-state enum, transitions, legacy migration
- [review-queue.md](./review-queue.md) — handles `review → finished/missed`
- [clients-coaches.md](./clients-coaches.md) — Schedule flow (coach creates events for athletes)
- [group-training.md](./group-training.md) — group session creation
- [calendar-sync.md](./calendar-sync.md) — external events source
- [payments.md](./payments.md) — payment release on finished, policy on missed / cancellation
- [vacation-mode.md](./vacation-mode.md) — paused state; existing events preserved
- [profile-settings.md](./profile-settings.md) — Available Hours definition
- Memory: `project_group_training_decisions`, `project_calendar_improvements`, `project_event_detail_decisions`, `project_calendar_event_status_system`
- Prototype: `flows/coach/calendar.html` (all 6 event states demonstrable via sidebar toggles)
- Components: FitCalEvent, FitCalEventPill, FitSheet, FitSheetStatusHeader, FitDayStrip, FitTimeline, FitIconBtn, FitButton. See [design-tokens/docs/components.md](../../design-tokens/docs/components.md).
