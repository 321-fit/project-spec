# Group Training

> Status: Approved
> Prototypes (Phase 4 redesign): coach create/manage [coach/sessions.html](https://321-fit.github.io/project-spec/prototypes/flows/coach/sessions.html) + [coach/calendar.html](https://321-fit.github.io/project-spec/prototypes/flows/coach/calendar.html) · schedule/publish [coach/invite.html](https://321-fit.github.io/project-spec/prototypes/flows/coach/invite.html) · athlete discover/join [shared/profile.html](https://321-fit.github.io/project-spec/prototypes/flows/shared/profile.html) · athlete schedule [athlete/calendar.html](https://321-fit.github.io/project-spec/prototypes/flows/athlete/calendar.html). Group event detail: [group-event-detail.md](group-event-detail.md).
> Last updated: 2026-07-01

> **Changelog 2026-07-01 — Template/schedule DECOUPLE.** A group template is now a *pure definition* (no days/time/recurrence), created exactly like a personal one. Scheduling is a **separate step** (calendar FAB → `invite.html?mode=schedule` → template chooser → drag-drop grid → **publish drawer**). One template → many placements. Recurrence trimmed to `Just this date` / `Weekly` (+ day chips) with `Ends: Ongoing / On date`. "On date" expands the drawer to the large detent + inline calendar. Weekly publish runs a **conflict review** over the 60-day generation window (own events hard-skipped, external "keep anyway"). See §1, §3, §3a, §"Overlap & Conflicts".

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

#### 1. Create Group Session (template = pure definition, NO schedule)

> **DECOUPLED 2026-07-01.** The template no longer carries any schedule. It is a reusable definition, created with the **same** `s-create` form as a personal template — the group toggle only adds **max/min participants**. NO days, time, recurrence, or date pickers on the template form.

The create / edit form is shared between personal and group templates and is documented in [session-creation.md](./session-creation.md). Fields: name, sport, location, duration, price/participant, payment method — plus (group only) max + optional min participants.

**Group-specific behavior layered on top of the shared form:**
- Selecting Group reveals **max participants** + optional **min participants** (threshold) — nothing else
- Saving creates only the template. It generates **no events** — scheduling happens later (see §3a)
- Lives in "My Sessions" beside personal templates

#### 2. My Training Sessions

The list screen, edit-mode behavior, and impactful-vs-non-impactful change rules are documented in [session-creation.md](./session-creation.md). On a group template card, badges and price strings differ from personal:
- Group templates: badge "Group · max 10", price shown as "€25/person"
- Personal templates: badge "Personal"

**Edit mode — `Scheduled dates` section (edit-only).** Lists every live placement of this template (recurring series + one-off "Special" events), each row → manage on calendar. A **"Schedule new dates"** CTA hands off to the scheduling flow (`invite.html?mode=schedule&origin=s-edit`). **Empty state:** a freshly created template with no placements shows a dashed "No dates scheduled yet · Add this template to your calendar below" card above the CTA.

#### 3. Calendar
[Prototype screen: Calendar]

24-hour vertical timeline, 15-min grid snap.

- Group events: cyan left border + participant badge "7/10"
- Personal events: green left border + athlete name
- Day strip wheel (horizontal scroll, today centered)
- Today / Sync buttons in header
- FAB "+" → bottom sheet: **"Schedule training"** (personal or group session) + "Block time off" (custom event). *(Was "Create Personal/Group/Custom Event" — replaced 2026-07-01: scheduling now goes through the template chooser, §3a.)*
- "Schedule training" → `invite.html?mode=schedule` → template chooser → drag-drop grid → publish/invite (see §3a)
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

#### 3a. Scheduling a session (template → calendar) — NEW 2026-07-01
[Prototype: coach/invite.html]

Decoupled scheduling. Reached from the calendar FAB "Schedule training" **or** a template's "Schedule new dates" CTA in edit mode. One shared flow for personal + group, branched by template type.

**Flow:**
1. **Template chooser** (`s-invite-select`) — ONE list of all templates (personal + group). Tap selects + pushes to the grid. Empty (no templates) → jumps to `sessions.html#s-create`; loading = 2 skeleton cards.
2. **Drag-drop time-grid** (`s-invite-time`) — reuses the athlete booking grid (`.fit-bk-*`, 96px = 1h). Tap a free band or drag the block (15-min snap); it snaps off any busy range to the nearest free slot (coach's own conflict = STRICT, can't place). Group branch hides the athlete-availability row (open event, no invitee). One template → **many placements** (Tue 12:00 + Fri 17:00 = two drops).
3. **Confirm step** branches by type:
   - **Personal** → invite (link) / schedule (in-app) confirm sheet.
   - **Group** → **publish drawer** (`group-publish-sheet`), CTA **Publish** (open event, no invite).

**Group publish drawer:**
- **Session summary** (name, time from the drop, location, max, price/person).
- **Repeat:** `Just this date` / `Weekly`. Weekly reveals **day chips** (M–S, dropped weekday pre-selected, same time) — Publish is **disabled** until ≥1 day is selected.
- **Ends:** `Ongoing` / `On date`. Picking **On date** expands the sheet to the **large detent** (`.presentationDetents([.medium,.large])`) and scrolls to an **inline month calendar** (native graphical `DatePicker` on device — no stacked picker sheet; maps to `training_event.recurrence_pattern_end_date`).
- **Recurrence-aware copy** summarizing what will publish ("Publishes a weekly open session · Tue & Thu · 09:00 until Jul 23").
- On **Publish** of a Weekly placement → **conflict review** (§"Overlap & Conflicts"). One-off publishes directly → snackbar → land on Calendar.

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

> **DECOUPLED 2026-07-01.** The template holds **no schedule** — drop `recurring_days` / `recurring_time` / `is_recurring` from `training_session`. Recurrence lives on the **event/placement** via the existing `training_event.recurrence_pattern` / `recurrence_pattern_end_date` / `recurrence_description` columns.

**training_session (modified)** — group definition only
| Field | Type | Description |
|---|---|---|
| is_group | boolean | false = personal, true = group |
| max_participants | int, nullable | max athletes (group only) |
| min_participants | int, nullable | min threshold (group only, optional) |

**training_event (modified)** — carries the schedule/recurrence
| Field | Type | Description |
|---|---|---|
| is_group_event | boolean | derived from session.is_group at placement time |
| recurrence_pattern | text, nullable | **existing col** — `weekly` + day-of-week set; null = one-off |
| recurrence_pattern_end_date | date, nullable | **existing col** — `Ends: On date`; null = ongoing |
| recurrence_description | string, nullable | **existing col** — human-readable ("Tue & Thu · 09:00") |
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

> **DECOUPLED 2026-07-01.** Template create no longer generates events. Scheduling is a **separate** call (preview → commit) so the coach can review overlap conflicts before publishing. Recurrence lives on the **event/placement** (`training_event.recurrence_pattern` / `recurrence_pattern_end_date` / `recurrence_description` — already in schema), **not** on the template.

| Method | Path | Description |
|---|---|---|
| GET | `/coach/group-templates/` | List coach's group training templates |
| POST | `/coach/group-templates/` | Create group template **only** (no events; max/min participants) |
| POST | `/coach/group-templates/{id}/schedule/preview/` | **NEW** — dry-run: given start datetime + recurrence (`once`/`weekly` + days + ends `ongoing`/`on_date`), return occurrences in the 60-day window + conflicts split `own` (hard-skip) / `external` (soft) |
| POST | `/coach/group-templates/{id}/schedule/` | **NEW** — commit a placement: same payload + `keep_external_dates[]` → generate events skipping own conflicts + non-kept external → returns created + skipped |
| GET | `/coach/group-templates/{id}/events/` | List events (placements) for a template |
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

**Recurring-publish conflict review (NEW 2026-07-01).** A `Weekly` placement projects the same time onto future weeks; some occurrences may overlap existing events. On Publish, the server (or client pre-check) evaluates occurrences **inside the 60-day generation window** and, if any collide, returns them for a **review step** (page 2 of the publish drawer — no stacked sheet):
- **Coach's own 321Fit event** (personal/group) → **hard auto-skip** that occurrence. Cannot double-book yourself (canon STRICT). Shown with a "Skipped" tag, no toggle.
- **External Google/Apple** busy → **soft**: default skip, per-date **"Keep anyway"** toggle (canon: external "resolves manually"). Toggling recomputes the "Publish N sessions" count.
- **No per-occurrence time-shift** — athletes keep a stable weekly time. To use a skipped date, the coach manually frees their slot and adds an occurrence.
- **Rolling generation** (day 61+ as the window advances): the daily job re-checks new occurrences, skips conflicts, and sends a low-priority push to the coach ("Recurring HIIT skipped Aug 20 — calendar conflict").

### Recurring Events
- Auto-generate **60 days (2 months) ahead**, rolling window (daily check)
- Weekly only (multi-day, single time — matches Google/Apple). Monthly / every-N-weeks / after-N-occurrences are **not** in V1
- `Ends: Ongoing` (open-ended, keeps rolling) or `On date` (`recurrence_pattern_end_date`)
- Each generated occurrence is checked for overlap and **skipped** on conflict (see review above)
- Individual event can be cancelled/rescheduled without affecting chain
- Reschedule options: this only / this and following / all
- One-off events (`Just this date`): single event, "Special" badge on profile

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
- Determined per **placement**: `training_event.recurrence_pattern IS NULL` (one-off `Just this date`) → "Special". Recurring placements have a non-null pattern. *(No template-level recurrence flag post-decouple.)*
- Coach profile: one-off template card gets "Special" badge (brand cyan bg, small text) + subtle brand border highlight on the card
- Calendar: one-off events look the same as recurring (no special indicator on timeline)

## Error States

### Join Training Errors
- **Network failure:** Toast (top): "Connection error. Please try again." — auto-dismiss 3s
- **Training became full:** Toast (top): "Sorry, this training is now full." → button changes to disabled "Training is Full"
- **Insufficient balance (card):** On Group Detail screen, instead of "Join Training · €25" show "Top Up Balance · €25" (secondary button style). Tap → opens balance top-up flow (separate spec, referenced)
- **Time conflict (athlete already booked at this slot):** On Group Detail screen, show a blocking inline-error banner above the ticket ("You already have *<event> · <time>* at this time. Cancel it first, or pick another session date.") and disable the Join CTA → "Time conflict". Availability check is the same as personal booking. Prototype: `shared/profile.html#s-group` (`.gj-conflict` state).

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

### One-off vs Recurring (per placement, post-decouple)
- Determined per **placement/event**, not the template: `training_event.recurrence_pattern IS NULL` = one-off (`Just this date`), non-null = recurring (`Weekly`)
- "Special" badge is a UI-only concept derived from this
- One template → many placements (each its own pattern)

### Recurring Storage
- Recurrence lives on the **event/placement** via existing `training_event` cols: `recurrence_pattern` (weekly + day-of-week set), `recurrence_pattern_end_date` (`Ends: On date`; null = ongoing), `recurrence_description` (human-readable)
- V1 = **Weekly only** (multi-day, single time). Monthly / bi-weekly / after-N-occurrences NOT in V1 — if ever needed, migrate to RFC 5545 RRULE
- Different time per weekday = **separate placements** (matches Google/Apple)

### API Scope Parameter
- Existing `PATCH {role}/training-events/{id}/change-status/` extended with optional `scope` field:
  - `scope: "this"` (default if omitted) — affects single event
  - `scope: "following"` — this event + all future events in chain
  - `scope: "all"` — all events of this template
- Same scope parameter used for reschedule: `PUT /coach/training-events/{id}/reschedule/` with `{new_datetime, scope}`
- Backward compatible — `scope` is optional, defaults to `"this"`

### Creating Events from Templates (scheduling — post-decouple)
- Template create generates **no** events. A **placement** is scheduled separately: `POST /coach/group-templates/{id}/schedule/preview/` (dry-run → occurrences + conflicts) then `POST /coach/group-templates/{id}/schedule/` (commit with `keep_external_dates[]`)
- Weekly placement → generate events **60 days** ahead, rolling daily; one-off → single event
- **Conflict-skip:** own coach events = hard-skip that occurrence (STRICT); external Google/Apple = skip unless the coach chose "Keep anyway"; rolling job re-checks + low-pri push. See § Overlap & Conflicts

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
