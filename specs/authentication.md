# Authentication & Login Security

> Last updated: 2026-04-02

## Overview
The authentication system allows users to create and access accounts using multiple login methods. Methods can be used independently or combined within a single account.

## Current State
Fully implemented across iOS and backend. Voice assistant uses child JWT sessions for authentication.

## Supported Authentication Methods

| Method | Status | Notes |
|---|---|---|
| Email + Password | Implemented | Registration, login, password reset |
| Phone Number (OTP) | Implemented | Passwordless via Twilio SMS |
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

**Examples:**
- User registers with phone → later adds email/password → can login with either
- User signs in with Apple → adds phone → can login with either
- User signs in with Google → adds email/password → can login with either

## Auth Flows

### Email + Password Registration
1. User enters email and password
2. System sends email verification link
3. After verification, account becomes active
4. User proceeds to onboarding

### Phone OTP (Login & Registration Unified)
1. User enters phone number + country code
2. System sends OTP via Twilio SMS
3. User enters verification code
4. **If phone exists** → login to existing account
5. **If phone is new** → create account → proceed to onboarding

> Phone login and registration use the same flow — no separate screens needed.

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
- User must ALWAYS have at least one login method connected
- Cannot remove last remaining login method
- Example: if only phone connected → must add email before phone can be removed

### Account Deletion
- Available in settings
- Confirmation step required
- May require re-authentication

## Known Issues / Tech Debt
- `emailOrProne` typo in `AuthenticationAvailableTypes` enum (should be `emailOrPhone`)
- "Login & Security" screen from spec not fully implemented — split between two settings screens
- Email verification uses OTP-style flow (code), not traditional email link (spec says link)
- Google Sign-In not in original spec but is implemented and works
