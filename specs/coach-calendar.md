# Coach Calendar

> Status: Approved (contract) / In Progress (event sheet + custom event migration)
> Prototype: [flows/coach/calendar.html](https://321-fit.github.io/project-spec/prototypes/flows/coach/calendar.html)
> Component library: [design-tokens/docs/components.md](../../design-tokens/docs/components.md)
> Last updated: 2026-07-03
> Implementation:
> - iOS:     [321fit_ios/docs/coach-calendar-ios.md] (to be created)
> - Backend: [poly-backend/docs/coach-calendar-backend.md] (to be created)
> - Voice:   [voice_control/docs/coach-calendar-voice.md] (to be created)
> - Android: (future)

---

## 1. Overview

Primary scheduling interface for coaches. A 24-hour vertical timeline per day with a horizontal date navigator at the top. Displays all events a coach has — training sessions (personal + group), custom time blocks, external calendar events (Google / Apple) — and provides create/edit/reschedule/cancel workflows via a **unified event sheet** driven by `data-event-state`.

Root tab screen, has the nav bar footer. Acts as both agenda view (for the coach) and scheduling instrument (for booking flows, availability checks).

---

## 2. User Stories

### Coach

- As a coach, I want to see my whole day at a glance so that I can plan my time around booked sessions.
- As a coach, I want to switch days via a horizontal day-chip strip so that navigation is quick.
- As a coach, I want to distinguish between different event types and statuses visually so that I don't mix up a planned session with an incoming request.
- As a coach, I want to tap an event and see its full detail + actions in a bottom sheet so that I don't leave the calendar context.
- As a coach, I want to create a new session or a custom time-block directly from the calendar so that adding events doesn't require deep navigation.
- As a coach, I want to drag an event to a new slot on the same day so that rescheduling is physical and intuitive.
- As a coach, I want to see when I have conflicts or unavailable windows so that I can't overbook myself.
- As a coach, I want to log a past session (cash payment already collected) so that my records stay accurate.
- As a coach who is also an athlete, I want to see the slots where I'm a booked-as-athlete client on another coach's roster so that I don't accept coaching jobs that would conflict — and I want to switch into my athlete profile from there in one tap to act on those bookings (per [[event-statuses.md § Cross-role]]).
- As a coach, I want each event card to show enough at-a-glance (title, who, when, where) without opening the drawer, so I can scan my day in seconds.

---

## 3. System Stories

- As the backend, the calendar data API must return a day's worth of events in ≤ 500 ms.
- As the backend, the day events endpoint must include the user's events from BOTH roles (when the user has both) so the client can render cross-role tiles without a second roundtrip — each event carries a `role_context` field (`own_role` / `other_role`).
- As the backend, event status transitions (planned → review, request → cancelled auto) are handled via scheduled tasks; the calendar always reflects the latest state.
- As the client, the event sheet is a **single shared component** (`FitUI.openEventSheet`) — one markup, one state machine, six visual variants via `data-event-state`, plus a separate cross-role variant (read-only + role-switch CTA).
- As the client, every event tile uses the unified `FitCalEvent` from design-tokens: 3-tier adaptive layout (Tiny ≤30pt · Compact ≤45pt · Standard ≥46pt) — caller passes `height` and the component derives the tier. See § 4a "Event tile layout".
- As the client, conflict detection on drag must be computed from the visible day's events + external calendar + cross-role events + athlete availability (if applicable). Cross-role tiles cannot be dragged.
- As any service, the calendar must not display `cancelled` events (filtered server-side or client-side).

---

## 4. Flows

### Flow 1: View a day

1. Coach opens Calendar (nav bar tab or app launch) → `#s-calendar` renders.
2. Header: month + year + Today button + Sync button.
3. Day strip below header: 7-day horizontal strip centered on today, shows dots for days with events (personal, group, external colors).
4. Timeline below: 24h vertical grid, current hour indicated by horizontal "now" line + dot.
5. Events positioned absolutely: `top = startMinute * 96px/60min`, `height = durationMin * 96px/60min`.
6. Scroll auto-centers near the current time on first load.

### Flow 2: Open event detail

1. Coach taps an event block on the timeline.
2. `FitUI.openEventSheet(state: '<current>', event: {...})` → sheet slides up.
3. Sheet content:
   - Status header (descriptor + optional pill + **action slot**: message icon → chat with the athlete, and the `⋯` action hub → Edit details). Both are available in every state, which is exactly why they live in the header instead of the footer (revised 2026-07-28 — the message icon used to sit in the `planned` footer).
   - Avatar + athlete name (tap → opens their client detail via push)
   - Event info (title 18pt, time 14pt, location with location icon, price + payment badge)
   - State-aware footer — the state's response only:
     - `planned`: Reschedule (secondary) + Cancel (destructive)
     - `request`: Decline (destructive) + Accept (primary)
     - `awaiting`: Cancel request (destructive-low)
     - `review`: Complete training (primary)
     - `missed`: Reschedule (secondary)
     - `finished`: View history (secondary)
4. Footer buttons dispatch: `complete`, `cancel`, `accept`, `decline`, `cancel-request`, `reschedule`, `message`, `view-history`.
5. Tap outside or swipe down → sheet dismisses.
6. Tapping Reschedule → sheet closes, Reschedule flow starts.
7. Tapping Cancel → confirmation sheet (destructive).

### Flow 3: Create new event (2026-05-20 rework / 2026-05-21 update — intent-based FAB + Personal/Group toggle)

1. Long-press on empty timeline slot OR tap FAB (`+`) → action sheet with **2 intent-based options**:
   - **Schedule training** — primary action: creates a session event (Personal or one-off Group).
   - **Busy time** (renamed 2026-07-03 from "Block time off" — visible label only; internal screen id `s-block-time-off` + `coach.calendar.block.*` a11y unchanged) — secondary action: an ad-hoc calendar blocker (dentist, errand, gym closed). Disambiguated from Availability → **Time off** (multi-day absence): Busy time = one slot; Time off = a date range that pauses bookings + messages clients.
2. **Schedule training** → `s-schedule-event` form with a **Training type toggle (Personal / Group)** at the top. Conditional rows + CTA copy adapt per type:
   - **Personal:** athlete picker visible → template picker (personal templates only) → datetime → payment chips → optional "Note to athlete". CTA "Send invitation". On save: POST `/coach/events` with status `awaiting`; athlete gets push to accept.
   - **Group (one-off):** athlete picker hidden — there's no specific athlete; athletes find the event on the marketplace and join independently. Template picker filters to group templates. Datetime + payment + optional "Note to athletes". CTA "Create group event". On save: POST `/coach/events` with type=group, status=planned.
3. **Busy time** → `s-block-time-off` form (see Flow 5).
4. **Recurring group events are still auto-generated** from session templates per [session-creation.md](./session-creation.md) — unchanged. The Group toggle on Schedule training is only for one-off events (special masterclasses, holiday sessions). Recurring chains continue to be managed from Sessions module.

**Schedule training sub-flows:**
- **Pick athlete** (`s-schedule-pick-athlete`) — search-first list of recent clients + "Invite by phone" CTA (Appsflyer OneLink SMS for non-321Fit recipients per [deep-linking-referrals.md](./deep-linking-referrals.md)). Only reachable in Personal mode.
- **Pick template** (`s-schedule-pick-template`) — list of coach's session templates filtered by parent's Training type toggle (Personal vs Group). "+ Create new template" inline CTA routes to `sessions.html#s-create` with matching type preselected.

### Flow 4: Reschedule via drag & drop (same day)

1. Coach long-presses a `planned` event → event lifts slightly (haptic feedback on iOS).
2. Drag → event follows pointer, visual indicators:
   - Unavailable zones (existing events, external events, out-of-work-hours) shown with red tint
   - Drop indicator snaps to 15-minute grid
3. Drop on valid slot → confirm sheet "Reschedule to {new time}?" → on confirm, create new event at new time with `awaiting`/`request` state; old event → `cancelled`.
4. Drop on invalid (conflict) → snackbar "Slot conflicts with another event"; event snaps back.
5. Cross-day drag not supported in v1.

### Flow 5: Busy time (custom event — 2026-05-20 prototype landed; renamed from "Block time off" 2026-07-03)

1. From FAB action sheet → **"Busy time"** option.
2. Screen `s-block-time-off` (id kept):
   - Title input (**optional**, 1–60 chars, placeholder "Dentist", "Errand", "Gym closed"). Inline hint: "Leave empty and we'll call it **My time**."
   - **Cross-link to Time off:** an outline note *"Away for a few days? → Set Time off"* (a11y `coach.calendar.block.timeoff-link`) deep-links to `available-hours.html#timeoff` — routes coaches who actually want a multi-day absence to the right tool. Shown always; the all-day case is the classic "I really mean vacation" signal. See [vacation-mode.md](./vacation-mode.md).
   - **All-day toggle** — when on, hides start/end time row and the event blocks the whole day
   - Date — single date picker sheet (full month calendar grid, multi-day deferred)
   - Start time + end time — two canonical `.fit-wheel-picker` sheets (Hour + Minutes columns, 15-min snap matching the broader 15-min grid used across calendar / sessions / availability)
   - Notes (optional, 0–300 chars) — only visible to coach
3. **Default title rule:** if title field is empty at save, server (and client preview) substitute `"My time"`. This keeps the timeline tile readable and avoids "Untitled" / blank-name awkwardness. Renders as a regular title on the tile + drawer header.
4. Save → POST `/coach/events` with `type: "custom"`, no `athlete_profile_id`, no `training_session_id`, defaulted title if empty. **Backend dependency:** endpoint + default-title rule to be added; `TrainingEvent` schema already supports nullable fields.
5. Rendering on timeline: `FitCalEvent` with `type: .custom` variant — solid `text-tertiary` left stripe, `surface-high` background, **no opacity dimming**, **no status pill** (custom events are stateless — don't go through the 6-state lifecycle, see [event-statuses.md](./event-statuses.md)), **no role tag**.
6. Drawer (`cal-custom-sheet`) on tap: descriptor (title) + time row + info banner explaining athlete-side visibility + **Edit** (secondary) + **Delete** (destructive) actions.
7. Blocks availability: athlete booking calendars show this slot as **"Coach unavailable"** — title + notes are NEVER exposed to athletes.
8. Drag & drop within same day supported (custom events behave like regular own-role events for layout purposes).
9. Delete: from drawer → Delete confirmation sheet (destructive high).

**Edit a custom event (2026-05-21 added):**
- From `cal-custom-sheet` → tap **Edit** → push `s-block-time-off` with all fields pre-filled (title, all-day flag, date, start/end time, notes).
- Footer CTA changes from "Save block" to "Save changes".
- On save → `PATCH /coach/events/{id}` with whatever changed. Title can be re-blanked → server re-applies the "My time" default rule.
- Delete from drawer → `DELETE /coach/events/{id}` → destructive confirmation sheet → silent remove (no athlete to notify; custom events are coach-private).

### Flow 6: Create a past event (log cash session) — Tier 1 Q9

1. Coach navigates to a past date via day strip or date picker. **Backdate window: 60 days** (= 2 months, consistent with calendar look-back). Date picker `min = today - 60d`. Older dates are not selectable (snackbar: "Can't log sessions older than 60 days").
2. Tap empty slot or FAB → "Personal session" option.
3. Fill event details; system skips availability check for past dates. **`paymentType` is forced to `cash`** — card events cannot be backdated (Stripe can't retro-charge); this is enforced at backend (`POST /coach/events` validation).
4. Submit → event created with status `finished` directly (no approval flow, already happened) and `backdated: true` flag.
5. Coach earnings ledger entry: `cash_collected` with `backdated: true` (auditable, but does NOT trigger payout flow — physical cash is assumed already in coach's hand).
6. **Athlete-facing behavior:** silent. No push notification. If athlete is linked, the event appears in their training history with a small `Logged retroactively · {date}` badge.
7. **Stats / maturity:** backdate events do NOT count toward the `sessions_completed_count` used for new→established maturity threshold. They go into a separate `sessions_logged_count` counter for the coach's personal tracking. See [coach-maturity-model.md](./coach-maturity-model.md).
8. **Reviews:** athletes do not receive a prompt to review backdate events (no live session experience to evaluate).

### Flow 7: Cancel a planned event

1. Open event sheet (state `planned`) → Cancel button (destructive tinted).
2. Confirmation sheet with warning: "Cancel the session with {athlete} on {date}? They will be notified."
3. Confirm → event status `cancelled`; event hides from calendar; push to athlete.
4. If within 24h of session start → extra warning about coach's cancellation policy (TBD per [payments.md](./payments.md)).

### Flow 8: Event sheet state variants — summary

All 6 variants share the same DOM structure (avatar row + info + footer). Only the descriptor text + optional pill + footer buttons differ per `data-event-state`. See [event-statuses.md](./event-statuses.md) for the state enum. The unified sheet rules out the old parallel `cal-event-sheet` / `cal-invite-sheet` / `cal-group-sheet` divergence.

### Flow 10: Deep link from push notification (2026-05-21 added)

1. Coach gets push, e.g. "Athlete sent request for Tennis training".
2. Tap push → app opens via deep link `321fit://coach/calendar?event_id=<id>`.
3. App navigates to Calendar tab, scrolls timeline to the event's day + scrolls vertically to the event's time, then auto-opens the event drawer (`cal-event-sheet` for personal / `cal-group-sheet` for group / `cal-cross-role-sheet` if the event is in the OTHER role).
4. If the event is in a not-currently-visible role profile (cross-role), the drawer is the cross-role variant; user can tap "Switch to {role}" to go full action context.
5. Edge cases:
   - Event was cancelled / deleted between push send and tap → toast "This session is no longer scheduled" and stay on Calendar at the relevant day.
   - User on Athlete role but push references a Coach event (or vice versa) → cross-role drawer; never auto-switches role silently.

### Flow 11: Resolve overlap with external calendar event (2026-05-21 added)

When a coach connects Google/Apple Calendar AFTER they already have 321Fit bookings, an external event may collide with a planned 321Fit session. We can't prevent this at create time (external event predates our awareness), so we surface it visually.

1. Day events endpoint returns both 321Fit events + external events for the day. Client computes overlap by interval intersection (matches iOS `ScheduleManager.overlapped: [Int: Set<Int>]`).
2. Each tile in an overlap gets the `.overlapped` modifier (canonical lib class, also `.overlapped` on `FitCalEvent` component): red-tinted gradient overlay (#705959 → #BB7F7F, matches iOS `Theme.Gradient.overlappedEvent`) + corner-dot marker.
3. Tap on either overlapped tile → `cal-overlap-sheet` opens:
   - Status header "Time conflict" + Overlap badge.
   - Both events listed (ours + theirs) with times.
   - Info banner: "External events can't be edited here. Reschedule your training in 321Fit, or open Google Calendar to move the other event."
   - Footer actions: primary "Reschedule {our event}" (opens existing reschedule sheet), secondary "Open in Google Calendar" (deep-link to native app).
4. No automatic resolution. Two consenting changes are needed: either we reschedule our event or coach moves the external event in Google. The drawer surfaces both options; we don't pick.

### Flow 9: Tap a cross-role event → switch role

1. Coach taps a tile rendered with the cross-role visual (muted, dashed left stripe, "Athlete" tag in the bottom-right corner — this is a session the user booked **as athlete** with another coach).
2. `cal-cross-role-sheet` opens — read-only drawer: descriptor "Booked as athlete" + Athlete badge, counterparty avatar+name ("Mark S. — Your coach"), event info (date / time / location / price), info banner explaining the current role can't act here.
3. Footer = `[Close]` + `[Switch to athlete →]` (primary).
4. Tap **Switch to athlete** → app flips active role, navigates to the same event in the **athlete** schedule with the full athlete event sheet open (cancel / message / pay actions available).
5. Cancelling on the cross-role sheet just dismisses it (returns to coach calendar untouched).

### Flow 12: Edit event details (instance-level) — 2026-07-13

An event created from a Training Session is its **own entity**: it inherits the template's fields, then each is editable **on the instance** without touching the template (matches current backend). From the event drawer `⋯` menu → **Edit details** → `s-event-edit`.

**Light field set (decided 2026-07-13):** Location · Duration · Price · Note to athlete. The fuller "everything inherited" variant (name / sport / payment) was **dropped** — those rarely change per occurrence and belong to the template, not one instance. To change them for all future events, edit the template via My Sessions → Edit training session (`sessions.html#s-edit`).

**Re-confirm rule:** changing any **dry field** (location / duration / price) on a **confirmed** event resets its status → the athlete must **re-confirm**. **Note changes are free** (no re-confirm). Surfaced as a persistent note on the edit screen ("Changing location, duration or price sends this session back to {athlete} for re-confirmation. Note changes don't.") + `event-reconfirm-sheet` on Save ("Send for re-confirmation? … keeps their spot while pending" → Keep editing / Save & notify).

**Not template edit:** this edits one occurrence only. Template editing (applies to future / all events, with its own Future/All scope sheet) lives in `sessions.html#s-edit` — don't conflate.

**Open before dev-ready:** re-confirm should fire only when a dry field actually changed AND the event is confirmed (request / pending or note-only → no re-confirm); recurring scope on Save (This / This+following / All), layered like Reschedule; group edit must gate participant-affecting changes (refunds), like group reschedule.

---

## 4a. Event tile layout (unified)

All event tiles on the timeline use the same `FitCalEvent` component from design-tokens. Layout is adaptive — the same input shape renders three different densities driven by tile height. Caller passes only `height` (in pt); the component picks the tier:

| Tier | Height | Rendered content |
|---|---|---|
| **Tiny** | ≤ 30 pt (15-min event) | 1 row: `{title} · {start-time}` inline |
| **Compact** | 31–45 pt (30-min event) | 2 rows: `{title}` / `{recipient} · {time}` |
| **Standard** | ≥ 46 pt (45-min+ event) | 3 rows: `{title}` / `{recipient} · {time}` / `📍 {location}` |

`{recipient}` is the meta line's "who" slot, deliberately unified across all variants so the meta-row position is identical:

| Variant | `recipient` |
|---|---|
| Personal (own role) | Athlete name, e.g. `"Anna K."` |
| Group (own role) | Participant ratio, e.g. `"7/10 athletes"` |
| External (Google/Apple) | (no recipient, anonymized — meta = title + time only) |
| Cross-role | Counterparty in the OTHER role, e.g. `"with Coach Mark S."` or `"7/10 athletes"` for a coach session shown on the user's athlete calendar |

**Status pill** (Request / Awaiting / Review / Missed) appears inline next to title on the FIRST row when the status applies. Cross-role tiles do **NOT** show the status pill — actions belong to the other role.

**Bottom-right corner**: only the **Cross-role role-tag** uses this slot (Athlete / Coach badge). Group ratio that used to live there has moved into the recipient slot for layout consistency.

**3pt hairline gap.** Every tile reserves a 3pt transparent strip at the bottom so back-to-back events don't visually merge (Apple Calendar style). Implemented in `FitCalEvent` via the outer-inner pattern (outer keeps inline height, visible card sits inside with `.padding(.bottom, 3)`) — no layout reflow, full rounded corners, full perimeter border on status tiles.

---

## 4b. Cross-role presentation

When the active user has BOTH roles (coach + athlete), events from the OTHER role appear on the current role's calendar in a muted **cross-role** presentation. This is orthogonal to the 6-state status system — a cross-role tile renders the same regardless of its underlying status, because the current role cannot act on it from here anyway.

**Tile visual** (`FitCalEventType.crossRole(role)`):
- Background: surface-high (same as Personal Planned), opacity 0.75
- Left stripe: **3pt dashed**, text-tertiary color (distinguishes from solid stripes of own-role events and from External)
- Title row: only the session/sport title — no status pill
- Meta row: `{recipient} · {time}` (recipient = counterparty)
- Bottom-right corner: `FitRoleTag` badge (icon + "Athlete" or "Coach")
- Not draggable

**Drawer (`cal-cross-role-sheet`)** — see Flow 9 above.

**Conflict / overlap rules:**
- Cross-role events count as conflicts for the current role's drag-drop (you can't drop a coach session onto a slot you've booked as an athlete).
- They do NOT count toward the current role's session badges, earnings, or stats (those live in the other role's profile).
- The cross-role event's actual status (Planned / Request / Awaiting / etc.) still drives the badge in the **other** role's calendar — only the presentation differs based on which role is currently active.

**a11y prefix:** `coach.calendar.cross-role.*` (this spec) and `athlete.calendar.cross-role.*` (per [athlete-schedule.md](./athlete-schedule.md)).

---

## 4c. Event overlap rendering (added 2026-05-21)

Overlap = two events occupying the same time window on the same coach's calendar. Backend prevents new overlaps between our events at create time (`_has_time_conflict` in `coach/training_events.py` returns 400). External events (Google/Apple) **cannot be prevented** — they may pre-exist when coach connects calendar post-factum. The client surfaces these overlaps visually instead.

**Detection (client-side):** day events endpoint returns all events for the day. Client computes overlaps by interval intersection between any two events (matches iOS `ScheduleManager.overlapped: [Int: Set<Int>]`). No backend overlap field on the response — purely client-derived.

**Visual marker:** `.overlapped` modifier on the tile (canonical lib class + `FitCalEvent` component prop):
- Red-tinted gradient overlay (#705959 → #BB7F7F, muted brown-red — matches iOS `Theme.Gradient.overlappedEvent`)
- Small corner-dot marker (8pt circle, top-right of tile) with red gradient + 1.5pt screen-bg ring so it reads against dense tiles
- Works on top of any tile type (Personal / Group / External / Cross-role / Custom) — additive, doesn't replace the underlying type color

**Entry point:** coach scrolls the timeline → sees the red-tinted overlay + corner dot on conflicting tiles → taps **any one of them** (own event or external) → `cal-overlap-sheet` opens. Tap-of-overlapped own-event **short-circuits** the regular event drawer (cal-event-sheet / cal-group-sheet) in favor of the conflict drawer; from there, Reschedule action can still hand off to the rescheduling flow.

**Drawer (`cal-overlap-sheet`):** Supports **N events** in the conflict group, not just 2.

- Status header "Time conflict" + Overlap badge
- Hero row: dynamic count copy ("N events overlap") + combined start–end time + date
- **Scrollable event list** (max-height 280pt) — each row shows the event icon + name + "Yours" / "Google" / "Apple" badge inline + individual time. Badge clarifies which events are coach-editable vs read-only. Rows are read-only here — surgical per-event hide is **not** exposed in the overlap drawer (would be visual overload + drawer is for resolving conflict, not granular calendar management). Coach who wants to surgically mute a specific external event taps that tile directly on the schedule → uses "Hide from schedule" in `cal-external-sheet`.
- Info banner: external events are read-only here
- Footer actions adapt to group composition — **two buttons** in the common case:
    - **Primary** (reschedule our event):
        - 1 own event in group → "Reschedule {name}" — direct (opens existing reschedule sheet)
        - 2+ own events → "Reschedule one of your events" → opens reschedule picker (which event first)
    - **Secondary** (resolve conflict from the external side): **"Ignore external events"**
        - One tap → backend calls POST `/v1.0.0/coach/calendar/external-events/{id}/hide` **for each external** in the current overlap group → all those externals disappear from the schedule → client recomputes overlap → our event tile drops its `.overlapped` marker → drawer closes → snackbar "Ignored N events from this slot · Undo" (5s). Undo restores all of them at once and re-applies the marker.
        - 0 external in group (rare race-condition case, all events are ours) → secondary hidden; reschedule picker is the only path
        - Per-occurrence in v1 (recurring noise re-appears next week — coach can re-Ignore, or disable the source calendar in Settings → Calendar Sync via existing `isActive` toggle, or wait for Phase 2 series scope when backend exposes `recurringEventId`)

**Bulk hide vs surgical hide trade-off:** the bulk action removes the conflict marker but also hides the *individual* externals (one-shot per occurrence). ⚠️ Recovery via Settings → Calendar Sync → Account detail → "Hidden events" was **removed 2026-06-03** (section dropped as over-complex); for now the only undo is the transient snackbar right after hiding — permanent recovery is an open decision (see [google-apple-calendar.md](./google-apple-calendar.md) hide endpoints). Time-window-scoped acknowledgement (where externals remain visible but the marker silently clears) was considered and rejected for v1 — introduces a new backend primitive (`acknowledged_overlap_at` on training event) AND visually confusing (coach sees external in the same window without overlap styling and starts doubting whether the slot is free). Phase 2 may revisit.

**No automatic resolution.** Two consenting changes are needed: either reschedule our events in 321Fit, or coach moves the external ones in their owning calendar. The drawer surfaces both options; the system doesn't pick.

**Realistic group sizes:** the 95% case is **2 events** (1 ours + 1 external). 3-4 events happen when multiple Google events land in the same window (e.g. "Team dinner" + "Bar meetup" both in the evening). 5+ rare; the scrollable list handles arbitrary N.

**a11y prefix:** `coach.calendar.overlap.*`.

---

## 5. States

Calendar view itself is not state-ful (always renders the selected day). States are on individual events (see [event-statuses.md](./event-statuses.md)) and on the event sheet (6 variants via `data-event-state`).

Timeline-level states that do exist:

| State | When | What's shown |
|---|---|---|
| `default` | Normal day with events | Timeline + events rendered |
| `loading` | First fetch | Spinner centered inside timeline area, timeline greyed |
| `empty` | No events for the day | Timeline rendered without events (not an empty-state screen — calendar still useful to create events on) |
| `offline` | Network unreachable, cached available | Timeline rendered from cache + subtle banner |

---

## 6. API

### Endpoints

#### `GET /coach/calendar?date=YYYY-MM-DD`

Returns day-worth of events + availability metadata for the coach.

**Response 200 — `CoachCalendarDay`:**

```json
{
  "date":            "2026-04-24",
  "timezone":        "Europe/Vienna",
  "workHours":       { "startMin": 480, "endMin": 1200 },
  "events": [
    {
      "id":           UUID,
      "type":         "personal" | "group" | "custom" | "external",
      "status":       EventStatus,
      "startAt":      ISO8601,
      "endAt":        ISO8601,
      "title":        "Tennis training",
      "athlete":      AthleteSummary | null,   // null for custom / external
      "location":     "Court A" | null,
      "price":        50.0 | null,
      "currency":     "EUR" | null,
      "paymentType":  "card" | "cash" | null,
      "externalSource": "google" | "apple" | null
    },
    ...
  ],
  "unavailableBlocks": [
    { "startMin": 720, "endMin": 780, "reason": "athlete_busy" | "external" }
  ]
}
```

#### `GET /coach/month-dots?month=YYYY-MM`

Returns per-day event-type indicators for the month grid above the day strip.

**Response 200:**
```json
{
  "2026-04-10": ["personal"],
  "2026-04-11": ["personal", "group", "external"],
  ...
}
```

#### Event CRUD (status-aware)

- `POST /coach/events` — create new event (personal, group, or custom)
- `PATCH /coach/events/{id}` — update event (title, time, location, etc.)
- `POST /coach/events/{id}/reschedule` — creates new event in `awaiting`, cancels old
- `POST /events/{id}/cancel` — see [event-statuses.md](./event-statuses.md)
- `POST /coach/events/{id}/review` — mark complete / missed, see [review-queue.md](./review-queue.md)
- `DELETE /coach/events/{id}` — custom events only; full deletion (not cancellation)

---

## 7. Business rules

- **Events cannot overlap within the coach's calendar.** Enforced at create/reschedule time.
- **Events respect coach's work hours** (see [profile-settings.md](./profile-settings.md) Available Hours). Creating outside work hours is blocked for new events; existing events from before a schedule change are grandfathered.
- **Events respect athlete availability** — server checks athlete's `external-calendar busy` + existing `planned` events before accepting a booking.
- **External calendar events** (Google/Apple) block time slots but can't be modified inside 321Fit. They're read-only, shown in a muted style.
- **Cancelled events hidden from calendar.** Retention 2 months, then hard-deleted.
- **Past events auto-`finished` on creation** (no approval cycle).
- **Drag & drop restricted to same day** in v1. Cross-day rescheduling via Reschedule button in event sheet.
- **15-minute snap grid** on drag.
- **Custom events** (type `custom`): no athlete, no price, no training template. Blocks availability. Anonymized in athlete-facing views.

---

## 8. Edge cases

- **Clock drift across devices:** server time is source of truth. Clients compute "now" against server timestamp.
- **Overlapping events from external calendar:** external events can overlap each other (outside our system); we render them layered with slight horizontal offset.
- **Athlete time-zone differs from coach:** displayed in the viewing user's local TZ. Event stored in UTC.
- **Coach deletes a custom event with athlete booking already made for that slot (edge):** should not be possible — custom events are always blocking-only, don't share slots with bookings. If accidental overlap from race, last-write-wins with warning push.
- **Coach on vacation (see [vacation-mode.md](./vacation-mode.md)):** existing `planned` events remain on calendar; new booking requests blocked server-side. Calendar renders normally.
- **Past event created (Tier 1 Q9):** allowed within 60-day backdate window only. `paymentType` forced to `cash`. Tagged `backdated: true` in ledger; does not count toward maturity stats; silent for athlete.

---

## 9. Platform notes

**Native UI conventions:** see [architecture/design-system.md § Native theming contract](../architecture/design-system.md#native-theming-contract). Don't duplicate cross-platform UI rules here — only platform-specific deviations below.

- **iOS:** SwiftUI `ScrollView` with absolute-positioned event blocks (using `.offset(y:)`). HorizonCalendar for date navigation. Long-press gesture for drag mode. Haptic: `.medium` on grab, `.light` on drop.
- **Android:** Compose LazyColumn for hour rows + `Box` for absolute positioning of events. Material 3 bottom sheet for event detail.
- **Backend:** Day-worth query is a composite (events + work_hours + external + athlete busy). Benefits from materialized view per coach updated on event CUD.
- **Voice:** `get_my_training_events(date)` returns same shape as calendar API. Voice reads aggregated summary ("3 sessions today — 10:30, 14:00, 18:00").

---

## 10. Open questions

- [ ] **Cross-day drag:** v2 scope? Or stick with Reschedule sheet? **Owner:** product.
- [ ] **Custom event — recurring option?** Current spec: one-off only. Some coaches want "every Friday gym class". Defer to v2. **Owner:** product.
- [x] ~~**Past event backdate limit:**~~ RESOLVED in Tier 1 Q9: 60 days. Cash-only, silent for athlete, separate counter from maturity stats.
- [x] ~~**One-off group event creation:**~~ RESOLVED 2026-05-21 — added back as Group toggle on Schedule training (Flow 3). Recurring group events still go through Sessions templates.
- [ ] **External calendar event modification:** read-only in our app. Any use case where we'd want to allow edit → bidirectional sync? Probably no. **Owner:** calendar-sync spec owner.
- [ ] **Month grid view:** currently expandable from date strip. Rich month view (full grid) as separate screen? **Owner:** design.
- [ ] **Time-zone display while coach is traveling:** events stored UTC; spec says rendered in viewing user's local TZ. Edge: coach in Vienna books a session, then travels to Tokyo — does the session show as "14:00 Vienna" or "21:00 Tokyo"? Current behavior = device TZ. Open: should we offer a "lock to home TZ" preference? **Owner:** product.
- [ ] **Cancelled events history:** cancelled events disappear from calendar entirely (2-month retention then archive). Per-athlete cancellation history exists in Clients module ([clients-coaches.md](./clients-coaches.md)). Global "all cancellations" timeline as a coach-side audit view — needed? **Owner:** design.
- [ ] **Empty-day visual:** day with zero events renders an empty 00:00–24:00 timeline with the off-hours wash on the non-working bands (see [event-statuses.md § 5b](./event-statuses.md)). No CTA, no hint copy — minimum chrome. Confirm acceptable, or add subtle empty-state copy? **Owner:** design. *(2026-05-21: tentatively kept minimal — no CTA.)*

---

## Related specs / references

- [event-statuses.md](./event-statuses.md) — 6-state enum, transitions, legacy migration
- [review-queue.md](./review-queue.md) — handles `review → finished/missed`
- [clients-coaches.md](./clients-coaches.md) — Schedule flow (coach creates events for athletes)
- [group-training.md](./group-training.md) — group session creation
- [calendar-sync.md](./calendar-sync.md) — external events source
- [payments.md](./payments.md) — payment release on finished, policy on missed / cancellation
- [vacation-mode.md](./vacation-mode.md) — paused state; existing events preserved
- [profile-settings.md](./profile-settings.md) — Available Hours definition
- Memory: `project_group_training_decisions`, `project_calendar_improvements`, `project_event_detail_decisions`, `project_calendar_event_status_system`
- Prototype: `flows/coach/calendar.html` (all 6 event states demonstrable via sidebar toggles)
- Components: FitCalEvent, FitCalEventPill, FitSheet, FitSheetStatusHeader, FitDayStrip, FitTimeline, FitIconBtn, FitButton. See [design-tokens/docs/components.md](../../design-tokens/docs/components.md).
