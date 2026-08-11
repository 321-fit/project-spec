# Vacation Mode / Time Off

> Status: **Coach side shipped** (Android + backend) · athlete-facing half unbuilt — see § 0
> Prototype: [flows/coach/availability.html](https://321-fit.github.io/project-spec/prototypes/flows/coach/availability.html) → Time off · also `flows/coach/available-hours.html#timeoff`
> Component library: [design-tokens/docs/components.md](../../design-tokens/docs/components.md)
> Last updated: 2026-08-11 (reconciled with shipped Android + backend — [audits/2026-08-11-specs-vs-android.md](../audits/2026-08-11-specs-vs-android.md) § Cluster 2)
> Implementation:
> - iOS:     not built — this is an iOS gap, not a future feature
> - Backend: **shipped** — `/coach/time-off` (list · history · calendar · conflicts · update · cancel · end)
> - Android: **shipped** — hub card, list, setup with conflict step, history (PR #137)

---

## 0. Shipped reality (2026-08-11) — read this before the rest

The feature exists on the coach side and does **not** match the endpoint names or the single-record
model this spec was written against. Corrections, in order of how much they change:

1. **The module is `/coach/time-off`, not `/coach/vacation`.** Every path in § 6 below was renamed.
2. **Multiple time-offs are allowed** — any number, as long as they don't **overlap** (`409` if they
   do). "Single active vacation per coach" is wrong: the list is paginated and has a history twin.
   Cancelling and ending are **different endpoints**, because they mean different things to the
   record (`cancelled` vs `ended`).
3. **The deferred "auto-cancel existing bookings" question is shipped.** `create` takes
   `existingBookingsAction: "keep" | "cancel_and_notify"`, and the coach is asked in the setup flow —
   *"Bookings in these dates"* → **Keep them** (*existing sessions stay, only new bookings pause*) or
   **Cancel & notify** (*those athletes will be notified and refunded · this can't be undone*).
   Group sessions are cancelled through their own path, since a group event has no athlete of its own
   and used to survive the coach's holiday untouched.
4. **Reason chips shipped as message pre-fill** — 🏖 Vacation · 🤕 Injury · 🏆 Competition · Personal.
   They write a sentence into the 160-char client message; reason is still not a stored field.
5. **The athlete-facing half does not exist.** No DTO carries time off to an athlete: there is no
   `vacationStatus` on a coach, no "Paused until" badge, no info sheet. What actually happens:
   the coach's free slots come back **empty** for those dates, and a booking attempt is rejected with
   a **plain `400` whose message is the coach's own client message** — not the specced
   `409 COACH_ON_VACATION` with `returnDate`. A client cannot render "back on the 19th" from that.
   → the structured error + the profile badge are the open work here, and the spec below still
   describes the target.

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

### Shipped endpoints (corrected 2026-08-11)

| Method | Path | What |
|---|---|---|
| `POST` | `/coach/time-off` | create. Body `{ startDate, endDate, clientMessage?, existingBookingsAction }`. Returns the record **plus `conflictingBookings[]`** — the sessions that sit inside the window, so the coach sees what they just kept or cancelled |
| `GET` | `/coach/time-off?offset&limit` | current + scheduled, paginated |
| `GET` | `/coach/time-off/history?offset&limit` | ended / cancelled, most recent first |
| `GET` | `/coach/time-off/calendar?startDate&endDate` | the days a range is covered by time off — for painting the calendar |
| `GET` | `/coach/time-off/conflicts?startDate&endDate` | bookings inside a **candidate** window, before committing to it |
| `PUT` | `/coach/time-off/{id}` | edit dates / message |
| `POST` | `/coach/time-off/{id}/cancel` | drop a scheduled one — it never happened |
| `POST` | `/coach/time-off/{id}/end` | end an active one early — it happened, just shorter |

**Validation as implemented:** `endDate > startDate` · `startDate ≥ today` · message ≤ 160 chars ·
**overlap with an existing time-off → `409`**. There is no 90-day cap.

`cancel` and `end` are deliberately separate: the history screen shows an **outcome pill**, and
*Cancelled* and *Ended* are different answers to "what happened to this".

### Target shape, not shipped (kept for the athlete-side work)

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

- ~~**One active vacation per coach v1.**~~ **Corrected 2026-08-11:** any number of time-offs, as long
  as they don't **overlap** — the server answers `409` on an overlapping range. The list screen shows
  active first, then scheduled; past ones live behind the history link.
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
- [x] ~~**Multiple upcoming vacations**~~ — **shipped**: any number, non-overlapping.
- [ ] **Proactive notification to recent clients** when vacation starts: "Your coach is on vacation until …". Helpful or spammy? **Owner:** product.
- [x] ~~**Auto-cancel pre-existing bookings option**~~ — **shipped** as `existingBookingsAction`, asked
  in the setup flow (Keep them / Cancel & notify, with the refund warning). See § 0.
- [x] ~~**History log**~~ — **shipped**: `GET /coach/time-off/history` + a read-only history screen with
  an outcome pill (Ended / Cancelled).
- [ ] **The athlete never learns why** — no badge, no return date, and the booking rejection is an
  untyped `400` carrying the coach's message. Needs the structured error + profile badge. **Owner:** product/backend.
- [ ] **Athlete-facing copy variations:** "On vacation" vs "On time off" vs "Paused" — pick one consistently. Current draft uses mix. **Owner:** copy / brand.

---

## Related specs / references

- [coach-calendar.md](./coach-calendar.md) — existing bookings during vacation remain visible
- [profile-settings.md](./profile-settings.md) — Coach Profile v2 renders pause badge for athletes
- [calendar-sync.md](./calendar-sync.md) — orthogonal; sync continues during vacation
- Memory: `project_pending_spec_updates` item #9 (Vacation mode deferred to separate spec — this is that spec)
- No prototype yet — prototype pass schedules after spec approval
- Components: FitSettingsCard, FitButton, date pickers (native platform), FitBadge (for pause badge). See [design-tokens/docs/components.md](../../design-tokens/docs/components.md).
