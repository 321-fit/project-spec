# Self-paced Training (online / async)

> Status: **Approved** — flow prototyped & reviewed, ready for task breakdown. (Deferred from v1: video library, progress-over-time — see §9. Packages are **no longer deferred** — they cover self-paced too, spec'd in [session-packages.md](./session-packages.md); see §8.)
> Prototype: [flows/shared/self-paced.html](https://321-fit.github.io/project-spec/prototypes/flows/shared/self-paced.html) (isolated module; screens split into real surfaces per §5)
> Component library: [design-tokens/docs/components.md](../../design-tokens/docs/components.md)
> Last updated: 2026-08-26
> Implementation:
> - iOS:     [321fit_ios/docs/self-paced-ios.md] (to be created during dev)
> - Android: [321fit_android_new/docs/self-paced-android.md] (to be created during dev)
> - Backend: [poly-backend/docs/self-paced-api.md](https://github.com/321-fit/poly-backend/blob/main/docs/self-paced-api.md)

---

## 1. Overview — what & why

**Self-paced** = a **cheap, online, asynchronous** training type. The coach offers it generically; builds a **personalised workout per athlete** after a booking (or initiates it); the athlete does it on their own time, optionally films themselves; the coach reviews and gives feedback; both can comment per session.

**Why:** a coach's live hours don't scale — they can't train everyone in person. Self-paced lets them, on a chosen day or in gaps, give personal instructions + checks to online athletes → more revenue, and keeps travelling/relocating athletes on a routine. Cheaper than a live session (no live time).

**Key model decisions:**
- It is its **own session type** (alongside Personal / Group) with its **own (lower) price** — NOT a flag on a normal booking.
- The **offering** = a generic bookable catalog entry (name + price, no content). The **content (exercises/videos/instructions) is built per athlete** at fulfilment — because training is individual; one template-for-all doesn't fit.
- Reuses: **Mux** (#116) for coach instruction clips + athlete proof clips; the **invite/booking** surfaces; the **calendar/event** model; **fit-rating**, session cards, outline-note→editor.

---

## 2. User stories

### Coach
- As a coach, I want to **offer** self-paced training as a cheaper online option so I can serve athletes I can't fit into live hours.
- As a coach, when an athlete books it, I want to **build a workout specifically for them** (videos + instructions + per-exercise targets) — not reuse a fixed template.
- As a coach, I want to **batch my reviews** (a chosen day / gaps) in one place, so async coaching is efficient.
- As a coach, I want to **watch the athlete's clip, rate, and leave feedback**, then keep a per-session conversation.

### Athlete
- As an athlete, when I book a coach, I want a clearly-marked **cheaper online self-paced** option that doesn't need a live time slot.
- As an athlete, I want a **clear welcome** (what the coach prepared, how long) and a **guided player** (videos + optional timers) I can do anytime and reschedule freely.
- As an athlete, I want to **optionally upload a clip** of myself + a note, and get the coach's **feedback** in one place.

---

## 3. System stories

- As the backend, **self-paced is its own standalone entity** — a `self_paced_booking` row (NOT a `training_event` carrying a `delivery` discriminator, and there is **no unified** personal/group/self_paced session-type enum). A booking owns ordered **steps** (own `workout_step` rows). Each step: name, optional video asset, **independent** `reps`/`sets` and `timer` targets (both, either, or neither — not mutually exclusive), optional `rest_after`, instructions.
- As the backend, the **offering** is a coach catalog item (name + price); booking it creates a request the coach fulfils.
- As the backend, self-paced bookings are **day-bound, not time-bound**: the booking carries a target **date** (no start time). It lands as a **default 1-hour calendar event visible to the athlete ONLY** — a freely-reschedulable placeholder that is **never placed on the coach's calendar** (no live slot); the coach is notified **only on a day change** (same-day/time reschedule = silent). Rather than a calendar slot, the coach instead sees the **time the workout was completed** in their review/report. Bookings surface in the coach's async hub + the client's record. *(Intended model — fork P6; a backend task exists to build the athlete-only calendar placeholder.)*
- As the backend, the athlete's **completion feedback is structured** (not a free star rating): `intensity` ∈ {too_easy, just_right, too_hard}, `technique` ∈ {struggled, ok, solid}, + optional note + optional clip. The coach's review carries a rating + feedback text.
- As the backend, **no card hold at booking** — online payment is typically from the athlete's prepaid 321Fit balance (same model as `booking-flow.md`). The offering also supports **cash** (card / cash / both), so online-prepaid is the default, not the only, method.

---

## 4. End-to-end flow

```
COACH offers (generic, cheap)
   ▼
ATHLETE books it (catalog card, "Self-paced · do it anytime", picks a DAY, no time) → pays from balance
   ▼
COACH gets a REQUEST → opens SETUP BUILDER (picks the day) → builds per-athlete workout → Send
   ▼
ATHLETE: WELCOME (what's inside, ~time, day + reschedule) → PLAYER (step-by-step;
         per-step Get-ready 3-2-1 + voice cues; progress segments + Next preview;
         timer/reps/rest per step) → COMPLETE (structured feedback + optional clip + note) → Submit
   ▼
COACH: REVIEW (clips + athlete note + rating + feedback) → Finish (posts into the thread)
   ▼
Per-session COMMENTS thread = the session's HOME (submission + review = anchor messages, then free replies)
```

Lifecycle: **Requested** (booked, coach to set up) → **Ready** (set up, athlete to do) → **Submitted** (done, coach to review) → **Finished** (reviewed).

### The words on screen (one model, one label per role)

The lifecycle above is the model. What a person *reads* depends on which side they
are on, because the same state means different things to each — but **one state
has exactly one label per role**, everywhere it appears: queue tabs, template
detail sections, per-client sections, list sections, pills.

| state | the coach reads | the athlete reads |
|---|---|---|
| Requested | **To set up** | **Coach is building** |
| Ready | **With athlete** | **To do** |
| Submitted | **To review** | **Awaiting feedback** |
| Finished | **Done** | **Done** |

*(Coach column settled 2026-08-24 on `To set up` / `To review` — was `Needs a plan` / `Needs review`. Both read fine; `To set up` / `To review` won because Android had already shipped them and they sit one word from the hub tabs, so the whole vocabulary converges instead of one surface being the exception.)*

Verbs stay on buttons (*Build it*, *Review*), never in the state label — that is
what let four screens drift into four vocabularies (*Set up / Active* vs *Needs
your plan / In progress* vs *Ready / Submitted*) for one lifecycle. `Requested /
Ready / Submitted / Finished` are **model names** — they belong in the API and the
lifecycle legend, never on a row.

**Orthogonal flags** are not states and keep their own words: *Overdue*,
*Refunded*, *Cancelled*.

**Inside a section named after a state (or under a tab named after one), rows carry
no state pill** — it would only repeat the header. The exceptions are the
orthogonal flags above: *Overdue* and *Refunded* say something the header does not
(a cancelled session is not always refunded — see the case-C rule in §9).

Two consequences worth stating, because both were got wrong in a build:
- **A pill that rewords its header is worse than one that repeats it.** `TO SET UP`
  → `SETTING UP` is not the same claim: the section says nobody has started, the pill
  says the coach has. Same for `TO REVIEW` → `SUBMITTED` (model name on a row).
- **A state the reader cannot act on gets its own section, not a pill inside someone
  else's.** *Coach is building* is not athlete To-do; it is its own group, mirroring
  the coach's *To set up*. Then the row needs no pill to explain why it is inert.

### Multi-workout self-paced — Phase 2, via packages

An offering that buys *several* workouts ("3 of 8 done") is a **package with
self-paced content**, not a second kind of self-paced. It reuses the existing
package machinery — credits, lots, expiry — rather than inventing a plan object.
Deliberately out of scope until the single-assignment flow is finished; the
prototype shows one assignment per purchase so it does not promise what the flow
cannot do yet.

---

## 5. Screens (prototype `shared/self-paced.html`)

**Coach:** Offering detail (`coach/sessions.html#s-detail-selfpaced` — catalogue entry + the people on it) · Requests+Review hub (tabbed: To set up / To review / With athlete) · Setup builder (step list home) · Step editor (focused, with "Step N of M" counter) · Review submission · Per-client self-paced list (`coach/clients.html#s-client-selfpaced`) · Video library *(deferred)*.
> The isolated `self-paced.html#s-history` sketch is **superseded** by `#s-client-selfpaced` and marked as such in the prototype — do not implement it, it would be a second source of truth for the same list.
**Athlete:** Book (NOT a new screen — a card in the **existing Book training → Personal tab**, same `.v6d-card` as `profile.html#s-book-sessions`: the **sport icon** of the offering, the card's location-strip slot repurposed as "**Self-paced · do it anytime**" (clock icon — deliberately not "Online", to avoid confusion with live online sessions), a short slogan body, lower price; full description + day picker live in the Book drawer) · My self-paced (list) · Welcome/intro (day + reschedule sheet) · Player (sequenced phases — see §7.1) · Complete (structured feedback, first-time only) + upload · Comments thread.
**Shared sub-flow:** video source sheet → Trim (optional, skippable) → Uploading (Mux); reused by coach (instruction clips) + athlete (proof clips).

---

## 6. Placement / integration (decided: "C-lite") — BUILT 2026-07-01

**Four surfaces, four questions — check a new one against this before adding it.** The
recurring worry is that the hub duplicates the Inbox. It does show the same items, and that
is fine, because they answer different questions:

| surface | answers | lifetime |
|---|---|---|
| Inbox / Activity | *what happened* — chronological, all training types, a `Self-paced` tag | the item leaves once actioned |
| Dashboard `.dash-action` row | *how much do I owe right now* | hidden when every count is 0 |
| Hub `#s-queue` | *I am sitting down to do self-paced work* | a batch of one kind of work |
| Offering detail | *who is on this programme* | always — it is the catalogue |

Self-paced is the **only type where the coach owes production work** rather than a yes/no
reply: build a multi-step workout, later watch a clip and write a review. That is minutes of
work per athlete, and an inbox is a poor place for it because every item drops you back into
an unrelated stream. So the hub earns its place **only while it batches** — finishing one
item must hand over the next. Both exits obey this: the builder's *Send* returns to the queue,
and *Send feedback & finish* returns to the queue on the **To review** tab with the finished
item retired and a snackbar (`Sent to Julia · 1 left` + **Open thread**). The thread is where
the feedback landed, so it stays one tap away rather than being the destination — the earlier
build dropped the coach straight into the chat and out of the pile.

Two rules that follow:
- **A notification opens the thing, never the list.** Activity → that session, not the hub.
  The notification knows who it is about; a list makes the coach search again.
- **No second dashboard block.** Earnings is a standing fact, a self-paced queue is episodic
  and usually empty; a block that idles is dead weight, and "Needs your attention" is already
  the home for owing something. When the queue *is* empty the durable home is the **offering
  detail** under Sessions — the hub is the urgency shortcut, not the front door.


- **Coach events → unified Inbox** (no new bell, no 4th tab): `To reply` = Set up + Review; `Waiting` = Active; `Activity` = history. Cards reuse the inbox `.req-card` shell + a `Self-paced` tag. A tabbed **batch hub** (same items, filtered) reached from a Dashboard card.
- **Coach Dashboard** — a `.dash-action` row under "Needs your attention": "Self-paced · N to set up, N to review / N active · overdue" → the batch hub (`self-paced.html#s-queue`). Hidden when all counts 0.
- **Athlete Dashboard** *(reworked 2026-08-26)* — the hero slot is **`Next up`**, and it holds **whatever training comes first, timed or not**. A self-paced due *today* outranks a live session *tomorrow*. Previously the card could only hold something with a clock time, so self-paced was pushed into "Needs your attention" and the dashboard **showed tomorrow above today** — and went hollow entirely for an athlete who trains mostly self-paced. The self-paced shape leads with the **workout title** (the coach is secondary, there is no venue), carries the violet type tint, and its when-line reads **"Today · anytime"** — no clock, because the day *is* the appointment.
  - Only the **overdue** self-paced stays in *Needs your attention* → `#s-welcome`. "Do it today" is not an alert, it is the plan.
  - The centred **"See all self-paced"** link was **removed** from the middle of the attention list — it read as a section footer while four unrelated rows continued below it, and existed only because it was the single global door to the aggregate list.
  - **Athlete-side durable homes:** *upcoming* → the **Calendar** tab — but only for sessions the athlete actually **scheduled** (§9: the coach's day is a suggestion, the athlete places it); *done* → **Profile / Your activity** (a finished self-paced is a session you did). `#s-list` is the drill-down from either, and it remains the home for everything **unscheduled** — which is why it cannot be replaced by the calendar. ⚠️ Not built yet on either platform.
  - **No standing self-paced block on the dashboard** — a list of everything done and upcoming is a *browse* surface, and the dashboard answers "what now". Same call as the coach side.
- **Coach Client Detail** — a compact **summary card** (stat counters: To review / Active / Done) + **Assign self-paced** entry (coach-initiated). Tap the counters → a full **per-client screen** (`s-client-selfpaced`) with the sessions **grouped by status** (To set up / To review / With athlete / Done / Cancelled, count in each header) — chosen over an inline list (doesn't scale) and over tabs (tabs are for the all-clients batch hub; per-person is a bounded overview, so grouped sections match the athlete `s-list` and show the whole picture at once).
- **Coach Offering detail** (`coach/sessions.html#s-detail-selfpaced`) — the catalogue entry itself: summary + Edit, then **one `Athletes` list** of everyone who ever bought it, ordered by what the coach owes (To set up → To review → Overdue → With athlete → Done) with an `.sp-pill` per row carrying that state. **Deliberately not a work queue** — see §9. Footer CTA **"Assign to a client"**. Empty state when the offering is live but unsold.
- **Offering detail → an athlete → their list.** A row opens **that athlete's self-paced list**, never the newest instance — one athlete buys the same offering many times, and jumping into one of them hides the rest. Target is the same `#s-client-selfpaced`, entered as `clients.html?sp=<offering>#s-client-selfpaced`: a **clearable chip** scopes the list to that offering, ✕ widens it to every self-paced with the client. Same "two doors, one list" pattern as the athlete's coach chip on `#s-list`. On that screen the **person header is a door** to Client Detail (coaches arriving from an offering know the programme, not the client), and **Done rows state clip / no clip** — re-watching the video is why a finished session gets reopened.
- **Assign is a footer CTA** on `#s-client-selfpaced` ("Assign self-paced"). Offering already known (chip on, or the coach sells one) → **straight into the builder**; otherwise an **offering picker sheet** first (tap-to-act rows with the price, no radio, no confirm — one decision, then the builder; the day is asked for **in** the builder, not twice). Client Detail's *Assign self-paced* row lands here with that sheet open, so cancelling leaves the coach on a useful screen. The builder shows an **offering context chip** (`?offering=`) — it is always known and it sets the price — and its back button returns to the door used (hub vs client list).
- **Athlete Coach Detail** — a **counters summary card** (To do / Awaiting / Done + overdue hint) on the **relationship detail** (`athlete/my-coaches.html#s-coach-detail`), placed next to **Your packages** — the athlete-side mirror of the coach's Client Detail self-paced summary. Tap → My self-paced **filtered to that coach** (`self-paced.html?c=<coach>#s-list` → filter chip, ✕ clears to all). *(Updated 2026-07-20: was a thin link row mis-placed on the **public** profile `shared/profile.html#s-coach-v2` — relationship data belongs on the relationship detail, not the marketing surface. Reverses the earlier "link, not a mirror section" call now that packages set the precedent for showing relationship stats here.)*
- **Athlete list** (`#s-list`) — the **global aggregated** "My self-paced" across all coaches (grouped To do / Awaiting feedback / Done / Cancelled), **not a tab**. Two doors: **global** = athlete Dashboard "Needs your attention" → **See all self-paced** (urgency-driven aggregate); **per-coach** = the Coach Detail summary card (carries `?c=<coach>` → filter chip).
- **Status pills** — the `.sp-pill` family was extracted from `self-paced.html` into `lib/fit-ui.css` (shared across all entry points). Deep-link: `self-paced.html#<screen>` opens that screen on load.

---

## 6a. Doing the workout — steps, briefs, resume *(added 2026-08-26)*

The player used to be a **single exercise** whose only exit was Complete: a three-step workout
was literally unfinishable, and the coach's per-step **Video** and **Instructions / cues** —
both collected by the step editor since day one — were displayed to **nobody**.

- **Step brief** (`#s-step-brief`) sits before every step: the coach's demo clip, the step name,
  its target chips, and the cues. `Start` on Welcome opens the brief for step 1; the end of each
  step opens the brief for the next; the last step ends at **Complete**.
- **One screen, two jobs.** Between exercises the athlete needs *what did I just finish* and
  *what is next*, and the video belongs to the second — so the finished step is a slim tick line
  above the next step's demo rather than a screen of its own. Two screens would be two taps back
  to training.
- **The tick names the step, never its number** — "Hip openers done", not "Step 3 done". The
  screen already says *Step 4 of 6*; two numbers would have to be reconciled by the reader. The
  same trap caught a "1 of 3" counter sitting beside "Step 2 of 3"; it reads **"1 done"**.
- **The confirmation is banded and tied to the rail.** As a bare line above the next step's video
  it read as a label of the screen rather than a report about the past — anchored to nothing, and
  spatially attached to the wrong content. It is now a tinted band at the top with the rail
  directly beneath it, so the tick and the filled segment state the same fact in the same place.
  On step one the band is absent and only the rail remains.
- **A rail, not a list of cards** — the full step list would crowd out the video, which is the
  hero. Rail + "step N of M" gives the same orientation in one line.
- **No cues is a normal step, not a gap.** `Instructions / cues` is optional in the builder, and
  a "follow the video" step is exactly where a coach writes nothing. The card comes off entirely
  rather than standing empty under its own label — an empty labelled box advertises something
  missing, and nothing is: the demo and the target already say what to do. The height the text is
  not using goes to the clip.
- **Nothing from "before" leaks into the workout** — reschedule, cancel and the coach's note stay
  on Welcome. Inside a workout there are only steps.
- **Partly done is a real state.** The athlete can close the app mid-workout. Welcome then shows
  *N of M done*, ticks the finished steps, accents the resume step, and its CTA becomes
  **Continue · step N of M**; the athlete's list card and the dashboard hero carry the same
  number. **Resume is at step granularity** — a step closes when its last set does, sets inside
  it are not remembered. Storing "set 2 of 4" is fiddly state for no gain, and redoing a couple
  of sets of the exercise you walked away from is the better outcome anyway.
- **Submitting is unchanged** — it happens at Complete, after the last step. A half-done workout
  stays *With athlete* and ages into *Overdue* by the normal rule.
- **Coach visibility: a stall, not a percentage.** The With-athlete card shows
  `Started · 1 of 3 · stalled 2 days` once progress has been sitting. It is a coaching signal
  (too hard? cue unclear?) worth acting on. A live progress bar was rejected and its dead
  `.td-prog` CSS deleted: a bar turns an unfinished attempt into a watch-metric, where a stated
  fact reads as information.
- **Video is portrait everywhere, and that is deliberate.** Coaches film on a phone and athletes
  watch on one, so both the in-set media and the brief's demo are vertical. Capping the player's
  media to a short strip letterboxes the clip *and* pays for it in dead space — the first attempt
  at this reshape did exactly that and was reverted. The player keeps **full-bleed** media and
  the metric block is **overlaid on it** behind a scrim, so both get the full height instead of
  splitting it. Rest has no clip, so the scrim comes off there and the text returns to normal
  colours. On the brief the demo is portrait (4:5), height-capped so the cues stay on screen
  without scrolling, and centred rather than left-aligned.
- **Player layout (reshaped 2026-08-26).** The session rail moved to the **top** — at the bottom
  the footer clipped it — and now carries step context, which the player never had. `12×` became
  `12` over a `REPS` label: the unit was a grey subscript sitting on the numeral's baseline and
  read as an unfinished sum. Set dots replaced "Set 3 of 4" as prose, which needs reading
  mid-exercise.

---

## 7. Setup builder (coach) — best-practice pattern

One **builder-home** screen: workout title + welcome note (outline-card → editor) + **day to do it** (date picker, no time) + a **step list** (compact cards, drag-reorder, target badge) + Add step + Send. Each step opens a **focused editor screen** with a **"Step N of M ‹ ›" counter**: name · video [record/upload/library → optional trim] · **targets as independent toggles** — `Reps × sets` and `Timer` (duration) can be on **together, either, or neither** (neither = just follow the video) — plus an independent `Rest after` · instructions.

Rationale (Apple HIG / Baymard / NNG; Apple Shortcuts, Freeletics, Strava): for a variable-length list of "heavy" items, use **master–detail (list + focused editor)**, not one infinite-scroll form and not a rigid linear wizard. Reps and timer are orthogonal (a timed AMRAP-style step has both; a mobility hold has only a timer; a strength set has only reps) → independent toggles, not a one-of segment.

### 7.1 Player (athlete) — sequenced phases

An exercise is **not one screen** — it plays as a Freeletics-style sequence driven by the step's targets:

```
Get ready (3-2-1, voiced)  →  WORK set  →  Rest (voiced countdown, auto-flow)  →  [repeat per set count]  →  next exercise
```

- **Minimal, one focus at a time** (ref: Freeletics): full-bleed exercise media on top, the single number that matters bottom-left (reps / timer / rest), exercise name + a gray `Next:` line, and **one thin segment bar** at the very bottom tracking the whole workout. **One action per phase** (Done / Skip) — no competing CTAs. Header = icon-buttons only (× · voice · message coach). The plan/steps live on the Welcome overview, not on the player.
- **WORK set** renders by target: **Reps set** = big rep count, tap Done; **Timed set** = countdown + Pause; **Reps + Timer** both on = a timed work set (e.g. max reps in 45s).
- **Voice cues** read the get-ready and rest countdowns (native TTS, toggle, respects silent mode).

---

## 8. Pricing & payment

- Price lives on the **offering** (coach sets it, typically **below** their live rate). v1 = single price per offering (one generic offering for now).
- Booking self-paced = simplified confirm (price + pay from balance, optional note) — **no time-slot grid** (no live time). The offering can accept **card / cash / both** — cash is allowed, it is not online-prepaid-only. Coach-initiated (athlete hasn't paid) → athlete's Welcome CTA is "Pay €X & start".
- **Why cash is allowed (confirmed 2026-08-19, after a prototype draft briefly removed it):** a self-paced booking is still a **request the coach accepts or declines**, so the payment method changes nothing about the control the coach has. And the realistic case is offline: the coach knows this athlete, or has just finished a live session with them and sells a self-paced one on top — the money changes hands there. Card deducts from the balance at booking; cash leaves the booking unpaid and is collected like any other cash session. Already implemented this way on the backend (`athlete/self_paced.py` deducts only when `payment_type != CASH`).
- **Packages apply to self-paced** like any other type — a pack is N sessions of one template, and the type doesn't change the mechanism. Specified separately in [session-packages.md](./session-packages.md) (decision #7); the base-session picker already lists self-paced offerings. *(Was "Phase 2" — written before the packages spec existed. Updated 2026-07-15.)*

---

## 9. Decisions locked & open items

**Locked (2026-06-12):**
- **Comments thread = the session's home.** Review (coach) + Complete (athlete) are one-time **compose** screens that **post into the session's single thread**: the athlete submission (clip + structured feedback) and the coach review (rating + feedback) render as **anchor messages**, then both sides reply freely. Review→Finish lands in the thread; the player has a **Tell your coach** affordance into it. (Rejected: merging the review fully into a chat — rating-in-chat is less structured.)
- **Day-bound, not time-bound — and the athlete is the one who schedules it (revised 2026-08-26).** The coach picks a **day** and never an hour; that day is a **suggestion**, not an appointment. The athlete decides whether it goes in a calendar and at what time.
  - *Why this replaces auto-placement.* The rule used to read "lands as a default 1-hour event". It was never built, and the reason is in the sentence: it never said **at what hour**, and a default block cannot be implemented without one. Worse, a block nobody chose collides with real appointments and gets dismissed — which destroys the reminder the whole type leans on. A slot the athlete picked is a commitment; a slot the system invented is noise.
  - **Athlete Welcome has two schedule states.** *Not in calendar* (default): "Maria suggests Thu, Apr 17 · not in your calendar yet" with a single **Add to calendar** action. *Scheduled*: "In your calendar · Thu, Apr 17 at 19:00 · only you see it", with **Change**.
  - **Scheduling reuses the booking screen — it does not imitate it.** Both actions open `shared/profile.html?sp=<workout>&coach=<name>&day=<n>#s-booking`: the same day strip, 24h timeline, tap-to-place and drag with a 15-min snap the athlete already books sessions with. Day and time are chosen together there, which is why Welcome needs one button and not two. New `bk-sp` mode on that screen **switches the coach's layer off** — off-hours hatching, "Coach busy" tiles, that legend chip and the venue strip — because a self-paced does not consume the coach's time, so their availability is not a constraint on it; the athlete's own conflicts stay, those are real. The CTA reads *Add to calendar · HH:MM – HH:MM* and skips the Review & Send sheet: the session is already paid for, there is nothing to send.
  - **Scheduling never gates `Start`.** An athlete who opened the session to train right now must not be asked when they plan to train. It is a secondary action, always skippable, and skipping it is a legitimate end state.
  - **Nothing ever reaches the coach's calendar.** Self-paced does not occupy the coach's time, so it must not occupy their grid.
  - **What the coach sees instead**, inside the session: `Planned for Thu, Apr 17` → `Scheduled Thu, Apr 17 · 19:00` → `Completed Thu, Apr 17 · 19:42`. **The hour appears only once the athlete deliberately set one** — for a "do it whenever" product, broadcasting an hour they never chose is surveillance, not information.
  - **Notification rule unchanged:** moving to a **different day** notifies the coach; the **hour** is the athlete's alone and changing it is silent.
  - *Backend:* the athlete-only event is created **when the athlete schedules it**, not on the coach's Send. (Supersedes impl-audit gap 4, which was written against the auto-placement rule.)
- **Structured completion feedback** (replaces plain stars on the athlete side): intensity (too easy / just right / too hard, with a helper line on what the coach adjusts) + technique (struggled / OK / solid). Coach review still uses a rating + feedback text.
- **Targets are independent** (Reps and Timer + Rest, not a one-of segment). Player plays them as a sequence (§7.1).
- **Booking is not a new screen** — self-paced is a personal session **type**; it appears as a card in the existing Book training → Personal tab, "Self-paced · do it anytime" strip (not "Online" — avoids confusion with live online sessions), lower price.
- **A bought session is the athlete's forever** — they can re-do it as practice anytime. But **feedback to the coach is one-time**: a re-do skips the structured report / clip / submit (just "Done"), keeping the coach's review queue to one submission per session.
- **The coach's Review surfaces the athlete's structured self-report** (intensity + technique) — same data the athlete submits on Complete, shown to the coach before they rate.
- **Missed day → notify the coach** (athlete didn't do it on the assigned day).
- **Booking window + cancellation/refunds (decided 2026-07-01):** the coach has **N = 2 days** to build a booked session; the athlete's day picker is constrained to that window. Refund policy on the balance charged at booking:
  - **(A) Coach never sets up in time** → **100% auto-refund** (coach's fault; session auto-cancels).
  - **(B) Athlete cancels *before* setup** (Requested) → **100% refund** (no coach work done yet).
  - **(C) Athlete cancels *after* setup, before doing it** → **no refund** (coach already spent the time building it).
  - Future: a **trial / free first self-paced session** per athlete as an acquisition lever — deferred (see §9 deferred + `project_self_paced`).
- **Type colour + sections (2026-07-01):** training-type catalogs (coach `sessions.html#s-list`, athlete `profile.html#s-book-sessions`) are **grouped into vertical sections by type** (no tabs — 3–6 types make tabs overkill; empty types don't render) with a **per-type header colour**: Personal=teal, Group=blue, **Self-paced=violet** (new `--fit-color-violet-*` token, TODO promote to Figma). Header gradient only; Book CTA stays brand. See memory `feedback_training_type_colors`, `feedback_tabs_vs_sections`.
- **Creation & discovery integrated (2026-07-01):** Self-paced is now the **3rd Training type** in `coach/sessions.html` (hides Location / calendar-scheduling; keeps the **payment picker incl. Cash** — see below; Duration → optional "Estimated time"; explainer that content is built per athlete after booking) and a **catalog card + day-bound confirm sheet** in the athlete's real Book training (`shared/profile.html#s-book-sessions`, Personal tab). The isolated `s-offering` in `self-paced.html` is superseded by the `sessions.html` type.
- **Voice cues** = native TTS for get-ready **and** rest countdowns; speaker toggle; respects silent mode. English only for v1.
- **The offering detail is a catalogue entry, not a work queue (2026-08-24).** It used to carry its own *To set up / To review / With athlete* sections plus a *Done* archive tile — a **third copy** of work that already lives on the Dashboard row → hub and in the Inbox, which made a catalogue screen read as a to-do list. Replaced by one `Athletes` list where the pill carries the same urgency. **One list beats three sections here** because the sectioning grammar belongs to the hub; a per-offering screen answers *who is on this programme*, and the hub answers *what do I owe today*.
- **A person row opens a list, not an instance (2026-08-24).** Anywhere a coach taps an athlete in a self-paced context, they land on that athlete's **list** of self-paced sessions. Instances are named freely by the coach and repeat under the same offering, so "the latest one" is never a safe guess.
- **Finished sessions open the thread, not a read-only review (2026-08-24).** The thread already holds the clip, the athlete's intensity/technique report and the coach's written feedback as anchor messages — a second read-only screen would duplicate all three. Follows from "comments thread = the session's home" above.
- **Coach-initiated assign goes out unpaid** — the athlete is charged when they open it (Welcome CTA **"Pay €X & start"**, built as `wlc-unpaid`). Restated here because it is easy to re-open by mistake; the rule itself is §8.
- **Trim is optional** — Skip uploads the full clip; clipping via **Mux SDK clip API**, not native-only.

**Open / deferred:**
- **Trial / free first self-paced session** per athlete — acquisition lever so an athlete can try the format once before paying. Deferred (design with pricing/packages, Phase 2).
- **Backend data model** — shipped as a **standalone `self_paced_booking` table** with its own `workout_step` rows (NOT a `training_event` with a `delivery` discriminator, and no unified personal/group/self_paced type enum) + offering as a catalog item + structured-feedback enums + one-submission-per-session constraint. Steps carry independent reps/timer/rest.
- **Notifications** — new categories: assigned/ready · submitted · feedback/finished · new-comment · day-change · (optional) due reminder. To add to `notifications-catalog.md`.
- **Coach video library** home — lives near session templates (coach Profile/Sessions); reuse across athletes is the scale lever.
- **Component extraction** — inbox tabs + `.req-card` are inline-styled; extract to kit before integrating (see `architecture/design-system.md § Pending component extractions`).
- **v2:** record-yourself inline in the player (vs upload after).

---

## 10. Cross-refs

- Booking / balance / no-card-hold: [booking-flow.md](booking-flow.md)
- CRM / clients (where coach surfaces live): [clients-coaches.md](clients-coaches.md)
- Mux video: [architecture/mux-integration.md](../architecture/mux-integration.md)
- Notifications: [notifications-catalog.md](notifications-catalog.md)
- Memory: `project_self_paced` (model + deferred thread decision)
- Prototype: `flows/shared/self-paced.html` (isolated WIP; split into modules later). Already living on real surfaces: offering creation + detail `flows/coach/sessions.html` (`#s-create`, `#s-detail-selfpaced`), per-client list + assign `flows/coach/clients.html#s-client-selfpaced`, athlete booking `flows/shared/profile.html#s-book-sessions`.
- Journey map: [`flows/journeys/self-paced.html`](../prototypes/flows/journeys/self-paced.html) — end-to-end walkthrough linking every live surface in flow order (Requested → Ready → Submitted → Finished)
