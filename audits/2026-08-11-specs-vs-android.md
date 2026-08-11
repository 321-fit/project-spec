# Specs ↔ Android audit (2026-08-11)

> Baseline: the previous reconciliation was **2026-07-17** (`2026-07-17-spec-vs-implementation-audit.md`),
> and it compared specs against **poly-backend** and **iOS only — never against Android**.
> Since then Android merged 18 PRs (#121 → #144) plus the open #146, and Android is now the most
> complete client. This pass closes that gap.
>
> Trees: `321fit_android_new` main @ 2026-08-10 (+ PR #146) · `poly-backend` (client-groups branch,
> superset of dev2) · specs `project-spec/main`.

## How a finding is tagged

| Tag | Meaning | Action |
|---|---|---|
| `SPEC-FIX` | Android/backend is right, the spec lagged | edit the spec in this pass |
| `ANDROID-BUG` | Android contradicts a decision we took deliberately | GitHub issue, spec unchanged |
| `UNBUILT` | The spec describes something no side ever built | keep, but say so — so iOS doesn't assume it exists |
| `OPEN-Q` | The two disagree because we never decided | bring to the owner |

**Android is a witness, not the canon.** Where it disagrees with a decision we took, the bug is in
Android. Blindly copying it would have canonised poly-backend#836/#856/#858/#861.

---

## Cluster 1 — Calendar & booking

Specs: `coach-calendar.md`, `event-statuses.md`, `athlete-schedule.md`, `booking-flow.md`.
Android: PRs #121, #123, #124, #129/#112, #131, #133 + epic #122 (one shared calendar for both roles).

### 1.1 `coach-calendar.md` § 6 was fiction — `SPEC-FIX` (high)

The spec documented three endpoint families that **exist nowhere on the backend**:
`GET /coach/calendar?date=`, `GET /coach/month-dots?month=`, and the whole `/coach/events` CRUD
(`POST /coach/events`, `PATCH /coach/events/{id}`, `POST /coach/events/{id}/reschedule`,
`DELETE /coach/events/{id}`). The real module is `/coach/training-events/`.

Worse, Android carries the same fiction as **dead code**: `CoachCalendarV2Api.getCoachCalendarDay()`
and `getCoachMonthDots()` declare `/coach/calendar` and `/coach/month-dots`, and neither is called
from anywhere in the app. → `ANDROID-BUG` (low): delete both, or the next developer will assume a
day-endpoint exists.

Shipped surface, verified on both sides:

| Method | Path | What |
|---|---|---|
| `GET` | `/coach/training-events/?start_date&end_date` | the day / week / month fetch — one endpoint, date-ranged |
| `GET` | `/coach/training-events/allowed-hours/?searched_date` | working hours for the off-hours wash |
| `GET` | `/coach/athletes/{id}/occupied-slots/` | the athlete's busy ranges, loaded when a drag starts |
| `POST` | `/coach/training-events/` | create (personal / group) |
| `POST` | `/coach/training-events/create-custom/` | Busy time |
| `PUT` | `/coach/training-events/{id}/` | edit **and** personal reschedule — in place, with `recurring_scope` |
| `PUT` | `/coach/training-events/{id}/reschedule` | group reschedule, scoped, returns participant conflicts |
| `POST` | `/coach/training-events/{id}/cancel` | group cancel, scoped |
| `PATCH` | `/coach/training-events/{id}/change-status/` | accept / decline / cancel a personal event |
| `DELETE` | `/coach/training-events/{id}/` | custom events |
| `POST` | `/coach/training-events/{id}/complete/` · `/submit-cash-payment/` · `/post-confirm/` | completion |

### 1.2 Reschedule does **not** create a new event — `SPEC-FIX` (high)

`event-statuses.md:172` says *"Reschedule always creates a new event, cancels old"*, and
`coach-calendar.md` Flow 4 repeated it. The backend updates the event **in place**
(`UpdateTrainingEventHandler`) and moves its **approval row** instead:

- approved event + a dry field changed → `ApprovalStatus.RESCHEDULED` (not `PENDING`);
- anything else → `PENDING`;
- **CRM client → stays `APPROVED`** — they don't have the app, so they can't answer a re-confirm.
  This rule exists in code and in no spec.

The same line contradicted `event-statuses.md § 5a`, which already lists `rescheduled` as an
`ApprovalStatus` value. Fixed on both sides.

### 1.3 Drag & drop is a different flow than specced — `SPEC-FIX` (high)

Spec Flow 4: drop → confirm sheet *"Reschedule to {new time}?"* → new event in `awaiting`, old
cancelled. What shipped:

- **Personal** — the drop commits **optimistically**, no confirm sheet. Failure snaps the tile back
  and shows the server's message.
- **Group** — the drop opens the **recurring-scope sheet** first (*This session only · This and all
  following · All sessions*); the tile sits at the new time and **nothing reaches the server** until
  the scope is chosen; dismissing puts it back. This was deliberate: dragging used to move one
  occurrence silently while the drawer's Reschedule always asked — the same action answered
  differently depending on how it started.
- **After** a group move the server returns the participants who now have a clash → *"Scheduling
  conflicts — these athletes now have another session at this time"*.
- Drag targeting: the athlete's busy ranges load **on drag start**, an invalid target names its
  reason (*outside working hours* / *slot occupied* / *the athlete is busy*).
- Same-day only still holds — paging is disabled while a drag is in flight.

### 1.4 Event edit: the "open before dev-ready" list is shipped — `SPEC-FIX` (med)

`coach-calendar.md` Flow 12 parked three questions. All three are answered in code:

- re-confirm fires **only** when a dry field actually changed — `datetime | address | price/currency`
  (note is free), which also means **duration** travels as datetime, not as its own field;
- **recurring scope on save** exists (`recurring_scope` on `PUT`), and it ripples only the fields
  that describe *what the session is* — never the datetimes, since each occurrence owns its own;
- notification splits by cause: `coach_rescheduled_training` when the time moved,
  `coach_updated_training` otherwise, **mirrored to WhatsApp** when the athlete allows it.

Group edits gating participant-affecting changes (refunds) is still genuinely open.

### 1.5 The overlap drawer that shipped is a different screen — `SPEC-FIX` + `OPEN-Q`

`coach-calendar.md § 4c` + Flow 11 specify a conflict-resolution drawer: *"Time conflict"* header,
both events listed with Yours/Google badges, primary **Reschedule**, secondary **Ignore external
events** hitting `POST /coach/calendar/external-events/{id}/hide`.

Reality: that endpoint **does not exist on the backend**, and Android's overlap sheet is a plain
**disambiguation list** — *"N events at this time. Tap one to open."* Two overlapping tiles are
hard to hit, so the sheet answers "which one did you mean", not "resolve this clash".

→ `OPEN-Q` for the owner: keep the conflict drawer as the target design (and file it), or accept the
disambiguation list and cut §4c down to it? Marked `UNBUILT` in the spec until answered.

### 1.6 Minimum-participants sheet lives on the calendar — `SPEC-FIX` (low)

A group event that hasn't reached its minimum surfaces as a sheet on the coach's calendar:
*"Minimum not reached · N of M athletes joined · Xh remaining"* → **Proceed with N athletes** or
**Cancel training**. `group-training.md` describes the push that leads here (§ "Min threshold not
met") but the surface itself was documented nowhere.

### 1.7 `athlete-schedule.md` paths — `SPEC-FIX` (low)

`GET /athlete/events/coaches/{id}/occupied-slots` (twice) → real path is
`/athlete/coaches/{id}/occupied-slots`. The day fetch is `start_date`/`end_date`, not `?date=`.
Everything else in this spec — drag-reschedule as a request, `PATCH /athlete/training-events/{id}/reschedule`,
the non-draggable set — matches what shipped.

### 1.8 The travel-buffer client contract is written in no spec — `SPEC-FIX` (med)

`location-picker.md` describes the buffer correctly (commute wings on the coach calendar, invisible
to the athlete). What it doesn't say is the rule that cost us android#133: the coach booking grid
must **not** pass `sessionId` to `available-booking-slots`. With it, the server pre-carves the
candidate home-visit commute and the grid applies it a second time — unlabelled grey bands around
every neighbouring event. **The grid owns the buffer.**

Recorded there, because the athlete side must *not* copy it: `coach/athletes/{id}/occupied-slots`
returns each event's **raw** window, while `athlete/coaches/{id}/occupied-slots` returns it **already
expanded**.

### 1.9 Confirmed correct — no change

24h grid · off-hours wash from `allowed-hours` · cross-role tiles with the role tag and no status
pill · custom events stateless and unlabelled to athletes · same-day-only drag · group tile showing
`taken/max athletes` in the recipient slot · commute wings keyed on the buffer data, not the role
(so a cross-role home visit shows them too).

### Issues to file from this cluster

| Tag | Repo | What |
|---|---|---|
| `ANDROID-BUG` | android | `CoachCalendarV2Api` declares `/coach/calendar` + `/coach/month-dots` — routes that don't exist and are never called. Delete. |
| `ANDROID-BUG` | android | `CalendarGroupDropSheet` is dead: `CoachCalendarConfig.groupDropConflicts` returns `emptyList()` by construction, and the sheet is imported by no screen. Either wire the pre-drop conflict warning or remove it. |
| `OPEN-Q` | — | Overlap: conflict drawer or disambiguation list (§1.5). |

---

## Cluster 2 — Availability, time off, locations

Specs: `vacation-mode.md`, `profile-settings.md` (Available Hours), `location-picker.md`.
Android: PR #137 (time off), #123 (per-day availability location), #139 (map).

### 2.1 Time off is a different module than the spec describes — `SPEC-FIX` (high)

`vacation-mode.md` was written against `POST/GET/DELETE /coach/vacation` and a **single record per
coach**. Shipped:

- the module is **`/coach/time-off`** — `create · list · history · calendar · conflicts · update ·
  cancel · end`, all paginated where they return lists;
- **many time-offs are allowed**, they just may not **overlap** (`409`);
- **cancel and end are separate endpoints** because the history screen distinguishes their outcomes
  (*Cancelled* = never happened / *Ended* = happened, cut short);
- create returns **`conflictingBookings[]`** — what sits inside the window you just claimed;
- there is no 90-day cap.

### 2.2 The deferred "auto-cancel bookings" question shipped — `SPEC-FIX` (med)

`existingBookingsAction: "keep" | "cancel_and_notify"`, asked in the setup flow as *"Bookings in
these dates"* with the refund warning spelled out. The backend cancels **group events through their
own path** — a group session has no athlete of its own and used to stand through the coach's holiday
untouched. Spec had this as "deferred to v2".

Also shipped and unspecced: **reason chips** (🏖 Vacation · 🤕 Injury · 🏆 Competition · Personal) that
pre-fill the 160-char client message. Reason is still not a stored field, exactly as the 07-03 note
intended.

### 2.3 The athlete never learns the coach is away — `SPEC-FIX` + real gap (high)

No DTO carries time off to an athlete. No `vacationStatus`, no "Paused until" badge, no info sheet.
What an athlete actually meets:

- the coach's free slots come back **empty** for those dates (`booking_slots` filters them), and
- a booking attempt is rejected with a **plain `400` whose message is the coach's own client
  message** — not the specced `409 COACH_ON_VACATION` with `returnDate`.

A client cannot render "back on the 19th" from an untyped string. The structured error and the
profile badge are the remaining work; marked as such in the spec instead of reading as shipped.

**poly-backend#861 ("time off blocks nothing on read paths") is substantially fixed** — time off is
now consulted in `booking_slots`, `training_events`, `coach/athletes` and the athlete's booking gate.

### 2.4 Available Hours was a four-bullet stub — `SPEC-FIX` (med)

`profile-settings.md` said "day-of-week + start + end". What shipped: **multiple intervals per day**
(a split morning/evening day is the normal case), a 30-minute minimum, live per-interval validation
(*end before start* / *too short* / *overlap*), an all-days-off banner, the coach's zone with its GMT
offset derived on screen, and **one in-person location per day** — where the wire carries an address
**per interval** and the client writes the day's choice onto each of them. Rewritten, with the
consumers named (booking grid wash, `allowed-hours`, drag validation).

### 2.5 Locations — two of three defects are fixed — `SPEC-FIX` (low)

- ~~default-on-update~~ **fixed**: `UpdateAddressHandler` calls `unset_defaults`, so PUT/PATCH match create;
- default-promotion on delete: implemented;
- **delete-guard still missing** — deleting a location a template points at still orphans it. The
  spec already said so; kept, now with the other two marked done.

---

## Cluster 3 — Clients, CRM, contact import

### 3.1 Import paths and a whole endpoint nobody asked for — `SPEC-FIX` + `OPEN-Q`

- `POST /coach/crm-clients/bulk` → shipped as **`/import`**.
- **`POST /coach/check-contacts` was unspecced**: the dedup/match pass is **server-side**, returning
  `existingPhones / crmPhones / clientPhones` — exactly the three row states the import list renders.
  The spec implied the client works this out from its own data.
- **`POST /coach/bulk-invite` exists on the backend and nobody calls it.** It sends the invites
  server-side (SMS / push / WhatsApp) and reports `{sentSms, sentPush, sentWhatsapp, failed, skipped}`.
  Flow 3d says the opposite — *Invite all N* opens the **native share drawer** with the coach's OneLink
  — and **Android implements the spec**, not the endpoint. Two products for one button.
  → `OPEN-Q`: adopt the server-side blast (and revisit "we never message your contacts automatically",
  plus cost and deliverability), or retire the endpoint. Until then iOS must not build against it.

### 3.2 Stale paths in the clients spec — `SPEC-FIX` (med)

`POST /coach/events` → `/coach/training-events/` · `POST /events/{id}/accept|decline` →
`PATCH /coach/training-events/{id}/change-status` with `approved | declined | cancelled` ·
`POST /coach/payments/cash-paid` → `POST /coach/training-events/{id}/submit-cash-payment/`.

---

## Cluster 4 — Money

### 4.1 Cash settlement is on the event, not the transaction — `SPEC-FIX` (high)

`payments.md` documented `POST /coach/transactions/{id}/mark-paid` as *existing* and `/waive` as
*new*. **Neither exists.** Three shipped paths, by what is being settled:

| What | Endpoint |
|---|---|
| a 1-on-1 cash session | `POST /coach/training-events/{id}/submit-cash-payment/` |
| one participant of a group session | `PATCH /coach/training-events/{id}/participants/{athleteId}` `{action: "mark_paid"\|"waive"}` |
| a pack sold for cash | `POST /coach/package-lots/{id}/mark-cash-received` |

So **waive exists only for group participants** — there is no waive for a 1-on-1 session, and no
transaction-scoped settlement at all.

### 4.2 `ANDROID-BUG` (high) — Earnings settles nothing

`CashEarningDetailV2ViewModel.settle()` flips local state and **never calls the server**. The coach
marks a cash session paid in Earnings, sees it go grey, and the money stays owed. Same defect the
2026-07-17 audit found on iOS; the client-detail and event-drawer paths do call the real endpoints.

### 4.3 `ANDROID-BUG` (high) — "Confirm for athlete" always 400s, and says it worked

Proxy-accept (payments.md Flow J1.5) has no `/coach-confirm` endpoint and no `coach_confirmed`
approval status. Android's Inbox → Waiting sends
`PATCH /coach/training-events/{id}/change-status {status: "coach_confirmed"}`; the handler accepts
`approved | declined | cancelled` **only**, so every call is rejected. The row correctly survives the
failure — but the snackbar *"Invite confirmed for {name}"* is emitted **before** the request and never
retracted. Fix: either build proxy-accept, or send `approved` and let the server decide whether a
coach may approve on the athlete's behalf.

### 4.4 Paths corrected — `SPEC-FIX` (med)

`/athlete/balance/can-afford` → asked **per booking target**: `/athlete/training-events/{id}/can-afford`,
`/athlete/group-events/{id}/can-afford`, `/coach/training-sessions/{id}/can-afford` ·
`/athlete/balance/replenish` → `POST /balance-replenishment` · `/coach/payout-accounts/{id}` →
`/coach/payout-methods/{id}` · **`/athlete/owed` and `/athlete/booked` are shipped** as
`/athlete/owed-sessions` and `/athlete/booked-sessions` (+ detail), no longer "proposed".

---

## Cluster 5 — Identity, profile, onboarding, navigation

Everything here is a spec that describes an API nobody built. None of it is new breakage — it is
July's audit not having looked at these files, plus specs written ahead of the backend.

| Spec | Specced | Reality (checked 2026-08-11) |
|---|---|---|
| `account-access.md` | `/auth/reauth/*`, `/me/login-methods/{email,password,disconnect,phone}/*`, `/me/delete-preflight`, `/me/delete`, `/auth/email-available` | **none exist.** Shipped: `GET /user/me/login-methods`, `POST /user/me/login-methods/{apple\|google\|email}`, `phone/send-otp` → `phone/confirm`, `POST /auth/password/change`, `/auth/password/reset/{request,confirm}`, `/auth/otp/{send,confirm}`, and **`DELETE /user/me`** — no re-auth token, no preflight, **no way to disconnect a provider** |
| `personal-data.md` | `/me/intro-video/*`, `PUT /me/upload-cover` | shipped as **`/coach/cover-media/*`** — `profile-video/upload-url`, `profile-video/complete`, `DELETE profile-video`, `PUT\|DELETE cover-photo` |
| `athlete-profile.md` | `GET /athlete/profile-stats` (TBD) | shipped as **`GET /athlete/activity-stats`** |
| `review-queue.md` | `/coach/events?status=review`, `/{id}/review`, `/{id}/review/undo` | the queue is the training-events list filtered client-side; the write is **`POST /coach/training-events/{id}/post-confirm`** (`/complete/` for groups). **No undo endpoint** — Undo is optimistic-window only |
| `navigation.md` | `GET /navigation/badges` | never built; clients compose badges from per-module counts |
| `onboarding-wizard.md` | `/coach/onboarding/progress`, `/submit` | shipped surface is `PATCH\|PUT /user/onboarding/setup` + `/complete`; step state is derived client-side |
| `invite-coach.md` | `/coach/me/referral-link`, `/referrals/track-open` | shipped as **`GET /referral-token`**; track-open never built. `GET /coach/me/invites` **still undeployed** (poly-backend#832) — Android renders the failure explicitly so "nobody joined" can't be mistaken for "not shipped" |
| `authentication.md` | `/onboarding/phone-number/request`, `/sessions/connect` | `POST /user/onboarding/phone-number/{verify,confirm}`; the voice child session is `POST /auth/token/create-child-session` |
| `messages.md` | `/recipients` and `/unread-count` both "not shipped" | **`/messages/recipients` has since shipped**; `/unread-count` still hasn't, so the badge stays a client-side sum |

`coach-profile.md` and `role-switch.md` were already correct — both explicitly say the endpoints
don't exist and name what replaces them. Nothing to fix.

---

## Cluster 6 — Leftovers

- **Calendar sync, external-event hide** — `POST|DELETE .../external-events/{id}/hide` and the hidden
  list: **none exist; there is no `/coach/calendar` router at all.** Which also settles § 1.5: the
  overlap drawer's *"Ignore external events"* has no backend under it anywhere. Marked in
  `google-apple-calendar.md`, so nobody schedules client work against it.
- **Stripe withdraw** — `POST /coach/stripe-onboarding/payout` → shipped as
  **`POST /coach/payouts/instant`** `{amount, providerKey}`; `GET /coach/stripe-onboarding/payouts`
  lists past ones. The `payout-schedule` bug the spec records is still worth confirming separately.
- **Session packages** — the spec says the backend doc is "to be created". It exists, and so does the
  feature: coach `package-offers` (+ tiers / sell / buyers / renewal), `package-lots/{id}/mark-cash-received`,
  and both sides' per-coach package lists. The spec stays **Draft** deliberately — backend-first is
  the intended order, not a sign the UX is settled.
- **Six specs still said `Android: (future)`** — clients-coaches, dashboard, payments, review-queue,
  coach-maturity, onboarding-wizard. All six have Android modules; pointers replaced with what is
  actually built, including the caveats.
- **Dashboards check out.** `GET /coach/dashboard` (+ sessions-chart, boost/tip dismiss) and the
  athlete's per-block model both match their specs.

---

## Decisions taken (owner, 2026-08-11) — questions below are answered

| # | Question | Decision | Applied |
|---|---|---|---|
| 1 | Overlap: conflict drawer or disambiguation list | **Android's disambiguation list is canon** | `coach-calendar.md` § 4c + Flow 11 rewritten; the bulk "Ignore external events" and its hide endpoints retired in `google-apple-calendar.md` |
| 2 | Contact import: who sends the invites | **The coach shares** — `bulk-invite` retired | `clients-coaches.md`: endpoint marked do-not-use, droppable on the next cleanup |
| 3 | Proxy-accept | **Make it work**, and **gate it to cash** | client fix: android#147 · gate: [poly-backend#890](https://github.com/321-fit/poly-backend/issues/890) |
| 4 | Cash settlement shape | **Build it on the backend** | poly-backend#291 updated with narrowed scope |
| 5 | Account access (re-auth, disconnect, delete preflight) | **Not now** | spec left as-is, marked unbuilt |

### Correction to § 4.3 — proxy-accept is a client bug, not a backend gap

Deeper reading of the write path after the first pass: `ChangeTrainingEventStatusHandler` sets
`approver_profile_id = coach_id` on **every** coach-side status change, and the response builder
derives `isCoachConfirmed = (approver == coach)`. So a coach sending `{"status": "approved"}` **is**
the proxy-accept, and the flag already comes back set. Android's only mistake is the literal it
sends (`coach_confirmed`, which the handler rejects) plus the snackbar firing before the request.

`coach_confirmed` as a stored enum value + audit columns — the original poly-backend#291 scope — is
therefore **not needed**; a second representation of a derived fact only has to be kept in sync.
One genuine hole remained, now closed as a decision: today **any** coach can approve **any** pending
event on the athlete's behalf — including one the athlete would pay for **from their balance**, i.e.
a coach can spend someone else's money without them ever opening the app. **Decided 2026-08-11: gate
it to cash** (`card` / `package` rejected with a typed 400; `both` collapses to cash). It is a guard
in the same handler, not a migration — [poly-backend#890](https://github.com/321-fit/poly-backend/issues/890).

## Questions as originally filed (1–5 now answered above)

1. **Overlap on the coach calendar** (§ 1.5) — keep the conflict-resolution drawer as target design
   (backend work: hide endpoints + the whole `/coach/calendar` router), or accept Android's
   disambiguation list and cut the section down to it?
2. **Contact import — who sends the invites** (§ 3.1)? The backend can blast SMS/WhatsApp/push
   itself (`/coach/bulk-invite`, built); Android and the spec use the coach's own share sheet. One of
   the two has to go. Note the spec currently promises athletes *"we never message your contacts
   automatically"*.
3. **Proxy-accept** (§ 4.3) — build "confirm for the athlete" properly on the backend, or drop the
   button? Today it 400s and lies about it.
4. **Cash settlement shape** (§ 4.1) — do we add transaction-scoped `mark-paid`/`waive` so the ledger
   can settle what it displays, or does Earnings settle through the event it came from? Right now
   Earnings settles nothing at all.
5. **Account access** (Cluster 5) — the whole re-auth model, provider disconnect and the delete
   preflight are unbuilt. Is that a real roadmap item or should the spec be cut to what ships?

### Issues to file (beyond Cluster 1's two)

| Tag | Repo | What |
|---|---|---|
| `ANDROID-BUG` | android | Both of the above — filed as [321fit_android_new#147](https://github.com/321-fit/321fit_android_new/issues/147) |
| `BACKEND` | poly-backend | Cash settlement from the ledger — [poly-backend#291](https://github.com/321-fit/poly-backend/issues/291), scope narrowed 2026-08-11 |
| `BACKEND` | poly-backend | Time off is invisible to athletes: no `vacationStatus`, and the booking rejection is an untyped 400 (§ 2.3) |
| `BACKEND` | poly-backend | `GET /coach/me/invites` still undeployed (#832) — the referral joined-list has no source |
