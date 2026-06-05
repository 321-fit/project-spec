# Athlete Dashboard

> Status: Draft
> Prototype: [flows/athlete/dashboard.html](https://321-fit.github.io/project-spec/prototypes/flows/athlete/dashboard.html)
> Component library: [design-tokens/docs/components.md](../../design-tokens/docs/components.md)
> Last updated: 2026-05-12
> Implementation:
> - iOS:     [321fit_ios/docs/athlete-dashboard-ios.md] (to be created)
> - Android: [321fit_android/docs/athlete-dashboard-android.md] (to be created)
> - Backend: [poly-backend/docs/athlete-dashboard-api.md] (to be created)

**Scope note:** this spec covers the **Home (Dashboard)** tab for athletes — tab 1 of 5 in athlete navigation. Mirrors coach Dashboard structurally (`dashboard.md`) but with athlete-specific content: balance instead of earnings, awaiting confirmation instead of pending client requests, recommended coaches carousel, activity teaser.

---

## 1. Overview

Dashboard is the home tab — the first screen after onboarding and the default tab when athlete reopens the app (unless restored to last-active tab per `navigation.md`). It answers three questions in priority order:

1. **"How much money do I have?"** — Balance card pinned at top
2. **"What's coming up?"** — Next training card + Awaiting confirmation list
3. **"What's interesting?"** — Recommended coaches carousel + Recently viewed + Activity teaser

Three screens total in this module:
- **`s-dashboard`** — main Home with 7 states
- **`s-rate-queue`** — Sessions to rate (push from Notifications "Rate your session" tap or from Profile training history)
- **`s-notifications`** — Notifications inbox (push from header bell)

---

## 2. User Stories

### Athlete

- As an athlete, I want my balance visible the moment I open the app, so I know if I can book before browsing.
- As an athlete, I want to see my next session at a glance with directions, so I can quickly act on the most urgent thing.
- As an athlete, I want pending booking requests visible so I know what's awaiting coach approval and for how long.
- As an athlete, I want a small selection of recommended coaches so I can discover without going to Search.
- As an athlete, I want quick access to coaches I recently viewed (browsed but didn't book), so I can return to them.
- As an athlete, I want to see my training streak and stats so I stay motivated.
- As an athlete, I want notifications collected in one inbox so I can catch up after being offline.
- As an athlete, I want a queue of completed sessions waiting for my review, so I don't forget to leave feedback.

### Coach

(Coaches see a different Dashboard — see `dashboard.md` for coach-side.)

---

## 3. System Stories

- As the system, on first launch after onboarding I render the **Welcome state** with a 4-step setup checklist (Pick sports, Personal details, Top up balance, Find first coach).
- As the system, I render the Balance card in `.alert` style (red border, red label) when balance is €0 AND there are pending booking requests requiring funds.
- As the system, when athlete has 0 upcoming sessions, the Next training card switches to an empty CTA block (`Ready for your next session?` + Find a coach / My coaches actions).
- As the system, the Awaiting confirmation list is hidden when 0 pending requests exist; visible with count when ≥1.
- As the system, Recommended coaches are fetched from `GET /athlete/dashboard/recommended` using hybrid sport × location ranking. Empty sport types → fallback to "Top rated near you".
- As the system, on offline first-fetch, I render the Error state with cached header banner + cached balance/next training cards.
- As the system, on tab open, restore scroll position to top (don't preserve scroll across tab switches).

---

## 4. Flows

### Layout — Default state (active athlete, has bookings)

Reordered 2026-06-05 to mirror the coach Home module order (Next → Needs attention → Balance → …) and the **Recommended** carousel was **removed**.

1. **Header** — title "Home" (left) + `🔔` bell with badge (right). Badge = unread Activity + To reply (see Inbox).
2. **Greeting** — "Good morning, {first_name}" + context sub-line.
3. **Next session** — coach avatar + name + sport · duration · location + "Tomorrow · 10:00" (teal accent). Tap → event detail. (Empty variant with CTA when none.)
4. **Needs your attention** — conditional action list (`.pending-row` grammar, same as coach), shown only when present. Athlete need-attention types: *N requests awaiting confirmation* (→ Inbox **Waiting** tab via `openInboxOnTab('waiting')`), *request declined* (→ rebook), *rate your last session* (→ rate queue), *cash to settle* (→ My Coaches). Icon color by severity (yellow/red/teal).
5. **Balance card** — €240 amount + "Topped up €100 · Apr 28" + actions `Top up` / `Transactions` (both → Balance screen). Whole card tappable → Balance.
6. **Recently viewed** — list (max 2-3 rows): avatar + name + sport · price from + chevron → coach profile.
7. **Your activity** — teaser: "This month" + `[sessions | hours | streak]` stat strip → Profile (athlete's own).
8. **Footer** — 5-tab `FitNavbar`, Home slot 1 active.

> **Removed 2026-06-05:** the "Recommended for you" carousel (was a `.rec-card` horizontal scroll) — discovery now lives in Search (loupe-push from My Coaches), not on Home. The standalone "Awaiting confirmation" list folded into **Needs your attention**.

### States (7)

| State | When | Content |
|---|---|---|
| **Default** | Active athlete with bookings | All blocks above visible |
| **Welcome** | First launch post-onboarding | Greeting + setup checklist (4 steps), no other blocks |
| **Low balance** | Balance = €0 AND pending requests > 0 | Balance card in red alert mode + Needs-attention list (other blocks hidden) |
| **Idle** | Has balance, 0 upcoming, no pending | Greeting + Next training empty CTA + Balance + Activity teaser |
| **All zero** | Has balance, no bookings, no recent | Greeting + Next "Time for your next session" CTA + Balance (minimal) |
| **Loading** | First fetch in flight | Skeleton cards for greeting, balance, next, recommended |
| **Error** | Offline first-fetch failure | Offline banner + cached greeting + cached balance + cached next training |

### Push: Sessions to rate (`s-rate-queue`)

Reached from Notifications inbox "Rate your session" tap OR from athlete Profile training history "Leave review" CTA on completed sessions. Mirrors coach `s-review-queue` pattern (sessions waiting for action), but action differs.

- **Default** — 3 rate cards grouped by date (oldest first). Each card: coach avatar + name + sport · duration + date · time line + location line + "Ended N ago" + actions row [Skip] [Rate now].
- **Single** — only 1 card to rate.
- **Empty** — "You're all caught up" with empty illustration.
- **Loading** — skeleton cards.

`Rate now` → opens star-rating + free-text review sheet (separate flow, not specced here).
`Skip` → dismisses card without rating (can re-surface later).

### Push: Inbox (`s-notifications`) — unified, 3 tabs (2026-06-05)

Reached from the header **bell**. Reworked from a single "Notifications" list into a **unified Inbox with 3 segmented tabs**, mirroring the coach Inbox (one bell → one inbox; memory `one-bell-one-inbox`):

- **Activity** (default) — push-history feed, grouped by date (Today / Yesterday / older). Each row: leading colored icon plate + body (title + meta) + unread blue dot. Types (icon color): Confirm (green) · Decline (red) · Soon (blue clock) · Review (yellow star) · Balance (red card) · Match (purple search) · Calendar sync (yellow alert). Tap routes: confirm/decline/soon → event detail · review → rate sheet · balance → Balance/top-up · match → Search filtered · calendar sync → Settings → Calendar Sync.
- **To reply** — coach-initiated items needing the athlete's answer, on the canonical **`.req-card`** (avatar + name + action line + session block + location/price + [Decline] [Accept]): *coach invited you to a session*, *coach proposed a new time* (reschedule, old→new).
- **Waiting** — the athlete's own **sent** booking requests, awaiting the coach. `.req-card` with yellow "Awaiting reply" pill + sent/expires meta + **[Cancel request]** (athlete has no Edit — coach-only).

**Bell badge** = unread Activity **+ To reply** count. **Waiting is NOT counted** — the bell signals "action needed by you"; waiting on a coach is monitoring (surfaced via the tab counter + Home "Needs your attention" row). Same rule as coach.

**States:** Default (per-tab content) · Empty (per-tab empty-state) · Loading (skeleton) · Error (inline + retry).

---

## 5. Component usage

- **`FitNavbar`** — 5-tab bottom bar (Home active in slot 1)
- **`.fit-icon-btn`** — notification bell (with `.notif-bell-badge` for unread count)
- **`.balance-card`** — top priority card with `.alert` modifier for low-balance state
- **`.dash-next`** — next training compact card with avatar + meta + when (teal)
- **`.dash-next-empty`** — empty variant with CTA row (primary gradient + outline)
- **`.pending-list`** + **`.pending-row`** — awaiting confirmation rows
- **`.rec-scroll`** + **`.rec-card`** — recommended coaches horizontal carousel
- **`.recent-list`** + **`.recent-row`** — recently viewed list rows
- **`.activity-card`** + **`.activity-stat`** — activity teaser stat strip
- **`.wiz-card`** + **`.wiz-item`** — Welcome state setup checklist (shared with coach onboarding wizard)
- **`.offline-banner`** — error state cached-data banner

---

## 6. API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1.0.0/athlete/dashboard` | Single bundle for Home — returns balance, next_training, pending_requests[], recommended_coaches[], recently_viewed[], activity_stats |
| GET | `/api/v1.0.0/athlete/notifications` | Notifications inbox paginated |
| POST | `/api/v1.0.0/athlete/notifications/mark-read` | Mark all read |
| GET | `/api/v1.0.0/athlete/sessions/to-rate` | Sessions to rate queue (oldest first) |
| POST | `/api/v1.0.0/athlete/sessions/{id}/rate` | Submit rating + review text |
| POST | `/api/v1.0.0/athlete/sessions/{id}/skip-rate` | Dismiss rating prompt without rating |

Detailed shapes live in `poly-backend/docs/athlete-dashboard-api.md` (to be created). Single-bundle dashboard endpoint is preferred over per-block calls to minimize first-fetch latency.

---

## 7. Business rules

- **Default tab on first launch** = Dashboard. Subsequent launches restore last-active tab per `navigation.md`.
- **Balance card always visible.** Even at €0 — to keep the financial mental model consistent.
- **Empty `next_training`** does NOT hide the section — it switches to the empty-CTA variant. The section header "Next training" stays visible so layout doesn't jump.
- **Pending requests hidden when 0** — entire section + label removed to avoid empty placeholder.
- **Recommended fallback** — if athlete has 0 sport types in Settings → fallback to "Top rated near you" using location signal only.
- **Recently viewed cap** — show last 5 viewed in horizontal scroll, but only render if ≥1 exists. Cleared after 30 days.
- **Activity teaser** — uses current calendar month. Stats: sessions, hours, current streak in weeks. Streak resets if athlete misses 2+ consecutive scheduled weeks.
- **Notification badge** — numeric count if `unread_count >= 1`, "99+" cap. Hidden when 0.

---

## 8. Edge cases

- **Cold start, network down** — Error state with cached header banner + cached balance/next (if previously synced). No new fetch attempted on visible scroll.
- **Welcome state, balance is 0** — still show "Top up later" outline button (not primary alert) — first run shouldn't pressure athlete.
- **All sessions cancelled** — Idle state (has balance, no upcoming).
- **Coach declines while athlete on Dashboard** — pending row in "Awaiting" list updates to "Declined · view reason" or is removed (real-time push or refresh on focus).
- **Long coach name in pending row** — truncate with ellipsis to single line; tap reveals full detail in event view.
- **Recommended carousel with 0 results** — collapse section entirely (don't render "No recommendations" — feels off).
- **Sessions-to-rate with skipped items resurfacing** — items resurface 7 days after Skip. If skipped 3× → permanently dismissed.

---

## 9. Platform notes

- **iOS:** SwiftUI `DashboardView` with `ScrollView`. Bell badge via `@State` from notifications service. Balance card uses `@StateObject` balance service for live updates. Recommended carousel = `ScrollView(.horizontal)`.
- **Android:** Jetpack Compose `DashboardScreen` with `LazyColumn`. Bell via `Scaffold` topbar action. Recommended = `LazyRow`.
- **Backend:** Single `/dashboard` endpoint composed from precomputed counters + cached recommendation list. 30s Redis TTL acceptable.
- **Voice:** N/A — voice assistant lives on FAB (future).

---

## 10. Open questions

- [ ] **Welcome state dismissibility** — should checklist persist until all 4 done, or expire after 7 days? Currently planned as persistent.
- [ ] **Activity stat strip metrics** — sessions/hours/streak. Should we expose more (avg rating given, total spent, etc.) or stay minimal? Lean: minimal for MVP.
- [ ] **Activity teaser deep-link** — tap → Profile. Should it scroll to a specific Profile section (Stats)? Likely yes when Profile spec is fleshed out.
- [ ] **AI Assistant FAB position** — when shipped, FAB sits on Dashboard. Right-bottom above tab bar? Conflict with stats teaser? Defer to AI Assistant spec.

---

## 11. Design decisions log

- **2026-05-12** — Balance card pinned at top (above Next training) — athlete's "fuel gauge" must be visible immediately.
- **2026-05-12** — Balance displayed as plain € amount only, no "≈ N sessions left" approximation (confusing, depends on which coach's prices).
- **2026-05-12** — Recommended uses hybrid sport × location ranking. Fallback to "Top rated near you" if sport types empty.
- **2026-05-12** — Notifications inbox uses same pattern as coach-side (memory: `dashboard.md` notification grouping).
- **2026-05-12** — Sessions-to-rate is a push screen (not bottom sheet) — list with multiple items, sticky scroll, mirrors coach `s-review-queue`.
- **2026-05-12** — Recently viewed lives on Dashboard (NOT inside Search text overlay). Memory: `feedback_dashboard_recently_viewed`.
- **2026-05-12** — Notification types mapped to specific colored icon plates: confirm (green), decline (red), soon (blue), review (yellow), balance (red), match (purple).
- **2026-05-12** — Sidebar = screens only (3 entries: Dashboard / Sessions to rate / Notifications). State variants live in right annotation panel `.state-toggle`. Memory: `feedback_sidebar_states_separation`.
- **2026-06-05** — Home **module order reworked** to mirror coach: Next session → Needs your attention → Balance → Recently viewed → Your activity. **Recommended carousel removed** (discovery → Search); standalone "Awaiting confirmation" folded into Needs-attention. Earlier (2026-05-12) "Balance pinned at top" superseded.
- **2026-06-05** — Notifications → **unified Inbox** with 3 tabs (Activity / To reply / Waiting), mirroring coach. Bell badge = Activity unread + To reply (Waiting excluded). To-reply/Waiting use the canonical `.req-card`. Memory: `one-bell-one-inbox`.

---

## 12. References

- Prototype: [flows/athlete/dashboard.html](https://321-fit.github.io/project-spec/prototypes/flows/athlete/dashboard.html)
- Coach Dashboard (mirror): [dashboard.md](dashboard.md)
- Navigation: [navigation.md](navigation.md) — 5-tab bottom nav contract
- Search (recommended → tap card): [athlete-search.md](athlete-search.md)
- Coach profile (recent viewed / recommended → tap): [coach-profile.md](coach-profile.md) (Appendix A — Athlete-side view)
- Booking flow (Awaiting confirmation → tap event): [booking-flow.md](booking-flow.md)
- Payments: [payments.md](payments.md) — balance top-up flow
- Memory:
  - `feedback_sidebar_states_separation`
  - `feedback_bottom_sheet_dismiss`
  - `project_search_default_filters`
