# Session Creation (Coach)

> Status: Draft
> Prototype: [flows/coach/settings.html#s-create](https://321-fit.github.io/project-spec/prototypes/flows/coach/settings.html#s-create)
> Component library: [design-tokens/docs/components.md](../../design-tokens/docs/components.md)
> Last updated: 2026-04-27
> Implementation:
> - iOS:     [321fit_ios/docs/session-creation-ios.md] (to be created)
> - Backend: [poly-backend/docs/session-creation-backend.md] (to be created)
> - Voice:   not applicable
> - Android: [321fit_android/docs/session-creation-android.md] (when available)

**Scope note:** this spec covers the **session template form** (Create + Edit + Delete + List). Group-specific business logic (auto-generation, registration, athlete flows) lives in [group-training.md](./group-training.md). This spec describes the form that is **shared** by personal and group templates; group fields appear conditionally.

---

## 1. Overview

A "training session" in 321Fit is a **reusable template** (name, sport, location, duration, price, payment method, optional group config). Coaches create templates once and reuse them. Personal sessions = athletes book individual slots against the template; group sessions = coach schedules events from the template, athletes join.

Session creation is one of the most central coach actions. The form is reached from:
- **My Training Sessions** screen (`#s-edit`) → FAB "+" → `#s-create`
- **Calendar** FAB → "Create Group Event" / "Create Custom Event" → `#s-create` (with date prefilled)
- **Empty state** of My Training Sessions → "Create session" CTA
- **Onboarding wizard** → "Create your first session" step → `#s-create`
- **Edit mode** — tap pencil on existing template → `#s-create` prefilled with template data

The form's complexity comes from **conditional field visibility** (Personal vs Group, Recurring vs One-off) and from **edit-mode scope decisions** (impactful changes ripple to existing events).

---

## 2. User Stories

### Coach
- As a coach, I want to create a reusable session template so that I don't re-enter session details each time.
- As a coach, I want to choose Personal vs Group with one tap so that the form adapts without me hunting for fields.
- As a coach offering group training, I want to set max/min participants and a recurring schedule so that the system auto-generates events and lets athletes register.
- As a coach occasionally running a special event, I want a one-off mode so that I don't create a recurring chain by accident.
- As a coach, I want validation errors to point me to the exact missing field so that I can fix and save without losing input.
- As a coach editing an existing template, I want the system to ask me whether changes apply to future events only or to the whole chain so that I don't surprise registered athletes.
- As a coach deleting a template, I want to choose between keeping existing events or cancelling them with refund so that I'm in control of the impact.

### Athlete
- (Indirect — athletes interact with templates only via group-training booking flows; see [group-training.md](./group-training.md))

---

## 3. System Stories

- As the iOS / Android client, the form must update visibility (group fields, recurring fields, schedule section) **without losing already-entered data** when the user toggles Personal ↔ Group or Recurring ↔ One-off.
- As the iOS / Android client, the time picker must reflect the coach's actual availability — busy slots greyed out — pulled from the latest server snapshot at picker open.
- As the backend, on session-template create with `is_recurring: true` and `is_group: true`, immediately auto-generate events for the next 2 months (per [group-training.md](./group-training.md) recurring rules).
- As the backend, on impactful template edit (time / days / duration / location), require a `scope` parameter on the PATCH and notify affected participants per scope.
- As the backend, validation must mirror client-side rules — never trust the client to enforce required fields.

---

## 4. Flows

References to screen IDs are from `flows/coach/settings.html`.

### Flow 1: Create personal session
1. Coach: My Training Sessions (`#s-edit`) → tap FAB "+" → push `#s-create`
2. Form opens with defaults (see Section 7 Business rules table)
3. Type **Training name** (e.g. "1-on-1 Strength")
4. **Sport type** is prefilled — tap chevron to change → opens `#s-sport-picker` (see [sport-picker.md] when written)
5. **Location** is prefilled with default → tap to change → opens `#s-locations` in picker mode (see [location-picker.md](./location-picker.md))
6. Training type chip = **Personal** (default) — group/schedule fields hidden
7. **Duration** — tap → wheel-picker bottom sheet (HH:MM)
8. **Price** — number input (currency from coach profile)
9. **Payment method** chips: Cash (selected) / Card — multi-select
10. Save → validation → on success, return to `#s-edit` with new template card
11. On any required-field empty → red border + label, snackbar "Please fill in required fields", auto-clear errors after 3s

### Flow 2: Create group session — recurring
1. Same entry as Flow 1
2. Switch Training type to **Group** → group fields slide in:
   - Max participants (default 10)
   - Min participants (optional, default 3)
   - Schedule section appears
3. Schedule chip = **Recurring** (default) → Days picker (M-S circles, multi-select; current weekday selected)
4. **Start time** — tap → time picker (bottom sheet, see Flow 6)
5. Other fields as in Flow 1
6. Save → server creates template + auto-generates 2 months of events (per group-training.md)

### Flow 3: Create group session — one-off
1. Same as Flow 2 but switch Schedule to **One-off**
2. Days picker hides, **Date picker** appears (default = today)
3. Tap Date → calendar bottom sheet (see Flow 7)
4. Start time + other fields
5. Save → single `training_event` created, no recurring chain
6. Template gets "Special" badge (UI-derived from `is_recurring: false`)

### Flow 4: Edit session template
1. From `#s-edit` → tap pencil on a template card → push `#s-create` in **edit mode**, all fields prefilled
2. Coach modifies fields
3. Tap Save:
   - **Non-impactful changes only** (name / price / max-min / payment method) → save silently, no scope picker, no notifications
   - **Impactful change present** (duration / time / days / date / location) → push or sheet `#s-edit-scope-picker`:
     - Radio: **Future events only** (only not-yet-generated occurrences) / **All upcoming events (X events)** (all future already-generated events updated)
     - Warning: "Y participants across affected events will be notified"
     - Confirm → server applies + notifies
4. Past / completed events never affected

### Flow 5: Delete session template
1. From `#s-create` (edit mode) → tap trash icon (top right) → bottom sheet `#delete-session-sheet`
2. Title: "Delete <name>?"
3. Subtitle: "This will stop generating new sessions."
4. Body: "You currently have **X upcoming events** with **Y total registrations**." (counts hidden if zero)
5. Radio options:
   - **Keep existing events** (default) — template removed, auto-gen stops, events continue standalone
   - **Cancel all upcoming events** — template removed + all future events cancelled + participants notified & refunded (red text, danger warning block appears)
6. Tap Delete → server processes, return to `#s-edit`

### Flow 6: Time picker (bottom sheet)
1. Triggered from Start time field
2. Sheet shows accordion list of hours (08:00 → 22:00 or coach's available range)
3. Each hour row state:
   - **Available** — tappable, expands to minute chips on tap
   - **Busy** — greyed out + "Busy · <event name>" inline label
   - **Partial** — "X/4" badge on right (X of 4 fifteen-minute intervals available); tappable, expands to minute chips with disabled states
4. Tap hour → expands to inline minute chips (00, 15, 30, 45)
5. Disabled minutes greyed; available minutes tappable
6. Selecting a minute auto-confirms or shows Confirm button: "Confirm · HH:MM — HH:MM"
7. Sheet height fixed; content scrolls inside

### Flow 7: Date picker (one-off, bottom sheet)
1. Triggered from Date field (one-off mode only)
2. Calendar month grid
3. Past dates greyed out, today gets brand border, selected gets gradient circle
4. Confirm button shows "Confirm · Day, Month Date"
5. Sheet dismisses on confirm or backdrop tap

### Flow 8: Side-effect resets
- **Duration changes** after Start time selected → time auto-resets to "Select time" + snackbar "Time slot reset — duration changed" (pill, 2.5s)
- **Date changes** (one-off mode) after Start time selected → time auto-resets + snackbar "Time slot reset — date changed"

### Flow 9: My Training Sessions (`#s-edit`) list
1. Coach: Settings → "My Training Sessions" → `#s-edit`
2. List of all templates (personal + group), each card shows:
   - Name, sport, location
   - Group badge ("Group · max 10") or Personal badge
   - Price (group: "€25/person"; personal: "€50")
   - Recurring schedule preview ("Tue & Thu, 18:00") or "One-off · Apr 12"
   - Pencil icon → edit (Flow 4)
3. FAB "+" → Flow 1
4. Empty state: illustration + "Create your first training session — a reusable template with duration, price, and location." + primary "Create session" CTA → Flow 1

---

## 5. States

| State | When shown | What user sees | Transition |
|---|---|---|---|
| `cs-empty` | Coach has zero session templates | `#s-edit` empty state with CTA | → `cs-create-blank` after FAB tap |
| `cs-list` | Coach has ≥ 1 template | `#s-edit` list with cards + FAB | → `cs-create-blank` (FAB) or `cs-create-edit` (pencil) |
| `cs-create-blank` | New template, all defaults | `#s-create` with prefilled defaults | → validate-or-save |
| `cs-create-edit` | Editing existing template | `#s-create` prefilled with template data | → `cs-impactful-scope` if impactful changes, else → save |
| `cs-impactful-scope` | Save tapped on edit with impactful change | Bottom sheet with Future/All scope picker + warning | → `cs-list` after confirm |
| `cs-validation-error` | Save tapped with required fields empty | Red borders + snackbar, auto-clear in 3s | → back to form |
| `cs-time-picker-open` | Start time tapped | Bottom sheet with accordion hour list | → field set on confirm |
| `cs-date-picker-open` | Date tapped (one-off) | Bottom sheet with month calendar | → field set on confirm |
| `cs-delete-confirm` | Trash tapped on edit | Bottom sheet with Keep/Cancel-all radio + warning | → `cs-list` after action |

---

## 6. API

> **Backend mapping note.** Existing poly-backend endpoints `/api/v1.0.0/coach/training-sessions` already handle session templates (personal only). Phase 4 **extends** this resource with group-related fields (`isGroup`, `maxParticipants`, `minParticipants`, `recurringDays`, `recurringTime`, `isRecurring`, `oneOffDate`). New `scope` parameter on update operations governs how impactful changes ripple to existing events. No URL renames; iOS keeps using `coach/training-sessions`.

### Endpoints

#### `GET /coach/training-sessions`
Returns the coach's session templates (both personal and group).
**Auth:** JWT (coach role).
**Response 200:** array of `TrainingSession` (see Models).

#### `POST /coach/training-sessions`
Creates a new session template. If `isRecurring && isGroup`, server auto-generates events for the next 2 months (per group-training.md).

**Body:** `CreateTrainingSessionRequest` (extension of existing).
**Response 201:** created template.
**Response 422:** validation error with field-level details.

#### `GET /coach/training-sessions/{id}`
Returns a single template.

#### `PUT /coach/training-sessions/{id}`
Full replace. **Requires `scope` parameter when impactful fields change.**

#### `PATCH /coach/training-sessions/{id}`
Partial update. **Requires `scope` parameter when impactful fields change.**

**Body (extension of existing `PatchTrainingSessionRequest`):**
```json
{
  "fields": { "trainingName": "...", "isRecurring": true /* etc */ },
  "scope":  "this" | "following" | "all"
}
```

- `scope` defaults to `this` if omitted (used for non-impactful updates only)
- Server rejects with 422 if impactful fields present and `scope` missing or `this`
- `following` = update template + future not-yet-generated occurrences
- `all` = update template + all future already-generated events + notify affected participants

**Impactful field list** (server-authoritative): `duration`, `recurringTime`, `recurringDays`, `oneOffDate`, `address`.

**Response 200:** updated template + count of affected events + count of affected participants (so client can show in UI).

#### `DELETE /coach/training-sessions/{id}`
Deletes a session template.

**Body (Phase 4 extension):**
```json
{ "cancelExistingEvents": true }
```

- `false` (default) → template removed, future events continue standalone
- `true` → template removed + all upcoming events cancelled + participants notified & refunded

**Response 204:** deleted.
**Response 200:** with summary `{ "cancelledEventCount": N, "refundedParticipantCount": M }` when `cancelExistingEvents: true`.

### Models

#### `TrainingSession` (extended `TrainingSessionDetailResponse` from baseline)

Existing fields (preserved):

| Field | Type | Notes |
|---|---|---|
| `id` | integer | |
| `trainingName` | string | required |
| `sportTypes` | array of `SportTypeDetailResponse` | **multi-sport** per template (one template can serve multiple sports) |
| `duration` | string | ISO-8601 duration or HH:MM:SS |
| `price` | number? | nullable when `priceOnDemand: true` |
| `priceOnDemand` | bool | "Contact for price" mode |
| `paymentType` | string | `"cash"` or `"card"` — single value (multi-payment is V2) |
| `priceCurrency` | string | ISO-4217 |
| `address` | `Address` reference | sourced from [location-picker.md](./location-picker.md) |

**New fields (Phase 4 extension):**

| Field | Type | Notes |
|---|---|---|
| `isGroup` | bool | `false` (default) = personal; `true` = group |
| `maxParticipants` | int? | required when `isGroup: true`; range 2-50 |
| `minParticipants` | int? | optional, ≤ `maxParticipants` |
| `isRecurring` | bool | meaningful for `isGroup: true` |
| `recurringDays` | array of int? | 0=Mon, 6=Sun; required when `isGroup && isRecurring` |
| `recurringTime` | string? | "HH:MM" 24h; required when `isGroup && isRecurring` |
| `oneOffDate` | string? | ISO date; required when `isGroup && !isRecurring` |
| `createdAt` | string | ISO-8601 UTC |

---

## 7. Business rules

### Defaults (prefilled values)

| Field | Default | Source |
|---|---|---|
| Training name | empty | user types |
| Sport type | first sport | `profile.sports[0]` |
| Location | first location | default in-person from [location-picker.md](./location-picker.md) (`profile.addresses[0]`) |
| Training type | Personal | hardcoded |
| Max participants | 10 | hardcoded (group only) |
| Min participants | 3 | hardcoded (group only, optional) |
| Duration | empty | user picks via wheel |
| Price | empty | user types |
| Payment method | Cash selected | hardcoded |
| Schedule | Recurring | hardcoded (group only) |
| Days | current weekday | system |
| Date (one-off) | today | system |
| Start time | "Select time" | NOT prefilled |

### Field visibility
- **Personal** selected → hide max / min participants, schedule section, days/date, start time
- **Group** selected → show all group fields with slide animation
- **Recurring** selected → show Days picker, hide Date picker
- **One-off** selected → show Date picker, hide Days picker
- **Start time** always visible when Schedule section is shown

### Validation
- Save button always active (never disabled / greyed)
- On Save: validate required fields → first empty gets red border + red label + auto-scroll to top of field
- Snackbar (bottom, red dot): "Please fill in required fields"
- Errors auto-clear after 3 seconds
- Required fields: Training name, Duration, Price, Start time (if group)
- Prefilled fields (sport, location, payment) don't need validation
- Server re-validates on POST/PATCH; never trust client

### Side-effect resets
- Duration changed after time selected → reset Start time to "Select time" + snackbar "Time slot reset — duration changed" (2.5s pill)
- Date changed (one-off) after time selected → reset time + snackbar "Time slot reset — date changed"

### Edit mode — impactful vs non-impactful

| Change type | Impactful? | Notification? |
|---|---|---|
| Name | No | No |
| Price | No | No |
| Max / Min participants | No | No |
| Payment method | No | No |
| Duration | Yes | Yes — end time changes |
| Time | Yes | Yes — full reschedule |
| Days (recurring) | Yes | Yes — events added/removed |
| Date (one-off) | Yes | Yes — full reschedule |
| Location | Yes | Yes — different venue |

- Non-impactful: silent save, no scope picker
- Impactful: scope picker mandatory before save

### Time picker availability
- Hour rows reflect coach's actual availability (server-provided busy intervals)
- Available hours: tappable, expand to minute chips
- Busy hours: greyed + "Busy · <event name>" label
- Partial hours: "X/4" badge, tappable, disabled minutes greyed
- Server should return availability for the relevant date range when picker opens

### Delete behavior
- Default radio: "Keep existing events" (safest)
- "Cancel all upcoming events" → red text, danger warning block appears with refund count
- Past / completed events never affected

### Recurring template auto-generation
- Server-side only — see [group-training.md](./group-training.md) Section 5 for the 2-month rolling-window logic

### Currency
- Pulled from coach profile; not editable per session

---

## 8. Edge cases

- Coach toggles Personal → Group → Personal — group fields' values preserved in memory but not visible; on next Group toggle they reappear filled
- Coach changes Sport mid-form — does not invalidate other fields
- Coach changes Location to one that's deleted while form open — show inline validation error on save, prompt to pick again
- Coach edits price during a non-impactful save while server is processing a different impactful save — last write wins per field; no merge conflict
- Time picker opens for a date where coach has no availability data yet → server returns empty availability, client shows "All hours available" assumption
- Edit mode + impactful change but zero affected events (e.g. coach changed days but no events generated yet) → scope picker still appears for clarity, but warning shows "0 participants will be notified"
- Coach delete-cancels with active card holds → server releases all holds back to athlete balances atomically
- Network failure on Save → snackbar "Failed to save. Check connection and try again." — form data preserved
- Coach kills app mid-form — no draft persistence in MVP (form starts fresh on next open). Open question for V2.

---

## 9. Platform notes

**Native UI conventions:** see [architecture/design-system.md § Native theming contract](../architecture/design-system.md#native-theming-contract). Don't duplicate cross-platform UI rules here — only platform-specific deviations below.

- **iOS:** wheel pickers via SwiftUI `Picker(selection:)` with `.wheel` style; bottom sheets via `.sheet(isPresented:)` with `.medium` detent. Form scrolls; sheet doesn't dismiss form.
- **Android:** wheel pickers via the local `wheeltimepicker` Gradle module (already in project). Bottom sheets via `ModalBottomSheet` (Material 3).
- **Backend:** template create + auto-gen of recurring events should complete in ≤ 800 ms P95 (gen runs sync within the POST). Heavier auto-gen for long-running (e.g. 60 events) acceptable up to 2 s.
- **Voice:** not applicable — session creation is form-driven only.

---

## 10. Open questions

- [ ] **Payment method — single vs multi.** Backend baseline accepts a single `paymentType` string per template; the prototype shows multi-select chips ("Cash" + "Card" simultaneously). Either constrain UI to a single choice (radio, not chips) or extend backend to accept an array. **Owner:** product. Reco: keep UI multi (better coach UX), backend extend `paymentType: string` → `paymentTypes: array<string>` in Phase 4 — additive, backward compatible by accepting single strings.
- [ ] Draft persistence for unsaved form (kill app mid-create) — MVP says no, V2 candidate. **Owner:** product.
- [ ] Server-side availability data for time picker — should it include external calendar busy intervals? Currently only own-app events. **Owner:** product + [calendar-sync](./calendar-sync.md).
- [ ] Time picker expansion behavior — accordion (one open at a time) vs all expanded? Prototype uses accordion. **Confirmed.**
- [ ] Sport-change side effects — should it auto-reset Location to a sport-compatible one? Currently no. **Owner:** product. Reco: no, locations are coach-wide not sport-specific in MVP.

---

## Related specs / references

- [group-training.md](./group-training.md) — group-specific business logic (auto-gen, registration, athlete flows). Form fields listed there are now the responsibility of THIS spec; group-training references session-creation for the form.
- [location-picker.md](./location-picker.md) — Location field picker
- [sport-picker.md](./sport-picker.md) — Sport field picker (TO BE WRITTEN)
- [coach-calendar.md](./coach-calendar.md) — Calendar FAB entry point
- [onboarding-wizard.md](./onboarding-wizard.md) — "Create your first session" wizard step entry
- Prototype: [flows/coach/settings.html#s-create](https://321-fit.github.io/project-spec/prototypes/flows/coach/settings.html#s-create)
- Prototype: [flows/coach/settings.html#s-edit](https://321-fit.github.io/project-spec/prototypes/flows/coach/settings.html#s-edit)
- Memory: `project_create_session_rules` (defaults, validation, side-effects), `project_group_training_decisions` (group-specific behavior)
- Components: `FitInput` (with chevron variant for picker rows), `FitSelectionGroup` (single mode for Personal/Group + Recurring/One-off; multi mode for payment Cash/Card), `FitButton`, `FitToggle`. All in `design-tokens/docs/components.md`.
- Native pickers (per `feedback_native_pickers`): wheel duration picker = SwiftUI `Picker(.wheel)` / Android `wheeltimepicker` Gradle module; time picker bottom sheet = custom layout in SwiftUI `.sheet` / Compose `ModalBottomSheet`; date picker = SwiftUI `DatePicker` / Material 3 `DatePicker`.
- Inline implementation (single use, not extracted): M-S weekday circles for recurring schedule — 7 circular toggles in a Row, no design-tokens component. If reused later, extract as `FitDayPicker`.
