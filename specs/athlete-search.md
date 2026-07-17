# Athlete Search

> Status: Draft
> Prototype: [flows/athlete/search.html](https://321-fit.github.io/project-spec/prototypes/flows/athlete/search.html)
> Component library: [design-tokens/docs/components.md](../../design-tokens/docs/components.md)
> Last updated: 2026-07-17 (backend impl-doc pointer relinked to shipped athlete-search-api.md; coach-card refinements — see §11)
> Implementation:
> - iOS:     [321fit_ios/docs/athlete-search-ios.md] (to be created)
> - Android: [321fit_android/docs/athlete-search-android.md] (to be created)
> - Backend: [poly-backend/docs/athlete-search-api.md](../../poly-backend/docs/athlete-search-api.md)

**Scope note:** this spec covers the **Search / Discover** tab in athlete navigation — the marketplace entry point where athletes find coaches. Coach profile and booking flow (downstream of tapping a coach card) live in `flows/shared/profile.html` and are covered by `coach-profile.md` / booking spec.

---

## 1. Overview

Search is **tab 2 of 5** in athlete navigation (slot order: Dashboard, Search, Calendar, My Coaches, Profile). It is the discovery surface for the marketplace — athletes browse, filter, sort and find coaches here.

The module follows the **structured-picker** pattern used by all major service marketplaces (Preply, ClassPass, Italki, Airbnb, Booking): sport / location / time / price are set via dedicated UI controls, not free-text NLP. Free-text search is reserved for the narrow case of finding a specific coach by name (or sport keyword as a shortcut).

The header carries a **Sport anchor chip** on the left (current sport filter, opens sport picker) and **🔍 + 🗺** icon group on the right (text search overlay + map view). This minimal header keeps vertical space for the coach feed.

Coach cards use a **single unified card pattern** everywhere — landing feed, filtered results, text search results — to avoid layout drift and keep visual continuity.

---

## 2. User Stories

### Athlete

- As an athlete, I want to open the Search tab and immediately see coaches relevant to my sports and area, so I don't have to set anything up to start browsing.
- As an athlete, I want to switch sports without leaving Search, so I can quickly explore different training options.
- As an athlete, I want to narrow results by location (city / country), price, time-of-day, format and language, so I can find coaches that fit my constraints.
- As an athlete, I want my home city to be pre-filled the first time I open Search, so I don't have to set it manually.
- As an athlete, I want to switch the search city (e.g. before travelling to another city in the same country, or across borders) without changing my home address.
- As an athlete, I want to sort results by rating, distance, price or "newest", so I can scan the list in the order that matters to me.
- As an athlete, I want to find a specific coach by typing their name, so I can return to someone I heard about or visited before.
- As an athlete, I want to save coaches I like to a favorites list, so I can return to them without re-searching.
- As an athlete, I want to tap a card and land directly on the coach's profile (with booking entry points), so I can act on what I see.
- As an athlete, I want to see clear empty / loading / error states so I never face a broken-feeling screen.

### Coach

(Coaches don't see this tab; their tab 2 is Clients.)

---

## 3. System Stories

- As the system, when athlete opens Search for the first time after onboarding, I auto-apply **Sport** (from Settings → Sport Types), **Country + City** (from Personal Data → Home country / Home city), and **Languages** (from Personal Data); all other filters default to "any" so the result pool is wide.
- As the system, I render results sorted by `Recommended` (hybrid: sport × location × activity) unless the athlete overrides via Sort sheet.
- As the system, when filters are active, I display the chips on the chips row as deep-links to the Filters screen (not inline-removable) — tap reopens Filters with that section focused.
- As the system, when the athlete types in the text search, I match against (a) the 33-item closed sport list and (b) coach names — never against free-form NLP. Mixed-output is rendered as a single list of coach cards.
- As the system, when no coaches match a query or filter combination, I render the empty state with a recovery CTA (switch city / browse all coaches).
- As the system, when the network is offline on a first fetch, I render the offline error state; on subsequent fetches I keep showing the last known list with a non-blocking banner.
- As the system, when athlete favorites a coach (heart), I persist that to `POST /athlete/favorites/{coach_id}` and reflect across My Coaches → Favorites tab.
- As the system, when athlete taps a coach card, I navigate to `shared/profile.html` (coach profile preview + booking entry).

---

## 4. Flows

### Layout (top to bottom)

1. **Header**
   - Left: **Sport anchor chip** — shows current sport filter ("Tennis" / "Tennis, Padel" / "Tennis, Padel +1" / "All sports"). Tap → opens `flows/coach/sport-types.html` (same picker reused for athlete).
   - Right: icon group — 🔍 (text search overlay) + 🗺 (map view). Both use canonical `.fit-icon-btn` from fit-ui.css (32×32 glass-pill, 16px stroke icon).
   - No back chevron (tab root). No always-on search bar.

2. **Filter chips row** (horizontal scroll)
   - Lead chip: **Filters** (with optional count badge, e.g. "Filters · 3" when active filters present).
   - Followed by quick chips that deep-link to specific Filter sections — defaults: Location / Price / Time of day / Format.
   - When filters are applied, **active value chips** replace the quick chips (e.g. "Vilnius" / "≤ €50" / "Afternoon"). Active chips have brand-gradient background. Tap on any active chip → opens Filters screen with corresponding section focused. **No × inline removal.**

3. **Count + Sort link row**
   - Left: count (`52 Tennis coaches near you`).
   - Right: sort label chip (`Sort · Recommended`). Tap → Sort bottom sheet.

4. **Coach card list**
   - Single unified `FitCoachCard` component, identical on landing/results/text-search.
   - Each card: 72×72 photo (gradient placeholder if no image, `NEW` badge bottom-left when maturity = new) + name + ⭐ rating with reviews count + price-from + sport · city · language-flags + availability hint + 2-line bio. Heart in top-right with optimistic toggle.
   - Tap card → `shared/profile.html` (coach profile + booking).
   - Heart tap doesn't propagate to card.
   - Infinite scroll with spinner at scroll end while next page fetches.

5. **Footer** — 5-tab `FitNavbar` with Search slot 2 active.

### Push: Text search overlay (`s-search-text`)

Reached by tapping the 🔍 icon in the header. Full-screen push that replaces the main view.

- **Header**: back chevron + search input field (auto-focused, "Coach name" placeholder).
- **States** (3):
  - **Initial** — empty input. Renders "Recent searches" section only — past text queries (Clear-all link, per-row × to remove individual). Recently-viewed coaches do NOT live here (they're on Dashboard).
  - **Results** — list of matching coaches using the same `FitCoachCard` pattern as landing/results. Count at top (`4 coaches match "box"`). Whether matched by coach name or sport keyword, output is identical.
  - **No match** — empty illustration + copy + `Browse all coaches` CTA → returns to landing with current filters preserved.
- Submit on enter (without tapping suggestion) → applies the raw text as a fulltext filter on Results screen.

### Push: Filters (`s-search-filters`)

Reached by tapping Filters chip. Full-height push (not a bottom sheet — too many sections, sticky CTA needed).

- Header: back chevron + "Filters" title + Reset text-button (top right).
- Body sections (scrollable):
  1. **Location** — two push rows (`filter-expand-row` pattern, same as Languages / Coach gender below):
     - **Country** — push to `s-search-country` (single-select with search, reused from `personal-data.html#s-country-select`). Default auto-applied from Personal Data → Home country.
     - **City** — push to `s-search-city` (single-select with search, reused from `personal-data.html#s-city-select`; list scoped to selected country). Default auto-applied from Personal Data → Home city.
     - Changing **Country** resets City to empty (previous city is no longer valid in the new country) — same behavior as Personal Data.
  2. **Price** — dual-thumb slider €X – €Y. Default = no constraint.
  3. **Time of day** — symmetric 3×2 tile grid with hour ranges (6–9, 9–12, 12–15, 15–18, 18–21, 21–23). Each tile has a daypart icon. Multi-select. **Selected state** uses canonical `--fit-selection-gradient` (soft teal-tint) + `--fit-teal-600` border — same pattern as `coach/sport-types.html` `.sp-card.selected`. Empty selection = no constraint.
  4. **Format** — multi-select chips: In-person / Online / Home visit. Default = all 3 selected.
  5. **Languages** — push row → `s-search-lang` (multi-select with search + sticky Save). Default auto-applied from Personal Data → Languages. Selected value renders in `--fit-text-primary` (NOT teal accent — matches `personal-data` pattern where "Polski" / "Man" are shown in regular text color).
  6. **Coach gender** — push row → opens `gender-sheet` **bottom-sheet overlay on the Filters screen** (single-select: Any / Female / Male). Default = Any. Selected value rendered same as Languages (text-primary, not teal).
  7. **Group lessons only** — inline `FitToggle`. Default = OFF.
- Footer (sticky, flex pinned): single full-width `Show N coaches` CTA. Count updates live as filters change. No "Clear all" — Reset in header is the canonical reset.

### Push: Country (`s-search-country`)

Same UX as `coach/personal-data.html#s-country-select` — single-select with search, auto-dismiss on tap. Replicated inside Search so back navigation returns to Filters, not Personal Data. Picking a new country here changes only the Search filter (not Personal Data → Home country).

### Push: City (`s-search-city`)

Same UX as `coach/personal-data.html#s-city-select` — single-select with search, auto-dismiss on tap. List scoped to currently-selected country in this filter (NOT Personal Data country; user may have switched). Header subtitle: "Cities in &lt;Country&gt;". Picking a new city here changes only the Search filter.

### Push: Languages (`s-search-lang`)

Same UX as `coach/personal-data.html#s-lang-select` — multi-select with search input, sticky Save (N selected) footer. Replicated inside Search so back navigation returns to Filters, not Personal Data.

### Bottom sheet: Coach gender (`gender-sheet`)

Bottom-sheet overlay rendered **inside** `s-search-filters` (canonical `.fit-sheet-overlay` + `.fit-sheet.compact` from fit-ui.css). Handle + centered title + 3 single-select rows (Any / Female / Male, checkmark on selected). Dismiss via handle drag or backdrop tap. No × close button. Single-tap = select + auto-dismiss back to Filters.

### Bottom sheet: Sort (`sort-sheet`)

Bottom-sheet overlay rendered **inside** `s-search-results` (canonical `.fit-sheet-overlay` + `.fit-sheet`). Triggered from the `results-sort` link on Results. 6 options, each row = title + sub-description:
- Recommended (default) — sport × location × activity hybrid
- Top rated — highest review average first
- Price · low to high
- Price · high to low
- Most experienced — most completed sessions first
- Newest on 321Fit — recently joined coaches

(`Closest to me` / distance sort removed 2026-06-11 — coaches have no stored coordinates; City/Country is the location model. See §11.)

Single-tap = select + auto-apply + dismiss. No Apply button. From Landing, tapping Sort first navigates to Results, then opens the sheet there (single canonical home for the sheet).

### Push: Map view (`s-search-map`)

**Status: placeholder for MVP**. Full-screen push with fake pins + "Map view coming soon" overlay. Production will use Apple MapKit (iOS) and Mapbox/Google Maps (Android). Planned interactions: pin tap → bottom card highlight, card swipe → pan to pin, "Search this area" pill after panning, toggle back to List view.

---

## 5. Default filter state (post-onboarding)

| Filter | Default | Source |
|---|---|---|
| Sport | from Settings → Sport Types | "Tennis, Padel" header anchor |
| Country | from Personal Data → Home country | auto-applied |
| City | from Personal Data → Home city | auto-applied |
| Languages | from Personal Data → Languages | auto-applied |
| Price | none | — |
| Time of day | none | — |
| Format | all 3 (in-person + online + home) | — |
| Coach gender | Any | — |
| Group lessons only | OFF | — |
| Sort | Recommended | — |

**Reset** (header top-right of Filters) returns to this state, not to "everything cleared". Sport / Country / City / Languages are user-provided data and should not be silently wiped.

---

## 6. API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1.0.0/athlete/coaches` | Primary search (existing endpoint, extended additively — see backend issue #334) — accepts sport, lang, **country (ISO-3166-1 alpha-2)**, **city (string)**, price min/max, time-of-day, format, gender, group-only, sort, page params; returns paginated coach list with rating, price-from, availability snippet, bio preview. `distance` query param + response field **removed 2026-06-11** (legacy `distance` query param still accepted-but-ignored for older clients; never returned). New clients use `country` + `city`. |
| GET | `/api/v1.0.0/geo/countries` | Country list — ISO-3166-1 alpha-2 codes + display names + flag emoji. Static, cacheable client-side. |
| GET | `/api/v1.0.0/geo/cities?country=<code>&q=<search>` | City list scoped to country, paginated, with optional search query. Powers both Personal Data city picker and Search → City filter. |
| GET | `/api/v1.0.0/geo/reverse-city` | Reverse-geocode device coordinates to `{country_code, city}` for first-time onboarding pre-fill. Client sends `?lat=&lng=`. |
| GET | `/api/v1.0.0/athlete/search/suggest` | Text autocomplete — query string in, returns matching sports (from 33-list) + matching coach names with avatars |
| POST | `/api/v1.0.0/athlete/favorites/{coach_id}` | Heart toggle (idempotent) |
| DELETE | `/api/v1.0.0/athlete/favorites/{coach_id}` | Heart un-toggle |
| GET | `/api/v1.0.0/athlete/search/recent` | Recent text searches (last 10) |
| DELETE | `/api/v1.0.0/athlete/search/recent` | Clear recent searches (all) |
| DELETE | `/api/v1.0.0/athlete/search/recent/{id}` | Remove individual recent search |

Detailed request/response shapes live in [`poly-backend/docs/athlete-search-api.md`](../../poly-backend/docs/athlete-search-api.md). All endpoints follow backward-compatibility rule — additive only, no field removals, see `feedback_backward_compat_endpoints` memory.

**Backend note:** Recommended sort algorithm = hybrid weighted score: sport-match (0/1) × language-match (0/1) × city-match (0/1) × recent-activity-boost × rating. **No distance/PostGIS component** (removed 2026-06-11) — City/Country is the only location signal. Tuning lives in `poly-backend` config, not exposed to clients. See backend issue #335.

---

## 7. Business rules

- **Sport anchor is mandatory presence**, but value can be "All sports" (no filter applied) when athlete hasn't picked any in Settings.
- **Languages auto-apply** is removable by athlete inside Filters → Languages. Once removed in this session, do not auto-restore on next visit (athlete chose breadth).
- **Country / City auto-apply** is editable inside Filters → Location. Same once-removed rule as Languages: if athlete clears city to browse all coaches in country, do not auto-restore on next visit. Country is mandatory — if cleared, falls back to Personal Data → Home country on next visit.
- **City can differ from Personal Data** (travel mode). Picking a different city in Search filter doesn't write back to Personal Data; it only affects the current search session.
- **NEW coach badge** appears when `reviews_count < 1 OR sessions_count < 3` (`coach-maturity-model.md`). New coaches render `New coach` blue pill instead of star rating row.
- **Heart (favorite)** state syncs across Search, My Coaches → Favorites, and Coach profile. Optimistic UI — instant visual toggle, retry on failure.
- **Free-text search** does NOT support NLP parsing (`boxing near me` etc.). Such intents go through the AI Assistant FAB (separate spec, future).
- **Filter chips on results** are deep-links to Filters, not inline-removable (memory: `feedback_filter_chips_no_inline_remove`).

---

## 8. Edge cases

- **First open with 0 sport types in Settings** — sport anchor shows "All sports"; results driven by location only. Fallback sort: Top rated.
- **First open with 0 languages in Personal Data** — Languages filter empty; no auto-apply.
- **First open with 0 home city in Personal Data** (device geocode failed at onboarding) — Search opens with Country pre-applied from Personal Data but City = empty. Quick chip surfaces "Set city" hint that opens `s-search-city`.
- **0 coaches in athlete's city** — empty state with "Browse all of &lt;Country&gt;" CTA that clears the City filter (keeping Country) and re-runs search. If still 0 — second CTA "Switch country" opens `s-search-country`.
- **Filter combination yields 0** — empty state mentions which filter is most restrictive (e.g. "No tennis coaches in Vilnius in evenings — try clearing city or removing time").
- **Athlete types a language as a coach name** (e.g. "english") — sport list doesn't match, coach names may or may not match. Standard results state applies.
- **Network offline first fetch** — error state with Retry CTA.
- **Network offline mid-scroll** — non-blocking banner "Couldn't load more — retry?" inline, list keeps current items.
- **Coach goes on vacation while in athlete's favorites** — coach card still appears in Search but with `On vacation` overlay (future, not MVP).
- **Athlete blocked by coach** — blocked coaches must be filtered out by backend; client never renders them.
- **Sport picker returns 0 sports** (athlete deselects all) — anchor reverts to "All sports", Sport filter removed.
- **Map view requested before MapKit/Mapbox SDK ready** — placeholder screen shown (current MVP state).

---

## 9. Platform notes

- **iOS**: SwiftUI views — `SearchView` hosting `CoachListView`, `FilterSheetView` (push via `NavigationStack`), `SortSheetView` (`.sheet` modifier). Sort & gender = sheet (`.presentationDetents`). Filters = full screen push. Recommend `Combine` for debounced text input. Map = `MapKit` later.
- **Android**: Jetpack Compose — `SearchScreen` with `LazyColumn` for coaches, `ModalBottomSheet` for sort/gender, full-screen `Scaffold` for Filters push. Map = Mapbox or Google Maps later.
- **Backend**: extends existing `GET /athlete/coaches` (`CoachesController.list_coaches`) additively — see issues #334 (filters) / #335 (sort). Search query uses Postgres GIN indexes on sport_ids + ts_vector for coach names. **City filter** = direct equality on `coach.city` column; **Country filter** = ISO-3166-1 alpha-2 code. **No PostGIS / distance** (removed 2026-06-11). Recommendation scoring lives in service layer, not in SQL — easier to tune. (City dataset + `geo/cities` deferred — see issue #336; Country list ships first.)
- **Voice**: out of scope — natural-language search routes through AI Assistant FAB (separate spec).

---

## 10. Open questions

- [ ] **Saved searches** — should athlete be able to save a query+filter combo for later ("Tennis coaches under €40 in Vilnius")? Useful for repeat searches; adds backend storage. Deferred to v2.
- [ ] **Voice search button in text input** — defer to AI Assistant FAB or add native mic now? Lean: defer to FAB to keep scope tight.
- [ ] **"Search this area" pill on map** — final copy and pan-threshold to surface it. Out of MVP.
- [ ] **Match logic for sport keyword** — exact substring vs Levenshtein for typos ("bxoing" → boxing)? Sport list is 33 items, Levenshtein is cheap. Default: substring only for MVP, add Levenshtein later if user feedback shows typo friction.
- [ ] **Coach card extras for returning users** — "Trained with you 3×" badge, "Online now" green dot, "On vacation" overlay. All deferred to a follow-up iteration after baseline ships.
- [ ] **Group lessons filter** — toggle is a hard filter (group-only). Should we also surface a chip for "Private only" symmetrically? Probably not — most coaches offer both, "Private only" is the implicit default.

---

## 11. Design decisions log

- **2026-05-12** — Sport anchor in header (left), not in Filters body. One strong primary control; no duplication.
- **2026-05-12** — Filter chips on results are deep-links, no × inline removal. Memory: `feedback_filter_chips_no_inline_remove`.
- **2026-05-12** — Sort = bottom sheet (fast switching), Filters = push (long form). Memory: `feedback_picker_sheet_vs_push`.
- **2026-05-12** — Bottom sheets dismiss via handle + backdrop tap only; no × close button. Memory: `feedback_bottom_sheet_dismiss`.
- **2026-05-12** — One unified `FitCoachCard` pattern across landing, results, and text search results. No separate compact "suggestion row" component.
- **2026-05-12** — Time of day uses symmetric 3×2 tile grid (Preply-style) with daypart icons, replacing Today/Tomorrow date-based pattern. Habit-friendly.
- **2026-05-12** — Recently-viewed coaches removed from text search initial state. Lives on Dashboard. Search overlays in Spotify/Booking/Airbnb show queries only.
- **2026-05-12** — No NLP parsing of free-text ("boxing near me"). Structured pickers handle sport/location/time. NLP belongs in AI Assistant FAB (future).
- **2026-05-12** — Default filter state: auto-apply only Sport + Languages from athlete data; Distance/Price/Time/Format/Gender = no default. Memory: `project_search_default_filters`. **(superseded by 2026-05-19 entry below)**
- **2026-06-11** — **Distance/proximity removed entirely** (not just the radius filter): `Closest to me` sort dropped (7→6 sorts), `distance` field removed from coach cards, PostGIS `ST_Distance` + distance-decay dropped from the Recommended ranker. Rationale: coaches have no stored coordinates and geocoding them is out of v1 scope; City/Country is the sole location model. Legacy `distance` query param accepted-but-ignored for old clients. Backend issues #334/#335 re-scoped. Also: **City dataset (`geo/cities`) deferred** — `geo/countries` ships first (#336); City filter UX stays in spec/prototype but is backend-gated.
- **2026-05-19** — **Distance radius filter removed; replaced by Country + City** push rows. Country/City auto-apply from Personal Data (new City field added there). Rationale: discrete location filter matches mental model better than radius, supports travel use-case ("show me coaches in Riga even though I live in Vilnius"), and lets sort handle proximity without a radius gate. Distance API param deprecated, additive country+city params added. Memory: `project_search_default_filters` to be updated; `project_personal_data_selectors` extended with City.
- **2026-05-12** — Sort & Gender sheets implemented as `.fit-sheet-overlay` inside their host screens (Results / Filters), not as separate phone divs. Memory: `feedback_bottom_sheets` — overlay must be direct child of `.fit-phone`.
- **2026-05-12** — Time-of-day tile selected state uses `--fit-selection-gradient` + teal-600 border (matches `coach/sport-types.html .sp-card.selected`), NOT full brand-gradient. Soft teal-tint, content stays primary color.
- **2026-05-12** — Filter-row selected value (Languages / Gender) renders in `--fit-text-primary` (regular weight), not teal accent. Mirrors `personal-data.html` value display pattern.
- **2026-05-12** — Header icons (🔍, 🗺) use canonical `.fit-icon-btn` from fit-ui.css. No custom local class.
- **2026-05-12** — Reviews / rating chips on Coach Profile (downstream) all deep-link to All Reviews screen (`s-reviews`): "Show all reviews" carousel card, "4.8 · 42 reviews" header chevron, Stats strip Rating + Reviews columns, individual "Show more" links inside each review card.
- **2026-05-12** — About bio uses inline 4-line clamp + "See more" / "See less" toggle. No push to separate screen.
- **2026-05-12** — Inline Sessions preview was added then removed from Coach Profile — redundant with Book Training CTA flow that takes user to full session catalog (`s-book-sessions`).
- **2026-06-26** — **Coach-card refinements (Search + My Coaches).** Languages no longer shown on the result/relationship cards — they live only on the full Coach Profile. The location line now leads with a **country flag** in place of the map-pin icon (the flag doubles as the country cue). On **Search**, cards show the training **location** (`City, Country` — e.g. *Vilnius, Lithuania*) in place of the old "Available today · HH:MM" line (availability surfaces later in booking; on a city-filtered list, location is the more useful at-a-glance signal). On **My Coaches**, a coach with an unpaid cash balance shows a red `fit-badge-danger` "€X owed" chip next to the name (mirrors the coach Clients list); tap → Coach Detail "Cash owed". Prototypes: `athlete/search.html`, `athlete/my-coaches.html`.

---

## 12. References

- Prototype: [flows/athlete/search.html](https://321-fit.github.io/project-spec/prototypes/flows/athlete/search.html)
- Coach profile (downstream): [coach-profile.md](coach-profile.md) — what opens when athlete taps a card
- Sport picker (reused): [flows/coach/sport-types.html](https://321-fit.github.io/project-spec/prototypes/flows/coach/sport-types.html)
- Country / City pickers (reused from Personal Data): [flows/coach/personal-data.html](https://321-fit.github.io/project-spec/prototypes/flows/coach/personal-data.html) — `s-country-select` + `s-city-select`
- Personal Data: [personal-data.md](personal-data.md) — source of Country/City pre-fill defaults
- Coach maturity model: [coach-maturity-model.md](coach-maturity-model.md) — drives NEW badge
- Navigation: [navigation.md](navigation.md) — 5-tab bottom nav contract
- Memory:
  - `feedback_filter_chips_no_inline_remove`
  - `feedback_picker_sheet_vs_push`
  - `feedback_bottom_sheet_dismiss`
  - `feedback_bottom_sheets`
  - `feedback_design_token_namespace`
  - `feedback_sidebar_states_separation`
  - `project_search_default_filters`
