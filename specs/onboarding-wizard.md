# Onboarding Wizard

> Status: Draft
> Prototype: [flows/coach/dashboard.html](https://321-fit.github.io/project-spec/prototypes/flows/coach/dashboard.html) (state `dst-new`)
> Component library: [design-tokens/docs/components.md](../../design-tokens/docs/components.md)
> Last updated: 2026-05-19
> GitHub issue: [321fit_ios#130](https://github.com/321-fit/321fit_ios/issues/130)
> Implementation:
> - iOS:     [321fit_ios/docs/onboarding-wizard-ios.md] (to be created)
> - Backend: [poly-backend/docs/onboarding-wizard-backend.md] (to be created)
> - Android: (future)

---

## 1. Overview

Profile-completion wizard for brand-new users. Two flavors:

- **Coach wizard (5 steps)** — gated onboarding; all 5 steps required before profile is submitted for admin review and becomes visible to athletes.
- **Athlete wizard (4 steps)** — advisory onboarding; improves personalization but doesn't gate any capability.

Coach wizard lives on **Dashboard** (not Profile) per state `dst-new`. It's the first thing a new coach sees after signup. The wizard stays visible (collapsible) until all steps are done → profile auto-submits → state transitions to `dst-under-review`.

Athlete wizard lives on **Athlete Home / Dashboard** (separate spec); spec here focuses on coach.

---

## 2. User Stories

### Coach

- As a **newly signed-up coach**, I want to see exactly what I need to complete before my profile goes live so that onboarding doesn't feel open-ended.
- As a **coach**, I want a clear progress indicator (1 of 5 completed, 20%) so that I can see how close I am to done.
- As a **coach**, I want each step to link directly to the relevant setup screen so that I don't have to hunt through settings.
- As a **coach**, I want to collapse the wizard if I'm done reading it but not ready to act so that it doesn't take up the whole dashboard.
- As a **coach revisiting the wizard later**, I want completed steps to show as done (checkmark) with different styling so that I know what's already handled.
- As a **coach finishing all 5 steps**, I want the wizard to automatically submit my profile for review and transition my dashboard so that I don't need to manually "submit" anywhere.

### Athlete

- As an **athlete signing up**, I want a short onboarding (≤ 4 steps) so that I can reach the app quickly.
- As an **athlete**, I want optional steps that improve my experience (photo, sport, first coach) without being forced into them — if I skip, I still can use the app.

---

## 3. System Stories

- As the backend, `/coach/onboarding/progress` returns a list of step keys + done flags derived from the coach's current profile state.
- As the backend, on every profile mutation (phone added, sport selected, training session created, etc.), the wizard progress must reflect the new state immediately on next fetch.
- As the iOS/Android client, wizard state is always a derived view — no client-side persistence. Source of truth: server.
- As the backend, when all 5 steps show done → the profile auto-transitions to `pending_admin_approval` without needing an explicit client-side "submit" call.
- As the backend, admin approval flips `pending_admin_approval` → `approved` and publishes an event; the coach's dashboard refetches + transitions state.

---

## 4. Flows

### Flow 1: Coach wizard — first render

1. Coach signs up, lands on Dashboard → state `dst-new`.
2. Wizard rendered expanded (first-time). Greeting: "Welcome, Robert".
3. Wizard widget:
   - Title: "Complete your profile setup"
   - Subtitle: "Your profile will be sent for review after the essential setup steps."
   - Progress: "0 of 5 completed · 0%" + progress bar
   - 5 step rows (gradient-tinted, all incomplete initially)

### Flow 2: Step completion

1. Coach taps step row (e.g., "Select your sports")
2. Navigates to the relevant screen (Sport Types picker)
3. Completes the step, returns to dashboard
4. Dashboard re-fetches snapshot → wizard now shows `sports` step as done:
   - Muted row (gray bg, white-outline border) vs. gradient-tinted for pending
   - Trailing checkmark (FitColors.Teal.t600, 16×16)
   - Text color shifts to `--fit-text-tertiary`
5. Progress indicator updates: "1 of 5 completed · 20%", bar fills proportionally

### Flow 3: Wizard collapse / expand

1. Coach taps chevron button in header (shape: down-facing chevron in gray-alpha circle)
2. Wizard collapses — shows only title + subtitle + progress bar, steps hidden
3. Chevron rotates 180° (visual feedback)
4. Tap again → expands back, chevron returns to original orientation

### Flow 4: All steps done → submit

1. Coach completes the last of 5 steps
2. On return to dashboard, wizard shows 5/5 · 100%, all rows checked
3. Backend auto-submits: coach's profile record transitions to `pending_admin_approval`
4. Snapshot returns `state: "under_review"` on next fetch
5. Dashboard transitions from `dst-new` → `dst-under-review`. Wizard widget is replaced by approval banner + Optional Boosts.

### Flow 5: Admin approves

1. Admin (internal tool, out of scope for this spec) approves the coach's profile
2. Server emits `coach.approved` event → push notification to coach's device
3. Client re-fetches snapshot → `state: "ready"` (or `default` / `quiet` if activity exists)
4. Dashboard transitions to the new state

### Flow 6: Athlete wizard (brief)

1. Athlete signs up, lands on Athlete Home → sees wizard (4 steps: sports, personal details, top up balance, find first coach — phone is captured at signup, not in wizard)
2. Same tap-navigate-complete pattern as coach
3. **No gating** — athlete can use the app without completing. Wizard dismisses once all 4 done or user dismisses explicitly.
4. **No admin review** — athlete wizard is purely for personalization.

*(Athlete wizard spec will be expanded when athlete dashboard spec is written.)*

---

## 5. States

### Coach wizard step state

Each step row has one of three visual states:

| State | Trigger | Visual |
|---|---|---|
| `pending` | Server reports step not done | Gradient-tinted bg (`rgba(3,178,226,0.2) → rgba(34,247,183,0.2)`), teal-600 border, white text |
| `done` | Server reports step done | Muted gray bg (`rgba(117,126,135,0.3)`), white-alpha border, gray-300 text, trailing checkmark |
| (never `disabled` — all 5 are always relevant) |

### Wizard widget state

| State | When | Visual |
|---|---|---|
| `expanded` | Default on first render | Title + sub + progress + full step list |
| `collapsed` | User tapped chevron to collapse | Title + sub + progress bar only |

---

## 6. API

### Endpoints

#### `GET /coach/onboarding/progress`

Returns current wizard state.

**Auth:** JWT (coach role) required.

**Response 200 — `OnboardingProgress`:**

```json
{
  "totalSteps":       5,
  "completedSteps":   1,
  "percent":          20,
  "allComplete":      false,
  "steps": [
    {
      "key":          "sports",
      "title":        "Select your sports",
      "done":         true,
      "deeplink":     "/coach/sport-types",
      "estimatedMin": 1
    },
    {
      "key":          "photo",
      "title":        "Upload profile photo",
      "done":         false,
      "deeplink":     "/coach/settings#s-edit-personal-info",
      "estimatedMin": 2
    },
    {
      "key":          "about",
      "title":        "Write about yourself",
      "done":         false,
      "deeplink":     "/coach/settings#s-edit-personal-info",
      "estimatedMin": 3
    },
    {
      "key":          "location",
      "title":        "Add training location",
      "done":         false,
      "deeplink":     "/coach/settings#s-locations",
      "estimatedMin": 2
    },
    {
      "key":          "session",
      "title":        "Create your first session",
      "done":         false,
      "deeplink":     "/coach/settings#s-sessions",
      "estimatedMin": 3
    }
  ]
}
```

#### `POST /coach/onboarding/submit` (optional — if auto-submit feels fragile)

Explicit "submit for review" endpoint. Called when client detects `allComplete = true` but server hasn't flipped state yet.

**Body:** empty.
**Response 200:** updated dashboard snapshot showing `state: "under_review"`.

*Prefer auto-submit — keep this endpoint as failsafe only.*

### Derived on backend

Each step's `done` is computed from the actual profile state (e.g., `sports.done` = `coach.sport_ids.length > 0`, `session.done` = `coach.training_sessions_count > 0`). No separate "completed" flag on the wizard — no drift possible.

---

## 7. Business rules

- **5 steps are fixed in v1.** Order of steps is fixed. No per-coach customization.
- **All 5 required for admin review submission.** No "submit anyway with 4/5" option.
- **Step order is logical (phone → sports → photo → about → location → session) but not strictly enforced.** User can complete in any order.
- **Wizard hides permanently after admin approval.** Even if coach later removes something (e.g., deletes their only training session), wizard does NOT re-appear. Account stays approved; missing items surface as bookability warnings on Dashboard (Tier 1 Q5) — coach is auto-hidden from search via `isBookable: false` until they fix it. See [dashboard.md](./dashboard.md) Flow 11.
- **Collapsed/expanded state is client-only.** Not persisted server-side. Default is expanded on first render; user's tap preference is kept in-session.
- **Estimated time per step** is hint-only, shown in the step row as a small subtitle. Optional to display based on design decision.
- **Deeplink strategy:** step deeplinks must route to the specific screen (not just module root). Each deeplink must handle deeplink-scoped back-navigation: back should return to Dashboard (not to deeper module screens).

---

## 8. Edge cases

- **Coach has done all 5 but server hasn't yet flipped `pending_admin_approval`:** client shows wizard at 100% but state still `dst-new`. On next snapshot fetch (or after 30 s), server catches up; state transitions. Add `allComplete: true` with explicit state mismatch → client can poll or show "Submitting…" micro-indicator briefly.
- **Coach removes something after completing it (e.g., deletes the only sport):**
  - **Pre-approval (`onboarding` or `pending_admin_approval`):** `sports.done` reverts to `false`. Wizard re-shows that row as pending. If state was `pending_admin_approval`, the regression flips back to `onboarding` and admin review queue removes the coach until completion is re-achieved.
  - **Post-approval (`approved`):** profile **stays approved** per Tier 1 Q5. No re-review. Instead, dashboard renders bookability warning card (`isBookable: false`) and coach is auto-hidden from search until they fix the missing item via normal Settings. Wizard does NOT re-appear.
- **Network offline during wizard fetch:** client uses last cached progress; updates on reconnect.
- **Server-side race: coach submits session create right as the 30 s admin-review transition fires:** server serializes; profile enters `pending_admin_approval` after last write wins.
- **Coach logs into 321Fit on a new device mid-wizard:** state is purely server-driven; new device fetches progress + renders wizard at current state. No conflict.

---

## 9. Platform notes

**Native UI conventions:** see [architecture/design-system.md § Native theming contract](../architecture/design-system.md#native-theming-contract). Don't duplicate cross-platform UI rules here — only platform-specific deviations below.

- **iOS:** SwiftUI implementation — wizard widget is a custom composite view (not a FitUI component, specific to Dashboard). Uses FitButton for chevron (wrapped in FitIconBtn-like style). Step rows use custom background (gradient) + FitColors tokens.
- **Android:** Compose mirror. Row background via `Brush.horizontalGradient`. Progress bar via Material 3 `LinearProgressIndicator` with custom colors.
- **Backend:** `coach.profile_state` enum: `{ onboarding, pending_admin_approval, approved, suspended }`. State machine transitions triggered by wizard completion + admin actions.
- **Voice:** out of scope. Voice assistant does not guide through onboarding.

---

## 10. Open questions

- [x] ~~**Profile mutations after approval:**~~ RESOLVED in Tier 1 Q5: stay approved + bookability warnings on Dashboard. `isBookable` derived flag auto-hides coach from search; warning card overlay until fix.
- [x] ~~**Rejection flow:**~~ RESOLVED in Tier 1 Q4: pragmatic v1 = `dst-rejected` state with Contact Support deep-link. v2: structured resubmit. See [dashboard.md](./dashboard.md) Flow 2b.
- [ ] **Athlete wizard — detailed spec:** separate follow-up doc. **Owner:** product + this spec author next.
- [ ] **Step estimates shown?** Prototype doesn't show "~1 min" next to each step; was it noise? **Owner:** design.
- [ ] **Admin review UI / tooling:** out of this spec. Does admin have a dedicated tool to queue pending coaches? **Owner:** operations + backend.
- [ ] **Step completion incentive:** would a "complete in next 24h for 50% off subscription first month" banner help? **Owner:** growth / product.

---

## Related specs / references

- [dashboard.md](./dashboard.md) — wizard lives on Dashboard state `dst-new`; dashboard transitions to `dst-under-review` on wizard complete
- [coach-maturity-model.md](./coach-maturity-model.md) — coach becomes "new coach" after admin approval (wizard → pending → approved → `isNewCoach = true`)
- [account-access.md](./account-access.md) — referenced by step 1 (phone)
- [profile-settings.md](./profile-settings.md) — referenced by steps 2–6
- GitHub: [321fit_ios#130](https://github.com/321-fit/321fit_ios/issues/130) — original issue that initiated the wizard design work
- Memory: `project_onboarding_wizard`
- Prototype: dashboard.html `dst-new` state shows wizard; also see Figma design in reference file (archived)
- Components: wizard is dashboard-local composite (not a FitUI component). Uses FitColors, FitSpacing, FitRadius, FitFont tokens + FitIconBtn for chevron.
