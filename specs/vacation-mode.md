# Vacation Mode / Time Off

> Status: Draft (v1 scope intentionally narrow) — prototyped 2026-06-23
> Prototype: [flows/coach/availability.html](https://321-fit.github.io/project-spec/prototypes/flows/coach/availability.html) → Time off · also `flows/coach/available-hours.html#timeoff`
> Component library: [design-tokens/docs/components.md](../../design-tokens/docs/components.md)
> Last updated: 2026-07-03
> Implementation:
> - iOS:     [321fit_ios/docs/vacation-mode-ios.md] (to be created)
> - Backend: [poly-backend/docs/vacation-mode-backend.md] (to be created)
> - Android: (future)

---

## Update — 2026-06-23 (prototyped)

**Entry point (changed):** Settings → **Availability** (single hub card) → **Time off**. (Earlier draft assumed Settings → Coaching → Time Off; the coach Availability hub is the home now — see [settings.md](./settings.md).) Time off is a peer card inside the Availability hub, no longer buried at the bottom of the weekly Available Hours screen.

**Manage screen — 3 states** (`s-time-off`):
- **None** — empty state (umbrella) + "Schedule time off" CTA → setup form.
- **Scheduled** — outline period card ("Scheduled · Aug 12–19") + message preview + **Edit dates & message** + **Cancel time off** (confirm sheet → None).
- **Active** — amber tinted card ("On time off · Paused until Aug 19 · Started Aug 12") + **End time off now** (confirm sheet → reopens bookings immediately → None) + **Edit end date**.

**Setup form** (`s-vacation-start`): Starts/Ends date fields (native pickers) + optional 160-char message to clients → confirm sheet → **Scheduled**. Scheduled auto-promotes to Active when the start date arrives (backend).

**Still to prototype:** coach Dashboard banner ("You're on time off until Aug 19 · End early") + athlete-side "Paused until" badge + disabled Book on the coach's public profile (`shared/profile.html` → `s-coach-v2`).

---

## Update — 2026-07-03 — Compact cards + history screen

Supersedes the 3-state single-list from the 2026-06-23 update.

- **Main screen (`s-time-off`) = current only.** **Active** (amber, shown first) + **Scheduled** cards, now **compact** (dates + status pill on one line, client message truncated to one line below; card height ~halved) + the dashed **Add time off**. Empty (None) unchanged.
- **History behind a link.** A canonical `.fit-section-title--md-row` "**Past time off — See all ›**" (same Recent→History pattern as balance) pushes to a **new read-only screen `s-time-off-history`**: ended/cancelled time-offs with an **outcome pill** (*Ended* = ran its course / *Cancelled* = ended early or removed), **not tappable** — nothing to edit on a past entry. a11y `coach.timeoff-history.*`. Backend: paginated `GET` past time-offs (status in ended/cancelled), most-recent first.
- **Reason icons on cards deferred** — "reason" isn't a stored field (the setup-form reason chips only pre-fill the message text).
- **Calendar cross-link.** The calendar's one-off blocker was renamed **Block time off → Busy time** (see [coach-calendar.md](./coach-calendar.md)); its form now carries an outline note *"Away for a few days? → Set Time off"* deep-linking to `available-hours.html#timeoff` — disambiguates an ad-hoc busy slot (Busy time) from a multi-day absence (Time off).

---

## 1. Overview

Allows a coach to **temporarily pause new booking requests** without manually toggling off all 7 days of their Available Hours every time they travel, take time off, or reduce load. A soft-block with clear athlete-facing messaging — not an account suspension, not a delete.

Reason this is a dedicated feature, not a toggle on Available Hours: the decision envelope is bigger than a single checkbox (existing bookings, athlete notification, discovery visibility, end-date handling). Baked half-way into Available Hours creates friction; separate module keeps semantics clean.

**Scope v1:** minimal viable pause with start/end, existing-bookings preservation, athlete-facing messaging. Rich scheduling (recurring vacation, multiple upcoming vacations) deferred to v2.

---

## 2. User Stories

### Coach

- As a **coach taking a 1-week trip**, I want to pause new booking requests without losing my existing schedule so that clients who already booked know the trip doesn't affect them but new ones can't pile up.
- As a **coach**, I want to set a return date so that pause auto-ends on the right day — no manual un-pause needed.
- As a **coach**, I want a clear UI indicator that I'm currently paused (on Dashboard + Profile) so that I don't forget I'm in pause mode and wonder why bookings aren't arriving.
- As a **coach returning from vacation**, I want the platform to resume normally on my return date so that I don't lose a day to manual reactivation.

### Athlete

- As an **athlete trying to book a paused coach**, I want a clear message explaining when they'll be back so that I'm not confused or frustrated by a silent failure.
- As an **athlete with an existing booking during the coach's pause window**, I want my session to stay on the calendar so that I trust the coach will honor it.

---

## 3. System Stories

- As the backend, a coach's `vacationMode` is a time-bounded record (`startAt`, `endAt`, optional custom message). Single active vacation per coach in v1.
- As the backend, during a coach's active vacation window, new booking attempts via API must return a specific error (`COACH_ON_VACATION`) with return-date metadata.
- As the backend, the coach's existing bookings (Planned state events scheduled within the vacation window) are **NOT auto-cancelled**. They remain on the calendar, coach is expected to honor them.
- As the backend, the coach's Calendar Sync availability layer continues to feed normally — vacation mode affects only new-booking eligibility.
- As the athlete discovery service, paused coaches are **still visible** in search but their profile card and booking CTAs reflect pause state. They are not hidden from discovery (otherwise they lose ranking and take weeks to recover).
- As the client, starting or ending a vacation must not require a page refresh — state updates propagate via snapshot refetch.

---

## 4. Flows

### Flow 1: Start vacation

1. Coach: Settings → Coaching → **Time Off** (new entry point) → tap "Start time off"
2. Screen: `s-vacation-start`
   - Start date picker (default: tomorrow)
   - End date picker (default: start + 7 days)
   - Optional "Message to clients" text field (160 char limit, placeholder: "On vacation until …")
3. Tap **Start** CTA → confirm sheet ("From MM/DD to MM/DD, no new bookings will be accepted. Existing sessions will remain. Continue?") with `Start` (primary) + `Cancel` (minimal destructive)
4. On confirm → `POST /coach/vacation` → state transitions
5. Settings row "Time Off" now shows state indicator "Paused until MM/DD" with subtle yellow-tinted chip; CTA becomes "Edit" or "End early"
6. Dashboard top gets persistent banner "You're on time off until MM/DD · End early" (until coach ends or date passes)
7. Coach Profile v2 card (athlete-facing render): "Paused until MM/DD" badge replaces booking CTA

### Flow 2: End vacation early

1. Coach: tap "End early" on Dashboard banner or Settings → Time Off
2. Confirm sheet: "End vacation now? Athletes will see you as available for new bookings immediately."
3. Confirm → `DELETE /coach/vacation` → state reverts
4. Dashboard banner gone; Profile CTA back; booking requests re-enabled

### Flow 3: Vacation ends naturally

1. Cron job checks vacations daily at 00:00 (coach's local TZ)
2. If `now > endAt`, auto-delete vacation record; coach status returns to active
3. No notification to coach (soft transition); athletes can book again
4. Optional: push notification "Welcome back — new bookings open again"

### Flow 4: Athlete tries to book during pause

1. Athlete on coach profile (Coach Profile v2) → sees "Paused until MM/DD" badge + disabled booking CTA
2. Tapping disabled CTA → toast / snackbar: "This coach is on time off until MM/DD"
3. Tapping the pause badge → opens a brief info sheet with the coach's optional message (if provided), and return date
4. No new booking API call fires — UI gates at client level; server returns error if bypassed

### Flow 5: Existing athletes during pause

1. Athlete with a pre-existing `Planned` session dated within the pause window
2. Calendar still shows the event normally — no pause indicator on individual events
3. Coach expected to honor; if coach needs to cancel, they use normal cancel flow per [coach-calendar.md](./coach-calendar.md)
4. Push notifications for upcoming sessions fire normally

---

## 5. States

Single vacation record per coach, with lifecycle states:

| State | When | Coach sees | Athletes see |
|---|---|---|---|
| `absent` | No active vacation | Settings: "Start time off" row | Normal profile, book CTA enabled |
| `scheduled` | Vacation set with `startAt` in future | Settings: "Starts MM/DD" indicator; Dashboard: "Time off starts MM/DD" banner (soft, non-intrusive) | Normal profile (vacation not yet in effect) |
| `active` | `now` between `startAt` and `endAt` | Dashboard: "You're on time off until MM/DD · End early" banner; Settings: "Paused" chip | "Paused until MM/DD" badge, booking CTA disabled |
| `ending_today` | `now` ≥ `endAt` (natural end) | Transient — server cleans up in next cron tick | Transient |

Transitions:
- `absent → scheduled` via `POST /coach/vacation` (if `startAt > now`)
- `absent → active` via `POST /coach/vacation` (if `startAt ≤ now` — i.e., coach starts it today)
- `scheduled → active` automatic at `startAt`
- `active / scheduled → absent` via `DELETE /coach/vacation` (end early)
- `active → absent` automatic at `endAt` (cron)

---

## 6. API

### Endpoints

#### `GET /coach/vacation`

Returns the coach's current vacation record or null.

**Response 200 — `VacationRecord | null`:**

```json
{
  "startAt":  ISO8601,
  "endAt":    ISO8601,
  "message":  "On family vacation until May 1" | null,
  "state":    "scheduled" | "active",
  "createdAt":ISO8601
}
```

#### `POST /coach/vacation`

Creates (or replaces) a vacation record. Single active per coach.

**Body:**
```json
{
  "startAt": ISO8601,
  "endAt":   ISO8601,
  "message": "string, 0-160 chars" | null
}
```

**Validation:**
- `endAt > startAt` (min 1 day)
- `endAt - startAt ≤ 90 days` (v1 cap; revisit if anyone needs longer)
- `startAt ≥ today` (can start today but not yesterday)
- `message.length ≤ 160`

**Response 200:** created/updated `VacationRecord`.
**Response 400:** validation errors.
**Response 409:** existing vacation that overlaps — client must cancel existing first (client guards this; shouldn't happen in UI).

#### `DELETE /coach/vacation`

Ends vacation now (whether scheduled or active).

**Response 204:** no content.

### Athlete-facing changes

#### `GET /coach/{id}` (existing)

Response includes new field:
```json
{
  ...,
  "vacationStatus": {
    "isOnVacation": true,
    "returnDate":   ISO8601,
    "message":      "string" | null
  } | null
}
```

`vacationStatus` is null unless `active`. `scheduled` vacations are NOT visible to athletes (keep UX clean — no pre-announcement).

#### `POST /coach/{id}/booking-request` (existing)

During coach's `active` vacation, returns:

**Response 409 — `COACH_ON_VACATION`:**
```json
{
  "error":      "COACH_ON_VACATION",
  "returnDate": ISO8601,
  "message":    "string" | null
}
```

Client uses this to render the pause message + disable CTA.

### Background

- Daily cron at 00:00 coach-local TZ: closes expired vacations (sets state ended; deletes record).

---

## 7. Business rules

- **One active vacation per coach v1.** Scheduling a second while one is active → error (client guards).
- **Cannot end a vacation in the past.** Editing existing vacation dates is allowed as long as `newEndAt ≥ now` (can't retroactively erase a vacation that's already happened).
- **Existing bookings preserved.** Vacation does NOT auto-cancel `Planned` events in its window. Coach handles manually if they can't honor.
- **Not shown to athletes beforehand.** A `scheduled` vacation is invisible to athletes until it activates. Prevents anchoring / pre-announcement pressure.
- **Custom message optional.** Default athlete-facing copy: "This coach is on time off until {date}". If coach provides a message, it replaces the default.
- **Discovery: stays visible.** Paused coaches aren't hidden. Only their book CTA is disabled + pause indicator shown.
- **Can stack with `Archived` / `Blocked` client relationships:** orthogonal. Vacation doesn't affect coach-client relationship state.
- **No effect on Calendar Sync:** external calendar sync still pulls/pushes events normally during vacation.
- **Payment: no effect.** Coach doesn't pay less during vacation (subscription continues; see [business-model](../architecture/) when doc exists). Vacation is not a "hold my account" feature.

---

## 8. Edge cases

- **Vacation spans a month-end / month-start:** date picker must handle; no special logic.
- **Coach's local TZ changes during vacation (travelled):** vacation `endAt` stored in UTC; interpreted in whatever TZ is current. Acceptable v1 — if coach changes TZ mid-vacation, return date may shift by 1 day. Worth documenting.
- **Athlete attempts booking 1 sec after vacation ends (clock skew):** server resolves; if expired, booking allowed. If still active, 409. Typical eventual consistency.
- **Coach deletes account while on vacation:** deletion flow cancels vacation record + notifies any pending booking requests.
- **Admin force-ends vacation:** out of scope; admin tool direct DB ops handle this edge case.
- **Coach forgets to end vacation and loses days of availability:** cron auto-ends on `endAt`. If they set `endAt` too far in the future and forget → visible warning via dashboard banner + Settings notification. Coach responsibility.
- **Two devices edit vacation concurrently:** last write wins. Both converge on snapshot refetch.

---

## 9. Platform notes

**Native UI conventions:** see [architecture/design-system.md § Native theming contract](../architecture/design-system.md#native-theming-contract). Don't duplicate cross-platform UI rules here — only platform-specific deviations below.

- **iOS:** Settings row shows pause state via FitSettingsCard with teal-tint subtitle. Dashboard banner uses custom info banner component (yellow-tinted per memory `feedback_note_block`). Date pickers — native SwiftUI `DatePicker`.
- **Android:** Compose `Card` with subtitle in teal. Material 3 `DatePicker` for date selection.
- **Backend:** cron job via Celery beat, checks every coach with active vacation at 00:00 their local TZ. Requires per-coach TZ schedule (stagger), not a single global midnight.
- **Voice:** `get_availability()` tool includes vacation status. "Are you available next week?" → "I'm on time off until May 1st; new bookings open after that."

---

## 10. Open questions

- [ ] **Placement decision: on Available Hours screen vs. separate Settings row?** Current draft: **separate row** under Coaching section. Cleaner semantics (vacation = time-off, available hours = recurring pattern). **Owner:** design.
- [ ] **Recurring vacations** (e.g., "every Christmas week"): deferred to v2. **Owner:** product.
- [ ] **Multiple upcoming vacations** (schedule two at once): deferred. 1 active max v1. **Owner:** product.
- [ ] **Proactive notification to recent clients** when vacation starts: "Your coach is on vacation until …". Helpful or spammy? **Owner:** product.
- [ ] **Auto-cancel pre-existing bookings option:** some coaches may want to wipe schedule. Toggle "Cancel all existing bookings in this window"? Deferred to v2. **Owner:** product.
- [ ] **History log:** "Coach vacation 2026-04-10 to 2026-04-17" visible in Settings? Useful for pattern analysis. Low priority. **Owner:** data.
- [ ] **Athlete-facing copy variations:** "On vacation" vs "On time off" vs "Paused" — pick one consistently. Current draft uses mix. **Owner:** copy / brand.

---

## Related specs / references

- [coach-calendar.md](./coach-calendar.md) — existing bookings during vacation remain visible
- [profile-settings.md](./profile-settings.md) — Coach Profile v2 renders pause badge for athletes
- [calendar-sync.md](./calendar-sync.md) — orthogonal; sync continues during vacation
- Memory: `project_pending_spec_updates` item #9 (Vacation mode deferred to separate spec — this is that spec)
- No prototype yet — prototype pass schedules after spec approval
- Components: FitSettingsCard, FitButton, date pickers (native platform), FitBadge (for pause badge). See [design-tokens/docs/components.md](../../design-tokens/docs/components.md).
