# Sport Picker (Coach & Athlete)

> Status: Draft
> Prototype: [flows/coach/settings.html#s-sport-types](https://321-fit.github.io/project-spec/prototypes/flows/coach/settings.html#s-sport-types)
> Component library: [design-tokens/docs/components.md](../../design-tokens/docs/components.md)
> Last updated: 2026-05-12
> Implementation:
> - iOS:     [321fit_ios/docs/sport-picker-ios.md] (to be created)
> - Backend: [poly-backend/docs/sport-picker-backend.md] (to be created)
> - Voice:   not applicable
> - Android: [321fit_android/docs/sport-picker-android.md] (when available)

**Scope note:** this spec covers the **shared sport selection component** used by both coach (sports I teach) and athlete (sports I practice). The taxonomy itself (closed list of 33 sports across 8 sections) is canonical — same data on every screen that touches sports.

---

## 1. Overview

321Fit uses a **closed list** of sports — coaches and athletes pick from a fixed taxonomy on onboarding and from profile settings. Sport ID is the join key for discovery, search, filter, suggestion feeds, and coach-athlete matching. Free-text sports are **not allowed**, by design — they would break every discovery surface (typos, synonyms, long-tail ID explosion).

V1 ships **33 sports across 8 sections** (Fitness & Strength, Racket, Team & court, Combat, Endurance, Mind & body, Recovery & therapy, Other). Adding a sport = product decision + backend seed + icon — never a runtime user action.

The sport picker is a **multi-select push screen** with sticky search, sectioned grid layout, and a sticky save footer.

---

## 2. User Stories

### Coach
- As a coach, I want to pick the sports I teach so that athletes can find me by sport.
- As a coach offering several disciplines, I want to multi-select so that I'm represented in all relevant search results.
- As a coach searching for a specific sport in a long list, I want a search bar that filters live so that I find it without scrolling 33 entries.

### Athlete
- As an athlete, I want to pick the sports I practice so that the platform recommends relevant coaches and group trainings.
- As an athlete who tries multiple sports, I want to multi-select so that all my interests are represented.

---

## 3. System Stories

- As any client, the picker must render the canonical taxonomy from the server — never a client-side hardcoded list — so that adding a sport server-side propagates without an app update.
- As the backend, sport IDs must be **stable** across renames — display name can change in seeds, ID never. All FKs (`session.sport_id`, `profile.sport_ids`) reference the stable ID.
- As any client, search filters across all sections live as the user types; empty sections auto-hide; the "No matches" state appears only when zero sports remain visible.
- As any client, Save is disabled until the user's selection differs from the seed value **and** at least one sport is picked. Backing out with a dirty selection prompts a discard sheet.
- As the backend, the user's sport selection persists atomically — either the full new set replaces the old set, or nothing changes (no partial writes).

---

## 4. Flows

References to screen IDs are from `flows/coach/settings.html`.

### Flow 1: Open the picker (multi-select)
1. From Settings → "Sport types" set-card → push `#s-sport-types`
2. Screen opens with current selection seeded (each previously-picked sport has `.selected` class on its card)
3. Sticky search bar at top of content
4. Sections rendered as non-sticky text headers + 2-column card grid below each
5. Each card: sport icon + name; tap toggles `.selected` (no checkmark SVG — CSS-driven from the class)
6. Sticky footer button: "Save (N selected)" — disabled until selection differs from seed **and** ≥ 1 sport picked
7. Tap Save → return to Settings, Sport types subtitle updates to "Up to 3 names, +N more"

### Flow 2: Search filtering
1. User types in sticky search input
2. Cards filter live (case-insensitive, substring match on display name)
3. Sections with zero matching cards auto-hide (header included)
4. If zero matches across all sections → show "No matches" placeholder centered
5. Clearing the search restores the full list with previously-toggled state preserved

### Flow 3: Save confirmation
1. User adjusts selection (tap on / off cards)
2. Save button label updates: "Save (N selected)"
3. Save enabled state:
   - **Disabled** when selection equals seed (no change)
   - **Disabled** when 0 selected (must pick at least one)
   - **Enabled** otherwise
4. Tap Save → server PUT, on success → return to Settings, subtitle reflects new selection

### Flow 4: Discard dirty changes
1. User taps Back with selection ≠ seed
2. Bottom sheet `#discard-sport-sheet` opens:
   - Title: "Discard changes?"
   - Subtitle: "Your sport selection won't be saved."
   - Buttons: **Discard** (destructive) / **Cancel**
3. Tap Discard → revert to seed, return to Settings
4. Tap Cancel → dismiss sheet, stay on `#s-sport-types`
5. If selection equals seed (no changes) → Back returns to Settings directly without sheet

### Flow 5: Display in Settings
1. Settings hub → "Sport types" set-card subtitle: comma-separated list of up to **3 names**, then **"+N more"** if user has more than 3 selected (e.g. "Basketball, Padel, Tennis, +2 more")
2. Empty selection: subtitle "Add the sports you teach" (coach) / "Add the sports you practice" (athlete)

---

## 5. States

### Selection states (content)

| State | When shown | What user sees | Transition |
|---|---|---|---|
| `sp-list` | Picker just opened with seeded selection | Search + sectioned grid + Save (disabled) | → `sp-dirty` on any toggle |
| `sp-search` | User typed in search input | Filtered cards, empty sections hidden | → `sp-list` on clear search |
| `sp-no-matches` | Search query yields zero matches | "No matches" placeholder | → `sp-list` on backspace clearing search |
| `sp-dirty` | Selection differs from seed | Save button enabled with "Save (N selected)" | → `sp-saving` on tap, → `sp-discard-confirm` on Back |
| `sp-discard-confirm` | Back tapped with dirty selection | Bottom sheet with Discard / Cancel | → Settings (Discard) or `sp-dirty` (Cancel) |

### Flow states (added 2026-05-12 — mirrors `personal-data.md` pattern)

Class toggle on `#s-sport-types`:

| Class | Skeleton | Content | Search bar | Footer | Banner |
|---|---|---|---|---|---|
| (none) / default | hidden | shown | shown | shown | none |
| `fs-loading` | shown (`.sp-fs-skel` shimmer) | hidden | hidden | hidden | none |
| `fs-network-error` | hidden | hidden | hidden | hidden | centered illustration + Retry |
| `fs-saving` | hidden | shown | shown | shown (spinner in Save) | none |
| `fs-error` | hidden | shown | shown | shown | red `.sp-save-error` banner with Retry |
| `fs-saved` (snackbar fire) | — | shown | shown | shown | `sport-saved-snack` 1400ms |

### Selection hints (added 2026-05-12 — non-blocking nudges)

Hint classes `sp-zero` / `sp-many` toggled on `#s-sport-types` based on selected count:

| Class | Threshold | Banner copy | Color |
|---|---|---|---|
| `sp-zero` | `selected === 0` | "Pick at least one sport so athletes can find you in search" | blue info |
| `sp-many` | `selected >= 8` (`SP_MANY_THRESHOLD`) | "Picking many sports dilutes your specialty — focus on what you actually coach" | yellow warning |

Both are **informational, not blocking**. Save button gate (`selected > 0 AND dirty`) is the actual mechanism preventing 0-sport saves. Threshold of 8 chosen arbitrarily — tune based on athlete-side discovery analytics.

---

## 6. API

> **Backend mapping note.** Existing poly-backend endpoints `/api/v1.0.0/coach/sports` (and the athlete equivalent) handle the user's selected sports. Bulk assignment goes through `/api/v1.0.0/coach/sports/assign-sports`. Sport IDs are **integers** (autoincrement, stable). Canonical taxonomy listing (the 33-sport master list grouped by section) does **not** exist as a dedicated endpoint in the current baseline — see Open question. Backend currently allows `POST /coach/sports` with `isGlobal: false` for custom sports; in Phase 4 the **UI does not expose** custom-sport creation, but the endpoint is not removed (admin / future use).

### Endpoints

#### `GET /coach/sports`
Returns the coach's selected sports.
**Auth:** JWT (coach role).
**Response 200:** array of `SportTypeResponse`.

(Athlete-side analogue: `/athlete/sports` — same shape.)

#### `POST /coach/sports/assign-sports`
Replaces the coach's selection (atomic). Accepts an integer ID list.
**Body:**
```json
{ "specialities": [12, 8, 7] }
```
**Response 201:** array of `SportTypeResponse` reflecting the new selection.
**Response 422:** validation (empty list, unknown sport id).

(Athlete-side analogue: `/athlete/sports/assign-sports`.)

#### `GET /coach/sports/{id}`, `PUT /coach/sports/{id}`, `DELETE /coach/sports/{id}`
Individual CRUD on a coach-sport association. Phase 4 UI uses bulk `assign-sports` exclusively; these per-id endpoints are not exposed in this picker.

#### `POST /coach/sports`
Creates a new sport entry (with `isGlobal: false` for a custom sport). **Not exposed in Phase 4 UI** — closed-list discipline is enforced client-side. Endpoint left in place for admin / future use.

#### Canonical taxonomy listing (TBD — see Open question)
The picker needs the master list of 33 sports grouped by 8 sections to render. The current baseline does not expose this as a flat catalog. Two options:
- **(a)** Add `GET /sports` returning the seeded master list, optionally grouped by section
- **(b)** Hardcode the taxonomy in the design-tokens / shared client bundle (sport ID + section key + icon asset path), and rely on `GET /coach/sports` only for the user's selection
- Backend architect to decide during `/architect impl-doc sport-picker` based on localization plans (option (a) easier to localize).

### Models

#### `SportTypeResponse` (existing)

| Field | Type | Notes |
|---|---|---|
| `id` | integer | autoincrement; stable across renames |
| `name` | string | display name |
| `isGlobal` | bool | `true` = canonical seeded sport; `false` = custom (UI does not create) |
| `iconPng` | string? | optional asset path |
| `iconSvg` | string? | optional asset path |

#### Future / extended (option a above)

If a `GET /sports` taxonomy endpoint lands:

```json
{
  "sections": [
    {
      "key":   "fitness_strength",
      "name":  "Fitness & Strength",
      "sports": [
        { "id": 1, "name": "Fitness (gym)", "isGlobal": true, "iconKey": "fitness" }
      ]
    }
  ]
}
```

A `sectionKey` field on `SportTypeResponse` is the minimum required to group sports client-side without a dedicated taxonomy endpoint.

---

## 7. Business rules

### Taxonomy (V1)
33 sports across 8 sections (full list in memory `project_sport_taxonomy`):
- **Fitness & Strength:** Fitness (gym), CrossFit, Functional training, HIIT, Weightlifting, Calisthenics
- **Racket:** Tennis, Padel, Badminton, Squash, Table tennis
- **Team & court:** Basketball, Football (soccer), Volleyball
- **Combat / martial arts:** Boxing, Kickboxing / Muay Thai, MMA, BJJ, Karate
- **Endurance / cardio:** Running, Cycling, Swimming, Triathlon
- **Mind-body:** Yoga, Pilates, Stretching
- **Recovery & therapy:** Massage, Sports massage, Physiotherapy
- **Other:** Golf, Climbing, Skiing / Snowboarding, Dance

### Selection rules
- **Multi-select** (both roles)
- **Minimum 1** sport required to save (coach can't have 0 sports if profile is published; athlete can't have 0 if discovery is enabled)
- **No maximum** in MVP — coach can pick all 33 if they want
- Selection is **atomic** — server replaces the entire set on PUT

### Save button states
- Disabled when selection == seed (no change to commit)
- Disabled when 0 selected
- Enabled otherwise; label shows "Save (N selected)"

### Discard
- Back with dirty selection → bottom sheet, default safest option (Cancel = stay)
- Discard reverts to seed, returns to Settings

### Closed list — no custom sports
- Backend rejects unknown sport IDs at the `PUT` boundary
- No "Other / custom" free-text option in MVP — explicitly rejected design decision (per memory)

### Sport ID stability
- Sport IDs are **immutable** after seed — renaming a display name does NOT change the ID
- Reordering within a section is allowed (display order tweak)

### Icons (MVP fallback strategy)
- V1: Tabler Icons + Material Symbols Outlined as primary source
- Hand-drawn / adapted for ~5 icons that Tabler / MS don't cover well: Padel, BJJ, Muay Thai, Physiotherapy, Massage
- V2 (Phase 3 of design-tokens roadmap): commission a custom 33-icon set matching Lucide stroke 1.8 — `iconKey` stays stable so code doesn't change
- Icon files live in `design-tokens/assets/icons/sport/<id>.svg`

### Subtitle truncation
- Settings subtitle shows up to **3 names** comma-separated, then "+N more"
- Empty selection shows role-specific empty hint

---

## 8. Edge cases

- User with 0 sports (legacy account) → Settings subtitle shows empty hint; picker opens with no `.selected` cards; Save disabled until ≥ 1 picked
- User selects a sport, immediately deselects it back to original seed → Save disables again (no-op detection by set comparison, not change-count)
- Search query matches only sports in one section → other section headers hidden
- Search query while user has unsaved selection → selected state preserved across filter (cards keep `.selected` even when hidden by search; hidden card's selection still counts in "Save (N selected)")
- Network failure on PUT → snackbar "Failed to save. Try again." — local selection state preserved, Save remains enabled
- Two devices change sports simultaneously → last-write-wins (PUT replaces full set)
- Server adds a new sport (post-app-version) → app fetches GET on each picker open, new sport renders without app update
- User on older app version, server has a sport the app doesn't know how to render → fallback icon (generic question mark or sport-genre default) + display name
- Backend deprecates a sport but user has it selected → keep displaying it as selected (read-only badge "Deprecated"); user can deselect but can't reselect after save

---

## 9. Platform notes

**Native UI conventions:** see [architecture/design-system.md § Native theming contract](../architecture/design-system.md#native-theming-contract). Don't duplicate cross-platform UI rules here — only platform-specific deviations below.

- **iOS:** picker as SwiftUI `NavigationStack` push. 2-column grid via `LazyVGrid`. Sticky search via `.searchable` with custom positioning to keep it sticky. Discard sheet via `.confirmationDialog`.
- **Android:** push composable in NavHost. 2-column grid via `LazyVerticalGrid(GridCells.Fixed(2))`. Sticky search via custom layout (Column with non-scrolling search row + scrolling LazyVerticalGrid). Discard via `ModalBottomSheet`.
- **Backend:** taxonomy seed in Alembic migration, fetch is read-only and cacheable (5-minute TTL acceptable). User selection is per-row updates on a `profile_sport` join table — replace strategy.
- **Voice:** not applicable — sport selection is visual.

---

## 10. Open questions

- [ ] **Canonical taxonomy delivery.** Baseline has no flat `GET /sports` catalog. Decide: add the endpoint (server-side, easier to localize) OR ship the 33-sport master list in design-tokens (client-side, no extra backend work). **Owner:** backend architect during `/architect impl-doc sport-picker`. Reco: server-side endpoint, since localization is on the roadmap.
- [ ] **Custom-sport endpoint** (`POST /coach/sports` with `isGlobal: false`) exists in baseline but is not exposed in Phase 4 UI. Confirm: leave endpoint in place for admin use, or deprecate it explicitly? **Owner:** backend architect.
- [ ] Localization of sport display names — V1 ships English-only? **Owner:** product. Reco: English V1, localize in Phase 2 alongside other strings.
- [ ] Maximum cap on selected sports — leave unbounded or cap at e.g. 10? **Owner:** product. Reco: unbounded; if a coach picks all 33, that's their problem (search will rank them low for irrelevant matches).
- [ ] Phase 2 sports list — confirm Surfing / Kitesurfing / SUP / Sailing / Equestrian as the geo-expansion batch. **Owner:** product.
- [ ] Should athlete picker have a "Skip" option in onboarding, or is sport selection mandatory? **Owner:** product. Reco: mandatory for athlete (drives recommendations).

---

## Related specs / references

- [session-creation.md](./session-creation.md) — Sport field on session template uses this picker
- [onboarding-wizard.md](./onboarding-wizard.md) — "Select your sports" wizard step
- [profile-settings.md](./profile-settings.md) — Settings hub entry point
- Prototype: [flows/coach/settings.html#s-sport-types](https://321-fit.github.io/project-spec/prototypes/flows/coach/settings.html#s-sport-types)
- Memory: `project_sport_taxonomy` (canonical 33-sport list, sections, deferred Phase 2 sports, icon strategy)
- Memory: `feedback_selection_chips` (rule: no hardcoded checkmark SVGs; CSS-driven `.selected` class only)
- Components: `FitInput` (search variant — sticky), `FitSheet` (discard confirm), `FitButton` (sticky Save). All in `design-tokens/docs/components.md`.
- Inline implementation (single use): sport card with icon + label + `.selected` state — 2-column grid item with `surfaceHigh` bg / `selectionGradient` bg on selected, no design-tokens component. If reused later, extract as `FitSportCard`.
