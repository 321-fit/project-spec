# Data Model (Entity Relationship)

> Last updated: 2026-04-02

## Overview
Complete data model for the 321Fit backend (PostgreSQL). All tables are defined in `poly-backend/backend/infra/database/psql/tables/`.

## Entity Relationship Diagram

```
┌─────────────┐     ┌──────────┐     ┌───────────────────┐
│    user      │────<│ user_role │>────│       role        │
│             │     └──────────┘     │                   │
│ id           │                      │ id                │
│ username     │     ┌──────────────┐ │ name              │
│ email        │────<│user_social_  │ │ permissions       │
│ phone_number │     │auth          │ └─────────┬─────────┘
│ password_hash│     │ provider     │           │
│ is_active    │     │ uid          │  ┌────────┴──────────┐
│ active_role  │     └──────────────┘  │ role_permission   │>──── permission
└──────┬───────┘                       └───────────────────┘
       │
       ├──────────────────────┐
       │                      │
┌──────┴──────────┐  ┌───────┴───────────┐
│ athlete_profile  │  │  coach_profile     │
│                  │  │                    │
│ uuid             │  │ uuid               │
│ first_name       │  │ first_name         │
│ last_name        │  │ last_name          │
│ avatar           │  │ avatar             │
│ bio              │  │ bio                │
│ gender           │  │ gender             │
│ weight, height   │  │ stripe_account_id  │
│ birth_date       │  │ verified           │
│ languages        │  │ timezone           │
│ timezone         │  │ onboarding_done    │
│ stripe_customer  │  └───────┬────────────┘
│ onboarding_done  │          │
└───────┬──────────┘          │
        │                     │
        │  ┌──────────────────┴──────────────────┐
        │  │      athlete_profile_clients         │
        │  │  (coach ↔ athlete relationship)      │
        └──│──────────────────────────────────────┘
        │
        │     ┌─────────────────────────────────┐
        ├────>│         balance                  │
        │     │ amount, currency                 │
        │     └────────────┬────────────────────┘
        │                  │
        │     ┌────────────┴────────────────────┐
        │     │    balance_replenishment         │
        │     │ payment_intent_id, amount        │
        │     └─────────────────────────────────┘
        │
        ├────>│ athlete_profile_sports      │>──── sport_type
        ├────>│ athlete_profile_specialities│
        ├────>│ coach_profile_sports        │>──── sport_type
        └────>│ coach_profile_specialities  │
```

## Core Tables

### Users & Auth

| Table | Relationships | Description |
|---|---|---|
| `user` | → athlete_profile, coach_profile, user_role, user_social_auth | Core auth account |
| `role` | → user_role, role_permission | Athlete or Coach |
| `user_role` | user ↔ role | Many-to-many |
| `permission` | → role_permission | Resource + action permissions |
| `role_permission` | role ↔ permission | Many-to-many |
| `user_social_auth` | → user | OAuth providers (google, apple) |

### Profiles

| Table | Relationships | Description |
|---|---|---|
| `athlete_profile` | → user, balance, sports, specialities, addresses | Athlete data |
| `coach_profile` | → user, sports, specialities, addresses, schedule | Coach data |
| `athlete_profile_clients` | athlete ↔ coach | Coach-athlete connections |
| `athlete_profile_sports` | profile ↔ sport_type | Athlete's sports |
| `coach_profile_sports` | profile ↔ sport_type | Coach's sports |
| `athlete_profile_specialities` | profile ↔ speciality | Athlete specializations |
| `coach_profile_specialities` | profile ↔ speciality | Coach specializations |

### Training

```
coach_profile ──┐
                 ├──> training_session (template)
                 │         │
                 │         ▼
                 ├──> training_event (instance) <──── athlete_profile
                 │         │
                 │         ├──> event_approval
                 │         ├──> event_post_confirmation
                 │         ├──> training_invitation
                 │         ├──> google_calendar_event
                 │         └──> apple_calendar_event
```

| Table | Key Fields | Description |
|---|---|---|
| `training_session` | coach_id, name, duration, price, currency, payment_type, address_id | Coach's service template |
| `training_event` | coach_id, athlete_id, session_id, datetime_start/end, price, event_source | Scheduled appointment |
| `event_approval` | event_id, approver_id, status, payment_status | Approval workflow |
| `event_post_confirmation` | event_id | Post-session confirmation |
| `training_invitation` | event_id, token, is_active, expires_at | Invitation link tokens |

### Financial

| Table | Key Fields | Description |
|---|---|---|
| `balance` | athlete_profile_id, amount, currency | Athlete account balance |
| `balance_replenishment` | payment_intent_id, balance_id, amount, currency | Stripe top-up records |

### Addresses & Schedule

| Table | Key Fields | Description |
|---|---|---|
| `address` | profile_id, lat, lon, address_line, location_name, city, country_code, is_default | Training locations |
| `coach_working_hours` | coach_id, day_of_week (0-6), start_time, end_time | Weekly availability |

### Calendar Integration

| Table | Key Fields | Description |
|---|---|---|
| `google_calendar` | user_id, access_token, refresh_token, email, calendar_id, sync_token | Google Calendar connection |
| `google_calendar_event` | google_event_id, training_event_id, user_id | Synced Google events |
| `apple_calendar` | user_id, credentials (encrypted) | Apple Calendar connection |
| `apple_calendar_event` | apple_event_id, training_event_id, user_id | Synced Apple events |

### Notifications

| Table | Key Fields | Description |
|---|---|---|
| `notification` | recipient_user_id, category, method, status, push_text | User notifications |
| `notification_template` | name, subject, body_html, body_text | Email templates |
| `fcm_device` | user_id, registration_id, device_type, active | Push notification devices |
| `whatsapp_notifications_allowed` | user_id, enabled | WhatsApp opt-in |

### Social & Referrals

| Table | Key Fields | Description |
|---|---|---|
| `favorite_user` | user_id, favorite_profile_id | User favorites |
| `referral_token` | token, user_profile_id | Referral codes (1 per user) |
| `referral_connection` | referrer_id, referee_id, token_used | Referral tracking |
| `user_exclusion` | blocker_id, blocked_id | Block list |

### Reference Data

| Table | Key Fields | Description |
|---|---|---|
| `sport_type` | name, icon | Sports catalog |
| (countries) | code, name | Country reference |
| (currencies) | code, name | Currency reference |
| (languages) | code, name | Language reference |

## Key Enums

### ApprovalStatus
`pending` → `approved` / `declined` / `cancelled` / `auto_declined` / `rescheduled` / `invitation`

### PaymentStatus
`waiting_for_payment` → `money_on_hold` → `transfered_to_coach`

### EventSource
`internal` / `google` / `apple`

### NotificationCategory
`athlete_created_training_request`, `coach_created_training_request`, `training_request_approved`, `training_request_declined`, `athlete_rescheduled_training`, `coach_rescheduled_training`, `athlete_onboarding_completed`, `training_session_successful_coach`, `training_session_successful_athlete`, `pending_request_auto_declined`, `training_event_cancelled`

### ProfileType
`Athlete` / `Coach`

### DeviceType
`ios` / `android` / `web`

### NotificationMethod
`email` / `push` / `sms` / `whatsapp`

## Migration History

| Date | Description |
|---|---|
| 2025-11-11 | Initial schema (all core tables) |
| 2026-01-22 | Notification templates |
| 2026-01-22 | WhatsApp notifications opt-in |
| 2026-03-16 | Unique Google Calendar event ID |
| 2026-03-25 | Apple Calendar tables |
| 2026-03-26 | Training event source field |
