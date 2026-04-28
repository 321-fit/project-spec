# Calendar Sync

> Status: Draft
> Prototype: [settings.html](https://321-fit.github.io/project-spec/prototypes/flows/settings.html) ([source](https://321-fit.github.io/project-spec/prototypes/flows/settings.html))
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

## Icon Mapping

All icons are SF Symbols unless noted. Brand icons from `design-tokens/assets/icons/`.

### Settings Screen
| Element | Icon | Size |
|---|---|---|
| Edit personal info | Avatar (user photo or initials) | 24px |
| Invite a Coach/Friend | `plus.circle` | 24px |
| Sport types | `globe` | 24px |
| Training sessions | `calendar` | 24px |
| Available hours | `clock` | 24px |
| GYM locations | `mappin.circle` | 24px |
| Calendar Sync | `arrow.triangle.2.circlepath` | 24px |
| Balance | `banknote` | 24px |
| Stripe connect | "S" text (custom, brand blue) | 24px |
| Account Access | `lock` | 24px |
| Log out | `rectangle.portrait.and.arrow.right` | 24px |
| Chevron (all cards) | `chevron.right` | 12px weight medium |
| Back button (all headers) | `chevron.left` | 14px weight medium |
| Trash (disconnect) | `trash` | 14px |

### Calendar Sync Screen
| Element | Icon | Source |
|---|---|---|
| Google Calendar provider | `google-calendar.svg` | `design-tokens/assets/icons/` |
| Apple Calendar provider | `apple-calendar.svg` | `design-tokens/assets/icons/` |
| Add Google account "+" | `plus.circle` | SF Symbol |
| Loading spinner | `ProgressView()` | SwiftUI native |

### Google/Apple Detail
| Element | Icon |
|---|---|
| Calendar color dots | `Circle().fill(color)` — 10px |
| Checkmark (selected) | `checkmark` — 10px bold white |
| Error banner info | `exclamationmark.circle` — 16px |
| Retry/Reconnect | text button, no icon |

### Apple Connect
| Element | Icon |
|---|---|
| Info banner | `exclamationmark.circle` — 18px |
| Eye toggle (show) | `eye` — 18px |
| Eye toggle (hide) | `eye.slash` — 18px |
| Open Apple ID | `arrow.up.right.square` — 14px |
| Step numbers | Text "1." "2." "3." "4." in brand blue |

### Brand Icons in iOS
```swift
// Add to Asset Catalog or load from bundle:
// design-tokens/assets/icons/google-calendar.svg → GoogleCalendarIcon (Asset Catalog)
// design-tokens/assets/icons/apple-calendar.svg → AppleCalendarIcon (Asset Catalog)

Image("GoogleCalendarIcon")
    .resizable()
    .frame(width: 20, height: 20)
```

## Animations & Transitions

| Animation | Type | Duration | Easing |
|---|---|---|---|
| Bottom sheet appear | Slide up + fade overlay | 0.25s | easeOut |
| Bottom sheet dismiss | Slide down + fade overlay | 0.2s | easeIn |
| Toast appear | Slide down from top + fade | 0.2s | easeOut |
| Toast auto-dismiss | Fade out | 0.2s after 3s delay | easeIn |
| Select row toggle | Background color + checkmark opacity | 0.15s | easeInOut |
| Card press | Scale 0.98 | 0.1s | easeInOut |
| Spinner | Rotate 360° | 0.8s | linear infinite |
| Error border appear | Border color | 0.15s | easeInOut |
| Error border auto-clear | Border color + label color | 0.15s after 3s | easeInOut |

```swift
// SwiftUI examples:
withAnimation(.easeOut(duration: 0.25)) { showSheet = true }
withAnimation(.easeIn(duration: 0.2)) { showToast = false }

// Select row:
.animation(.easeInOut(duration: 0.15), value: isSelected)
```

## Screen Layout Specs

### Settings Screen Layout
```swift
ScrollView {
    VStack(spacing: 24) {        // gap between sections
        // Section
        VStack(alignment: .leading, spacing: 12) {  // gap between cards
            Text("Profile")
                .font(FitFont.sectionTitle)
                .foregroundColor(theme.textSecondary)
            
            FitSettingsCard("Edit personal info", subtitle: "Avatar, name...") { ... }
            FitSettingsCard("Invite a Coach", subtitle: "Recommend...") { ... }
        }

        // More sections...
    }
    .padding(16)
}
```

### Calendar Sync Layout
```swift
ScrollView {
    VStack(spacing: 12) {            // gap between cards
        // Account cards
        ForEach(googleAccounts) { account in
            FitSettingsCard(...)
        }

        // Add Google (dashed border)
        AddAccountButton()

        Divider()                    // between Google and Apple
            .background(theme.divider)

        // Apple card
        FitSettingsCard(...)
    }
    .padding(16)
}
```

### Google/Apple Detail Layout
```swift
VStack(spacing: 0) {
    // Scrollable content
    ScrollView {
        VStack(spacing: 16) {
            // Error banner (conditional)
            if syncError { ErrorBanner(...) }

            // Account info
            AccountInfoRow(email: "...", status: "Connected")

            // Calendar list
            VStack(alignment: .leading, spacing: 6) {
                Text("Select calendars to sync")
                    .font(FitFont.body2)
                    .foregroundColor(theme.textSecondary)

                ForEach(calendars) { cal in
                    FitSelectRow(cal.name, dotColor: cal.color, isSelected: cal.isEnabled) {
                        viewModel.toggle(cal)
                    }
                }
            }
        }
        .padding(16)
    }

    // Footer
    VStack(spacing: 0) {
        FitButton("Save", style: .primary) { viewModel.save() }
    }
    .padding(.horizontal, 20)
    .padding(.bottom, 40)  // safe area
}
```

### Apple Connect Layout
```swift
VStack(spacing: 0) {
    ScrollView {
        VStack(spacing: 0) {
            // Info banner
            InfoBanner("Apple Calendar uses CalDAV...")
                .padding(.horizontal, 20)
                .padding(.bottom, 20)

            // Inputs
            FitInput("Apple ID", text: $appleId,
                     placeholder: "your@icloud.com",
                     keyboardType: .emailAddress,
                     submitLabel: .next)
                .padding(.horizontal, 20)

            FitInput("App-specific password", text: $password,
                     isSecure: true,
                     submitLabel: .go)  // Go triggers Connect
                .padding(.horizontal, 20)

            // Steps (always visible)
            StepsGuide()
                .padding(.horizontal, 20)
        }
    }

    // Footer
    FitButton("Connect", style: .primary) { viewModel.connect() }
        .padding(.horizontal, 20)
        .padding(.bottom, 40)
}
```

## Navigation Flow

| From | Action | To | Transition |
|---|---|---|---|
| Settings | Tap Calendar Sync card | Calendar Sync | Push (navigation stack) |
| Calendar Sync | Tap Google account card | Google Detail | Push |
| Calendar Sync | Tap Apple Connect button | Apple Connect | Push |
| Calendar Sync | Tap "+ Add Google" | System Google Sign-In | Present (modal) |
| Google/Apple Detail | Tap back | Calendar Sync | Pop |
| Google/Apple Detail | Tap trash → confirm | Calendar Sync | Pop + toast "Disconnected" |
| Apple Connect | Tap Connect (success) | Calendar Sync | Pop + toast "Connected" |
| Apple Connect | Tap back | Calendar Sync | Pop |
| Google Detail | Tap Save | Stay (save in background) | Snackbar "Saved" |

```swift
// NavigationStack approach:
NavigationStack {
    SettingsView()
        .navigationDestination(for: Route.self) { route in
            switch route {
            case .calendarSync: CalendarSyncView()
            case .googleDetail(let account): GoogleDetailView(account: account)
            case .appleConnect: AppleConnectView()
            case .appleDetail(let account): AppleDetailView(account: account)
            }
        }
}
```

## String Catalog

All user-facing strings for this flow:

### Settings
```
"Settings"
"Profile"
"Edit personal info" / "Avatar, name, gender, height weight"
"Invite a Coach" / "Recommend the app to a friend"
"Invite a Friend" / "Recommend the app"
"Coaching"
"Sport types"
"Training sessions" / "Added %d"
"Available hours" / "Set when you're available"
"GYM locations" / "Added %d locations"
"Calendar Sync" / "Google connected" / "Not connected"
"Payments"
"Balance" / "€%d"
"Stripe connect" / "Not connected"
"Account"
"Account Access" / "Login and Security"
"Training"
"Choose a sport"
"Log out"
```

### Calendar Sync
```
"Calendar Sync"
"No calendars connected"
"Sync your external calendars to avoid scheduling conflicts."
"Google Calendar" / "Apple Calendar"
"Not connected"
"%@ connected" (email)
"%d of %d calendars synced"
"Failed to load calendars"
"⚠ Sync error"
"⚠ Reconnect required"
"Fetching calendars..."
"Add Google account"
"Connect"
"Google Calendar connected" (toast)
"Apple Calendar connected" (toast)
```

### Google/Apple Detail
```
"Google Calendar" / "Apple Calendar"
"Connected"
"Select calendars to sync"
"Save"
"Disconnect account"
"Disconnect Google Calendar?" / "Disconnect Apple Calendar?"
"%@ will be disconnected. Synced events will be removed from your schedule."
"Disconnect" / "Cancel"
"Could not load your calendars. Check your connection and try again."
"Last sync failed. Your events may be outdated."
"Your Google session has expired. Reconnect to resume syncing."
"Retry" / "Retry Sync" / "Reconnect"
"Syncing..."
"Your app-specific password was revoked. Create a new one and reconnect."
"Two-factor authentication required. Enable it in Apple ID settings."
"Password revoked" / "2FA required" / "Sync error"
"Create New Password"
"Open Apple ID Settings"
```

### Apple Connect
```
"Apple Calendar"
"Apple Calendar uses CalDAV, which requires an app-specific password instead of your iCloud password."
"Apple ID" / "your@icloud.com"
"App-specific password" / "xxxx-xxxx-xxxx-xxxx"
"How to create an app-specific password:"
"1. Go to account.apple.com"
"2. Sign in with your Apple ID"
"3. Sign-In and Security → App-Specific Passwords"
"4. Generate a password and paste it here"
"Open Apple ID Settings"
"Connect"
"Invalid credentials. Check your Apple ID and password."
```

## AI Agent Implementation Notes

When implementing this flow with AI-assisted coding (Claude Code):

1. **Import FitUI** package first — all components ready to use
2. **Set theme** on root view: `.fitTheme(.coach)` or `.fitTheme(.athlete)`
3. **Use FitUI components** from the mapping table above — don't create custom versions
4. **Follow layout specs** — copy VStack/spacing structure from Screen Layout section
5. **Use NavigationStack** — routes defined as enum, destinations via `.navigationDestination`
6. **Brand icons** — add SVGs from `design-tokens/assets/icons/` to Asset Catalog as PDF/SVG
7. **Strings** — use String Catalog section above, prepare for localization with `NSLocalizedString`
8. **Error handling** — follow error state tables, check API codes, show appropriate banner/toast
9. **Keyboard** — set `keyboardType` and `submitLabel` per input from Keyboard Behavior table
10. **Animations** — use durations from Animations table, always `withAnimation`

## Platform Differences

**Native UI conventions:** see [architecture/design-system.md § Native theming contract](../architecture/design-system.md#native-theming-contract). Don't duplicate cross-platform UI rules here — only platform-specific deviations below.

| Feature | iOS | Android |
|---|---|---|
| Google connect | GoogleSignIn SDK | Google Sign-In SDK |
| Apple connect | CalDAV (same) | CalDAV (same) |
| Disconnect confirmation | Bottom sheet | AlertDialog |
| Keyboard types | emailAddress, default | textEmailAddress, text |
