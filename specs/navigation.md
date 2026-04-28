# Navigation — Bottom Tab Bar

> Status: Draft
> Prototype: tab bar appears on all root screens — see e.g. [coach/dashboard.html](../prototypes/flows/coach/dashboard.html), [athlete/calendar.html](../prototypes/flows/athlete/calendar.html)
> Component library: [FitNavbar](../../design-tokens/docs/components.md#fitnavbar)
> Last updated: 2026-04-28
> Implementation:
> - iOS:     [321fit_ios/docs/navigation-ios.md] (when written)
> - Android: [321fit_android_new/docs/navigation-android.md] (when written)
> - Backend: [poly-backend/docs/navigation-backend.md] (badges only)

---

## 1. Overview

Bottom tab bar is the top-level navigation for both Coach and Athlete. Five fixed tabs, role-agnostic, always rendered as the floating glass-pill `FitNavbar`. The component itself is specced in `design-tokens/docs/components.md`; this document specs the **product behavior** around it: when it shows, how badges work, how deep-links route into it, how state is preserved per tab.

---

## 2. User Stories

### Coach

- As a coach, I want to switch between Dashboard / Clients / Calendar / Messages / Settings in one tap, without losing my place inside each section.
- As a coach, I want to see at a glance how many client requests are pending, so I can act on them before athletes drop off.
- As a coach, I want unread message count visible on the Messages tab so I never miss a question.

### Athlete

- As an athlete, I want the same five tabs and the same gestures as a coach — switching role should not relearn navigation.
- As an athlete, I want push notifications to open me directly inside the relevant tab (e.g. a session invite opens Calendar with the invite sheet up), not on Dashboard.

---

## 3. System Stories

- As the iOS / Android client, on app launch I restore the **last-active tab** (persisted to local storage), not always Dashboard.
- As the iOS / Android client, I render `FitNavbar` **only on the five root tab screens**. Any pushed / modal / sheet screen MUST hide it. (Memory: `feedback_navbar_visibility`.)
- As the iOS / Android client, I expose **per-tab navigation stacks** — switching tabs preserves the inner stack of each tab (Calendar → event detail → back stays inside Calendar).
- As the backend, I return badge counts in a single endpoint per snapshot; clients do not poll multiple endpoints to compose the bar.
- As the iOS / Android client, badge updates from realtime (push / websocket) merge into the local badge state without a full refetch.

---

## 4. Flows

### Flow A: Tab switch

1. User on `#s-coach-dashboard` (Dashboard tab active).
2. Taps Clients tab in `FitNavbar` → app routes to last screen of Clients tab stack (or root `#s-coach-clients` if first visit).
3. `FitNavbar` updates active tab indicator (selection-gradient capsule moves to Clients).
4. Dashboard tab stack is preserved for return.

### Flow B: Tap on already-active tab

1. User in Calendar, drilled into event detail.
2. Taps Calendar tab again.
3. Behavior: **pop to root of that tab's stack** (back to `#s-coach-calendar`). Do not scroll to top of an already-root screen — popping is a no-op there.

### Flow C: Deep-link routing

1. User receives push: «New session request from Maria».
2. Tap → app launches (or foregrounds).
3. Resolver reads payload `{ tab: "clients", screen: "request_detail", id: "abc" }`.
4. Active tab → Clients. Stack: `#s-coach-clients` → `#s-request-detail?id=abc`.
5. `FitNavbar` shows Clients active.

### Flow D: Modal/push hides navbar

1. User taps Coach Profile from Athlete Calendar.
2. Coach Profile pushes onto Calendar's tab stack.
3. `FitNavbar` is **not rendered** on Coach Profile (visibility rule).
4. User dismisses → returns to Calendar root → `FitNavbar` reappears.

### Flow E: Badge update from realtime

1. Coach is on Dashboard. Athlete sends a session request → push lands.
2. Backend bumps `clients_pending` counter; client receives realtime increment.
3. Clients tab badge appears (red dot with count) without refetching the dashboard.
4. Coach taps Clients → opens pending list → badge updates after backend marks viewed.

---

## 5. States

| State | When | Visual |
|---|---|---|
| Active tab | currently viewed | selection-gradient capsule, icon `theme.textPrimary` |
| Inactive tab | other tab active | icon `gray.300`, no capsule |
| Inactive + badge | unread/pending > 0 on inactive tab | inactive icon + red dot (or count pill if ≥ 10 / coach preference) |
| Active + badge | rare — user is on the tab but counter still > 0 (e.g. unread in nested chat) | active capsule + red dot |
| Hidden | screen is push/modal/sheet | `FitNavbar` not rendered at all |

Badges in MVP appear only on **Clients** (`clients_pending`) and **Messages** (`messages_unread`). Dashboard / Calendar / Settings have no badges.

---

## 6. API

### `GET /api/v1.0.0/navigation/badges`

```json
{
  "clients_pending": 3,
  "messages_unread": 7,
  "messages_unread_threads": 2
}
```

- All counters are integers ≥ 0.
- Endpoint is read-only and idempotent. P95 ≤ 100 ms.
- Response cacheable for 30 s; clients invalidate on relevant realtime events.

### Realtime events

- `clients.request.created` → bumps `clients_pending`.
- `clients.request.resolved` → decrements `clients_pending`.
- `messages.received` → bumps `messages_unread` (+ `_threads` if first in a new thread).
- `messages.read` → adjusts both counters.

(See `messenger.md` and `clients-coaches.md` for event payload shapes.)

### Push deep-link payload

```json
{
  "tab": "clients" | "calendar" | "messages" | "dashboard" | "settings",
  "screen": "<route id>",
  "params": { "id": "..." }
}
```

Unknown `tab` or unknown `screen` → fallback to that tab's root, surface a toast («This screen is not available yet»). Never crash, never land on a blank screen.

---

## 7. Business rules

- **Five fixed tabs**, in this order: **Dashboard, Clients, Calendar, Messages, Settings**.
- **Same five tabs for both roles.** Content inside differs; structure does not.
- **Last-active tab is restored on launch** (persisted locally, per-account).
- **Per-tab navigation stacks are independent** and survive tab switches.
- **Tab tap on already-active tab pops to root** of that tab.
- **Tab bar is hidden** on every push / modal / sheet — only the five root screens show it.
- Badge thresholds: numeric pill is shown for ≥ 1; "99+" cap once a counter exceeds 99.

---

## 8. Edge cases

- **Messages tab not yet shipped.** For MVP, the tab is rendered with the same icon but tapping leads to a "Coming soon" placeholder screen (no toast, no broken state). When messenger ships, this becomes the real screen with no client release coupling.
- **Backend `/badges` endpoint fails or returns 5xx.** UI shows no badges (graceful). Do not block tab interaction. Retry with exponential backoff.
- **Realtime disconnects.** On reconnect, refetch `/badges` once to reconcile.
- **Deep-link to a tab the user does not have access to** (e.g. role-restricted future tab). Fallback to Dashboard + toast.
- **Cold launch from killed state with deep-link.** App must complete auth / role check before applying the deep-link; once routed, do not animate the entire tab switch (no flicker).
- **Switching account** (logout + login as another user). Last-active-tab persistence must be **per account**, not global, to avoid leaking the previous user's last position.
- **Localization width.** Tab labels are not rendered (icon-only); no localization width concern. ARIA / TalkBack labels do localize.

---

## 9. Platform notes

Native UI conventions: see [architecture/design-system.md § Native theming contract](../architecture/design-system.md#native-theming-contract). Don't duplicate platform rules here — only platform-specific deviations below.

- **iOS:** root is a `TabView` wrapping a `FitNavbar` overlay; per-tab `NavigationStack` for stacks. Hide navbar via passing `showNavbar = false` from `FitTheme`-aware host on push/modal screens. State persisted via `@SceneStorage("activeTab")`.
- **Android:** Compose, single `NavHostController` with nested graphs per tab; `FitNavbar` rendered in scaffold's `bottomBar` slot, hidden on routes annotated as push/modal. `DataStore` for last-active-tab persistence.
- **Backend:** `/navigation/badges` should be composed from precomputed counters where possible; do not run heavy joins per request. Cache 30 s in Redis if shape allows. Realtime events fan-out is via the existing notifications topic.
- **Voice:** N/A (voice does not navigate the GUI).

---

## 10. Open questions

- [ ] Should "tap on already-active tab" do **pop-to-root** (current spec) or **scroll-to-top** (some apps do that)? Decision impacts whether deep-stacked Calendar reverts user state on accidental retap.
- [ ] Should we show a **single dot** (no count) on Clients badge to reduce visual weight, and reserve count pill only for Messages where count is meaningful?
- [ ] Messages tab placeholder: render icon as `bgDisabled` to hint "not active yet", or render normally and rely on the placeholder screen to communicate?
