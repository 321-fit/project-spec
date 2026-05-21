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

### 4a. Default destination (added 2026-05-21)

When the coach has multiple connected accounts (e.g. two Google accounts + Apple), they must pick **one** as the destination for newly-created 321Fit events. The "321 Fit" calendar is auto-managed by us inside whichever account is currently default.

**UX (prototype `flows/coach/calendar-sync.html`):**
- On `s-calsync` (top-level): the default account shows the canonical `.fit-badge.fit-badge-accent` "Default" pill inline after its title — same pattern as locations.html "Default" gym pill. Pill is **hidden** when only one account is connected (implicit default).
- On `s-cal-detail` (per-account):
    - If this account IS default → read-only label with check icon: "Default destination · New 321Fit events are saved to '321 Fit' calendar in this account."
    - If this account is NOT default → tappable row "Make default destination" + sub-copy. Tap → backend `PATCH /coach/calendar-sync/default { account_id }` → snackbar "Default set · 321Fit events will be saved here" → return to s-calsync with updated badge.

**Backend rules:**
- New field on coach settings: `default_writing_account_id` (FK to `google_calendar` or `apple_calendar` row).
- On first connect (any provider) — auto-set as default.
- On subsequent connects — keep existing default (don't change automatically when adding accounts).
- On disconnect of default — fallback to first remaining connected account; UI shows a warning chip on the new default's row briefly.
- **"321 Fit" calendar creation strategy:** lazy-create only inside the default account. When default changes, create "321 Fit" in the new default if it doesn't exist there yet. Old "321 Fit" calendars in non-default accounts remain as immutable history (we don't write to them anymore; deletion is the coach's call from Google UI).
- Endpoint: `PATCH /coach/calendar-sync/default { account_id }` — additive, idempotent.

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

**Endpoints** — see [poly-backend/docs/calendar-sync-api.md](../../poly-backend/docs/calendar-sync-api.md):
- `POST /v1.0.0/coach/calendar/external-events/{external_event_id}/hide` — body `{ scope: "occurrence" }` (v1 only supports occurrence). Returns 204.
- `DELETE /v1.0.0/coach/calendar/external-events/{external_event_id}/hide` — unhide. Returns 204.
- `GET /v1.0.0/coach/calendar/external-events/hidden` — list, paginated. Used by Settings → Calendar Sync → Account detail → Hidden events section. Auto-cleanup: backend should drop stale entries when the underlying Google/Apple event has been deleted at source (detected on next sync pass).

**Entry points (UI):**
1. **External event drawer** (tap external tile on schedule) → footer button "Hide from schedule" (destructive-tinted, with eye-off icon). Closes drawer + shows snackbar "Hidden '{title}' · Undo" (5s). This is the **surgical** path for muting a specific event.
2. **Overlap drawer** secondary action **"Ignore external events"** → backend loops POST `.../external-events/{id}/hide` for every external event in the current conflict group (bulk hide). Snackbar "Ignored N events from this slot · Undo". After bulk hide, client recomputes overlap → own event tile loses the `.overlapped` marker. This is the **bulk** path for resolving a conflict from the external side without granular decisions. See [coach-calendar.md § 4c Event overlap rendering](./coach-calendar.md#4c-event-overlap-rendering-added-2026-05-21).
3. **Hidden events list** (Settings → Calendar Sync → Account detail → footer section "Hidden events (N)") → per-row Unhide button. Empty state when count = 0 ("No events hidden from this account").

A bulk endpoint (e.g. POST `.../external-events/hide-batch` with id list) can land in Phase 2 to reduce N round-trips on "Ignore external events" — current per-id loop is acceptable for typical N=1–4 conflict groups.

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
