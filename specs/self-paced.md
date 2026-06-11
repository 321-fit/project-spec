# Self-paced Training (online / async)

> Status: **Draft · WIP** — prototype in progress, NOT ready for task breakdown yet.
> Prototype: [flows/shared/self-paced.html](https://321-fit.github.io/project-spec/prototypes/flows/shared/self-paced.html) (isolated WIP module — will be split into real modules later)
> Component library: [design-tokens/docs/components.md](../../design-tokens/docs/components.md)
> Last updated: 2026-06-11
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

- As the backend, **self-paced is a session type**; a fulfilled instance is a `training_event` with `delivery: self_paced` + ordered **steps** (each: name, optional video asset, optional target {timer | reps×sets} + optional rest, instructions).
- As the backend, the **offering** is a coach catalog item (name + price); booking it creates a request the coach fulfils.
- As the backend, self-paced events are **off the coach's calendar** (no live slot); they surface in the coach's async hub + the client's record, and in the **athlete's** calendar/list once set up.
- As the backend, **no card hold at booking** — online payment is from the athlete's prepaid 321Fit balance (same model as `booking-flow.md`).

---

## 4. End-to-end flow

```
COACH offers (generic, cheap)
   ▼
ATHLETE books it (catalog card, "Online" badge, no slot grid) → pays from balance
   ▼
COACH gets a REQUEST → opens SETUP BUILDER → builds per-athlete workout → Send
   ▼
ATHLETE: WELCOME (what's inside, ~time) → PLAYER (step-by-step, timer optional)
         → COMPLETE (+ optional clip upload, note, self-rating) → Submit
   ▼
COACH: REVIEW (clips + athlete note + rating + feedback) → Finish
   ▼
Per-session COMMENTS thread (both sides)
```

Lifecycle: **Requested** (booked, coach to set up) → **Ready** (set up, athlete to do) → **Submitted** (done, coach to review) → **Finished** (reviewed).

---

## 5. Screens (prototype `shared/self-paced.html`)

**Coach:** Offering (catalog entry) · Requests+Review hub (tabbed: Set up / Review / Active) · Setup builder (step list home) · Step editor (focused, with "Step N of M" counter) · Review submission · Client history · Video library.
**Athlete:** Book offering · My self-paced (list) · Welcome/intro · Player · Complete+upload · Comments thread.
**Shared sub-flow:** video source sheet → Trim → Uploading (Mux); reused by coach (instruction clips) + athlete (proof clips).

---

## 6. Placement / integration (decided: "C-lite")

- **Coach events → unified Inbox** (no new bell, no 4th tab): `To reply` = Set up + Review; `Waiting` = Active; `Activity` = history. Cards reuse the inbox `.req-card` shell + a `Self-paced` tag. A tabbed **batch hub** (same items, filtered) reached from a Dashboard card.
- **Coach Client Detail** — a "Self-paced (N)" section + Assign entry; tap → Review / thread.
- **Athlete Coach Detail** — mirror "Self-paced with this coach" section.
- **Athlete list** — not a tab; surfaced from Dashboard + Coach Detail.

---

## 7. Setup builder (coach) — best-practice pattern

One **builder-home** screen: workout title + welcome note (outline-card → editor) + a **step list** (compact cards, drag-reorder, target badge) + Add step + Send. Each step opens a **focused editor screen** (name · video [record/upload/library → trim] · **target optional**: None / Timer (duration + rest) / Reps×sets · instructions) with a **"Step N of M ‹ ›" counter**.

Rationale (Apple HIG / Baymard / NNG; Apple Shortcuts, Freeletics, Strava): for a variable-length list of "heavy" items, use **master–detail (list + focused editor)**, not one infinite-scroll form and not a rigid linear wizard. Not every exercise needs a timer → target is optional.

---

## 8. Pricing & payment

- Price lives on the **offering** (coach sets it, typically **below** their live rate). v1 = single price per offering (one generic offering for now).
- Booking self-paced = simplified confirm (price + pay from balance, optional note) — **no time-slot grid** (no live time). Coach-initiated (athlete hasn't paid) → athlete's Welcome CTA is "Pay €X & start".
- Packages = Phase 2 (separate block, applies to all training types).

---

## 9. Open questions / deferred

- **Comments thread = session home (proposal, to confirm):** Review (coach) + Complete (athlete) are one-time **compose** actions that **post into the session's single thread** (submission + feedback = anchor messages); reach the thread by tapping the session post-activity; Review→finish lands in the thread. Alternative (merge review into the thread) leaning rejected. → revisit.
- **Backend data model** — exact `training_session` type + `training_event.delivery` + steps schema; offering as a catalog item. TBD with backend.
- **Calendar representation (athlete)** — show self-paced as a non-time-bound / "remind me" chip, or list-only? TBD.
- **Notifications** — new categories: assigned/ready · submitted · feedback/finished · new-comment · (optional) due reminder. To add to `notifications-catalog.md`.
- **Coach video library** home — lives near session templates (coach Profile/Sessions); reuse across athletes is the scale lever.
- **Component extraction** — inbox tabs + `.req-card` are inline-styled; extract to kit before integrating (see `architecture/design-system.md § Pending component extractions`).

---

## 10. Cross-refs

- Booking / balance / no-card-hold: [booking-flow.md](booking-flow.md)
- CRM / clients (where coach surfaces live): [clients-coaches.md](clients-coaches.md)
- Mux video: [architecture/mux-integration.md](../architecture/mux-integration.md)
- Notifications: [notifications-catalog.md](notifications-catalog.md)
- Memory: `project_self_paced` (model + deferred thread decision)
- Prototype: `flows/shared/self-paced.html` (isolated WIP; split into modules later)
