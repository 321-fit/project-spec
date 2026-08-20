# Authentication & Login Security

> Status: Implemented (iOS + backend)
> Prototype: [flows/shared/auth.html](https://321-fit.github.io/project-spec/prototypes/flows/shared/auth.html)
> Related: [account-access.md](./account-access.md) (post-login account changes), [onboarding.md](./onboarding.md) (post-signup wizard)
> Last updated: 2026-08-20

## Overview
The authentication system allows users to create and access accounts using multiple login methods. Methods can be used independently or combined within a single account.

---

## User Stories

### Signup

- As a new user, I want to sign up with email + password, Apple, Google, or phone number so I can pick whichever method is easiest for me.
- As a new user, I want to verify my phone number at signup so the platform can SMS me reminders and I can also use that phone as a way back into my account.
- As a new user, after phone verification, I want to land in onboarding (not the main app), so the platform collects the profile data it needs.

### Login

- As a returning user, I want one screen with all login methods (email+password, Apple, Google, phone) so I don't have to remember which method I used last time — the screen just shows everything available.
- As a returning user, I want my session to persist across app restarts (JWT refresh) so I don't have to re-login every time I open the app.
- As a returning user, if I forget my password, I want to reset it via email — without losing any data on my account.

### Account safety

- As a user, I want to be warned if I'm about to remove my LAST login method (the one credential that gets me back in), so I don't accidentally lock myself out.
- As a user, I want to add additional login methods (link Apple to my existing email account, etc.) to my existing account so I have backup ways in.
- As a user, when I change a sensitive setting (email, password, social link), I want to re-authenticate first so a forgotten unlocked phone can't be hijacked into changing my account.

---

## System Stories

- As the backend, signup creates the account and returns JWT immediately. Phone verification happens as a follow-up step but does NOT block JWT issuance. There is **no `phone_verified` backend flag and no hard app-entry gate** — verification is a client-side/optional step (the app may prompt for it, but the backend does not block usage on it).
- As the backend, email+password signup validates a strict password policy (see § Security Rules). Apple / Google signup verifies the OAuth/identity token against the provider's public keys and creates the account without a password.
- As the backend, the `user_social_auth` table allows multiple providers per account — the same user record can be linked to Apple, Google, and email+password simultaneously.
- As the backend, login endpoints return access + refresh tokens. Refresh token lives in keychain; access token rotated on every API call near expiry.
- As the backend, phone OTP endpoints are exposed both for signup/login via phone (`POST /onboarding/phone-number/request`, `POST /onboarding/phone-number/verify`) and for linking/verifying a phone on an existing account (`/me/login-methods/phone/*`). Phone is a first-class login method as shipped.
- As the backend, the "last method" rule enforces that the auth-provider count is ≥ 1 after any removal — attempting to remove the only remaining method returns 409. See § Security Rules + [account-access.md § Last-method safety](./account-access.md).
- As the client, re-authentication picker shows all of the user's currently-linked methods (not the original signup method) — so a user who signed up with email but later linked Apple can re-auth with either.
- As the voice assistant, all calls run under child JWT sessions issued by the iOS app. **Note (hardening TODO):** child-session tokens are currently **full-credential** pairs with no reduced scoping — voice effectively holds primary credentials. Scoping child sessions down is a security-hardening item, not a shipped guarantee.

## 2026-07-17 update — phone remains a login method (reverses the 2026-05-11 "contact-only" decision)

An earlier decision (2026-05-11) proposed demoting phone to a contact-only attribute, removed as a login method. **That decision was never implemented on backend or iOS and is now reversed to match shipped reality.** Phone **is** a first-class login/signup method as shipped. Concrete state:

- **Login methods** = Email+password + Apple + Google + **Phone (OTP)**. Phone appears in the supported methods table and in `/me/login-methods`.
- **Phone is non-unique.** The same phone may be set on multiple accounts (family/roommates sharing a number); there is **no 1-phone-1-account UNIQUE constraint**. The "phone already taken" 409 path does not apply.
- **Phone OTP** is used both at signup/login (phone as an entry method) and when linking a phone to an existing account. Verifying establishes a usable login credential.
- **Phone verification is not a hard gate.** There is **no `phone_verified` backend column** and no mandatory app-entry block. The signup step may prompt for verification client-side and can be skipped; the account is fully usable regardless.
- **Phone visibility** remains hidden between users (athletes don't see coach phone, coaches don't see athlete phone — especially since phones may overlap).

## Current State
Auth core (email+password, Apple, Google, phone-OTP) is shipped across iOS and backend. Voice assistant uses child JWT sessions for authentication (full-credential — see § System Stories). Phone OTP login/signup is exposed in the UI. The mandatory phone-verification gate described in earlier drafts was **never built** (no backend flag, iOS allows Skip) — treat it as not-shipped, not as contract.

## Supported Authentication Methods

| Method | Status | Notes |
|---|---|---|
| Email + Password | Implemented | Registration, login, password reset |
| Phone Number (OTP) | Implemented | Signup/login + link-to-account via Twilio OTP. Phone is **non-unique** across accounts. See § 2026-07-17 update. |
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
- User registers with email+password → adds phone → can log in via email+password or phone OTP
- User signs in with Apple → adds phone → can log in via Apple or phone OTP
- User signs in with Google → adds email+password → can login with Google or email+password
- User signs up with phone OTP → later adds email+password → can log in via either

## 2026-08-20 — one screen per mode, not two

**The method picker is removed.** Sign-up and sign-in each had two screens: a chooser
(*Continue with email / Apple / Google*) and then, behind the email button, the actual
form. The chooser asked the user to pick a door before showing any, and its primary
button led straight to the form anyway.

**Now:** role pick → **one screen**. Email and password are the screen; the providers sit
below them under an *or continue with* rule; the footer switches to the other mode. Same
shape for both, and `Forgot password?` stays directly under the Sign in button.

This does not change the spec's intent — it **delivers** the user story that was already
approved above: *"As a returning user, I want one screen with all login methods … the
screen just shows everything available."* The prototype had two.

**Three details fixed with it:**
- **No field labels** on the auth form. Both fields are named by one word, so a label
  above a placeholder saying the same thing is the label twice. The rule: *the label or
  the placeholder names the field, never both.* Labels stay where the placeholder is a
  format hint rather than a name (phone number, the recovery screens).
- **No "repeat password".** A second field to catch a typo the eye toggle already
  catches, on a password recoverable by email.
- **No password-rules list on arrival**, on **both** screens that take a password —
  sign-up and *Set a new password*. Three grey circles above the CTA, before anything has
  been typed, crowd the one thing the screen is for; the list appears when a rule actually
  passes or fails. The reset screen was briefly given an exception ("there the whole screen
  is the password") and it was withdrawn: an exception has to be worth what it costs, and
  this one cost the same field behaving differently in two places.
- **`Forgot password?` sits under the password field**, right-aligned. It is about that
  field; below the CTA it read as an afterthought to signing in.

### Resolved: the auth layout (2026-08-20)

Four candidates were drawn side by side on the board — wide provider buttons, provider
circles, everything vertically centred, and top-anchored with the vertical rhythm
doubled. **Adopted: the last, with circles.** The other three are deleted rather than
parked, so the prototype has one answer per screen.

**Why not centred**, which was the initial instinct and looks best standing still: on a
sign-in screen the keyboard is up within a second, and a centred block has to move to make
room — the first thing the screen does is jump ~240px and push the providers under the
keyboard. It also puts the CTA at a different height on every screen, since the height
depends on the content, so sign-in and sign-up stop agreeing on where "the button" is.
Both auth screens carry a **Keyboard open** state; on the adopted layout nothing moves.

**Why the screen looked empty was rhythm, not anchoring.** The reference everyone points
at has its heading in the top fifth, same as ours — it looks full because its type is big,
its fields are tall and its groups are far apart. Ours was top-anchored *and* tight, and
only the first half was getting the blame. Adopted values: heading 30px starting 44px
down, fields 60px with a **tight 13px gap between them**, seams between groups roughly
doubled, circles 60px, CTA left at the kit's standard 50px.

The correction that made it work: the air belongs **between groups, not inside one**. Two
fields are one group, so widening the gap between them pulled the form apart rather than
giving it rhythm — and the CTA did not need to grow to keep up with a bigger heading.

**Cost, measured after the correction:** the provider row ends **664px** from the top
against 601 in the tight version, the CTA **505** against 458 — most of the earlier
overshoot (698 / 539) came from the inflated field gap and button, not from the rhythm.
Fits with room on 390×844; on an SE-class 667pt screen the CTA clears comfortably and the
circles sit right at the fold.

### The sign-in subtitle states the remembered method

It used to read *"Use the email and password you signed up with, or a connected
provider"* — a sentence that tells a returning user nothing. It now says **"Last time you
signed in with Apple."**

The sentence and the teal ring on the provider circle are **two signals for one fact**,
driven by one attribute, so they cannot disagree. Four cases, all in the prototype under
*Last: …*:

| remembered method | subtitle | ring |
|---|---|---|
| Apple / Google | names the provider | on that circle |
| email + password | "…with your **email**." | none |
| **not known** | "Sign in to get back to your training." | none |

**The unknown case is the one to build carefully** — first run, cleared storage, new
device. Both signals disappear rather than guessing; a screen that invents a memory it
does not have is worse than one that says nothing. Backend/client note: this needs the
last-used method persisted **on the device**, not on the account, since it is a fact about
this install.

**⚠️ Open, raised by the change:** when the remembered method is a provider, the email form
is still the loudest thing on the screen while the real path is a small circle near the
floor. Either the remembered provider gets promoted when known, or the sentence is doing a
job the layout contradicts. Not designed — it changes the screen's hierarchy.

**Providers are circles.**

They buy the providers no longer competing with the CTA: two wide buttons under a
gradient button read as three offers of similar weight, two circles read as "and these
also exist". The screen gets shorter and the email path is unmistakably the main one.

**Two objections against them were withdrawn** after review, and they were the weaker
half of the case: *"the words go"* — the *or continue with* rule already sits above the
row and names what these are, so the per-button label was saying it twice; and *"a third
provider will not fit"* — it is another circle, and the row grows sideways where the wide
stack grows downward, so it scales better rather than worse. What remains is narrow: a
future provider whose mark is not recognisable on sight.

**Last used is a ring around the circle**, not a dot beside it — the dot was a second
object to decode next to the thing it described. `aria-label` carries the state in words,
so colour is not the only signal.



**⚠️ Implementation drift, not filed:** the live **Android** build still shows a
`Repeat password` field on sign-up, and still routes through the method picker. iOS
matches the old two-screen shape as well. Screens: `s-signup-email`, `s-signin-email`;
`s-signup-entry` and `s-signin-entry` no longer exist.

---

## Auth Flows

### Email + Password Registration
1. User enters email and password
2. System sends email verification link
3. After verification, account becomes active
4. User proceeds to onboarding

### Phone OTP — login / signup (shipped)

Phone OTP is a usable login and signup entry point (as shipped), via `POST /onboarding/phone-number/request` + `/verify`:

1. User enters phone number + country code
2. System sends OTP via Twilio SMS
3. User enters verification code
4. If a matching account exists → log in; if new → create the account
5. **Phone is non-unique** — the same phone may exist on multiple accounts, so phone-entry disambiguates by the OTP round-trip; no 409 "phone taken" conflict
6. There is **no mandatory `phone_verified` gate** — a user can proceed into the app whether or not they completed a phone-verification prompt

A phone can also be **linked** to an already-created (email/social) account via `/me/login-methods/phone/*`, adding it as a backup login method.

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
- User must ALWAYS have at least one **login method** connected (email+password, Apple, Google, or phone)
- Cannot remove last remaining login method
- **Phone IS a login method** — if it's the only remaining method, removing it is subject to the same last-method protection
- Example: if only Apple connected → must add another method before disconnecting Apple.

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
