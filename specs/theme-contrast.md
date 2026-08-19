# Theme contrast — what changed, and what it changed to

> Status: **Work in progress — nothing below is decided**
> Fitting room (look at it): [prototypes/lab/components.html](https://321-fit.github.io/project-spec/prototypes/lab/components.html)
> Tokens: `design-tokens/tokens/` → generated into `prototypes/lib/fit-ui-tokens.css`
> Last updated: 2026-08-19

Two artefacts, on purpose: this document is what you **read**, the fitting room is
what you **look at**. Every number here was measured in the fitting room's audit on
the rendered components, so the two cannot disagree — if you change a token, reopen
the room and the number moves.

**Read this as a shortlist, not a decision.** The corrections in §3–§4 exist in the
room behind the `Fixes: off ⇄ on` switch so the gain can be *measured* instead of
argued, and §6's grammars are drawn side by side for the same reason. Nothing has
been landed in `fit-ui.css` or in `design-tokens`, and no task exists for any of it.
The point of the switch is that the owner can flip it and disagree.

**With every proposal below turned on, measured:**

| | dark | light |
|---|---|---|
| today | 17 below AA | 47 |
| with the proposals | **8** | **9** |

Seven of each are the text-field boundary, left failing on purpose after the owner
rejected outlined fields (§3). The rest are deliberate (§5).

## How to read a row

`before → after` gives the token's value, then the measured contrast on the surface
that token is actually used on. **AA needs 4.5** for body text, **3.0** for large or
bold text and for the boundary of a control.

---

## 1. Editable vs disabled — the notes block  ✅ done 2026-08-18

**The report:** "the comment field on the client/coach card and the bio in settings
don't look like something you can tap and change — they look disabled."

**The cause was not colour, it was grammar.** The field was a transparent card with a
1px divider border and tertiary text. That is exactly the recipe for
`.fit-btn-disabled`, so it read as dead — and it was not even an editor, it pushed to
one.

| | before | after |
|---|---|---|
| a note **with content** | transparent + 1px divider + tertiary text | `--fit-surface-high` fill + **primary** text + chevron — the same shape as every other pushable row |
| a note that is **empty** | same card, tertiary "Add notes" | filled surface + **brand** label + `+` — an action row, because that is what it is |
| **editing** it | full-bleed contenteditable | `.fit-input-ta` on the editor screen |
| light-theme contrast | 3.7 : 1 ✗ | 13.7 : 1 ✓ |

**The rule that comes out of it, and the reason this will not come back:**

> **Outline + tertiary text is reserved for inactive.** Anything tappable carries at
> least one of: a filled surface, a brand-coloured label, or a trailing chevron.

Landed in `prototypes/flows/coach/clients.html` (both states). **Still to do:** the
same pass on the settings bio field and anywhere else the outline-card grammar was
used for something editable.

---

## 2. Light-theme text ladder — proposed, needs a decision

The light theme carries **41** elements below AA against dark's **15**, and most of it
is one thing: the quiet end of the text ladder is a step too pale. All of these are
**one-line token remaps** — the ramp already has the values.

Measured on `#F2F2F7` (screen) / `#FFFFFF` (raised surfaces):

| token | before | on screen | after | on screen | note |
|---|---|---|---|---|---|
| `text-tertiary-light` | `gray-500` | 3.70 ✗ | **`gray-600`** | 5.54 ✓ | captions, metadata, "12 sessions · €580" |
| `text-placeholder-light` | `gray-400` | 2.43 ✗ | **`gray-500`** | 4.13 ⚠ | see the ramp gap below |
| `text-secondary-light` | `gray-600` | 5.54 ✓ | — | — | already fine |

**Ramp gap — a decision for the owner.** Placeholder at `gray-500` measures **4.13 on
a white field**: better than 2.43, still short of 4.5. Going to `gray-600` passes but
makes an empty field look filled, which is its own bug. Either accept 4.13 as a
knowing exception (a placeholder is transient and is replaced the moment you type), or
add a **`gray-550`** to the ramp so it can pass cleanly. Nothing else in the system
needs 550, so this is the only reason to add it.

---

## 3. The input fill — the collision, and a decision  🟡 half done

**The report:** "the input colour always looks disabled, especially next to a
disabled button."

It is not a resemblance. Both took the **same token**:

| | `.fit-input` fill | `.fit-btn-disabled` fill |
|---|---|---|
| light | `#E4E6E7` | `#E4E6E7` — identical |
| dark | `#111213` | `#111213` — identical |

An active field and a dead button were the same plate; only the text colour
differed. Nothing about the field said it was alive.

### ✅ Done — disabled is no longer a filled plate

`.fit-btn-disabled` gave up `--fit-surface-low` and took the outline grammar from
§1: no fill, 1px divider, muted label. `opacity: 0.7` went too — it multiplied
whatever was underneath and made the measured colour unpredictable.

> **Filled means interactive. Outline plus muted text means inactive.** One rule,
> both themes, no exceptions.

### 🟡 Open — the field's own edge in light

Fixing disabled fixes the confusion, not the invisibility: in light the fill still
sits **1.09 : 1** from the page, so the field barely exists. Four candidates are in
the fitting room under *Input edge — pick one*, measured:

| | light | dark | what it costs |
|---|---|---|---|
| **A** fill + 1px `gray-500` hairline | **3.2 ✓** | **✓** | fields become outlined. The **only** candidate that behaves identically in both themes |
| **B** fill + soft shadow | passes the audit's shadow exemption | **invisible** — shadows do not read on dark | keeps light's card grammar, but becomes a light-only treatment, so the themes diverge anyway |
| **C** darker fill (`gray-200`), no edge | 1.4 ✗ | ✓ | borderless and unmistakably filled; fails the rule while looking better than today |
| **D** label above, quiet fill | field 1.1 ✗ | 1.2 ✗ | the label carries the meaning instead of the edge. Already in the system as `.fit-input-group`; works *with* any of the above rather than instead of them |
| **E** no edge — fields are rows in a container | n/a — nothing to measure | n/a | **what iOS actually does.** Added 2026-08-19 after the owner asked whether outlines were an Apple pattern. They are not. See the correction below |

**Recommendation: A.** B looks right in light and does nothing in dark, which is
how one component quietly becomes two. D is worth adopting anyway — a labelled
field is clearer regardless — but it does not make the field visible on its own.

### 🟡 …and the fill was the bigger half of it (2026-08-19)

The edge was never the whole story. In light the field was filled **darker than the
card it sits on** — the one editable thing on the screen was the one recessed below
everything else. That is the same signal `.fit-btn-disabled` uses, which is why the
original report said "looks disabled" and why an outline alone did not fix it.

### 🔴 Correction — Apple does not outline fields, and the white fill is right for a different reason

Asked directly: *is the outline how iOS does it, and were the grey fills wrong?*
Checked against the kit (`ios26-reference.md` §2b), not from memory:

**No, iOS has no outlined text fields.** Their answer to "a field on a page has no
edge" is that **a field is never on the page** — it is a **row inside a grouped
container**, and the container is the only thing that separates. So candidate **E**
was added to the room: a form drawn as one container, fields with no fill and no
border of their own. It needs no hairline and no white fill, because the container
already carries both.

**Which makes the input-edge question and §6 the same question.** A hairline round
every field is a workaround for *standalone fields floating on a page* — a shape
Apple does not have. Take grammar B for forms and the workaround disappears.

**And the white fill is correct, but not for the reason first written.** It is not
"white because it needs contrast". On a **grouped** light screen the page is grey and
everything raised on it — card, row, field — is white. Our grey fill was Apple's
**control fill** (`tertiarySystemFill`), and a control fill only ever sits **on
white**: a search bar in a white nav, a segmented control on a card. We had put a
fill-for-white onto a grey page, which is why it vanished. Grey field is not wrong
in general — it is wrong *there*.

| where the field is | fill | edge |
|---|---|---|
| a row in a form/container (most of our forms) | none — the container is white | none |
| standalone on a grey page | white | hairline, as a **fallback** only |
| on a white card / in a nav bar (search) | grey control fill | none |

**Revised recommendation:** keep the white fill (it is what the grouped model says),
treat A's hairline as a **fallback for standalone fields**, and settle it properly in
the §6 pass on real screens rather than deciding it on a specimen.

### ❌ Rejected on sight — 2026-08-19

Shown to the owner and turned down: *"I would not put edges on the inputs, it looks
bad."* Removed. An outline round every field turns a form into a grid, and it is not
a shape the platform has — which candidate E had already said.

**The honest consequence, unhidden:** the seven field boundaries come back as
failures. Below AA went from dark 1 / light 2 to **dark 8 / light 9**, and every one
added is `.fit-input` at 1.0 – 1.5.

That is not a regression, it is the argument moving to where it belongs. A standalone
field on a near-white page cannot be fixed by colour: the only two answers are an
outline (rejected) or a container (§6). Kept the hairline on `.fit-icon-btn` and
`.fit-toggle` — those have no fill of their own to be seen by, so for them it is the
whole boundary rather than a decoration on one.

---

## 3b. The other component shapes — two places each

These do **not** live in `fit-ui-tokens.css`. They are component rules, so each one
changes in `fit-ui.css` **and** in the native `FitUI` component. That is exactly why
this document exists.

| component | what fails | measured | why it matters |
|---|---|---|---|
| `.fit-toggle` | off vs on | **1.6** light (need 3.0) | the switch does not say whether it is on |
| `.fit-toggle` | boundary | 1.0 light / 1.5 dark | and you cannot see the track either |
| `.fit-icon-btn` | boundary | 1.1 light / 1.5 dark | reads as an icon floating on the page rather than a button |

### It is one decision, not three (2026-08-19)

`.fit-input`, `.fit-icon-btn` and `.fit-toggle` are the same defect wearing three
costumes: a near-white face on a near-white page, so there is no edge at all. Dark
has it too — 1.2 – 1.5 — where nobody noticed because a dark face on a dark page
merely *looks* intentional.

One hairline token closes all three in both themes:

```css
.fit-light { --fit-control-edge: #71757B; }   /* darker than the control */
.fit-dark  { --fit-control-edge: #868D96; }   /* lighter than it */
```

Measured with it on: every input, icon button and toggle clears 3.0 in both themes.
The switch keeps its mint **on** fill — the hairline does the seeing, the knob
position does the telling. So this is not "an input border": it is the missing
**control boundary** step, and it belongs in the token layer, not in three
component rules.

## 3c. We fitted Apple's palette. One idea from it is worth taking.

The fitting room switches between ours and the **iOS system colours** —
`Palette: ours ⇄ iOS` in the bar. It swaps surfaces, labels and separators **and**
the accents (systemBlue / Red / Green / Orange / Teal), and flattens the gradient
CTA, because iOS has no gradient buttons. Nothing goes near the tokens.

| | dark | light |
|---|---|---|
| our palette | 18 below AA | 44 |
| iOS system colours | **23** | **51** |

**Overall it measures worse, and that is not a mapping error.** Apple's quiet
labels are *alpha* — `tertiaryLabel` and `placeholderText` are 30% ink, about
2.5:1. Their surfaces are deliberately close to the page: a white card on
`#F2F2F7` is the same 1.09:1 we were calling a defect, `#1C1C1E` on black is 1.27.
Structure over there is carried by separators, grouped-list layout, SF's optical
size and Dynamic Type — not by contrast. Importing the colours alone imports the
weakness without the compensation. Their badge labels are no better than ours
either: saturated accent text on a pale tint, 1.7 – 3.4 in light.

### The one thing the fitting proved 🟢

| `.fit-btn-primary`, white label | measured |
|---|---|
| our brand **gradient** | **1.7** (at the green stop; 2.6 at the blue) |
| the same button **flat** | **4.0** light · 3.6 dark |

That has nothing to do with Apple — it is **flat versus gradient**. The gradient
is what makes our loudest component our least readable one, and flattening it is
worth more than every neutral in this document. It is also the one change that
touches brand identity, so it is the owner's call, not a fix I can just land.

**Verdict:** keep our palette. Take the flat CTA. Consider alpha-based quiet text
(one token stays correct on a page, on a card and inside a sheet — ours are tuned
for one surface and drift on the others). Fix badges and the ladder ourselves,
because neither palette solves those.

### The full fitting — corrected to iOS 26, brand kept ours

Two corrections after review:

**Brand stays ours.** Teal and green where they belong. The fitting is about
Apple's neutrals, type and shapes — not their identity. What is worth copying is
the *pattern*: Apple carries an accent **pair**, lighter for dark and darker for
light. We use one teal in both, which is why brand-coloured labels pass in dark
(`€580` reads fine) and fail in light at **1.7 – 2.5**. A second brand tone for
light fixes a whole class of failures without touching the brand.

**The shapes were the wrong era.** The first pass fitted iOS 17/18 — 10–12px
rounded rects. **iOS 26 went back to capsules**: inline controls are pills, nav
buttons are circles inside a floating glass group, and grouped lists sit in one
large rounded container. Measured after the correction: our buttons are 99px in
both modes, i.e. **our capsules already match iOS 26** and needed no change at
all. What actually differs is the container radius (20 vs our 12) and the list.

### The structural difference is the list, not the radius

| | ours | iOS 26 |
|---|---|---|
| a row | its own filled card, gap between rows | rows share **one** large container |
| separation | the gap and each card's own edge | a **hairline inset past the leading icon** |
| consequence | every card needs an edge or a shadow in light — where our contrast trouble starts | the container can sit 1.09:1 from the page, because structure comes from separators |

Both are drawn in the fitting room under *List grammar*. This is the one place
where copying Apple would change our numbers rather than our looks: it removes the
per-row edge problem entirely instead of solving it colour by colour.

**Counts with brand kept ours:** ours 18 / 50, iOS 29 / 57 (both up from earlier
because the list specimens added more quiet subtitles to measure).

**Still not iOS:** grouped-list layout with inset separators, Dynamic Type, and the
platform's own material effects. A real port is a redesign; this is a fitting.

## 3d. Components that ignore their own token

Found while fitting Apple's palette: swapping `--fit-surface-low` changed the input in
light and did **nothing** in dark. The cause is two hard-coded rules in `fit-ui.css`:

```css
.fit-dark .fit-input    { background: var(--fit-black); }   /* line 447  */
.fit-dark .fit-input-ta { background: var(--fit-black); }   /* line 1560 */
```

They bypass the surface token entirely, so in dark the field's colour has nothing to do
with `--fit-surface-low`. Today the two values happen to be the same hex, which is why
nobody noticed — and exactly why it is dangerous: **the day a token moves, one theme
follows and the other does not.**

This is the class of defect that makes a theme un-retargetable, and it is invisible to
any audit that only measures colours. It shows up only when you try to swap the palette
and something refuses to move.

**Rule:** a component reads its colour from a token, or the token is a lie. Theme-specific
literals belong in the theme block (`.fit-dark { --token: … }`), never in the component
rule.

**It is not two rules — it is 87.** Counting every `.fit-dark` / `.fit-light` rule in
`fit-ui.css` that sets `background`, `color` or a border to a literal or a raw ramp step
rather than a semantic token: **87**. Icon plates, badges, chips, cards, sheets, sport
tiles, tickets, spots bars — all carry their theme colour inside the component rule.

That is the real reason the light theme is hard to fix and why swapping a palette only
half-works: the token layer describes a minority of what is actually painted.

**To fix:** delete the two input rules first (they have a live consequence), then work the
87 down by moving each literal into the theme block as a semantic token. That is a
mechanical, reviewable pass — and until it is done, no palette change can be trusted to
land everywhere.

---

## 4. Badge labels — the tint moved, the ink stayed behind

Badge **fills** are fine; the **labels** on them are not. Twelve measure **1.2 – 2.5**
in light. The cause is historical: the tints were moved to darker accent steps and
the text on them was left at the bright 400/500 — `Request` is `#F7C948` on
`rgba(247,201,72,.15)`. The brand icon plate had a teal fill carrying a blue icon.

**Dark is the mirror of the same defect** and nobody looked: tint went dark, ink
stayed mid, and `Destructive`, `€50 owed`, `Joined`, `Full`, `Payment failed` all sit
at **4.1 – 4.5** — below AA by a hair, which is exactly the range that survives a
review because it "looks fine".

Measured on the composited tint, the inks that pass:

| | light ink | dark ink |
|---|---|---|
| yellow (`warning` / `pending` / `cash`) | `#7A4A06` — 6.4 | `#FFD98A` |
| red (`danger` / `full` / destructive / error banner) | `#A32322` — 6.3 | `#FF9A94` |
| blue (`info` / `group` / `special`) | `#075A75` — 6.4 | — |
| green (`success` / `joined`) | `#245C27` — 6.7 | `#8CE8A6` |
| teal (`accent`, brand plate) | `#0B5D4A` — 6.6 | — |

### ❌ Correction — a darker step of the same colour, never a different colour

The first pass set the brand ink in light to `#0B5D4A`, a dark teal-green. The owner
caught it: *"why did the blue on Add notes become dark green — keep it blue, just
darker, the way you did the pills."* Correct, and it exposes the sloppiness: for the
badges I took the same hue one step down, and for brand I quietly swapped the hue.

**And it needed no literal at all.** The ramp already carries the step, under a token
that names this exact job:

```css
--fit-color-text-on-brand-light: var(--fit-color-blue-700);   /* #06789d — 4.6 on white */
```

It was simply never used. `--fit-brand-primary` and `.fit-icon-plate--brand` now take
it in light. Which sharpens §4's finding rather than softening it: **blue is the one
accent that already has its ink-on-light step** — teal, and the rest, still do not.

> **The rule this produced:** an accent's light-theme ink is the same hue, a step or
> two down its own ramp. If the ramp has no step dark enough, that is a gap to fill in
> the ramp — not a licence to reach for a neighbouring colour.

### ⚠️ The rest are literals because the ramps have no step to point at

That is the finding, not the hex values. **Every accent ramp is missing its "ink on
tint" step:** the darkest step we own lands at 4.2 – 4.5, and **teal has none at all**
— its ramp stops at 600 = 2.2. `--fit-text-placeholder` has the same hole (gray-500 =
4.13, nothing below it passes).

So the real work is in Figma/`design-tokens`: each accent needs a pair — a light-ink
step and a dark-ink step — the way Apple carries an accent pair (§3c). Until those
exist, any fix in CSS is a literal pretending to be a token, which is the §3d defect
all over again.

Numbers per badge are in the fitting room under *Badges & pills* — turn the audit on.

---

## 4b. The measurer was wrong about one thing, and that matters more

A translucent **gradient stop** was read at face value: our selection tint is
`rgba(5,224,166,.2)` over the page, and it was scored as **solid mint**. The selected
chip was therefore reported failing at 1.7 when it passes comfortably.

Stops are now flattened over whatever is behind them before the worst one is picked.
Recorded here because the room's only value is that its numbers are trustworthy — a
false failure costs more than a missed one, since it sends someone to "fix" a
component that was never broken.

Related, and not a bug: the tally counts **everything below AA**, while the red badge
only marks a hard failure — near-misses (within 1.5 of the threshold) are amber. A
tally of 7 with one red badge is not a contradiction.

---

## 5. Deliberately left below AA

Recorded so nobody "fixes" them twice.

| what | measured | why it stays |
|---|---|---|
| white label on the brand gradient (`.fit-btn-primary`) | **1.7** at the green stop, 2.6 at the blue | it is the product's primary CTA and its identity. Changing it means changing the gradient. Flagged, not scheduled |
| `.fit-toggle` off-fill vs on-fill | **1.6** | this is a *state* comparison, not a boundary. Once both tracks carry the control hairline the switch is visible; which side it is on is told by the knob's position, as it is on every platform. Darkening the off track until the fills differ by 3.0 makes "off" read as another kind of "on" |

---

## 6. List grammar — we have three, and only one is written down

Not a style question. A **grammar** is how a row is separated from its neighbour, and
the choice decides how much contrast work the screen needs afterwards.

**A — cards.** Each row is its own fill with its own radius, air between them.

```
╭──────────────────────────────╮
│ ◯  Availability            › │      own fill, own radius
╰──────────────────────────────╯
              ← 8px
╭──────────────────────────────╮
│ ◯  Locations               › │
╰──────────────────────────────╯
```

**B — inset container** (what iOS 26 does). Rows share one fill; a hairline inset
past the leading icon separates them.

```
╭──────────────────────────────╮
│ ◯  Availability            › │
│      ───────────────────────  │     hairline starts after the icon
│ ◯  Locations               › │
│      ───────────────────────  │
│ ◯  Calendar sync           › │
╰──────────────────────────────╯
```

**C — full bleed** (Telegram contacts, Mail, Messages). The list *is* the screen:
no container, separators run to the edge, search and sticky section headers live
here and nowhere else.

```
 🔍 Search
──────────────────────────────────
 A
 ◯  Anna Kowalski
      ────────────────────────────
 ◯  Andrei Petrov
──────────────────────────────────
 B
 ◯  Bartek Nowak
```

### Why this belongs in a contrast document

**Because it decides how many times a screen has to pay.** A card must separate
itself from the page — in light that is white on `#F2F2F7`, **1.09**, once per row.
The container pays once for the whole block. Full bleed pays **nothing**: the only
edge on the screen is the hairline between rows.

| | separations per screen | contrast cost |
|---|---|---|
| A cards | one per row | highest — every row needs an edge or a shadow |
| B container | one per block | low |
| C full bleed | none | **zero** |

That is why B and C are not decoration. They remove the per-row edge problem instead
of solving it colour by colour, which is the whole of §3b.

### Which grammar, and why

The axis is not "menu versus object" — it is **how many rows there are and where they
come from**.

| | A cards | B container | C full bleed |
|---|---|---|---|
| how many rows | 3–12, known when the screen is designed | 3–8, fixed | hundreds, from the backend |
| rows alike? | no — different heights, statuses, swipe, menus | yes | yes, all identical |
| search / sections / index | no | no | **yes, and only here** |
| is the screen the list? | no, it is one block among others | no | **yes, entirely** |

**In one line: as many as there are is which grammar you get.** A handful of
different objects → cards. A handful of identical entries → container. Many
identical records with a search field → full bleed.

**Where ours land** (to verify against `prototypes/INDEX.md` before any port):

- **Full bleed** — chats / Inbox, CRM contact import, the athlete and group-invite
  pickers, the Country / Timezone / Languages selectors, the sport picker (33 in 8
  sections). All push screens with a search field; they are already asking for it.
- **Container** — Settings, Availability hub, Locations, Account Access, Personal Data.
- **Cards** — clients, sessions, events, coaches, packages. Status, swipe, overflow
  menu — they need their own borders.

**One genuinely mixed case:** coach search results. Many records, but each carries
video, rating, price and a button. That is a full-bleed *scroll* with card content —
not a fourth grammar, and worth naming so nobody invents one.

**Honest caveat on B and C:** the hairline between rows measures **1.6** in light, so
by the letter of WCAG it fails too. It is not required to pass: structure is carried
by the 44pt row, the 17px title and the chevron, and the hairline only hints. This is
exactly the case the owner already called — the audit is a floor under money, states
and errors, not a ceiling over everything.

**Cost of taking B and C seriously:** a class in `fit-ui.css` and a `FitUI`
equivalent, then re-drawing the rows on roughly a dozen screens. It is markup, not
colour, so none of it comes through the token pipe.

### What the real screens said — 2026-08-19

Drawn on the live screens, not on demo rows:
**[lab/list-grammars.html](../prototypes/lab/list-grammars.html)** — left is exactly
what ships, right is the same markup wearing the other grammar. Generated by
`tools/lab/build-grammars.mjs`, which lifts each screen out of its prototype by tag
depth, so the comparison cannot drift from the thing it claims to show.

Four things came out of it, two of them against what is written above:

**1. We already use all three, and choose between them by accident.**
`shared/messages.html` is **already full bleed** — `.dm-row`, no card, no radius.
Nobody decided that; it was simply drawn that way. That is the actual problem this
section solves: not "which grammar should we adopt", but "we have three and no name
for any of them", so each new screen picks one by whoever drew it.

**2. ⚠️ Correction: the sport picker is not a list.** Written above as a full-bleed
candidate. It is a **grid of tiles in sections** (`.sp-card` × 30 in `.sp-grid` × 9)
— a fourth shape entirely, and the right one for choosing among things you recognise
by name. Do not port it. The Country / Timezone / Language selectors *are* the
full-bleed case (`.cal-select-row`, 117 of them).

**3. ⚠️ B buys less on Settings than the theory promised.** Seven rows — but the
sections are *Profile* (2), *Scheduling* (1), *Calendar* (1), *Payments* (2),
*Account* (1). Five of seven rows are alone in their section, so they stay
card-shaped whatever we decide. Real merges: two. The screen that would actually
gain is a long single-section list, not this one.

**4. It is markup, not CSS — confirmed by trying.** The section title sits *inside*
the same flex wrapper as its rows, so no selector can group the rows without
swallowing the title. The lab page adds a wrapper element at runtime, and that
wrapper **is** the port: adopting B or E means every grouped run gains a container
element in the HTML and in `FitUI`.

And one thing found only by doing it: **E applies to a homogeneous run of fields.**
On `personal-data.html` the same `.fit-input-group` class also wraps the video
uploader and the cover-image row; grouping those glues a media block onto a name
field. So a mixed form is *runs of fields in containers, media blocks as cards
between them* — which is exactly how the iOS Settings app is built.

---

## Order of work, and why

`fit-ui.css` already `@import`s a **generated** `fit-ui-tokens.css` produced from
`design-tokens/` by Style Dictionary. So the prototype and the native app are not two
sources of colour — they are one source with a **manual copy step** for the CSS file.

Therefore: **colour changes start in `design-tokens`**, get regenerated, and the
refreshed `fit-ui-tokens.css` is copied into `prototypes/lib/`. The prototype then
shows the new values with no further edits, the native components get them from the
same build, and a web stand consuming the generated CSS gets them for free.

**Component-shape changes** (§3) have no such pipe. Those are hand-written in
`fit-ui.css` and hand-written again in `FitUI`, and the only thing keeping them in
step is this document plus `design-tokens/docs/components.md`.

**Next actions, in order** — all still waiting on the owner, none of them started:

1. **Flip `Fixes` in the room and decide** whether the §3–§4 corrections are the ones
   we want. Everything below assumes yes.
2. **Add the missing ramp steps in Figma** — an ink-on-tint pair per accent, plus a
   passing placeholder. Without them §4 lands as literals (§3d).
3. **Add `--fit-control-edge`** as a real token; it retires three component fixes.
4. ~~Pick the canvas depth~~ — **decided 2026-08-19: `#F2F2F7` stays** (1.09, matches
   iOS). No token change. If §6 goes to grammars B/C the depth stops mattering anyway.
5. **Decide on §6 grammars** — this one is markup and a dozen screens, so it wants
   its own pass and probably its own tasks.
6. §2 text ladder, then §3d's 87 rules, which gate everything being trustworthy.

Each one: change the token, regenerate, reopen the fitting room, paste the new
number into the table here.
