# Booking Flow

> Status: Draft
> Prototypes:
> - [flows/shared/profile.html](https://321-fit.github.io/project-spec/prototypes/flows/shared/profile.html) (athlete booking)
> - [flows/coach/invite.html](https://321-fit.github.io/project-spec/prototypes/flows/coach/invite.html) (coach invite + schedule)
> Component library: [design-tokens/docs/components.md](../../design-tokens/docs/components.md)
> Last updated: 2026-06-09
> Implementation:
> - iOS:     [321fit_ios/docs/booking-flow-ios.md] (to be created)
> - Android: [321fit_android/docs/booking-flow-android.md] (to be created)
> - Backend: [poly-backend/docs/booking-flow-api.md] (to be created)

**Scope note:** this spec covers the **end-to-end booking experience** — date+slot picker, confirmation sheet, post-send redirect — for all four entry points:
- Athlete books a coach's Personal session
- Athlete joins a coach's Group session
- Coach invites external athlete (deep-link share)
- Coach schedules an in-app athlete (request to existing client)

All four converge on a **unified confirmation pattern**: bottom sheet overlay (not push screen) → send → snackbar → context-aware redirect.

---

## 1. Overview

The booking flow has two semantic dimensions that drive variant content:

| Dimension | Variants |
|---|---|
| **Direction** | Athlete → Coach (request) · Coach → Athlete (invitation / request) |
| **Session type** | Personal (1-on-1 slot picker) · Group (specific session instance) |

Combined: 4 entry-point flows that share screens and sheets:

```
Athlete · Personal:    [coach profile] Book Training → s-book-sessions (Personal) → s-booking (bk-personal) → booking-confirm-sheet → snackbar → athlete/calendar.html
Athlete · Group:       [coach profile] Book Training → s-book-sessions (Group) → s-group → join-confirm-sheet → snackbar → athlete/calendar.html
Coach · Invite (link): [Clients +] → s-invite-select → s-invite-time → invite-confirm-sheet → snackbar (link ready, stay)
Coach · Schedule:      [Calendar FAB · Schedule training] → invite.html?mode=schedule → s-invite-select → s-invite-time → schedule-confirm-sheet → snackbar → coach/calendar.html
```

**Entry points (wired 2026-06-03):**
- **Athlete** — "Book Training" on the coach profile (`s-coach-v2`) + on All Reviews (`s-reviews`) → `s-book-sessions` catalog; a Personal card → `s-booking` grid, a Group card → `s-group`.
- **Coach** — Calendar **FAB → "Schedule training"** now hands off to the canonical booking flow (`invite.html?mode=schedule&origin=s-calendar`): template chooser `s-invite-select` → time-grid `s-invite-time`. (The legacy `s-schedule-event` form is bypassed — kept in DOM for reference. One-off **group** event creation, which lived in that form's type toggle, is **not** covered by this re-route — open item below.)

The unifying principle: **final confirmation is always a bottom sheet on the trigger screen**. No separate `Review & Send` push screen. Memory: `feedback_booking_confirm_pattern`.

---

## 2. User Stories

### Athlete

- As an athlete, I want to pick a date and time slot for a personal session in one screen, so I can quickly find a fit.
- As an athlete, I want to drag a duration-sized block on a day timeline (or tap a free band to drop it), snapping to 15 minutes, so picking a precise start feels direct and physical.
- As an athlete, I want to see when **the coach** is busy AND when **I** already have something on, on the same timeline, so the free gaps are obvious and I never book over my own schedule.
- As an athlete, joining a group session, I want to see all upcoming instances of that template on a single screen.
- As an athlete, before sending a booking request, I want to review the full details (coach, session, time, price, hold info) and add a note for the coach.
- As an athlete, after sending, I want to land on my Calendar so I can see the pending request immediately.

### Coach

- As a coach inviting an external athlete, I want to pick a time slot then share an invite link (no immediate event creation).
- As a coach scheduling an in-app client, I want a request flow that requires the athlete to accept, with the pending event visible in my Calendar.
- As a coach, I want the same confirm-sheet pattern for both invite and schedule flows, so my muscle memory is consistent.

---

## 3. System Stories

- As the system, when athlete picks a session from `s-book-sessions`, I route to `s-booking` with the chosen template and pre-set `bk-personal` or `bk-group` class.
- As the system, for Personal mode, I render a vertical **time-grid** on top of `.fit-timeline`/`.fit-hour` (96px = 1h) using the `.fit-bk-*` atoms from fit-ui.css. A draggable/tappable `.fit-bk-sel` block (= session duration) is the selection; it snaps to 15-min steps and to the nearest free slot off any busy range.
- As the system, I paint **both parties' unavailability** on the grid using the **calendar tile grammar 1:1** (no bespoke booking-only look): the viewer's own events render as full `.fit-cal-event-personal` / `-group` / `-cross-role` tiles (title + time + location + role tag); the **other party's** busy renders as the anonymized solid `.fit-cal-event-external` tile labelled by role — **"Coach busy"** (athlete viewing) / **"Athlete busy"** (coach viewing), no detail — privacy; outside working hours renders as a hatched `.fit-bk-off` zone. The union is unbookable; the selection block turns red (`.invalid`) and the Book CTA disables while it overlaps any of them.
- As the system, for Group mode, I render `.v6d-card` blocks for each upcoming session instance. Past sessions are filtered out; full sessions render with `opacity:0.6` and "Full · 10/10".
- As the system, the sticky footer CTA on the grid updates live as the user picks a slot, with a **role/mode-aware verb** (not "Confirm" — that read as already-final and confused users): athlete → `Book · HH:MM – HH:MM`; coach **schedule** mode → `Schedule · …`; coach **invite** mode → `Invite · …`. The verb matches the final action in the confirm sheet (Send request / Send invite). Over a busy range it reads `Pick a free slot` and disables.
- As the system, the grid **hint + legend** (instruction + "whose events" key) is pinned in the sticky header under the day-strip — it does not scroll away with the timeline.
- As the system, on Confirm tap, I open the appropriate `.fit-sheet-overlay` (id varies by flow) without navigating. Same screen stays mounted underneath.
- As the system, on Send tap inside the sheet, I dismiss the sheet, show a `.fit-snackbar` with the success message, and for context-aware flows redirect to the destination (Calendar for athlete + coach-schedule; stay for coach-invite-link).
- As the system, if backend send fails, I keep the sheet open with an inline `.fit-inline-error` banner above the CTA, allowing retry without re-entry.

---

## 4. Screens & Sheets

### Athlete · `s-booking` (Booking Calendar)

Lives in `flows/shared/profile.html`. Reached by athlete tapping a session in `s-book-sessions`. Header is a day-strip with month grid expansion.

**State class on `.fit-phone`** drives content:
- `.bk-personal` — time-grid slot picker (default for personal sessions)
- `.bk-group` — upcoming group session instances
- `.bk-empty` — no availability on selected day (hides footer)
- `.bk-loading` — skeleton (hides footer)
- `.bk-error` — inline error banner (hides footer)

**Personal time-grid (`data-booking-state="personal"`):**

A vertical day timeline (`.fit-bk-grid` over `.fit-timeline`/`.fit-hour`, 96px = 1h, 24px = 15min) covering the coach's working window. The selection is a single draggable block (`.fit-bk-sel`) sized to the session duration:

- **Tap** a free band → block jumps there (start at tap, snapped to nearest free slot).
- **Drag** the block → fine-tune; snaps to 15-min steps live. On release over a busy range it snaps to the nearest free slot.
- Block shows the live range + state in its label; turns red (`.fit-bk-sel.invalid`) over any busy range and disables the Book CTA.

**Dual availability** painted on the same grid (see §8):
- **Your events** — full calendar tiles (`.fit-cal-event-personal` / `-group`, and `.fit-cal-event-cross-role` + role tag for events booked under your other role) — same title/time/location density as the calendar, pulled from your schedule so you never book over yourself.
- **Coach busy** — anonymized solid `.fit-cal-event-external` tile labelled **"Coach busy · HH:MM–HH:MM"** (role word, not bare "Busy"; no event detail — privacy), clearly visible.
- **Outside coach hours** — hatched `.fit-bk-off` zone.

This replaces the earlier expandable-hour + 15-min-chip picker (`.tp-slot*`), which is retired for booking (the `.tp-slot*` atoms remain in the kit for `coach/sessions.html` "Select time"). Mirrors prod iOS `SelectSlotsView` drag-n-drop; dual-availability + tap-to-place are the deliberate improvements over prod.

**Group session list (`data-booking-state="group"`):**

Each upcoming instance is a `.v6d-card` with brand-gradient header (icon + name + date · time + price/person) and location strip (location + spots remaining). Selected = teal border. Full = opacity 0.6 + red "Full · 10/10".

**Footer:** sticky `.fit-phone-footer` with single Book CTA. Hidden in empty/loading/error states.

### Athlete · `booking-confirm-sheet` (Personal)

`.fit-sheet-overlay` inside `s-booking`. Opened from sticky Book CTA.

Content:
1. `.fit-sheet-handle` + centered `.fit-sheet-title` "Review & Send"
2. Coach identity row — avatar + "BOOKING WITH" label + coach name
3. Session summary card (gray bg, padding 14) — name + Request pill + datetime + location
4. Note textarea — `.fit-input-ta` + `.fit-input-counter`, max 300 chars, placeholder "Anything the coach should know — injuries, goals, level…"
5. Price row — divider top, "Price" left + "€50.00" right
6. **Payment method** — segmented chips (`.fit-selection-group` / `.fit-selection-chip`, same component as the coach's Personal/Group toggle), shown **only when the session accepts both methods**. Options **Cash | Balance**, **Cash preselected** by default. There is **no card hold** — the athlete prepays into a 321Fit **balance**; the online option ("Balance") reserves from that balance, it does not charge a card at booking time.
   - When the coach offers a **single method** the chips are hidden and a static "Payment" line shows the one method (`Cash · in person` or `Balance`).
7. Info line — copy follows the selected method:
   - **Cash** → "You'll pay €50 to the coach in person. Nothing is reserved now — the coach confirms the payment after the session. Coach has 48h to approve."
   - **Balance** (sufficient) → "€50 reserved from your €80 balance · refunded if the coach declines. Coach has 48h to approve."
   - **Balance** (insufficient) → shortfall copy: "Your balance is €30 — €20 short for this session. Top up to pay from balance."
8. CTA — `.fit-btn.fit-btn-primary`. "Send Request · €50" for Cash / sufficient Balance; **flips to "Top up balance"** when Balance is selected with insufficient funds (routes to `athlete/balance.html`, no request sent).

Dismiss: handle drag or backdrop tap. Send → `sendBookingRequest()` → snackbar + redirect to `athlete/calendar.html`. JS: `bkSetPay(method)` (cash/balance), `bkSetPayMode(mode)` (both/card/cash — coach-side "card" maps to athlete-side "balance"), `bkBookingCta()` (send vs top-up branch).

### Athlete · `s-group` + `join-confirm-sheet` (Group)

Group session detail screen with participants list and "Join Training · €25" sticky CTA. Tap CTA → opens `join-confirm-sheet` (existing pattern, slightly different content from personal):
- Title "Confirm Registration"
- Summary card (training + datetime + location + spots)
- Price row + Payment method (Visa •••• 4242)
- Cancellation policy hint (24h free cancel)
- "Continue · €25" CTA → snackbar + redirect to `athlete/calendar.html`

### Coach · `s-invite-time` (Personal)

Lives in `flows/coach/invite.html`. Reached by coach from `s-invite-select` (template chooser). **Same time-grid component** as athlete `s-booking` Personal mode (`.fit-bk-*`), scoped to `#inv-grid` / `#inv-sel`. JS: `invInitGrid()` + `invRender()` (tap-to-place + drag, mirroring the athlete grid).

Dual availability is **role-mirrored**:
- Full calendar tiles = the **coach's** own events (incl. cross-role + tag).
- Anonymized `.fit-cal-event-external` tile labelled **"Athlete busy"** = the target athlete's conflicts, shown in **schedule** mode only (in-app athlete). In **invite** mode (external athlete, unknown calendar) the athlete tile + legend are hidden.
- Hatched `.fit-bk-off` zone = outside the coach's working hours.

Sticky CTA — verb is mode-aware (`Schedule · …` in schedule mode, `Invite · …` in invite mode) — invokes `openInviteConfirm()` which routes to the right sheet based on `inviteMode` URL param:
- `invite` (default) → `invite-confirm-sheet`
- `schedule` → `schedule-confirm-sheet`

### Coach · `s-invite-time-group` (Group)

Group variant for coach side. Tapping a `.v6d-card` opens `invite-confirm-sheet-group` (link share for group session).

### Coach · `invite-confirm-sheet` (External invite, Personal)

Sheet content:
- "Review & Send" title
- Session summary card with **Invitation** badge
- Comment textarea — placeholder "Add a message for the athlete..."
- Price row + Cash badge
- Info line — "Share the invite link with the athlete · you'll be notified when they sign up and accept"
- Send CTA "Send Invite" → snackbar "Invite link ready" → **stay on screen** (coach needs to share via Native Share Sheet in production)

### Coach · `invite-confirm-sheet-group` (External invite, Group)

Same as personal-invite sheet but with group session summary (HIIT Group · Tue Apr 14 · 18:00 + 3/10 spots), Invitation badge, €25/person price.

### Coach · `schedule-confirm-sheet` (In-app athlete)

Sheet content:
- "Review request" title
- Recipient row — avatar + "SENDING TO" + athlete name (e.g. Anna Kowalski)
- Session summary card with **Request** badge
- Comment textarea — placeholder "Add a message for Anna..."
- Price row + Cash badge
- Info line — "Anna has 24h to accept · you'll see this pending in your Calendar"
- Send CTA "Send Request" → snackbar "Request sent to Anna" → **redirect to `coach/calendar.html`** at the day+slot with pending event

---

## 5. Component usage

- **`.fit-sheet-overlay`** + **`.fit-sheet`** + **`.fit-sheet-handle`** + **`.fit-sheet-title`** — canonical sheet chrome (memory: `feedback_bottom_sheets`)
- **`.fit-sheet.compact`** — shorter bottom-padding variant (for 3-row pickers like Gender; not used in this flow but related)
- **`.fit-timeline`** + **`.fit-hour`** + **`.fit-hour-label`** — day timeline scaffold (96px = 1h), reused from the calendar
- **`.fit-bk-grid`** + **`.fit-bk-sel`** (+ `.invalid`) + **`.fit-bk-sel-grip`** + **`.fit-bk-sel-label`** — draggable/tappable selection block
- **`.fit-bk-off`** + **`.fit-bk-off-label`** — hatched "outside working hours" zone
- **`.fit-cal-event-personal` / `-group` / `-cross-role`** (+ `.fit-cal-event-cross-role-tag`) — viewer's own events, reused 1:1 from the calendar (informational here — `pointer-events:none`)
- **`.fit-cal-event-external`** — anonymized solid "Busy" tile for the other party
- **`.v6d-card`** — group session block (gradient header + location strip)
- **`.fit-input-ta`** + **`.fit-input-counter`** — note textarea with char count
- **`.fit-cal-event-pill.fit-cal-event-pill--request`** — Request pill on summary card
- **`.fit-badge.fit-badge-info`** — Invitation badge
- **`.fit-badge.fit-badge-neutral`** — Cash badge
- **`.fit-snackbar`** — post-send confirmation toast
- **`.fit-inline-error`** — sheet-level error banner (e.g. send failed)

---

## 6. Post-send navigation rules

| Flow | Snackbar | Redirect |
|---|---|---|
| Athlete · Personal | "Request sent · coach has 48h to approve" | `athlete/calendar.html` |
| Athlete · Group | (none, snackbar implicit) | `athlete/calendar.html` |
| Coach · Invite link | "Invite link ready" | **none (stay)** — Native Share Sheet opens with link |
| Coach · Schedule | "Request sent to Anna" | `coach/calendar.html` |

**Rationale:**
- Athlete redirects to their Calendar so they see the pending event in their schedule — closes the loop "did my action work?"
- Coach invite-link stays because the deliverable is the link itself — coach needs to share via OS Share Sheet (mocked as snackbar in prototype)
- Coach schedule redirects to Calendar because the event IS scheduled (with pending athlete acceptance) and visually belongs there

---

## 7. API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1.0.0/athlete/coaches/{id}/occupied-slots/?weekStart={d}&weekEnd={d}&exclude_event_id={id?}` | Coach week schedule (athlete booking) — **already in prod** |
| GET | `/api/v1.0.0/coach/athletes/{id}/available-invite-slots/?weekStart={d}&weekEnd={d}` | Athlete week schedule (coach schedule mode) — **already in prod** |
| GET | `/api/v1.0.0/athlete/coaches/{id}/group-sessions?template={id}` | Upcoming group instances for template |
| POST | `/api/v1.0.0/athlete/booking-requests` | Athlete sends booking request (personal or group join) |
| POST | `/api/v1.0.0/coach/invites` | Create external invite (returns share link) |
| POST | `/api/v1.0.0/coach/schedule-requests` | Send schedule request to existing in-app athlete |

**Dual availability is already supported by the wire format** — no new contract. The two week-schedule endpoints return `CoachScheduleResponse { schedule: { [date]: { coachWorkingHours[], occupiedSlots[] } } }`, and each `occupiedSlot` carries `ownerType` (`"requester"` = the person booking → render as a full `.fit-cal-event-*` tile; `"other"` = the counterparty/Google → render as an anonymized `.fit-cal-event-external` "Busy" tile). The grid maps `coachWorkingHours` → bookable band (gaps → hatched `.fit-bk-off`) and the two `ownerType`s → the two tile treatments. **Do not** add the previously-planned `available-slots?date` endpoint — these prod endpoints supersede it (memory: `feedback_keep_existing_endpoints`).

Detailed payloads + response shapes go to `poly-backend/docs/booking-flow-api.md`. Prod source models: `CoachHoursResponse.swift` (`CoachScheduleResponse`/`CoachSlot`/`CoachWorkingHours`); UI reference: `ScheduleTab/Event/Create/Common/SelectSlots/`.

---

## 8. Business rules

- **48h response window** — both athlete-requested and coach-scheduled requests auto-expire if not actioned within 48h (auto-declined → refund). Matches `event-statuses.md` (48h auto-cancel). Configurable per coach in future. *(Updated from 24h → 48h, 2026-06-26.)*
- **Payment method** — a session inherits the methods the coach enabled (cash and/or card). Athlete-facing the two options are **Cash** (pay coach in person) and **Balance** (reserved from prepaid 321Fit balance — the coach-side "card" option). When both are enabled the confirm sheet shows a chip picker with **Cash preselected**; with one enabled there's no choice.
- **No card hold** — there is **no card charge/hold at booking**. Online payment is funded by the athlete's prepaid balance (topped up via Stripe, see `payments.md`). "Balance" reserves from that balance on Send; released to coach after the session completes (24h post-end); refunded if the coach declines or cancels.
- **Cancellation policy** — athlete: free cancel up to 24h before session; coach: must cancel via Calendar (different flow). Cash sessions: no reservation, no refund logic; coach marks paid post-session.
- **Sheet content per flow** is determined client-side from `inviteMode` URL param (`invite` / `schedule`) on coach side, and from session type on athlete side. Backend doesn't need to know which sheet variant.
- **Personal mode in `s-booking`** uses a time-grid: the selection block = session duration, drag/tap snaps the **start** to 15-min steps. Non-standard durations (45/90 min) keep the block the right height; only the start snaps. Backend receives the resolved `datetimeStart`/`datetimeEnd`.
- **Dual availability** — the bookable surface is the counterparty's working hours **minus** the union of both parties' busy ranges. A start is valid only if `[start, start+duration]` overlaps no busy range. On an invalid drop the client snaps to the nearest free start; the Book CTA stays disabled until valid. The backend re-validates on Send (race guard, see §9) — the client grid is an optimistic convenience, not the authority.
- **Unknown counterparty calendar** — coach **invite** mode (external athlete) has no athlete schedule, so only the coach's own busy + working hours are shown; the athlete overlay is hidden. Coach **schedule** mode (in-app athlete) shows both.
- **Group session full** — locked row, no tap, "Full · 10/10" label in red. Athlete cannot join.

---

## 9. Edge cases

- **All day busy for personal** — `s-booking` shows `.bk-empty` state with "Pick another date" hint (day-strip remains visible at top).
- **Template has no scheduled group sessions** — `s-invite-time-group` shows empty state with "Schedule one first" CTA (coach action).
- **Athlete balance insufficient (Balance method)** — the info line shows the shortfall ("Your balance is €30 — €20 short…") and the primary CTA flips from "Send Request" to **"Top up balance"** → `athlete/balance.html`. No request is sent until the athlete tops up. (Only applies when paying from Balance; Cash needs no funds.)
- **Coach offline when sheet opens** — sheet renders normally (it's local state); on Send, request goes to retry queue if network down, snackbar shows "Sent when online".
- **Athlete already has a conflicting booking** — backend rejects, sheet error: "You already have a session at 10:00 — pick another time".
- **Coach revokes invite link** before athlete signs up — link → "This invitation is no longer valid".
- **Two athletes book the same slot simultaneously (race)** — backend wins one, other gets error "Slot just got taken — pick another time".

---

## 10. Platform notes

- **iOS:** SwiftUI `.sheet(isPresented: $showingSheet)` with `.presentationDetents([.medium, .large])` for confirm sheets. `s-booking` is a regular pushed `View`. Time slot picker uses `LazyVStack` with custom `TpSlotView` expand-on-tap.
- **Android:** Jetpack Compose `ModalBottomSheet` for confirm sheets. `s-booking` is `Scaffold` route. Time slot list uses `LazyColumn` with `AnimatedVisibility` for minute chips.
- **Backend:** request lifecycle = `pending` → `approved` | `declined` | `expired`. Background job sweeps expired requests every minute. Fund hold uses Stripe `payment_intents` with `capture_method=manual` + capture-on-completion.
- **Voice:** athlete booking via AI Assistant — separate flow that ends in the same `booking-confirm-sheet` for visual confirmation (future).

---

## 11. Open questions

- [ ] **Tip on send for cash sessions** — should we surface "Tip the coach 10/15/20%" before send? Probably no for MVP (athlete pays cash directly).
- [ ] **Recurring booking** — book same time slot weekly for N weeks? Deferred to v2.
- [ ] **Coach counter-proposal** — if athlete picks a slot coach finds inconvenient, can coach propose alternate time? Not in v1; coach just declines + chat (when chat ships).
- [ ] **Native Share Sheet on iOS/Android for coach invite-link** — confirm we use `UIActivityViewController` / `Intent.ACTION_SEND` rather than custom share sheet.
- [ ] **Group session full waitlist** — currently no waitlist (athletes can't queue). Worth adding? Probably v2.
- [ ] **One-off group event creation entry** — the Calendar FAB "Schedule training" now routes to the personal booking flow (template chooser → time-grid). The legacy `s-schedule-event` form's Personal/Group toggle used to host one-off group event creation; that path is now orphaned. Decide where one-off group creation lives (e.g. a separate FAB item, or inside Sessions). Flagged 2026-06-03.

---

## 12. Design decisions log

- **2026-05-12** — Final booking confirmation = bottom sheet (auto-height), never push screen. Unified across athlete personal + group, coach invite + schedule. Memory: `feedback_booking_confirm_pattern`.
- **2026-05-12** — Personal slot picker uses expandable hour rows + 15-min chips (mirrors `coach/sessions.html` Select time pattern). Replaces flat 60-min slots. *(Superseded 2026-06-03.)*
- **2026-06-03** — **Wired the entry points** end-to-end: athlete "Book Training" (coach profile + All Reviews) → `s-book-sessions` → Personal card → `s-booking` grid / Group card → `s-group`. Coach Calendar **FAB "Schedule training"** → `invite.html?mode=schedule&origin=s-calendar` (template chooser → time-grid), replacing the legacy `s-schedule-event` date/time-picker form for the 1-on-1 path. `go()` hardened to tolerate a null button (CTA-driven nav). One-off group creation left as an open item.
- **2026-06-03** — **Reverted the expandable-hour picker to a drag-n-drop time-grid** (`.fit-bk-*` over `.fit-timeline`), matching prod iOS `SelectSlotsView`. Applied to **both** `s-booking` (athlete) and `s-invite-time` (coach invite/schedule). Two improvements over prod: **(1) dual availability** — show both parties' unavailability on one grid, so free gaps are obvious and you can't book over yourself (fixes a known prod gap); **(2) tap-to-place** in addition to drag (faster + more accessible than prod's drag-only). Free slots stay **neutral** (only busy is shaded) — matches prod and `coach/calendar.html`. **Occupancy reuses the calendar tile grammar 1:1** (refined 2026-06-03 after first cut read too faint): viewer's own events = full `.fit-cal-event-*` tiles (title/time/loc + cross-role tag); other party = anonymized solid `.fit-cal-event-external` "Busy" tile; off-hours = hatched `.fit-bk-off`. The selection block shows session name + live time. Grid atoms promoted to `fit-ui.css` (`.fit-bk-*`, shared by both prototypes) rather than duplicated page-local. `.tp-slot*` retired for booking but kept in the kit for `coach/sessions.html`.
- **2026-05-12** — Group session blocks render as `.v6d-card` with location strip + spots remaining. Full sessions render dimmed (opacity 0.6) + red "Full" label.
- **2026-05-12** — Post-send redirect rules: athlete + coach-schedule → Calendar; coach-invite-link → stay (Share Sheet). Closes the loop differently per flow intent.
- **2026-05-12** — Sheet chrome uses canonical `.fit-sheet-overlay` + `.fit-sheet` (NOT custom local CSS). Direct child of `.fit-phone`, position absolute relative to phone frame.
- **2026-05-12** — Sheets dismiss via handle drag + backdrop tap only. No × close button. Memory: `feedback_bottom_sheet_dismiss`.
- **2026-05-12** — Coach side `s-invite-review` push screen replaced by `invite-confirm-sheet` overlay. `s-schedule-review` push replaced by `schedule-confirm-sheet`. Both old screens kept in DOM as dead-code reference until production sign-off.

---

## 13. References

- Athlete prototype: [flows/shared/profile.html](https://321-fit.github.io/project-spec/prototypes/flows/shared/profile.html) (#s-booking, #s-group, sheets)
- Coach prototype: [flows/coach/invite.html](https://321-fit.github.io/project-spec/prototypes/flows/coach/invite.html)
- Coach side time picker reference: [flows/coach/sessions.html](https://321-fit.github.io/project-spec/prototypes/flows/coach/sessions.html) (Select time bottom sheet pattern)
- Coach calendar (post-schedule redirect): [coach-calendar.md](coach-calendar.md)
- Athlete schedule (post-booking redirect): [athlete-schedule.md](athlete-schedule.md)
- Coach profile (booking entry): [coach-profile.md](coach-profile.md) (Appendix A)
- Athlete dashboard (Awaiting confirmation card): [athlete-dashboard.md](athlete-dashboard.md)
- Group training: [group-training.md](group-training.md)
- Payments / balance hold: [payments.md](payments.md)
- Memory:
  - `feedback_booking_confirm_pattern`
  - `feedback_bottom_sheets`
  - `feedback_bottom_sheet_dismiss`
  - `feedback_picker_sheet_vs_push`
