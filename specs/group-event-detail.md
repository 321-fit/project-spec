# Group Event Detail

> Status: Draft
> Prototype: [coach/calendar.html#s-event](https://321-fit.github.io/project-spec/prototypes/flows/coach/calendar.html#s-event)
> Last updated: 2026-05-25

The **coach-side full-screen detail** for a single group training event. Reached by tapping "View details" (or similar) from the group event drawer (`cal-event-sheet` group variant per [coach-calendar.md](./coach-calendar.md)). Surfaces everything a coach needs to manage their group session: participants list with remove + per-row actions, note to athletes (with edit), share/invite link, ⋯ menu with Reschedule / Cancel.

Distinct from the **drawer** (`cal-event-sheet`) which is a quick-glance status + footer-action sheet. The drawer answers "what's the state, what one action do I take now?". This full-screen answers "show me everything about this event, let me manage participants and content."

## 1. Overview

`s-event` is a push screen with 4 logical zones, top to bottom:

1. **Header** — back chevron + event title + ⋯ overflow menu (3 items: Invite athletes / Reschedule / Cancel training)
2. **Event card** — sport icon + name + datetime + price + location + participants progress bar (`N / max`)
3. **Note to athletes** — single-paragraph note coach added for this session (or empty state placeholder + edit)
4. **Participants section** — list of joined athletes (avatar + name + sport interests), each row supports tap (action sheet: View profile / Send message / Remove), swipe-left (Remove), or batch remove via the × buttons with Undo snackbar
5. **Footer CTA** — "Invite athletes" (opens share sheet)

Three modal surfaces on top:
- **Event share sheet** — pre-filled message preview + copy-link row + iOS-style share targets (WhatsApp / Telegram / Instagram / Messages / More)
- **Note edit sheet** — 200-char textarea + Save + Delete (when note exists)
- **Participant action sheet** — View Profile / Send Message / Remove from Training (destructive)

Plus the existing reschedule + cancel sheets from coach-calendar.md (reused, not redefined here).

Personal events use the drawer-only pattern from coach-calendar.md § Flow 2 (no full-screen detail — there's only one athlete per personal event, drawer covers the surface). This spec applies to **group events only**.

## 2. User Stories

### Coach

- As a coach, when I tap a group event on my calendar, I want one place to see everyone who joined + manage them + send a note about the session — without flipping between screens.
- As a coach, I want a per-participant context menu (View profile / Send message / Remove) so I can take any action without going to the Clients tab.
- As a coach, I want to write a short note ("bring a yoga mat, arrive 5 min early") that athletes see before the session — once, in the event detail, and it propagates to everyone.
- As a coach, I want one tap to share my session's booking link via WhatsApp / Telegram / Messages / etc. — so I can drive bookings to fill empty spots.
- As a coach, when I remove an athlete by mistake, I want a 5-sec Undo snackbar so I can recover without contacting Support.

## 3. System Stories

- As the iOS / Android client, on `s-event` push entry (event_id route param), I call `GET /coach/events/{event_id}` to load full event detail + participants list.
- As the iOS / Android client, on participant row tap, I open a bottom-sheet with 3 actions (View profile / Send message / Remove) routed accordingly.
- As the iOS / Android client, on swipe-left or × tap on a participant row, I add the row to a remove batch + show Undo snackbar; after 5s without Undo, I commit the batch via `DELETE /coach/events/{event_id}/participants/{athlete_id}` (one call per row in the batch). Undo cancels the timer + restores rows.
- As the iOS / Android client, on Note edit Save, I `PATCH /coach/events/{event_id}` with `{ note: "..." }`. On Delete, same but with `note: null`.
- As the iOS / Android client, on Share tap, I generate a deep-link via the existing share link endpoint and pre-fill platform share intent with title + datetime + link.
- As the backend, on `DELETE /coach/events/{event_id}/participants/{athlete_id}`, I refund the athlete (cancellation policy per [payments.md](./payments.md)) + decrement participant count + dispatch a notification to the removed athlete (`coach_removed_you_from_session` — new notification type).

## 4. Flows

### Flow 1: Open event detail from calendar

1. Coach taps a group event on the calendar timeline (timeline tile, per coach-calendar.md § Flow 2).
2. `cal-event-sheet` drawer opens with status + footer actions (Reschedule / Cancel / Message etc.).
3. **For group events**, the drawer footer additionally has a **"View details →"** button (or the entire drawer is wrapped as tappable to push → `s-event`). Recommend an explicit "View details" CTA for affordance clarity.
4. Tap → push to `s-event` with `event_id` route param.
5. Client calls `GET /coach/events/{event_id}` → renders all 4 zones.

### Flow 2: Manage participants (tap, swipe, ×)

1. Coach taps a participant row → bottom sheet with 3 actions:
    - **View profile** → push to athlete detail screen (Clients tab → athlete detail)
    - **Send message** → push to messenger conversation with this athlete
    - **Remove from Training** (destructive) → confirm step (built into the sheet copy or separate sheet — match existing destructive pattern)
2. Alternative: swipe-left on row → reveal "Remove" red button → tap → adds row to remove batch + snackbar "1 athlete removed · Undo" (5s).
3. Alternative: tap × button on row → same as swipe-left action (adds to batch).
4. Multiple removes within 5s → snackbar count updates ("3 athletes removed · Undo"). Undo restores all.
5. After 5s without Undo → batch commits: 1 API call per row to `DELETE /coach/events/{event_id}/participants/{athlete_id}`; participant count updates; refunds processed server-side.

### Flow 3: Edit note to athletes

1. Coach taps the Note row (filled or empty state).
2. `event-note-sheet` opens with textarea (200 char limit) + character counter + Save + Delete.
3. Save → `PATCH /coach/events/{event_id}` with `{ note }` → close sheet → screen updates.
4. Delete (only visible when note exists) → confirm? (cheap action — no confirm in v1) → same PATCH with `note: null`.
5. **Notification to athletes** — when note changes, dispatch optional `coach_updated_session_note` push (low-priority — flag in spec but defer wiring to follow-up issue).

### Flow 4: Share session via deep-link

1. Coach taps "Invite athletes" footer CTA OR opens ⋯ menu → "Invite athletes".
2. `event-share-sheet` opens with:
    - Pre-filled text preview: "Join my {session_name} — {date} at {time} · {location} · €{price} · {spots_left} spots left"
    - Link row showing `321.fit/e/{short_id}` + Copy button
    - Native-style share targets row (WhatsApp / Telegram / Instagram / Messages / More)
3. Tap a share target → launch platform share intent with pre-filled text + link.
4. Tap Copy → copies link to clipboard + transient "Copied" state on button.
5. Done → close sheet.

**Short link generation:** backend mints a short ID (`xK3aB` format) the first time the event is created; same link reused on every share. Append `event_id` to `referral_token` if you want per-coach attribution (out of scope for v1).

### Flow 5: ⋯ overflow menu actions

⋯ menu has 3 items (per the prototype):
- **Invite athletes** → opens `event-share-sheet` (same as Flow 4)
- **Reschedule** → opens `cal-reschedule-sheet` (existing — reused from coach-calendar.md)
- **Cancel training** (destructive) → opens `cal-cancel-sheet` (existing)

Implementation: floating context menu (UIMenu-style on iOS, DropdownMenu on Android), not bottom sheet. Per [feedback_context_menu_pattern](memory) — ⋯ menus with 2-5 short items use floating popover, not full sheet.

## 5. States

### Participants count

| State | UI |
|---|---|
| 0 joined | Empty state (illustration + "No athletes joined yet · Share the link to let athletes book this session.") + Invite athletes CTA still in footer |
| 1–`max-1` joined | Participants list with N rows; section title "Participants (N)" |
| `max` joined (full) | Same as above; share sheet copy reads "0 spots left — full session"; (open Q: do we hide share targets when full? Decision in § 10) |

### Note to athletes

| State | UI |
|---|---|
| Note set | Filled card with note body + edit pencil; tap → edit sheet (Save / Delete) |
| Note empty | Subdued placeholder row "Add a note for athletes" + edit pencil icon |

### Remove batch

| State | UI |
|---|---|
| Idle | No snackbar |
| Active (1-5s after first remove) | Bottom snackbar "N athletes removed · Undo"; rows visually collapse + fade |
| Committed | Snackbar dismisses; rows fully removed; participant count updated |
| Undone | Snackbar dismisses; rows restore to original positions |

## 6. API

Endpoint reference: [`poly-backend/docs/coach-calendar-api.md`](../../poly-backend/docs/coach-calendar-api.md) — extend with group event detail section, or create dedicated `group-event-api.md` if endpoints get numerous.

Live Swagger: https://polybackend-dev-test.up.railway.app/docs

### Endpoints

| Method | Path | Purpose | Status |
|---|---|---|---|
| `GET` | `/api/v1.0.0/coach/events/{event_id}` | Load event + participants (extended) | **Extend existing** with `participants[]` + `note` + `share_link` |
| `PATCH` | `/api/v1.0.0/coach/events/{event_id}` | Update note (and other editable fields) | **Extend existing** PATCH to accept `note: string \| null` |
| `DELETE` | `/api/v1.0.0/coach/events/{event_id}/participants/{athlete_id}` | Remove an athlete (refund per payments.md) | **NEW** |
| `POST` | `/api/v1.0.0/coach/events/{event_id}/share-link` | Mint or retrieve the short link for this event | **NEW** (idempotent — returns existing short link if already minted) |

### Extended `GET /coach/events/{event_id}` response

Add to existing response:
```json
{
  ...existing fields,
  "note": "Please bring a yoga mat..." | null,
  "share_link": "https://321.fit/e/xK3aB",
  "participants": [
    {
      "id": "<athlete-uuid>",
      "first_name": "Anna",
      "last_name": "Kowalski",
      "avatar_url": "<url>" | null,
      "sports": ["fitness"],
      "joined_at": "2026-04-05T10:00:00Z"
    },
    ...
  ],
  "max_participants": 10
}
```

Sort `participants` by `joined_at ASC` (most-recently-joined at bottom).

### `DELETE /coach/events/{event_id}/participants/{athlete_id}` behavior

- Validates `event_id` belongs to the requesting coach AND `athlete_id` is currently a participant
- Removes the participant + decrements stored `participant_count`
- Triggers refund per [`payments.md § Flow G Cancellation & refund`](./payments.md#flow-g--cancellation--refund) — within cancellation window vs late depends on event datetime
- Dispatches notification to the removed athlete — **new category** `coach_removed_you_from_session` (text proposal: "{coach_name} removed you from {session_name} on {date}.") — add to [`notifications-catalog.md`](./notifications-catalog.md) catalog in BE-GED-1
- Returns 204 on success

### `POST /coach/events/{event_id}/share-link` behavior

- Idempotent — returns existing short link if already minted; otherwise creates new entry in `event_share_link` table with `event_id`, `short_id` (5-char alphanumeric), `created_at`
- Response: `{ short_link: "https://321.fit/e/xK3aB", short_id: "xK3aB" }`
- Public route: when an athlete hits `GET /e/{short_id}` on the marketing landing (or via Universal Link / Android App Link in production), backend resolves the short_id → redirects to coach app deep-link `321fit://events/{event_id}` OR web preview page (TBD — for v1, just produce the link; deep-linking infrastructure is a separate epic)

## 7. Business rules

- **Coach can only remove athletes from their own events** — enforced by `event.coach_id == requester.id` check
- **Refund policy** applies to removals — within window: full refund; outside window: partial or no refund per `payments.md § Flow G`
- **Removed athletes get a push notification** + the event disappears from their calendar
- **Note is visible to all current participants** + future joiners (rendered on athlete-side booking flow + on their event detail view, separate spec scope)
- **Note edits don't trigger refund eligibility** — note changes are content-only, not contract-changing
- **Share link is permanent for the event's lifetime** — once minted, same link reused. Athletes who bookmarked it still hit a valid path until the event is cancelled or completed.
- **`participants` and `max_participants` come from the session template** — `max_participants` is read-only on the event (set when event was created from a group template); to change, coach reschedules with a new template

## 8. Edge cases

- **Coach removes the only participant** → empty state appears; participant count back to 0
- **Last athlete in the session leaves via their own cancellation flow** → coach sees the row disappear on next pull-to-refresh; no special handling
- **Coach removes athlete during the session is in progress (`review` state)** → not supported — backend returns 409; UI gates by checking event status before showing × buttons
- **Note edited mid-session** → allowed; current participants see the updated note on next view (or via the future `coach_updated_session_note` push if we wire it)
- **Share link clicked after event was cancelled** → backend `GET /e/{short_id}` resolves but the deep-link destination renders a "Session cancelled" toast on athlete side
- **Two-coach scenario** (event has assistant coach) → not supported in v1; single coach per event
- **Concurrent removes from two devices** → DELETE is idempotent by athlete_id; the second call returns 204 silently or 404 if the first already removed (acceptable degradation)

## 9. Platform notes

### iOS

- `s-event` is a push screen via `Navigation<EventDetailFlow>`. Back gesture returns to the previous screen (calendar drawer dismiss).
- Header ⋯ menu uses `UIMenu` (iOS 14+ native floating menu) — not a bottom sheet — per [feedback_context_menu_pattern](memory).
- Participants list uses `LazyVStack` with swipe-action modifier (`.swipeActions`) for swipe-left remove.
- Note textarea is a SwiftUI `TextEditor` with 200-char limit and live counter.
- Share sheet on iOS uses native `UIActivityViewController` for the actual share intent; the kit's `event-share-sheet` is the **preview** + copy + targets UI; the platform share sheet pops on tap of a target.

### Android

- `s-event` is a Compose Navigation destination.
- Header ⋯ menu uses `DropdownMenu` Composable.
- Participants list is `LazyColumn` with custom swipe-left gesture (via `SwipeableComposable` from accompanist or custom).
- Note textarea is `OutlinedTextField` with 200-char limit + supporting text counter.
- Share intent via `Intent.ACTION_SEND` + targeted package intents for WhatsApp / Telegram / etc.

### Both

- Use `FitParticipant` (existing kit component) for rows.
- Use `FitEmptyState` for 0-participant empty state.
- Use `FitSheet` for note edit + participant action sheets.
- Use `FitToast` / `FitSnackbar` for Undo snackbar.

## 10. Open questions

1. **Drawer → s-event entry point** — currently the prototype's calendar drawer doesn't have an explicit "View details" CTA pushing to s-event. Decision: **add a "View details →" footer button on `cal-event-sheet` group variant** (left of the action button), OR make the entire drawer header tappable. **Default proposal:** explicit CTA for affordance clarity.
2. **Hide share targets when session full?** When `participants.length == max_participants`, the share sheet still shows targets — which is misleading (can't book a full session). **Default proposal:** show a disabled "Session full" banner above the targets row + dim/disable the platform share buttons. Allow Copy Link (people may share to a waitlist).
3. **Note change push notification** — `coach_updated_session_note` was sketched in § Flow 3 but not added to the notifications catalog. Decision: **defer to a follow-up issue** (or never ship; let athletes discover via next view). Flag in catalog open questions.
4. **Assistant coach support** — multiple coaches per group event (e.g., one lead + one trainee). Not in v1. Backlog.
5. **Two-tier sessions** (e.g., "Beginner" + "Advanced" tracks within one slot) — not in v1. Backlog.

## a11y identifiers

All registered in [`architecture/accessibility-identifiers.md`](../architecture/accessibility-identifiers.md) under a new `coach.event-detail.*` scope. Examples:
- `coach.event-detail.back` — back chevron
- `coach.event-detail.overflow` — ⋯ icon-btn
- `coach.event-detail.overflow.invite` / `.reschedule` / `.cancel` — overflow menu items
- `coach.event-detail.note` — tappable note row
- `coach.event-detail.note.textarea` — edit sheet textarea
- `coach.event-detail.note.save` / `.delete` — edit sheet actions
- `coach.event-detail.participants.row` — generic participant row (disambiguate via athlete id)
- `coach.event-detail.participants.row.remove` — × button or swipe action
- `coach.event-detail.participants.sheet.profile` / `.message` / `.remove` — bottom sheet actions
- `coach.event-detail.undo` — Undo snackbar action
- `coach.event-detail.share.cta` — footer "Invite athletes" CTA
- `coach.event-detail.share.sheet.copy` — Copy link button in share sheet
- `coach.event-detail.share.sheet.target` — generic share target (disambiguate via platform name)

## Related specs / references

- [`coach-calendar.md`](./coach-calendar.md) — calendar timeline + drawer (entry point to this screen)
- [`payments.md`](./payments.md) — Flow G refund on remove
- [`notifications-catalog.md`](./notifications-catalog.md) — `coach_removed_you_from_session` new category (added in BE-GED-1)
- [`session-creation.md`](./session-creation.md) — `max_participants` set on group template at create time
