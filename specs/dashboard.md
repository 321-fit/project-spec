# Dashboard (Coach)

> Status: In Progress
> Prototype: [flows/coach/dashboard.html](https://321-fit.github.io/project-spec/prototypes/flows/coach/dashboard.html)
> Component library: [design-tokens/docs/components.md](../../design-tokens/docs/components.md)
> Last updated: 2026-07-17
> Implementation:
> - iOS:     [321fit_ios/docs/dashboard-ios.md] (to be created)
> - Backend: [poly-backend/docs/dashboard-backend.md] (impl-doc) + [poly-backend/docs/dashboard-api.md] (endpoint reference)
> - Voice:   [voice_control/docs/dashboard-voice.md] (to be created — minimal, reuses subset)
> - Android: **shipped** — coach dashboard V2 (PR #143 unified error handling)
> API reference: [poly-backend/docs/dashboard-api.md](../../poly-backend/docs/dashboard-api.md) — canonical per-endpoint doc (replaces deprecated OpenAPI fragment)
> Live API (dev-test): `https://polybackend-dev-test.up.railway.app` — Swagger path TBD pending instance bootstrap

**Scope note:** this spec covers **coach dashboard only**. Athlete dashboard has its own spec (simpler: Next Session + Requests + Balance, no earnings breakdown, no Tier 1/Tier 2 system). To be written in a follow-up.

---

## 1. Overview

The Home tab for coaches. Answers the question "what do I need to know and do right now?" — not an analytics panel. Deep financial detail lives in Earnings, full agenda in Calendar. Dashboard is a fast glance that surfaces the single most urgent piece of information and the most valuable next action.

Dashboard morphs across the coach lifecycle: a brand-new coach sees an onboarding wizard; a coach awaiting profile approval sees a status banner; an established coach sees their live agenda, action queue, weekly earnings, and activity signals. Eight server-driven states cover this spectrum (plus two client-only states — loading and error — that exist purely on the client).

---

## 2. User Stories

### Coach

- As a **new coach**, I want to see a clear step-by-step checklist so that I know exactly what to complete before my profile goes live.
- As a **coach waiting for approval**, I want to understand how long it will take and what useful things I can do meanwhile so that the waiting period isn't wasted.
- As an **approved coach without bookings yet**, I want calls-to-action that help me get my first clients so that the dashboard feels motivating, not empty.
- As an **idle coach with past clients**, I want to be able to reach out to them or invite new ones directly from the dashboard so that slow periods turn into booked sessions.
- As an **active coach on a busy day**, I want to glance at my home screen and immediately know what my next session is, how much time I have, and which actions are waiting on me — without opening other screens.
- As an **active coach with nothing pending**, I want the dashboard to stay calm (no noise, no empty sections) so that clean-inbox signals I'm on top of things.
- As a **coach any day**, I want to see this week's earnings and what's still planned so that I have a quick business pulse.
- As a **coach reading dashboard cards**, I want taps to jump me to the right place (event detail, requests inbox, review queue, earnings) so that the dashboard is a launcher, not a dead end.

### Voice (if in scope)

- As a coach using the voice assistant, I want to ask "what's on my dashboard today?" and get a concise spoken summary (today count + next session + pending actions) so that I can plan without looking at the phone.

---

## 3. System Stories

- As the iOS client, the dashboard must render in ≤ 1 s on resume from background.
- As the iOS client, pull-to-refresh must re-fetch the snapshot and update without flicker.
- As the backend, `GET /coach/dashboard` must return a complete snapshot in ≤ 400 ms P95 — compose from cached sub-queries rather than parallel round-trips at request time.
- As the backend, snapshot cache must be invalidated immediately on any event that changes its content (session booked/cancelled/completed, payment received, Stripe status change, review received, client signup on coach invite).
- As the voice layer, `get_dashboard()` must fit the response into a TTS-friendly summary (~150 tokens max).
- As any client, offline reads must return the last cached snapshot with a visible `stale since X minutes ago` indicator so users know the data is not fresh.
- As any client, transitions between states must not flash a loading skeleton if we already have a cached snapshot — apply the snapshot and refresh in place.
- As the backend, the `signals[]` array is wired but not yet populated — it returns `[]` until the reviews and clients modules ship and expose their repos. Clients must treat empty `signals[]` as "no activity to surface" and never error on it.

---

## 4. Flows

All references to screen IDs are from `flows/coach/dashboard.html`. Component names reference `design-tokens/docs/components.md`.

### Flow 1: First-app-open after signup (new coach)

1. User lands on `#s-dashboard` — state class `dst-new`.
2. Shown: greeting ("Welcome, Robert") + Tier 1 wizard widget ("Complete your profile setup").
3. Wizard is expanded by default on first open; user can tap chevron to collapse.
4. Each wizard step is a tappable row; tapping navigates to the relevant setup screen (Add phone → Account Access; Select sports → Settings; Create session → Settings Sessions; etc.).
5. User returns to dashboard after each step — wizard progress updates, checkmark appears on completed step, progress bar fills.
6. When all 6 steps are complete → state auto-transitions to `dst-under-review`.

### Flow 2: Waiting for profile approval

1. State class `dst-under-review`.
2. Shown: teal-bordered banner ("Your profile is under review · Up to 24h").
3. Below banner: section "Optional boosts" — 3 boost cards (Accept card payments → Connect Stripe; Prevent scheduling conflicts → Set available hours; Boost profile conversion 2× → Add video intro).
4. Tapping any boost card navigates to the relevant setup flow.
5. On backend approval event (push notification + state refresh) → state auto-transitions to `dst-ready` (if no activity yet) or `dst-default` (if activity already recorded during review wait).
6. On backend rejection event → state transitions to `dst-rejected` (see Flow 2b).

### Flow 2b: Profile rejected (Tier 1 Q4 — pragmatic v1)

1. Admin rejects the profile in admin tool → server emits rejection push: "Profile review needs attention — tap to contact support."
2. Push deep-links into the app and lands on `#s-dashboard` in state `dst-rejected`.
3. Dashboard shows a tinted-red banner: title "Profile not approved", subtitle "Our team flagged some issues. Please contact support to resolve."
4. Single CTA "Contact support" — opens the existing Contact Support flow with pre-filled context (`reason: profile_rejected`, `coachId`, `submittedAt`).
5. Coach communicates with support via that thread; once resolved, admin re-flags profile → state returns to `dst-under-review` (or `dst-default` if approved).
6. **v1 deliberately reuses Contact Support** instead of building a self-service resubmit flow. v2 plans a structured `dst-rejected` state with itemized issues + inline edit ("re-submit" button). Tracked in `coach-maturity-model.md` v2 backlog.

### Flow 3: Approved but no bookings (ready)

1. State class `dst-ready`.
2. Shown: greeting ("You're all set, Robert"), empty Next Session card with 2 CTAs (Invite a client / Share profile), CRM hint card ("Add your existing clients").
3. Tier 2 Stripe tip shown below (if Stripe not connected).
4. On first booking received → state transitions to `dst-default` (or `dst-quiet` if no sessions today).

### Flow 4: Active day

1. State class `dst-default`.
2. Shown:
   - Greeting + today summary ("3 sessions · €180 today")
   - Next Session card (FitCard-like; tap → `FitUI.openEventSheet(state: 'planned', event: {...})`)
   - Action cards (conditional):
     - Pending requests → tap → Clients tab, Requests segment
     - Cash to collect → tap → Clients tab filtered for outstanding cash
     - Sessions to review → tap → push `#s-review-queue` (within dashboard flow; see [review-queue.md](./review-queue.md))
   - This week earnings (big amount + trend pill) → tap → Earnings module
   - Payment split (Card / Cash) → tap → Earnings
   - Activity signals (latest review, new clients)
   - Tier 2 tip at bottom (e.g., Video intro) if applicable
3. Tapping Next Session card opens unified event sheet with `data-event-state` matching the event's status. Sheet lives in the shared layer (see `FitUI.openEventSheet()`); footer buttons dispatch actions.

### Flow 5: Quiet day

1. State class `dst-quiet`.
2. Shown: greeting ("Nothing on today — enjoy the quiet") + Next Session card with tomorrow's session (when-chip in gray, not teal) + single pending request action card + This week earnings (trend may be down, that's OK).
3. No signals, no Tier 2 tip (keep the day calm).

### Flow 6: Idle (had history, 0 upcoming)

1. State class `dst-idle`.
2. Shown: greeting ("Nothing on the schedule — let's fix that") + empty Next Session card with CTAs "Invite a client" + "See recent clients" + This week earnings (€0 with down trend is informative) + Activity signals (older reviews) + Tier 2 Available Hours tip.

### Flow 7: All-zero (clean inbox, active coach)

1. State class `dst-zero`.
2. Shown: greeting with today summary + Next Session card (real event) + This week earnings (real data, trend may be flat) + Payment split + small "All caught up — no requests, no cash to collect." confirmation line.
3. No action cards. No Tier 2 tip. Celebrating inbox-zero.

### Flow 8: Loading (first fetch)

1. State class `dst-loading`.
2. Shown: skeleton placeholders for greeting + Next Session + Action cards + This week card.
3. On snapshot arrival → state transitions to the appropriate live state based on returned data.

### Flow 9: Error (offline / server unreachable)

1. State class `dst-error`.
2. Shown: red-tinted inline banner ("Couldn't refresh — check your connection") with Retry button + cached snapshot below at 60% opacity.
3. Tapping Retry → re-fetch; on success → live state.

### Flow 10: Review queue routing

1. From `dst-default` action card "N sessions to review" → push to `#s-review-queue` (part of dashboard flow file, routed in-app, not full navigation).
2. Behavior fully specified in [review-queue.md](./review-queue.md). Dashboard's responsibility ends at the push trigger.

### Flow 11: Bookability warnings (Tier 1 Q5)

Approved coach can edit profile fields that affect their searchability/bookability (e.g., remove all sports, drop available hours below daily minimum, disconnect Stripe with active card sessions). Per Q5 decision: **profile stays approved** (no re-review), but coach is auto-hidden from search and shown prominent warning cards on dashboard until issues are resolved.

1. Backend computes `isBookable: bool` derived flag on every snapshot:
   - Requires: ≥ 1 sport selected, ≥ 1 active session template, ≥ 1 available hour slot in next 14 days, profile approved.
   - **Stripe is NOT a bookability requirement** — the coach stays bookable without a connected Stripe account (card sessions simply can't clear until Stripe is connected). `stripe_required` is surfaced as a non-blocking **warning** (see below), never a `bookabilityIssue`.
2. If `isBookable: false` → dashboard renders a `dash-warning-card` at the **top** of the screen, **above** the greeting/Next Session — non-dismissable.
3. Card content:
   - Title: "You're hidden from search"
   - Subtitle: "Fix the issues below to start receiving bookings again."
   - List of `bookabilityIssues[]` rows, each tappable with deep-link to the relevant setting.
4. Coach completes the listed fixes → next snapshot fetch shows `isBookable: true` → warning card disappears → coach reappears in search.
5. **Differs from Tier 2 tips:**
   - Tier 2 tips are dismissable, optional, suggestion-grade.
   - Bookability warnings are non-dismissable, blocking (search hidden), required to clear.
6. Bookability warnings render in **all** approved states (`dst-default`, `dst-quiet`, `dst-zero`, `dst-idle`, `dst-ready`) but **not** in pre-approval states (`dst-new`, `dst-under-review`, `dst-rejected`).

**Non-blocking warnings (`warnings[]`) — shipped, separate from `bookabilityIssues[]`.** Every snapshot also carries a `warnings[]` array, distinct from the bookability list. These are advisory: the coach stays **bookable and visible in search** while any of them are present. `stripe_required` (no Stripe account connected, or card sessions can't yet clear) is the primary member — reclassified here from a bookability blocker to a warning per shipped backend behavior. Warnings render inline (below the greeting, not as the top non-dismissable card) and never hide the coach from search. Do not conflate `warnings[]` (advisory, stays bookable) with `bookabilityIssues[]` (blocking, hidden from search).

---

## 5. States

State class on `#s-dashboard` root drives visibility. Only one state is rendered at a time.

| State class | When | What's shown | Transitions out |
|---|---|---|---|
| `dst-new` | Coach signed up, Tier 1 wizard incomplete | Greeting + wizard widget | → `dst-under-review` when wizard complete |
| `dst-under-review` | Wizard done, profile pending admin approval | Status banner + Optional boosts (3 cards) | → `dst-ready` / `dst-default` on approval; → `dst-rejected` on rejection |
| `dst-rejected` | Admin rejected the profile (Tier 1 Q4 v1 path) | Tinted-red banner + "Contact support" CTA | → `dst-under-review` after admin re-flags post-resolution |
| `dst-ready` | Approved, zero sessions ever booked | Empty Next Session + CRM hint + Tier 2 Stripe tip | → `dst-default` / `dst-quiet` on first booking |
| `dst-idle` | Approved, has past sessions, 0 upcoming | Empty Next Session w/ alternate copy + Earnings (may show €0) + Signals + Tier 2 tip | → `dst-default` / `dst-quiet` on new booking |
| `dst-quiet` | Has upcoming tomorrow+ but nothing today | Tomorrow preview card + minimal action cards + Earnings | → `dst-default` when any session scheduled for today |
| `dst-default` | Has today sessions + any pending actions | Full stack (Next Session + Action cards + This Week + Signals + Tier 2 tip) | → `dst-zero` when all action counters reach 0 |
| `dst-zero` | Has today sessions, zero pending actions | Next Session + Earnings + Payment split + "all caught up" line | → `dst-default` on any new pending action |
| `dst-loading` | Initial fetch, no cached snapshot | Skeleton placeholders (shimmering) | → state from snapshot response |
| `dst-error` | Network / server error, cached snapshot available | Error banner + Retry + faded cached content | → prior state on successful retry |

**State determination order (backend / client composition logic):**

```
if profile.wizard_incomplete             → dst-new
elif profile.rejected                    → dst-rejected      (Tier 1 Q4)
elif profile.pending_admin_approval      → dst-under-review
elif no_sessions_ever                    → dst-ready
elif no_upcoming_and_has_history         → dst-idle
elif no_sessions_today_but_has_tomorrow  → dst-quiet
elif has_today_sessions:
    if pending_actions_count > 0         → dst-default
    else                                 → dst-zero
```

Client picks between `dst-loading` / `dst-error` based on snapshot availability + freshness, independent of business state.

**Bookability overlay (Tier 1 Q5):** for approved states (`dst-ready`, `dst-idle`, `dst-quiet`, `dst-default`, `dst-zero`), if `isBookable: false` → render the bookability warning card on top, **regardless of state class**. State class still drives the body of the screen; warning card is an overlay layer.

---

## 6. API

> **Canonical endpoint reference:** [`poly-backend/docs/dashboard-api.md`](../../poly-backend/docs/dashboard-api.md) — full request/response shapes, key fields, error codes, edge cases, and backward-compat status per endpoint.
>
> **Live API (dev-test):** `https://polybackend-dev-test.up.railway.app` — Swagger path TBD pending instance bootstrap (verify with `/docs`, `/schema/swagger`, `/schema/openapi.json` on first access).
>
> The deprecated per-module OpenAPI contract (`project-spec/contracts/dashboard.openapi.yaml`) is archival only and not updated going forward. See `feedback_endpoint_doc_pattern` for the current convention.

### Endpoints (overview)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v1.0.0/coach/dashboard` | JWT (coach) | Composed `CoachDashboardSnapshot` for the Home tab. State-driven — `state` field selects which sub-objects render. |
| POST | `/api/v1.0.0/coach/dashboard/boosts/{boostKey}/dismiss` | JWT (coach) | Records dismissal of an Optional Boost (under-review state). Returns updated snapshot. |
| POST | `/api/v1.0.0/coach/dashboard/tips/{tipKey}/dismiss` | JWT (coach) | Records dismissal of a Tier 2 tip. After 3 dismisses of same key → suppressed forever. Returns updated snapshot. |

### Snapshot shape (high level)

`CoachDashboardSnapshot` carries:
- `state` — drives client rendering (`new`, `under_review`, `rejected`, `ready`, `idle`, `quiet`, `default`, `zero`)
- `isBookable` + `bookabilityIssues[]` — Tier 1 Q5 derived flag and (blocking) warning card content — coach hidden from search while non-empty
- `warnings[]` — shipped advisory array, **separate** from `bookabilityIssues[]`. Non-blocking; coach stays bookable/visible. Primary member `stripe_required` (see §11)
- `greeting` — name + time-of-day + optional `todaySummary` (session count + total value as Money DTO)
- `wizard` (only for `state=new`) — 6 steps, fixed order
- `approvalStatus` (only for `state=under_review`) — submitted timestamp + SLA copy hint
- `rejectionInfo` (only for `state=rejected`) — admin rejection timestamp + Contact Support deep-link
- `optionalBoosts[]` (only for `state=under_review`) — 3 keys: `stripe`, `hours`, `video`
- `nextSession` — `EventModel` (id, status, datetimes, Money price, athlete/coach refs) or null
- `pendingActions.{requests, cashToCollect, sessionsToReview}` — each null when its count is 0
- `weekEarnings` (null for pre-approval states) — Money fields for earned, plannedAdditional, cardTotal, cashTotal, trendVsLastWeek + counts
- `signals[]` — discriminated union (`new_review` / `new_clients`); **currently always empty**, see §3 System Stories
- `tier2Tip` — single tip card per fixed-priority rotation (see §7)
- `snapshotTakenAt` — UTC ISO-8601 for Stale indicator

**Money fields use `{ amount: int (minor units), currency: ISO-4217 }`** per `feedback_money_serialization`. Example: €25.00 → `{ amount: 2500, currency: "EUR" }`.

For full sample payloads, per-field intent, and error responses, read [`dashboard-api.md`](../../poly-backend/docs/dashboard-api.md).

### Push / real-time (optional, nice-to-have)

- On booking / cancellation / review event → server publishes a dashboard-refresh signal on the coach's channel; client re-fetches snapshot silently.

---

## 7. Business rules

- **Wizard completion auto-triggers admin review.** No manual "submit for review" button.
- **Admin approval SLA:** 24 hours (banner copy). If approval takes longer → escalate via internal tooling; no client-side change.
- **Tier 2 tip dismissal persistence:** server-side per coach per tip key. 3 dismisses → suppressed forever. Counter survives device change.
- **Tier 2 tip rotation:** fixed priority order `stripe → hours → video → bio` — server picks the first key whose precondition is satisfied AND whose dismissal counter is below 3. No randomization, no time-based rotation. (Resolved 2026-05-01 — was Tier 2 question in §10.)
- **Optional boosts in under-review:** shown as long as `done: false`. When coach completes (e.g., connects Stripe) → boost disappears from the list. No manual dismiss from under-review.
- **"Today" definition:** coach's local timezone (from profile setting, not device). Day boundary = 00:00 local.
- **"This week" definition:** Monday 00:00 through Sunday 23:59 local. Ties with memory `feedback_copy_standards` date formatting.
- **Trend direction:** compare `earned` to same day-of-week count in previous week. Positive → ↑; negative → ↓; within ±€5 → flat.
- **Signal retention:** new_review surfaced for 7 days then rolls off. new_clients for rolling 7 days.
- **Action card hiding:** each pending-action card appears only when its count > 0. Dashboard never shows "0 pending requests".
- **Stale cache threshold:** 5 minutes. If cache older than 5 min, client refetches in foreground; if user is offline, shows cached data with `Stale • X min ago` chip.

---

## 8. Edge cases

- **New coach mid-wizard closes app → returns weeks later:** wizard state persists server-side; dashboard re-renders with current progress, no data loss.
- **Under-review state, user taps a boost, completes it, returns:** boost entry updates `done: true`; dashboard re-fetches on return.
- **Approval rejected (admin action):** handled by `dst-rejected` state per Tier 1 Q4. Coach receives push, lands on dashboard with red banner + Contact Support CTA. Self-service resubmit is v2.
- **Coach edits profile after approval, breaks bookability:** profile stays approved; `isBookable: false` triggers warning card overlay per Q5. Coach hidden from search until issues resolved.
- **Two devices, same coach:** last snapshot wins. No conflict — all writes go through server.
- **Timezone mismatch (device local ≠ profile TZ):** always use profile TZ for dashboard. Device TZ is irrelevant here.
- **Action card count drops to 0 between fetches (e.g., athlete cancelled pending request):** next fetch removes the card. No special transition animation required.
- **Wizard step completed out of order:** allowed. Any combination of done steps is valid; `completedSteps` is just a count.
- **User on a plane / no network, first open ever (no cache):** show `dst-error` with "Couldn't connect — try again when online" message. No cached state to fall back to.

---

## 9. Platform notes

**Native UI conventions:** see [architecture/design-system.md § Native theming contract](../architecture/design-system.md#native-theming-contract). Don't duplicate cross-platform UI rules here — only platform-specific deviations below.

- **iOS:** native pull-to-refresh via `.refreshable` on the dashboard list. Haptic feedback on tap of action cards (`UIImpactFeedbackGenerator(style: .light)`). Event sheet opens as SwiftUI `.sheet(isPresented:)` with `.medium` detent.
- **Android:** pull-to-refresh via `SwipeRefreshLayout` or Compose `PullRefreshIndicator`. Event sheet = `ModalBottomSheet` (Material 3). Haptic via `HapticFeedbackConstants.CONTEXT_CLICK`.
- **Backend:** snapshot composition benefits heavily from Redis caching with event-driven invalidation. Target < 400 ms P95.
- **Voice:** `get_dashboard()` function tool returns a subset — `state`, `greeting.todaySummary`, `nextSession`, `pendingActions` only. Tier 1 wizard / Tier 2 tips not spoken.

---

## 10. Open questions

- [ ] **Admin approval UI:** is there an admin tool where admins actually review? Spec assumes yes; implementation may need admin endpoints separately. **Owner:** product.
- [x] ~~**Rejection flow:**~~ RESOLVED in Tier 1 Q4: pragmatic v1 = `dst-rejected` state with Contact Support deep-link (no self-service resubmit). v2: structured rejection state with itemized issues + inline edit / resubmit.
- [x] ~~**Profile edit after approval breaks bookability:**~~ RESOLVED in Tier 1 Q5: stay approved, auto-hide from search via `isBookable` flag + non-dismissable warning cards.
- [x] ~~**Tier 2 tip rotation algorithm:**~~ RESOLVED 2026-05-01: fixed priority `stripe → hours → video → bio` — first eligible by precondition (and dismissal counter < 3) wins. Recorded in §7 Business rules. Implemented in `backend/app/handlers/rest/coach/dashboard.py` (`_TIER2_TIP_PRIORITY` tuple).
- [ ] **Retention of signals for deleted athletes:** if an athlete who left a review deletes their account, should the review still appear on dashboard? Current assumption: show as "review from a former client" (anonymized). **Owner:** product.
- [x] ~~**Real-time refresh mechanism:**~~ RESOLVED 2026-07-17: shipped model is **poll-on-foreground + pull-to-refresh** (re-fetch the snapshot on resume from background and on manual pull). Push-driven silent refresh is **deferred** (the §6 "Push / real-time" note stays aspirational). **Websockets are deliberately NOT used for the dashboard** — the WS stack exists only for messaging (DM); the dashboard intentionally stays poll-only.

---

## Related specs / references

- [review-queue.md](./review-queue.md) — screen this dashboard pushes to for Sessions to review
- [onboarding-wizard.md](./onboarding-wizard.md) — detailed wizard spec (this doc references but does not define wizard internals)
- [coach-maturity-model.md](./coach-maturity-model.md) — new-coach vs established rules (dashboard uses; not owned here)
- [payments.md](./payments.md) — Coach Earnings source of truth for weekEarnings fields
- [event-statuses.md](./event-statuses.md) — 6-state event system used by `nextSession.status`
- Prototype: [`flows/coach/dashboard.html`](https://321-fit.github.io/project-spec/prototypes/flows/coach/dashboard.html)
- Components: FitHeader, FitNavbar, FitIconBtn (bell), FitAvatar (next session), FitBadge (payment tag), FitButton (CTAs), FitSheet (event detail), FitSkeleton family (loading). All in [design-tokens/docs/components.md](../../design-tokens/docs/components.md).
- Memory rules applied: navbar visibility, destructive tiers, sheet padding, spacing/typography scale with documented exceptions.
