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

### `onboarding` — wizard (coach 6 steps + athlete 4 steps)

Prototype: `prototypes/flows/coach/dashboard.html` state `dst-new` (current) + dedicated wizard file (TBD).

| ID | Element | Screen | Notes |
|---|---|---|---|
| _(populated when onboarding wizard is built)_ | | | |

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
