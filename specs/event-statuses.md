# Event Statuses & Push Notifications

> Last updated: 2026-04-02

## Overview
Training events go through a lifecycle of statuses. Each status transition triggers push notifications to the relevant party. This is the source of truth for client-side status naming and notification behavior.

## Current State
Fully implemented across iOS, backend, and voice assistant.

## Event Statuses (Client-Side Naming)

| Status | Description | Who sees it |
|---|---|---|
| **pending** | Waiting for the other party to respond | The user who created the request |
| **request** | Incoming request awaiting your action | The user who received the request |
| **approved** | Both parties confirmed | Both |
| **declined** | Request was rejected | Both |
| **canceled** | Confirmed event was cancelled | Both |
| **auto-declined** | Request expired without response (48h or 24h after event date) | Both |
| **rescheduled** | Reschedule requested (transitions back to pending/request) | Both |
| **paid** | Payment held/completed for this event | Both |
| **cash** | Cash payment method selected | Both |
| **invitation** | Invite link sent, awaiting action | Both |
| **successful / completed** | Training session completed | Both |
| **google event** | Event imported from Google Calendar | Owner only |
| **apple event** | Event imported from Apple Calendar | Owner only |

> **Note:** Backend may use different naming internally (e.g., `ApprovalStatus` enum). Always use client-side naming in user-facing contexts.

### Backend Enum Mapping
| Client Status | Backend `ApprovalStatus` | Backend `EventSource` |
|---|---|---|
| pending | `pending` | — |
| request | `pending` (viewed by other party) | — |
| approved | `approved` | — |
| declined | `declined` | — |
| canceled | `cancelled` | — |
| auto-declined | `auto_declined` | — |
| rescheduled | `rescheduled` | — |
| successful/completed | (post-confirmation) | — |
| google event | — | `google` |
| apple event | — | `apple` |

## Status Flows

### New Training Request

**Athlete creates request:**
```
Athlete creates event → pending (athlete) / request (coach)
  → Coach approves → approved (both)
  → Coach declines → declined (both)
  → 48h no response → auto-declined (both)
```

**Coach creates request:**
```
Coach creates event → pending (coach) / request (athlete)
  → Athlete approves → approved (both)
  → Athlete declines → declined (both)
  → 48h no response → auto-declined (both)
```

### Reschedule
```
Either party reschedules → pending (initiator) / request (other party)
  → Same flow as new request
```

### Cancellation
```
Either party cancels approved event → canceled (both)
```

### Auto-Decline Triggers
- 48 hours without response to a request
- Event date has passed + 24 hours

### Completion
```
Approved event date passes → successful/completed (both)
  → Payment transfer triggered (if card payment)
```

### Calendar Events
```
Google/Apple Calendar sync → google event / apple event
  → Read-only, blocks booking slots
  → User cannot change status
```

## Push Notifications

### General Rules
- Push sent on every status change EXCEPT re-sends within pending/request (no duplicate notifications)
- Each notification has a routing target (which screen to open)

### Notification Table

| Trigger | Recipient | Push Text | Routing |
|---|---|---|---|
| Athlete creates request | Coach | "You have a new training session request from {athlete_name}" | Clients/Coaches screen → Requests tab |
| Athlete request reminder | Coach | "{athlete_name} is still waiting for your reply to their training request." | Clients/Coaches screen → Requests tab |
| Coach creates request | Athlete | "{coach_name} has requested a new training session." | Clients/Coaches screen → Requests tab |
| Coach request reminder | Athlete | "Your coach {coach_name} is still waiting for your response to their training request." | Clients/Coaches screen → Requests tab |
| Request approved | Request creator | "Your training session request has been approved." | Schedule screen → day of event |
| Request declined | Request creator | "Your training session request with {name} has been declined." | Default (app root) |
| Event canceled | Other party | "Your training session with {name} on {date} at {time} has been canceled." | Default (app root) |
| Auto-declined | Both | "Your training session request was not answered in time and has been automatically declined." | Default (app root) |
| Athlete reschedules | Coach | "The athlete {athlete_name} has requested to reschedule the training session." | Schedule screen → rescheduled date |
| Coach reschedules | Athlete | "The trainer {coach_name} has requested to reschedule the training session." | Schedule screen → rescheduled date |
| Athlete onboards via invite | Coach (inviter) | "Great news! {athlete_name} just onboarded to 321.fit. Ready to train?" | Athlete details screen |
| Session completed (coach) | Coach | "The training session with {athlete_name} was successful." + payment info if card | Balance screen |
| Session completed (athlete) | Athlete | "The training session with {coach_name} was successful." + payment info if card | Balance screen |

### Payment-specific Push Additions
- Coach (card payment): "...{sum} has been transferred to your balance."
- Athlete (card payment): "...{sum} has been paid to {coach_name}."

## Components

### Backend
- `NotificationCategory` enum: `app/domain/entities/` — defines all notification types
- `send_push_notification` Celery task: `app/tasks/notifications.py`
- FCM service: `infra/services/fcm.py`
- Event approval handlers: `app/handlers/rest/athlete/`, `app/handlers/rest/coach/`

### iOS
- Push notification routing: `Core/PushNotifications/TargetData.swift` — `TargetRoute` enum
- Event model: `Core/Models/EventModel.swift`
- Pending requests: `TabBar/Tabs/ClientsTab/Requests/`
- Schedule display: `TabBar/Tabs/ScheduleTab/`
- AppDelegate notification handling: `App/AppDelegate.swift`

### Voice Assistant
- Event status changes via tools: `coach_change_training_event_status_by_id()`, `athlete_change_training_event_status_by_id()`
- Backend client handles status updates: `src/adapters/agents/tools/client/client.py`

### Android (Planned)
- Same push notification handling as iOS
- FCM integration (backend already supports Android via `FCM_ANDROID_CREDENTIALS_PATH`)
- Same event status display and routing logic
- Same notification text and routing targets

## Known Issues / Tech Debt
- Backend uses `cancelled` (double L), client uses `canceled` (single L) — normalize
- `successful/completed` status naming inconsistent across codebase
- Reminder push timing (for pending requests) not clearly defined in backend
- iOS `EventStatus` enum also includes `paid`, `cash`, `invitation` — not in original spec but implemented
- Each iOS status has associated color: blue (pending/rescheduled), yellow (request/invitation), green (approved/paid/cash), red (cancelled/autodeclined)
