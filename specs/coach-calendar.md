# Coach Calendar

> Status: Approved (contract) / In Progress (event sheet + custom event migration)
> Prototype: [flows/coach/calendar.html](https://321-fit.github.io/project-spec/prototypes/flows/coach/calendar.html)
> Component library: [design-tokens/docs/components.md](../../design-tokens/docs/components.md)
> Last updated: 2026-08-11 (reconciled with shipped Android — see [audits/2026-08-11-specs-vs-android.md](../audits/2026-08-11-specs-vs-android.md) § Cluster 1)
> Implementation:
> - iOS:     [321fit_ios/docs/coach-calendar-ios.md] (to be created)
> - Backend: [poly-backend/docs/coach-calendar-backend.md] (to be created)
> - Voice:   [voice_control/docs/coach-calendar-voice.md] (to be created)
> - Android: **shipped** — one calendar shared by both roles (epic #122), PRs #121 / #123 / #124 / #131

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

### Flow 4: Reschedule via drag & drop (same day) — rewritten 2026-08-11 to shipped Android

1. Coach long-presses a draggable event (personal · group · custom — never external, never cross-role)
   → the tile lifts, haptic on grab.
2. On drag start the client loads the **counterparty's** busy ranges for the day on screen
   (`GET /coach/athletes/{id}/occupied-slots/`) — only a 1-1 event has a counterparty to check.
   Group events are handled by their participants' conflicts after the move; custom events have none.
3. Drag → the tile follows the pointer, snapping to the 15-minute grid. An invalid target paints the
   tile invalid and the snackbar **names the reason**: `outside working hours` / `slot occupied` /
   `the athlete is busy`. Paging is disabled while a drag is in flight — that is what keeps drag
   same-day without a separate rule.
4. **Drop, personal:** commits **optimistically and in place** — no confirm sheet. `PUT /coach/training-events/{id}/`
   with the new window. The event is not recreated; its **approval row** moves instead (see Flow 12
   and [event-statuses.md § 5a](./event-statuses.md)). On failure the tile snaps back to its original
   position and the server's message is shown.
5. **Drop, group:** opens the **recurring-scope sheet** first — *This session only · This and all
   following · All sessions*. The tile sits at the new time while the sheet is up and **nothing
   reaches the server** until a scope is chosen; dismissing puts the tile back. Confirm →
   `PUT /coach/training-events/{id}/reschedule` with the scope.
   *Why the asymmetry:* dragging used to move one occurrence silently while Reschedule from the
   drawer always asked — the same action answered differently depending on how it was started.
6. **After a group move** the server returns the participants who now clash. The client shows
   *"Scheduling conflicts — these athletes now have another session at this time. Reach out to them."*
   The move is not rolled back; the coach resolves it person by person.
7. Cross-day drag not supported in v1 — cross-day rescheduling goes through the drawer.

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

### Flow 11: Two events in the same slot (rewritten 2026-08-11)

An external event may collide with a planned 321Fit session — we can't prevent it at create time,
because the external event predates our awareness of it. We surface it and get out of the way.

1. Both events render with the `.overlapped` marker (red wash + corner dot).
2. Tapping either one opens `cal-overlap-sheet`: *"N events at this time. Tap one to open."*
3. Picking a row opens **that event's own drawer** — where Reschedule / Cancel (ours) or
   "Hide from schedule" (external) already live.

The sheet exists because stacked tiles are hard to hit, not because the app resolves the clash.
See § 4c for the decision that retired the conflict-resolution drawer.

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

**Shipped rules (2026-08-11 — these three were listed as open; the backend answers all of them):**

- **Re-confirm fires only on a dry-field change**, and the dry set is `datetime · address · price/currency`.
  Duration travels *as* the datetime, not as a field of its own; a note-only edit changes nothing.
- **The event is not recreated — its approval row moves.** Approved + dry change → `RESCHEDULED`;
  anything else → `PENDING`. See [event-statuses.md § 5a](./event-statuses.md).
- **A CRM client is exempt**: they don't have the app and cannot answer a re-confirm, so the event
  stays `APPROVED` and the athlete-side notification is skipped.
- **Recurring scope on Save exists** (`recurring_scope` on `PUT`) and ripples only the fields that
  describe *what the session is* — never the datetimes, which each occurrence owns. Moving a whole
  series is Reschedule, with its own grid.
- **The notification splits by cause**: `coach_rescheduled_training` when the time moved,
  `coach_updated_training` otherwise — mirrored to WhatsApp when the athlete allows it.

**Still open:** group edit must gate participant-affecting changes (refunds), the way group
reschedule does.

### Flow 13: Group session below its minimum — documented 2026-08-11 (shipped Android)

A group template can carry an optional **minimum** alongside its max ([session-creation.md](./session-creation.md)).
When an upcoming group event hasn't reached it, the coach is pushed
([group-training.md](./group-training.md) § notifications) and the decision is taken **on the calendar**,
in a sheet:

- Title *"Minimum not reached"*, subtitle `{session} · {N}h remaining` — the hours are what makes
  this actionable rather than informational.
- Participants row: `{joined} / {min} min · {max} max`.
- Body: *"N of M athletes joined. You can still run the session with current participants or cancel."*
- Actions: **Proceed with N athletes** (primary) · **Cancel Training** (destructive) — the same
  cancel path as the drawer, so a recurring group event still asks for its scope.

The sheet never blocks: doing nothing leaves the session as it is.

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

## 4c. Event overlap rendering (rewritten 2026-08-11 — decision taken)

**Decision (owner, 2026-08-11): the disambiguation list is canon; the conflict-resolution drawer is
dropped.** The earlier design — "Time conflict" header, Yours/Google badges, a Reschedule primary and
an **Ignore external events** secondary hitting `POST /coach/calendar/external-events/{id}/hide` — is
retired, not deferred. It needed a `/coach/calendar` router that does not exist on any backend, and
the problem it solved is not the problem coaches actually have here.

Overlap = two events occupying the same window on the same coach's calendar. The backend blocks
overlaps between **our** events at create time (`_has_time_conflict` → 400). External Google/Apple
events **cannot** be prevented — they may pre-date the calendar connection. So overlap is a rendering
concern, and the only thing the app owes the coach is (a) seeing it and (b) being able to open either
event.

**Detection (client-side).** The day's events are intersected pairwise; there is no overlap field on
the wire. Matches iOS `ScheduleManager.overlapped: [Int: Set<Int>]`.

**Visual marker** — `.overlapped` on the tile (lib class + `FitCalEvent` prop):
- red-tinted gradient overlay (#705959 → #BB7F7F, matching iOS `Theme.Gradient.overlappedEvent`);
- an 8pt corner dot, top-right, with a 1.5pt screen-bg ring so it reads on dense tiles;
- additive over any tile type (Personal / Group / External / Cross-role / Custom).

**Sheet (`cal-overlap-sheet`) — a disambiguation list, nothing more.** Tapping any tile in an overlap
group opens *"Overlapping events · N events at this time. Tap one to open."* Each row opens that
event's own drawer, where the real actions already live (Reschedule, Cancel, Hide from schedule for an
external). Supports arbitrary N; the 95% case is 2.

**Why this and not conflict resolution.** Two stacked tiles are physically hard to hit — that is the
coach's actual complaint. Everything the conflict drawer offered was a second copy of an action that
already exists one tap deeper, and the "Ignore external events" bulk-hide additionally hid the
individual externals with no permanent recovery path (the Hidden-events screen was dropped
2026-06-03). One list that routes to the real drawers beats a parallel action surface.

**Still true, and unchanged:** no automatic resolution. Either reschedule ours in 321Fit or move
theirs in the owning calendar; the app never picks.

**Consequence for calendar sync:** per-event hide, unhide and the hidden list
([google-apple-calendar.md](./google-apple-calendar.md)) lose their only shipped consumer. They remain
unbuilt; if per-event hide is wanted later it comes back through `cal-external-sheet`, not through
overlap.

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

> **Corrected 2026-08-11.** This section used to document `GET /coach/calendar?date=`,
> `GET /coach/month-dots?month=` and a `/coach/events` CRUD family. **None of them exist** — the
> module is `/coach/training-events/`, and the calendar is built from a date-ranged list plus the
> coach's allowed hours. (Android still carries dead Retrofit declarations for the two phantom
> endpoints; filed for removal.) Full per-endpoint reference:
> [poly-backend/docs/group-training-api.md](https://github.com/321-fit/poly-backend/blob/main/docs/group-training-api.md)
> for the group half.

### Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/coach/training-events/?start_date&end_date` | every fetch the calendar does — one day, a week strip, or a month of dots, by widening the range |
| `GET` | `/coach/training-events/allowed-hours/?searched_date` | the coach's working window for that date → drives the off-hours wash and the drag guard |
| `GET` | `/coach/athletes/{id}/occupied-slots/` | the counterparty's busy ranges, loaded when a drag starts. Returns each event's **raw** window — unlike the athlete-side twin, which returns it already expanded by the travel buffer |
| `POST` | `/coach/training-events/` | create a personal or group event (Flow 3) |
| `POST` | `/coach/training-events/create-custom/` | Busy time (Flow 5) |
| `PUT` | `/coach/training-events/{id}/` | edit **and** personal reschedule — in place, never a new event. Accepts `recurring_scope` (Flow 12) |
| `PUT` | `/coach/training-events/{id}/reschedule` | group reschedule; takes `recurring_scope`, returns the participants who now clash |
| `POST` | `/coach/training-events/{id}/cancel` | group cancel; takes `recurring_scope` |
| `PATCH` | `/coach/training-events/{id}/change-status/` | accept / decline / cancel a personal event from the drawer |
| `DELETE` | `/coach/training-events/{id}/` | custom events — full deletion, not cancellation |
| `POST` | `/coach/training-events/{id}/complete/` · `/submit-cash-payment/` · `/post-confirm/` | completion, see [review-queue.md](./review-queue.md) |

**No day-bundle endpoint exists.** Work hours, events and the athlete's occupancy are three separate
calls the client composes — the "composite day query" in § 9 was never built and is a backend
proposal, not shipped behaviour.

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
- **Android (shipped):** one paged calendar body serves **both roles** (epic #122) — the role supplies
  a config object (draggable predicate, tile type, recipient label, commute overlays, off-hours copy),
  not a screen of its own. Neighbouring days render behind the pager while you swipe; paging is
  disabled during a drag. Sheets are `FitSheet`, never Material 3.
- **Backend:** there is no day-bundle endpoint — events, allowed hours and the counterparty's
  occupancy are three calls. A composite day query (+ per-coach materialized view) remains a
  proposal; don't spec it as shipped.
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
