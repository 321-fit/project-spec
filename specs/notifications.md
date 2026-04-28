# Push Notifications & Devices

> Last updated: 2026-04-02

## Overview
Push notifications via Firebase Cloud Messaging (FCM). Notifications are triggered by event status changes, session completions, and other system events. Each device is registered for push delivery.

## Current State
Fully implemented across iOS and backend. Backend supports iOS and Android FCM credentials separately.

## Components

### Backend
- FCM service: `infra/services/fcm.py`
- Celery tasks: `app/tasks/notifications.py` — push, SMS, email, WhatsApp
- Device endpoints: `entry/rest/v1/endpoints/other/devices/`
- Notification endpoints: `entry/rest/v1/endpoints/other/notifications/`
- DB tables: `notification`, `notification_template`, `fcm_device`, `whatsapp_notifications_allowed`

### iOS
- Push setup: `App/AppDelegate.swift` — Firebase, FCM delegate
- Token management: `Core/Services/UserManager/` — `updateFCMToken()`
- Notification API: `Core/PushNotifications/API/`
- Routing: `Core/PushNotifications/TargetData.swift`

### Android (Planned)
- Firebase SDK integration
- FCM token registration (backend already has `FCM_ANDROID_CREDENTIALS_PATH`)
- Same notification routing and badge management

## Device Registration

### Flow
1. App starts → Firebase generates FCM token
2. `MessagingDelegate.didReceiveRegistrationToken()` → `UserManager.updateFCMToken()`
3. Token sent to backend: `POST /devices`

### Device Model
| Field | Description |
|---|---|
| registration_id | FCM token |
| device_type | `ios` / `android` / `web` |
| active | Active flag |
| name | Device name |
| device_id | Unique device identifier |

### Endpoints
| Method | Path | Description |
|---|---|---|
| GET | `/devices` | List registered devices |
| POST | `/devices` | Register new device |
| PUT | `/devices/{id}` | Update device |
| DELETE | `/devices/{id}` | Unregister device |

## Notification Delivery

### Channels
| Channel | Service | Usage |
|---|---|---|
| Push (FCM) | Firebase Admin SDK | Primary — all event notifications |
| SMS | Twilio | OTP codes, phone verification |
| Email | SendGrid | Password reset, welcome emails |
| WhatsApp | WhatsApp Business API | Optional — user opt-in required |

### Celery Tasks
| Task | Retry | Description |
|---|---|---|
| `send_push_notification` | 3x, 60s delay | FCM push (iOS/Android separately) |
| `send_sms_notification` | — | SMS via Twilio |
| `send_email_notification` | — | Email via SendGrid |
| `send_whatsapp_notification` | — | WhatsApp message |

## Notification Management

### Endpoints
| Method | Path | Description |
|---|---|---|
| GET | `/notifications` | List notifications (paginated) |
| GET | `/notifications/count` | Unread count |
| POST | `/notifications/mark-read` | Mark single as read |
| POST | `/notifications/mark-all-read` | Mark all as read |
| POST | `/notifications/mark-informational-read` | Mark informational as read |

### In-App Display
- Unread badge on tab bar
- Badge count fetched from `/notifications/count`

## Notification Routing (iOS)

When user taps a push notification, the app routes to a specific screen.

### TargetData Model
```swift
struct TargetData: Codable {
    let target: TargetRoute?
    let userId: String?
    let athleteId: String?
    let date: String?
    let role: String?
}
```

### Target Routes
```swift
enum TargetRoute: String, Codable {
    case athleteCreatedTrainingRequest
    case athleteRescheduledTraining
    case athleteOnboardingCompleted
    case coachRescheduledTraining
    case coachCreatedTrainingRequest
    case trainingRequestApproved
    case trainingRequestDeclined
    case trainingEventCancelled
    case pendingRequestAutoDeclined
}
```

### Routing Destinations
| Route | Screen |
|---|---|
| `*CreatedTrainingRequest` | Clients/Coaches → Requests tab |
| `*RescheduledTraining` | Schedule → rescheduled date |
| `trainingRequestApproved` | Schedule → event date |
| `trainingRequestDeclined` | Default (app root) |
| `trainingEventCancelled` | Default (app root) |
| `pendingRequestAutoDeclined` | Default (app root) |
| `athleteOnboardingCompleted` | Athlete details screen |

See [Event Statuses spec](event-statuses.md) for complete push notification text and triggers.

## WhatsApp Notifications
- Opt-in toggle: `GET /me/whatsapp-notifications-toogle`
- DB table: `whatsapp_notifications_allowed`
- Uses `WHATSAPP_COMPANY_NUMBER` env var

## Notification Data Model

### Notification
| Field | Description |
|---|---|
| recipient_user_id | Who receives it |
| category | Notification type (enum) |
| method | push / email / sms / whatsapp |
| status | created / sent / delivered / read / failed |
| push_text | Push notification body text |
| subject | Email subject (if email) |

### Notification Template
| Field | Description |
|---|---|
| name | Template identifier |
| subject | Email subject |
| body_html | HTML email body |
| body_text | Plain text email body |

## Known Issues / Tech Debt
- WhatsApp toggle endpoint has typo: `toogle` instead of `toggle`
- Notification templates not fully utilized (some notifications are hardcoded)
- No notification preferences screen in iOS (can't choose which notifications to receive)

## Platform notes

**Native UI conventions:** see [architecture/design-system.md § Native theming contract](../architecture/design-system.md#native-theming-contract). Don't duplicate cross-platform UI rules here — only platform-specific deviations below.
