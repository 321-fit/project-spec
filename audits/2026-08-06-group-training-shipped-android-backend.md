# Group training — what shipped on Android + backend (iOS hand-off)

> Date: 2026-08-06 · Scope: group training, template detail, event completion, review queue
> Android: `321fit_android_new` `main` @ `eb4546a` + open PR #144 · Backend: `poly-backend` `dev2` + open PR #887
> Last updated: 2026-08-07
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

### 2.3 Scope: every change to a recurring session asks how far it reaches

A group occurrence belongs to a **placement**, so any change to one raises the same
question: this date, this and following, or all. iOS must ask it in all four places —
they were each answered differently on Android before this was fixed, and that
inconsistency is the bug to avoid, not a detail.

| Where | What it does |
|---|---|
| Drawer → Reschedule | asks (already did) |
| Drawer → Cancel | asks (already did) |
| Drawer → **Edit details** | asks; group occurrences are editable at all only since this |
| **Drag** a block on the grid | asks on drop; dismissing returns the block to its original time, and nothing is sent |
| Template edit (impact sheet) | "only future" vs "all N events" — the answer is the scope, not decoration |

Endpoints:

```
PATCH /coach/training-events/{id}   { …fields…, recurringScope: "this"|"following"|"all" }
POST  /coach/training-events/{id}/cancel      { recurringScope }
POST  /coach/training-events/{id}/reschedule  { recurringScope }
PUT   /coach/training-sessions/{id}           { …fields…, scope: "this"|"following"|"all" }
```

On `PATCH`, only what the session *is* travels across the series — comment, location,
name, price, currency, payment type, note. Datetimes never do: each occurrence owns its
own, and moving a series is Reschedule.

`sessionPlacementId` on the event (list **and** detail) is how the client knows there is
a series to ask about. Null → a one-off → save straight through, no sheet.

**The sheet**: Cancel + Confirm, not a lone "Continue" — it commits, and backing out must
not depend on the handle or the backdrop.

**Refresh after a scoped action.** "Following" and "all" rewrite dates the coach is not
looking at. Refetching only the visible day makes a move that worked look like it failed
the moment they swipe — the rest of the week is cached and keeps the old times. Drop the
whole day cache when the scope reaches past today.

**A repeating date is marked.** The calendar tile carries a small ⟳; without it a series
occurrence and a one-off are indistinguishable, and the difference decides what every
action on that tile will ask. Read `isRecurring` **on the event** — the template's own
flag only says the template has *a* repeating schedule, which would mark a one-off placed
from the same template.

**A scheduling can be named.** `session_placement.label` is optional and displayed as
`Template (label)` — parentheses, not a dash: a dash reads as part of the name, collides
with templates that already contain one, and truncates worse. Composed on read, so
renaming reaches dates that already exist. **A one-off is a placement too** — publishing
"just this date" must go through `POST /{id}/placements` with `oneOffDate`, not create a
bare event, or there is nothing to name and no link back to a schedule.

**Capacity is per date.** `training_event.max_participants` / `min_participants` override
the template's; NULL inherits. They travel with `recurringScope` like any other field, and
the group event edit shows them.

### 2.4 Event completion

- Cash ticks are **staged locally and committed on Complete**. They used to POST per
  tap, which made a mis-tap an irreversible settlement.
- Header is the gradient card from `calendar.html#s-cash`.

### 2.5 Template type is fixed after creation

The edit form let a coach flip Personal ⇄ Group on a template that already had
events; nothing downstream honoured it, so the form was lying. The control is gone —
type is chosen at creation only.

### 2.6 Past group events are read-only

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

### 2.7 Coach-added participants: enrolled or invited (project-spec#34)

| Coach adds | Result |
|---|---|
| CRM contact | enrolled, owes the fee — there is no app for them to accept in |
| athlete with an account | **invited**: spot held, owes nothing, waits for their answer |

`inviteStatus` on both participant DTOs (`pending` / `accepted` / `declined`) — a roster
where everyone looks the same cannot show who has not answered.

```
GET  /athlete/group-events/invites            what is waiting on me
POST /athlete/group-events/{id}/invite/accept  → accepted, fee becomes owed
POST /athlete/group-events/{id}/invite/decline → declined, spot freed, coach notified
                                                 409 INVITE_ANSWERED on a second answer
```

Decided behaviour, worth carrying to iOS verbatim:

- **A pending invite holds the spot** — it stays on the active roster, so `spotsTaken`
  counts it and there is no second concept.
- **Owing starts on acceptance.** Pending is `waiting`; accepting moves it to `cash_unpaid`.
- **Declining notifies the coach** (`athlete_declined_group_invite`) — they picked that
  athlete by hand.
- **No expiry yet** — a pending invite holds its spot until the day.

- **An invitation into a repeating schedule reaches forward.** Inviting an athlete to
  one date invites them from that date on: the anchor row is that date, every later
  occurrence of the same placement gets a *pending hold* so the seats cannot be taken
  while the athlete decides, and dates before the invited one are untouched. Inviting
  the same athlete again to that schedule is refused (`ALREADY_INVITED`) while it is
  unanswered. "Just this date", declining, and the coach revoking all release the holds.
- **The athlete is still asked once.** `GET /athlete/group-events/invites` returns
  anchors only, and the athlete's calendar draws the anchor date alone until they
  answer — the holds are the coach's reach, not sessions the athlete agreed to.
- **Accepting a repeating schedule asks how far the yes reaches.** The invitation is
  always for one date — nothing is drawn on dates nobody agreed to. On accept, a sheet
  offers *Just this date* / *Every one of these — Tuesdays and Thursdays*
  (`?allFuture=true`). `isRecurring` + `recurrenceLabel` ride on the invite list, the
  group detail and the calendar event so the copy is the same wherever it is asked.
- **"Every one of these" means one session per date.** Later dates of the placement are
  joined one per calendar day in the coach's timezone (the occurrence matching the
  invited time wins), and a *pending* invitation on a later date of the same schedule is
  answered by that same yes — leaving it in To reply would ask again for a date already
  agreed to.

On Android the invitation is answered in the Inbox **To reply** tab: coach-initiated
invitations wait on you, athlete-initiated requests wait on somebody else (Waiting).
The same Decline/Join pair appears on the calendar drawer and on the session's own
screen, where the state reads **Invited** — no payment line, since nothing is owed yet.

**Template edits must not rewrite a placement.** `PUT /training-sessions/{id}` only
copies the template's schedule columns onto the primary placement when the request
actually changed the schedule. Otherwise a rename after a series reschedule dragged the
placement back to the old time and the generator materialised a second chain of events —
two sessions on the same day, one schedule.

### 2.8 Time off

A day inside a time-off has **no working hours** — `allowed-hours` returns `[]`, so the
coach's own calendar shades the whole day and nothing can be booked into it. That holds
whether or not the coach chose to cancel the existing bookings: kept events still render,
the rest of the day is closed.

Creating a time-off with "cancel and notify" cancels, **per occurrence**, only the dates
inside the window — 1-on-1 bookings *and* group sessions, with refunds and a push each.
The recurrence rule is never touched: cancelling a fortnight must not end a weekly series.

### 2.9 Day off vs external calendars

The day-off screen must ignore entries synced from Google/Apple. They are the coach's own
commitments, not bookings, and letting one count replaced "Day off · Edit availability"
with a timeline of things nobody can book.

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
| #144 (open) | review queue; publish switched to placements; Choose-session `+` in the top bar; scope on edit/drag/template-edit; own events stop reading as "outside your hours"; template detail shows every schedule |

**Backend** — `poly-backend`

| PR | What |
|---|---|
| #871, #872 | CRM participant identity; `athleteProfileId` on the clients list |
| #875, #881, #883 | `spotsTaken` / `participants` / `eventStatus` / `paymentStatus` / real `isPaid` |
| #876 | athlete catalogue driven by placed events |
| #877 | `availabilitySkipped` |
| #887 (open) | `session_placement` — a template can be scheduled more than once; `sessionPlacementId` on events; `recurringScope` on event edit; "this and following" acts on the placement, not the template |

Prototypes: `prototypes/flows/coach/session-detail.html`,
`prototypes/flows/coach/calendar.html` (`#s-cash`),
`prototypes/flows/coach/dashboard.html` (`#s-review-queue`).

---

## 6. Open product questions

Filed and still unanswered — they touch this area and should be resolved before
iOS builds the affected parts: project-spec **#28**, **#29**, **#30**, **#31**.
