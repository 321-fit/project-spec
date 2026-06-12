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

- As the backend, an account may own an `athlete_profile` and/or a `coach_profile`; **registration creates the first role's profile only**. ⚠️ *Verify current behaviour with backend — see §7.*
- As the backend, switching to a role whose profile **doesn't exist** must **create it lazily** on confirm; switching to an existing role is a **view/active-role change** only.
- As the client, the **active role** drives which tab set / navigation / endpoints are used; switching changes the active role and re-renders the role's home.

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

---

## 6. Endpoints (overview)

> Detail + wire format in `poly-backend/docs/role-switch-api.md` (to be created) + live Swagger.

| Need | Likely shape | Note |
|---|---|---|
| Create missing role profile | `POST /coach/profile` (exists for onboarding) / `POST /athlete/profile` | Reuse onboarding's profile-creation; don't add a parallel path |
| Read which roles exist | dashboard/me payload should expose `has_athlete_profile` / `has_coach_profile` | Drives chip + first-time gate |
| Set active role | client-side active-role state (+ token scope if role-scoped) | Confirm whether JWT is role-scoped |

**Backward-compat:** additive only — add role-existence flags to the existing me/dashboard payload; do **not** retype the existing role field. See [feedback_backward_compat_endpoints].

---

## 7. Open questions / to verify

- **Backend data model (verify first):** does registration create exactly one profile? Is there a single `User` with optional `athlete_profile` + `coach_profile`, or role-scoped accounts? Is the JWT role-scoped (does switching need a token refresh)? This determines the whole backend task.
- **Coach visibility on athlete→coach:** newly created coach is unlisted until onboarding + admin review complete (per onboarding-wizard) — confirm the switch lands the user in the in-review state correctly.
- **Cancellation mid-onboarding:** athlete→coach who abandons coach onboarding — is `coach_profile` left as a draft? Can they retry? (Likely: draft persists, chip still switches, onboarding resumes.)
- **Active-role persistence:** remember last active role across app launches.
- **Notifications/Stripe:** does a fresh coach need Stripe Connect before earning? (Yes — gate earning, not the switch.)

---

## 8. Cross-refs

- Coach onboarding the switch routes into: [onboarding-wizard.md](onboarding-wizard.md), [onboarding.md](onboarding.md)
- Identity / account (role-agnostic): [account-access.md](account-access.md)
- Coach profile created: [coach-profile.md](coach-profile.md)
- Memory: `project_role_switch`
