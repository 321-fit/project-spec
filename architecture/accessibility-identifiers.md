# Accessibility Identifiers Registry

> Canonical source of truth for every `data-a11y-id` in the prototypes, every `accessibilityIdentifier` on iOS, every `testTag` on Compose, and every `id:` selector in Maestro flows.
> Last updated: 2026-06-02 (Stripe moved to standalone flow `coach/stripe.html`)

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

### `event-detail` — coach-side full-screen group event detail (`coach/calendar.html#s-event`)

Push screen from group event drawer (per [group-event-detail.md](../specs/group-event-detail.md)). Populated 2026-05-25 ahead of group-event-detail Bundle B epic.

| ID | Element | Notes |
|---|---|---|
| `coach.event-detail.back` | back chevron | returns to calendar drawer / timeline |
| `coach.event-detail.overflow` | ⋯ icon-btn | opens floating context menu |
| `coach.event-detail.overflow.invite` | "Invite athletes" menu item | opens share sheet |
| `coach.event-detail.overflow.reschedule` | "Reschedule" menu item | opens `cal-reschedule-sheet` (reused from coach-calendar) |
| `coach.event-detail.overflow.cancel` | "Cancel training" menu item | destructive — opens `cal-cancel-sheet` |
| `coach.event-detail.note` | note row (filled or empty state — same id across) | opens note edit sheet |
| `coach.event-detail.note.textarea` | edit sheet textarea | 200-char limit + counter |
| `coach.event-detail.note.save` | Save action | PATCH event with note body |
| `coach.event-detail.note.delete` | Delete action | destructive — clears note |
| `coach.event-detail.participants.row` | participant row | generic — disambiguate via athlete id |
| `coach.event-detail.participants.row.remove` | × button on row (or swipe-left action) | adds to remove batch + Undo snackbar |
| `coach.event-detail.participants.sheet.profile` | "View Profile" action sheet item | push to athlete detail |
| `coach.event-detail.participants.sheet.message` | "Send Message" action sheet item | push to messenger |
| `coach.event-detail.participants.sheet.remove` | "Remove from Training" destructive | same outcome as inline ×/swipe |
| `coach.event-detail.undo` | Undo on remove snackbar | reverts batch within 5s |
| `coach.event-detail.share.cta` | footer "Invite athletes" CTA | opens share sheet |
| `coach.event-detail.share.sheet.copy` | "Copy" button in share sheet | copies link to clipboard |
| `coach.event-detail.share.sheet.done` | "Done" closing share sheet | |

### `search` — athlete search (filters + results + map)

Prototype: `athlete/search.html`

| ID | Element | Screen | Notes |
|---|---|---|---|

### `clients` — coach Clients tab + invite

Prototypes: `coach/clients.html`, `coach/invite.html`, `coach/invite-coach.html`

| ID | Element | Screen | Notes |
|---|---|---|---|
| `coach.clients.add.create` | "Create profile" row in add-client drawer | `s-clients` | → `s-create-client` |
| `coach.clients.add.import` | "Import from contacts" row in add-client drawer | `s-clients` | → `s-import-contacts` |
| `coach.clients.add.invite-app` | "Invite to app" row in add-client drawer | `s-clients` | opens invite share drawer (OneLink) |
| `coach.clients.add.invite-training` | "Invite to training" row in add-client drawer | `s-clients` | → invite.html template chooser |
| `coach.import.back` | back chevron | `s-import-contacts` | → `s-clients` |
| `coach.import.select-all` | "Select all / Deselect all" link | `s-import-contacts` | toggles every eligible contact |
| `coach.import.confirm` | "Import N contacts" CTA | `s-import-contacts` | bulk-create CRM → `s-import-done` |
| `coach.import.invite-all` | "Invite all N" CTA | `s-import-done` | opens invite share drawer (bulk) |
| `coach.import.not-now` | "Not now" CTA | `s-import-done` | → `s-clients` |
| `coach.import.close` | × close (top-right) | `s-import-done` | dismisses modal-type screen → `s-clients` |
| `coach.invite-share.whatsapp` | WhatsApp channel row | `invite-share-sheet` | native-share simulation |
| `coach.invite-share.messages` | Messages channel row | `invite-share-sheet` | |
| `coach.invite-share.copy` | "Copy link" row | `invite-share-sheet` | |
| `coach.invite-share.more` | "More…" (system share) row | `invite-share-sheet` | |

### `profile` — coach + athlete profile + shared/profile

Prototypes: `coach/profile.html`, `shared/profile.html`

Populated for `coach/profile.html` (Coach's own Profile tab + Reviews push) on 2026-05-25 ahead of Profile family epic issue creation. Athlete-side `shared/profile.html` (coach detail when athlete browses) is a separate scope — add `athlete.coach-detail.*` ids when that screen's epic lands.

#### Coach Profile tab (`#s-coach-profile`)

| ID | Element | Notes |
|---|---|---|
| `coach.profile.role-switch.trigger` | role chip in header (top-left, "Coach" + swap icon) | opens role-switch confirm drawer (first time) / instant switch |
| `coach.profile.role-switch.confirm` | primary CTA in role-switch drawer | coach→athlete: creates `athlete_profile`, switches instantly |
| `coach.profile.role-switch.cancel` | "Not now" in role-switch drawer | dismiss |
| `coach.profile.share` | share icon-btn in header (left of ⚙️) | opens profile share-invite sheet |
| `coach.profile.share.sheet.copy` | "Copy" button in share sheet | copies `321.fit/invite/<coach>` to clipboard |
| `coach.profile.share.sheet.done` | "Done" closing share sheet | |
| `coach.profile.settings` | ⚙️ icon-btn in header | pushes to settings.html (Settings hub) |
| `coach.profile.hero.edit` | camera pencil overlay on hero media | pushes to personal-data → Intro video card |
| `coach.profile.identity` | identity row (avatar + name + location chevron) | pushes to personal-data top |
| `coach.profile.maturity.learn-more` | "Learn more →" on FitMaturityProgress card (new coach only) | pushes to Maturity Explainer screen (currently alert stub — TBD) |
| `coach.profile.sports.edit` | My Sports section head with pencil | pushes to sport-types.html |
| `coach.profile.about.edit` | About Me section head with pencil | pushes to personal-data About me editor |
| `coach.profile.tile.languages` | Languages FitStatTile | pushes to personal-data Languages picker |
| `coach.profile.tile.sessions` | Training Sessions FitStatTile | pushes to sessions.html |
| `coach.profile.tile.locations` | Locations FitStatTile | pushes to locations.html |
| `coach.profile.tile.hours` | Available Hours FitStatTile | pushes to available-hours.html |
| `coach.profile.reviews.card` | FitReviewCard in carousel | generic — disambiguate via review id |
| `coach.profile.reviews.show-all` | "Show all N reviews" terminal card in carousel | pushes to s-coach-reviews |

#### All Reviews (`#s-coach-reviews`) push

| ID | Element | Notes |
|---|---|---|
| `coach.profile.reviews.back` | back chevron | returns to s-coach-profile |

#### Athlete-side coach profile (`shared/profile.html` → `#s-coach-v2`)

Partial registration — only the share-invite affordance. Remaining `athlete.coach-profile.*` ids to be populated when that screen's epic lands (see scope note above).

| ID | Element | Notes |
|---|---|---|
| `athlete.coach-profile.share` | share icon-btn in floating header (over hero) | opens coach share-invite sheet |
| `athlete.coach-profile.share.sheet.copy` | "Copy" button in share sheet | copies `321.fit/invite/<coach>` to clipboard |
| `athlete.coach-profile.share.sheet.done` | "Done" closing share sheet | |

### `sport-types` — sport picker + custom sports (`coach/sport-types.html`)

Shared multi-select sport picker (coach + athlete). Custom-sport creation is coach-side. Spec: `sport-picker.md`.

| ID | Element | Notes |
|---|---|---|
| `coach.sport-types.custom.create-trigger` | "Create custom sport" prompt (empty) **or** the compact "+ Add" tile (once ≥1 custom) | opens the custom-sport drawer |
| `coach.sport-types.custom.name` | sport-name text input in drawer | name only |
| `coach.sport-types.custom.confirm` | "Create" in drawer | adds a coach-private custom sport (`isGlobal=false`) |
| `coach.sport-types.custom.cancel` | "Cancel" in drawer | dismiss |

### `settings` — settings hub + sub-screens

Prototypes: `coach/settings.html` + every sub-screen (personal-data, calendar-sync, balance, etc.)

| ID | Element | Screen | Notes |
|---|---|---|---|

#### `calsync` — Calendar Sync sub-module (`coach/calendar-sync.html`)

Has its own `coach.calsync.*` scope since it's a distinct subsystem (connects Google/Apple). Populated for the bits added in the 2026-05-20/21 session (Default destination, Refresh). Calendar list + Apple CalDAV connect are Phase 2 backfill.

| ID | Element | Screen | Notes |
|---|---|---|---|
| `coach.calsync.refresh` | refresh icon-btn in header | s-calsync (list of all accounts) | refetches every connected account |
| `coach.calsync.connect` | "+ Connect account" inline btn | s-calsync § Calendars to check for conflicts (header right) | starts Google OAuth (Apple hidden v1) |
| `coach.calsync.account.row` | account row (Google) | s-calsync § Calendars to check for conflicts | generic — disambiguate via account email |
| `coach.calsync.write-target.selector` | "Calendar to add events to" row | s-calsync (root selector) | tap → push s-write-target-picker |
| `coach.calsync.write-target.back` | back chevron | s-write-target-picker | returns to s-calsync |
| `coach.calsync.write-target.row` | calendar row in picker | s-write-target-picker | generic — disambiguate via `data-calendar-id` |
| `coach.calsync.detail.refresh` | refresh icon-btn in header | s-cal-detail (per-account) | refetches just this account's calendars |
| `coach.calsync.detail.calendar.row` | calendar toggle row (read source) | s-cal-detail "Select calendars to sync" | generic — disambiguate via `data-calendar-id` |
| ~~`coach.calsync.detail.make-default`~~ | ~~"Make default destination" action row~~ | ~~s-cal-detail~~ | **REMOVED 2026-06-01** — default destination is per-calendar global selector now |
| ~~`coach.calsync.hidden-events.row` / `.unhide`~~ | ~~hidden event row + Unhide btn~~ | ~~s-cal-detail Hidden events section~~ | **REMOVED 2026-06-03** — Hidden events management section dropped (over-complex) |

### `account-access` — re-auth / change-password / delete-account / role removal

Prototype: `shared/account-access.html`

| ID | Element | Screen | Notes |
|---|---|---|---|
| `account.roles.coach` | "Your roles" → Coach row | `s-hub` | → `s-role-remove` (manage/stop the secondary role; active role row is non-tappable) |
| `account.role-remove.back` | back chevron | `s-role-remove` | → Account Access hub |
| `account.role-remove.stop` | "Stop coaching" (clean state) | `s-role-remove` | opens confirm sheet (reversible deactivate — no re-auth) |
| `account.role-remove.confirm` | "Stop coaching" in confirm sheet | `s-role-remove` | deactivates role, switches to kept role |

### `earnings` — coach balance / earnings / transactions

Prototype: `coach/balance.html`

Full coverage for all 8 coach earnings screens populated 2026-05-22. **Stripe section moved to standalone flow `coach/stripe.html` on 2026-06-02** — namespace `coach.stripe.*` (not `coach.earnings.stripe.*`). Edit field screens (Name / Email / Phone / Country / Address) added so all confirm-screen fields are properly editable via push screens (instead of fake lock icons). DOB uses the canonical 3-wheel `dob-picker-sheet` (copied from `personal-data.html`). Sections below.

#### Main Earnings (`#s-earnings` — two-axis swiper)

| ID | Element | Notes |
|---|---|---|
| `coach.earnings.back` | back chevron | returns to settings |
| `coach.earnings.cash.tap-zone` | Cash card body | tap → Earnings history (Cash filter) |
| `coach.earnings.cash.owed-row` | "€X owed by N athletes" row | tap → Clients |
| `coach.earnings.card.connect-stripe` | "Connect Stripe" CTA | Card lock state |
| `coach.earnings.card.verifying-details` | "View details" row | Card verifying state — opens s-stripe |
| `coach.earnings.card.resolve` | "Resolve now" CTA | Card action-required state |
| `coach.earnings.card.tap-zone` | Card body (Available + Pending split) | tap → Earnings history (Card filter) |
| `coach.earnings.card.pending.tap-zone` | Pending col (full hit area) | tap → s-pending breakdown |
| `coach.earnings.card.withdraw` | "Withdraw" pill (premium) | Card active state |
| `coach.earnings.swiper.dot` | dot indicator | generic — disambiguate via `data-idx` |
| `coach.earnings.activity.view-all` | "View all" link | section action → s-transactions |
| `coach.earnings.activity.filter-chip` | filter chip in Recent activity | generic — `data-filter="all\|cash\|card\|payouts"` |
| `coach.earnings.activity.row` | activity row | generic — `data-method="card\|cash\|payout"` |
| `coach.earnings.lifetime-footer` | lifetime summary footer | tap → Earnings history (All filter) |
| `coach.earnings.withdraw.confirm` / `.cancel` | Withdraw sheet actions | |
| `coach.earnings.snackbar.retry` | error snackbar Retry link | |

#### Pending breakdown (`#s-pending`)

| ID | Element | Notes |
|---|---|---|
| `coach.earnings.pending.back` | back chevron | returns to s-earnings |
| `coach.earnings.pending.row` | session-in-hold row | generic — disambiguate via athlete name or `data-method` |

#### Transactions (`#s-transactions`)

| ID | Element | Notes |
|---|---|---|
| `coach.earnings.transactions.back` | back chevron | |
| `coach.earnings.transactions.filter-chip` | filter chip | generic — `data-filter="all\|earnings\|payouts\|refunds"` |
| `coach.earnings.transactions.row` | transaction row | generic — `data-kind="earning\|payout\|refund"` |

#### Earning detail (`#s-txn-earning`)

| ID | Element | Notes |
|---|---|---|
| `coach.earnings.txn-earning.back` | back chevron | |

#### Cash earning detail (`#s-txn-cash`)

| ID | Element | Notes |
|---|---|---|
| `coach.earnings.txn-cash.back` | back chevron | |
| `coach.earnings.txn-cash.mark-paid` | "Mark as paid" primary CTA | terminal action — POST mark-paid |

#### Payout detail (`#s-txn-payout`)

| ID | Element | Notes |
|---|---|---|
| `coach.earnings.txn-payout.back` | back chevron | |

#### Earnings History (`#s-earnings-history`)

| ID | Element | Notes |
|---|---|---|
| `coach.earnings.history.back` | back chevron | |
| `coach.earnings.history.filter-chip` | filter chip | generic — `data-filter="all\|card\|cash"` |
| _(Month rows currently read-only; tap-to-drill arrives with month-filter chip on Transactions per Variant A — id will be added then.)_ | | |

#### Payout methods (`#s-methods`)

| ID | Element | Notes |
|---|---|---|
| `coach.earnings.methods.back` | back chevron | |
| `coach.earnings.methods.row` | provider card | generic — `data-provider="stripe\|revolut"` |
| `coach.earnings.methods.connect` | inline "Connect" CTA | empty-state per-provider |
| `coach.earnings.methods.radio` | default radio | multi-method state |
| `coach.earnings.methods.more-menu` | ⋯ button | per-provider context menu trigger |
| `coach.earnings.methods.context-menu.set-default` | menu item | |
| `coach.earnings.methods.context-menu.disconnect` | menu item | destructive |
| `coach.earnings.methods.disconnect.confirm` / `.cancel` | confirm sheet actions | |

#### Stripe Connect — control center (`#s-stripe` done state, refactored 2026-06-02)

| ID | Element | Notes |
|---|---|---|
| `coach.stripe.start-setup` | "Start setup" CTA | none state — pushes to onb-confirm |
| `coach.stripe.continue-pending` | "Continue setup" CTA | pending state |
| `coach.stripe.resolve` | "Resolve now" CTA | action-required state — deep-link to failing onb step |
| `coach.stripe.bank.row` | bank account row | generic — `data-bank-id="..."` |
| `coach.stripe.bank.add` | dashed "+ Add bank account" card | |
| `coach.stripe.available` | Available balance value | shown in payout summary card |
| `coach.stripe.manual-toggle` | manual payouts toggle row | tap to switch auto↔manual |
| `coach.stripe.withdraw` | Withdraw CTA in payouts block | visible only in manual mode |
| `coach.stripe.payouts.view-all` | "View all" action in Activity section | → s-stripe-payouts |
| `coach.stripe.payouts.row` | activity row (single recent payout) | |
| `coach.stripe.disconnect` | "Disconnect Stripe" destructive CTA | opens disconnect sheet |
| `coach.stripe.disconnect.confirm` / `.cancel` | disconnect sheet actions | 3 variants: clean / pending-balance / active-events |

#### Stripe Onboarding — Confirm info (`#s-stripe-onb-confirm`)

| ID | Element | Notes |
|---|---|---|
| `coach.stripe.onb.confirm.back` | back chevron | |
| `coach.stripe.onb.confirm.name` | row | tap → `s-stripe-onb-edit-name` push |
| `coach.stripe.onb.confirm.email` | row | tap → `s-stripe-onb-edit-email` push |
| `coach.stripe.onb.confirm.phone` | row | tap → `s-stripe-onb-edit-phone` push |
| `coach.stripe.onb.confirm.country` | row | tap → `s-stripe-onb-edit-country` push (search + list) |
| `coach.stripe.onb.confirm.dob` | row | tap → opens canonical `dob-picker-sheet` (3-wheel bottom sheet) |
| `coach.stripe.onb.confirm.address` | row | tap → `s-stripe-onb-edit-address` push (4-field form) |
| `coach.stripe.onb.confirm.continue` | primary CTA | step 1 of 3 |
| `coach.stripe.onb.dob.set` / `.cancel` | sheet actions | DOB wheel picker |

#### Stripe Onboarding — Edit Name (`#s-stripe-onb-edit-name`)

| ID | Element | Notes |
|---|---|---|
| `coach.stripe.onb.edit-name.cancel` / `.save` | header buttons | iOS Cancel-Save pattern |
| `coach.stripe.onb.edit-name.first` / `.last` | inputs | must match government-issued ID |

#### Stripe Onboarding — Edit Email (`#s-stripe-onb-edit-email`)

| ID | Element | Notes |
|---|---|---|
| `coach.stripe.onb.edit-email.cancel` / `.save` | header buttons | |
| `coach.stripe.onb.edit-email.input` | email input | doesn't change sign-in email |

#### Stripe Onboarding — Edit Phone (`#s-stripe-onb-edit-phone`)

| ID | Element | Notes |
|---|---|---|
| `coach.stripe.onb.edit-phone.cancel` / `.save` | header buttons | |
| `coach.stripe.onb.edit-phone.input` | tel input | country code dropdown sits next to it |

#### Stripe Onboarding — Edit Country (`#s-stripe-onb-edit-country`)

| ID | Element | Notes |
|---|---|---|
| `coach.stripe.onb.edit-country.back` | back chevron | |
| `coach.stripe.onb.edit-country.search` | search input | filters list |
| `coach.stripe.onb.edit-country.row` | country row | generic — `data-country="XX"` `data-currency="YYY"` |

#### Stripe Onboarding — Edit Address (`#s-stripe-onb-edit-address`)

| ID | Element | Notes |
|---|---|---|
| `coach.stripe.onb.edit-address.cancel` / `.save` | header buttons | |
| `coach.stripe.onb.edit-address.line1` / `.line2` / `.city` / `.postal` | inputs | country is read-only (from confirm screen) |

#### Stripe Onboarding — Verification (`#s-stripe-onb-id`)

| ID | Element | Notes |
|---|---|---|
| `coach.stripe.onb.id.back` | back chevron | |
| `coach.stripe.onb.id.upload-front` | front-of-ID upload tile | |
| `coach.stripe.onb.id.upload-back` | back-of-ID upload tile | optional for passports |
| `coach.stripe.onb.id.continue` | primary CTA | step 2 of 3 |
| `coach.stripe.onb.id.skip` | "Skip for now" text button | sets state→skipped, auto-advances; `s-stripe` lands in action-required on return |

#### Stripe Onboarding — Bank account (`#s-stripe-onb-bank`)

| ID | Element | Notes |
|---|---|---|
| `coach.stripe.onb.bank.back` | back chevron | |
| `coach.stripe.onb.bank.iban` | IBAN input | |
| `coach.stripe.onb.bank.swift` | SWIFT/BIC input | optional |
| `coach.stripe.onb.bank.submit` | submit CTA | disabled until T&C consent checked |

#### Add bank account (`#s-stripe-bank-add`)

| ID | Element | Notes |
|---|---|---|
| `coach.stripe.bank-add.back` | back chevron | |
| `coach.stripe.bank-add.iban` / `.swift` | inputs | |
| `coach.stripe.bank-add.submit` | submit CTA | optional Set-as-default checkbox above |

#### Bank account detail (`#s-stripe-bank-detail`)

| ID | Element | Notes |
|---|---|---|
| `coach.stripe.bank-detail.back` | back chevron | |
| `coach.stripe.bank-detail.set-default` | "Set as default" CTA | visible only on non-default banks |
| `coach.stripe.bank-detail.remove` | destructive remove CTA | opens 3-variant sheet (last / default / normal) |
| `coach.stripe.bank-detail.remove.confirm` / `.cancel` | sheet actions | |

#### Withdraw (`#s-stripe-withdraw`, manual mode only)

| ID | Element | Notes |
|---|---|---|
| `coach.stripe.withdraw.back` | back chevron | |
| `coach.stripe.withdraw.amount` | amount input | |
| `coach.stripe.withdraw.chip` | quick-amount chip | generic — `€50 / €100 / All` |
| `coach.stripe.withdraw.destination` | destination bank row | v1 always default |
| `coach.stripe.withdraw.confirm` | confirm CTA | min €20 enforced |

#### Payouts history (`#s-stripe-payouts`)

| ID | Element | Notes |
|---|---|---|
| `coach.stripe.payouts.back` | back chevron | |
| `coach.stripe.payouts.row` | payout row | reuses `#s-txn-payout` on tap |

### `booking` — athlete books a coach session

Spec: `booking-flow.md` — prototype lives partly in `athlete/search.html` + `shared/profile.html` (Book Training).

| ID | Element | Screen | Notes |
|---|---|---|---|
| `athlete.coach-profile.book-training` | "Book Training" sticky CTA | `s-coach-v2` | → `s-book-sessions` catalog |
| `athlete.coach-profile.reviews.book-training` | "Book Training" CTA | `s-reviews` | → `s-book-sessions` catalog |
| `athlete.booking.catalog.book` | "Book · €X" on a session card | `s-book-sessions` | generic — personal → `s-booking` grid, group → `s-group` |
| `athlete.booking.grid` | time-grid scroll/tap area | `s-booking` (personal) | tap a free band to place the slot block |
| `athlete.booking.slot` | draggable `.fit-bk-sel` selection block | `s-booking` (personal) | drag to set start; Maestro reads time via label |
| `athlete.booking.pay-cash` | "Cash" payment chip | `booking-confirm-sheet` | shown only when coach accepts both; preselected by default |
| `athlete.booking.pay-balance` | "Balance" payment chip | `booking-confirm-sheet` | pay from prepaid 321Fit balance; CTA flips to "Top up balance" if short |
| `athlete.calendar.empty.find-coach` | "Find a coach" CTA | `s-schedule` (empty day-state) | navigates to `my-coaches.html` |
| `athlete.calendar.error.retry` | "Retry" on schedule load error | `s-schedule` (error day-state) | re-fetches the day's events |
| `coach.invite.select.back` | back chevron | `s-invite-select` | returns to origin (calendar/clients) via `resolveOrigin` |
| `coach.invite.grid` | time-grid scroll/tap area | `s-invite-time` | mirror of athlete grid (coach invite/schedule) |
| `coach.invite.slot` | draggable `.fit-bk-sel` selection block | `s-invite-time` | drag to set start |
| `coach.invite.time.back` | back chevron | `s-invite-time` | returns to `s-invite-select` (template chooser) |

### `my-coaches` — athlete relationships + reviews (`athlete/my-coaches.html`)

Tab 2. List + per-coach relationship detail + history + private note + review composer. Specs: `booking-flow.md` (rebook), `reviews.md`.

| ID | Element | Screen | Notes |
|---|---|---|---|
| `athlete.my-coaches.search` | loupe in header | `s-my-coaches` | → pushes Search (discovery) |
| `athlete.my-coaches.row` | coach relationship card | `s-my-coaches` | generic; → `s-coach-detail` |
| `athlete.my-coaches.fav` | ❤️ on a row | `s-my-coaches` | toggle saved |
| `athlete.my-coaches.rebook` | Rebook on a row | `s-my-coaches` | → `s-book-sessions` grid |
| `athlete.my-coaches.cancel-request` | Cancel on a pending row | `s-my-coaches` | cancel sent request (confirm TBD) |
| `athlete.coach-detail.back` | back chevron | `s-coach-detail` | → `s-my-coaches` |
| `athlete.coach-detail.view-profile` | identity row | `s-coach-detail` | → public coach profile `s-coach-v2` |
| `athlete.coach-detail.owed` | Cash-owed scroll list | `s-coach-detail` | per-session cash debts; hidden in no-debt state |
| `athlete.coach-detail.upcoming` | Upcoming cards scroll | `s-coach-detail` | tap card → calendar |
| `athlete.coach-detail.note` | My-note outline card | `s-coach-detail` | → `s-coach-note-editor` |
| `athlete.coach-detail.history` | Training-history link | `s-coach-detail` | → `s-coach-history` |
| `athlete.coach-detail.write-review` | "Write a review" CTA | `s-coach-detail` (no-review) | → composer (write) |
| `athlete.coach-detail.edit-review` | "Edit" on a review | `s-coach-detail` (has-review) | → composer (edit) |
| `athlete.coach-detail.rebook` | sticky Rebook | `s-coach-detail` | → `s-book-sessions` grid |
| `athlete.coach-history.back` | back chevron | `s-coach-history` | → `s-coach-detail` |
| `athlete.coach-note.cancel` / `.save` | Cancel / Save | `s-coach-note-editor` | private note (notepad) |
| `athlete.review.close` | × close | `s-coach-review` | dismiss modal composer |
| `athlete.review.delete` | trash | `s-coach-review` (edit) | delete review |
| `athlete.review.stars` | star rating row | `s-coach-review` | tap to set 1–5 |
| `athlete.review.post` | sticky CTA | `s-coach-review` | Post / Update review |

### `profile` (athlete) — `athlete/profile.html` (tab 5)

Trimmed mirror of coach Profile (`.cp-*` grammar; no video hero). Spec: `athlete-profile.md`.

| ID | Element | Screen | Notes |
|---|---|---|---|
| `athlete.profile.role-switch.trigger` | role chip (header top-left, "Athlete" + swap icon) | `s-profile` | role-switch confirm drawer (first time) / instant switch |
| `athlete.profile.role-switch.confirm` | primary CTA in role-switch drawer | `s-profile` | athlete→coach: creates `coach_profile` → coach onboarding |
| `athlete.profile.role-switch.cancel` | "Not now" in role-switch drawer | `s-profile` | dismiss |
| `athlete.profile.settings` | gear (header right) | `s-profile` | → settings.html |
| `athlete.profile.identity` | identity row (avatar + name + location) | `s-profile` | → Personal Data (TBD) |
| `athlete.profile.sports.edit` | "My sports" head + pencil | `s-profile` | → sport-types.html |
| `athlete.profile.about.edit` | "About me" head + pencil | `s-profile` | → Personal Data (TBD) |
| `athlete.profile.tile.history` | Training-history tile | `s-profile` | → `s-training-history` (aggregate, all coaches) |
| `athlete.training-history.back` | back chevron | `s-training-history` | → profile |
| `athlete.profile.tile.coaches` | My-coaches tile | `s-profile` | → my-coaches.html |
| `athlete.profile.tile.calendar-sync` | Calendar-sync tile | `s-profile` | → calendar-sync.html |
| `athlete.profile.tile.balance` | Balance tile | `s-profile` | → balance.html |
| `athlete.profile.review` | a "My reviews" card (generic) | `s-profile` | review athlete left to a coach |

### `inbox` (athlete) — unified Inbox (`athlete/dashboard.html#s-notifications`)

3 tabs (Activity / To reply / Waiting). Spec: `athlete-dashboard.md`. Mirrors coach `coach.inbox.*`.

| ID | Element | Screen | Notes |
|---|---|---|---|
| `athlete.inbox.tab.activity` / `.toreply` / `.waiting` | segmented tabs | `s-notifications` | switch panel |
| `athlete.inbox.toreply.decline` / `.accept` | buttons on a `.req-card` | `s-notifications` (To reply) | coach invite / reschedule |
| `athlete.inbox.waiting.cancel` | "Cancel request" on a `.req-card` | `s-notifications` (Waiting) | withdraw sent request |
| `athlete.dashboard.messages` | Messages icon (header, left of bell) | `s-dashboard` | → messages.html |
| `coach.dashboard.messages` | Messages icon (header, left of bell) | `s-dashboard` (coach) | → messages.html?role=coach |
| `athlete.dashboard.balance` | balance card | `s-dashboard` | → balance.html |
| `athlete.dashboard.balance.topup` | "Top up" on balance widget | `s-dashboard` | → `balance.html#s-top-up` (deep-link) |
| `athlete.dashboard.balance.transactions` | "Transactions" on balance widget | `s-dashboard` | → `balance.html#s-balance` |
| `athlete.dashboard.low-balance.topup` | "Top up now" (low-balance state) | `s-dashboard` | → `balance.html#s-top-up` |
| `athlete.dashboard.attention.awaiting` | "requests awaiting confirmation" row | `s-dashboard` | → Inbox Waiting tab |

### `settings` (athlete) — `athlete/settings.html`

Trimmed analog of coach Settings. Spec: `settings.md` (Athlete section).

| ID | Element | Screen | Notes |
|---|---|---|---|
| `athlete.settings.back` | back chevron | `s-settings` | → profile.html |
| `athlete.settings.personal-info` | Edit personal info card | `s-settings` | → Personal Data (TBD) |
| `athlete.settings.invite-friend` | Invite a friend card | `s-settings` | placeholder (referral on hold) |
| `athlete.settings.sport` | Choose a sport card | `s-settings` | → sport-types.html |
| `athlete.settings.calendar-sync` | Calendar Sync card | `s-settings` | → calendar-sync.html |
| `athlete.settings.integrations` | Integrations card | `s-settings` | → integrations.html |
| `athlete.settings.balance` | Balance card | `s-settings` | → balance.html |
| `athlete.settings.account-access` | Account Access card | `s-settings` | → account-access.html |
| `athlete.settings.logout` | Log out row | `s-settings` | "Signed out" toast |

### `integrations` (athlete) — `athlete/integrations.html`

| ID | Element | Screen | Notes |
|---|---|---|---|
| `athlete.integrations.back` | back chevron | `s-integrations` | → settings.html |
| `athlete.integrations.strava.connect` | "Connect" (Strava) | `s-integrations` | → Strava OAuth (app/Safari) |
| `athlete.integrations.strava.disconnect` | "Disconnect" (Strava) | `s-integrations` | revokes `strava_connection` |
| `athlete.integrations.health.enable` | "Enable" (Apple Health) | `s-integrations` | → native HealthKit permission dialog |
| `athlete.integrations.health.allow` | "Allow" in HK permission sheet | `hk-sheet` | native iOS dialog (repr.) |

### `balance` (athlete) — `athlete/balance.html`

Spending ledger (mirror of coach Earnings). Spec: `payments.md` Flow C1.

| ID | Element | Screen | Notes |
|---|---|---|---|
| `athlete.balance.back` | back chevron | `s-balance` | → settings.html |
| `athlete.balance.topup` | "Top up" pill (hero) | `s-balance` | → Stripe top-up sheet (TBD) |
| `athlete.balance.filters` | filter chip row | `s-balance` | All / Top-ups / Spent / Refunds |
| `athlete.balance.txn` | a transaction row (generic) | `s-balance` | → detail by type (spend/topup/refund) |
| `athlete.balance.txn-spend.back` | back chevron | `s-txn-spend` | session-payment detail → balance |
| `athlete.balance.txn-topup.back` | back chevron | `s-txn-topup` | top-up detail → balance |
| `athlete.balance.txn-refund.back` | back chevron | `s-txn-refund` | refund detail → balance |
| `athlete.balance.auto-topup-status` | hero auto-topup note (tappable) | `s-balance` | → `s-top-up` (auto mode) |
| `athlete.balance.topup` | hero "Top up" pill | `s-balance` | → `s-top-up` (one-time) |
| `athlete.topup.back` | back chevron | `s-top-up` | → balance |
| `athlete.topup.mode-once` | "One-time" segment | `s-top-up` | manual top-up mode |
| `athlete.topup.mode-auto` | "Automatic" segment | `s-top-up` | auto top-up mode |
| `athlete.topup.amount` | one-time amount chip | `s-top-up` | €50 / €100 / Custom |
| `athlete.topup.cta` | footer CTA (label per mode/state) | `s-top-up` | Top up €X / Turn on / Save |
| `athlete.topup.pay` | "Pay €X" in checkout | `checkout-sheet` | native Stripe PaymentSheet repr. |
| `athlete.auto-topup.threshold` | "When below" chip row | `s-top-up` | threshold preset/custom |
| `athlete.auto-topup.amount` | "Top up by" chip row | `s-top-up` | amount preset/custom |
| `athlete.auto-topup.card` | charge-card row (saved) | `s-top-up` | → card picker (no wallets) |
| `athlete.auto-topup.add-card` | "Add a card" row (first-time, no saved card) | `s-top-up` | → Stripe PaymentSheet (setup) |
| `athlete.auto-topup.turn-off` | "Turn off auto top-up" | `s-top-up` | when enabled |
| `athlete.auto-topup.warn.update-card` | "Update" on declined/expired banner | `s-top-up` | → card picker |
| `athlete.auto-topup.warn.confirm` | "Confirm" on authentication-required banner | `s-top-up` | → 3DS sheet |
| `athlete.auto-topup.auth.confirm` | "Confirm with bank" in 3DS sheet | `auth-sheet` | native 3-D Secure repr. |
| `athlete.card-picker.card` | a card option (auto top-up) | `cardpick-at` | select saved card |
| `athlete.card-picker.add-card` | "Add new card" | `cardpick-at` | → Stripe PaymentSheet (setup) |
| `athlete.booking.setup-auto-topup` | contextual "set up auto top-up" | `booking-confirm-sheet` | shown when balance short → balance |

### `messages` (shared, athlete + coach) — `shared/messages.html`

| ID | Element | Screen | Notes |
|---|---|---|---|
| `messages.back` | back chevron | `s-messages` | → previous screen |
| `messages.compose` | compose ✎ (header) | `s-messages` | → New message |
| `messages.conversation` | a conversation row | `s-messages` | → thread |
| `messages.empty.new` | "New message" (empty state) | `s-messages` | → New message |
| `messages.new.close` | "Close" | `s-new-message` | → list |
| `messages.new.person` | a connected person row (checkbox, multi-select) | `s-new-message` | toggle select |
| `messages.new.create` | "Create" (enables on first pick) | `s-new-message` | 1 → 1:1, 2+ → group |
| `messages.group.back` | back chevron | `s-group-thread` | → list |
| `messages.group.settings` | header ⚙ / name tap | `s-group-thread` | → group settings |
| `messages.group.input` / `.send` | composer | `s-group-thread` | |
| `messages.group-settings.back` | back chevron | `s-group-settings` | → group thread |
| `messages.group-settings.rename` | group name (pencil) | `s-group-settings` | → rename sheet (admin) |
| `messages.group-settings.rename-input` | name field in rename sheet | `rename-sheet` | `PATCH .../{id}` title |
| `messages.group-settings.add` | "Add people" row | `s-group-settings` | → multi-select picker (add to group) |
| `messages.group-settings.remove-member` | remove "−" on a member row | `s-group-settings` | admin/creator only → confirm |
| `messages.group-settings.mute` | Mute toggle | `s-group-settings` | |
| `messages.group-settings.leave` | Leave conversation (destructive) | `s-group-settings` | → confirm sheet |
| `messages.thread.back` | back chevron | `s-thread` | → list |
| `messages.thread.settings` | header ⚙ / name tap | `s-thread` | → conversation settings |
| `messages.thread.attach` | attach + (share a session — later) | `s-thread` | composer |
| `messages.thread.input` | message field | `s-thread` | composer |
| `messages.thread.send` | send | `s-thread` | composer |
| `messages.settings.back` | back chevron | `s-thread-settings` | → thread |
| `messages.settings.mute` | Mute conversation toggle | `s-thread-settings` | |
| `messages.settings.delete` | Delete conversation (destructive) | `s-thread-settings` | → confirm sheet |

### `search` (athlete, partial) — `athlete/search.html`

| ID | Element | Screen | Notes |
|---|---|---|---|
| `athlete.search.back` | back (× of discovery) | `s-search-landing` | pushed from My Coaches loupe → history.back |
| `athlete.search.sport` | sport selector | `s-search-landing` | own row below nav → sport-types |
| `athlete.search.text` | text-search icon | `s-search-landing` | → `s-search-text` |

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

### `assistant` — voice assistant (conversational canvas)

Prototype: `shared/voice-assistant.html` (Phase 4 redesign). Spec: `voice-assistant.md`.

| ID | Element | Screen | Notes |
|---|---|---|---|
| `assistant.close` | close icon-btn (header) | `s-assistant` | dismiss the assistant |
| `assistant.mic` | mic button (control bar) | `s-assistant` | start/stop voice; states idle/listening/thinking/speaking |
| `assistant.booking.confirm` | "Confirm booking" on the preview card | `s-assistant` | confirm `training_event_preview` (routing TBD — agent RPC vs app→backend) |

> Earlier `voice.*` (FAB + sheet overlay) is still deferred — the contextual FAB overlay is a later layer on top of this canvas.

---

## Cross-references

- Convention (rules): [`feedback_a11y_naming`](#) (memory)
- Prototype rule: [`feedback_prototype_a11y`](#) (memory)
- Rollout plan: [`a11y-rollout-plan`](#) (memory)
- iOS legacy a11y (issue #156, evvseenko): [`a11y-identifiers-plan`](#) (memory)
- Maestro flows that will consume IDs: `test-automation/maestro/flows/**`
