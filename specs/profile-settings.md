# Profile & Settings

> Last updated: 2026-04-02

## Overview
User profile management and app settings. Settings are role-dependent — coaches have additional options for locations, sessions, available hours, and Stripe Connect.

## Current State
Fully implemented in iOS and backend.

## Components

### Backend
- User profile: `GET/PUT/PATCH /me`
- Athlete profile: `PUT /athlete/update-profile`
- Coach profile: `PUT /coach/update-profile`
- Avatar: `PUT /me/upload-avatar`
- Timezone: `PUT /me/update-timezone`
- Sports: `GET/POST/PUT/DELETE /{role}/sports`
- Addresses: `GET/POST/PUT/DELETE /{role}/addresses`
- Schedule: `GET/POST/PUT/DELETE /coach/schedule`
- Training sessions: `GET/POST/PUT/DELETE /coach/training-sessions`

### iOS
- Profile tab: `TabBar/Tabs/ProfileTab/`
- Settings list: `ProfileTab/Settings/SettingsList/`
- Settings type enum: `ProfileTab/Settings/SettingsList/SettingsType.swift`
- Individual settings: `ProfileTab/Settings/Options/`

### Android (Planned)
- Same settings structure and API calls
- Same role-based visibility

## Settings Menu

### Settings Type Enum
```swift
enum SettingsType: String, CaseIterable {
    case personal           // Edit profile
    case chooseSport        // Sports management
    case inviteFriend       // Invite friend / referral
    case accountAndPassword // Email, password, phone change
    case location           // Gym/workout locations
    case sessions           // Training sessions (coach)
    case availableHours     // Available hours (coach)
    case calendarSync       // Google Calendar sync
    case balance            // Balance / payments
    case stripeConnect      // Stripe onboarding (coach)
}
```

### Role-Based Visibility

| Setting | Athlete | Coach |
|---|---|---|
| Personal Info | Yes | Yes |
| Choose Sport | Yes | Yes |
| Invite Friend | Yes | Yes |
| Account & Password | Yes | Yes |
| Location | No | Yes |
| Training Sessions | No | Yes |
| Available Hours | No | Yes |
| Calendar Sync | Yes | Yes |
| Balance | Yes | Yes |
| Stripe Connect | No | Yes |

## Personal Info

**Location:** `ProfileTab/Settings/Options/PersonalInfo/`

### Profile Fields
| Field | Type | Description |
|---|---|---|
| firstName | String | First name |
| lastName | String | Last name |
| gender | String | Gender |
| weight | Number | Weight |
| height | Number | Height |
| birthDate | Date | Date of birth |
| country | String | Country code |
| languages | [String] | Language codes |
| selectedTimezone | String | Timezone |
| bio | String | Bio text (via role-specific settings) |
| specialities | [Int] | Sport IDs |
| avatar | Image | Profile photo (multipart upload) |

### API
- `PersonalInfoNetworkService` — update profile fields
- `PUT /me/upload-avatar` — avatar upload

## Sports Management

**Location:** `ProfileTab/Settings/Options/Sports/` (via `chooseSport`)

- View/add/remove sport specialties
- Uses sport type reference data (`GET /sport-types`)

## Location Management (Coach)

**Location:** `ProfileTab/Settings/Options/Location/`

- CRUD for gym/workout locations
- Google Maps integration for map display
- Google Places for address autocomplete
- Each location: name, address, coordinates, default flag

## Training Sessions (Coach)

**Location:** `ProfileTab/Settings/Options/TrainingSession/`

- CRUD for training session templates
- Fields: name, duration, price, currency, payment type (card/cash), location
- These templates are used when creating training events

## Available Hours (Coach)

**Location:** Profile / Settings → **Availability** (hub) → Available hours.
*(Expanded 2026-08-11 from a four-bullet stub to what shipped on Android + backend —
`GET/PUT /coach/schedule/`.)*

**Availability is a hub, not a row.** One card leads to three things that used to be scattered:
weekly hours, per-day location, and [Time off](./vacation-mode.md). The hub shows a derived summary
(active days, the coach's zone with its GMT offset) — derived, never stored, so it can't disagree
with the editor.

**The weekly editor:**

- Seven day rows, each **on/off**, each holding **one or more intervals** — a split day (morning +
  evening) is the normal case, not an edge case.
- Minimum interval **30 minutes**; validation is live per interval: *end before start*, *too short*,
  *overlaps another interval on the same day*. Save is blocked while any row is invalid.
- **One in-person location per day** — a pill on the day row opening a picker of the coach's
  locations. The wire carries an address **per interval**; the product decision is one per day, so
  the client writes the day's choice onto every interval on save. Per-interval locations (different
  gym morning vs evening) are deliberately deferred — see [location-picker.md](./location-picker.md).
- **All days off** is allowed but banners: with no hours, nobody can book.
- Times are the coach's own zone, stated on screen. Dirty-state discard confirm on back.

**Consumers.** These hours are what the booking grid washes out as off-hours, what
`training-events/allowed-hours` answers per date, and what a drag on the calendar is validated
against ([coach-calendar.md](./coach-calendar.md)).

## Account & Password

**Location:** `ProfileTab/Settings/Options/CredentialsChange/`

- Change email (with OTP verification + re-auth)
- Change phone number (with OTP for ownership re-proof; phone is a login method + contact attribute, non-unique across accounts — see `authentication.md` § 2026-07-17 update. The 2026-05-11 "contact-only" decision was reversed.)
- Change password (requires current password)
- Create password (if social auth user)
- Delete account

See [Authentication spec](authentication.md) and [Account Access spec](account-access.md) for details.

## Account Access (Login Methods)

**Location:** `ProfileTab/Settings/Options/AccountAccess/`

- View linked authentication providers (Apple, Google, email, **phone** — a sign-in method as shipped; the 2026-05-11 "Contact-only" move was reversed 2026-07-17, see `authentication.md`).
- Add/remove sign-in methods

## Calendar Sync

**Location:** `ProfileTab/Settings/Options/CalendarSync/`

See [Calendar Integration spec](google-apple-calendar.md) for details.

## Balance & Payments

**Location:** `ProfileTab/Settings/Options/BalanceFlow/`

See [Payments spec](payments.md) for details.

## Stripe Connect (Coach)

**Location:** `ProfileTab/Settings/Options/StripeConnect/`

See [Payments spec](payments.md) for details.

## Invite Friend / Referral

**Location:** `ProfileTab/Settings/Options/InviteFriend/`

- Generate referral link
- Share via system share sheet
- Separate invite views for athlete and coach roles

See [Deep Linking & Referrals spec](deep-linking-referrals.md) for details.

## Languages, Timezone, Country

**Location:** `ProfileTab/Settings/Options/Languages/`, `TimeZone/`, `Country/`

- Language selection from reference list (`GET /languages`)
- Timezone selection
- Country selection from reference list (`GET /countries`)

## Known Issues / Tech Debt
- Settings enum uses `accountAndPassword` but screen is named "Account & Password" — could align
- Some settings (location, sessions, availableHours) only visible to coaches but the enum includes all

## Platform notes

**Native UI conventions:** see [architecture/design-system.md § Native theming contract](../architecture/design-system.md#native-theming-contract). Don't duplicate cross-platform UI rules here — only platform-specific deviations below.
