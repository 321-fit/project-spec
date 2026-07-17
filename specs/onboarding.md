# Onboarding

> Status: Implemented (iOS) · Prototype refreshed 2026-05-20
> Prototype: [shared/onboarding.html](../prototypes/flows/shared/onboarding.html)
> Last updated: 2026-05-20

## Overview
Post-registration wizard that collects user profile data. The flow differs based on user role — coaches have additional steps for gym locations and training sessions.

---

## User Stories

### Athlete

- As a new athlete, I want a short, focused onboarding (4 steps) so that I can start using the app within a minute of signing up.
- As a new athlete, I want to add a profile photo + a short bio so coaches can see who they'll be training.
- As an athlete, I want to pick the sports I'm interested in so the marketplace shows me relevant coaches.
- As an athlete, I want my time zone and country pre-filled from device settings so I'm not entering data the app already knows.
- As an athlete, I want to optionally connect Google / Apple Calendar at the end so my personal events block out my booking availability — but I want to skip it if I'm in a hurry (just tap Finish).

### Coach

- As a new coach, I want my onboarding to ask for everything a marketplace profile needs (photo + bio + sports + location + ≥1 gym + ≥1 bookable session + calendar sync) in one go (6 steps) so I don't have to come back later.
- As a coach, I want to add my training gym(s) by searching for them or picking on a map — same flow I'll use later in Settings — so I learn the location system once.
- As a coach, I want to create my first bookable session inline (without leaving the wizard) so my profile is immediately useful when admin approves it.
- As a coach, when I finish the wizard, I want a clear signal that my profile is now under review (no broken expectation that I can start coaching instantly).

### Both

- As a user, I want a clear progress indicator (`1 of 6` pill counter) so I know how much is left.
- As a user, I want to step BACK to fix any field on an earlier step — but never to step 1 (the account is already created at that point — there's nothing to unwind).
- As a user, I want validation feedback to be visible the moment I tap Confirm, not buried after a network roundtrip.

---

## System Stories

- As the backend, `POST /onboarding` marks the user as onboarded only after all required fields are present. Coaches additionally transition to `pending_admin_approval` for review queue.
- As the client, the onboarding flow is a **self-contained iOS module** (`Onboarding/`) — gym + session sub-flows are duplicated inside it (not handed off to Settings/Sessions screens), so the module has its own a11y identifier namespace (`onboarding.flow.*`) and ships with full error/loading/snackbar coverage.
- As the client, athlete branches at the end of step 3 (Location): athlete → step 4 Calendar Sync (final); coach → step 4 Gym Location → step 5 Training Session → step 6 Calendar Sync.
- As the client, the Calendar Sync step has NO explicit Skip button — tapping `Finish` completes the wizard without connecting any calendar, server-side onboarding is marked complete either way.
- As the client, on Finish:
    - Athlete → dashboard in `dst-welcome` state (the inline dashboard setup widget appears for any follow-up tasks).
    - Coach → dashboard in `dst-under-review` state (banner + optional boosts shown while admin reviews).
- As the backend, server emits `user.onboarded` event on completion. If the athlete was invited by a coach via deep link, that coach receives a push notification.
- As any service, phone OTP ownership verification happens at **signup**, NOT in onboarding (per [authentication.md § 2026-05-11 update](./authentication.md)). Onboarding does NOT re-verify phone.

---

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
| `requestOTPCode(phone)` | Phone verification | Send OTP — ownership proof; phone is also a login method (2026-05-11 "contact-only" reversed 2026-07-17) |
| `confirm(code, phone)` | Phone verification | Verify OTP code; attaches phone to the already-created account as a contact attribute |
| `setRole(UserRole)` | Role selection | Set athlete or coach role |
| `setOnboarding()` | Mark started | Begin onboarding flow |
| `setOnboardingCompleted()` | Mark completed | Finish onboarding |

Profile data is saved via standard profile update endpoints during each step.

> **Phone OTP role (updated 2026-07-17):** ownership verification + anti-spam. Phone **is** a usable login method as shipped (the 2026-05-11 "contact-only, never a login credential" line was reversed — see `authentication.md`). Phone is verified but **non-unique** across accounts (same phone may exist on multiple users), so it isn't a unique account key. Verification is not a hard app-entry gate.

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
