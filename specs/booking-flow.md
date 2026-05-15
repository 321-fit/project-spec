# Booking Flow

> Status: Draft
> Prototypes:
> - [flows/shared/profile.html](https://321-fit.github.io/project-spec/prototypes/flows/shared/profile.html) (athlete booking)
> - [flows/coach/invite.html](https://321-fit.github.io/project-spec/prototypes/flows/coach/invite.html) (coach invite + schedule)
> Component library: [design-tokens/docs/components.md](../../design-tokens/docs/components.md)
> Last updated: 2026-05-12
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
Athlete · Personal:    s-booking (bk-personal) → booking-confirm-sheet → snackbar → athlete/calendar.html
Athlete · Group:       s-group → join-confirm-sheet → snackbar → athlete/calendar.html
Coach · Invite (link): s-invite-time → invite-confirm-sheet → snackbar (link ready, stay)
Coach · Schedule:      s-invite-time → schedule-confirm-sheet → snackbar → coach/calendar.html
```

The unifying principle: **final confirmation is always a bottom sheet on the trigger screen**. No separate `Review & Send` push screen. Memory: `feedback_booking_confirm_pattern`.

---

## 2. User Stories

### Athlete

- As an athlete, I want to pick a date and time slot for a personal session in one screen, so I can quickly find a fit.
- As an athlete, I want hour slots to expand into 15-minute granularity, so I can match my schedule precisely.
- As an athlete, I want to see when the coach is busy, so I don't waste time picking unavailable slots.
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
- As the system, for Personal mode, I render the expandable hour slot list using `.tp-slot-list` from fit-ui.css — each hour can expand into 4× 15-min chips (`:00 / :15 / :30 / :45`).
- As the system, busy hours render `.tp-slot.tp-slot-busy` with the conflicting event name (`Busy · HIIT Group`). Not expandable.
- As the system, for Group mode, I render `.v6d-card` blocks for each upcoming session instance. Past sessions are filtered out; full sessions render with `opacity:0.6` and "Full · 10/10".
- As the system, the sticky Confirm CTA on Personal updates live as athlete picks a different slot — text becomes `Confirm · HH:MM – HH+1:MM`.
- As the system, on Confirm tap, I open the appropriate `.fit-sheet-overlay` (id varies by flow) without navigating. Same screen stays mounted underneath.
- As the system, on Send tap inside the sheet, I dismiss the sheet, show a `.fit-snackbar` with the success message, and for context-aware flows redirect to the destination (Calendar for athlete + coach-schedule; stay for coach-invite-link).
- As the system, if backend send fails, I keep the sheet open with an inline `.fit-inline-error` banner above the CTA, allowing retry without re-entry.

---

## 4. Screens & Sheets

### Athlete · `s-booking` (Booking Calendar)

Lives in `flows/shared/profile.html`. Reached by athlete tapping a session in `s-book-sessions`. Header is a day-strip with month grid expansion.

**State class on `.fit-phone`** drives content:
- `.bk-personal` — time slot picker (default for personal sessions)
- `.bk-group` — upcoming group session instances
- `.bk-empty` — no availability on selected day (hides footer)
- `.bk-loading` — skeleton (hides footer)
- `.bk-error` — inline error banner (hides footer)

**Personal slot list (`data-booking-state="personal"`):**

Each row is a `.tp-slot` with `.tp-slot-row` (hour label + chevron) + `.tp-slot-minutes` (4 `.min-chip` cells). Tap hour row → expand + auto-select first available minute. Tap min-chip → fine-tune to that 15-min start. Busy hours use `.tp-slot.tp-slot-busy` with `.tp-slot-busy-label`.

**Group session list (`data-booking-state="group"`):**

Each upcoming instance is a `.v6d-card` with brand-gradient header (icon + name + date · time + price/person) and location strip (location + spots remaining). Selected = teal border. Full = opacity 0.6 + red "Full · 10/10".

**Footer:** sticky `.fit-phone-footer` with single Confirm CTA. Hidden in empty/loading/error states.

### Athlete · `booking-confirm-sheet` (Personal)

`.fit-sheet-overlay` inside `s-booking`. Opened from sticky Confirm CTA.

Content:
1. `.fit-sheet-handle` + centered `.fit-sheet-title` "Review & Send"
2. Coach identity row — avatar + "BOOKING WITH" label + coach name
3. Session summary card (gray bg, padding 14) — name + Request pill + datetime + location
4. Note textarea — `.fit-input-ta` + `.fit-input-counter`, max 300 chars, placeholder "Anything the coach should know — injuries, goals, level…"
5. Price row — divider top, "Price" left + "€50.00" right
6. Hold info line — lock icon + "€50 held from your balance · refunded if coach declines. Coach has 24h to approve."
7. Send CTA — `.fit-btn.fit-btn-primary` "Send Request · €50"

Dismiss: handle drag or backdrop tap. Send → `sendBookingRequest()` → snackbar + redirect to `athlete/calendar.html`.

### Athlete · `s-group` + `join-confirm-sheet` (Group)

Group session detail screen with participants list and "Join Training · €25" sticky CTA. Tap CTA → opens `join-confirm-sheet` (existing pattern, slightly different content from personal):
- Title "Confirm Registration"
- Summary card (training + datetime + location + spots)
- Price row + Payment method (Visa •••• 4242)
- Cancellation policy hint (24h free cancel)
- "Continue · €25" CTA → snackbar + redirect to `athlete/calendar.html`

### Coach · `s-invite-time` (Personal)

Lives in `flows/coach/invite.html`. Reached by coach from `s-invite-select` (template chooser). Same expandable hour slot pattern as athlete `s-booking` Personal mode, scoped to `#inv-slot-list`. JS: `invToggleSlot()` + `invPickTime()` + `invUpdateConfirmCta()`.

Sticky Confirm CTA invokes `openInviteConfirm()` which routes to the right sheet based on `inviteMode` URL param:
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
- **`.tp-slot-list`** + **`.tp-slot`** + **`.tp-slot-row`** + **`.tp-slot-minutes`** + **`.min-chip`** — expandable hour/minute slot picker
- **`.tp-slot.tp-slot-busy`** + **`.tp-slot-busy-label`** — unavailable hour with conflict reason
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
| Athlete · Personal | "Request sent · coach has 24h to approve" | `athlete/calendar.html` |
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
| GET | `/api/v1.0.0/athlete/coaches/{id}/available-slots?date={date}&duration={min}` | Personal slots for date |
| GET | `/api/v1.0.0/athlete/coaches/{id}/group-sessions?template={id}` | Upcoming group instances for template |
| POST | `/api/v1.0.0/athlete/booking-requests` | Athlete sends booking request (personal or group join) |
| GET | `/api/v1.0.0/coach/available-slots?date={date}&duration={min}` | Coach's own slots for personal invite/schedule |
| POST | `/api/v1.0.0/coach/invites` | Create external invite (returns share link) |
| POST | `/api/v1.0.0/coach/schedule-requests` | Send schedule request to existing in-app athlete |

Detailed payloads + response shapes go to `poly-backend/docs/booking-flow-api.md`.

---

## 8. Business rules

- **24h response window** — both athlete-requested and coach-scheduled requests auto-expire if not actioned within 24h. Configurable per coach in future.
- **Funds hold** — athlete-requested personal/group: amount held from athlete balance immediately on Send. Released to coach after session completes (24h post-end). Refunded if coach declines or cancels.
- **Cancellation policy** — athlete: free cancel up to 24h before session; coach: must cancel via Calendar (different flow). Cash sessions: no hold, no refund logic; coach marks paid post-session.
- **Sheet content per flow** is determined client-side from `inviteMode` URL param (`invite` / `schedule`) on coach side, and from session type on athlete side. Backend doesn't need to know which sheet variant.
- **Personal mode in `s-booking`** uses 15-min granularity by default — coaches with non-standard session lengths (45 min, 90 min) still get :00/:15/:30/:45 anchor points; backend respects session duration when sending the request.
- **Group session full** — locked row, no tap, "Full · 10/10" label in red. Athlete cannot join.

---

## 9. Edge cases

- **All day busy for personal** — `s-booking` shows `.bk-empty` state with "Pick another date" hint (day-strip remains visible at top).
- **Template has no scheduled group sessions** — `s-invite-time-group` shows empty state with "Schedule one first" CTA (coach action).
- **Athlete balance insufficient at Send tap** — sheet stays open, inline error replaces info-line with "Top up to send — €30 short", action `[Top up]` links to balance flow.
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

---

## 12. Design decisions log

- **2026-05-12** — Final booking confirmation = bottom sheet (auto-height), never push screen. Unified across athlete personal + group, coach invite + schedule. Memory: `feedback_booking_confirm_pattern`.
- **2026-05-12** — Personal slot picker uses expandable hour rows + 15-min chips (mirrors `coach/sessions.html` Select time pattern). Replaces flat 60-min slots.
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
