# Self-paced — prototype + spec vs code (2026-08-24)

Audited `specs/self-paced.md` and every self-paced screen in the prototype against
**poly-backend** and **321fit_android_new**, both on this session's working branches.

Canon: `specs/self-paced.md` (the § *The words on screen* rules were written by the owner
today). Screens: `flows/shared/self-paced.html` (16 screens), plus the two real surfaces
`flows/coach/sessions.html#s-detail-selfpaced` and `flows/coach/clients.html#s-client-selfpaced`.

Predecessor: `2026-08-19-self-paced-shipped-android-backend.md`.

**Screen coverage is not the problem** — every prototype screen has an Android counterpart.
Everything below is drift between what the canon says and what the code does.

---

## Checked and clean

Compared against each screen's own annotation; no drift found. Listed so the next pass does
not redo them.

| Screen | Verified |
|---|---|
| `s-queue` hub | tabs Set up / Review / Active, each its own scroll |
| `s-inbox` | all three card kinds live in the unified inbox — no 4th tab, no second bell |
| `s-setup` | title + note + `ReorderableStepList` + Add step + Send |
| `s-step` | "Step N of M" with ‹ ›; Reps×sets and Timer are **independent** toggles; hint says both off = follow the video |
| `s-review` | clips carousel (primary + extras), no-clip line, athlete note as a quote |
| `s-player` | phase sequence (get-ready → work → rest), one action per phase |
| `s-complete` | first-time structured feedback vs **re-do (practice)** — the practice path really does drop the report |
| `s-trim` / `s-upload` | trim optional, Skip uploads the full take |
| `s-welcome` | both states — paid → Start, coach-initiated → "Pay €X & start" |
| `s-book` | card in the existing Book training Personal tab, clock strip, not "Online" |
| Coach dashboard row | present, hidden at zero |

---

## 1. ~~The athlete has no *Coach is building* group~~ — DONE 2026-08-25

Done on the client (`SelfPacedV2Mapper.toMyList` splits `toDo` on status) — **not** on the
backend: `to_do` carries `requested` + `ready` and is read by shipped builds, so moving rows
out of it would hide them from clients we do not control. Walked as the athlete.

The **prototype was already right.** `flows/shared/self-paced.html#s-list` renders the section,
with a comment on it:

> *Not "To do" — the athlete cannot act on it yet. Its own section, mirroring the coach's
> "To set up", so the row needs no pill to explain why it is inert.*

**Decided (2026-08-24): the dashboard tile does not change.** *Coach is building* gets its own
section in the list and stays out of "Needs your attention" — it is not the athlete's turn, so
it is not something they need to be pulled back into the app for. The tile keeps its two
counts.

Revisit if the setup window starts being missed often: at that point the athlete waiting *is*
a thing worth surfacing, and the dashboard is where it would go.

---

## 2. ~~Rows still carry pills that repeat their section header~~ — DONE 2026-08-25

**Spec:** inside a section named after a state, rows carry no state pill; only the orthogonal
flags survive (*Overdue*, *Refunded*).

All three surfaces now carry only *Overdue* and *Refunded*: the coach's per-client list, the
athlete's list, and the hub's *Active* tab. The hub's *Set up* and *Review* cards never did.

---

## 3. Video library is built but marked *(deferred)*

`specs/self-paced.md:123` lists *Video library (deferred)*; `library/SelfPacedLibraryScreen.kt`
exists, is registered, and the step editor opens it. The pointer is stale — we shipped it.
Cheapest item here.

---

## 4. Carried over from 2026-08-19, still open

- **Cash-only self-paced never appears in what the athlete owes.** `non_session_debt` covers
  seats and packs; a cash self-paced booking is neither — the same gap packs had before that
  service existed.
- **The athlete's monthly *spent*** is computed from `training_event`, so a self-paced
  purchase never lands in it. The coach-side mirrors were fixed today (poly-backend
  `10f8c012`, `b71c68d9`); the athlete side was not.
- **The `?sp=<offering>` scope chip** on `#s-client-selfpaced` is not built. The prototype's
  "two doors, one list": arriving from an offering scopes the list to it, ✕ widens to every
  self-paced with that client. Today the row lands on the unscoped list — the widened state,
  so not wrong, but not the design.

---

## 5. Written today, worth re-checking before it sets

Built this session without a `prototyper` pass and without checking the layout lessons in
`project_client_groups` (*"a plain list of people stays bare on the canvas"*; containers are a
1px outline on transparent; only things that group get a contour):

- the **Athletes roster** on the offering detail — rows are filled cards with a border;
- **Assign to a client** — a second athlete-picker entry rather than the existing flow;
- **Assign self-paced** on the person's list — a new offering-picker sheet.

The client-groups memory rejected this shape once already: *"an earlier bespoke 'participant
picker with a Lists section' was rejected as invented."*

---

## Deferred by the owner (2026-08-24)

**Packages × self-paced** — revisit after the feature is finished. Recorded because the spec
currently claims it works and it does not, so nobody should trust that line meanwhile:
Android's base-session picker filters to `SessionType.Personal`
(`CoachPackagePickSessionV2Screen.kt:100`), and a package offer is keyed on
`training_session_id` (`package_offers.py:120`) while a self-paced offering lives in
`self_paced_offering` — there is no column that could point at one. It is a data-model change,
not a missing filter.

---

## Not checked

iOS, entirely.
