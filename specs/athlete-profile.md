# Athlete Profile

> Status: Draft
> Prototype: [flows/athlete/profile.html](https://321-fit.github.io/project-spec/prototypes/flows/athlete/profile.html)
> Component library: [design-tokens/docs/components.md](../../design-tokens/docs/components.md)
> Last updated: 2026-06-05
> Implementation:
> - iOS:     [321fit_ios/docs/athlete-profile-ios.md] (to be created)
> - Android: [321fit_android/docs/athlete-profile-android.md] (to be created)

**Scope note:** the athlete's **own private Profile tab** (tab 5) — a motivational hub + entry point to Settings. Built as a **trimmed mirror of the coach Profile** ([coach-profile.md](./coach-profile.md)): same `.cp-*` layout grammar (identity row, stat strip, warm section heads with edit pencils, `.fit-stat-tile` management group), with the coach-only blocks removed. This is **not** the public coach-viewed profile (that's the coach's; the athlete has no public profile in v1).

---

## 1. Overview — what's reused vs trimmed from coach

| Block | Coach profile | Athlete profile |
|---|---|---|
| Header media (video / cover / initials hero) | ✅ | ❌ **removed** (no intro video / cover for athletes) |
| Identity row (avatar + name + location → Personal Data) | ✅ | ✅ (avatar has camera pip → edit) |
| Stat strip (`.fit-stat-strip`) | Rating · Reviews · Sessions · Price from | **Sessions · Hours · Streak** (athlete has no public rating/price) |
| Maturity progress (new→established) | ✅ | ❌ **removed** (coach-only growth model) |
| My sports (chips + edit → sport-types) | ✅ | ✅ (same green chips + sport icon set) |
| About me (bio + edit → personal-data) | ✅ | ✅ (short bio / training goal) |
| Management tiles (`.fit-stat-tile`) | Languages · Sessions · Locations · Hours | **Training history · My coaches · Calendar sync · Balance** |
| Reviews | reviews **received** (carousel) | **My reviews** = reviews the athlete **left** to coaches |

The trim follows the role asymmetry: the athlete is the **demand** side — no public storefront, no pricing, no maturity ranking. The tiles instead become quick links into the athlete's content (history, coaches) and Settings sub-modules (calendar sync, balance).

---

## 2. User stories

- As an athlete, I want a private hub that shows my training progress (sessions, hours, streak) so the app feels motivating.
- As an athlete, I want to manage my sports and personal info from my profile, the same way a coach does.
- As an athlete, I want quick links to my training history, my coaches, calendar sync and balance without digging through Settings.
- As an athlete, I want to see and edit the reviews I left to my coaches.
- As an athlete, I want the Settings gear in the same place (top-right) as a coach.

---

## 3. Screens & states

### `s-profile` — Profile tab (tab 5)

Layout, top → bottom:
1. **Header** — title "Profile" + ⚙️ Settings gear (top-right) → `settings.html`. (No share — the athlete profile is private.)
2. **Identity** (`.cp-identity`, always visible across states) — `.fit-avatar-lg` brand avatar + camera **pip**, name, location → Personal Data (TBD editor).
3. **Stat strip** (`.fit-stat-strip`, 3 cols) — Sessions · Hours · Streak. Streak value uses `--accent`.
4. **My sports** (`.cp-section` + `.cp-section-head--tap` pencil) → Sport Types; green `.fit-sport-chip`s with the canonical sport icon set.
5. **About me** (`.cp-section` + pencil) → Personal Data; `.fit-profile-bio` + "See more".
6. **Management tiles** (`.cp-tile-group` of `.fit-stat-tile`):
   - Training history (`28 sessions · 31h`) → history screen (TBD)
   - My coaches (`4 active`) → [my-coaches.html](https://321-fit.github.io/project-spec/prototypes/flows/athlete/my-coaches.html)
   - Calendar sync (`Google connected`) → [calendar-sync.md](./calendar-sync.md)
   - Balance (`€240.00 available`) → [athlete Balance](./payments.md) (`balance.html`)
7. **My reviews** (`.cp-section`) — reviews the athlete left (coach name + stars + text), `.fit-review-card` full-width. See [reviews.md](./reviews.md).
8. Bottom **navbar** (Profile active, slot 5).

**Screen-level states** (`pfs-*`):
- **default** — full hub as above.
- **new** — no completed sessions: zeroed stat strip + empty-state ("No sessions yet" + "Find a coach" CTA → My Coaches).
- **loading** — skeletons (stat strip + chips + tiles).
- **error** — inline error + Retry.

Identity stays visible in every state; only the content below swaps.

---

## 4. Navigation

- Gear → `settings.html` (push; no navbar on Settings per `feedback_navbar_visibility`).
- Identity / About pencil → Personal Data editor (athlete variant — body metrics, no video; **TBD**, currently stubbed).
- My sports pencil → Sport Types (shared `sport-types.html`).
- Tiles → respective screens (history TBD, my-coaches, calendar-sync, balance).
- Tab bar → the 5 athlete tabs (Dashboard / My Coaches / ✨Assistant / Calendar / Profile). See [navigation.md](./navigation.md), memory `project_athlete_tabs`.

---

## 5. Component usage

- `.cp-identity` / `.cp-avatar-pip` / `.cp-identity-*` — identity row (reused 1:1 from coach profile).
- `.fit-stat-strip` (+`--accent`) — aggregate stats.
- `.cp-section` / `.cp-section-head--tap` / `.cp-section-title` / `.cp-edit-pencil` — warm section heads with inline edit.
- `.fit-sport-chip` + sport icon set — My sports.
- `.fit-profile-bio` / `.fit-see-more` — About me.
- `.cp-tile-group` / `.fit-stat-tile` (+`-body/-title/-sub/-chevron`) / `.fit-icon-plate--neutral--md` — management tiles.
- `.fit-review-card` (width override → full-width list) — My reviews.
- `.fit-empty-state`, `.sk-card/.sk-shimmer`, `.fit-inline-error` — new/loading/error states.

All theme-adaptive (athlete default **light**; coach default dark) — no hardcoded hex, no fixed grays.

---

## 6. API

Aggregate stats + content are composed from existing endpoints (verify against live API before issues; extend, don't rename — `feedback_keep_existing_endpoints`):

| Need | Endpoint |
|---|---|
| Identity / sports / bio / metrics | `GET /me`, `GET /athlete/sports` ([profile-settings.md](./profile-settings.md)) |
| Aggregate stats (sessions / hours / streak) | derived from training-events history (endpoint TBD — may need a `GET /athlete/profile-stats`) |
| My coaches count | [clients-coaches.md](./clients-coaches.md) athlete relationships |
| Balance figure on tile | `GET /athlete/balance` ([payments.md](./payments.md)) |
| Calendar sync status | [calendar-sync.md](./calendar-sync.md) |
| My reviews | `GET /athlete/coaches/{id}/review` per coach ([reviews.md](./reviews.md)) |

The **streak** metric is new and may need backend support; flagged as an open question.

---

## 7. Business rules

- Profile is **private** to the athlete (no public/shared link in v1).
- Stats aggregate across **all** coaches (per-coach stats live in Coach detail under My Coaches).
- Sports row is the same selection that drives Search defaults (memory `project_search_default_filters`).
- "New" state = 0 completed sessions; graduates to default after the first completed session.

---

## 8. Edge cases / open questions

- [ ] **Streak definition** — consecutive weeks with ≥1 completed session? Needs a backend rule + endpoint.
- [ ] **Athlete Personal Data editor** — athlete variant (avatar, name, gender, DOB, height, weight, languages; **no** intro video/cover). Currently stubbed; see [personal-data.md § 10](./personal-data.md).
- [ ] **Training history screen** — full list (all coaches) reusing the history-row pattern; currently a stub tile.
- [ ] **Achievements / badges** — deferred to Phase 2.

---

## 9. Decisions log

- **2026-06-05** — Athlete Profile built as a **trimmed mirror** of the coach Profile (`.cp-*` grammar reused), dropping video hero, maturity, reviews-received and price. Stat strip = Sessions/Hours/Streak. Tiles repurposed to history/coaches/calendar-sync/balance (links into content + Settings). Memory: `project_athlete_profile_plan`, `project_athlete_prototype_status`.
- **2026-06-05** — Sport chips use the canonical **sport icon set** (not emoji). Everything theme-adaptive.

---

## 10. References

- Prototype: [profile.html](https://321-fit.github.io/project-spec/prototypes/flows/athlete/profile.html)
- [coach-profile.md](./coach-profile.md) — the mirror source (full `.cp-*` component set)
- [settings.md](./settings.md) — gear destination (athlete section)
- [payments.md](./payments.md) — Balance tile / screen
- [reviews.md](./reviews.md) — My reviews
- [navigation.md](./navigation.md), [athlete-dashboard.md](./athlete-dashboard.md)
- Memory: `project_athlete_profile_plan`, `project_athlete_tabs`, `feedback_prototype_theme_role_default`, `feedback_reuse_canon_first`, `feedback_native_theme_tokens`.
