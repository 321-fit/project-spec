# Accessibility Identifiers Registry

> Canonical source of truth for every `data-a11y-id` in the prototypes, every `accessibilityIdentifier` on iOS, every `testTag` on Compose, and every `id:` selector in Maestro flows.
> Last updated: 2026-05-21

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

### `onboarding` — post-signup wizard flow + dashboard setup widget

Two separate artifacts share the `onboarding` scope:

1. **Onboarding flow** — `prototypes/flows/shared/onboarding.html`. Post-signup fullscreen wizard (athlete 5 steps; coach 7 steps). Required before reaching the dashboard. `onboarding.flow.*` IDs.
2. **Dashboard setup widget** — inline on `coach/dashboard.html` state `dst-new` + `dst-under-review`, and on `athlete/dashboard.html` state `dst-welcome`. Checklist for finishing setup after the user is already in the app. `onboarding.coach.*` / `onboarding.athlete.*` IDs.

Phone is captured at signup (mandatory per 2026-05-19) and is no longer a wizard step in either artifact.

#### Flow IDs (`onboarding.flow.*`)

| ID | Element | Screen | Notes |
|---|---|---|---|
| `onboarding.flow.back` | back chevron | every step | disabled on step 1 (account already provisioned) |
| `onboarding.flow.personal.gender.woman` | selection chip | step 1 | |
| `onboarding.flow.personal.gender.man` | selection chip | step 1 | |
| `onboarding.flow.personal.dob` | tappable input | step 1 | opens DOB wheel sheet |
| `onboarding.flow.personal.weight` | number input | step 1 | athlete only — `kg` suffix |
| `onboarding.flow.personal.height` | number input | step 1 | athlete only — `cm` suffix |
| `onboarding.flow.personal.next` | primary CTA | step 1 | Continue |
| `onboarding.flow.sports.tile` | sport tile | step 2 | generic id for all tiles (Maestro picks by text) |
| `onboarding.flow.sports.next` | primary CTA | step 2 | Continue |
| `onboarding.flow.avatar.upload` | circular dropzone | step 3 | opens native photo picker |
| `onboarding.flow.avatar.bio` | textarea | step 3 | 500-char max with live counter |
| `onboarding.flow.avatar.next` | primary CTA | step 3 | Continue |
| `onboarding.flow.location.timezone` | push row | step 4 | opens TZ picker |
| `onboarding.flow.location.country` | push row | step 4 | opens country picker |
| `onboarding.flow.location.city` | push row | step 4 | opens city picker scoped to country |
| `onboarding.flow.location.languages` | push row | step 4 | opens multi-select language picker |
| `onboarding.flow.location.next` | primary CTA | step 4 | Continue — athlete jumps to calendar; coach to gym |
| `onboarding.flow.gym.add` | primary CTA | step 5 (coach) | "Add a location" — opens `coach/locations.html#s-loc-map` (canonical picker) |
| `onboarding.flow.gym.next` | primary CTA | step 5 (coach) | Continue (footer) — enabled after ≥1 location added |
| `onboarding.flow.session.add` | primary CTA | step 6 (coach) | "Create a session" — opens `coach/sessions.html#s-create` (canonical form) |
| `onboarding.flow.session.next` | primary CTA | step 6 (coach) | Continue (footer) — enabled after ≥1 session created |
| `onboarding.flow.calendar.google` | provider card | calendar step | opens Google OAuth |
| `onboarding.flow.calendar.apple` | provider card | calendar step | opens CalDAV connect |
| `onboarding.flow.calendar.next` | primary CTA | calendar step | Continue — only step with optional Skip |
| `onboarding.flow.calendar.skip` | text button | calendar step | "Skip for now" — the only Skip in the whole flow |
| `onboarding.flow.complete.cta` | primary CTA | complete | "Find a coach" (athlete) / "Got it" (coach) → dashboard |

#### Dashboard setup widget IDs (`onboarding.coach.*` / `onboarding.athlete.*`)

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

Partial coverage — populated for screens added in the 2026-05-20/21 session (Schedule training, Block time off, all new drawers, overlap, FAB rework). Legacy timeline tiles + event sheet variants on `s-calendar` / `s-event` are a Phase 2 backfill item.

#### FAB sheet (`coach/calendar.html#fab-sheet`)

| ID | Element | Notes |
|---|---|---|
| `coach.calendar.fab.schedule-training` | "Schedule training" option | opens `s-schedule-event` |
| `coach.calendar.fab.block-time-off` | "Block time off" option | opens `s-block-time-off` |

#### Schedule training (`#s-schedule-event` + pickers)

| ID | Element | Screen | Notes |
|---|---|---|---|
| `coach.calendar.schedule.back` | back chevron | s-schedule-event | returns to s-calendar |
| `coach.calendar.schedule.type` | Personal/Group toggle group | s-schedule-event | `data-fit-selection="single"` |
| `coach.calendar.schedule.athlete` | athlete picker entry | s-schedule-event | opens s-schedule-pick-athlete |
| `coach.calendar.schedule.template` | template picker entry | s-schedule-event | opens s-schedule-pick-template |
| `coach.calendar.schedule.date` | date picker entry | s-schedule-event | opens schedule-date-sheet |
| `coach.calendar.schedule.time` | time picker entry | s-schedule-event | opens schedule-time-sheet |
| `coach.calendar.schedule.payment` | payment toggle group | s-schedule-event | `data-fit-selection="multi"` |
| `coach.calendar.schedule.note` | notes textarea | s-schedule-event | maxlength=300 |
| `coach.calendar.schedule.save` | primary CTA | s-schedule-event | "Send invitation" |
| `coach.calendar.schedule.date.confirm` | Confirm | date picker sheet | dismisses sheet |
| `coach.calendar.schedule.time.slot` | hour slot | time picker sheet | generic — disambiguate via `data-hour` |
| `coach.calendar.schedule.time.confirm` | Confirm | time picker sheet | dismisses sheet |
| `coach.calendar.schedule.athlete.back` | back chevron | s-schedule-pick-athlete | returns to s-schedule-event |
| `coach.calendar.schedule.athlete.search` | search input | s-schedule-pick-athlete | |
| `coach.calendar.schedule.athlete.row` | athlete row | s-schedule-pick-athlete | generic — same on every row |
| `coach.calendar.schedule.athlete.invite` | "Invite by phone" CTA | s-schedule-pick-athlete | |
| `coach.calendar.schedule.template.back` | back chevron | s-schedule-pick-template | returns to s-schedule-event |
| `coach.calendar.schedule.template.create` | "Create new template" CTA | s-schedule-pick-template | deep-links to sessions.html#s-create |
| `coach.calendar.schedule.template.row` | template card | s-schedule-pick-template | generic — same on every row |

#### Block time off (`#s-block-time-off` + pickers)

| ID | Element | Screen | Notes |
|---|---|---|---|
| `coach.calendar.block.back` | back chevron | s-block-time-off | |
| `coach.calendar.block.title` | title input | s-block-time-off | default "My time" |
| `coach.calendar.block.all-day` | all-day toggle | s-block-time-off | |
| `coach.calendar.block.date` | date picker entry | s-block-time-off | |
| `coach.calendar.block.start-time` | start time picker entry | s-block-time-off | |
| `coach.calendar.block.end-time` | end time picker entry | s-block-time-off | |
| `coach.calendar.block.notes` | notes textarea | s-block-time-off | |
| `coach.calendar.block.save` | primary CTA | s-block-time-off | |
| `coach.calendar.block.date.confirm` | Confirm | block-date-sheet | |
| `coach.calendar.block.start-time.confirm` | Confirm | block-start-sheet | wheel picker |
| `coach.calendar.block.end-time.confirm` | Confirm | block-end-sheet | wheel picker |

#### Event drawers

| ID | Element | Drawer | Notes |
|---|---|---|---|
| `coach.calendar.cross-role.tile` | cross-role event tile | s-calendar timeline | tap → cross-role drawer |
| `coach.calendar.cross-role.close` | Close btn | cal-cross-role-sheet | |
| `coach.calendar.cross-role.switch-role` | "Switch to athlete" CTA | cal-cross-role-sheet | role switch |
| `coach.calendar.custom.tile` | custom event tile | s-calendar timeline | tap → custom drawer |
| `coach.calendar.custom.edit` | Edit | cal-custom-sheet | opens s-block-time-off prefilled |
| `coach.calendar.custom.delete` | Delete | cal-custom-sheet | DELETE /events/{id} |
| `coach.calendar.external.close` | Close | cal-external-sheet | |
| `coach.calendar.external.hide` | "Hide from schedule" | cal-external-sheet | surgical per-event hide |
| `coach.calendar.overlap.reschedule` | Primary CTA | cal-overlap-sheet | "Reschedule {name}" |
| `coach.calendar.overlap.ignore-external` | Secondary CTA | cal-overlap-sheet | bulk hide all externals in this slot |
| `coach.calendar.hide-event.undo` | Undo | cal-hide-snackbar | 5-sec window |
| `coach.calendar.reschedule.scope` | radio group wrapper | cal-reschedule-sheet | recurring scope picker |
| `coach.calendar.reschedule.scope.this` | "This session only" | cal-reschedule-sheet | |
| `coach.calendar.reschedule.scope.following` | "This and all following" | cal-reschedule-sheet | |
| `coach.calendar.reschedule.scope.all` | "All sessions" | cal-reschedule-sheet | |
| `coach.calendar.reschedule.confirm` | Continue | cal-reschedule-sheet | |
| `coach.calendar.drag-group.cancel` | Cancel | cal-drag-group-sheet | drop with participant conflicts |
| `coach.calendar.drag-group.confirm` | "Move anyway" | cal-drag-group-sheet | |
| `coach.calendar.threshold.proceed` | "Proceed with N athletes" | cal-threshold-sheet | min participants warning |
| `coach.calendar.threshold.cancel` | "Cancel training" | cal-threshold-sheet | |

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

#### `calsync` — Calendar Sync sub-module (`coach/calendar-sync.html`)

Has its own `coach.calsync.*` scope since it's a distinct subsystem (connects Google/Apple, manages hidden events). Populated for the bits added in the 2026-05-20/21 session (Default destination, Refresh, Hidden events). Calendar list + Apple CalDAV connect are Phase 2 backfill.

| ID | Element | Screen | Notes |
|---|---|---|---|
| `coach.calsync.refresh` | refresh icon-btn in header | s-calsync (list of all accounts) | refetches every connected account |
| `coach.calsync.detail.refresh` | refresh icon-btn in header | s-cal-detail (per-account) | refetches just this account's calendars |
| `coach.calsync.detail.make-default` | "Make default destination" action row | s-cal-detail | shown only when this account is NOT default |
| `coach.calsync.hidden-events.row` | hidden event row | s-cal-detail Hidden events section | generic — disambiguate via `data-event-id` |
| `coach.calsync.hidden-events.unhide` | Unhide button | s-cal-detail Hidden events section | per-row; DELETE .../external-events/{id}/hide |

### `account-access` — re-auth / change-password / delete-account

Prototype: `shared/account-access.html`

| ID | Element | Screen | Notes |
|---|---|---|---|

### `earnings` — coach balance / earnings / transactions

Prototype: `coach/balance.html`

Populated for `s-pending` (Pending balance breakdown) added in the 2026-05-20 session. Other screens (s-list / s-detail-month / s-txn-earning / s-payout-detail) are Phase 2 backfill.

#### Pending breakdown (`#s-pending`)

| ID | Element | Notes |
|---|---|---|
| `coach.earnings.pending.back` | back chevron | returns to s-earnings |
| `coach.earnings.pending.row` | session-in-hold row | generic — disambiguate via athlete name or `data-method` |

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
