# Calendar Integration (Google & Apple)

> Last updated: 2026-04-02

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
- Events are created in the "321 Fit" calendar (Google) or equivalent (Apple)
- Event title contains training type and participant info
- When app event status changes (canceled, rescheduled) → external event is updated/deleted

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

## Edge Cases
- OAuth token expires → backend auto-refreshes using refresh_token
- User revokes access in Google settings → sync fails gracefully, user notified
- Multiple Google accounts → each connected separately
- Calendar event deleted in Google → removed from app on next sync
- No push notifications for external calendar events

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
