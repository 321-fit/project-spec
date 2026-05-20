# Authentication & Login Security

> Status: Implemented (iOS + backend)
> Prototype: [flows/shared/auth.html](https://321-fit.github.io/project-spec/prototypes/flows/shared/auth.html)
> Related: [account-access.md](./account-access.md) (post-login account changes), [onboarding.md](./onboarding.md) (post-signup wizard)
> Last updated: 2026-05-20

## Overview
The authentication system allows users to create and access accounts using multiple login methods. Methods can be used independently or combined within a single account.

---

## User Stories

### Signup

- As a new user, I want to sign up with email + password, Apple, or Google so I can pick whichever account I already trust.
- As a new user, I want to verify my phone number once at signup so the platform can SMS me reminders — but I should NEVER be asked to log in with a phone number afterwards (phone is for outreach only, not a login credential).
- As a new user, after phone verification, I want to land in onboarding (not the main app), so the platform collects the profile data it needs.

### Login

- As a returning user, I want one screen with all three login methods (email+password, Apple, Google) so I don't have to remember which method I used last time — the screen just shows everything available.
- As a returning user, I want my session to persist across app restarts (JWT refresh) so I don't have to re-login every time I open the app.
- As a returning user, if I forget my password, I want to reset it via email — without losing any data on my account.

### Account safety

- As a user, I want to be warned if I'm about to remove my LAST login method (the one credential that gets me back in), so I don't accidentally lock myself out.
- As a user, I want to add additional login methods (link Apple to my existing email account, etc.) to my existing account so I have backup ways in.
- As a user, when I change a sensitive setting (email, password, social link), I want to re-authenticate first so a forgotten unlocked phone can't be hijacked into changing my account.

---

## System Stories

- As the backend, signup creates the account and returns JWT immediately. Phone verification happens as a follow-up step but does NOT block JWT issuance — the account exists in `phone_verified: false` state and the main app entry is gated by that flag.
- As the backend, email+password signup validates a strict password policy (see § Security Rules). Apple / Google signup verifies the OAuth/identity token against the provider's public keys and creates the account without a password.
- As the backend, the `user_social_auth` table allows multiple providers per account — the same user record can be linked to Apple, Google, and email+password simultaneously.
- As the backend, login endpoints return access + refresh tokens. Refresh token lives in keychain; access token rotated on every API call near expiry.
- As the backend, phone OTP endpoints (`POST /auth/phone/request`, `POST /auth/phone/verify`) are exposed ONLY for ownership verification at signup or phone-change — NOT for login. The legacy phone-OTP-as-login flow is removed from the UI (endpoints retained for backwards compatibility, behind a feature flag).
- As the backend, the "last method" rule enforces that the auth-provider count is ≥ 1 after any removal — attempting to remove the only remaining method returns 409. See § Security Rules + [account-access.md § Last-method safety](./account-access.md).
- As the client, re-authentication picker shows all of the user's currently-linked methods (not the original signup method) — so a user who signed up with email but later linked Apple can re-auth with either.
- As the voice assistant, all calls run under child JWT sessions issued by the iOS app — voice never holds primary credentials.

## 2026-05-11 update — phone removed as login method

Phone is **no longer a login credential**. It is now an outreach attribute only (notifications + SMS reminders + ownership-verified contact). Backend phone-OTP-as-login endpoints remain technically callable but the product surfaces them only for signup ownership verification, never for login. Concrete consequences:

- **Login methods** = Email+password + Apple + Google. **Phone is removed** from the supported methods table (rows below mark it as Deprecated as a login method, retained as a contact attribute).
- **Phone uniqueness constraint dropped.** Same phone may be set on multiple accounts (family/roommates sharing a number). Backend must not enforce a UNIQUE index on phone for users. The "phone already taken" 409 path is gone.
- **Phone OTP at signup** still fires — but only as **proof of ownership** (anti-spam, prevent attaching someone else's number). Verifying does not establish a login credential. **Mandatory step (2026-05-19): no "Skip for now"** — account stays in `phone_verified: false` state and is unusable (main app entry is blocked) until verification completes. If user kills the app mid-flow, next signin resumes at `s-phone-enter` automatically.
- **Phone changes/removal** no longer trigger re-auth (per `project_account_access_decisions` updated 2026-05-11). OTP is still required when saving a new phone (ownership re-verification), but no re-auth picker upstream.
- **Account Safety "last method" rule** applies only to email/Apple/Google. Phone removal is always safe.
- **Phone visibility** remains hidden between users (athletes don't see coach phone, coaches don't see athlete phone — even more important now that phones may overlap).

Sections below describe the **historical implementation** (passwordless phone OTP login). Treat them as informational about deployed code, not as forward-looking contract. The new contract is the bullets above + `project_account_access_decisions` memory.

## Current State
Fully implemented across iOS and backend. Voice assistant uses child JWT sessions for authentication. Backend phone OTP login endpoints exist but are not exposed by the UI as of 2026-05-11.

## Supported Authentication Methods

| Method | Status | Notes |
|---|---|---|
| Email + Password | Implemented | Registration, login, password reset |
| Phone Number (OTP) | Deprecated as login (2026-05-11) | Backend endpoints still exist for legacy reasons; UI no longer exposes phone as a sign-in option. Phone is now an outreach attribute, see § 2026-05-11 update. |
| Sign in with Apple | Implemented | Apple ID token verification |
| Sign in with Google | Implemented | Google OAuth2 (also used for Calendar sync scopes) |

> **Note:** Original spec only listed Apple. Google Sign-In was added during development and is fully functional.

## Components

### Backend
- Auth endpoints: `entry/rest/v1/endpoints/auth/`
- JWT middleware: `infra/auth/jwt_auth/middleware.py`
- Token generator: `infra/auth/jwt_auth/impls/token_generator.py`
- Google OAuth: `infra/services/google_oauth.py`
- Apple OAuth: `infra/services/apple_oauth.py`
- Twilio OTP: `infra/services/twilio.py`
- Social auth table: `user_social_auth` (provider: google, apple)

### iOS
- Auth types enum: `Authentication/AuthenticationAvailableTypes/AuthenticationAvailableTypes.swift`
  - Values: `apple`, `google`, `emailOrProne` (known typo — should be `emailOrPhone`)
- Apple Sign-In: `Authentication/API/External/Apple.swift`
- Google Sign-In: `Authentication/API/External/Google.swift`
- Email/Password: `Authentication/SignInWithCredentials/`
- Password Recovery: `Authentication/ForgotPassport/` (OTP flow)
- Auth service: `Authentication/API/AuthService/AuthNetworkService.swift`

### Voice Assistant
- Login via backend JWT: `POST /sessions/connect` accepts main app JWT
- Child sessions: `POST /api/v1.0.0/token/create-child-session/`
- Auto-refresh on 401

### Android (Planned)
- Same auth methods: Email, Phone OTP, Apple Sign-In, Google Sign-In
- Google Sign-In via Google Play Services (native)
- Apple Sign-In via web-based flow (Android limitation)
- Same JWT token pair management

## Unified Account Model

All authentication methods link to a single user account. An account may contain:
- Email address
- Password
- Phone number
- Apple authentication ID
- Google authentication ID

A user can authenticate using ANY of the methods linked to their account.

**Examples (after 2026-05-11):**
- User registers with email+password → adds phone for reminders → still logs in via email+password only
- User signs in with Apple → adds phone → still logs in via Apple only
- User signs in with Google → adds email+password → can login with Google or email+password
- *(Phone is never an example login surface — it's always an outreach attachment regardless of which login method was used to create the account.)*

## Auth Flows

### Email + Password Registration
1. User enters email and password
2. System sends email verification link
3. After verification, account becomes active
4. User proceeds to onboarding

### Phone OTP — current role (after 2026-05-11)

Phone OTP is **no longer a login or registration entry point.** It runs only during **signup ownership verification** (one mandatory onboarding step after the user has already created an account via email or social):

1. User enters phone number + country code (mandatory — no skip)
2. System sends OTP via Twilio SMS
3. User enters verification code
4. Phone is **attached** to the already-created account as a contact attribute; `phone_verified` flips to `true`
5. **Phone is non-unique** — if another account already has this phone, both accounts coexist; no 409 conflict
6. Until step 4 completes the account remains `phone_verified: false` and is **blocked from entering the main app** (signin resumes here on app restart)

> Historical (deprecated 2026-05-11): phone OTP previously acted as a unified login + registration flow ("if phone exists → login, if new → create account"). Backend endpoints still support this branch, but the product no longer surfaces it. New users always enter via email or social signup.

### Sign in with Apple
1. Apple returns unique Apple ID token
2. System creates or logs into associated account
3. Apple may provide real or relay email (privacy settings)
4. User can later add phone, password, or email

### Sign in with Google
1. Google returns OAuth2 token
2. System verifies token via Google API
3. Creates or logs into associated account
4. Also requests Calendar sync scopes (for Google Calendar integration)

### Token Management
- JWT access + refresh token pair
- Token format: `JWT {accessToken}` (iOS) / `Bearer {token}` also accepted
- Access token: short-lived (configurable)
- Refresh token: long-lived (configurable)
- On 401: auto-refresh via refresh token, retry request
- On refresh failure: force logout (`onForceLogoutUser`)

## Login & Security Settings

### Current Implementation (iOS)
The settings screen is named **"Account & Password"** (not "Login & Security" from spec).

**Location:** `ProfileTab/Settings/Options/CredentialsChange/`

**Available actions:**
- Change email address (with OTP verification)
- Change phone number (with OTP verification)
- Change password (requires current password if exists)
- Create password (if user has no password, e.g., social auth)
- Delete account

**Key behavior:**
- `isSocial: Bool` flag on UserObject determines if user registered via OAuth
- If `isSocial == true` and no password set → show "Create Password" option
- Phone number is nullable (optional field)

### Spec vs Implementation Gap
The spec describes a **"Login Methods"** screen showing statuses (Connected / Not Added / Not Set) for each auth method. This is **NOT currently implemented**. Instead, the app has:
- A simpler "Account & Password" screen
- Separate "Account Access" settings for managing linked sign-in methods

**Location:** `ProfileTab/Settings/Options/AccountAccess/`
- View linked authentication providers
- Add/remove sign-in methods

### Recommended Future State
Merge "Account & Password" and "Account Access" into a single "Login & Security" screen per original spec, with clear status indicators for each auth method.

## Adding Authentication Methods (Post-Registration)

### Add Phone Number
1. User enters phone number
2. System sends OTP
3. User verifies code
4. Phone linked to account

### Add Email Address
1. User enters email
2. System sends verification email/code
3. User confirms
4. User sets password
5. Email login enabled

### Add Google/Apple
- Via Account Access settings
- OAuth flow → link provider to existing account

## Security Rules

### OTP Protection
- OTP codes expire after 5 minutes
- Limited verification attempts
- Rate limiting on SMS requests
- After multiple failures: require new code or temporary block

### Account Safety
- User must ALWAYS have at least one **login method** connected (email+password, Apple, or Google)
- Cannot remove last remaining login method
- **Phone is NOT a login method** (post-2026-05-11) — phone removal is always permitted and never triggers last-method warnings
- Example: if only Apple connected → must add email or Google before disconnecting Apple. Phone presence/absence is irrelevant to this check.

### Account Deletion
- Available in settings
- Confirmation step required
- May require re-authentication

## Known Issues / Tech Debt
- `emailOrProne` typo in `AuthenticationAvailableTypes` enum (should be `emailOrPhone`)
- "Login & Security" screen from spec not fully implemented — split between two settings screens
- Email verification uses OTP-style flow (code), not traditional email link (spec says link)
- Google Sign-In not in original spec but is implemented and works

## Platform notes

**Native UI conventions:** see [architecture/design-system.md § Native theming contract](../architecture/design-system.md#native-theming-contract). Don't duplicate cross-platform UI rules here — only platform-specific deviations below.
