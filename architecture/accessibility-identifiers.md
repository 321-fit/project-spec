# Accessibility Identifiers Registry

> Canonical source of truth for every `data-a11y-id` in the prototypes, every `accessibilityIdentifier` on iOS, every `testTag` on Compose, and every `id:` selector in Maestro flows.
> Last updated: 2026-05-19

## Convention

Format: **`<scope>.<entity>.<element>[.<modifier>]`** — dot-separated levels, dash within a level, lowercase, ASCII-only.

Full convention with scope/entity/element tables + anti-patterns lives in memory `feedback_a11y_naming`. This doc is the **registry** of values; the memory is the **rules**.

The same literal travels through 4 layers unchanged:

```
prototypes/flows/**/*.html     → data-a11y-id="auth.signin.submit"
design-tokens FitUI            → FitButton(a11yId: "auth.signin.submit")  // Swift
                                 FitButton(a11yId = "auth.signin.submit")  // Compose
321fit_ios native screens      → .accessibilityIdentifier("auth.signin.submit")
test-automation/maestro        → tapOn: { id: "auth.signin.submit" }
```

No transformations between layers — that's the entire point.

## Rules for editors

1. **No duplicates across scopes.** Grep before adding a new ID. If a similar ID exists in another scope and the role is identical, consider whether the scope should be widened (e.g. promote `auth.X.submit` to a shared element). If different role, the scope+element combo should differ.
2. **Same role across screens = same element name.** Submit button on signup form and submit button on signin form are both `<scope>.<entity>.submit`, not `.go` / `.confirm`. Element vocabulary is in `feedback_a11y_naming` § elements table.
3. **States stay invariant.** `auth.signin.submit` keeps that ID across enabled / disabled / loading / errored. State is asserted separately (visible message, element enabled property).
4. **Add to this doc when adding to a prototype.** The registry is the de-dup gate. PR that adds IDs to HTML without updating this doc is incomplete.
5. **Generic IDs for dynamic lists.** `country.row` is the ID for any country picker row; specific row is identified at test time via `text:` or `data-*` attribute. Don't enumerate `country.row.ge` / `.us` / ... per-row.

## How this doc gets populated

Phase 1 (now): manually as we walk through prototypes. One row per ID.

Phase 2 (later, per `a11y-rollout-plan` step 6): `tools/extract-a11y-ids.sh` regenerates the tables from `grep -rhoE 'data-a11y-id="[^"]+"' prototypes/`. CI runs the script on every PR + fails if the doc diverges.

## Registry

### `auth` — sign-in / sign-up / role-pick / forgot-password / phone OTP

Prototype: `prototypes/flows/shared/auth.html`

| ID | Element | Screen | Notes |
|---|---|---|---|
| `auth.role-pick.continue.coach` | primary CTA | role-pick | "I'm a Coach" — captures role=coach client-side |
| `auth.role-pick.continue.athlete` | secondary CTA | role-pick | "I'm an Athlete" — captures role=athlete client-side |
| `auth.signup.back` | back chevron | sign-up entry | top-left, returns to role-pick |
| `auth.signup.method.email` | primary CTA | sign-up entry | "Continue with email" → email form |
| `auth.signup.method.apple` | provider btn | sign-up entry | iOS-only; opens native Sign in with Apple sheet |
| `auth.signup.method.google` | provider btn | sign-up entry | opens native Google Sign-In sheet |
| `auth.signup.toggle-signin` | text button | sign-up entry footer | "Sign in" — switches to sign-in entry |
| `auth.signup.email.back` | back chevron | sign-up email | returns to method picker |
| `auth.signup.email.field` | email input | sign-up email | keyboardType=email, autocomplete=email |
| `auth.signup.email.password.field` | password input | sign-up email | isSecure, autocomplete=new-password |
| `auth.signup.email.password.show` | eye toggle | sign-up email | inline at end of password field |
| `auth.signup.email.submit` | primary CTA | sign-up email | "Sign up" — gated on field validators |
| `auth.signup.email.toggle-signin` | text button | sign-up email footer | "Sign in" — switches to sign-in form |
| `auth.signin.back` | back chevron | sign-in entry | returns to role-pick |
| `auth.signin.method.email` | primary CTA | sign-in entry | "Continue with email" → email form |
| `auth.signin.method.apple` | provider btn | sign-in entry | opens native Apple sign-in sheet |
| `auth.signin.method.google` | provider btn | sign-in entry | opens native Google sign-in sheet |
| `auth.signin.toggle-signup` | text button | sign-in entry footer | "Sign up" — switches to sign-up entry |
| `auth.signin.email.back` | back chevron | sign-in email | returns to method picker |
| `auth.signin.email.field` | email input | sign-in email | keyboardType=email, autocomplete=email |
| `auth.signin.email.password.field` | password input | sign-in email | isSecure, autocomplete=current-password |
| `auth.signin.email.password.show` | eye toggle | sign-in email | inline at end of password field |
| `auth.signin.email.submit` | primary CTA | sign-in email | "Sign in" — gated on field validators |
| `auth.signin.email.forgot-password` | text link | sign-in email | "Forgot password?" → starts recovery flow |
| `auth.signin.email.toggle-signup` | text button | sign-in email footer | "Sign up" — switches to sign-up entry |
| `auth.forgot.email.back` | back chevron | forgot · step 1 | returns to sign-in email |
| `auth.forgot.email.field` | email input | forgot · step 1 | email to receive recovery code |
| `auth.forgot.email.submit` | primary CTA | forgot · step 1 | "Send code" → step 2 |
| `auth.forgot.otp.back` | back chevron | forgot · step 2 | returns to step 1 |
| `auth.forgot.otp.field` | OTP boxes | forgot · step 2 | 6-digit code entry container |
| `auth.forgot.otp.resend` | text button | forgot · step 2 | "Resend" — disabled during 60s timer |
| `auth.forgot.otp.submit` | primary CTA | forgot · step 2 | "Verify" — auto-fires when 6 digits filled |
| `auth.forgot.new.back` | back chevron | forgot · step 3 | returns to step 2 |
| `auth.forgot.new.password.field` | password input | forgot · step 3 | new password (no confirm field per account-access pattern) |
| `auth.forgot.new.password.show` | eye toggle | forgot · step 3 | inline at end of password field |
| `auth.forgot.new.submit` | primary CTA | forgot · step 3 | "Save and sign in" — sets pw + auto sign-in |
| `auth.phone.enter.back` | back chevron | phone · enter | returns to sign-up email |
| `auth.phone.enter.country` | country chip | phone · enter | tap → opens country picker |
| `auth.phone.enter.field` | tel input | phone · enter | inputmode=tel, autocomplete=tel-national |
| `auth.phone.enter.submit` | primary CTA | phone · enter | "Send code" — POST /signup/phone. Phone verification is mandatory at signup; no skip. |
| `auth.phone.otp.back` | back chevron | phone · OTP | returns to phone entry |
| `auth.phone.otp.field` | OTP boxes | phone · OTP | 6-digit code entry container |
| `auth.phone.otp.resend` | text button | phone · OTP | "Resend" — disabled during 60s timer |
| `auth.phone.otp.submit` | primary CTA | phone · OTP | "Verify" — auto-fires when 6 digits filled |
| `auth.phone.otp.change-number` | text button | phone · OTP footer | "Use a different number" — returns to phone entry |

### `onboarding` — wizard (coach 5 steps + athlete 4 steps)

Prototypes: inline on `coach/dashboard.html` state `dst-new` + `dst-under-review`, and on `athlete/dashboard.html` state `dst-welcome`. Phone is captured at signup (mandatory per 2026-05-19) and is no longer a wizard step.

| ID | Element | Screen | Notes |
|---|---|---|---|
| `onboarding.coach.wizard` | wizard card | coach dashboard `dst-new` | container for the 5-step setup wizard |
| `onboarding.coach.wizard.toggle` | chevron button | coach dashboard `dst-new` | expand/collapse wizard card |
| `onboarding.coach.step.sports` | row | coach wizard | → `sport-types.html` |
| `onboarding.coach.step.avatar` | row | coach wizard | → `personal-data.html` (avatar pencil) |
| `onboarding.coach.step.bio` | row | coach wizard | → `personal-data.html` (About me) |
| `onboarding.coach.step.location` | row | coach wizard | → `locations.html` |
| `onboarding.coach.step.session` | row | coach wizard | → `sessions.html`. Marked `.done` when ≥1 session exists. |
| `onboarding.coach.under-review.banner` | banner | coach dashboard `dst-under-review` | "Your profile is under review" + 24h timer copy |
| `onboarding.coach.boost.stripe` | card | coach dashboard `dst-under-review` | → `balance.html#s-stripe` |
| `onboarding.coach.boost.hours` | card | coach dashboard `dst-under-review` | → `settings.html#s-availability` |
| `onboarding.coach.boost.video` | card | coach dashboard `dst-under-review` | → `personal-data.html#pd-video-group` |
| `onboarding.athlete.wizard` | wizard card | athlete dashboard `dst-welcome` | container for the 4-step setup |
| `onboarding.athlete.step.sports` | row | athlete wizard | → sport-types picker |
| `onboarding.athlete.step.personal` | row | athlete wizard | → Personal Data (athlete variant) |
| `onboarding.athlete.step.balance` | row | athlete wizard | → balance top-up (placeholder — athlete balance prototype pending) |
| `onboarding.athlete.step.search` | row | athlete wizard | → `search.html` |

### `tabbar` — global 5-tab bottom nav (coach + athlete root screens)

Prototype: present in every root prototype (`coach/dashboard.html`, `athlete/dashboard.html`, etc.)

| ID | Element | Screen | Notes |
|---|---|---|---|
| _(populated when tabbar IDs are added pass-wise)_ | | | |

### `dashboard` — coach + athlete dashboard

Prototypes: `coach/dashboard.html`, `athlete/dashboard.html`

| ID | Element | Screen | Notes |
|---|---|---|---|

### `calendar` — coach + athlete calendar

Prototypes: `coach/calendar.html`, `athlete/calendar.html`

| ID | Element | Screen | Notes |
|---|---|---|---|

### `search` — athlete search (filters + results + map)

Prototype: `athlete/search.html`

| ID | Element | Screen | Notes |
|---|---|---|---|

### `clients` — coach Clients tab + invite

Prototypes: `coach/clients.html`, `coach/invite.html`, `coach/invite-coach.html`

| ID | Element | Screen | Notes |
|---|---|---|---|

### `profile` — coach + athlete profile + shared/profile

Prototypes: `coach/profile.html`, `shared/profile.html`

| ID | Element | Screen | Notes |
|---|---|---|---|

### `settings` — settings hub + sub-screens

Prototypes: `coach/settings.html` + every sub-screen (personal-data, calendar-sync, balance, etc.)

| ID | Element | Screen | Notes |
|---|---|---|---|

### `account-access` — re-auth / change-password / delete-account

Prototype: `shared/account-access.html`

| ID | Element | Screen | Notes |
|---|---|---|---|

### `earnings` — coach balance / earnings / transactions

Prototype: `coach/balance.html`

| ID | Element | Screen | Notes |
|---|---|---|---|

### `booking` — athlete books a coach session

Spec: `booking-flow.md` — prototype lives partly in `athlete/search.html` + `shared/profile.html` (Book Training).

| ID | Element | Screen | Notes |
|---|---|---|---|

### `country` — country picker (re-used: phone signup, edit phone, Personal Data home country, Search filter country)

Prototypes: `shared/auth.html` (phone OTP), `coach/personal-data.html`, `athlete/search.html`

| ID | Element | Screen | Notes |
|---|---|---|---|
| `country.picker.close` | × close button | country picker | header — picker is modal, uses × not chevron per `feedback_back_vs_close` |
| `country.search.field` | text input | country picker | sticky search box, top of list |
| `country.row` | list row (generic) | country picker | ONE id for all rows; Maestro disambiguates via `text:` or `data-*` per `feedback_a11y_naming` |

### `envpicker` — DEV-only environment switcher

Prototype: not yet (dev-only feature in iOS app)

| ID | Element | Screen | Notes |
|---|---|---|---|

### `voice` — voice assistant FAB + sheet

Prototype: not yet built (deferred per `project_voice_assistant`)

| ID | Element | Screen | Notes |
|---|---|---|---|

---

## Cross-references

- Convention (rules): [`feedback_a11y_naming`](#) (memory)
- Prototype rule: [`feedback_prototype_a11y`](#) (memory)
- Rollout plan: [`a11y-rollout-plan`](#) (memory)
- iOS legacy a11y (issue #156, evvseenko): [`a11y-identifiers-plan`](#) (memory)
- Maestro flows that will consume IDs: `test-automation/maestro/flows/**`
