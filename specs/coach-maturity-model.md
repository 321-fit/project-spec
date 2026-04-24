# Coach Maturity Model

> Status: Draft
> Prototype: [flows/shared/profile.html](../prototypes/flows/shared/profile.html) (Coach Profile v2 — new-coach state variants)
> Component library: [design-tokens/docs/components.md](../../design-tokens/docs/components.md)
> Last updated: 2026-04-24
> Implementation:
> - iOS:     [321fit_ios/docs/coach-maturity-ios.md] (to be created)
> - Backend: [poly-backend/docs/coach-maturity-backend.md] (to be created)
> - Android: (future)

---

## 1. Overview

Defines the distinction between a **new** coach and an **established** coach on the 321Fit platform, and the benefits we grant during the new-coach window. Used across athlete-facing discovery (search, recommendations, profile badges) and coach-facing self-view (progress toward graduation).

**Framing:** new-coach status is a **benefit**, not a warning. Similar to Airbnb new-listing boost, Upwork Rising Talent, Fiverr Rising Star. The label should read as opportunity, not as risk to athletes.

---

## 2. User Stories

### Coach

- As a **new coach**, I want a visible indicator that I'm in a "welcome window" so that I understand platform support is actively boosting my discovery — not penalizing me.
- As a **new coach**, I want to see my progress toward graduating (e.g., "2 more sessions to earn New · Verified status") so that I know where I stand.
- As an **established coach**, I don't need the new-coach badge anymore — platform shows my normal profile with full stats/reviews.

### Athlete

- As an **athlete browsing coaches**, I want to see which coaches are new so that I have context (fresh perspective, motivated, possibly more flexibility).
- As an **athlete**, I trust the platform's vetting — a "New" label doesn't mean "unverified". Approved coaches are all vetted; "new" just means low booking count.

### Platform

- As the platform, we want to surface new coaches more aggressively (discovery boost, dedicated carousel) during their welcome window to accelerate their first bookings.

---

## 3. System Stories

- As the backend, the new-vs-established decision is computed from two counters (reviews_count, sessions_count). Thresholds are hybrid: `reviews_count < 1 OR sessions_count < 3` → new.
- As the backend, on every session completion or new review creation, the derived `isNewCoach` field must be re-computed and cached on the coach record.
- As the athlete-side search / recommendations service, new-coach boost must apply as a ranking multiplier during the welcome window.
- As the coach-side profile screen, `isNewCoach` gates the badge + progress indicator display.

---

## 4. Flows

### Flow 1: Coach graduates from new

1. Coach has `sessions_count = 3, reviews_count = 0` → still new (reviews threshold not met).
2. Coach receives their first review → `reviews_count = 1` → both thresholds met → graduates.
3. Server re-computes `isNewCoach = false` + emits event.
4. Athlete-side discovery boost multiplier is removed.
5. Coach's own profile loses "New" badge on next render.
6. Optional: push notification to coach ("Welcome to full Coach status — your profile is now in the main search rotation").

### Flow 2: Athlete discovery with new coach surfacing

1. Athlete opens Discovery / Search.
2. Dedicated carousel "New on 321Fit" displays up to 8 new coaches, sorted by recency of profile approval.
3. Main search results include new coaches with a 2× ranking boost (tunable).
4. Each new coach card shows the `New` badge next to name.

### Flow 3: Coach views own maturity state

1. Coach on their own profile screen (flows/shared/profile.html — Coach Profile v2 — coach-owner variant).
2. Sees inline badge "New" near their name.
3. Below stats row: compact progress indicator "2 more sessions to graduate" (when relevant).
4. Tapping the badge/indicator opens a tooltip explaining benefits of the new-coach window (boost, welcome period, etc).

---

## 5. States

Two stable states + two derived views.

| State | Rule | UI treatment |
|---|---|---|
| `new` | `reviews_count < 1 OR sessions_count < 3` | "New" badge on profile card + name row; dedicated carousel placement; search boost; progress indicator on own profile |
| `established` | `reviews_count ≥ 1 AND sessions_count ≥ 3` | Normal profile treatment — no badge, no boost, regular search ranking |

**Derived views:**
- **Athlete-facing** — only see the badge + carousel
- **Coach-facing** — also see their own progress indicator on their profile

**Transitions:**
- `new → established` — permanent (no going back to new based on inactivity in v1). Rationale: once a coach has earned a review + 3 sessions, they've proven the model works. Inactivity handled separately (vacation mode, archived coaches — separate specs).

---

## 6. API

### New / modified fields

#### `CoachModel` — `isNewCoach: Bool`

Derived field on the coach record. Server-side recomputed on counter change.

#### `CoachModel` — `maturityProgress: { reviewsNeeded: Int, sessionsNeeded: Int } | null`

Present only when `isNewCoach = true`. Zero values are valid (e.g., `reviewsNeeded: 0, sessionsNeeded: 2` means "got the review, need 2 more sessions"). Null when `isNewCoach = false`.

### Endpoints

No new endpoints. Existing coach GET endpoints return these two fields as part of the coach record.

- `GET /coach/me` → includes `isNewCoach`, `maturityProgress`
- `GET /coach/{id}` → includes `isNewCoach` (athlete-facing; `maturityProgress` omitted for privacy — only shown to the coach themselves)
- `GET /athletes/discovery` → coach entries include `isNewCoach` for badge rendering

### Search / recommendation

`GET /athletes/coaches/search` ranking algorithm applies a `newCoachBoost: 2.0` multiplier during result sort when `isNewCoach = true`. Tuneable via server config.

---

## 7. Business rules

- **Thresholds:** `reviews_count ≥ 1 AND sessions_count ≥ 3` is the graduation rule. Both must be true.
- **No downgrade.** Once established, a coach stays established regardless of future activity. Absence / inactivity handled separately (vacation-mode spec, archived coaches).
- **Review spam guard:** reviews_count counts only reviews from distinct athlete accounts with at least 1 completed session. Protects against fake/bot reviews inflating the counter.
- **Session count:** counts only sessions in `finished` status (not `missed`, not `cancelled`).
- **Boost multiplier default: 2.0.** Configurable via feature flag. Welcomed discussion if A/B testing changes this.
- **Carousel size:** 8 coaches max, sorted by most recent approval date. If fewer than 8 new coaches in the area, carousel hides.
- **Region scoping:** carousel filters by athlete's location (same city / region). If fewer than 3 new coaches locally, falls back to country-wide.
- **Badge copy:** single word "New" (English) — kept short to fit inline next to name. Tooltip provides context.
- **Duration of new-coach window is threshold-based, not time-based.** A coach could stay new for a month or a day depending on activity. No calendar-based expiration.

---

## 8. Edge cases

- **Coach got 3 sessions but zero reviews:** still new until a review arrives. This is by design — reviews signal authentic social proof.
- **Coach cancelled 2 of their 3 sessions:** cancelled sessions don't count; needs 3 finished.
- **Coach got a review from a friend (gaming):** 1 review + 3 sessions = established. If we detect patterns later (same payment method, same IP, zero other clients), fraud-detection handles. Out of scope here.
- **Coach deletes their account and re-signs up:** fresh counters, treated as brand-new. Previous reviews don't carry over.
- **Established coach's reviews deleted (e.g., athlete account deletion):** if count drops below 1 after deletion, do we re-downgrade? **Decision:** NO. Once established, always established. Review deletions don't roll back maturity.
- **International carousel context:** if an athlete travels to another city, the carousel shows that city's new coaches. Location is always request-time, not profile-fixed.

---

## 9. Platform notes

- **iOS:** badge rendered as inline `FitBadge` component with `FitBadgeStyle.crm`-like teal-tint; progress indicator as `Text` row under stats.
- **Android:** Compose equivalent `FitBadge(text = "New", style = FitBadgeStyle.Crm)`.
- **Backend:** counters cached on `coach` table; boosts applied at search-service level; no client logic for ranking (server does it). Recomputation is event-driven (on `session.finished` / `review.created` events).
- **Voice:** out of scope. Voice assistant does not surface maturity state.

---

## 10. Open questions

- [ ] **Boost multiplier value:** start at 2.0x, but what if it's too aggressive (pushes down proven coaches too much)? **Owner:** product + data. A/B test plan?
- [ ] **Welcome-period subsidy:** discussed as one of the benefits (subsidize first session). Out of MVP; revisit once we have budget discussion. **Owner:** product + finance.
- [ ] **"New · Verified" combined label:** instead of just "New", use a two-part badge implying "new AND vetted". Slight copy change. **Owner:** design.
- [ ] **Dedicated onboarding support channel for new coaches:** e.g., first 3 sessions get a dedicated response SLA. **Owner:** operations.
- [ ] **Do we show the new-coach badge in chat / event sheets too?** Or only on profile and in discovery? **Owner:** design.

---

## Related specs / references

- [onboarding-wizard.md](./onboarding-wizard.md) — the wizard that precedes new-coach state (wizard complete → pending approval → approved + new coach)
- [dashboard.md](./dashboard.md) — dashboard states `new`, `under-review`, `ready` cover the pre-established lifecycle
- [profile-settings.md](./profile-settings.md) — Coach Profile v2 includes new-coach state variants
- [clients-coaches.md](./clients-coaches.md) — related discovery/search context
- Memory: `project_coach_maturity` — decisions captured during prototyping
- Prototype: Coach Profile v2 state toggles in `flows/shared/profile.html`
- Components: FitBadge (New), FitAvatar, FitButton. See [design-tokens/docs/components.md](../../design-tokens/docs/components.md).
