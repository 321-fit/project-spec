# Reviews (athlete → coach)

> Status: Draft
> Prototype: [flows/athlete/my-coaches.html](https://321-fit.github.io/project-spec/prototypes/flows/athlete/my-coaches.html) (`#s-coach-review`, `#s-coach-detail`)
> Component library: [design-tokens/docs/components.md](../../design-tokens/docs/components.md)
> Last updated: 2026-06-11
> Implementation:
> - iOS:     [321fit_ios/docs/reviews-ios.md] (to be created)
> - Android: [321fit_android/docs/reviews-android.md] (to be created)
> - Backend: [poly-backend/docs/reviews-api.md] (to be created)

**Scope note:** how an athlete leaves a written **review** of a coach. This is distinct from the per-session **quick rating** (1-tap stars, captured right after a session in the Dashboard rate-queue), which feeds the coach's aggregate score + prefills this composer. This spec covers the **written review** only.

> ⚠️ **Backend reality (verified 2026-06-11):** neither the quick rating nor written reviews exist on the backend yet — there is **no `rating`/`review` table**, and `post-confirm` stores only free-text `feedback`. Both are being built greenfield under epic **poly-backend#396** (quick-rating storage + aggregate = #398/#399; athlete written-review CRUD = #399; athlete-facing read = #400). The "already exists" assumption in earlier drafts was incorrect.

---

## 1. Overview — rating vs review

| | Quick rating | Written review |
|---|---|---|
| Granularity | **per session** | **per coach** (one, editable) |
| Timing | **immediately** (post-session, while fresh) | **next day** (~24h after a completed session — reflection, not on the way out of the gym) |
| Channel | in-app rate-queue (Dashboard) | **push** (next-day deep-link) + persistent in-app CTA on Coach detail |
| Feeds | coach aggregate rating | public review on coach profile (+ stars) |

**Why per-coach, not per-session:** coaching is a recurring relationship (often weekly). Prompting a written review after every session = spam. One review per coach, editable, keeps it meaningful. Per-session sentiment is still captured by the quick rating.

Best-practice basis: Google Maps / Uber / Yelp / Airbnb — quick rating immediate, written review delayed via push, prefilled stars, single persistent entry point, no nagging.

---

## 2. User stories

- As an athlete, I want a low-friction way to rate each session immediately (quick rating) without being asked to write paragraphs every time.
- As an athlete, I want to be reminded the **next day** to write a fuller review while I still remember the session, via a push I can act on or ignore.
- As an athlete opening that push, I want to land directly on the review composer for the **right coach** (full name shown) and have my stars pre-filled from my latest rating.
- As an athlete, I want one review per coach that I can **edit or delete** any time, not a pile of per-session reviews.
- As an athlete, I want to leave/edit the review from the coach's detail screen whenever I choose, not only from the push.

---

## 3. Screens & states

### `s-coach-review` — review composer (full-screen **modal overlay**)

Reached from (a) the next-day push deep-link, (b) the "Write a review" CTA / "Edit" on Coach detail. Because it's commonly opened from a push (no in-app screen to go "back" to), it's a **modal dismissed with × (close), not a back chevron** (memory: `feedback_back_vs_close`). Full-screen (not a drawer) because text input in a bottom sheet is cramped by the keyboard (`feedback_screen_vs_sheet_vs_toast`).

Layout (à la Google Maps / Chipotle feedback):
- Header: **× close** (left) · trash **delete** (right, edit mode only — `feedback_destructive_actions`).
- Hero (centered): coach **avatar** + prompt **"How was training with {coach full name}?"** + large tappable **stars** (prefilled from the athlete's latest session rating) + dynamic word (Poor / Fair / Good / Great / Loved it).
- **"Any other details? (optional)"** label + bordered **text card** (notepad) + char counter `N/200` (gray, red at limit — `feedback_character_counter`).
- Public-disclosure line: "Your review is public on {coach}'s profile."
- **Sticky bottom CTA**: "Post review" (write) / "Update review" (edit).
- Error → inline banner + Retry (CTA stays).

Modes: **write** (empty text, stars prefilled) / **edit** (text + stars prefilled, trash + "Update review"). On submit → dismiss + snackbar ("Review posted" / "Review updated" / "Review deleted").

### `s-coach-detail` — "Your review" section states

- **No review yet, eligible** (≥1 completed session) — **default**: outline CTA "How was training with {coach}? · Write a review".
- **Has review**: stars + text + **Edit** → composer (edit).
- **Locked** (can't review yet — 0 completed sessions): muted "You can leave a review after your first completed session."

Screen-level states (same pattern as other list/detail screens): **default · loading** (skeleton) **· error** (inline + retry). Plus content variant **no-debt** (hides the Cash owed section). Footer (Book) hidden in loading/error.

---

## 4. Trigger & cadence

- **Push #1** — ~24h (next day) after the athlete's **first completed** session with a coach: "How was training with {coach}? Leave a review" → composer.
- **Nudge (optional)** — one soft reminder later (e.g. after a few more sessions) if still no review. Then stop.
- **No hard lock** — the "Write a review" CTA on Coach detail persists indefinitely; the cadence above is about *reminders*, not a deadline. (Window/expiry is a `## 8` open question.)
- **Verified** — composer only reachable after a completed session (no fake reviews).

---

## 5. Component usage

- `.fit-header` + **× icon-btn** (close) + trash icon-btn (delete, edit) — composer header.
- `.coach-photo` (avatar) + `.fit-identity-name` — hero / identity.
- `.cr-star` (tappable, `.dim` for unselected) + dynamic rating word.
- `.cr-textcard` (bordered contenteditable) + char counter.
- `.fit-phone-footer` + `.fit-btn.fit-btn-primary` — sticky CTA.
- `.fit-snackbar` — posted / updated / deleted.
- `.fit-inline-error` — composer error.
- `.fit-section-title--md` — "Your review" heading on detail.

---

## 6. API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1.0.0/athlete/coaches/{id}/review` | Athlete's existing review of this coach (null if none) |
| PUT | `/api/v1.0.0/athlete/coaches/{id}/review` | Create/update (idempotent — one per coach): `{ rating: int 1–5, text?: string }` |
| DELETE | `/api/v1.0.0/athlete/coaches/{id}/review` | Delete the review |

Eligibility (≥1 completed session) enforced server-side. Detailed shapes → `poly-backend/docs/reviews-api.md`. Verify against live API before issues; extend existing coach-review surfaces rather than inventing if present (`feedback_keep_existing_endpoints`).

---

## 7. Business rules

- One review per (athlete, coach). PUT upserts. Rating required (1–5); text optional (≤200 chars).
- Review stars are **independent** of per-session quick ratings but **prefilled** from the athlete's latest session rating as a starting point.
- Editable / deletable any time (no lock window in v1).
- Public on the coach profile + reviews list; counts toward the coach's displayed reviews.
- Coach is notified on new review (notifications-catalog `new_review`, #18). Coach cannot edit/hide athlete reviews.
- Tags/chips deferred to **v2** (need a curated pool, e.g. Punctual · Motivating · Great technique · Tough but fair · Patient).

---

## 8. Edge cases / open questions

- **No completed sessions** → composer not reachable; detail shows the "locked" hint.
- **Coach deleted / left platform** → existing review preserved; composer entry hidden.
- [ ] **Review window** — allow edits/new reviews indefinitely, or lock after N days? (v1: indefinite.)
- [ ] **Moderation** — profanity filter / report flow? (not in v1.)
- [ ] **Coach response** to a review — deferred (post-v1).

---

## 9. Decisions log

- **2026-06-05** — Written review = **per-coach, one, editable** (not per-session). Quick rating stays per-session. Memory: `project_athlete_prototype_status`.
- **2026-06-05** — Composer = **full-screen modal overlay**, dismissed with **×** (push-reachable → no "back"); coach **full name** in prompt; stars **prefilled** from latest rating; **bottom sticky CTA**; delete = trash top-right (edit). Layout follows Maps/Uber/Yelp/Chipotle. Tags deferred to v2.
- **2026-06-05** — Review prompt push fires **next day** (not hours) after first completed session; reminders are a cadence, not a hard deadline.

---

## 10. References

- Prototype: [my-coaches.html](https://321-fit.github.io/project-spec/prototypes/flows/athlete/my-coaches.html) (`#s-coach-review`, `#s-coach-detail`, `#s-coach-history`)
- [notifications-catalog.md](notifications-catalog.md) — `review` push (#11) routes to the composer; `new_review` (#18) notifies the coach.
- [booking-flow.md](booking-flow.md) — sessions that become reviewable.
- [coach-profile.md](coach-profile.md) — where reviews surface (coach side).
- Memory: `feedback_back_vs_close`, `feedback_screen_vs_sheet_vs_toast`, `feedback_character_counter`, `feedback_destructive_actions`.
