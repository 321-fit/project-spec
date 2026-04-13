# Calendar Sync

> Status: Draft
> Prototype: [settings.html](../prototypes/flows/settings.html)
> Last updated: 2026-04-13

## Overview

External calendar integration for syncing events bidirectionally. Supports Google Calendar (OAuth) and Apple Calendar (CalDAV). Available for both Coach and Athlete roles. Shared connection — one account serves both roles.

## Screens

### 1. Calendar Sync (account list)

**Zero state (nothing connected):**
- Description text: "No calendars connected — sync to avoid scheduling conflicts"
- Two provider cards (Google + Apple), each with "Connect" button
- Tap anywhere on card → triggers connect flow
- Google → OAuth flow, Apple → CalDAV form

**Connected state:**
- Account cards with: provider icon (brand) + title + email (cyan) + "X of Y calendars synced"
- Tap card → navigates to provider detail screen
- Loading card: spinner + "Fetching calendars..." (no chevron, not tappable, opacity 0.7)
- "+ Add Google account" (dashed border card) — supports multiple Google accounts
- Divider between Google and Apple sections
- Apple not connected: inline Connect button

**Sync error state:**
- Card shows red "⚠ Sync error" instead of "X of Y synced"
- Tap → detail screen with error banner + "Retry Sync" button
- Events may be outdated but app continues working

**Success flow (after connecting):**
- Redirect to Calendar Sync screen
- Toast (top, green checkmark): "Google Calendar connected" — auto-dismiss 3s
- New account card appears in loading state → calendars fetched → card updates

### 2. Google Calendar Detail

**Layout:**
- Header: back + "Google Calendar" + trash icon (disconnect)
- Account info: avatar circle + email + "Connected" status
- Calendar list: selectable rows (tap full row)
  - Color dot (Google calendar color: blue, red, yellow, green)
  - Calendar name
  - Checkmark when selected (gradient bg + teal border)
- "321 Fit" calendar NOT shown (auto-created, always synced)
- Footer: Save button only

**Error States (3 cases):**

**Case 1 — Initial fetch failure** (OAuth ok, calendar list failed):
- Card on Calendar Sync: email + "Failed to load calendars" (red text)
- Detail screen: error banner "Could not load your calendars" + "Retry" button
- Calendar list NOT shown (no data to show)
- Disconnect available via trash icon

**Case 2 — Ongoing sync failure** (was working, sync broke):
- Card on Calendar Sync: email + "2 of 3 synced" + "⚠ Sync error" (red badge)
- Detail screen: error banner "Last sync failed. Events may be outdated." + "Retry Sync" button
- Calendar list shown and toggleable (stale data but usable)
- Button shows "Syncing..." during retry → banner disappears on success

**Case 3 — Auth expired** (token revoked/expired):
- Card on Calendar Sync: email + "⚠ Reconnect required" (red text)
- Detail screen: error banner "Your Google session has expired." + "Reconnect" button
- Calendar list shown (stale) but toggles disabled
- "Reconnect" re-triggers OAuth flow

| Error | API Code | Card Text | Detail Action |
|---|---|---|---|
| Calendar list failed | 500, network | "Failed to load" | Retry |
| Sync token invalid | 410 | "Sync error" | Retry (full re-sync) |
| Rate limit | 429 | "Sync error" | Auto-retry with backoff |
| Auth expired | 401 | "Reconnect required" | Reconnect (OAuth) |
| Server error | 500 | "Sync error" | Retry |

**Disconnect:**
- Trash icon in header → confirmation bottom sheet
- "Disconnect Google Calendar?" + email + description of what happens
- Two buttons: "Disconnect" (red) + "Cancel"
- iOS: bottom sheet. Android: native AlertDialog

### 3. Apple Calendar Detail

Dedicated screen for connected Apple Calendar account. Same structure as Google Detail but with Apple-specific error states.

**Layout:**
- Header: back + "Apple Calendar" + trash icon (disconnect)
- Account info: Apple Calendar icon + email + status
- Calendar list: selectable rows with iCloud calendar colors (red, purple, orange)
- Footer: Save button only

**Error States (4 states, differ from Google — no auto-refresh):**

**Normal:** calendars toggleable, "Connected" status

**Password Revoked:** (user changed Apple ID password → all app-specific passwords auto-revoked)
- Red banner: "Your app-specific password was revoked. Create a new one and reconnect."
- "Create New Password" button → redirects to Apple Connect form
- Calendars dimmed and disabled
- Status: "Password revoked" (red)

**2FA Not Enabled:** (Apple requires 2FA for app-specific passwords)
- Yellow banner: "Two-factor authentication required. Enable it in Apple ID settings."
- "Open Apple ID Settings" button → opens Safari
- Calendars dimmed and disabled
- Status: "2FA required" (yellow)

**Sync Error:** (periodic sync failed)
- Red banner: "Last sync failed. Events may be outdated."
- "Retry Sync" button
- Calendars visible and toggleable (stale data but usable)
- Status: "Sync error" (red)

**Disconnect:** same pattern as Google — trash icon → confirmation sheet (iOS) / AlertDialog (Android)

### 4. Apple CalDAV Connect

**Layout:**
- Info banner: explains app-specific password requirement
- Apple ID input (type: emailAddress)
- App-specific password input (type: password, eye toggle inside)
- Steps always visible (not expandable): 4-step guide + "Open Apple ID Settings" button
- Connect button in footer

**Keyboard behavior:**
| Field | Keyboard Type | Action Button |
|---|---|---|
| Apple ID | emailAddress | Next |
| App-specific password | default | Go → triggers Connect |

**Validation:**
- Empty fields → red border + red label, auto-scroll to first error, clear after 3s
- Backend error (invalid credentials) → toast (top, red): "Invalid credentials. Check your Apple ID and password."

**Success flow:**
- Connect → loading on button → redirect to Calendar Sync
- Toast: "Apple Calendar connected"
- New Apple card in loading state → calendars fetched

## Data & API

### Google Calendar
- OAuth via GoogleSignIn SDK (iOS) / Google Sign-In (Android)
- Backend stores access + refresh tokens in `google_calendar` table
- Auto-creates "321 Fit" calendar in user's Google account
- Sync: webhook (real-time) + 15-min periodic fallback
- Multiple accounts supported

### Apple Calendar
- CalDAV protocol — requires Apple ID + app-specific password
- Backend validates credentials, stores encrypted in `apple_calendar` table
- Fetches calendar list via CalDAV
- One account only
- Same sync pattern as Google (periodic, no webhook — CalDAV has no push mechanism)

**Apple-specific error cases:**

| Error | Cause | HTTP | User Message | Action |
|---|---|---|---|---|
| Wrong credentials | User entered iCloud password instead of app-specific | 401 | "Invalid credentials. Make sure you're using an app-specific password, not your iCloud password." | Show on connect form |
| Password revoked | User changed Apple ID password → all app-specific passwords auto-revoked | 401 | "Your app-specific password was revoked. Create a new one and reconnect." | Show on calendar sync card + detail |
| 2FA not enabled | Apple requires 2FA for app-specific passwords | 401/403 | "Two-factor authentication required. Enable it in Apple ID settings." | Show on connect form |
| Server unreachable | caldav.icloud.com down or network | timeout | "Could not connect to Apple Calendar. Check your connection." | Retry button |

**Key difference from Google:** Apple CalDAV has NO automatic token refresh. If app-specific password is revoked (happens when user changes Apple ID password), user MUST manually create a new one and re-enter. More friction than Google OAuth refresh.

### Sync Rules
- External events imported anonymized (title only, no details — privacy)
- App events (approved training events) pushed to external calendar
- Bidirectional sync
- External events block availability for booking (treated as busy slots)
- External conflicts shown side-by-side in calendar view

### Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/google-calendars/` | Initiate Google OAuth connection |
| GET | `/google-calendars/` | List connected Google accounts + calendars |
| PATCH | `/google-calendars/{id}/` | Update calendar sync preferences |
| DELETE | `/google-calendars/{id}/` | Disconnect Google account |
| POST | `/apple-calendars/` | Connect Apple CalDAV (email + password) |
| GET | `/apple-calendars/` | List connected Apple account + calendars |
| DELETE | `/apple-calendars/{id}/` | Disconnect Apple account |

## System Tasks

**Calendar Sync (silent, no push):**
- On event create/cancel/reschedule → sync to external calendar
- Webhook listener for Google Calendar changes
- 15-min periodic sync fallback (Celery Beat)
- External events fetched and stored as anonymized blocks

## UI Patterns

- **Brand icons:** Google Calendar + Apple Calendar SVGs from `design-tokens/assets/icons/`
- **Provider cards:** set-card with 36px icon container
- **Calendar selection:** selectable rows (`cal-select-row`) with color dots
- **Destructive action:** trash icon in header → confirmation sheet (iOS) / AlertDialog (Android)
- **Password input:** `fit-input-password` with eye toggle inside
- **Toast:** success (green, top), error (red, top)
- **Loading:** spinner + "Fetching calendars..." text, card not tappable

## FitUI Components Used

All screens in this flow use components from the `FitUI` Swift Package (`design-tokens/swift/FitUI/`).

### Screen → Component Mapping

**Settings screen:**
| Component | Usage |
|---|---|
| `FitSettingsCard` | Each settings item (icon + title + subtitle + chevron) |
| `FitHeader` | Back + "Settings" title |
| `FitButton` | Not used (no primary action) |

**Calendar Sync screen:**
| Component | Usage |
|---|---|
| `FitSettingsCard` | Account cards (Google/Apple provider cards) |
| `FitBadge` | `.error` style for "Sync error" badge |
| `FitToast` | `.success` for "Google Calendar connected" |
| `FitHeader` | Back + "Calendar Sync" |

**Google/Apple Calendar Detail:**
| Component | Usage |
|---|---|
| `FitSelectRow` | Calendar toggle rows (color dot + name + checkmark) |
| `FitHeader` | Back + title + `FitDestructiveHeaderButton` (trash icon) |
| `FitButton` | `.primary` for Save, `.destructive` for Disconnect (in sheet) |
| `FitBadge` | Not used |
| `FitToast` | `.error` for sync failure banner (optional) |

**Apple CalDAV Connect:**
| Component | Usage |
|---|---|
| `FitInput` | Apple ID (`keyboardType: .emailAddress`, `submitLabel: .next`) |
| `FitInput` | Password (`isSecure: true`, `submitLabel: .go`) |
| `FitButton` | `.primary` for Connect |
| `FitToast` | `.error` for "Invalid credentials" |
| `FitHeader` | Back + "Apple Calendar" |

### Theme

```swift
// Coach settings
SettingsView()
    .fitTheme(.coach)  // dark

// Athlete settings
SettingsView()
    .fitTheme(.athlete)  // light
```

### Example Usage

```swift
// Settings card
FitSettingsCard("Calendar Sync", subtitle: "Google connected") {
    Image(systemName: "arrow.triangle.2.circlepath")
} action: {
    navigator.push(.calendarSync)
}

// Calendar select row
FitSelectRow("Personal", dotColor: Color(hex: "4285F4"), isSelected: calendar.isEnabled) {
    viewModel.toggleCalendar(calendar)
}

// Apple ID input
FitInput("Apple ID", text: $appleId, placeholder: "your@icloud.com",
         keyboardType: .emailAddress, submitLabel: .next)

// Error toast
FitToast("Invalid credentials", style: .error, isVisible: $showError)

// Destructive header
FitHeader("Google Calendar") {
    FitDestructiveHeaderButton { showDisconnectSheet = true }
}
```

## Platform Differences

| Feature | iOS | Android |
|---|---|---|
| Google connect | GoogleSignIn SDK | Google Sign-In SDK |
| Apple connect | CalDAV (same) | CalDAV (same) |
| Disconnect confirmation | Bottom sheet | AlertDialog |
| Keyboard types | emailAddress, default | textEmailAddress, text |
