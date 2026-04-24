# Review Queue

> Status: Draft
> Prototype: [flows/coach/dashboard.html](https://321-fit.github.io/project-spec/prototypes/flows/coach/dashboard.html) (push-screen `#s-review-queue`)
> Component library: [design-tokens/docs/components.md](../../design-tokens/docs/components.md)
> Last updated: 2026-04-24
> Implementation:
> - iOS:     [321fit_ios/docs/review-queue-ios.md] (to be created)
> - Backend: [poly-backend/docs/review-queue-backend.md] (to be created)
> - Android: (future)

---

## 1. Overview

A dedicated triage screen for coaches to mark past sessions as **complete** or **missed**. Appears when N ≥ 1 sessions have entered the `review` state (session ended but coach hasn't confirmed outcome). Reached from the Dashboard action card "N sessions to review".

Designed as a **batch-processing workflow** — oldest sessions first, inline actions per row, drain-to-empty flow. Not a calendar filter, not a hidden tab. Separate screen so the coach can clear the queue in one focused pass.

---

## 2. User Stories

### Coach

- As a coach with several past sessions to confirm, I want a dedicated list sorted by age so that I can triage them efficiently without hunting through the calendar.
- As a coach marking an outcome, I want to do it inline (tap-to-complete / tap-to-miss) so that I don't have to open each event separately.
- As a coach accidentally tapping wrong action, I want an **Undo** affordance so that mistakes are easy to recover from.
- As a coach needing more context before deciding (athlete notes, history), I want the option to open the full event detail sheet so that I can inform my decision.
- As a coach clearing the last item, I want the screen to transition to a clean empty state and give me a way back so that the flow feels complete.

---

## 3. System Stories

- As the backend, a session must enter `review` state automatically after its scheduled end time, with a **payment-type-aware delay**: cash sessions transition after 10 minutes (prompt cash-collection workflow); card-only sessions transition after 4 hours OR end of coach's local day, whichever comes first. See [event-statuses.md](./event-statuses.md) Flow 3 + scheduled tasks. Coach can mark earlier manually via Calendar event sheet.
- As the backend, the "oldest first" sort is deterministic by `endedAt ASC`.
- As the client, inline actions must be optimistically applied (row fades immediately) with server confirmation within 2 seconds; on error, row is restored + snackbar shown.
- As the backend, `complete` and `missed` outcomes trigger distinct downstream effects (payment release vs. no-show record); these must be reliable and idempotent.
- As the client, Undo must revert the last action within 4 seconds of the snackbar appearing; after that it is no longer reversible from this screen (coach can still edit via Calendar event detail).

---

## 4. Flows

### Flow 1: Entry to review queue

Two entry points (Tier 1 Q8 — payment-type-aware push):

1. **Push from cash event auto-transition (10 min after `endedAt`):** push copy "Mark who paid · {N} sessions" → tap deep-links into `#s-review-queue`. Designed for prompt cash-collection while athletes are still nearby.
2. **Push from card event auto-transition (EOD batched, next morning):** push copy "Yesterday's sessions ready to confirm" → tap deep-links into `#s-review-queue`.
3. **Dashboard action card:** Coach on `#s-dashboard` (state `dst-default`) sees "3 sessions to review · Oldest: 2 days ago" → tap → push to `#s-review-queue`.
4. Queue renders with sessions grouped by date, oldest-first.

**Routing per row type:**
- 1-on-1 cash event row → inline `Mark paid + complete` toggle directly in the queue.
- 1-on-1 card event row → inline `Mark complete` button.
- Group event row (any payment mix) → tap row → opens existing `s-cash` Event Completion screen (defined in [coach-calendar.md](./coach-calendar.md), prototype `flows/coach/calendar.html#s-cash`) for per-participant marking. After completion in `s-cash`, navigate back to queue with that group event removed.

### Flow 2: Mark complete

1. Coach taps row action `Mark complete` (primary brand-gradient button)
2. Row fades + slides out (220 ms) — optimistic UI
3. Server `POST /coach/events/{id}/review` with `{outcome: "complete"}` fires
4. Success → server-side: event status → `finished`; coach earnings eligible for payout; push notification to athlete (optional: "Session confirmed as complete")
5. Bottom snackbar appears: `Sarah — marked complete · Undo` (4 sec)
6. Tap Undo → reverses optimistic hide, sends `POST /coach/events/{id}/review/undo`; server-side restores to `review` state

### Flow 3: Mark missed

1. Coach taps row action `Missed` (low-tier outlined destructive button — red border, transparent bg)
2. Same optimistic fade-out + snackbar pattern
3. Server → event status `missed`; business impact per [payments.md](./payments.md): whether athlete is charged or not depends on policy (TBD).

### Flow 4: Open event detail

1. Coach taps the row **body** (not the action buttons) → opens unified event sheet (`FitUI.openEventSheet(state: 'review', event: {...})`).
2. Sheet shows athlete avatar, training name, time, location, price, Mark complete button.
3. Actions in sheet dispatch the same mark-complete/missed flows. Sheet closes after action.

### Flow 5: Drain to empty

1. Coach handles all rows → queue empties
2. Screen transitions to empty state: illustration + "All reviews done" title + "Past sessions show up here so you can mark them complete or missed." subtitle
3. User navigates back to Dashboard; Dashboard re-fetches snapshot; action card no longer appears.

### Flow 6: Undo after drain-to-empty

1. Coach marks last item complete → queue transitions to empty
2. Snackbar still visible for 4 sec
3. Tap Undo → undone item re-appears in queue; queue state returns from empty
4. If user navigates away before undo, the undo is lost (snackbar dismissed)

### Flow 7: Single-item queue

1. N = 1 (e.g., only yesterday's session needs review)
2. Navigating from Dashboard still lands on `#s-review-queue` (not event detail directly) — consistency over one-tap saving
3. User sees a single card in the queue; acts on it; drains to empty

---

## 5. States

| State class | When | What's shown | Transitions out |
|---|---|---|---|
| `rvl-default` | N ≥ 1 (multi-item filled queue) | Grouped by date, oldest first, inline actions | → `rvl-empty` on last-item drain |
| `rvl-single` | N = 1 (demo variant of `default` layout with single card) | Same layout, 1 card | → `rvl-empty` on action |
| `rvl-empty` | N = 0 (all cleared or never had any) | Illustration + title + subtitle | (user backs out) |
| `rvl-loading` | Initial fetch, no cached data | 2–3 skeleton cards (FitSkeleton family) | → live state on fetch success |

Note: no dedicated error state here — inline banner via snackbar on network failure + queue remains interactive from cached data if available.

---

## 6. API

### Endpoints

#### `GET /coach/events?status=review`

Returns list of events in `review` state for the authenticated coach.

**Query params:**
- `status=review` (required for this screen)
- `sort=ended_at_asc` (default; oldest first)
- `limit` / `offset` for pagination (optional; default unlimited for now since N is typically < 20)

**Response 200 — array of `ReviewQueueEvent`:**

```json
[
  {
    "id":          UUID,
    "athlete":     { "id": UUID, "name": "Tom N.", "avatar": "TN" },
    "training":    { "name": "Boxing Training", "durationMin": 60, "sport": "boxing" },
    "scheduledAt": ISO8601,
    "endedAt":     ISO8601,
    "location":    "GYM Bro",
    "price":       40.0,
    "currency":    "EUR",
    "paymentType": "cash" | "card",
    "ageText":     "Ended 2 days ago"   // server-precomputed relative time
  },
  ...
]
```

**Response 200 (empty):** `[]`

**Response 401 / 500:** standard error handling.

#### `POST /coach/events/{id}/review`

Marks the event with the supplied outcome.

**Body:**
```json
{ "outcome": "complete" | "missed" }
```

**Response 200:** updated `EventModel` (event's new status is `finished` or `missed`).
**Response 404:** event not in review state (already handled) → client treats as stale, removes row from queue.
**Response 409:** another device already resolved this event → same handling as 404.

#### `POST /coach/events/{id}/review/undo`

Restores a recently resolved event back to `review` state. Valid within 30 seconds of the original `review` call.

**Body:** empty.
**Response 200:** event back in `review`.
**Response 410:** too late to undo (more than 30 s passed or subsequent action taken) → client shows "Can't undo — use Calendar to edit" snackbar.

### Push / side-effects

- `complete` → event `status: finished`, triggers payment release per [payments.md](./payments.md)
- `missed` → event `status: missed`, no-show policy per [payments.md](./payments.md); possibly athlete re-balance refund
- Both push a notification to the athlete (if opted in)

---

## 7. Business rules

- **Auto-transition to review (Tier 1 Q8 — payment-type-aware):**
  - **Cash event** (any with at least one cash participant for groups): `endedAt + 10 min` → `review`. Triggers push: "Mark who paid · {N} sessions" (batched if multiple cash events transitioned within the window).
  - **Card-only event**: `endedAt + 4h` OR end of coach's local day (00:00 of next day in coach TZ), whichever comes first. Triggers batched morning push: "Yesterday's sessions ready to confirm".
  - Coach can mark earlier through Calendar event sheet — auto-transition only applies to forgotten events.
- **Grouping:** events grouped by date of `endedAt` in coach's local TZ. Group header text: weekday + ordinal date (e.g., "Tuesday, Apr 22").
- **Sorting:** within group, oldest first; groups themselves oldest-first.
- **"Ended N ago":** precomputed by server using relative time: "Ended N days ago" / "Ended yesterday" / "Ended N hours ago". Client displays verbatim.
- **Missed doesn't cancel payment automatically.** Policy: if cash, coach still has the right to collect (Mark Paid on Clients separately); if card, backend may reverse the hold per business rules (spec here doesn't define — see `payments.md`).
- **Undo window: 30 s** from the mark-action. Client shows 4 s snackbar; server-side holds for 30 s. Rationale: user's UI Undo is 4 s, but server-side grace is longer for race conditions.
- **No bulk-select in MVP.** If coach has 20+ items, still one-by-one. Revisit after user feedback.

---

## 8. Edge cases

- **Athlete disputes an outcome:** out of scope for v1. If coach marks missed but athlete disputes later, an admin or in-app support workflow resolves (future spec).
- **Event cancelled after entering review:** shouldn't happen (cancelled events don't enter review). If it does due to race → server returns 404/409 on review → client drops row.
- **Coach deletes account mid-queue:** auth expires → re-auth flow; queue is lost, but server retains events for admin reconciliation.
- **Two devices acting on the same event simultaneously:** last-write-wins at server; second device gets 409 and drops the row; both devices converge on next fetch.
- **Offline mark-complete:** not supported in v1. If user is offline when tapping action → snackbar "No connection, try again when online"; row does not fade until confirmed.
- **Network loss after optimistic fade but before server confirms:** row reappears; snackbar "Couldn't save · Retry"; manual retry by user.

---

## 9. Platform notes

- **iOS:** SwiftUI `List` with `.swipeActions` optional enhancement (swipe-to-complete / swipe-to-miss) — mobile-native, discoverable. Haptic on action: `.light` for complete, `.medium` for missed.
- **Android:** Compose `LazyColumn` with per-row action row. Optional swipe via `SwipeToDismissBox`. Haptic via `HapticFeedbackConstants.CONTEXT_CLICK`.
- **Backend:** review-state transition scheduled via Celery beat. Two cadences per Q8: cash sweep every 5 min (precision matters for the 10-min cash push), card sweep every 30 min (looser since EOD batch). Idempotency essential.

---

## 10. Open questions

- [x] ~~**Exact auto-transition delay:**~~ RESOLVED in Tier 1 Q8: payment-type-aware. Cash = +10 min with prompt push. Card = +4h or EOD (whichever first), batched morning push. Adjust based on real data after launch.
- [x] ~~**Missed policy — refund or not?**~~ RESOLVED in Tier 1 Q2: 100% to coach (strict no-show forfeit). See [payments.md](./payments.md) cancellation table.
- [x] ~~**Push notification copy to athlete:**~~ RESOLVED in Tier 1 Q1: `review → finished` = informational push (athlete already saw `finished` optimistically). `review → missed` = mandatory correction push. See [event-statuses.md](./event-statuses.md) Push table.
- [ ] **Swipe gestures in MVP?** Or inline buttons only (as prototype)? Prototype uses buttons; native platforms could add swipe as bonus. **Owner:** design.
- [ ] **Bulk actions (select all → complete)?** Deferred per MVP scope rule. Revisit after 4 weeks of usage data.

---

## Related specs / references

- [dashboard.md](./dashboard.md) — entry point (action card "N sessions to review")
- [event-statuses.md](./event-statuses.md) — 6-state event system (review is one of the 6)
- [payments.md](./payments.md) — payout release on complete, missed-policy
- [coach-calendar.md](./coach-calendar.md) — alternative path (coach can also mark complete from an event sheet in calendar; this queue is the batch-triage path)
- Prototype screen: `#s-review-queue` within [`flows/coach/dashboard.html`](https://321-fit.github.io/project-spec/prototypes/flows/coach/dashboard.html)
- Components: FitButton (primary `Mark complete` + low-tier outlined destructive `Missed`), FitAvatar, FitBadge (Cash/Card), FitEmptyState, FitSkeleton family, FitSnackbar (with Undo), FitUI.openEventSheet. See [design-tokens/docs/components.md](../../design-tokens/docs/components.md).
