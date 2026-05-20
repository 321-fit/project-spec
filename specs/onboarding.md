# Onboarding

> Status: Implemented (iOS) · Prototype refreshed 2026-05-20
> Prototype: [shared/onboarding.html](../prototypes/flows/shared/onboarding.html)
> Last updated: 2026-05-20

## Overview
Post-registration wizard that collects user profile data. The flow differs based on user role — coaches have additional steps for gym locations and training sessions.

## Current State
Fully implemented in iOS and backend. Prototype matches the live iOS structure (6 coach / 4 athlete steps) with two open deltas for iOS to follow up on: sport-section taxonomy and the `Home City` field on the Location step (both already in the prototype; iOS to catch up).

## Components

### Backend
- Onboarding endpoints: `POST /onboarding` — complete onboarding
- Role setup: handled during auth flow
- Profile update endpoints used during onboarding steps

### iOS
- Onboarding module: `Onboarding/`
- Flow enum: `Onboarding/OnboardingFlow.swift`
- API: `Onboarding/API/OnboardingNetworkService.swift`

### Android (Planned)
- Same step-by-step flow as iOS
- Same API calls

## Onboarding Steps

### Flow Enum (`OnboardingFlow`)
```
personalData → sports → location → gymLocations* → trainingSessions* → calendarSync
```
*Coach-only steps

### Step Details

| # | Step | Screen title (iOS) | Fields | Both Roles |
|---|---|---|---|---|
| 1 | `personalData` | Personal data | Avatar + First Name + Last Name + Bio (About Me) | Yes |
| 2 | `sports` | What sports do you coach? / train? | Multi-select tile grid, sectioned by category | Yes |
| 3 | `location` | Location | Time Zone, Home Location (country), **Home City**, Languages | Yes |
| 4 | `gymLocations` | Gym Location | List of gym locations + Add Gym Location CTA → canonical locations flow | Coach only |
| 5 | `trainingSessions` | Training Session | List of session cards + Add Training Session → inline Training Session Setup sub-screen (Name, Sport Type, Location, Duration wheel, Price, Cash/Card toggle) | Coach only |
| 6 | `calendarSync` | Google Calendar Sync | Google + Apple Connect rows; multi-account supported via "Add Google Account" once one is connected | Yes |

### Role Differences
- **Athlete:** 4 steps (personalData → sports → location → calendarSync)
- **Coach:** 6 steps (personalData → sports → location → gymLocations → trainingSessions → calendarSync)

### Header chrome
Every top-level wizard step: circular back button (left, disabled on step 1) · centered title · teal-outlined pill step counter (right, e.g. `1 of 6`). No progress bar — the pill counter is the single progress affordance. Footer CTA is `Confirm` on every step except the last (`Finish`).

Sub-screens pushed from a step (gym add-flow, session create-form) use canonical `.fit-header` (back chevron + left-aligned title) — no pill counter — to signal the user is inside a nested flow.

### Self-contained module — no hand-offs (2026-05-20)
The onboarding module ships as its own self-contained iOS module. Sub-flows that exist canonically elsewhere (gym location creation in `coach/locations.html`, session creation in `coach/sessions.html`) are **duplicated** into the onboarding module rather than handed off, so:
- Onboarding has its own a11y identifier namespace (`onboarding.flow.*`) that doesn't collide with the corresponding Settings/Sessions namespaces.
- All error states, snackbars and validation are wired inside the onboarding module — readers don't need to context-switch to other screens to understand the full flow.
- The module owns its own routing and back-stack inside the wizard scope.

Sub-screens covered:
- **Gym Location (step 4)** sub-flow — 5 sub-screens: search (`s-onb-gym-map`), pick-on-map (`s-onb-gym-pick`), in-person details (`s-onb-gym-form`), online (`s-onb-gym-online`), home visit (`s-onb-gym-homevisit`). All re-namespaced under `onboarding.flow.gym.*`.
- **Training Session (step 5)** sub-flow — 1 sub-screen with bottom-sheets and snackbar: create form (`s-onb-session-create`) with full Personal/Group toggle, recurring/one-off schedule, time-slot picker, payment method. Re-namespaced under `onboarding.flow.session.create.*`.

Edit flows for both (after the first item is created) reuse the same sub-screens with prefilled values.

### What is intentionally NOT collected here (2026-05-20)
Earlier drafts of this spec included `gender`, `date of birth`, `weight`, `height` on the personal step. These were dropped to keep the funnel lean — live iOS already ships without them, and the marketplace can function without these signals at signup. Collect later in Settings (gender / DOB) or via athlete-specific nudge (weight / height for training-load features).

## API Calls

| Method | Endpoint | Description |
|---|---|---|
| `requestOTPCode(phone)` | Phone verification | Send OTP during onboarding — **ownership proof, not login** (post-2026-05-11) |
| `confirm(code, phone)` | Phone verification | Verify OTP code; attaches phone to the already-created account as a contact attribute |
| `setRole(UserRole)` | Role selection | Set athlete or coach role |
| `setOnboarding()` | Mark started | Begin onboarding flow |
| `setOnboardingCompleted()` | Mark completed | Finish onboarding |

Profile data is saved via standard profile update endpoints during each step.

> **Phone OTP role (post-2026-05-11):** anti-spam ownership verification only. Account creation happens via email+password or social signup BEFORE this step. Phone is attached as an outreach attribute; it never establishes a login credential. Phone is required and verified, but non-unique across accounts (same phone may exist on multiple users).

## Entry Points
- After new account registration via email+password or social (Apple / Google)
- User cannot skip onboarding — must complete all required steps

## Post-Onboarding
- If athlete was invited by coach via deep link → coach receives push notification: "Great news! {athlete_name} just onboarded to 321.fit. Ready to train?"
- User is redirected to main app (TabBar)

## Known Issues / Tech Debt
- Calendar sync step is optional but shown to all users
- No progress indicator showing which step user is on

## Platform notes

**Native UI conventions:** see [architecture/design-system.md § Native theming contract](../architecture/design-system.md#native-theming-contract). Don't duplicate cross-platform UI rules here — only platform-specific deviations below.
