# Reference Implementation Stand — replacing doc-driven handoff

> Status: **Decided, not started** (decision 2026-08-03) — build starts once the team is briefed
> Owner: Yuri
> Related: [design-system.md](./design-system.md) · [system-overview.md](./system-overview.md) · [prototypes/INDEX.md](../prototypes/INDEX.md)
> Tracking issue: 321-fit/project-spec#27

## 1. Problem

Two distinct failures in the current prototype + spec → developer pipeline. They have different causes and different fixes; conflating them was the reason earlier attempts to "improve the docs" did not help.

```
BUG 1 — devs cannot reconcile the spec with the prototype
   → FRAGMENTATION
   truth is spread across specs/*.md (500+ lines) + 4 prototype screens
   + memory + issue body + comments. The developer has to assemble it. He does not.

BUG 2 — spec gets updated, devs build the stale version
   → CHANGE PROPAGATION
   an issue is a snapshot; spec and prototype are living documents.
   Nothing links them. Editing coach/calendar.html produces no signal in issue #142.
```

A third, more expensive failure sits behind both: **backend defects are only discovered when a client implements against the API**. Reading a backend PR cannot surface "the response is missing a field the screen needs", "rendering this screen takes 4 round trips", "this state is unreachable", or a timezone displacement (`poly-backend#836`). Today the person who discovers these is an iOS/Android developer in week 3 — the most expensive possible moment.

## 2. Decision

Stop shipping raw docs as the primary handoff artifact. For each new feature, **we (product + Claude) build the backend and a web stand that exercises it**, then hand mobile developers a frozen contract plus a clickable reference.

```
BEFORE
spec → BE implements → merge ("looks well written")
                          │  weeks
                          ▼
       iOS dev starts → blocked → chat → contract fixed → client reworked

AFTER
spec sketch → BE + web stand built together, iterating
                          │  days, feedback loop = minutes
                          ▼
       contract frozen → mobile devs get a live API + clickable reference
```

The two halves carry different risk and are adopted with different confidence:

| Half | Nature | Drift risk | Adoption |
|---|---|---|---|
| **Backend** | not a reference — it *is* the product; mobile consumes this exact API | impossible | **adopt now, no pilot** |
| **Web stand** | a third client | real, must be managed | **adopt via one measured pilot** |

### Guardrail — backend ownership

Backend work authored by product + Claude ships as a normal PR, **merged only with approval from the backend owners** (iQiexie / Nikita-Savelev), with the existing verification gate (ruff + mypy + import check + alembic) mandatory in CI. We take speed and contract accuracy; they retain ownership of quality, migrations, performance and security.

## 3. The stand is an instrument, not an app

Its job is to find defects, not to look good. Requirements, in priority order:

| Capability | Why it exists |
|---|---|
| **Two roles side by side** — coach tab and athlete tab against the same data | two-sided flows (invite, approve, book, cancel, settle) are where our bugs live, and nobody tests them end-to-end today |
| **Network panel next to the UI** — every request/response visible | half of all "backend bugs" are "the response lacks a field the screen needs"; you must see the payload, not guess |
| **Timezone + clock override** | the entire calendar surface; `poly-backend#836` reproduces in five minutes with this, and not at all without it |
| **Seed + reset of test data** | determinism — one button returns a known state |
| **Fast login as seeded users** | switching roles in seconds instead of registering |

Styling: reuse `prototypes/lib/fit-ui.css` verbatim so it is not painful to look at. **Zero cycles spent on visual design during this phase.**

### What the stand catches — and what it does not

- **Only the stand catches:** missing response fields · N+1 round trips per screen · unreachable states · ordering/pagination surprises · unhandled empty states · the other side not seeing what it should · timezone and currency behaviour.
- **It does not catch:** load, concurrency, authorization, regressions in existing code. Those stay with the backend owners and CI.
- **It does not replace API tests — it generates them.** Tests verify what you thought to check; hands find what you did not think of. Correct order: find by hand, then lock with a test.

The compounding payoff: once flows exist in the stand, they become e2e tests, and a backend regression is caught by CI in minutes rather than by a mobile developer a month later.

### Where NOT to apply it

Only to **new backend surface**. Existing live endpoints do not get a stand retroactively "just in case" — only pointwise, when there is a known drift.

## 4. UI polish moves into the stand

Once the backend behind a screen is verified, refining that screen's UI happens **in the stand, not in the prototype**. The cost argument that previously favoured the prototype does not survive scrutiny:

```
prototype screen              stand screen
────────────────              ────────────────
markup + CSS                  markup + CSS       ← identical
fake data inline              wired to the API   ← the only delta
                                └── already paid for during backend testing
```

The expensive part of a stand screen is the plumbing, which we build anyway to test the backend. Refinement on top of a working screen costs roughly what refining a prototype costs — and produces better decisions, because a static mock lies systematically in the convenient direction:

- a 34-character client name breaking the card · missing avatars · 0 items · 47 items · pagination
- **latency** — spinner vs skeleton vs optimistic update cannot be decided from a picture, only felt
- real errors: 409 conflict, timeout, double tap
- transitions *between* states rather than states listed side by side
- timezones and currencies on live values

Most valuable of all: **UX and API get designed in one head in one session.** "This screen also needs a last-session field" becomes a ten-minute backend edit instead of a ticket, a week, or a dropped idea.

## 5. Canon boundary — prototype vs stand

The prototype does not die; it moves **up the funnel** into exploration and into features whose backend does not exist yet.

```
EXPLORATION                    →      REFINEMENT
what goes on the screen at all,       the screen exists; make it right
what structure, is there a backend    on live data
        ▼                                     ▼
    prototype                             stand / web
  cheap, disposable                   better, and no more expensive
```

**Rule (mechanical, enforceable):**

| Screen state | Canon | Prototype file |
|---|---|---|
| no backend yet | prototype | live, canonical |
| backend exists, screen is in the stand | **stand** | marked `superseded`, no further edits |

Enforcement: `prototypes/INDEX.md` gains a canon-status column; a superseded prototype renders a banner linking to the stand; the canon-change bot (§8) keys off the same column.

Without this rule we create a *third* drift point instead of removing one.

## 6. Order of work within a feature

```
1. stand — shake the backend, find contract defects      (ugly, fast)
2. UI refinement on live data                            (fix the API here if UX demands it)
3. FREEZE contract + UX together → hand off to mobile
4. later changes only via the canon-change bot (§8)
```

**Do not hand the API to mobile before step 2.** Otherwise UI refinement starts moving the contract under a developer who has already begun — reproducing BUG 2 by our own hand.

## 7. Component libraries and tokens

### 7.1 We already run the shadcn model

shadcn is not a dependency, it is a model: copy the component into your repo, own it, colour it with your tokens. That is exactly `fit-ui.css` + Style Dictionary → Swift/Compose + `INDEX.md` as the registry. We are not missing a library — we have one:

```
fit-ui.css       383 classes, ~30 families (cal, sheet, profile, badge, input …)
FitUI SwiftUI     46 components
FitUI Compose     28 components        ← the actual gap
```

No cross-platform library exists that supplies one component set for SwiftUI + Compose + web with a neutral design, and none can — three runtimes with incompatible layout models. The only thing that genuinely crosses platforms is tokens, which we already cross.

### 7.2 What to take from the market

- **Web stand only: headless behaviour primitives** (Radix UI / Base UI / React Aria / Ark UI). They ship zero pixels — only accessibility, focus traps, keyboard, ARIA, comboboxes, date pickers. That is the tedious 20% that actually eats web time. `fit-ui.css` supplies the appearance.
- **No Tailwind**, no external visual system (MUI, Material directly). A competing styling language dilutes the canon.
- **Native iOS/Android: nothing to adopt.** Compose keeps Material 3 as its base with `FitUI` wrapping it; SwiftUI keeps Apple + our wrappers. Community kits are single-purpose or opinionated.
- **React Native is out of scope.** RN component kits are real (gluestack-ui, React Native Reusables, Tamagui, NativeWind) but they only pay off if the apps are RN. Rewriting two shipped apps with LiveKit, Stripe, calendar drag & drop, native pickers, haptics and deep links is a strategic bet, not an answer to "UI eats time".

*Library names to be re-verified before anything is installed; the structure of the decision does not depend on versions.*

### 7.3 Tokens do not solve desktop

Tokens are values. The mobile/desktop difference is ~20% density (tokens can express this) and ~80% layout and navigation (tokens cannot express this at all). There is no ready token package from which desktop falls out.

Two mature **structures** worth copying:

**① A `scale` dimension (Adobe Spectrum model).** One token set, two scales — touch and pointer. Same component, values substituted per device.

```
component.button.height
    ├── touch:   50      ← mobile, HIG 44+
    └── pointer: 40      ← desktop, denser
```

Style Dictionary handles this natively — a second branch in JSON and a second set of CSS variables. Our token tree is already the right shape (`color-palette` → `color-semantic` → `components`, themes split inside values); it is missing exactly this one dimension.

**② Window size classes (Material 3).** Compact / Medium / Expanded plus the canonical adaptive layouts (list-detail, supporting pane, feed). The best-maintained public spec for adaptive layout — copy the decision structure, not the Material look.

## 8. Desktop readiness — pay now, cheaply

The stand is **not mobile-only**. One codebase, two shells:

```
             ┌──────────── the same components ───────────────┐
             │  card · row · form · badge · list               │
             └────────────────────┬───────────────────────────┘
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
        ┌───── PHONE (default) ───────┐   ┌──── DESKTOP (toggle) ─────┐
        │  phone frame                 │   │  sidebar                  │
        │  bottom tabs                 │   │  list | detail side by side│
        │  bottom sheet                │   │  modal / popover          │
        │  push navigation             │   │  hover, keyboard          │
        │  ← canonical mobile reference│   │  ← web usability          │
        └──────────────────────────────┘   └───────────────────────────┘
```

Content components are viewport-agnostic; only the **shell** changes — where navigation lives, how many columns, how an overlay is presented. Mobile developers always look at the phone view, so the reference stays exact. A real web product (the Preply case: no install, shareable link, coaches managing schedule/clients/money from a laptop) becomes a decision we can make later rather than a rewrite.

**Six rules — nearly free now, expensive retroactively:**

| # | Rule | Why |
|---|---|---|
| 1 | Introduce `touch` / `pointer` in tokens even if the values are identical today | later it is one JSON edit, not 383 classes |
| 2 | A component never knows the phone width — the shell sets it | otherwise `width: 390px` is scattered inside and desktop is impossible |
| 3 | Overlay is an abstraction with a presentation slot: sheet (touch) / dialog\|popover (pointer) | 17 `sheet` classes exist — the most expensive item if not designed for |
| 4 | Navigation is data; the shell decides bottom tabs vs sidebar | otherwise tabs are welded into every screen |
| 5 | List and detail are **separate** components | so they can sit side by side on desktop instead of being rewritten |
| 6 | No hard-coded 390/430 in content | same as 2, at the markup level |

**Risk:** once a desktop view exists, the mobile reference gets diluted — a developer screenshots the wrong view. Mitigation: phone view is the default, desktop sits behind a toggle, and issue links always carry the phone view explicitly.

## 9. Change propagation (needed in every scenario)

**A1 — canon-change bot.** `project-spec` has no `.github/workflows` today. On push, resolve which open issues reference the changed spec/prototype/stand files and comment on them:

```
Issue #142 created  ──→ pinned: project-spec@e133cac
                              │
        coach/calendar.html + specs/group-training.md edited
                              ▼
        ┌──────────────────────────────────────────────┐
        │ 🤖 Canon changed since this issue was created │
        │ • coach/calendar.html — s-invite modified     │
        │ • group-training.md — §4 rewritten            │
        │ Diff: <link>   Current: <Pages URL>           │
        │ Tick [x] "reconciled" before opening a PR.    │
        └──────────────────────────────────────────────┘
```

This removes the product owner as the human synchronisation channel — the failure mode behind BUG 2.

**A2 — PR gate.** PR template requires "reconciled with canon at commit X" plus a screenshot beside the reference. Today the mismatch is caught by the product owner eyeballing an open PR; A2 moves the check to the developer, before review.

## 10. What we are explicitly NOT doing

- Not replacing the prototype — it moves to exploration and to backend-less features.
- Not building a desktop layout now — only keeping the path open (§8).
- Not committing to the web stand as a *product* (support, bug SLA, permanent parity with mobile). It starts as an internal reference; promoting it is a separate decision.
- Not adopting an external visual system or React Native.
- Not routing small changes and existing features through the stand — new/complex features only, so the product owner does not become a serial bottleneck.

## 11. Pilot and success criteria

One feature, end to end: backend + stand + spec delta. Selection criteria: **new** backend surface, self-contained, two-sided flow, not realtime.

Measure:
- time spent by us
- number of questions asked by mobile developers
- number of divergences caught at PR review
- number of contract defects found in the stand vs found later by a mobile developer

Fork in the road, decided on numbers rather than belief:
- markedly fewer questions → extend to all new features
- no change → keep the backend half only (it pays for itself regardless) and return to prototype + A1 + §5

## 12. Open items

- [ ] Pick the pilot feature (candidates to verify against open issues; must not be started or blocked)
- [ ] Confirm current state of headless primitive libraries before installing anything
- [ ] Decide the stand's hosting (Pages is private/Enterprise today; a real app needs a host) and which backend environment it points at
- [ ] Compose gap: ~18 components behind SwiftUI — close it independently of this decision
- [ ] Establish the promotion rule "used 3+ times → into the canon, on all three platforms"
