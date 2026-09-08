# Video storyboards — the first eight clips

> Status: Draft — shot lists ready, nothing recorded
> Companion to [faq.md](./faq.md) § 14, which sets the format and says why these exist
> Last updated: 2026-09-08

Each clip answers **one** FAQ question. The shot lists below are built from screens that already exist on the [prototype board](https://321-fit.github.io/project-spec/prototypes/board.html), so a clip cannot show a flow the product does not have — if a shot has no screen link, that screen does not exist and the clip is wrong, not the product.

## Rules that apply to all eight

| | |
|---|---|
| **Length** | 20–40 s. If a shot list needs more, it is two clips. |
| **Orientation** | Portrait, device frame from `store-assets/` so it matches the App Store shots. |
| **Sound** | None. Captions carry the words, so it works muted and needs no dub to be localised. |
| **Captions** | One line, ≤ 6 words, at the same position every clip. A caption names the *outcome*, not the gesture: "Coach confirms" beats "Tap Accept". |
| **Pace** | ~1 shot per 3–4 s. Hold the last shot 2 s longer than feels right — that is the one people screenshot. |
| **Content** | Real build, real-shaped data. Two athletes and one coach across all eight, so the clips read as one product: **Anna Kowalski** (athlete), **Piotr Nowak** (second athlete), **Mark Stevens** (coach). |
| **Ends on** | The result: a confirmed session, a connected calendar, money in the balance. Never on a tap. |

---

## 1 · Book a session with a coach — FAQ § 2

**Answers:** "How do I find a coach and book?" · Athlete · ~35 s

| # | Screen | What happens | Caption |
|---|---|---|---|
| 1 | [athlete-search/s-search-landing](https://321-fit.github.io/project-spec/prototypes/board.html#athlete-search/s-search-landing) | Sport + city already filled | Find a coach near you |
| 2 | [athlete-search/s-search-results](https://321-fit.github.io/project-spec/prototypes/board.html#athlete-search/s-search-results) | Scroll two cards, tap one | — |
| 3 | [shared-profile/s-coach-v2](https://321-fit.github.io/project-spec/prototypes/board.html#shared-profile/s-coach-v2) | Video header, price, reviews | See what they offer |
| 4 | [shared-profile/s-book-sessions](https://321-fit.github.io/project-spec/prototypes/board.html#shared-profile/s-book-sessions) | Pick the training | — |
| 5 | [shared-profile/s-booking](https://321-fit.github.io/project-spec/prototypes/board.html#shared-profile/s-booking) | Free slots; busy time is greyed | Only times they can take |
| 6 | Review & send sheet (in-app) | Note field, price, payment, **Send request** | Send the request |
| 7 | [athlete-calendar/s-schedule](https://321-fit.github.io/project-spec/prototypes/board.html#athlete-calendar/s-schedule) | Session sits as *Awaiting*, then flips confirmed | Confirmed |

**Note:** the review sheet has no prototype screen of its own — record it from the build. Everything else is on the board.

---

## 2 · Answer a request — FAQ § 2

**Answers:** "The coach confirms every session — what does that look like?" · Coach · ~20 s

| # | Screen | What happens | Caption |
|---|---|---|---|
| 1 | [coach-dashboard/s-notifications](https://321-fit.github.io/project-spec/prototypes/board.html#coach-dashboard/s-notifications) | New request arrives | A new request |
| 2 | [coach-calendar/s-calendar](https://321-fit.github.io/project-spec/prototypes/board.html#coach-calendar/s-calendar) | The tile sits in the day, yellow | It lands in your day |
| 3 | Event drawer, `request` state | Who, when, where, price · Decline / Reschedule / Accept | Three answers, one tap |
| 4 | Same drawer after Accept | Tile turns teal, both calendars agree | Booked |

---

## 3 · Connect your calendar — FAQ § 8

**Answers:** "What is calendar sync and what does it show anyone?" · Both roles · ~30 s

| # | Screen | What happens | Caption |
|---|---|---|---|
| 1 | [coach-calendar/s-calendar](https://321-fit.github.io/project-spec/prototypes/board.html#coach-calendar/s-calendar) | A slot that looks free | Your other life isn't here |
| 2 | [coach-calendar-sync/s-calsync](https://321-fit.github.io/project-spec/prototypes/board.html#coach-calendar-sync/s-calsync) | Connect Google | Connect a calendar |
| 3 | [coach-calendar-sync/s-cal-detail](https://321-fit.github.io/project-spec/prototypes/board.html#coach-calendar-sync/s-cal-detail) | Which calendars are read | Read your busy time |
| 4 | [coach-calendar-sync/s-write-target-picker](https://321-fit.github.io/project-spec/prototypes/board.html#coach-calendar-sync/s-write-target-picker) | Choose where 321Fit writes | Choose where sessions go |
| 5 | [coach-calendar/s-calendar](https://321-fit.github.io/project-spec/prototypes/board.html#coach-calendar/s-calendar) | The same slot now shows busy | Nobody books over it |

**The privacy line is the point of this clip.** Shot 3 must show that titles are not exposed — the caption "Read your busy time" carries it; if the frame shows an imported event title, the clip is making a promise the FAQ does not.

---

## 4 · Join a group session — FAQ § 4

**Answers:** "How do I get into a group session?" · Athlete · ~25 s

| # | Screen | What happens | Caption |
|---|---|---|---|
| 1 | [shared-profile/s-group](https://321-fit.github.io/project-spec/prototypes/board.html#shared-profile/s-group) | Group session, seats left | Seats left, in the open |
| 2 | Join confirm sheet | Price + what happens if it's cancelled | — |
| 3 | [shared-profile/s-joined](https://321-fit.github.io/project-spec/prototypes/board.html#shared-profile/s-joined) | Joined state | You're in |
| 4 | [athlete-calendar/s-schedule](https://321-fit.github.io/project-spec/prototypes/board.html#athlete-calendar/s-schedule) | It's in the athlete's week | — |
| 5 | [shared-profile/s-full](https://321-fit.github.io/project-spec/prototypes/board.html#shared-profile/s-full) | The same session, full | When it's full, it's full |

---

## 5 · Send self-paced training — FAQ § 5

**Answers:** "What is self-paced training?" · Coach → athlete → coach · ~40 s (the longest, because it is a loop)

| # | Screen | What happens | Caption |
|---|---|---|---|
| 1 | [coach-clients/s-client-detail](https://321-fit.github.io/project-spec/prototypes/board.html#coach-clients/s-client-detail) | Open the client | — |
| 2 | [shared-self-paced/s-setup](https://321-fit.github.io/project-spec/prototypes/board.html#shared-self-paced/s-setup) | Build the workout, send | Send training, no time slot |
| 3 | [shared-self-paced/s-welcome](https://321-fit.github.io/project-spec/prototypes/board.html#shared-self-paced/s-welcome) | Athlete opens it | They do it when they can |
| 4 | [shared-self-paced/s-player](https://321-fit.github.io/project-spec/prototypes/board.html#shared-self-paced/s-player) | Step through the exercises | — |
| 5 | [shared-self-paced/s-complete](https://321-fit.github.io/project-spec/prototypes/board.html#shared-self-paced/s-complete) | Submit, with a clip | Send it back |
| 6 | [shared-self-paced/s-review](https://321-fit.github.io/project-spec/prototypes/board.html#shared-self-paced/s-review) | Coach reviews and replies | Your coach answers |

---

## 6 · Top up and pay online — FAQ § 7

**Answers:** "How does paying online work and when is money taken?" · Athlete · ~30 s

| # | Screen | What happens | Caption |
|---|---|---|---|
| 1 | [athlete-balance-v2/s-balance](https://321-fit.github.io/project-spec/prototypes/board.html#athlete-balance-v2/s-balance) | Balance, then Top up | Keep a balance for training |
| 2 | [athlete-balance-v2/s-top-up](https://321-fit.github.io/project-spec/prototypes/board.html#athlete-balance-v2/s-top-up) | Amount, card, done | Top up by card |
| 3 | [shared-profile/s-booking](https://321-fit.github.io/project-spec/prototypes/board.html#shared-profile/s-booking) → review sheet | Booking reserves the price | Reserved, not spent |
| 4 | [athlete-balance-v2/s-booked](https://321-fit.github.io/project-spec/prototypes/board.html#athlete-balance-v2/s-booked) | It sits as booked | — |
| 5 | [athlete-balance-v2/s-txn-spend](https://321-fit.github.io/project-spec/prototypes/board.html#athlete-balance-v2/s-txn-spend) | After the session it settles | Paid after you train |

---

## 7 · Set your working hours — FAQ § 10

**Answers:** "How do I control when people can book me?" · Coach · ~30 s

| # | Screen | What happens | Caption |
|---|---|---|---|
| 1 | [coach-availability/s-availability-hub](https://321-fit.github.io/project-spec/prototypes/board.html#coach-availability/s-availability-hub) | The hub | Say when you work |
| 2 | [coach-available-hours/s-availability](https://321-fit.github.io/project-spec/prototypes/board.html#coach-available-hours/s-availability) | Weekly hours, one day edited | Hours, per weekday |
| 3 | [coach-locations/s-locations](https://321-fit.github.io/project-spec/prototypes/board.html#coach-locations/s-locations) | Where you train, incl. home visits | And where |
| 4 | [coach-available-hours/s-time-off](https://321-fit.github.io/project-spec/prototypes/board.html#coach-available-hours/s-time-off) | Add time off | Block a holiday |
| 5 | [shared-profile/s-booking](https://321-fit.github.io/project-spec/prototypes/board.html#shared-profile/s-booking) | The athlete's view: those times are gone | Nobody sees what you blocked |

**Shot 5 is the whole clip.** Coaches don't want a settings tour; they want proof the setting reaches the athlete's screen.

---

## 8 · Sell a package — FAQ § 6

**Answers:** "What is a package and how does a client buy one?" · Coach → athlete · ~30 s

| # | Screen | What happens | Caption |
|---|---|---|---|
| 1 | [coach-sessions/pkg-pick](https://321-fit.github.io/project-spec/prototypes/board.html#coach-sessions/pkg-pick) | Pick the training to package | Sell sessions in blocks |
| 2 | [coach-sessions/pkg-editor](https://321-fit.github.io/project-spec/prototypes/board.html#coach-sessions/pkg-editor) | Size + price, discount visible | Cheaper by the block |
| 3 | Booking review sheet (in-app) | The offer appears under the CTA | They see it when they book |
| 4 | [athlete-my-coaches/s-pkg-detail](https://321-fit.github.io/project-spec/prototypes/board.html#athlete-my-coaches/s-pkg-detail) | Credits, with one used | 4 of 5 left |
| 5 | [coach-clients/s-pkg-detail](https://321-fit.github.io/project-spec/prototypes/board.html#coach-clients/s-pkg-detail) | The coach's side of the same pack | You both see the same count |

---

## Before recording

1. **Three shots have no prototype screen** — the athlete's review-&-send sheet (clips 1, 6, 8), the coach's event drawer in `request` state (clip 2) and the group join confirm (clip 4). They exist in the build; record them there, and if a clip needs a *fourth* such shot, stop and check the flow is real.
2. **Fixture data first.** One coach, two athletes, one gym, one home address, one package, one self-paced workout — set up once and reused across all eight, or the clips will look like eight different products.
3. **Decide the recorder** (screen capture vs motion over frames) before shot 1 of clip 1: it changes how the fixtures are prepared, not just how the file looks.
4. **The 48h line does not appear in any clip.** The approval window is under review ([faq.md](./faq.md) § 15a) — no caption should name a number until it is settled.
