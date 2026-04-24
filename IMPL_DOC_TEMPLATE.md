# <Module> — <Platform> implementation

> Spec: [project-spec/specs/<module>.md](../../project-spec/specs/<module>.md)
> Components used: <FitButton, FitSheet, …> (see [design-tokens/docs/components.md](../../design-tokens/docs/components.md))
> Last updated: YYYY-MM-DD

This is the **per-repo, per-platform** implementation doc. Lives in the target
repo, not in `project-spec`. Describes how the spec is realised in this specific
codebase — file paths, navigation hooks, data mapping, state management,
platform quirks.

If spec and this doc disagree, **spec wins**. Fix this doc. Drift is worse than
silence.

---

## 1. File map

List every new / modified file, grouped by concern.

### Views / UI
- `Sources/Dashboard/DashboardView.swift` — root screen composition
- `Sources/Dashboard/NextSessionCard.swift` — featured card
- …

### ViewModels / State
- `Sources/Dashboard/DashboardViewModel.swift` — `@StateObject` owner
- …

### Services / Network
- `Sources/Network/DashboardNetworkService.swift` — GET /coach/dashboard
- …

### Models
- `Sources/Models/DashboardSnapshot.swift` — decodable from API
- …

### Tests
- `Tests/DashboardTests/DashboardViewModelTests.swift` — state transitions
- `Tests/DashboardTests/DashboardNetworkServiceTests.swift` — mock API
- …

### Migrations (backend)
- `alembic/versions/<n>_add_coach_dashboard_cache.py`

Adjust headings to platform conventions. Backend uses `app/`, `alembic/`,
`tests/`; iOS uses `Sources/`; Compose uses `src/main/kotlin/…`.

---

## 2. Navigation

How this feature routes within the app.

- Entry: tab bar **Home** → `DashboardView`
- Next Session tap → presents `EventDetailSheet` (`FitSheet` modal)
- Action card tap → navigates to `ClientsView(filter: .pendingRequests)`
- Action card tap → `ReviewQueueView` (pushed, not modal)
- ⋯ menu → native `contextMenu` modifier

Backend: no navigation; replace this section with "Request/response lifecycle"
describing celery tasks, cache invalidation, etc.

---

## 3. Data

### Models used
- `DashboardSnapshot` (decodable from GET response)
- `Event`, `Client`, `CoachBalance` (shared existing models)

### Network
- `DashboardNetworkService.fetch(completion:)` — wraps GET /coach/dashboard
- Error handling: `.networkUnavailable` → show cached; `.authExpired` → trigger
  re-auth flow
- Cache policy: 5-minute TTL, invalidated on session completion / payment

### Persistence / local storage
- `UserDefaults` key `dashboardCacheTimestamp`
- `CoreData` entity `CachedDashboard` with full snapshot

Backend: replace with DB schema changes, indexes, query patterns.

---

## 4. State management

Platform-specific patterns.

### iOS (SwiftUI)
- `DashboardViewModel: ObservableObject` with `@Published` state
- Loading state machine: `.idle → .loading → (.loaded | .error)`
- Pull-to-refresh via `.refreshable` modifier
- Environment: `@Environment(\.fitTheme)` for dark/light

### Android (Compose)
- `DashboardViewModel` (AAC) exposing `StateFlow<DashboardState>`
- `collectAsStateWithLifecycle()` in composable
- `LocalFitTheme.current` for theme

### Backend (Litestar + Celery)
- Controller `DashboardController.get_dashboard`
- Celery task `refresh_coach_dashboard_cache` on session/payment events
- Redis cache key `dashboard:{coach_id}:v1` with 5-min TTL

### Voice
- Function tool `get_dashboard` returns subset of response suitable for TTS
- Auth via child JWT session

---

## 5. Platform quirks

Non-obvious platform-specific behaviors not derivable from the spec.

### iOS
- Haptic: `UIImpactFeedbackGenerator(style: .medium)` on action-card tap
- Safe area: footer uses `.padding(.bottom, FitSpacing.sp8)` + system safe-area
- Dynamic Type: respects accessibility large sizes; cap at `.accessibility3` to
  prevent breaking layout

### Android
- System back on DashboardView exits app (root screen); handle via
  `BackHandler(enabled = false) { }`
- Edge-to-edge via `WindowCompat.setDecorFitsSystemWindows(window, false)`
- Haptic: `HapticFeedbackConstants.CONTEXT_CLICK`

### Backend
- Celery task must be idempotent — may run multiple times on same event
- Cache invalidation piggybacks existing event-update signal

### Voice
- Response must fit in TTS budget (~150 tokens); truncate long signal lists

---

## 6. Edge cases (platform-specific)

Edge cases that only manifest in this platform. General ones stay in spec.

- iOS: if app resumed from background after > 5min, re-fetch silently (no spinner)
- Android: configuration change (rotation) should preserve state via
  `SavedStateHandle`
- Backend: if Redis is down, return uncached response + log warning
- Voice: if user asks about dashboard mid-session, use cached snapshot < 30s old

---

## 7. Tests

List of tests to write with key assertions.

### Unit
- `DashboardViewModelTests.test_loadingToLoaded_transitionsOnSuccess`
- `DashboardViewModelTests.test_loadingToError_onNetworkFailure`

### Integration
- `DashboardNetworkServiceTests.test_parsesValidResponse`
- `DashboardNetworkServiceTests.test_handlesServerError`

### Snapshot / UI (if applicable)
- `DashboardView_Snapshot_Default`
- `DashboardView_Snapshot_NewCoach`
- `DashboardView_Snapshot_UnderReview`

Backend adds: load tests (100 req/sec), migration rollback test.

---

## 8. Open items

TODOs, known limitations, follow-ups deferred for later.

- [ ] Implement signal filtering (hide reviews older than 7 days) — needs
  product decision
- [ ] Add analytics tracking for action-card taps
- [ ] Revisit cache TTL after measuring real usage

---

## Appendix: Template notes (delete before merging a real impl-doc)

- Update this file in the same PR that changes the code
- If spec changes, open a matching PR to update this doc
- Keep in sync with `design-tokens/docs/components.md` — if a component's API
  changed, fix the reference
- Update `Last updated:` every time you touch this file
