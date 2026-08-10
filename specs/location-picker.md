# Locations (Coach)

> Status: Draft
> Prototype: [flows/coach/locations.html](https://321-fit.github.io/project-spec/prototypes/flows/coach/locations.html)
> Component library: [design-tokens/docs/components.md](../../design-tokens/docs/components.md)
> Last updated: 2026-07-31
> Implementation:
> - iOS:     [321fit_ios/docs/location-picker-ios.md] (to be created)
> - Backend: [poly-backend/docs/coach-locations-api.md](../../poly-backend/docs/coach-locations-api.md)
> - Voice:   not applicable
> - Android: [321fit_android/docs/location-picker-android.md] (when available)

**Scope note:** this spec covers the **coach side** of locations — defining where training takes place. Athletes interact with locations only as read-only data in session detail. The "athlete provides home address at booking" piece belongs to the athlete-side booking spec, not here.

---

## Update — 2026-07-03 — Per-day location on availability

Coach **weekly availability** (`flows/coach/available-hours.html`) is now **location-aware** when the coach has **2+ in-person locations**:

- Each active day shows a **location pill in its day-header** (right edge) → bottom-sheet picker (canonical `cal-select-row`, 56px rows; a11y `athlete.booking.day-location` on the athlete side / coach picker `avail-loc-sheet`). **One location per day.** Coaches with a single in-person location never see the pill — the whole schedule is implicitly at that location.
- Division of responsibility: the **session template still owns *which* location** (its identity, e.g. "HIIT @ TNT Studio"); availability answers ***when*** the coach is at each gym.
- **Deferred:** per-interval location (different gym for the morning vs the evening of the same day) — rarer case; add later if demand appears. Per-day covers ~90%.

**Booking consequence (athlete side — detailed in [booking-flow.md](./booking-flow.md)):** for a **location-bound in-person session** the calendar shows slots only on days the coach is at that gym; other days are greyed → tapping shows a gym-aware empty state ("Not at TNT Studio this day"). **Online** (no place) and **home-visit** (coach travels) sessions ignore location tags — bookable across all working hours.

**Backend:** an availability day carries an optional `location_id` (in-person only). Warn the coach if an in-person session's gym has no availability days ("This session has no bookable slots — add hours at &lt;gym&gt;").

---

## 1. Overview

Coaches need to specify where their training happens. 321Fit supports three location types: **in-person** (a physical address — gym, studio, park), **online** (a video meeting URL), and **home visit** (coach travels to the athlete). Locations are managed in Settings, attached to session templates at creation time, and surfaced to athletes throughout the booking and session lifecycle.

A coach can have many in-person locations, one or more online locations, and one home-visit configuration. **Exactly one location is the default, across all three types** — see §7.

---

## 2. User Stories

### Coach
- As a coach, I want to add my gym/studio/park as a location so that athletes know where to come.
- As a coach with several places I train, I want to mark one as my default — of any type — so that creating a session template is fast.
- As a coach who teaches online, I want to register my Zoom/Meet/custom link so that athletes get a meeting URL automatically.
- As a coach who travels to clients, I want to enable home visits with a travel buffer so that my calendar accounts for commute time.
- As a coach, I want to delete a location and be warned which session templates depend on it so that I don't accidentally break my session catalog.
- As a coach using the location picker in session creation, I want to see all my locations in one organized list so that I can pick the right one quickly.

### Athlete
- As an athlete browsing a session, I want to see the location type and details so that I know where it takes place.
- As an athlete who booked an online session, I want the meeting URL delivered to my phone before the session so that I don't miss it.
- As an athlete booking a **home-visit** session, I want to provide my address during checkout so that the coach knows where to come — without a separate "format" choice (the session already is a home visit).
- As an athlete with a **saved home address**, I want it pre-filled in the booking confirm sheet so that I don't re-type it every time.
- As an athlete **without a saved address**, I want to be required to add one before I can confirm, so that a home-visit booking is never sent without a destination.

---

## 3. System Stories

- As the iOS / Android client, the locations list must reflect the latest server state — fetch on Settings → Locations open, no stale local edits.
- As the backend, deletion of a location used by ≥ 1 active session template **must block** with a 409 conflict listing the dependent templates. Reassignment must happen before delete completes.
- As the backend, the home-visit travel buffer must be applied to calendar scheduling automatically — preventing back-to-back home visit and studio sessions when the buffer would overlap.
- As the backend, online location URLs must be re-emittable in push so that updated links reach athletes whose sessions are already booked.
- As any client, default-flag changes must be atomic — at most one location **of any type** has `isDefault: true` at all times, on create AND on edit.
- As the booking client, for a **home-visit** session the confirm CTA must stay disabled until the athlete has selected an address (pre-filled from a saved address when available).
- As the backend, the athlete's chosen home-visit address is attached to the **training_event** at booking time — it is not written to the coach's location records.

---

## 4. Flows

References to screen IDs are from `flows/coach/settings.html`.

### Flow 1: View locations
1. Coach: Settings → "Training Locations" row → push `#s-locations`
2. List grouped:
   - **In-person** — cards (default badge on the default location, wherever it lives)
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
11. If "Set as default" was on → the previous default loses its badge atomically, whatever type it was

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
   - If the default location is deleted → the oldest remaining location (in-person first, then online, then home visit) inherits the default flag automatically

### Flow 7: Use location in session creation
1. In Create Session flow → Location field is a chevron row showing current location name
2. Default per `project_create_session_rules`: the location flagged `isDefault`, of whatever type
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

> **Backend mapping note (shipped 2026-07-17).** Existing poly-backend endpoint `/api/v1.0.0/coach/addresses` handles all location kinds. The resource was extended **not** with a `type` discriminator but with **two boolean flags** — `is_online` and `is_home_visit` — plus per-kind optional fields. In-person is the implicit default (both flags false). No URL renames; iOS keeps using `coach/addresses`. See [poly-backend/docs/coach-locations-api.md](../../poly-backend/docs/coach-locations-api.md).

### Endpoints

#### `GET /coach/addresses`
Returns the coach's addresses (all types).
**Auth:** JWT (coach role).

**Response 200:** array of `Address` (see Models).

#### `POST /coach/addresses`
Creates a new address of any type. Server discriminates by `type`.
**Body:** `Address` (without `id`, `createdAt`, `updatedAt`).
**Response 201:** created entry. If `isDefault: true` → the server atomically clears `isDefault` on the coach's previous default, **regardless of its type**. The same must happen on **update** — see §7.

#### `GET /coach/addresses/{id}`
Returns a single address.

#### `PUT /coach/addresses/{id}`
Full replace.

#### `PATCH /coach/addresses/{id}`
Partial update. For in-person (both flags false) — `lat`/`lon`/`addressLine` immutable post-create (re-add to change). For `is_online: true` — `platform`/`meetingLink` editable. For `is_home_visit: true` — `travelBufferMinutes` editable.

#### `DELETE /coach/addresses/{id}`
**Response 200:** deleted (no 204 override — the endpoint returns 200).
**Response 409 — `TEMPLATE_DEPENDENCY`** *(intended; see § 7 — delete-guard **not yet enforced**, filed as a backend issue):*
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
| `isDefault` | bool | valid on any location type; at most one per coach |
| `city` | string? | optional |
| `countryCode` | string? | optional |
| `description` | string? | optional |

**New fields (shipped extension — boolean flags, not a `type` enum):**

| Field | Type | Notes |
|---|---|---|
| `isOnline` | bool | `is_online`. Marks an online location. Default `false`. |
| `isHomeVisit` | bool | `is_home_visit`. Marks the home-visit config. Default `false`. |
| `platform` | enum? | `"zoom"` / `"google_meet"` / `"teams"` / `"custom"` — only when `isOnline: true` |
| `meetingLink` | string? | meeting URL. Only when `isOnline: true`. (HTTPS/domain validation is intended but **not yet enforced** — see § 7.) |
| `travelBufferMinutes` | int? | Only when `isHomeVisit: true`. Applied before AND after each home-visit session |

> In-person is the implicit kind (`isOnline: false` AND `isHomeVisit: false`). There is **no** `templateUsageCount` field on the wire — the delete warning is driven by the 409 `TEMPLATE_DEPENDENCY` response once that guard ships.

**Flag behavior:**
- **In-person** (`isOnline: false`, `isHomeVisit: false`) — `lat`, `lon`, `addressLine` required; `platform`/`meetingLink`/`travelBufferMinutes` ignored
- **Online** (`isOnline: true`) — `platform`, `meetingLink` required; `lat`/`lon`/`addressLine` null
- **Home visit** (`isHomeVisit: true`) — `travelBufferMinutes` required; `lat`/`lon`/`addressLine` null. **Singleton per coach** — only one home-visit address allowed.

---

## 7. Business rules

- **One default, across all types:** at most one of the coach's locations carries `isDefault`, whatever its type. This is the whole point of the flag — it is what prefills the Location field when a coach creates a session template, so a second default makes the prefill ambiguous and the feature meaningless. The rule holds on **create and on update**: setting a new default must clear the previous one in the same operation.
  - *Known defect (2026-07-31):* the backend enforces this on create (`unset_defaults`) but **not** on update, so editing a location and toggling the flag produces a second default. Reproduced on staging with an in-person and an online location both badged Default.
- **Default fallback for session creation:** the location flagged `isDefault`. With no default set, fall through to the first in-person → first online → home visit → empty state.
- **Address immutability:** in-person address cannot be edited. Reason: prevents accidental mass-rename of an existing location used in templates.
- **Online URL:** HTTPS required. For `zoom` validated against `*.zoom.us`; for `google_meet` against `meet.google.com`; `teams`/`custom` validated as well-formed HTTPS URL. *(Intended behavior — meeting-URL validation is **not yet enforced** on the backend; filed as a backend issue. Field on the wire is `meetingLink`.)*
- **Online link strategy (MVP):** **single permanent link per location**, not auto-generated per session. Per-session OAuth link generation is V2.
- **Online URL athlete delivery:** push notification 15 min before session start (per `notifications` spec). URL also visible in event detail drawer at all times post-booking.
- **Online URL change after bookings:** updated URL takes effect for all booked sessions. Server re-emits push with the new URL to affected athletes.
- **Home visit (MVP scope):** travel buffer minutes only. **Service radius and per-km fee are out of MVP** — UI hidden, backend ignores. To be added in a future iteration.
- **Address management (prototyped 2026-06-25):** the athlete add-address flow is a clone of the coach Locations flow — search → pick-on-map (lock/unlock pin, "Use this address") → details (Label chips Home/Work/Other + note, "Save address"). Reachable both at booking time (confirm → picker) and from **Settings → Training → My addresses** (`s-my-addresses` manage screen). Coach-side: the **CRM** New-client form + Client-detail both have a **Home address** field opening the same picker (`s-crm-addr-pick`/`-form`, dark) so the coach can set a client's home location for coach-created home-visit bookings. Client-detail supports **multiple** home addresses (list + Add, mirrors the athlete's My addresses). When a **coach sends a home-visit invite**, the athlete's Inbox → To-reply card shows the location: defaulted to the saved home address with a **Change** chooser, or **"Select your address" + Accept blocked** when none is saved.
- **Athlete address for home visit (UX, decided 2026-06-24, prototyped in `shared/profile.html`):** a home-visit session is just a normal **personal** session whose location the coach set to "home visit"; the athlete books it via the existing flow (`s-book-sessions` → `s-booking` → confirm sheet) — no separate format pick. The athlete's address is captured **in the booking confirm sheet**: if the athlete has a saved home address it is **pre-filled** (with Change); if not, the sheet shows **"Select your address"** and the **Send/Confirm CTA is blocked** until one is chosen (picker cloned from `s-loc-map`). Address captured at booking, not stored coach-side.
- **Travel buffer enforcement:** calendar scheduling rejects sessions whose buffer overlaps with another session's slot.
- **Travel buffer display (decided 2026-06-24, prototyped):** **coach calendar only** — rendered as a Google-Calendar-style attached commute block (hatched/dashed tile, car icon, "Travel · N min") immediately **before and after** the home-visit event (`.cal-travel-buffer` in `coach/calendar.html`). Stateless, not draggable, not tappable. **Athlete side: invisible** — the buffer only filters which slots the booking grid offers (server already excludes slots that would overlap the buffer); the athlete sees no buffer UI at all. (Coach event-detail line "🚗 N min travel buffer" + directions = follow-up.)
- **Delete blocking:** location used in ≥ 1 active session template → 409 Conflict with template list. Client must reassign before retrying. *(Intended behavior — the delete-guard is **not yet enforced**; DELETE currently orphans dependent sessions. Filed as a backend issue.)*
- **Cross-type sessions:** one session = one location. No "online OR in-person" hybrid in MVP.
- **Default promotion on delete:** when the default location is deleted, the **oldest-by-creation** remaining location becomes default automatically. *(Intended behavior — **not yet enforced** on delete; filed as a backend issue.)*

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
- **Backend:** location-template referential integrity enforced via FK. Dependent-template count is **not emitted on the wire** (no `templateUsageCount` field) — the delete warning relies on the 409 `TEMPLATE_DEPENDENCY` payload once the delete-guard ships.
- **Voice:** not applicable — locations are managed visually only.

---

## 9b. Home visit — end-to-end (prototyped 2026-06-25)

Consolidated view of the full home-visit feature across roles. A home-visit training is a **normal personal session** whose location the coach set to "home visit" — there is no separate "format" the athlete picks.

**Coach setup**
- `coach/locations.html#s-loc-homevisit` — enable home visit + travel buffer (default 30 min; singleton config). Reached from the Availability hub / Locations.
- Session creation attaches `home_visit` as the session's location.

**Athlete booking** (`shared/profile.html`)
- `s-book-sessions` → home-visit session card shows location "Home visit · coach travels to you".
- `s-booking` (slot grid) → **booking confirm sheet** (`#book-hv`): location row shows the athlete's home-visit address — **pre-filled from a saved address**; if none saved → "Select your address" and **Send is blocked** until chosen.
- Address picker (clone of coach Locations flow): `s-hv-address` (search + saved + use current + pick on map) → `s-hv-addr-pick` (map pin, "Use this address") → `s-hv-addr-form` (address + **Name** input + note, "Save address").
- `s-my-addresses` — manage saved addresses (Settings → Training → My addresses); list + Add + empty + loading states. Multiple addresses supported.

**Coach → athlete invite** (`athlete/dashboard.html` Inbox → To reply)
- Home-visit invite card shows the location: default saved address + **Change** (chooser sheet); if none → "Select your address" + **Accept blocked**.

**Coach calendar** (`coach/calendar.html`)
- Home-visit event flanked by hatched **travel-buffer** tiles (before/after) — coach-side only; athlete never sees the buffer (it only filters bookable slots).
- Event-detail drawer: "Home visit" badge + "N min travel buffer · before & after" + athlete address + **Get directions** (maps).

**CRM** (`coach/clients.html`)
- New-client form: "Home address" field. Client detail: **Home visit addresses** list (multiple) + Add — coach can set a client's home locations for coach-created bookings (esp. CRM/cash clients without the app).

**Backend deltas (additive)**
- `training_event` gains the athlete's **home-visit address** (selected at booking; lat/lon + formatted address; NOT written to coach location records).
- New athlete **saved addresses** resource (`/athlete/addresses` — list/create/update/delete; label + note + geo; multiple).
- CRM client gains **multiple home addresses** (coach-set, per client).
- Availability slot computation must **exclude slots whose travel buffer overlaps** another session (before & after the home-visit event).

**Known gap (to build):** the athlete's own **event detail** (`athlete/calendar.html#ath-event-sheet`) does not yet surface "Home visit · your address" after booking — athlete sets it at booking but can't review/change it from the event. Tracked in Open questions.

## 10. Open questions

- **Athlete event-detail home-visit address (gap):** surface "Home visit · your address" + change-before-session in `ath-event-sheet`. Decide: read-only vs editable up to X hours before. **Owner:** product. (Prototype enhancement pending.)

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
- Prototype: [flows/coach/locations.html](https://321-fit.github.io/project-spec/prototypes/flows/coach/locations.html)
- Memory: `project_locations_decisions` (decisions source), `project_create_session_rules` (Location default rule)
- Components: `FitInput` (with chevron variant for picker rows), `FitIconBtn`, `FitSheet` (delete confirm), `FitButton`, `FitToggle` (default flag), `FitSelectionGroup` (single mode for online provider Zoom/Meet/Custom). All in `design-tokens/docs/components.md`.
- Native (per `feedback_native_pickers`): map place picker = `MapKit` + Google Places SDK (iOS) / Maps Compose + Google Places API (Android); current-location button uses OS geolocation prompt.
