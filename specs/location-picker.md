# Locations (Coach)

> Status: Draft
> Prototype: [flows/coach/settings.html#s-locations](https://321-fit.github.io/project-spec/prototypes/flows/coach/settings.html#s-locations)
> Component library: [design-tokens/docs/components.md](../../design-tokens/docs/components.md)
> Last updated: 2026-04-27
> Implementation:
> - iOS:     [321fit_ios/docs/location-picker-ios.md] (to be created)
> - Backend: [poly-backend/docs/location-picker-backend.md] (to be created)
> - Voice:   not applicable
> - Android: [321fit_android/docs/location-picker-android.md] (when available)

**Scope note:** this spec covers the **coach side** of locations — defining where training takes place. Athletes interact with locations only as read-only data in session detail. The "athlete provides home address at booking" piece belongs to the athlete-side booking spec, not here.

---

## 1. Overview

Coaches need to specify where their training happens. 321Fit supports three location types: **in-person** (a physical address — gym, studio, park), **online** (a video meeting URL), and **home visit** (coach travels to the athlete). Locations are managed in Settings, attached to session templates at creation time, and surfaced to athletes throughout the booking and session lifecycle.

A coach can have many in-person locations with one default; one or more online locations; and one home-visit configuration.

---

## 2. User Stories

### Coach
- As a coach, I want to add my gym/studio/park as a location so that athletes know where to come.
- As a coach with multiple training spots, I want to mark one as my default so that creating new sessions is fast.
- As a coach who teaches online, I want to register my Zoom/Meet/custom link so that athletes get a meeting URL automatically.
- As a coach who travels to clients, I want to enable home visits with a travel buffer so that my calendar accounts for commute time.
- As a coach, I want to delete a location and be warned which session templates depend on it so that I don't accidentally break my session catalog.
- As a coach using the location picker in session creation, I want to see all my locations in one organized list so that I can pick the right one quickly.

### Athlete
- As an athlete browsing a session, I want to see the location type and details so that I know where it takes place.
- As an athlete who booked an online session, I want the meeting URL delivered to my phone before the session so that I don't miss it.

---

## 3. System Stories

- As the iOS / Android client, the locations list must reflect the latest server state — fetch on Settings → Locations open, no stale local edits.
- As the backend, deletion of a location used by ≥ 1 active session template **must block** with a 409 conflict listing the dependent templates. Reassignment must happen before delete completes.
- As the backend, the home-visit travel buffer must be applied to calendar scheduling automatically — preventing back-to-back home visit and studio sessions when the buffer would overlap.
- As the backend, online location URLs must be re-emittable in push so that updated links reach athletes whose sessions are already booked.
- As any client, default-flag changes must be atomic — at most one in-person location has `isDefault: true` at all times.

---

## 4. Flows

References to screen IDs are from `flows/coach/settings.html`.

### Flow 1: View locations
1. Coach: Settings → "Training Locations" row → push `#s-locations`
2. List grouped:
   - **In-person** — cards (default badge on one)
   - **Online** — section header + "+ Add" icon button (right) + entries
   - **Home Visit** — section header + entry (or empty CTA)
3. Tap any card → push to its edit screen

### Flow 2: Add an in-person location
1. From `#s-locations` → tap "+ Add" in in-person section → push `#s-loc-add` (map picker)
2. Search bar with Google Places autocomplete ("Search address or gym name")
3. Tap "Use current location" → OS geolocation prompt → pin centers
4. Or drag pin manually
5. Address from pin shown below map
6. Tap "Confirm Location" → push `#s-loc-form`
7. Form pre-filled with selected address (read-only)
8. Coach types Location name (e.g. "TNT Studio")
9. Toggles "Set as default location" (optional)
10. Save → return to `#s-locations`, new entry appears
11. If "Set as default" was on → previous default loses badge atomically

### Flow 3: Edit an in-person location
1. From `#s-locations` → tap an in-person card → push `#s-loc-form` pre-populated
2. Can change name + default toggle. **Cannot change address** (re-add through map flow if needed)
3. Save → return to list

### Flow 4: Add an online location
1. From `#s-locations` → tap "+ Add" in Online section → push `#s-loc-online`
2. Provider radio: **Zoom / Google Meet / Custom URL**
3. Paste meeting URL field
4. Optional name (e.g. "My Zoom Room")
5. Save → return to list

### Flow 5: Configure home visit
1. From `#s-locations` → tap Home Visit row → push `#s-loc-homevisit`
2. Explanation copy: "You travel to the athlete's location. Their address is provided when they book. Travel buffer blocks extra time in your calendar for commuting."
3. Travel buffer field (minutes input, with hint "Added before and after each home visit session")
4. Save → return to list, home visit becomes available as a Location option

### Flow 6: Delete a location
1. From any edit screen → tap trash icon (top right, tinted red bg)
2. Bottom sheet `#delete-location-sheet` opens
3. Title: "Delete Location?", subtitle: "This will remove **<name>** from your locations."
4. **If location is used in N templates** → yellow warning block: "This location is used in **N training templates** (<list>). They will need a new location assigned."
5. Buttons: **Delete** (destructive) / **Cancel**
6. Tap Delete:
   - If used in 0 templates → delete confirmed, return to `#s-locations`
   - If used in N templates → server returns 409, UI prompts to reassign first
   - If default in-person deleted → next in-person (oldest by creation) inherits default flag automatically

### Flow 7: Use location in session creation
1. In Create Session flow → Location field is a chevron row showing current location name
2. Default per `project_create_session_rules`: `profile.addresses[0]` (= default in-person)
3. Tap row → push `#s-locations` in **picker mode**
4. Tap any location → return to Create Session with selection applied
5. One session = one location. **No hybrid sessions** in MVP

### Flow 8: Display in event detail (athlete)
1. Athlete books → opens session detail drawer
2. Location shown by type:
   - **In-person:** name + address + map preview (tap → opens Maps app)
   - **Online:** provider icon + name; URL revealed 15 min before session start (push) + always visible in drawer post-booking time
   - **Home visit:** "Coach will visit you" + athlete's chosen address. **No travel-buffer mention to the athlete** — the buffer is the coach's commute, coach-side calendar only; the athlete's session is simply the booked time at their address (e.g. 21:00–22:00). (Corrected 2026-06-24: earlier "Coach arrives X min before" copy was wrong — buffer is travel time, not early arrival.)

---

## 5. States

| State | When shown | What user sees | Transition |
|---|---|---|---|
| `loc-empty` (**per section**) | A given section (In-person / Online / Home visit) has zero entries | That section shows a **dashed "Add…" CTA** — same footprint as a location card (`min-height` 64, radius 16), icon + "Add an in-person location" / "Add an online location" / "Set up home visit". **Each section is independent**: e.g. in-person filled but online empty → only Online shows the CTA. The `+` in the section header stays as the persistent quick-add. | → cards after first add to that section |
| `loc-list` | Section has ≥ 1 entry | Sectioned cards | → edit / picker / delete |
| `loc-add-map` | Coach in `#s-loc-add` | Map + search + pin + Confirm | → `loc-add-form` after Confirm |
| `loc-add-form` | Coach in `#s-loc-form` (post-map for new) | Address read-only + name + default toggle | → `loc-list` after Save |
| `loc-edit` | Coach edits existing in-person | Same form, can change name/default only | → `loc-list` after Save |
| `loc-add-online` | Coach in `#s-loc-online` | Provider radio + URL + optional name | → `loc-list` after Save |
| `loc-add-homevisit` | Coach in `#s-loc-homevisit` | Travel buffer + explanation | → `loc-list` after Save |
| `loc-delete-confirm` | Trash tapped | Bottom sheet, conditional warning | → `loc-list` (delete) or stay (cancel) |
| `loc-picker` | Opened from Create Session | Same list, taps return selection | → calling screen |

---

## 6. API

> **Backend mapping note.** Existing poly-backend endpoint `/api/v1.0.0/coach/addresses` already handles in-person locations. Phase 4 **extends** this resource with a `type` discriminator (`"in_person"` / `"online"` / `"home_visit"`) and new optional fields per type, rather than introducing parallel endpoints. Existing rows are backfilled with `type: "in_person"`. No URL renames; iOS keeps using `coach/addresses`.

### Endpoints

#### `GET /coach/addresses`
Returns the coach's addresses (all types).
**Auth:** JWT (coach role).

**Response 200:** array of `Address` (see Models).

#### `POST /coach/addresses`
Creates a new address of any type. Server discriminates by `type`.
**Body:** `Address` (without `id`, `createdAt`, `updatedAt`).
**Response 201:** created entry. If `isDefault: true` and `type: "in_person"` → server atomically clears `isDefault` on previous default in-person.

#### `GET /coach/addresses/{id}`
Returns a single address.

#### `PUT /coach/addresses/{id}`
Full replace.

#### `PATCH /coach/addresses/{id}`
Partial update. For `type: "in_person"` — `lat`/`lon`/`addressLine` immutable post-create (re-add to change). For `type: "online"` — `provider`/`url` editable. For `type: "home_visit"` — `travelBufferMinutes` editable.

#### `DELETE /coach/addresses/{id}`
**Response 204:** deleted.
**Response 409 — `TEMPLATE_DEPENDENCY`:**
```json
{ "error": "TEMPLATE_DEPENDENCY",
  "templates": [{ "id": 42, "name": "HIIT Group Session" }] }
```
Client surfaces this in the warning sheet; delete blocked until templates reassigned.

### Models

#### `Address` (extended `AddressResponse` from baseline)

Existing fields (preserved from current poly-backend `AddressResponse`):

| Field | Type | Notes |
|---|---|---|
| `id` | integer | |
| `lat` | number | nullable when `type ≠ "in_person"` |
| `lon` | number | nullable when `type ≠ "in_person"` |
| `addressLine` | string | nullable when `type ≠ "in_person"` |
| `locationName` | string | display name, all types ("TNT Studio", "My Zoom Room", "Home Visit") |
| `isDefault` | bool | meaningful for `type: "in_person"` only |
| `city` | string? | optional |
| `countryCode` | string? | optional |
| `description` | string? | optional |

**New fields (Phase 4 extension):**

| Field | Type | Notes |
|---|---|---|
| `type` | enum | `"in_person"` / `"online"` / `"home_visit"`. Backfill defaults existing rows to `"in_person"`. |
| `provider` | enum? | `"zoom"` / `"meet"` / `"custom"` — only for `type: "online"` |
| `url` | string? | HTTPS only; provider-domain validated for `zoom`/`meet`. Only for `type: "online"` |
| `travelBufferMinutes` | int? | Only for `type: "home_visit"`. Applied before AND after each home-visit session |
| `templateUsageCount` | int | derived; for delete warning |

**Discriminator behavior:**
- `type: "in_person"` — `lat`, `lon`, `addressLine` required; `provider`/`url`/`travelBufferMinutes` ignored
- `type: "online"` — `provider`, `url` required; `lat`/`lon`/`addressLine` null
- `type: "home_visit"` — `travelBufferMinutes` required; `lat`/`lon`/`addressLine` null. **Singleton per coach** — only one home-visit address allowed (server enforces 409 on attempted second).

---

## 7. Business rules

- **Default in-person:** zero or one in-person locations marked default. Online and home-visit cannot be marked default.
- **Default fallback for session creation:** `profile.addresses[0]` (= default in-person). If no default and no in-person → falls through to first online → home visit → empty state.
- **Address immutability:** in-person address cannot be edited. Reason: prevents accidental mass-rename of an existing location used in templates.
- **Online URL:** HTTPS required. For `zoom` validated against `*.zoom.us`; for `meet` against `meet.google.com`; `custom` only validated as well-formed HTTPS URL.
- **Online link strategy (MVP):** **single permanent link per location**, not auto-generated per session. Per-session OAuth link generation is V2.
- **Online URL athlete delivery:** push notification 15 min before session start (per `notifications` spec). URL also visible in event detail drawer at all times post-booking.
- **Online URL change after bookings:** updated URL takes effect for all booked sessions. Server re-emits push with the new URL to affected athletes.
- **Home visit (MVP scope):** travel buffer minutes only. **Service radius and per-km fee are out of MVP** — UI hidden, backend ignores. To be added in a future iteration.
- **Athlete address for home visit:** captured at booking time (athlete-side flow). Not stored on coach side.
- **Travel buffer enforcement:** calendar scheduling rejects sessions whose buffer overlaps with another session's slot.
- **Travel buffer display (decided 2026-06-24, prototyped):** **coach calendar only** — rendered as a Google-Calendar-style attached commute block (hatched/dashed tile, car icon, "Travel · N min") immediately **before and after** the home-visit event (`.cal-travel-buffer` in `coach/calendar.html`). Stateless, not draggable, not tappable. **Athlete side: invisible** — the buffer only filters which slots the booking grid offers (server already excludes slots that would overlap the buffer); the athlete sees no buffer UI at all. (Coach event-detail line "🚗 N min travel buffer" + directions = follow-up.)
- **Delete blocking:** location used in ≥ 1 active session template → 409 Conflict with template list. Client must reassign before retrying.
- **Cross-type sessions:** one session = one location. No "online OR in-person" hybrid in MVP.
- **Default promotion on delete:** when default in-person is deleted, the **oldest-by-creation** remaining in-person becomes default automatically.

---

## 8. Edge cases

- Coach has only home-visit (no in-person, no online) → session creation Location defaults to home-visit (no fallback issue).
- Coach has 0 locations entirely → Settings shows empty `#s-locations`; session creation Location field shows "Add a location" CTA, blocks Save until added.
- Coach changes Zoom URL after sessions are already booked → server re-emits push to affected athletes; event detail drawer always shows latest URL.
- Network failure during map autocomplete → silent fallback to manual address typing.
- Address selected on map but coach kills app before Save → no persistence; redo on next attempt.
- Custom-URL provider — frontend can't validate domain; backend validates HTTPS only.
- Coach toggles "set as default" then cancels back without Save → no change persisted.
- Concurrent edit (two devices) → last-write-wins per location row; fields are independent so no merge conflict.
- OS geolocation denied → "Use current location" button disabled with hint, manual search remains available.

---

## 9. Platform notes

**Native UI conventions:** see [architecture/design-system.md § Native theming contract](../architecture/design-system.md#native-theming-contract). Don't duplicate cross-platform UI rules here — only platform-specific deviations below.

- **iOS:** map = MapKit (no extra dependency). Place autocomplete = Google Places SDK (already in project — see `321fit_ios/CLAUDE.md` GoogleMaps/Places). Picker mode of `#s-locations` returns selection via Coordinator.
- **Android:** map = Maps Compose. Place autocomplete = Google Places API. Picker mode returns selection via NavController saved state.
- **Backend:** location-template referential integrity enforced via FK; `templateUsageCount` derived per fetch (single COUNT query), not stored.
- **Voice:** not applicable — locations are managed visually only.

---

## 10. Open questions

- [ ] Online URL push delivery timing — 15 min hardcoded or per-coach configurable? **Owner:** product. Reco: hardcoded 15 min in MVP, revisit if customers ask.
- [ ] Custom URL provider — show warning when URL doesn't match known patterns (`whereby.com`, `daily.co`)? **Owner:** product, low priority.
- [ ] "Use current location" precision — precise vs approximate iOS permission? **Owner:** product / privacy. Reco: precise (purpose is studio location pin).
- [ ] Travel buffer default value (minutes) — 15? 30? Per region/distance? **Owner:** product. Reco: **30 min default**, coach can edit.

---

## Related specs / references

- [session-creation.md](./session-creation.md) — uses Location field (default + picker) — TO BE WRITTEN
- [onboarding-wizard.md](./onboarding-wizard.md) — onboarding step adds first location
- [profile-settings.md](./profile-settings.md) — Settings hub entry point
- [coach-calendar.md](./coach-calendar.md) — display location in calendar event details
- [notifications.md](./notifications.md) — online URL push delivery (TBD when notifications fully specced)
- Prototype: [flows/coach/settings.html#s-locations](https://321-fit.github.io/project-spec/prototypes/flows/coach/settings.html#s-locations)
- Memory: `project_locations_decisions` (decisions source), `project_create_session_rules` (Location default rule)
- Components: `FitInput` (with chevron variant for picker rows), `FitIconBtn`, `FitSheet` (delete confirm), `FitButton`, `FitToggle` (default flag), `FitSelectionGroup` (single mode for online provider Zoom/Meet/Custom). All in `design-tokens/docs/components.md`.
- Native (per `feedback_native_pickers`): map place picker = `MapKit` + Google Places SDK (iOS) / Maps Compose + Google Places API (Android); current-location button uses OS geolocation prompt.
