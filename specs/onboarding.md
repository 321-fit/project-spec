# Onboarding

> Last updated: 2026-04-02

## Overview
Post-registration wizard that collects user profile data. The flow differs based on user role — coaches have additional steps for gym locations and training sessions.

## Current State
Fully implemented in iOS and backend.

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
personalInfo → sports → avatarAndBio → location → gymLocations* → trainingSessions* → calendarSync
```
*Coach-only steps

### Step Details

| Step | Screen | Description | Both Roles |
|---|---|---|---|
| `personalInfo` | Personal Info | Gender, birthdate, weight, height | Yes |
| `sports` | Sport Selection | Choose sport specialties | Yes |
| `avatarAndBio` | Avatar & Bio | Profile photo upload, bio text | Yes |
| `location` | Location | Timezone, country, languages | Yes |
| `gymLocations` | Gym Locations | Add workout locations on map | Coach only |
| `trainingSessions` | Training Sessions | Create session templates (name, price, duration) | Coach only |
| `calendarSync` | Calendar Sync | Connect Google Calendar | Yes |

### Role Differences
- **Athlete:** 5 steps (personalInfo → sports → avatarAndBio → location → calendarSync)
- **Coach:** 7 steps (all above + gymLocations + trainingSessions)

## API Calls

| Method | Endpoint | Description |
|---|---|---|
| `requestOTPCode(phone)` | Phone verification | Send OTP during onboarding |
| `confirm(code, phone)` | Phone verification | Verify OTP code |
| `setRole(UserRole)` | Role selection | Set athlete or coach role |
| `setOnboarding()` | Mark started | Begin onboarding flow |
| `setOnboardingCompleted()` | Mark completed | Finish onboarding |

Profile data is saved via standard profile update endpoints during each step.

## Entry Points
- After new account registration (any auth method)
- After phone OTP creates new account
- User cannot skip onboarding — must complete all required steps

## Post-Onboarding
- If athlete was invited by coach via deep link → coach receives push notification: "Great news! {athlete_name} just onboarded to 321.fit. Ready to train?"
- User is redirected to main app (TabBar)

## Known Issues / Tech Debt
- Calendar sync step is optional but shown to all users
- No progress indicator showing which step user is on

## Platform notes

**Native UI conventions:** see [architecture/design-system.md § Native theming contract](../architecture/design-system.md#native-theming-contract). Don't duplicate cross-platform UI rules here — only platform-specific deviations below.
