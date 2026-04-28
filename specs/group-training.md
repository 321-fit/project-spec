# Group Training

> Status: Draft
> Prototype: [group-training.html](https://321-fit.github.io/project-spec/prototypes/flows/group-training.html)
> Last updated: 2026-04-10

## Overview

Add group training sessions to 321Fit. Coaches create reusable templates with participant limits and recurring schedules. Athletes discover group trainings on coach profiles and join with open registration (no approval needed).

### Key Changes from Personal Training
| Aspect | Personal | Group |
|---|---|---|
| Participants | 1 athlete | 2–50 athletes |
| Approval | Coach approves each request | Open registration, first come first served |
| Initiation | Athlete requests | Coach creates events in advance |
| Payment | Hold on approval | Hold on registration (card) or just register (cash) |
| Scheduling | Athlete picks time | Coach sets fixed time, recurring or one-off |

## User Stories

### Coach
- As a coach, I want to create group training templates so athletes can discover and join them
- As a coach, I want to set max and min participant limits
- As a coach, I want to schedule recurring group sessions (e.g., every Tue & Thu at 18:00)
- As a coach, I want to create one-off special events (masterclass, workshop)
- As a coach, I want to see who registered and track cash payments
- As a coach, I want to cancel or reschedule individual sessions without affecting the whole series
- As a coach, I want to be notified when all spots are filled or 24h before with participant count

### Athlete
- As an athlete, I want to see group trainings on coach profiles
- As an athlete, I want to see available dates and spots before joining
- As an athlete, I want to join a group training with one tap + confirmation
- As an athlete, I want to see who else is in the training
- As an athlete, I want to cancel my registration (24h free cancel)
- As an athlete, I want to see group events in my schedule with "Group" badge

### System
- As the system, I need to auto-generate recurring group events 2 months ahead so athletes always see upcoming sessions
- As the system, I need to check min threshold 24h before and notify the coach
- As the system, I need to clean up expired events and release unredeemed card holds
- As the system, I need to sync group events to connected external calendars
- As the system, I need to notify the coach after event end time to complete the training and mark payments

## Screens & Flows

### Coach Flow

#### 1. Create Group Session

The create / edit form is shared between personal and group templates and is documented in [session-creation.md](./session-creation.md). Group fields (max/min participants, recurring schedule, days, date, start time, time/date picker sheets), validation, side-effect resets, and the impactful-changes scope picker all live there.

**Group-specific behavior layered on top of the shared form:**
- Selecting Group reveals max/min participants and the schedule section
- On save with `is_group: true && is_recurring: true`, server auto-generates events for the next 2 months (see Section "Recurring Events" below)
- One-off mode (`is_recurring: false`) creates a single event and gets the "Special" badge on the coach profile

#### 2. My Training Sessions

The list screen, edit-mode behavior, and impactful-vs-non-impactful change rules are documented in [session-creation.md](./session-creation.md). On a group template card, badges and price strings differ from personal:
- Group templates: badge "Group · max 10", price shown as "€25/person"
- Personal templates: badge "Personal"

#### 3. Calendar
[Prototype screen: Calendar]

24-hour vertical timeline, 15-min grid snap.

- Group events: cyan left border + participant badge "7/10"
- Personal events: green left border + athlete name
- Day strip wheel (horizontal scroll, today centered)
- Today / Sync buttons in header
- FAB "+" → bottom sheet: "Create Personal Event", "Create Group Event", "Create Custom Event"
- Long tap on empty slot → same FAB sheet, but time prefilled from finger position
- "Create Group Event" → opens Create Session form with: Group type, current day as date, Recurring default. FAB tap = no time prefill, long tap = time from position
- Long press on existing event → bottom sheet: View Details, Reschedule, Cancel
- Current time indicator (teal line + dot)

**Drag & drop:**
- Same day only
- Coach's own slot occupied → BLOCKED, cannot drop
- Participant conflicts → warning dialog listing affected participants → "Move anyway" or "Cancel move"
- Move is NOT blocked by participant conflicts — coach decides

**Recurring event management (Reschedule/Cancel from drawer):**
- Radio options: "This session only" / "This and all following" / "All sessions"
- Cancel: warning "X participants will be notified and refunded"
- Reschedule: then opens date/time picker

#### 4. Group Event Detail
[Prototype screen: Event Detail]

Ticket-card layout — compact summary + participant list.

- Ticket card: badge + price, date/time, location, payment method, spots bar
- Participant list: avatar + name + sport
- Swipe left to remove participant
- Long press → bottom sheet: View Profile, Send Message, Remove
- X button for quick remove
- Cancel Training button (red, sticky footer)

#### 5. Event Completion (post-training)
[Prototype screen: Event Completion]

Screen coach sees after training ends. Combines payment tracking + completion.

**Entry point:** Push notification to coach after event end time → "Training ended. Tap to review and complete."

**Layout:**
- Ticket card with training summary
- Participant list with payment status per person:
  - **Card payment:** auto-shows "Paid ✓" (green) — no action needed
  - **Cash payment:** shows checkbox — coach taps to mark as paid
  - **Mixed (both card and cash):** each participant shows their payment method + status
- Three interaction methods for cash: tap row, swipe right ("Paid"), swipe left ("Remove")
- Counter "Paid: X/Y" updates in real-time
- Paid participants visually dimmed

**Complete Training button:**
- Always active (unpaid cash does NOT block completion)
- On tap: confirms completion, triggers Stripe transfers for card participants
- Unpaid cash participants stay as "cash_unpaid" record — visible in athlete's history

#### 6. Athlete Post-Training Feedback
[Prototype: bottom sheet on Athlete Schedule screen]

Not a separate screen — bottom sheet that opens on athlete's schedule after training ends.

**Entry points:**
- Push notification: "HIIT Group Session has ended. How was your training?" → opens schedule with sheet
- Tap on completed event in schedule → sheet opens

**Bottom sheet content:**
- Mini ticket: coach avatar + training name + "Done" badge
- "How was your training?" + subtitle
- Star rating (1-5, tap to select)
- "Didn't happen? Report issue" link → opens support flow
- "Submit" button → closes sheet, sends rating

### Athlete Flow

#### 6. Coach Profile
[Prototype screen: Coach Profile]

Two-level navigation to group trainings.

- **Group Trainings section FIRST** (above personal sessions)
  - Template cards: name, schedule ("Tue & Thu, 18:00"), price, max participants
  - "Next: Thu Apr 10 · 3/10 spots" preview
  - One-off events: "Special" badge + highlighted border
  - Tap template → booking calendar
- **Personal Sessions section** below
- **About section** at bottom with "See more"

#### 7. Booking Calendar
[Prototype screen: Booking Calendar]

Reuses existing booking calendar UI.

- Shows only dates with this template's events (filtered by template)
- Greyed out dates: no event for this template
- Available dates: gradient circles with spots count
- Today: brand border
- Tap date → scroll to event card below (NOT auto-open detail)
- Tap event card → group detail

#### 8. Group Training Detail
[Prototype screen: Group Detail]

Before joining — shows training info and participants.

- Ticket card: coach avatar + name, date/time, location, price, spots bar
- Participant list: tappable rows with chevron ">"
- Tap participant → bottom sheet: View Profile, Send Message
- Join Training · €25 — sticky CTA footer

#### 9. Join Confirmation
[Prototype: bottom sheet on Group Detail]

Modal before registration.

- Training summary (name, date, time, location, spots)
- Price
- Payment method (Visa •••• 4242)
- Cancellation policy: "Free cancellation up to 24 hours before"
- "Continue · €25" button

**After join:**
- Card: amount held from balance
- Cash: just registered, no hold
- Navigate to Joined screen

#### 10. Group Training — Joined
[Prototype screen: Group Joined]

After athlete joins.

- Ticket card with green "Joined" badge
- Current user first in participant list with "You" label + gradient avatar
- Other participants tappable (View Profile, Send Message)
- "Leave Training" button (red, sticky footer)

#### 11. Group Training — Full
[Prototype screen: Group Full]

All spots taken.

- Red "Full" badge + red progress bar (100%)
- Collapsed participant list ("+12 more")
- Disabled button: "Training is Full"
- No waitlist in V1

#### 12. Athlete Schedule
[Prototype screen: My Schedule]

Same calendar as coach but light theme.

- Group events: cyan border + participant count badge
- Personal events: green border + coach name
- No drag & drop, no FAB
- Long press → sheet: View Details, Cancel Registration

## Data Model

### New/Modified Tables

**training_session (modified)**
| Field | Type | Description |
|---|---|---|
| is_group | boolean | false = personal, true = group |
| max_participants | int, nullable | max athletes (group only) |
| min_participants | int, nullable | min threshold (group only, optional) |
| recurring_days | array[int], nullable | days of week 0-6 (group recurring) |
| recurring_time | time, nullable | start time for recurring events |
| is_recurring | boolean | true = auto-generate events |

**training_event (modified)**
| Field | Type | Description |
|---|---|---|
| is_group_event | boolean | derived from session.is_group |
| override_datetime | datetime, nullable | for rescheduled individual recurring events |
| cancelled_from_recurring | boolean | true if cancelled but chain continues |

**group_event_participant (new)**
| Field | Type | Description |
|---|---|---|
| id | uuid | primary key |
| training_event_id | FK | → training_event |
| athlete_profile_id | FK | → athlete_profile |
| registered_at | datetime | when athlete joined |
| payment_status | enum | waiting / held / transferred / cash_unpaid / cash_paid |
| cancelled_at | datetime, nullable | when athlete cancelled |

### Key Queries
- Get available group events for template: `WHERE session_id = X AND datetime_start > now() AND cancelled = false`
- Count participants: `COUNT(*) FROM group_event_participant WHERE event_id = X AND cancelled_at IS NULL`
- Check spots: `count < session.max_participants`

## API Endpoints

### New Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/coach/group-templates/` | List coach's group training templates |
| POST | `/coach/group-templates/` | Create group template + auto-generate events |
| GET | `/coach/group-templates/{id}/events/` | List events for a template |
| GET | `/athlete/coaches/{id}/group-trainings/` | Group templates on coach profile |
| GET | `/athlete/group-events/{id}/` | Group event detail with participants |
| POST | `/athlete/group-events/{id}/join/` | Join group training |
| DELETE | `/athlete/group-events/{id}/leave/` | Leave group training |
| PATCH | `/coach/group-events/{id}/participants/{pid}/` | Mark cash payment |
| DELETE | `/coach/group-events/{id}/participants/{pid}/` | Remove participant |

### Modified Endpoints

| Method | Path | Change |
|---|---|---|
| GET | `{role}/training-events/` | Include group events with participant count |
| GET | `coach/training-events/allowed-hours/` | Account for group event slot blocking |
| PATCH | `{role}/training-events/{id}/change-status/` | Support recurring options (this/following/all) |

## Business Rules

### Registration
- Open registration — no approval
- First come first served
- Cannot join if: full, time conflict with own events, insufficient balance (card)
- Card payment: hold on registration, transfer after completion
- Cash: just registration, coach marks payment manually

### Cancellation
- **Athlete:** 24h+ before = free cancel + refund. <24h = penalty (same as personal)
- **Coach cancel event:** confirmation "X participants will be notified and refunded"
- **Coach cancel recurring:** 3 options — this only / this and following / all events
- Cancelled individual event doesn't break recurring chain

### Minimum Threshold
- Optional per template
- 24h before event: if participants < min → push to coach
- Coach decides: cancel (all notified + refunded) or proceed
- NOT auto-cancel

### Overlap & Conflicts
- Group event blocks coach's slot — cannot create personal on top
- Coach cannot move any event to occupied slot (strict)
- Drag & drop group event: check all participants, show conflicts → coach decides "Move anyway" or "Cancel"
- External calendar events block availability (treated as busy)
- External conflicts shown side-by-side in calendar

### Recurring Events
- Auto-generate 2 months ahead, rolling window (daily check)
- Individual event can be cancelled/rescheduled without affecting chain
- Reschedule options: this only / this and following / all
- One-off events: single event, "Special" badge on profile

## Notifications

| Trigger | Recipient | Push Message | Deep Link |
|---|---|---|---|
| All spots filled | Coach | "🎉 HIIT Group Session on Apr 7 is fully booked (10/10)" | Event detail |
| 24h before (info) | Coach | "Yoga Morning Flow tomorrow at 08:00 — 12/15 participants" | Event detail |
| 24h before (reminder) | Each athlete | "Reminder: Yoga Morning Flow tomorrow at 08:00 with John Miller at GYM Bro" | Event in schedule |
| Min threshold not met | Coach | "⚠️ HIIT Group Session tomorrow has only 2/5 minimum. Cancel or proceed?" | Event detail |
| Athlete joined | Athlete | "You joined HIIT Group Session on Apr 7 at 18:00" | Joined screen |
| Athlete left | Athlete | "You left HIIT Group Session. Refund processed." | Schedule |
| Training cancelled (coach) | All participants | "HIIT Group Session on Apr 7 was cancelled. Refund processed." | Schedule |
| Training rescheduled | All participants | "HIIT Group Session moved to 15:00" | Event in schedule |
| Reschedule conflict | Conflicted athletes | "HIIT Group Session moved to 15:00. You have a conflict — tap to review." | Event in schedule |
| Training ended | Coach | "HIIT Group Session has ended. Tap to review and complete." | Event Completion |
| Training ended | Each athlete | "HIIT Group Session has ended. How was your training?" | Post-training sheet |
| Training completed (card) | Each athlete (card) | "Payment of €25 processed for HIIT Group Session" | Balance |

**Channels:** Push (FCM) only in V1. Email/SMS follow existing notification preferences.

## System / Background Tasks

### Without Push (silent)

**1. Recurring Event Generation**
- Trigger: Daily Celery Beat task (e.g., 03:00 UTC)
- Logic: for each active recurring template → if last generated event < 2 months from today → generate next occurrence
- Creates: training_event with template fields (duration, price, location)
- No user notification

**2. Past Event Cleanup**
- Trigger: Daily Celery Beat task
- Logic: group events where end_time < now() - 48h AND status != completed → mark as auto_completed
- Card holds not transferred → release back to athlete balance
- No user notification

**3. Calendar Sync**
- Trigger: on event create / cancel / reschedule (synchronous, not periodic)
- Created/approved group events → push to coach's external calendar (Google/Apple)
- Cancelled events → remove from external calendar
- Reuses existing sync infrastructure (webhook + 15-min fallback)
- No user notification

### With Push

**4. Min Threshold Check**
- Trigger: 24h before group event start time
- Condition: participants < template.min_participants AND min_participants is set
- Push to coach: "⚠️ HIIT Group Session tomorrow has only 2 of 5 minimum participants. Cancel or proceed?"
- Deep link: opens group event detail
- Coach decides — system does NOT auto-cancel

**5. Training Reminder (24h before)**
- Trigger: 24h before group event start time
- Push to coach: "Yoga Morning Flow tomorrow at 08:00 — 12/15 participants registered"
- Push to each athlete: "Reminder: Yoga Morning Flow tomorrow at 08:00 with John Miller at GYM Bro"

**6. All Spots Filled**
- Trigger: when participant count == max_participants (on join)
- Push to coach: "🎉 HIIT Group Session on Apr 7 is fully booked (10/10)"
- No push to athletes

**7. Post-Training (event ended)**
- Trigger: event end_time passed (or coach manually triggers)
- Push to coach: "HIIT Group Session has ended. Tap to review and complete."
- Deep link: opens Event Completion screen (payment tracking + complete button)
- Push to each athlete: "HIIT Group Session with John Miller has ended. How was your training?"
- Deep link: opens post-training confirmation bottom sheet

**8. Training Completed (coach tapped Complete)**
- Trigger: coach taps "Complete Training" on Event Completion screen
- Card participants: initiate individual Stripe transfers
- Push to athletes (card): "Payment of €25 processed for HIIT Group Session"
- Cash unpaid: stays as cash_unpaid record, visible in athlete history

## Bottom Sheet Design Rules

All bottom sheets in the app follow these spacing and interaction rules:

| Element | Spacing |
|---|---|
| Handle → title | 16px |
| Title → subtitle | 4px |
| Subtitle → content | 20px |
| Options → warning | 20px |
| Warning → button | 24px |
| Side padding | 20px |
| Bottom padding | 40px (safe area) |

**Options pattern:**
- Use radio buttons with full-width tappable labels (48px min height per row)
- Teal accent color on radio, neutral text — keeps visual hierarchy clean
- Warning block is the ONLY colored element in the sheet → draws attention to impact
- Selection rows (gradient + checkmark) reserved for list-browse contexts (calendar sync, sport selection) — NOT for quick-decision sheets
- Sheet grows vertically to accommodate content — no fixed height
- Destructive options: red text color on label (e.g., "All sessions" in cancel, "Cancel all" in delete)

**Warning blocks:**
- Caution (yellow bg): for participant impact notifications
- Danger (red bg): for destructive actions (delete, cancel)
- **Dynamic:** warning text and color update based on selected option
  - Safe option selected → yellow warning with informational text
  - Destructive option selected → red warning with impact text
- Destructive options have red text color to indicate weight before selection

**Default selection:** always the safest option (e.g., "Keep events" not "Cancel all")
- Icon + text, rounded container

## Visual Indicators

### Rescheduled Event (calendar)
- Events that were individually rescheduled from a recurring chain show a small "↻" icon in the top-right corner of the event block on the timeline
- Subtle, doesn't interfere with event content
- Only for overridden events, not for the regular recurring instances

### Special Badge (one-off events)
- Determined by `is_recurring == false` on template — no separate field needed
- Coach profile: one-off template card gets "Special" badge (brand cyan bg, small text) + subtle brand border highlight on the card
- Calendar: one-off events look the same as recurring (no special indicator on timeline)

## Error States

### Join Training Errors
- **Network failure:** Toast (top): "Connection error. Please try again." — auto-dismiss 3s
- **Training became full:** Toast (top): "Sorry, this training is now full." → button changes to disabled "Training is Full"
- **Insufficient balance (card):** On Group Detail screen, instead of "Join Training · €25" show "Top Up Balance · €25" (secondary button style). Tap → opens balance top-up flow (separate spec, referenced)

### General Errors
- **Save failed (Create/Edit Session):** Snackbar (bottom): "Failed to save. Check connection and try again."
- **Payment processing failed:** Snackbar: "Payment failed. Please try again or contact support."

## Loading States

- **Lists (participant list, session cards, calendar events):** Skeleton placeholders (gray animated blocks matching content shape)
- **Action buttons (Join, Save, Complete):** Inline spinner replaces button text during request. Button stays non-interactive.
- **Calendar sync (fetching calendars):** Spinner + "Fetching calendars..." text (already in prototype)
- **Pull-to-refresh:** On scrollable lists (My Sessions, Calendar, Schedule)
- **Never use:** Full-screen blocking loader or modal spinner

## Delete Template

The delete sheet (Keep existing / Cancel all + warning + refund count) is documented in [session-creation.md](./session-creation.md) Flow 5. Group-specific note: when "Cancel all upcoming events" is chosen, all participants across affected events are notified and refunded (card holds released, cash markers cleared); past / completed events are never affected.

## Data Model Notes

### One-off vs Recurring
- No separate `is_one_off` field — determined by `is_recurring == false`
- "Special" badge is a UI-only concept, derived from data

### Recurring Days Storage
- V1: `recurring_days` as `array[int]` (0=Mon, 6=Sun) on `training_session` table
- Sufficient for "every Tue & Thu" patterns
- If future versions need complex recurrence (bi-weekly, monthly, specific dates), consider migrating to separate `recurrence_rule` table or RFC 5545 RRULE format
- Final implementation decision deferred to backend engineer

### API Scope Parameter
- Existing `PATCH {role}/training-events/{id}/change-status/` extended with optional `scope` field:
  - `scope: "this"` (default if omitted) — affects single event
  - `scope: "following"` — this event + all future events in chain
  - `scope: "all"` — all events of this template
- Same scope parameter used for reschedule: `PUT /coach/training-events/{id}/reschedule/` with `{new_datetime, scope}`
- Backward compatible — `scope` is optional, defaults to `"this"`

### Creating Events from Templates
- No separate endpoint needed
- Same `POST /coach/training-events/` with `session_id` pointing to group template
- Backend determines group behavior from `session.is_group`
- Auto-generation uses same creation logic internally

## Migration & Compatibility

- All database changes are additive (new fields nullable, new table)
- No breaking changes to existing data
- Existing personal training sessions: `is_group = false`, `max_participants = null` by default
- Modified API endpoints: new `scope` parameter is optional, defaults maintain current behavior
- Old iOS app versions: group training UI not shown, existing flows unaffected
- No data migration required — deploy backend first, then iOS update

## Not in V1
- Waitlist when training is full
- Voice assistant tools (create/join group training by voice)
- Dedicated group training feed/discovery tab
- Cross-day drag & drop for events
- Coach-configurable cancellation policy per template

## Platform notes

**Native UI conventions:** see [architecture/design-system.md § Native theming contract](../architecture/design-system.md#native-theming-contract). Don't duplicate cross-platform UI rules here — only platform-specific deviations below.
