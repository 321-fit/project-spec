# Self-paced training — shipped on Android + backend · hand-off for iOS

Date: 2026-08-19 · Author: pairing session with Yuri
Spec: [`specs/self-paced.md`](../specs/self-paced.md) ·
API: [`poly-backend/docs/self-paced-api.md`](https://github.com/321-fit/poly-backend/blob/main/docs/self-paced-api.md) ·
Prototype: [`flows/shared/self-paced.html`](../prototypes/flows/shared/self-paced.html) +
[`flows/coach/sessions.html#s-detail-selfpaced`](../prototypes/flows/coach/sessions.html) ·
Journey: [`flows/journeys/self-paced.html`](../prototypes/flows/journeys/self-paced.html)

Same shape as [the packages hand-off](./2026-08-12-session-packages-coach-android.md): what is
real, what iOS has to build, and — importantly here — **what not to copy**, because the flow was
walked end to end on 2026-08-18 and ten defects came out of it. iOS should build from the
prototype and this document, not from the Android screens as they stand today.

---

## 1. Status by platform

| | Backend | Android | iOS |
|---|---|---|---|
| Coach: offering as the 3rd training type | ✅ | ✅ | ⬜ |
| Coach: batch hub (Set up / Review / Active) | ✅ | ✅ | ⬜ |
| Coach: setup builder + focused step editor | ✅ | ✅ | ⬜ |
| Coach: video source sheet · trim · Mux upload · library | ✅ | ✅ | ⬜ |
| Coach: review submission → finish | ✅ | ✅ | ⬜ |
| Coach: per-client history | ✅ | ✅ | ⬜ |
| **Coach: template detail (per-template athlete roster)** | ✅ data | ❌ **missing** | ⬜ |
| Athlete: catalog card + day-only booking sheet | ✅ | ✅ | ⬜ |
| Athlete: my self-paced list, welcome, reschedule, cancel | ✅ | ✅ | ⬜ |
| Athlete: sequenced player | ✅ n/a | ✅ | ⬜ |
| Athlete: complete (structured feedback + clip) → submit | ✅ | ✅ | ⬜ |
| Comments thread (both sides) | ⚠️ empty — see §4 | ⚠️ | ⬜ |
| Dashboard + Inbox integration | ✅ | ✅ | ⬜ |
| Money: charge, coach earning, ledger rows | ❌ **absent** | n/a | ⬜ |
| Self-paced **packages** | ❌ 422 by design | n/a | n/a |

Backend and Android are on `main`. iOS has issues from the original breakdown
(`321fit_ios` #372–374, #377–380) and none of it built.

## 2. What iOS needs to build (coach)

In dependency order:

1. **Offering = the 3rd type in the session form** (`coach/sessions.html#s-create`). Selecting
   Self-paced hides Location and the calendar note, shows the explainer, and relabels Duration →
   "Estimated time (optional)". **Payment stays** — card / cash / both (see §5).
2. **Template detail** — `sessions.html#s-detail-selfpaced`. Build this; Android skips straight to
   the edit form and that is the single biggest miss. It is the per-template roster ordered by what
   the coach owes: *Needs a plan* (bought, waiting) → *With athlete* (sent · due, progress) →
   *Needs review* (submitted · clip) → *Done* collapsed to one tile. Rows deep-link into the
   builder / review rather than duplicating them. Footer CTA "Offer to a client".
3. **Batch hub** — three tabs over the same items filtered by state, reached from the dashboard row.
4. **Setup builder** — master screen: workout title, welcome note, the day (read-only, the athlete
   picked it), reorderable step list, Send.
5. **Step editor** — focused, "Step N of M ‹ ›", name · video · **independent** Reps×sets and Timer
   toggles (both / either / neither) · independent Rest after · cues.
6. **Video sub-flow** — source sheet (record / upload / library) → optional trim → Mux upload.
   Shared with the athlete's proof clip.
7. **Review** — the athlete's submission (clip, intensity, technique) + rating + feedback → Finish.
8. **Client history** and **video library**.

## 2a. What iOS needs to build (athlete)

1. **Catalog card** in Book training — own Self-paced section, violet header, "Self-paced · do it
   anytime" strip (clock icon; deliberately *not* "Online").
2. **Booking sheet** — day picker, **no time grid**, note, pay. Must handle a **cash** offering:
   nothing is deducted and the sheet must not demand a balance top-up (Android gets this wrong
   today, see §4).
3. **My self-paced list** — grouped by status; two doors (dashboard aggregate, Coach Detail filtered).
4. **Welcome** — plan overview, the day + reschedule sheet, cancel, Start. Coach-initiated and
   unpaid → CTA is "Pay €X & start".
5. **Player** — get-ready 3-2-1 (voiced) → work → rest (voiced, auto-flow) → repeat per set → next
   exercise. One focus, one action per phase, one thin segment bar.
6. **Complete** — intensity + technique (first time only), optional clip, note → Submit.
7. **Comments thread** — the session's home, with submission and review as anchor messages.

## 3. Contract notes that are easy to get wrong

- **Three id spaces.** `offeringId` (the template) ≠ `bookingId` (one athlete's instance) ≠
  `athleteProfileId` / `userId`. The client-history endpoint takes the **athlete profile** id;
  messaging takes the **user** id. Each mix-up produces a plausible wrong answer, never an error.
- **Day-bound, never time-bound.** `scheduledDay` is a date. There is no slot, no duration on the
  booking, and the coach's calendar never shows it.
- **Lifecycle** `requested → ready → submitted → finished`, plus `cancelled` before submit.
  `send` flips requested→ready, `submit` ready→submitted, `review` submitted→finished.
- **Prepaid unless cash.** Booking deducts the price from the athlete's balance immediately —
  *except* when the offering's `paymentType` is `cash`, where the booking simply stays unpaid
  (`paid_at` null) and the coach collects later.
- **Refunds:** cancel while `requested` → full refund; cancel after the coach built it → none.
  The "coach never set it up → auto-refund" rule is **specified but not implemented** (§4).
- **A re-do is free and silent.** A bought session is the athlete's forever, but feedback to the
  coach is one-time — a repeat skips the report, clip and submit.

## 4. Do not copy Android — the ten defects found on 2026-08-18

Full detail in the session memory; the short list, so iOS builds them right the first time:

1. **Money never reaches the coach.** The athlete is debited but no `transaction` row is written —
   no charge, no coach earning; Earnings stays at zero. Only refunds write a row. Backend fix owed.
2. **The comments thread has no anchor messages.** `GET .../comments` returns `[]` after both
   submit and review, though the thread is specified as the session's home. Android fakes the
   athlete's submission card client-side; the coach sees an empty thread with athlete-voiced copy.
3. **The 2-day build window is unenforced** — the booking sheet promises it and an automatic
   refund, but the day picker allows *today*, the coach's queue shows no deadline, and no job
   auto-cancels.
4. **No athlete-only calendar block**, although two screens say "1h block · do it anytime that day".
5. **The athlete's Home does not refresh after booking** — the balance stays stale until restart.
6. **Copy assumes "she"** ("she's preparing it", "done from her note"). No gender data exists.
7. **"Price from" ignores self-paced offerings** — three surfaces show three different numbers.
8. **The offering form has no "Estimated time"**, though the field exists in the model and API.
9. **The player has no get-ready 3-2-1**, which is spec-locked with voice.
10. **List cards omit the day** in a day-bound product.

## 5. Decisions taken during the build

- **Cash is allowed for self-paced (2026-08-19).** A draft of the prototype had removed it; the
  owner reinstated it. Reasoning: the booking is still a request the coach accepts or declines, so
  the method changes nothing about their control — and the realistic case is offline, a coach
  selling a self-paced session right after a live one and taking the money by hand. Card deducts
  from the balance at booking, cash is collected later like any other cash session. Backend already
  behaved this way; the prototype, spec §8 and the Android form were corrected to match.
- **The sport picker is not limited to "My sports" (2026-08-19).** What a coach teaches is a
  profile setting; what one session is about is a per-session choice. The picker lists the whole
  catalogue plus the coach's custom sports, and the form preselects their first sport. iOS shares
  this form — do not filter by profile there either.
- Type colour: **Self-paced = violet** (`--fit-color-violet-*` / `FitColors` violet ramp), header
  gradient only, alongside Personal=teal and Group=blue.

## 6. Open backend gaps both clients will hit

- Money (§4.1) and thread anchors (§4.2) — the two that need a backend change before either client
  can look right.
- The setup-window job (§4.3) and the athlete-only calendar event (§4.4).
- Missed-day and due-reminder notification categories are specified but absent from the catalogue.
- **Packages cannot address self-paced**: an offer is keyed on `training_session_id`, and a
  self-paced offering is a different table. Needs a second key before any UI.
- Card purchase has never been exercised — only the cash and balance paths have run against a real
  backend.
