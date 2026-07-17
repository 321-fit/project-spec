# Self-paced Training (online / async)

> Status: **Approved** — flow prototyped & reviewed, ready for task breakdown. (Deferred from v1: video library, progress-over-time — see §9. Packages are **no longer deferred** — they cover self-paced too, spec'd in [session-packages.md](./session-packages.md); see §8.)
> Prototype: [flows/shared/self-paced.html](https://321-fit.github.io/project-spec/prototypes/flows/shared/self-paced.html) (isolated module; screens split into real surfaces per §5)
> Component library: [design-tokens/docs/components.md](../../design-tokens/docs/components.md)
> Last updated: 2026-07-17
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

---

## 5. Screens (prototype `shared/self-paced.html`)

**Coach:** Offering (catalog entry) · Requests+Review hub (tabbed: Set up / Review / Active) · Setup builder (step list home) · Step editor (focused, with "Step N of M" counter) · Review submission · Client history · Video library.
**Athlete:** Book (NOT a new screen — a card in the **existing Book training → Personal tab**, same `.v6d-card` as `profile.html#s-book-sessions`: the **sport icon** of the offering, the card's location-strip slot repurposed as "**Self-paced · do it anytime**" (clock icon — deliberately not "Online", to avoid confusion with live online sessions), a short slogan body, lower price; full description + day picker live in the Book drawer) · My self-paced (list) · Welcome/intro (day + reschedule sheet) · Player (sequenced phases — see §7.1) · Complete (structured feedback, first-time only) + upload · Comments thread.
**Shared sub-flow:** video source sheet → Trim (optional, skippable) → Uploading (Mux); reused by coach (instruction clips) + athlete (proof clips).

---

## 6. Placement / integration (decided: "C-lite") — BUILT 2026-07-01

- **Coach events → unified Inbox** (no new bell, no 4th tab): `To reply` = Set up + Review; `Waiting` = Active; `Activity` = history. Cards reuse the inbox `.req-card` shell + a `Self-paced` tag. A tabbed **batch hub** (same items, filtered) reached from a Dashboard card.
- **Coach Dashboard** — a `.dash-action` row under "Needs your attention": "Self-paced · N to set up, N to review / N active · overdue" → the batch hub (`self-paced.html#s-queue`). Hidden when all counts 0.
- **Athlete Dashboard** — `.pending-row`(s) under "Needs your attention": day-bound **overdue** + **due-today** self-paced → `#s-welcome`. Shown only when present.
- **Coach Client Detail** — a compact **summary card** (stat counters: To review / Active / Done) + **Assign self-paced** entry (coach-initiated). Tap the counters → a full **per-client screen** (`s-client-selfpaced`) with the sessions **grouped by status** (To review / Active / Done / Cancelled, count in each header) — chosen over an inline list (doesn't scale) and over tabs (tabs are for the all-clients batch hub; per-person is a bounded overview, so grouped sections match the athlete `s-list` and show the whole picture at once).
- **Athlete Coach Detail** (`#s-coach-v2`) — a **light link row** "Self-paced with <coach> · N sessions · N to do" → the athlete's My self-paced (`#s-list`). Deliberately not a full mirror section (avoids two sources of truth).
- **Athlete list** — not a tab; surfaced from Dashboard + Coach Detail.
- **Status pills** — the `.sp-pill` family was extracted from `self-paced.html` into `lib/fit-ui.css` (shared across all entry points). Deep-link: `self-paced.html#<screen>` opens that screen on load.

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
- **Packages apply to self-paced** like any other type — a pack is N sessions of one template, and the type doesn't change the mechanism. Specified separately in [session-packages.md](./session-packages.md) (decision #7); the base-session picker already lists self-paced offerings. *(Was "Phase 2" — written before the packages spec existed. Updated 2026-07-15.)*

---

## 9. Decisions locked & open items

**Locked (2026-06-12):**
- **Comments thread = the session's home.** Review (coach) + Complete (athlete) are one-time **compose** screens that **post into the session's single thread**: the athlete submission (clip + structured feedback) and the coach review (rating + feedback) render as **anchor messages**, then both sides reply freely. Review→Finish lands in the thread; the player has a **Tell your coach** affordance into it. (Rejected: merging the review fully into a chat — rating-in-chat is less structured.)
- **Day-bound, not time-bound.** Coach setup + athlete booking pick a **day** (date picker, no time). It lands as a **default 1-hour calendar event visible to the athlete only** (never on the coach's calendar), freely reschedulable; **coach notified only on a day change**. The coach sees the **time the workout was completed** in their report instead of a calendar slot. *(Intended model — fork P6 resolved; a backend task exists to build the athlete-only calendar placeholder.)*
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
- **Creation & discovery integrated (2026-07-01):** Self-paced is now the **3rd Training type** in `coach/sessions.html` (hides Location / Payment-Cash / calendar-scheduling; Duration → optional "Estimated time"; explainer that content is built per athlete after booking) and a **catalog card + day-bound confirm sheet** in the athlete's real Book training (`shared/profile.html#s-book-sessions`, Personal tab). The isolated `s-offering` in `self-paced.html` is superseded by the `sessions.html` type.
- **Voice cues** = native TTS for get-ready **and** rest countdowns; speaker toggle; respects silent mode. English only for v1.
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
- Prototype: `flows/shared/self-paced.html` (isolated WIP; split into modules later)
