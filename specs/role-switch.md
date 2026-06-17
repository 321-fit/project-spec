# Role Switch (Athlete ⇄ Coach)

> Status: **Draft**
> Prototype: [athlete/profile.html](https://321-fit.github.io/project-spec/prototypes/flows/athlete/profile.html) · [coach/profile.html](https://321-fit.github.io/project-spec/prototypes/flows/coach/profile.html)
> Component library: [design-tokens/docs/components.md](../../design-tokens/docs/components.md)
> Last updated: 2026-06-12
> Implementation:
> - iOS:     [321fit_ios/docs/role-switch-ios.md] (to be created)
> - Android: [321fit_android/docs/role-switch-android.md] (to be created)
> - Backend: [poly-backend/docs/role-switch-api.md] (to be created)

---

## 1. Overview — what & why

A single account can be **both an athlete and a coach**. **Role Switch** lets a user move between the two role views without a second signup. The switch is reached from a **top-left switcher chip on the Profile screen** (both roles).

**Why:** many real users are both — a coach also trains with other coaches; an experienced athlete decides to start coaching. One account, two views, no re-registration.

**Key model decisions:**
- **Lazy second role.** A user has one role at registration; the other role's profile is **created on the first switch**, not by default. "First time" = the target role's profile doesn't exist yet — profile existence is the gate, no extra flag.
- **First switch shows a confirmation drawer**; every switch after that is **instant** (no sheet).
- **Asymmetric setup:**
  - **athlete → coach (heavy):** confirm → create `coach_profile` → enter **coach onboarding** ([onboarding-wizard.md](onboarding-wizard.md): sports · sessions · gym/location · available hours) → coach view. Coach profile becomes visible to athletes only after onboarding completes + admin review (per onboarding-wizard).
  - **coach → athlete (light):** confirm → create `athlete_profile` → switch **instantly** (nothing else to set up).
- **Additive, not destructive** → a **bottom sheet** (`.fit-sheet`), not a center modal. Reuses the calendar cross-role sheet pattern. (Center modals read as destructive in our system.)

---

## 2. User stories

- As an athlete who feels ready to coach, I want to **become a coach from my Profile** so I can offer sessions without making a new account.
- As a coach who also wants to train, I want to **switch to the athlete view** so I can book and train with other coaches.
- As a dual-role user, I want **switching to be one tap** after the first time, so moving between my two views is frictionless.
- As a first-time switcher, I want a **clear confirmation** of what happens next (especially the coach setup) before I commit.

## 3. System stories

**Backend model — confirmed in poly-backend (2026-06-12, `feature/phase4-coach-rework`):** the dual-role architecture already exists.
- `user_role` is a **many-to-many** join (a user can hold both `athlete` and `coach` roles).
- `user.active_role_id` (nullable FK → `role`) already stores the **active role**.
- `athlete_profile.user_id` and `coach_profile.user_id` are each **unique** → both profiles can coexist, 1:1 with the user.
- **Registration creates exactly one profile** (`register.py` `_ROLE_PROFILE_MAP`, default `athlete`) — confirms the lazy-second-role model.
- **`GET /user/me` already loads both profiles** and computes `active_role`; it returns the active role's profile as the base profile.

Given that, the system stories:
- As the backend, switching to a role the user **already holds** is just setting `active_role_id` (no creation).
- As the backend, switching to a role the user **doesn't hold yet** must, on confirm, **add the `user_role` row + create that role's profile** (athlete = instant; coach = via the onboarding profile-creation path), then set it active.
- As the client, **active role** drives the tab set / navigation / endpoints; `GET /user/me` tells me the active role and (after the additive change below) which roles already exist → first-time drawer vs instant switch.

---

## 4. Flow

```
PROFILE (either role) → tap role-switch chip (top-left)
   │
   ├─ target role profile EXISTS → switch instantly (no sheet) → target role's home
   │
   └─ target role profile MISSING (first time) → confirmation DRAWER
         ├─ athlete → coach:  "Set up coaching" → create coach_profile → COACH ONBOARDING → coach home
         ├─ coach → athlete:  "Yes, set me up" → create athlete_profile → athlete home (instant)
         └─ "Not now" → dismiss, stay
```

---

## 5. Screens (prototype)

- **Switcher chip** — top-left of Profile header (replaces the static "Profile" title), label = current role + swap icon. `data-a11y-id`: `<role>.profile.role-switch.trigger`.
- **Confirmation drawer** (`#role-switch-sheet`) — bottom sheet: directional hero (icon + title + body), an info note about what's set up next, stacked equal-width buttons (primary confirm + "Not now"). Direction-aware copy via `rs-to-coach` / `rs-to-athlete` classes. `data-a11y-id`: `<role>.profile.role-switch.confirm` / `.cancel`.

Copy is placeholder pending **Настя**.

### 5.1 Remove / deactivate a role

A user who added a second role can turn it off. Prototype: `shared/account-access.html` — **Account Access → Your roles** section + `s-role-remove` screen.

- **Deactivate, not hard-delete** (v1). Coaching is turned off (unlisted from search, no new bookings) but **earnings history, reviews-received and payout details are kept** — and it's **reversible**: re-enable anytime via the role switch (profile rows are retained). True profile deletion = Delete account.
- **Home:** Account Access (shared account screen) → **Your roles**. The active role row is tagged **Active** (driven by the session's active role — coach view vs athlete view, mirror-symmetric). The **second-role row has three states**:
  - **dual** (role exists & on) → "manage or stop" → `s-role-remove`.
  - **single** (never added) → an **add CTA** ("Become a coach" / "Train as an athlete", teal + icon) → the role-switch add flow (coach → onboarding; athlete → instant).
  - **off** (deactivated) → **"Turned off · tap to turn back on"** + `Off` tag → reactivate (instant, profile retained — re-lists the coach / re-enables the athlete side).
- The switch chip *adds/switches*; Account Access *manages/removes/resumes* (clean split).
- **`s-role-remove`** — two states (reuses the delete-flow grammar; no new components):
  - **clean** (`rr-clean`) — `.del-consequences` (kept ✓ teal / hidden 👁) + `.del-note` + **Stop coaching** (`.fit-btn-destructive`) → confirm sheet → switch to the kept role. **Reversible ⇒ single confirm, no re-auth** (unlike Delete account, which re-auths).
  - **blocked** (`rr-blocked`) — `.del-blocker-list`: unsettled money / sessions must be resolved first (pending payout · upcoming sessions · cash owed for coach; balance · upcoming bookings for athlete), each deep-links to resolve; Stop button disabled.
- **Edge cases:** can't remove the **last/only** role (→ Delete account); removing the **active** role auto-switches to the kept one.
- a11y: `account.roles.<role>` (Your-roles row) + `account.role-remove.*` (back / stop / confirm).

Copy is placeholder pending **Настя**.

---

## 6. Endpoints (overview)

> Detail + wire format in `poly-backend/docs/role-switch-api.md` (to be created) + live Swagger.

The schema is ready; three gaps to build:

| Gap | Shape | Note |
|---|---|---|
| **Set active role** (NEW) | `PATCH /user/active-role {role}` (or similar) → sets `user.active_role_id` | No such endpoint today — `active_role_id` is only set at register/social. This is the core new endpoint. |
| **Lazy role+profile on switch** (NEW) | if the user lacks the target role: add `user_role` row + create the profile (coach → onboarding's profile-creation path, not a parallel one), then set active | athlete = instant; coach = land in onboarding/in-review |
| **Expose role existence** (ADDITIVE) | add `has_athlete_profile` / `has_coach_profile` (or both-profile presence) to `GET /user/me` | drives the chip + first-time-drawer gate; `active_role` is already returned |
| **Deactivate a role** (NEW) | `DELETE /user/roles/{role}` (or `PATCH` deactivate) → drop the `user_role` row, retain the profile, auto-set `active_role_id` to the kept role | must be **gated** server-side on unsettled state (pending payout / upcoming sessions / cash owed / positive balance / upcoming bookings) → 409 with the blockers; reactivation = the lazy-add path reuses the existing profile |

**Backward-compat:** additive only — `GET /user/me` already returns `active_role`; just add the existence flags. Don't retype/rename the existing role field. See [feedback_backward_compat_endpoints].

---

## 7. Open questions

- **JWT role scoping:** is the access token role-scoped, or role-agnostic with `active_role` read per request? If scoped, the switch endpoint must return a refreshed token. *(Model resolved; this is the one remaining backend detail to confirm in the auth layer.)*
- **Coach visibility on athlete→coach:** newly created coach is unlisted until onboarding + admin review complete (per onboarding-wizard) — confirm the switch lands the user in the in-review state correctly.
- **Cancellation mid-onboarding:** athlete→coach who abandons coach onboarding — is `coach_profile` left as a draft? Can they retry? (Likely: draft persists, chip still switches, onboarding resumes.)
- **Active-role persistence:** remember last active role across app launches.
- **Notifications/Stripe:** does a fresh coach need Stripe Connect before earning? (Yes — gate earning, not the switch.)
- **Deactivate vs hard-delete:** v1 = soft deactivate (reversible, data kept). Decide if/when a true per-role data wipe is offered (likely only via Delete account / Support). Define exact blocker set per role for the deactivate gate.

---

## 8. Cross-refs

- Coach onboarding the switch routes into: [onboarding-wizard.md](onboarding-wizard.md), [onboarding.md](onboarding.md)
- Identity / account (role-agnostic): [account-access.md](account-access.md)
- Coach profile created: [coach-profile.md](coach-profile.md)
- Memory: `project_role_switch`
