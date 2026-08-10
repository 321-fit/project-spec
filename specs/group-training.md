# Group Training

> Status: Approved
> Prototypes (Phase 4 redesign): coach create/manage [coach/sessions.html](https://321-fit.github.io/project-spec/prototypes/flows/coach/sessions.html) + [coach/calendar.html](https://321-fit.github.io/project-spec/prototypes/flows/coach/calendar.html) · schedule/publish [coach/invite.html](https://321-fit.github.io/project-spec/prototypes/flows/coach/invite.html) · athlete discover/join [shared/profile.html](https://321-fit.github.io/project-spec/prototypes/flows/shared/profile.html) · athlete schedule [athlete/calendar.html](https://321-fit.github.io/project-spec/prototypes/flows/athlete/calendar.html). Group event detail: [group-event-detail.md](group-event-detail.md). **End-to-end journey:** [group-training](https://321-fit.github.io/project-spec/prototypes/flows/journeys/group-training.html). Coach **invite picker** (add existing / CRM / by-link): [coach/calendar.html#s-invite](https://321-fit.github.io/project-spec/prototypes/flows/coach/calendar.html#s-invite).
> Last updated: 2026-08-10

> **Changelog 2026-07-24 — Coach invite picker + data-model reconciliation.** "Invite athletes" now opens a **client picker** (add existing in-app athletes / CRM contacts / by-link), not share-only — see [group-event-detail.md](group-event-detail.md) §4. Coach-added participants (incl. CRM) owe the fee, settled post-session (no upfront hold). Documented the shipped **add-participant** endpoint (`POST /coach/training-events/{id}/participants`, #790). Corrected the Data Model: `payment_status` has **6** values (added `waiting`, `cash_waived`), and `group_event_participant` has a nullable `athlete_profile_id` + `crm_client_id` (CRM participants, #790).

> **Changelog 2026-07-17 — Reconciled to shipped model (template carries its own schedule).** The earlier "decoupled scheduling" model (template = pure definition + a separate `invite.html?mode=schedule` step + `/coach/group-templates/{id}/schedule/preview` + `/schedule` endpoints + `keep_external_dates[]`) was **never built**. Shipped reality: a group template **carries its schedule** (days + time + recurrence, or a one-off date) on the existing `/coach/training-sessions` resource — created with the shared `s-create` form documented in [session-creation.md](./session-creation.md). Saving a scheduled group template **auto-generates events 2 months ahead** (publish-at-create); a template may also be created as a **draft** (no schedule) and published later via `PUT`/`PATCH`. External-calendar conflicts are returned as `externalCalendarConflicts[]` on the create/publish response and resolved with `POST /coach/training-sessions/{id}/confirm-conflicts` (coach keeps or skips each date). **Different weekday-times = separate templates.** Recurrence = `Weekly` (+ day chips) with `Ends: Ongoing / On date` (`recurringEndDate`). See §1, §3a, §Data Model, §API Endpoints.

> ## ⚠️ Model status — read before implementing (2026-08-10)
>
> Two models are described in this file's changelogs and both exist in the codebase. This is the authority:
>
> | | Template carries its schedule (days/time/recurrence) | Decoupled: template = definition, placement = separate step |
> |---|---|---|
> | **Where** | shipped backend `/coach/training-sessions`; iOS #317 | canon since 2026-07-01; all Phase-4 prototypes; iOS #371; Android #134 |
> | **Status** | live in prod, clients depend on it | **the target**; backend not built — [poly-backend#858](https://github.com/321-fit/poly-backend/issues/858) (open, unassigned) |
>
> **Rules until #858 lands:**
> 1. **New UI is built to the decoupled model.** A template form must carry **no** days/time/recurrence — scheduling
>    is a separate step (session chooser → time grid → publish drawer), and one template → many placements.
> 2. **Existing clients keep the shipped contract** — do not remove schedule fields from the live create payload
>    until the backend accepts the decoupled shape. Additive only, per the backward-compatibility rule.
> 3. The **2026-07-17 changelog below is a record of shipped reality, not a decision.** It reconciled this spec back
>    to the old model; it does not override the 2026-07-01 decoupling decision.
> 4. Coach-side surfaces built on the decoupled model: `sessions.html` (`#s-create`, `#s-list`, `#s-detail-*`,
>    `#s-series`, `#s-edit`) and `invite.html` (`#s-invite-select` → `#s-invite-time` → `#group-publish-sheet`).
>
> **iOS drift to fix:** #317 shipped the old create form (schedule fields inside the template) *and* #371 shipped the
> new chooser → grid → publish flow. Both are closed, so the device currently offers two ways to create a group
> session. The old path must be retired when #858 lands.

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

> **Shipped model.** The group template **carries its schedule** on the shared `s-create` form (same form as a personal template): selecting Group reveals **max/min participants** plus the **schedule section** (Recurring days + start time, or a one-off date). See [session-creation.md](./session-creation.md) for the full form.

The create / edit form is shared between personal and group templates and is documented in [session-creation.md](./session-creation.md). Fields: name, sport, location, duration, price/participant, payment method — plus (group only) max + optional min participants + schedule (days + time, or one-off date).

**Group-specific behavior layered on top of the shared form:**
- Selecting Group reveals **max participants** + optional **min participants** (threshold) + the **schedule section**
- Saving a **scheduled** group template **auto-generates events 2 months ahead** (see §3a). A template saved with no schedule is a **draft**, published later
- Lives in "My Sessions" beside personal templates

#### 2. My Training Sessions

The list screen, edit-mode behavior, and impactful-vs-non-impactful change rules are documented in [session-creation.md](./session-creation.md). On a group template card, badges and price strings differ from personal:
- Group templates: badge "Group · max 10", price shown as "€25/person"
- Personal templates: badge "Personal"

**Edit mode — `Scheduled dates` section (edit-only).** Lists every generated event of this template (`GET /coach/training-sessions/{id}/events` — recurring series + one-off "Special" events), each row → manage on calendar. To change the schedule the coach **edits the template's schedule fields** (days / time / recurrence) and picks a `scope` on save (per [session-creation.md](./session-creation.md) Flow 4) — there is no separate scheduling flow. **Empty state (draft template):** a template saved without a schedule shows a dashed "No dates scheduled yet · Add a schedule to publish events" card.

#### 3. Calendar
[Prototype screen: Calendar]

24-hour vertical timeline, 15-min grid snap.

- Group events: cyan left border + participant badge "7/10"
- Personal events: green left border + athlete name
- Day strip wheel (horizontal scroll, today centered)
- Today / Sync buttons in header
- FAB "+" → bottom sheet: **"Schedule training"** (book a personal session for an athlete) + "Block time off" (custom event).
- **Group events are not scheduled from the calendar FAB** — they are generated when the coach saves a scheduled group template (§1 / §3a). The FAB "Schedule training" path is the personal booking flow (see [booking-flow.md](./booking-flow.md)).
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

#### 3a. Scheduling group events (from the template)
[Prototype: coach/sessions.html#s-create]

Group events are generated **from the template's own schedule** — there is no separate template→calendar step. Two paths:

1. **Publish-at-create** — the coach fills the schedule section on `s-create` (Recurring days + start time, or a one-off date) and saves. `POST /coach/training-sessions` with `isGroup: true` + a complete schedule generates events for the next **2 months** synchronously.
2. **Draft → publish** — the coach saves the template with **no** schedule (draft), then later adds the schedule and publishes via `PUT`/`PATCH /coach/training-sessions/{id}` (first publish generates the events; `scope` is **not** required on that first publish).

**Recurrence** (schedule section): `Weekly` with **day chips** (M–S, multi-select, one start time) or a **one-off** date. `Ends: Ongoing` (open-ended, keeps rolling) or `On date` (`recurringEndDate`). Different weekday-times = **separate templates** (matches Google/Apple; one template = one weekly time).

**Conflict handling on generate** (see §"Overlap & Conflicts"):
- **Coach's own 321Fit event** overlap → **hard-skipped silently** (STRICT; can't double-book yourself). Not surfaced.
- **External Google/Apple** overlap → **soft-skipped** and returned in `externalCalendarConflicts[]` on the response. The coach reviews and calls `POST /coach/training-sessions/{id}/confirm-conflicts` with `keptDates[]` / `skippedDates[]` to materialise the dates to keep.

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

> **Shipped model.** The **template** (`training_session`) carries the schedule: `is_recurring`, `recurring_days`, `recurring_time`, `recurring_until` (from `recurringEndDate`), plus a transient `oneOffDate` (used to place a single event, not persisted on the template). Generated events are rows in `training_event`; individual occurrences can be overridden/cancelled without breaking the series.

**training_session (modified)** — group definition **+ schedule**
| Field | Type | Description |
|---|---|---|
| is_group | boolean | false = personal, true = group |
| max_participants | int, nullable | max athletes (group only) |
| min_participants | int, nullable | min threshold (group only, optional) |
| is_recurring | boolean | group only; true = Weekly series, false = one-off |
| recurring_days | int[], nullable | 0=Mon … 6=Sun; required when publishing a recurring group template |
| recurring_time | text, nullable | "HH:MM" start time; required when publishing a group template |
| recurring_until | date, nullable | `recurringEndDate` — caps the series; null = ongoing |

**training_event (modified)** — a generated occurrence
| Field | Type | Description |
|---|---|---|
| is_group_event | boolean | derived from session.is_group at generation time |
| override_datetime | datetime, nullable | for an individually-rescheduled occurrence in a recurring series |
| cancelled_from_recurring | boolean | true if this occurrence was cancelled but the series continues |

**group_event_participant (new)**
| Field | Type | Description |
|---|---|---|
| id | int | primary key |
| training_event_id | FK | → training_event |
| athlete_profile_id | FK, **nullable** | → athlete_profile (null for a CRM-only participant) |
| crm_client_id | FK, nullable | → crm_client (set when the coach added a CRM contact, #790). Exactly one of `athlete_profile_id` / `crm_client_id` is set |
| registered_at | datetime | when athlete joined / was added |
| payment_status | enum | `waiting` / `held` / `transferred` / `cash_unpaid` / `cash_paid` / `cash_waived` |
| cancelled_at | datetime, nullable | when the registration was cancelled (soft-cancel; rows retained for history) |

> **payment_status** shipped with 6 values (the earlier 4-value list was outdated): `waiting` (hold released / awaiting), `held` (card hold on join), `transferred` (card moved to coach post-completion), `cash_unpaid`, `cash_paid`, `cash_waived` (coach forgave the cash debt). Active registrations are those with `cancelled_at IS NULL` (partial-unique index on `(training_event_id, athlete_profile_id)` where active).

### Key Queries
- Get available group events for template: `WHERE session_id = X AND datetime_start > now() AND cancelled = false`
- Count participants: `COUNT(*) FROM group_event_participant WHERE event_id = X AND cancelled_at IS NULL`
- Check spots: `count < session.max_participants`

## API Endpoints

> **Shipped model.** Group templates are **not** a separate resource — the existing `/coach/training-sessions` resource is extended with group + schedule fields (per [session-creation.md](./session-creation.md) §6). Creating/publishing a scheduled group template generates events synchronously; external-calendar conflicts are resolved with `confirm-conflicts`. There is **no** `/group-templates/…/schedule/preview` or `/schedule` resource. Full endpoint reference: [`poly-backend/docs/group-training-api.md`](../../poly-backend/docs/group-training-api.md).

| Method | Path | Description |
|---|---|---|
| GET | `/coach/training-sessions/` | List coach's templates (personal + group) |
| POST | `/coach/training-sessions/` | Create template; a scheduled group template auto-generates 2 months of events (draft with no schedule allowed) |
| PUT / PATCH | `/coach/training-sessions/{id}/` | Edit / publish template; first publish of a draft generates events; `scope` for impactful edits |
| POST | `/coach/training-sessions/{id}/confirm-conflicts/` | Resolve external-calendar conflicts (`keptDates[]` / `skippedDates[]`) → materialise kept occurrences |
| GET | `/coach/training-sessions/{id}/events/` | List events (occurrences) generated from a template |
| GET | `/athlete/coaches/{id}/group-trainings/` | Group templates on a coach profile, each with its soonest `nextEvent` + spot count |
| GET | `/athlete/group-events/{id}/` | Group event detail with participants |
| GET | `/athlete/group-events/{id}/can-afford/` | Does the athlete's balance cover the fee? |
| POST | `/athlete/group-events/{id}/join/` | Join group training (`paymentType`) |
| DELETE | `/athlete/group-events/{id}/leave/` | Leave group training |
| GET | `/coach/training-events/{id}/` | Coach group event detail (+ participants, note, share link) — see [group-event-detail.md](group-event-detail.md) |
| POST | `/coach/training-events/{id}/participants/` | **Add** an existing in-app athlete **or CRM contact** to the roster (`{relationshipId}`), auto-accepted — see [group-event-detail.md](group-event-detail.md) (shipped #790, was undocumented) |
| PATCH | `/coach/training-events/{id}/participants/{athleteId}/` | Settle a cash participant — `{action: mark_paid \| waive}` |
| DELETE | `/coach/training-events/{id}/participants/{athleteId}/` | Remove a participant (refund + push) |
| POST | `/coach/training-events/{id}/cancel/` | Cancel occurrence(s) (`recurringScope`: this / following / all) |
| PUT | `/coach/training-events/{id}/reschedule/` | Reschedule occurrence(s) (`recurringScope`) |
| POST | `/coach/training-events/{id}/complete/` | Complete event + trigger card transfers |
| POST | `/coach/training-events/{id}/share-link/` | Mint / return the event's permanent share link |

> `participants[].id` (coach detail) and the participant path param are the athlete **profile id** (integer) — see [group-event-detail.md](group-event-detail.md).

### Modified Endpoints

| Method | Path | Change |
|---|---|---|
| GET | `{role}/training-events/` | Include group events with participant count |
| GET | `coach/training-events/allowed-hours/` | Account for group event slot blocking |

## Business Rules

### Registration
- Open registration — no approval
- First come first served
- Cannot join if: full, time conflict with own events, insufficient balance (card)
- Card payment: hold on registration, transfer after completion
- Cash: just registration, coach marks payment manually

### Coach-added participants (invite picker)
- The coach can **add** existing in-app athletes and **CRM contacts** to a group event from the invite picker (`#s-invite`) — added **auto-accepted** (no athlete consent, no pending). External people are invited **by link** (share sheet), not added directly. Full spec: [group-event-detail.md](group-event-detail.md) §4.
- **No upfront hold** for coach-added participants (card- or cash-type session) — the fee is **owed** and settled after the session in the Event completion checkbox flow, like cash rows.
- ⚠️ **Backend follow-up:** coach-adds currently land at `waiting` and CRM-only rows can't be settled (settlement keys off `athlete_profile_id`) — must settle coach-added incl. CRM as **owed / `cash_unpaid`**, keyed by participant/relationship id. Tracked in a poly-backend issue.

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

**Recurring-publish conflict review.** A `Weekly` schedule projects the same time onto future weeks; some occurrences may overlap existing events. On generate (create or first publish), the server evaluates occurrences **inside the 60-day generation window** and:
- **Coach's own 321Fit event** (personal/group) → **hard auto-skip** that occurrence, **silently** (canon STRICT — cannot double-book yourself). Not surfaced to the coach.
- **External Google/Apple** busy → **soft**: the free occurrences materialise immediately; conflicting ones are returned in `externalCalendarConflicts[]` for a **review step**. The coach keeps or skips each date and calls `POST /coach/training-sessions/{id}/confirm-conflicts` (`keptDates[]` / `skippedDates[]`).
- **No per-occurrence time-shift** — athletes keep a stable weekly time. To use a skipped date, the coach manually frees their slot and adds an occurrence.
- **Rolling generation** (day 61+ as the window advances): the daily job re-checks new occurrences, skips conflicts, and sends a low-priority push to the coach ("Recurring HIIT skipped Aug 20 — calendar conflict").

### Recurring Events
- Auto-generate **60 days (2 months) ahead**, rolling window (daily check)
- Weekly only (multi-day, single time — matches Google/Apple). Monthly / every-N-weeks / after-N-occurrences are **not** in V1
- `Ends: Ongoing` (open-ended, keeps rolling) or `On date` (`recurring_until` / `recurringEndDate`)
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
- Determined by the **template**: `training_session.is_recurring = false` (one-off `Just this date`) → "Special". Recurring templates have `is_recurring = true`.
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

### One-off vs Recurring (per template)
- Determined by the **template**: `training_session.is_recurring = false` = one-off (`Just this date`), `true` = recurring (`Weekly`)
- "Special" badge is a UI-only concept derived from `is_recurring = false`
- One template = one weekly time; **different weekday-times = separate templates**

### Recurring Storage
- Recurrence lives on the **template** (`training_session`): `recurring_days` (day-of-week set), `recurring_time` (single start time), `recurring_until` (`Ends: On date` = `recurringEndDate`; null = ongoing)
- V1 = **Weekly only** (multi-day, single time). Monthly / bi-weekly / after-N-occurrences NOT in V1 — if ever needed, migrate to RFC 5545 RRULE
- Different time per weekday = **separate templates** (matches Google/Apple)

### API Scope Parameter
- **Template edit** — `PUT`/`PATCH /coach/training-sessions/{id}/` takes a top-level `scope` (`following` / `all`) for impactful changes; omitted = template only (see [session-creation.md](./session-creation.md) §6)
- **Per-occurrence cancel / reschedule** — dedicated endpoints take `recurringScope`:
  - `POST /coach/training-events/{id}/cancel/` with `{recurringScope}`
  - `PUT /coach/training-events/{id}/reschedule/` with `{datetimeStart, recurringScope}`
  - `recurringScope: "this"` (single) / `"following"` (this + future) / `"all"` (whole series)
- Backward compatible — scope fields are optional

### Creating Events from Templates (scheduling)
- Saving a **scheduled** group template generates events synchronously: `POST /coach/training-sessions` (publish-at-create) or the first `PUT`/`PATCH` publish of a draft
- Recurring → generate events **2 months (60 days)** ahead, rolling daily; one-off → single event
- **Conflict-skip:** own coach events = hard-skip that occurrence (STRICT, silent); external Google/Apple = returned in `externalCalendarConflicts[]`, coach resolves via `POST /coach/training-sessions/{id}/confirm-conflicts`; rolling job re-checks + low-pri push. See § Overlap & Conflicts

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
