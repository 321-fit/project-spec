# Account Access

> Status: Draft
> Prototype: [account-access.html](https://321-fit.github.io/project-spec/prototypes/flows/shared/account-access.html)
> Related spec: [authentication.md](./authentication.md) — covers login/signup flows
> Last updated: 2026-04-24

## Overview

**Account Access** is the post-login module for managing identity and account lifecycle. A user accesses it from Settings ("Account Access" row) once authenticated. It covers:

- Managing sign-in methods (phone, email+password, Apple, Google)
- Re-authentication before sensitive changes
- Account deletion with blocker checks
- Support fallback when users can't self-serve

Account Access is **shared** between coach and athlete roles — identity management is role-agnostic.

## Current State

**Prototype built** (2026-04-24). No backend or iOS implementation yet. `authentication.md` covers the login side; this spec covers the account-management side post-login.

Some endpoints re-used from auth module (OTP request, password reset). New endpoints needed for account deletion, re-auth token issuance, method disconnect.

## User Stories

### Coach / Athlete (shared — all identity management is role-agnostic)

- As a user, I want to see all my active sign-in methods in one place so I know how I can access my account
- As a user, I want to change my phone number when I lose my SIM or switch providers, without losing access to my account
- As a user, I want to change my email when my old address is compromised or retired
- As a user, I want to change my password when I suspect it was leaked, without needing to remember the old one (magic-link based)
- As a user, I want to add a second sign-in method as a backup so I'm not locked out if I lose access to one
- As a user, I want to connect or disconnect Apple / Google at any time for convenience
- As a user, I want to be warned if I'm about to leave myself with no sign-in method (disconnect block)
- As a user, I want a soft warning before I change a sign-in method that is currently my only way in (last-method warn)
- As a user, I want to delete my account permanently when I stop using the app, with clear understanding of what I'm losing
- As a user, I want to reach support when I can't complete a flow on my own

### System

- As the system, I need to verify ownership before any sensitive change (re-auth), scoped to 15-minute validity
- As the system, I need to prevent the user from disconnecting their only sign-in method (zero-method lockout guard)
- As the system, I need to check pre-delete blockers (upcoming sessions, pending payout, active bookings) before allowing account deletion
- As the system, I need to invalidate all other device sessions when the password changes
- As the system, I need to notify the old email when email is changed (security alert with "revert" link — out of MVP scope, noted for V2)
- As the system, I need to schedule data purge within 30 days of account deletion per privacy policy
- As the system, I need to block re-registration with the same email for 7 days after deletion (prevents impulse re-signup confusion)

## Screens & Flows

See prototype [account-access.html](https://321-fit.github.io/project-spec/prototypes/flows/shared/account-access.html) for all screens. Summary below with key states + transitions.

### 1. Account Access Hub (`s-hub`)

Entry point from `Settings → Account Access` row.

**Sections:**
- **Sign-in methods** — 4 rows: Phone / Email & password / Apple / Google
- **Security** — Active sessions + Two-factor authentication (both V2, disabled `Soon` rows)
- **Danger zone** — Delete account (destructive, bottom)

**Row states:**
| State | Right-side control | Tap action |
|---|---|---|
| Set, changeable (Phone with value) | Pencil icon | Re-auth picker → Enter new phone |
| Set, has sub-nav (Email, Social connected) | Chevron | Push to sub-screen / disconnect sheet |
| Not set | "Add" pill (brand gradient) | Directly to add flow (no re-auth) |
| Not connected | "Connect" pill | Triggers native OS sheet |

**Hub state variants (prototype demo via state-toggle):**
- Full — all 4 methods active
- Credentials only — phone + email, no social
- Social only — Apple + Google connected (dangerous: no credential backup)
- Just one — single method active (edge case for last-method flows)

### 2. Re-auth picker (`s-reauth`)

Universal screen triggered before sensitive changes. Context-aware via caller passing a context: `phone`, `email`, `password`, or `delete`.

**Content:**
- Hero icon (lock) + title "Verify it's you" + subtitle with context
- List of available methods — user's active methods **minus the target** (e.g., change phone → phone OTP excluded)
- Footer: "Can't access any of these?" → Contact Support

**Per-method verification routes:**
| Method | Verification step |
|---|---|
| Password | Password prompt (single field, validates against current hash) |
| Phone | Send OTP to current phone → OTP entry |
| Email | Send magic link to current email → user clicks → loading → verified |
| Apple | Native Apple re-sign-in sheet |
| Google | Native Google re-sign-in sheet |

**Re-auth token TTL:** 15 minutes. Further sensitive actions within the window skip the picker.

### 3. Phone flow

**Change phone:**
`Hub → Phone row → Re-auth picker → pick method → verify → s-phone-new (change) → Enter new phone → Send code → s-phone-otp → Verify → Hub + success toast`

**Add phone:**
`Hub → Phone Add pill → s-phone-new (add, NO re-auth) → Enter phone → Send code → s-phone-otp → Verify → Hub + toast`

**States on `s-phone-new`:**
| State | Notes |
|---|---|
| Change | Shows "Current: +995 511 100 000" subtitle |
| Add | Welcoming subtitle, no current number reference |
| Taken | Red border + inline error "This number is already in use by another account" (privacy: no hint of owner) |
| Invalid | Red border + "Enter a valid phone number" |

**States on `s-phone-otp`:**
| State | Notes |
|---|---|
| Idle | 6 empty boxes, Resend timer 0:30 |
| Error (wrong code) | Red borders on filled boxes, inline "Code is incorrect. Try again." — digits NOT cleared |
| Expired | Red borders, "Code expired. Request a new one." — only action: Resend |

**Country picker (`s-country-picker`):**
- Triggered by tap on `+995 ▼` chip
- Full-screen push (NOT sheet — list of 200+ countries with search)
- Sticky search + Popular section (locale-smart) + A-Z list
- Selected row: teal checkmark + teal code
- Selection updates all phone fields across flows

### 4. Email flow

**Email & password sub-hub (`s-email-subhub`):**
Tapping Email row on hub pushes to this intermediate screen. Shows current email card + 2 action rows:
- Change email → `openReauthFor('email')`
- Change password → `openReauthFor('password')`

**Change email:**
`Sub-hub → Change email → Re-auth picker → verify → s-email-new (change) → Send link → s-email-check → [user clicks link in email, out-of-app] → s-email-loading → Hub + toast`

**Add email & password:**
`Hub → Email Add pill → s-email-new (add, NO re-auth, 2 fields) → Send link → s-email-check → ... → Hub + toast`

**States on `s-email-new`:**
| State | Fields | Notes |
|---|---|---|
| Change | Email only (1 field) | Re-auth already done |
| Add | Email + Password + inline rules (3 checks) | No re-auth; adding is non-destructive |
| Taken | Red border + "This email is already in use" |
| Invalid | Red border + "Enter a valid email address" |

**`s-email-check`:**
- Icon + "Check your email" + copy with address
- CTA "Open Mail" (mailto: fallback opens default client)
- Resend timer 30s → becomes tappable after expiry
- "Edit email" link — back-step preserving session state

**`s-email-loading`:**
- Centered spinner + "Verifying your link…"
- No back button (transient, not interruptible)
- Success → Hub + toast
- Error (token expired) → `s-email-expired`

**`s-email-expired`:**
- Yellow warn icon + "This link has expired"
- Primary: "Send a new link" → back to `s-email-check`
- Secondary: "Back to Account Access"
- `×` in header aborts

### 5. Change password (`s-password-new`)

`Sub-hub → Change password → Re-auth picker → verify → s-password-new → Enter new + confirm → Update → Hub + toast`

**Fields:**
- New password (eye toggle to reveal)
- Confirm new password (eye toggle)
- Inline rules checklist (live updates):
  - At least 8 characters
  - Not a common password
  - Not all numbers
  - (Server-only: not similar to email)

**States:**
| State | Notes |
|---|---|
| Idle | Empty fields, rules pending (gray), CTA disabled |
| Typing (valid) | Rules all ok (teal), CTA active |
| Weak | Some rules fail (red X), CTA disabled, error border on first field |
| Mismatch | Both fields filled but differ → inline "Passwords don't match" under confirm |
| Same as current | Inline "Pick something different from your current password" (server-side check) |

**Post-success side-effects:**
- Password hash updated
- All OTHER device sessions invalidated
- Toast: "Password updated. You're signed out on other devices."

### 6. Social — Connect / Disconnect

**Connect (Apple / Google):**
`Hub → Connect pill → Native OS Sign-In sheet (out of our design) → On success: toast`

In prototype, simulated via `simulateConnect(provider)` → direct toast.

**Disconnect (non-last method):**
`Hub → Connected Apple/Google row → disconnect-sheet (confirm) → Disconnect → Hub + toast`

Sheet content:
- Provider icon + "Disconnect [Provider]?"
- Body: consequence + reassurance about reconnect
- Primary: Disconnect (destructive tinted red)
- Secondary: Cancel

Real flow after confirm: if not last method → re-auth picker → API call. Prototype simulates direct success.

**Disconnect (last method — HARD BLOCK):**
`Hub → Connected Apple/Google row → disconnect-block-sheet (NO disconnect option) → Add another method / Not now`

Unlike change-phone (soft warn with Continue anyway), disconnect-last is **hard block**. Rationale: zero sign-in methods = permanent lockout, unrecoverable.

### 7. Delete account

**Entry:** `Hub → Delete account row (Danger zone) → s-delete-info`

**`s-delete-info`:**
- Red trash icon + "Delete your account?" + "This can't be undone"
- Consequence list (4 rows): profile & personal info, training history & reviews, messages, payment methods
- Privacy Policy link in footer
- Primary: "Continue to delete" (tinted red) → blocker check or re-auth
- Secondary: "Cancel"

**Blocker pre-check** (API: `GET /me/delete-preflight`). If any blocker → `s-delete-blockers` (priority order below):

| Priority | Blocker | Who | Message | CTA |
|---|---|---|---|---|
| 1 | Upcoming sessions | Coach | "You have X upcoming sessions…" | Go to Calendar |
| 1 | Upcoming bookings | Athlete | "You have X upcoming bookings…" | Go to My Schedule |
| 2 | Pending payout | Coach | "You have €X pending payout…" | Go to Earnings |

User must clear the blocker before proceeding. Blockers are **hard** — no override.

**If no blockers:** `openReauthFor('delete')` → re-auth picker → verify → `delete-confirm-sheet`

**`delete-confirm-sheet`:**
- Big red trash icon + "Delete your account forever?" + "This can't be undone"
- Primary: "Delete forever" (destructive red)
- Secondary: "Cancel"
- No "type DELETE" gate — agreed too heavy for mobile

**On confirm:** `s-delete-loading` → (backend cascade: revoke sessions, mark deleted, schedule purge) → `s-delete-done`

**`s-delete-done`:**
- Green checkmark icon
- "Your account has been deleted"
- Body: "Thanks for trying 321Fit. You've been signed out on all devices. Your data will be removed within 30 days per our Privacy Policy."
- Single CTA: "Back to start" → welcome/login screen
- No header back button (terminal state)

### 8. Contact support (`s-contact-support`)

**Entry points:**
- Re-auth picker "Can't access any of these?" link
- (Future) Delete flow ambiguous states, Link expired, Settings Help

**Hybrid C pattern** (chosen over native mail composer and in-app ticket form):
- Hero icon + "We're here to help" + "24h reply SLA"
- Email displayed in monospace card: `support@321.fit`
- Meta block prefilled for mail body: User ID / App version / Device
- Primary: "Open Mail" → `mailto:support@321.fit?subject=Help%20[user_id]&body=...` with prefilled template
- Secondary: "Copy email address" → clipboard + snackbar confirmation
- Footer: "In-app ticket form coming soon" (V2 teaser)

## Data Model

### New/modified tables

**`user_auth_methods`** (if not already covered by existing schema):
```
user_id (FK users)
method_type (enum: phone, email, apple, google)
identifier (phone number / email / apple_sub / google_sub)
verified_at (timestamp)
created_at, updated_at
```

Queried by: hub state rendering, last-method check, re-auth picker method list.

**`user_reauth_tokens`** (new):
```
token (uuid, primary)
user_id (FK users)
context (enum: phone, email, password, delete)
issued_at (timestamp)
expires_at (issued_at + 15 min)
consumed_at (nullable timestamp)
```

Issued on successful re-auth. Single-use. Required on all sensitive write endpoints.

**`user_email_change_requests`** (new, for magic-link flow):
```
token (uuid, primary)
user_id (FK users)
new_email (string)
expires_at (issued_at + 30 min)
consumed_at (nullable)
```

**`user_delete_requests`** (new, for audit + retention):
```
user_id (FK users)
requested_at (timestamp)
purge_scheduled_for (requested_at + 30 days)
completed_at (nullable timestamp)
reason (optional, nullable string)
```

## API Endpoints

### New

**Re-auth (issue token):**
- `POST /auth/reauth/password` — body: `{ password, context }` → 200 with re-auth token
- `POST /auth/reauth/phone-otp` — body: `{ otp, context }` (OTP sent separately via /auth/phone/request-otp)
- `POST /auth/reauth/email-link` — body: `{ token, context }` (token from magic link)
- `POST /auth/reauth/apple` — body: `{ apple_token, context }`
- `POST /auth/reauth/google` — body: `{ google_token, context }`

**Auth methods management:**
- `GET /me/auth-methods` → `{ phone, email, has_password, apple_linked, google_linked, method_count }`
- `POST /me/auth-methods/phone/change` — body: `{ new_phone, otp, reauth_token }` → 200
- `POST /me/auth-methods/phone/add` — body: `{ phone, otp }` → 200 (no re-auth needed for add)
- `POST /me/auth-methods/email/request-change` — body: `{ new_email, reauth_token }` → sends magic link
- `POST /me/auth-methods/email/confirm-change` — body: `{ token }` → 200 (from magic link)
- `POST /me/auth-methods/email/add-with-password` — body: `{ email, password }` → sends magic link
- `POST /me/auth-methods/password/change` — body: `{ new_password, reauth_token }` → 200 (invalidates other sessions)
- `POST /me/auth-methods/disconnect` — body: `{ provider: "apple" | "google", reauth_token }` → 200, or 409 if last method

**Email availability check (debounced during input):**
- `GET /auth/email-available?email=` → `{ available: bool }` (rate-limited)

**Delete account:**
- `GET /me/delete-preflight` → `{ blockers: [{ type, count, details }] }`
- `POST /me/delete` — body: `{ reauth_token }` → 200 (schedules purge, revokes sessions, marks deleted)

### Re-used (existing)

From [authentication.md](./authentication.md):
- `POST /auth/phone/request-otp` — send OTP
- `POST /auth/password/reset` — password reset flow (separate, unauthenticated)

## Business Rules

### Re-authentication

- Required before: change phone, change email, change password, disconnect social, delete account
- NOT required before: add phone, add email, connect social (additive actions don't reduce security)
- Token TTL: 15 minutes
- Single-use (consumed on first write)
- Context-bound: a `phone` reauth token cannot be used to authorize an `email` change

### Last-method handling

- **Change (phone / email / password)** when target = only method → soft warn sheet with "Continue anyway" (uses session as implicit auth)
- **Disconnect (Apple / Google)** when target = only method → hard block sheet, no override

Difference: change leaves at least one method; disconnect leaves zero.

### Password rules

Enforced by backend [`password_validator.py`](../../poly-backend/backend/app/services/password_validator.py):
- Min 8 characters
- Not in common-list
- Not entirely numeric
- Not similar to email (local-part substring)

Inline checklist shows 3 visible rules (email-similarity check is server-only).

**Not requiring capital letter** — existing user passwords may lack capitals; forcing would break grandfathered users.

### Magic link TTL

- Email verification / change: 30 minutes
- One-shot (consumed on first click)
- Expired → `s-email-expired` screen with "Send a new link" CTA

### OTP

- TTL: 5 minutes
- Resend cooldown: 30s between resends
- Max attempts: 5 wrong codes → invalidate + force resend
- Max resends per 15 min: 3

### Delete account

- Pre-check blockers: upcoming sessions (coach + athlete), pending payout (coach)
- Blockers are hard — user must clear before proceeding
- On success: sessions revoked, `deleted_at` flag set, data purge scheduled +30 days
- Re-registration with same email blocked for 7 days (cooldown)

### Method uniqueness

- Each phone number / email can be linked to only one account
- Apple Sign-In `sub` claim is unique per account
- Google Sign-In `sub` claim is unique per account
- Attempting to link an already-linked identifier → 409 with generic error (no disclosure of owner account)

## Edge Cases

| Scenario | Behavior |
|---|---|
| User has session but is disconnecting their only method | Hard block sheet |
| User loses phone but wants to change it | Re-auth via email/social/password (picker excludes phone); if only phone → soft warn + session-as-auth override |
| User clicks email verification link after 30 min | `s-email-expired` screen |
| User enters wrong OTP 5 times | OTP invalidated, force resend |
| New email is already in use | Inline error "already in use" (no owner disclosure) |
| New phone is already in use | Same |
| User deletes account with pending coach payout | Blocker screen, route to Earnings |
| User tries to re-register with same email within 7 days of deletion | Blocked with "Email recently used" error |
| Both phone and email in re-auth picker are target → blocks with "no available verification" | Routes to Contact Support |
| Device loses network during flow | Inline error banners; no write on retry-failure |

## Notifications

### Email notifications to user

| Event | Recipient | Content |
|---|---|---|
| Email change confirmed | New email | "Your 321Fit email has been updated. If this wasn't you, contact support." |
| Email change confirmed | **Old email** | "Your 321Fit email was changed to new@example.com. If this wasn't you, click here to revert within 24h." *(Revert flow = V2)* |
| Password change | All registered emails | "Your 321Fit password was changed from [device]. Sign in with the new password everywhere." |
| Account deletion | Email on file | "Your 321Fit account has been deleted. Data will be purged within 30 days." |

### Push notifications

- None for this module (identity changes are silent in-app; toast on hub is sufficient)

## V2 / Deferred

These rows are present on hub with `Soon` badge (disabled):
- **Active sessions** — list devices where user is signed in, one-tap revoke per device + "Sign out everywhere"
- **Two-factor authentication** — TOTP app (Google Authenticator / Authy) + backup codes

Other deferred:
- **Old-email revert link** (24h window to undo email change) — currently just notified, not actionable
- **In-app ticket form** for support (current: mailto: hybrid)
- **Account recovery flow** when user lost access to all methods (currently: support ticket manual review)

## UX Pattern References

See memory entries for cross-cutting rules:
- `feedback_screen_vs_sheet_vs_toast` — when to use each
- `feedback_bottom_sheets` — sheet anatomy
- `feedback_destructive_actions` — button severity for destructive flows
- `feedback_error_states` — 4 error patterns
- `feedback_copy_standards` — tone + grammar
- `project_account_access_decisions` — all decisions captured this session

## Implementation Notes

**Native UI conventions:** see [architecture/design-system.md § Native theming contract](../architecture/design-system.md#native-theming-contract). Don't duplicate cross-platform UI rules here — only platform-specific deviations below.

- **iOS:** New screens go under `Settings/AccountAccess/`. Re-auth picker is a shared component reusable across flows. Country picker exists in onboarding — reuse.
- **Android (planned):** Mirror iOS; hide Apple row on Android (Apple Sign-In has Android limitations).
- **Backend:** Needs new tables (`user_reauth_tokens`, `user_email_change_requests`, `user_delete_requests`) + ~15 new endpoints. Most heavy work is in delete flow (cascading cleanup + purge scheduling).
- **Voice assistant:** No changes needed. Account deletion should cascade to revoke voice child sessions.
