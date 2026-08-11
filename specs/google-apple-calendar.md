# Calendar Integration (Google & Apple)

> Status: Implemented (iOS + backend) · Default destination + Refresh trigger added to prototype 2026-05-21
> Prototype: [flows/coach/calendar-sync.html](https://321-fit.github.io/project-spec/prototypes/flows/coach/calendar-sync.html)
> Last updated: 2026-05-21

## Overview
Users can connect external calendars (Google Calendar, Apple Calendar) to sync events bidirectionally. External events block booking slots, and app events are pushed to external calendars.

## Current State
- **Google Calendar** — fully implemented (iOS, backend, voice)
- **Apple Calendar** — implemented on backend, iOS integration in progress

## Components

### Backend
- Google Calendar service: `infra/services/google_calendar.py`
- Apple Calendar service: `infra/services/apple_calendar.py` (CalDAV protocol)
- Google OAuth service: `infra/services/google_oauth.py`
- Celery sync tasks: `app/tasks/training_events.py`, `app/tasks/apple_calendar.py`
- DB tables: `google_calendar`, `google_calendar_event`, `apple_calendar`, `apple_calendar_event`
- Endpoints: `entry/rest/v1/endpoints/calendars/`

### iOS
- Calendar sync settings: `ProfileTab/Settings/Options/CalendarSync/`
- Schedule display: `TabBar/Tabs/ScheduleTab/` — external events shown inline with distinct style

### Voice Assistant
- Agent context includes calendar events when fetching user schedule
- Events from external calendars affect available booking slots

### Android (Planned)
- Same calendar sync settings UI
- Google Calendar integration (Google Play Services)
- Apple Calendar: N/A for Android (Google Calendar only)

## Flows

### 1. Connecting Google Calendar

**User Flow:**
1. User navigates to Settings → Calendar Sync
2. Taps "Connect Google Calendar"
3. Google OAuth consent screen opens
4. User grants calendar access
5. App receives OAuth code → sends to backend
6. Backend exchanges code for access + refresh tokens
7. Backend creates a new calendar "321 Fit" in user's Google Calendar ("My calendars" section)
8. Sync starts: pull Google events → push app events

**Backend Flow:**
```
POST /google-calendars (OAuth code)
  → Exchange for tokens
  → Store in google_calendar table
  → Create "321 Fit" calendar in Google
  → Trigger initial sync (Celery task)
```

### 2. Connecting Apple Calendar

**User Flow:**
1. User navigates to Settings → Calendar Sync
2. Taps "Connect Apple Calendar"
3. User enters Apple Calendar credentials (CalDAV)
4. Backend validates and stores credentials (encrypted)
5. Sync starts

**Backend Flow:**
```
POST /apple-calendars (credentials)
  → Validate via CalDAV
  → Store encrypted in apple_calendar table
  → Trigger initial sync (Celery task)
```

### 3. Pulling External Events → App

**Behavior:**
- External events are imported as anonymized events (e.g., "Google Calendar Event" / "Apple Calendar Event")
- No event details are shown (privacy) — only the time slot is blocked
- Status: `google event` / `apple event`
- User cannot interact with or change status of imported events
- Imported events block booking slots for availability calculation

**Sync Methods:**
- **Webhook** (Google): instant updates when Google Calendar changes
- **Periodic sync**: every 15 minutes as fallback
- **On-demand**: when user opens schedule

### 4. Pushing App Events → External Calendar

**Behavior:**
- Only `approved` events are pushed to external calendars
- Events are created in the "321 Fit" calendar inside the **default destination account** (see § Default destination below)
- Event title contains training type and participant info
- When app event status changes (canceled, rescheduled) → external event is updated/deleted

### 4a. Default destination (rewritten 2026-06-01)

The coach picks **one calendar** from any of their connected Google accounts as the destination for newly-created 321Fit events. This is a **per-calendar** choice, not per-account — coach can write into "Personal" of one account, or "Coaching" of another, or any of their existing Google calendars.

**No more auto-created "321 Fit" calendar.** Replaces the 2026-05-21 model entirely. Events go straight into one of the coach's existing calendars (default = first calendar returned by Google for the first connected account).

#### UX (prototype `flows/coach/calendar-sync.html`)

`s-calsync` root screen now has **two distinct sections:**

1. **§ Calendars to check for conflicts** — list of connected Google accounts (READ sources for busy-time check). Inline right-aligned `+ Connect account` button. Tap an account row → push to `s-cal-detail` for that account.
2. **§ Calendar to add events to** — single row showing the currently-selected write target calendar (icon + calendar name + account email + `>` chevron). Tap → push to **`s-write-target-picker` screen** (NOT a bottom sheet — see below).

`s-write-target-picker` (new push screen):
- Lists **all calendars across all connected Google accounts**, grouped by account email (12px uppercase tertiary subheader per group).
- Each row uses canonical `.cal-select-row` styling — color dot (Google calendar color) + name + check icon when selected.
- **Single-select with deselect** — at most one calendar selected. Tapping the already-selected calendar **deselects** it (no write target → app events are not pushed to any Google Calendar). No Save / Cancel.
- **Instant-set + back** pattern — tap any row → check animates to the new row (or clears) → toast "Default destination updated" → back gesture returns to `s-calsync` with refreshed selector. Matches iOS native Settings → Sound → Ringtone interaction.
- **Empty state on root screen:** when no write target is selected, the selector row shows "Not selected" in tertiary text color (same layout — Google icon + "Not selected" + chevron). Tappable → opens picker.

**First-time hint** (under the root selector): inline info pill "Auto-selected on first connect. Tap to choose a different calendar." Shown only on initial post-connect state, dismisses on first tap of selector. Persisted server-side as `coach_settings.write_target_hint_dismissed` boolean.

**Why push screen (not bottom sheet):** 2+ Google accounts × 5–10 calendars each = 10–20+ rows with sub-descriptions (account email). Per `feedback_picker_sheet_vs_push` — bottom sheets are for ≤4 simple options; lists with sub-descriptions or 5+ items go to push screens. Also reuses the `.cal-select-row` pattern from `s-cal-detail` for consistency.

#### Backend rules

- New field on `coach_settings`: `default_writing_calendar_id` — opaque reference like `{ provider: "google", account_id: <uuid>, calendar_id: <Google calendarId string> }`. Replaces the deprecated `default_writing_account_id`.
- **On first Google connect:** backend fetches `calendarList.list` → picks the **first calendar in response** (Google returns the primary email-bound calendar first by default) → stores as `default_writing_calendar_id`.
- **On subsequent connects:** don't change the existing default. New calendars appear in the picker but selection stays where the coach left it.
- **On deselect (clear write target):** user taps the already-selected calendar in picker → `PATCH` with `calendar_id: null` → backend sets `target_calendar_id = null`. New 321Fit events are NOT pushed to any Google Calendar until user selects one again.
- **On disconnect of the account holding the default:** auto-fallback to the first calendar of the first remaining connected account. Show toast "Default destination moved to {calendar} ({email})".
- **No "321 Fit" calendar created anywhere** — neither auto on connect nor lazy on default change. We write into what the coach already has.
- Endpoint: `PATCH /v1.0.0/coach/calendar-sync/default-writing-calendar { account_id, calendar_id }` — additive, idempotent. Validates that account_id is owned by requester + calendar_id exists in that account's most-recent `calendarList.list`.

#### Edge cases

- **Coach unchecks the calendar that is currently the write target** (on `s-cal-detail` "Select calendars to sync" toggles): inline blue alert shown — "{Calendar} is your default destination. Disabling it will move new 321Fit events to your next active calendar on save." On Save, backend moves default to the next active calendar in the same account, or the first calendar of another account if this was the last active one in this account.
- **Coach deselects ALL calendars in an account** (read sources): inline yellow warning — "No events will be checked from this account. Sessions may be double-booked." Coach can still save; write target unaffected unless it was one of the now-disabled calendars (in which case the previous edge case also applies).
- **Open Q:** if coach has multiple accounts logged in under the same email (technically possible with personal + workspace sign-in mixing), how does picker dedupe? **Defer:** not commonly hit, decide if it ever happens in support tickets.

#### Apple Calendar — hidden v1 (note added 2026-06-01)

Apple Calendar UI is **scoped out for v1**:
- `s-calsync` zero state Apple row commented out
- Apple section in connected state removed
- `s-apple-connect` + `s-apple-detail` screens stay in prototype file (sidebar marked "hidden v1") and backend CalDAV infrastructure remains in code, all dormant
- Re-enable path: uncomment zero-state row + add Apple calendars to the picker grouped under email subheader + restore connector in connected state. No backend work needed (infra was already there from 2026-05-19 work).

Same dormancy pattern as WhatsApp scoping in `notifications-catalog.md § 4`.

### 4b. Calendar list refresh (added 2026-05-21)

**Why:** if the coach creates a new calendar in Google **after** connecting, we don't pull it into our calendars list automatically — the list is fetched only at connect time. Need explicit re-fetch.

**Triggers:**
- **Manual** — refresh icon-btn (canonical `.fit-icon-btn` with `arrow-clockwise` glyph) in the header on both `s-calsync` (refetches all connected accounts) and `s-cal-detail` (refetches just this account). Snackbar result: "Calendars updated · N new" / "Already up to date" / inline error if Google API failed.
- **Automatic** — silent fetch on screen open. No visible spinner unless network delay >500ms (then mini inline indicator). Cheap, frontend-driven.

**Backend:** reuses existing Google Calendar API `calendarList.list` call — no new endpoint needed for the manual path. For automatic background sync (Google webhooks via Calendar API push notifications) — proper realtime option but deferred; pull-on-demand is enough for v1.

### 4c. Per-event hide (added 2026-05-21)

**Why:** disabling a whole external calendar (`isActive=false` per `GoogleCalendarAccountDetailInfoObject`) is too blunt when the coach only wants to mute a *specific* noisy recurring event — e.g. one "Birthdays" calendar contains both relevant birthdays and 30+ "Family birthdays of distant relatives". Per-calendar mute kills both. Per-event mute is surgical.

**Backend model** — new table `hidden_external_event`:
```
id, user_id, calendar_account_id, external_event_id (string — Google/Apple stable ID),
scope ('occurrence' | 'series'), hidden_at
```
- Stored **per user** (not per role). One sync, one mute list. Cross-role users get one shared list.
- `external_event_id` is the stable Google/Apple event ID. For recurring series, Google exposes both `id` (instance) and `recurringEventId` (parent). v1 stores per-instance.
- Hidden events are **filtered server-side** out of the day endpoint payload before sending to client — clients never see the hidden event. This keeps client logic clean and respects role boundary (athletes never see coach's hidden list).

**Endpoints** — ⚠️ **none of the three exist (verified against the backend 2026-08-11).** There is no
`/coach/calendar` router at all, so per-event hide, unhide and the hidden list are **entirely
unbuilt** — as is everything downstream of them: the *"Ignore external events"* bulk action and the
overlap drawer's secondary path ([coach-calendar.md § 4c](./coach-calendar.md)). Keep as target design;
do not schedule client work against it until the backend lands. Reference:
[poly-backend/docs/calendar-sync-api.md](../../poly-backend/docs/calendar-sync-api.md).

- `POST /v1.0.0/coach/calendar/external-events/{external_event_id}/hide` — body `{ scope: "occurrence" }` (v1 only supports occurrence). Returns 204.
- `DELETE /v1.0.0/coach/calendar/external-events/{external_event_id}/hide` — unhide. Returns 204.
- `GET /v1.0.0/coach/calendar/external-events/hidden` — list, paginated. ⚠️ **2026-06-03: the "Hidden events" management section was removed from the Account-detail screen (over-complex). This endpoint currently has no UI consumer.** Unhide is now only via the transient **Undo snackbar** right after hiding; there is no permanent "recover hidden event" surface. **Open decision:** drop per-event hide entirely, or relocate the recovery list elsewhere (see open question). Auto-cleanup unchanged: backend drops stale entries when the underlying event is deleted at source.

**Entry points (UI):**
1. **External event drawer** (tap external tile on schedule) → footer button "Hide from schedule" (destructive-tinted, with eye-off icon). Closes drawer + shows snackbar "Hidden '{title}' · Undo" (5s). This is the **surgical** path for muting a specific event.
2. ~~**Overlap drawer** secondary action **"Ignore external events"** (bulk hide).~~ **Retired 2026-08-11** — the overlap sheet is now a disambiguation list with no actions of its own ([coach-calendar.md § 4c](./coach-calendar.md)). With it goes the only shipped consumer of per-event hide; if hiding an external event is wanted, it comes back through `cal-external-sheet`, one event at a time.
3. **Hidden events list** (Settings → Calendar Sync → Account detail → footer section "Hidden events (N)") → per-row Unhide button. Empty state when count = 0 ("No events hidden from this account").

~~A bulk hide-batch endpoint for "Ignore external events".~~ Moot — the bulk action was retired 2026-08-11 (see above).

**Behavior:**
- Hide is **non-destructive** — event still exists in Google/Apple, only invisible in 321Fit.
- **Toast Undo within 5 sec** — instant recovery without navigating to Settings.
- **No confirmation sheet** — friction is unnecessary; Undo path is enough (matches Calendar app patterns).
- **No effect on booking** — backend `_has_time_conflict` already doesn't gate on external events, so hiding has no impact on whether sessions can be booked at that time.
- **Per-occurrence in v1, series scope deferred to Phase 2** — when backend exposes `recurringEventId` in event payload, drawer can offer radio "This event only" / "All future events" (Apple Calendar pattern). v1 always hides single occurrence; coach who wants series-mute disables the whole calendar via existing `isActive` toggle as workaround.

**User Stories:**
- As a coach with a noisy Google calendar (Birthdays / public meetings / recurring standups), I want to hide individual external events from my 321Fit schedule without disabling the whole calendar, so I can keep relevant events visible while removing the noise.
- As a coach who accidentally hid an event, I want a 5-second Undo on the snackbar, so I can recover without diving into Settings.
- As a coach who hid events long ago, I want to see them and unhide them from Settings → Calendar Sync → Account detail, so I can restore visibility later.

**System Stories:**
- As the backend, when the day endpoint is called, I filter out events whose `external_event_id` appears in `hidden_external_event` for the requesting user, so clients never see hidden events.
- As the backend, when a hide is requested for an event that's already hidden, I return 204 idempotently, so retries from flaky clients don't error.
- As the backend, after each Google/Apple sync pass, I drop `hidden_external_event` rows whose `external_event_id` is no longer in the source — auto-cleanup of stale entries, so the Hidden events list doesn't accumulate ghosts over time.

### 4d. Recurring events as RRULE (added 2026-07-28)

**Problem:** Recurring training sessions (group events) were pushed to Google Calendar as individual events — one per occurrence. Users had to delete them one by one when cancelling a series.

**Solution:** When a `TrainingEvent` belongs to a recurring `TrainingSession`, the backend creates **one** Google Calendar event with an RFC 5545 `recurrence` rule (RRULE) instead of N individual events. Google Calendar auto-expands recurring events into instances.

#### RRULE generation

Built from `TrainingSession` fields:
- `recurring_days: list[int]` (0=Mon..6=Sun) → `BYDAY=MO,WE,FR`
- `recurring_until: date | None` → `UNTIL=YYYYMMDDTHHMMSSZ` (omitted if unbounded)
- Always `FREQ=WEEKLY`

Example: session on Mon/Wed/Fri until Dec 31 → `RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20261231T235959Z`

#### Creation flow

1. First `TrainingEvent` of a recurring session triggers creation of the recurring Google Calendar event
2. Subsequent events of the same session → skipped (already covered by RRULE)
3. The link row stores `google_calendar_recurring_event_id = base_event_id` to detect existing recurring events
4. Non-recurring events continue to create individual Google Calendar events (no change)

#### Cancel / reschedule of individual occurrences

Google Calendar instance IDs follow the pattern `{baseEventId}_{YYYYMMDDTHHMMSS}Z` where the datetime is the original start time.

| Action | Scope | Google Calendar operation |
|---|---|---|
| Cancel occurrence | `this` | Delete the specific instance by computed instance ID |
| Cancel series | `following` | Cancel each affected instance individually |
| Cancel all | `all` | Delete the base recurring event (removes all instances) |
| Reschedule occurrence | `this` | Update the specific instance's start/end |
| Reschedule series | `following` / `all` | Update each affected instance individually |
| Delete session | — | Delete the base recurring event |

All operations are best-effort: failures are logged but never block the domain transaction.

**Fallback:** If no recurring Google Calendar event is found for a session (e.g., events created before this feature), the system falls back to the previous behavior (delete/update individual event links).

#### Backend files
- `calendar_event_creator.py` — RRULE builder + recurring event creation logic
- `calendar_event_recurring_ops.py` — cancel/reschedule/delete recurring instances
- `google_calendar.py` (contract + infra) — `recurrence` parameter on `create_event`
- `group_event_lifecycle.py` — cancel/reschedule handlers with recurring support
- `training_sessions.py` — session deletion with recurring cleanup

### 4e. System calendars and push notifications (added 2026-07-28)

Google system calendars (holidays, week numbers, contacts' birthdays, etc.) do not support push notification channels (`events.watch`). The Google API returns `HttpError 400` with reason `pushNotSupportedForRequestedResource`.

**Behavior:** `ensure_calendar_watch` catches this specific error, logs it as INFO, and returns `False` (no watch registered). This is a normal condition — these calendars are synced via periodic pull only, not push. No Sentry alert, no Temporal failure.

### 5. Initial Sync After Connection

When user connects calendar after already having events:
- All **future** app events (approved) → pushed to external calendar
- All **future** external events → pulled into app
- Past events are NOT synced

### 6. Shared Across Roles

- Connected calendar is shared between athlete and coach roles
- One connection serves both roles
- Events from both roles sync to the same external calendar

## Priority & Conflict Resolution

| Scenario | Behavior |
|---|---|
| App event + external event at same time | App event takes priority |
| External event on empty slot | Slot becomes unavailable for booking |
| External event conflicts with existing booking | External event is imported but app event remains |

## Disconnecting

- `DELETE /google-calendars/{id}` — removes connection, stops sync
- `DELETE /google-calendars` — removes all Google calendar connections
- `DELETE /apple-calendars/{id}` — removes Apple calendar connection
- Previously synced events remain in app until next sync clears them

## Data Model

### Google Calendar
| Field | Description |
|---|---|
| id | Primary key |
| user_id | User who connected |
| access_token | OAuth access token |
| refresh_token | OAuth refresh token |
| email | Google account email |
| calendar_id | Google Calendar ID |
| summary | Calendar name |
| sync_token | For incremental sync |
| is_active | Active connection flag |

### Apple Calendar
| Field | Description |
|---|---|
| id | Primary key |
| user_id | User who connected |
| credentials | Encrypted CalDAV credentials |

## User-Facing Failure Notification

When sync hits an action-required failure (auth expired, app-specific password revoked, 2FA disabled) — i.e., backend cannot recover by retry — backend fires a `calendarSync` inbox + push notification routing the user to the Calendar Sync screen. Transient failures (5xx, rate-limit, network) stay silent and retry automatically.

See [notifications.md § Calendar sync issue notification](notifications.md#calendar-sync-issue-notification-calendarsync-kit-type) for full triggers, copy, throttle rules (1 per account per 24h), and payload shape.

## Edge Cases
- OAuth token expires → backend auto-refreshes using refresh_token
- User revokes access in Google settings → sync fails gracefully, `calendarSync` notification fired (see above)
- Multiple Google accounts → each connected separately; throttle is per-account, so two broken Google accounts = two notifications
- Calendar event deleted in Google → removed from app on next sync
- No push notifications for external calendar **events** (only for sync break)

## iOS Implementation Details

### Google Calendar
- Service: `CalendarSyncNetworkService.swift`
  - `getAccounts()` — fetch connected accounts
  - `connectAccount(serverAuthCode)` — OAuth connect
  - `deleteAccount(id)` — remove connection
  - `changeCalendarConnection(id, isActive)` — toggle per account
- Events flagged with `isGoogleCalendarEvent` in `Event.swift`

### Apple Calendar
- `EventKit` framework imported in `ScheduleView.swift`
- NO local Apple Calendar sync code visible in iOS yet — backend-only for now

## Known Issues / Tech Debt
- Apple Calendar iOS UI not fully implemented (EventKit imported but not used for sync)
- Google Calendar webhook reliability depends on external service
- Periodic sync interval (15 min) may cause temporary inconsistencies

## Platform notes

**Native UI conventions:** see [architecture/design-system.md § Native theming contract](../architecture/design-system.md#native-theming-contract). Don't duplicate cross-platform UI rules here — only platform-specific deviations below.
