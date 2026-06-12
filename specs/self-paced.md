# Self-paced Training (online / async)

> Status: **Draft · WIP** — prototype in progress, NOT ready for task breakdown yet.
> Prototype: [flows/shared/self-paced.html](https://321-fit.github.io/project-spec/prototypes/flows/shared/self-paced.html) (isolated WIP module — will be split into real modules later)
> Component library: [design-tokens/docs/components.md](../../design-tokens/docs/components.md)
> Last updated: 2026-06-12
> Implementation:
> - iOS:     [321fit_ios/docs/self-paced-ios.md] (to be created)
> - Android: [321fit_android/docs/self-paced-android.md] (to be created)
> - Backend: [poly-backend/docs/self-paced-api.md] (to be created)

> ⚠️ **WIP.** This captures the model + flow we've agreed in prototype so far. Several things are still open (see §9). Don't generate issues from this yet.

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

- As the backend, **self-paced is a session type**; a fulfilled instance is a `training_event` with `delivery: self_paced` + ordered **steps**. Each step: name, optional video asset, **independent** `reps`/`sets` and `timer` targets (both, either, or neither — not mutually exclusive), optional `rest_after`, instructions.
- As the backend, the **offering** is a coach catalog item (name + price); booking it creates a request the coach fulfils.
- As the backend, self-paced events are **day-bound, not time-bound**: the event carries a target **date** (no start time). It lands as a **default 1-hour event** in the athlete's calendar, freely reschedulable; the coach is notified **only on a day change** (same-day/time reschedule = silent). Events are **off the coach's calendar** (no live slot); they surface in the coach's async hub + the client's record.
- As the backend, the athlete's **completion feedback is structured** (not a free star rating): `intensity` ∈ {too_easy, just_right, too_hard}, `technique` ∈ {struggled, ok, solid}, + optional note + optional clip. The coach's review carries a rating + feedback text.
- As the backend, **no card hold at booking** — online payment is from the athlete's prepaid 321Fit balance (same model as `booking-flow.md`).

---

## 4. End-to-end flow

```
COACH offers (generic, cheap)
   ▼
ATHLETE books it (catalog card, "Online" badge, picks a DAY, no time) → pays from balance
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

---

## 5. Screens (prototype `shared/self-paced.html`)

**Coach:** Offering (catalog entry) · Requests+Review hub (tabbed: Set up / Review / Active) · Setup builder (step list home) · Step editor (focused, with "Step N of M" counter) · Review submission · Client history · Video library.
**Athlete:** Book (NOT a new screen — a card in the **existing Book training → Personal tab**, same `.v6d-card` as `profile.html#s-book-sessions`, with an Online badge + day picker in the confirm sheet) · My self-paced (list) · Welcome/intro (day + reschedule sheet) · Player (sequenced phases — see §7.1) · Complete (structured feedback, first-time only) + upload · Comments thread.
**Shared sub-flow:** video source sheet → Trim (optional, skippable) → Uploading (Mux); reused by coach (instruction clips) + athlete (proof clips).

---

## 6. Placement / integration (decided: "C-lite")

- **Coach events → unified Inbox** (no new bell, no 4th tab): `To reply` = Set up + Review; `Waiting` = Active; `Activity` = history. Cards reuse the inbox `.req-card` shell + a `Self-paced` tag. A tabbed **batch hub** (same items, filtered) reached from a Dashboard card.
- **Coach Client Detail** — a "Self-paced (N)" section + Assign entry; tap → Review / thread.
- **Athlete Coach Detail** — mirror "Self-paced with this coach" section.
- **Athlete list** — not a tab; surfaced from Dashboard + Coach Detail.

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
- Booking self-paced = simplified confirm (price + pay from balance, optional note) — **no time-slot grid** (no live time). Coach-initiated (athlete hasn't paid) → athlete's Welcome CTA is "Pay €X & start".
- Packages = Phase 2 (separate block, applies to all training types).

---

## 9. Decisions locked & open items

**Locked (2026-06-12):**
- **Comments thread = the session's home.** Review (coach) + Complete (athlete) are one-time **compose** screens that **post into the session's single thread**: the athlete submission (clip + structured feedback) and the coach review (rating + feedback) render as **anchor messages**, then both sides reply freely. Review→Finish lands in the thread; the player has a **Tell your coach** affordance into it. (Rejected: merging the review fully into a chat — rating-in-chat is less structured.)
- **Day-bound, not time-bound.** Coach setup + athlete booking pick a **day** (date picker, no time). It lands as a **default 1-hour** athlete calendar event, freely reschedulable; **coach notified only on a day change**.
- **Structured completion feedback** (replaces plain stars on the athlete side): intensity (too easy / just right / too hard, with a helper line on what the coach adjusts) + technique (struggled / OK / solid). Coach review still uses a rating + feedback text.
- **Targets are independent** (Reps and Timer + Rest, not a one-of segment). Player plays them as a sequence (§7.1).
- **Booking is not a new screen** — self-paced is a personal session **type**; it appears as a card in the existing Book training → Personal tab, body describes it, Online badge, lower price.
- **A bought session is the athlete's forever** — they can re-do it as practice anytime. But **feedback to the coach is one-time**: a re-do skips the structured report / clip / submit (just "Done"), keeping the coach's review queue to one submission per session.
- **The coach's Review surfaces the athlete's structured self-report** (intensity + technique) — same data the athlete submits on Complete, shown to the coach before they rate.
- **Missed day → notify the coach** (athlete didn't do it on the assigned day).
- **Voice cues** = native TTS for get-ready **and** rest countdowns; speaker toggle; respects silent mode. English only for v1.
- **Trim is optional** — Skip uploads the full clip; clipping via **Mux SDK clip API**, not native-only.

**Open / deferred:**
- **Booking window + cancellation/refunds (revisit together):** the coach gets **N days (e.g. 2)** to set up a booked self-paced session → the athlete's day picker is constrained to that window. If the coach never sets it up (or the athlete cancels), define the **refund** path (balance was charged at booking). To design as one block.
- **Backend data model** — exact `training_session` type + `training_event.delivery` + steps schema (incl. independent reps/timer/rest) + offering as a catalog item + structured-feedback enums + one-submission-per-session constraint. TBD with backend.
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
- Prototype: `flows/shared/self-paced.html` (isolated WIP; split into modules later)
