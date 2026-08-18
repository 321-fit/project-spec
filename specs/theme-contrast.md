# Theme contrast — what changed, and what it changed to

> Status: In Progress
> Fitting room (look at it): [prototypes/lab/components.html](https://321-fit.github.io/project-spec/prototypes/lab/components.html)
> Tokens: `design-tokens/tokens/` → generated into `prototypes/lib/fit-ui-tokens.css`
> Last updated: 2026-08-18

Two artefacts, on purpose: this document is what you **read**, the fitting room is
what you **look at**. Every number here was measured in the fitting room's audit on
the rendered components, so the two cannot disagree — if you change a token, reopen
the room and the number moves.

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

**Recommendation: A.** B looks right in light and does nothing in dark, which is
how one component quietly becomes two. D is worth adopting anyway — a labelled
field is clearer regardless — but it does not make the field visible on its own.

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

## 4. Badge labels in light — the largest single win

Badge **fills** are fine; the **labels** on them are not. Twelve of them measure
**1.2 – 2.5** in light. This is one edit per semantic colour (the `-on-light` text
value), not per badge, so it clears roughly a third of the light-theme failures.

Numbers per badge are in the fitting room under *Badges & pills* — turn the audit on.

---

## 5. Deliberately left below AA

Recorded so nobody "fixes" them twice.

| what | measured | why it stays |
|---|---|---|
| white label on the brand gradient (`.fit-btn-primary`) | **1.7** at the green stop, 2.6 at the blue | it is the product's primary CTA and its identity. Changing it means changing the gradient. Flagged, not scheduled |

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

**Next actions, in order:** §3 needs the input-edge pick (A recommended) → §4 badge
labels (biggest win per edit) → §2 text ladder → §3b once the edge language is
settled. Each one: change the token, regenerate, reopen the fitting
room, paste the new number into the table here.
