# Group training — what shipped on Android + backend (iOS hand-off)

> Date: 2026-08-06 · Scope: group training, template detail, event completion, review queue
> Android: `321fit_android_new` `main` @ `eb4546a` + open PR #144 · Backend: `poly-backend` `dev2` + open PR #887
> Purpose: everything below exists on Android and on the backend and **does not exist on iOS**. This is the parity list.

Read this before writing the iOS tickets. It records what was actually built,
which endpoints back it, and — importantly — which decisions are *not* obvious
from the endpoints alone.

---

## 1. The model change that everything else rests on

**A template is a definition. A placement is one scheduling of it. Events belong
to a placement and point back at the template.**

Before: the recurrence lived on `training_session` itself, so "put this group on
the calendar" and "edit the template" were the same write. Placing a template a
second time rewrote the first rule, and once events existed the backend refused
it outright:

```
1st publish, weekly Friday   → 200
2nd publish, weekly Tuesday  → 422  impactfulFields: ["recurringDays"]
```

A group template could be scheduled **once, ever**. `session_placement` now owns
the rule; `training_event.session_placement_id` records which placement produced
each event.

```
GET  /api/v1.0.0/coach/training-sessions/{id}/placements
POST /api/v1.0.0/coach/training-sessions/{id}/placements
     { startTime, isRecurring, recurringDays?, recurringEndDate?, oneOffDate? }
     → 201 { id, trainingSessionId, startTime, isRecurring, recurringDays,
             recurringEndDate, oneOffDate, eventCount,
             externalCalendarConflicts, ownCalendarConflicts, availabilitySkipped }
```

**iOS must publish through `POST /{id}/placements`.** `PUT /training-sessions/{id}`
still works and still accepts the schedule — but it means "edit the schedule this
template already has" and edits the *first* placement. It is not the way to add a
second one.

### Backward compatibility (nothing was replaced)

`training_session.is_recurring / recurring_days / recurring_time / recurring_until`
are still written and still returned. The response fields
`isRecurring / recurringDays / recurringTime / recurringEndDate` are unchanged in
name and type — they are now *derived from the first placement*. `placements` is
a new additive array carrying the complete answer.

One inherent limit: a template with two placements cannot be described by one set
of legacy fields, so a client reading only those sees the **first** placement.
That degrades gracefully — the value is true, just partial. New iOS work should
read `placements`.

---

## 2. Coach screens Android has and iOS does not

### 2.1 Template detail — `session-detail.html`

Tapping a template used to drop the coach straight into the edit form, so the only
way to see what a template had produced was to read the calendar.

- Summary card, with **Edit as a full-bleed row of the card**, not a separate button
- `Upcoming` / `Past` segmented tabs — **no counts on the tabs** (they were noise)
- The recurring rule collapses into one card; **`17 dates ›` opens its own screen**,
  it does not expand in place
- A date row opens the calendar on that day and time
- `⋯` uses the app's floating menu (Schedule / Edit / Delete), not a platform dropdown
- No stats strip. It was tried and cut.

Android: `ui/screens/coach_training_sessions_v2/CoachTrainingSessionsV2DetailScreen.kt`,
`…SeriesScreen.kt`, `components/TemplateSummaryCard.kt`.

### 2.2 Review queue — `dashboard.html#s-review-queue` (PR #144, open)

The dashboard's "N sessions to review" card led nowhere; settling a past session
meant remembering its date and finding it in the calendar.

- Grouped by day, **oldest first**
- **1-on-1 row**: `Missed` / `Mark complete` inline — one verdict, settle from the row
- **Group row**: a single `Complete training` that opens the completion screen.
  A group is a roster of cash to settle; closing it from the row would silently
  waive whoever had not paid. This distinction matters — do not give iOS group rows
  the inline verdict pair.
- Row tap → completion screen (cash roster, participants)

No new endpoint: the queue is `GET /coach/training-events/?startDate&endDate`
filtered on `eventStatus == "review"`. Actions are the existing post-confirm:

```
POST /api/v1.0.0/coach/training-events/{id}/post-confirm   { confirm, feedback }
     confirm=true  → finished
     confirm=false → missed
```

### 2.3 Event completion

- Cash ticks are **staged locally and committed on Complete**. They used to POST per
  tap, which made a mis-tap an irreversible settlement.
- Header is the gradient card from `calendar.html#s-cash`.

### 2.4 Template type is fixed after creation

The edit form let a coach flip Personal ⇄ Group on a template that already had
events; nothing downstream honoured it, so the form was lying. The control is gone —
type is chosen at creation only.

### 2.5 Past group events are read-only

Edit — from the menu and from the calendar drawer chevron — is blocked for anything
that started before today.

---

## 3. Fields the backend added (Android consumes, iOS should too)

On the coach calendar list item (`GET /coach/training-events/`):

| Field | What it is |
|---|---|
| `spotsTaken` | occupancy without a second request per event |
| `participants[]` | `{ id, firstName, lastName, avatarUrl, isCrm }` — roster preview |
| `eventStatus` | canonical lifecycle: `planned / request / awaiting / review / finished / missed / cancelled`. Distinct from `status`, which is the *approval* status. Only this one can say "ended but not settled". |
| `paymentStatus` | where a 1-on-1 booking stands on money |
| `isPaid` | was hard-coded `false`; now real |

Other backend behaviour worth knowing:

- **Athlete group catalogue is driven by events, not templates.** A template with no
  placement is invisible to athletes.
- **`availabilitySkipped`** — dates dropped because they fall outside the coach's
  working hours. Reported, not negotiable. Publish/placement responses carry it and
  the coach must be *told*, same review page as external conflicts.
- **CRM participants** resolve to a real identity on a group roster; the participant
  `id` is the athlete profile id, or the participant row id for a CRM contact, with
  `isCrm` saying which.

---

## 4. Known gaps — not built anywhere yet

These are open on the backend/product side. iOS should not try to build around them.

1. **Cash 1-on-1 sessions send no "session ended" push** — poly-backend#886.
   Card sessions get `TRAINING_SESSION_SUCCESSFUL_*`, but those fire from the money
   transfer, not from the session ending, so cash never triggers anything. The push
   should deep-link to the calendar on that event with the drawer open.
2. **`group_event_lifecycle` still edits the template.** "Cancel this and following"
   writes `template.is_recurring` / `recurring_until`. Works today because the
   columns still exist; must move onto the placement before they are dropped.
3. **Dropping the template's schedule columns** is deliberately deferred until every
   client reads `placements`. Production is live and installed clients still read
   the legacy fields.

---

## 5. Source PRs

**Android** — `321fit_android_new`

| PR | What |
|---|---|
| #134 | unopenable events, silent publish skips, template carrying a schedule |
| #140 | CRM participant vanished from the roster; "In session" never matched |
| #141 | list fields, template detail, completion fixes, locked template type |
| #144 (open) | review queue; publish switched to placements; Choose-session `+` in the top bar |

**Backend** — `poly-backend`

| PR | What |
|---|---|
| #871, #872 | CRM participant identity; `athleteProfileId` on the clients list |
| #875, #881, #883 | `spotsTaken` / `participants` / `eventStatus` / `paymentStatus` / real `isPaid` |
| #876 | athlete catalogue driven by placed events |
| #877 | `availabilitySkipped` |
| #887 (open) | `session_placement` — a template can be scheduled more than once |

Prototypes: `prototypes/flows/coach/session-detail.html`,
`prototypes/flows/coach/calendar.html` (`#s-cash`),
`prototypes/flows/coach/dashboard.html` (`#s-review-queue`).

---

## 6. Open product questions

Filed and still unanswered — they touch this area and should be resolved before
iOS builds the affected parts: project-spec **#28**, **#29**, **#30**, **#31**.
