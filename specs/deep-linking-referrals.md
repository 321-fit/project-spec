# Deep Linking & Referrals

> Last updated: 2026-04-02

## Overview
The app uses AppsFlyer OneLink for deep linking and referral tracking. Coaches can invite athletes via shareable links, and users can share training session invites. The referral system tracks who invited whom.

## Current State
Fully implemented in iOS and backend.

## Components

### Backend
- Referral endpoints: `entry/rest/v1/endpoints/other/referral.py`
- Referral handlers: `app/handlers/rest/user/referrals.py`
- DB tables: `referral_token`, `referral_connection`
- Entities: `domain/entities/referral.py`

### iOS
- Deep link types: `Core/Deeplink/DeeplinkType.swift`
- Share service: `Core/Deeplink/ShareLinksService.swift`
- Invite models: `Core/Deeplink/Models/`
- AppDelegate handler: `App/AppDelegate.swift`
- Invite UI: `ProfileTab/Settings/Options/InviteFriend/`
- Invite preview: `TabBar/Tabs/ClientsTab/Invite/Preview/`

### Android (Planned)
- Same AppsFlyer SDK integration
- Same deep link types and handling
- Android App Links instead of Universal Links

## Deep Link Types

```swift
enum DeeplinkType: String, Codable {
    case inviteUser              // "invite_user" — coach invites athlete to platform
    case inviteUserReferral      // "invite_user_referral" — referral with token
    case inviteToTrainingSession // "invite_to_training_session" — invite to specific session
}
```

## Deep Link Parameters

### Invite User
| Parameter | AppsFlyer Key | Description |
|---|---|---|
| type | `pid` | Deep link type |
| userID | `deep_link_value` | Inviter's user ID |
| userName | `deep_link_sub1` | Inviter's name |
| userRole | `deep_link_sub2` | Inviter's role |
| referralToken | `deep_link_sub3` | Optional referral token |

### Invite to Training Session
Same as above plus:
| Parameter | AppsFlyer Key | Description |
|---|---|---|
| sessionToken | `deep_link_sub4` | Training session invite token |

## Deep Link Flow

### Direct Deep Link (App Installed)
```
User taps link → AppsFlyer SDK → AppDelegate.didResolveDeepLink()
    ↓
Parse parameters (type, userID, userName, userRole, sessionToken, referralToken)
    ↓
UserManager.updateInviteInfo() → store in UserDefaults
    ↓
AppFlowManager.onInviteDeeplinkUpdate() → navigate to appropriate screen
```

### Deferred Deep Link (App Not Installed)
```
User taps link → App Store → Install → First launch
    ↓
AppsFlyer conversion data callback → check is_first_launch
    ↓
Same parameter extraction → store → navigate after onboarding
```

## AppsFlyer Configuration

- **Custom URL scheme:** `threetwooneapp://`
- **Associated domains:** `applinks:321fit.onelink.me` (production)
- **ATT authorization delay:** 60 seconds
- Dev key, App ID, OneLink ID configured in AppDelegate

## Share Link Generation

### `ShareLinksService.inviteUserDeeplink()`
Generates a shareable invite link with user info encoded as AppsFlyer parameters.

### `ShareLinksService.inviteToTrainingSessionDeeplink()`
Same as above plus training session token for session-specific invites.

## Referral System

### How It Works
1. User generates referral link (Settings → Invite Friend)
2. Link contains referral token
3. New user clicks link → installs app → completes onboarding
4. Backend records referral connection
5. Inviting coach receives push: "Great news! {name} just onboarded to 321.fit. Ready to train?"

### Backend Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/referral-token` | Get or create user's referral token |
| GET | `/process-referral` | Get referral token (alternate) |
| POST | `/process-referral` | Use a referral token |

### Data Model

**ReferralToken:**
| Field | Description |
|---|---|
| token | Unique referral code (string) |
| user_profile_id | Token owner |

**ReferralConnection:**
| Field | Description |
|---|---|
| referrer_profile_id | Who invited |
| referee_profile_id | Who was invited |
| token_used | Which token was used |

### Business Rules
- Each user gets one unique referral token
- Self-referral prevented
- User can only use one referral token (can't be referred twice)
- Referral count tracked (handler returns count)

## Invite UI

### Settings → Invite Friend
**Location:** `ProfileTab/Settings/Options/InviteFriend/`
- Generate and share referral link
- System share sheet (iOS native)
- Separate views for athlete and coach roles

### Client Tab → Invite Preview
**Location:** `TabBar/Tabs/ClientsTab/Invite/Preview/`
- Preview of invite before sharing
- `InviteInput` struct with all deep link parameters

## State Management

- Invite data stored in UserDefaults via `@Storage` wrapper
- Exposed as `@Published` property on `UserManager`
- `AppFlowManager` listens for invite updates to trigger navigation
- Invite data persists across app restarts (deferred deep links)

## Known Issues / Tech Debt
- `refferalToken` typo in `InviteUserDeeplinkModel` (double 'f')
- `InviteToTrainingSessionDeeeplinkModel` typo (triple 'e')
- No referral rewards implemented yet (tracking only)
- Deep link routing could be more granular (some links go to default screen)

## Platform notes

**Native UI conventions:** see [architecture/design-system.md § Native theming contract](../architecture/design-system.md#native-theming-contract). Don't duplicate cross-platform UI rules here — only platform-specific deviations below.
