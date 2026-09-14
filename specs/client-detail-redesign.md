# Client Detail — redesign (draft J and the screens it reaches)

> Status: **Draft — work in progress.** Nothing here is confirmed for development; the prototype is the argument, this page is its index. Decisions marked ✅ were agreed with the owner in review on 2026-09-01…14; ⏳ are still being tried.
> Prototype: [flows/coach/client-detail-drafts.html#s-draft-client](https://321-fit.github.io/project-spec/prototypes/flows/coach/client-detail-drafts.html#s-draft-client) — the whole flow walks inside that one file (every screen it reaches is copied in; the look switch at the top of the annotation column applies to all of them).
> Supersedes (once approved): the Client Detail section of [clients-coaches.md](./clients-coaches.md) (`#s-client-detail`) and the per-client self-paced / packages sections. It does **not** change endpoints — everything renders from data the shipped screens already load.
> Last updated: 2026-09-14

## 0. What this is

The shipped coach Client Detail (`clients.html#s-client-detail`) is not missing anything — it is ordered by the spec's table of contents instead of by the coach's job, and says several things twice. Drafts A–K explored what belongs on the screen and how it is painted; **J** is the one being finished. This spec records the layout, the screens it opens, their states, and the rules that came out of it, so that a hand-off can be cut from it once confirmed.

Two things ride along because J forced them into the open: the **per-client Self-paced** and **Packages** screens redrawn in J's grammar, and a **look switch** (plain / tinted canvas) that is a proposal for the whole coach side, not just this screen.

## 1. The screen (J)

Order, top to bottom: **who this is → what you owe an answer to → what is next → the money → the week → the assets.**

```
‹                                   ⋯
            (AK)
        Anna Kowalski
 Tennis · Fitness · 8 months · 47 sessions
 [banner: archived / blocked / deleted]      ← only when a status applies
 ( + )    ( 💬 )    ( ▶ )    ( ▢ )
 Book    Message  Self-paced Packages        ← 52px circles, fixed slots
 Needs you
 [● €70 · 2 sessions] [● 2 clips] [● Request]← chips; block gone when empty
 Next session
 ┌ ▓ Tomorrow · 10:00        [Request] ┐    ← card, no buttons; state in the calendar's language
 └   Tennis · 60 min · TNT Studio      ┘
 Money                       €1 640 earned
 ┌ €70                              › ┐    ← row → Owed list (not a "Mark paid" button)
 │ Owed · 2 sessions, cash · oldest 12d│
 │ €320 Paid this month │ 1 left Tennis│
 └─────────────────────────────────────┘
 This week                     3 sessions
 ┌ rows → the calendar's event drawers ┐
 Anna
 [groups (faces)] [addresses (map)]
 [note (plate)]   [47 sessions · History]
```

### 1.1 Rules ✅

| Rule | Why |
|---|---|
| **Circles carry weight, not errands** — Book · Message · Self-paced · Packages. | *Mark paid* and *Note* were tried as circles and pulled: a one-tap errand must not own the biggest control on the screen. |
| **Slots are fixed.** Only forced swap: CRM contact → *Message* becomes *Invite* (no app account). | A button that changes under the thumb is how wrong taps happen. |
| **⋯ administers the relationship** (Add to group · Edit info · Archive · Block; CRM: + Invite to app, − Block; deleted: Archive only). **No item is in both** ⋯ and the circles. | *Schedule* left the menu when *Book* became a circle. |
| **Circles are 52px** (`.fit-action-circles--sm`, landed in `fit-ui.css` 2026-09-04). | Four at 64px owned the first screen. |
| **Nothing is pinned.** | A sticky pill bar over the identity was tried and dropped. |
| **Needs you is the only variable block at the top** and absorbs the pending-payments carousel, self-paced *To review*, an open request. Empty → gone. | One place to look for "what do I owe". |
| **Next session is a card, no buttons.** Tap → the calendar's state-aware event drawer over this screen. | The drawer's footer already carries the answer per state (Decline/Accept · Cancel/Reschedule · Cancel request/Reschedule) and its ⋯ has Edit details / Message; card buttons duplicated it. |
| The card carries the **state in the calendar's language**: yellow perimeter + tint + `Request` badge = act on it; dashed + `Awaiting` = tentative; plain = planned. Badge sits on the title line so the card never grows. | Same visual as the calendar tile, so it is learned once. |
| **Money is one widget above This week.** Debt headline is a **row that leads to the Owed list** — not a *Mark paid* button. Paid-this-month + pack credits read under it; no progress bar (the Packages circle already counts it). | A settle is per entity on the backend (personal event / group seat / self-paced booking / pack lot — four endpoints, no per-client or per-transaction one, see [payments.md](./payments.md) and memory *cash-settlement-drawer*). "Mark €70 for 2 sessions paid" cannot be one tap; a button saying so lies. |
| **This week never disappears** — empty is a quiet row. | The block must not jump in and out between weeks. |
| **Every asset tile leads with a visual** — faces for a group, map thumb for addresses, icon plate for note/history. | Four unlabelled text tiles were unreadable at a glance. |
| **Blocked keeps Next session + This week**; deleted hides them. Both grey only Book + Message; Self-paced / Packages stay readable; **cash stays settleable through every state**. | Spec: block preserves upcoming sessions, the coach cancels by hand. |

### 1.2 States (annotation toggles on the prototype)

| Axis | Values |
|---|---|
| Status | Active · Nothing to do · Fresh · CRM · Archived · Blocked · Deleted |
| Next session | Planned · Request · Awaiting · Nothing booked (→ secondary *Book a session*; not gradient — the Book circle already owns the one brand fill) |
| Money | Owed · Nothing owed (headline becomes paid-this-month, red leaves, debt chip hides) |
| Load | Loaded · Loading (identity + circles instant; skeleton below) |

Fresh = subtitle *joined 2 days ago*, no badges on circles, Needs you gone, Money gone, This week = quiet row, groups → *No groups · Add to a group* tile, note → dashed add-zone, addresses/history not shown until they exist.

### 1.3 Where every tap goes

| Control | Destination | Exists as |
|---|---|---|
| Book | booking flow, athlete pre-filled: session → time → review → **back on J with Next session = Awaiting** | `invite.html?mode=schedule` |
| Message | thread | `shared/messages.html#s-thread` |
| Self-paced | per-client self-paced (§3) | new draft; canon `clients.html#s-client-selfpaced` |
| Packages | per-client packages list (§4) → pack detail | new draft; detail = `clients.html#s-pkg-detail` |
| chip €70 · money row | **Owed** list (§2) | new |
| chip clips | self-paced review | `shared/self-paced.html#s-review` |
| chip request · Next session · This week rows | event / group drawer over this screen | `calendar.html` sheets (deep-link `#event-<state>` / `#group-<state>` added there) |
| groups tile · ⋯ Add to group | membership | `client-groups.html#s-add-to-group` (§5) |
| addresses · note · history · ⋯ Edit info | as shipped | `clients.html#s-crm-addr-pick` · `#s-client-notes-editor` · `#s-client-history` · `#s-create-client` |
| ⋯ Archive / Block | confirm sheets → status banner on J | as shipped |

## 2. Owed (new screen) ✅

Reached from the €70 chip and the money row. Shape = `balance-v2#s-pending` (hero + canon `.fit-txn` rows); drawer = the canon cash-settlement drawer (*Mark as paid* / *Waive*, tap is final).

- **Unpaid** group: one row per owing entity (session · date · place · age in red · amount). Row → drawer.
- Settled row slides out and lands at the top of **Settled** (*Marked paid just now* / *Waived just now*, €0 on waive); hero recounts; snackbar. The coach is not thrown back to J.
- Last one settled → hero `€0 · Nothing owed · Anna is settled up`, Unpaid group gone, receipt stays. No celebration card.
- Row kinds share one shape (personal cash session, group seat, self-paced booking, cash pack); the endpoint differs underneath.
- Unchanged through archived / blocked / deleted.

## 3. Self-paced per client (draft) ⏳ layout agreed in review, not yet ported to canon

Title `Anna's self-paced` (name in the title, **no person row** — see §6). Vocabulary per [self-paced.md §4](./self-paced.md): *To set up / Sent / To review / Done*.

```
 To set up                               3     ← yellow request perimeter + tint
 ┌ ▓ Tennis self-paced · 2h ago · by Thu 17   Build › ┐
 │ ▓ Core strength · yesterday · by Sat 19    Build › │
 └ ▓ Hip mobility · 3 days ago · by Sun 20    Build › ┘
 To review                               5
 [poster ▶ 0:42] [Marked done] [poster …]   ← horizontal strip
 Sent                                    2
 ┌ ▓ Mobility reset · started · 1 of 3  ▬▬▬░░  due Sun ┐
 Done
 [9 done · avg 4.4★ · 6 with clips · last Apr 2 → All]
 [ Assign self-paced ]
```

- **To set up is the first block, one panel for 1..N**, oldest first, `Build ›` on the row, request perimeter (yellow outline + tint — the calendar's "act on it"). A hero card for the debt was tried and dropped ("1 of 3" unreadable; one request looked like a campaign).
- **Clips are pictures**: poster + play glyph + duration; *Marked done* plate when there is no clip.
- **Sent is quiet** — progress bar + due day, no accent.
- **Done is one tile**; the full list is the canon screen, one tap behind.
- **Fresh**: one green card (text at the top, `Assign ›` bottom-right), footer hidden. Violet (the self-paced type colour) on the hero was rejected — too loud.
- Footer `Assign self-paced` → the builder (offering known).

## 4. Packages per client (draft) ⏳

The circle used to land on one pack — wrong the day she holds a second type. The missing middle: `Anna's packages` list → pack detail (lots).

- **One row per session type, lots aggregate** (decision 2026-07-14): tile · name · `Personal · 2 packs · 11 of 25 used` · bar (current lot) · what is left (amber when ≤1, red amount when cash unpaid).
- **Needs you chips**: cash pack not received (→ that pack, *Mark received* lives there) · pack running low (→ that pack, *Offer renewal*).
- **Used up** = one history tile. Footer **Sell a package** → the canon sell sheet (tier · card/cash), moved here from the detail.
- States: 3 packs · Nothing to chase · None yet.

## 5. Groups membership ⏳ decision proposed, canon still has the footer

The canon `#s-add-to-group` footer read *Save* with nothing changed, *Add to 2 groups* after adds, *Save changes* once a removal was in — three labels for one button and a Save that could do nothing.

- **A group is a state, not a form: membership applies on the tap.** No footer.
- **Every tap lands a snackbar with Undo** (5 s, the participant-remove pattern). The chat side effect (join/leave line) commits when the window closes.
- Fallback if instant apply is rejected: keep the footer, **disabled until the set differs** from the start, label = the diff. Never an enabled Save that does nothing.

## 6. Nested screens: name in the title, no person row ✅

`Anna's self-paced` · `Anna's packages` · `Anna's history` · `Anna's groups` (already canon). A 60px row repeating who we are looking at, on every nested screen, was chrome. Reached from elsewhere (offering detail), back returns there; the client is one tap away on J.

## 7. Look: plain vs tinted canvas ⏳ proposal, coach side

What was draft K is a **switch, not a screen**: any dark phone with `.k-alpha` — the brand gradient owns the canvas, every surface is a flat `rgba(0,0,0,0.28)` scrim over it (alpha surfaces, not blur). Token overrides do most of it (`surface-high` → alpha black), so canon screens and drawers pick it up with no per-screen work. **Dark only** — a light canvas with darkened cards reads as dirty; light needs the opposite recipe, which is a second design.

Agreed so far on the tinted canvas:
- **Primary CTA = white with depth** (paper fall-off, top hairline, inset bottom shade, soft drop shadow, faint teal glow; same on the Book circle). A flat white plate read as a sticker; the gradient CTA has nothing to stand against when the canvas *is* the gradient. **Flat teal rejected.**
- **Sheets, ⋯ menus, snackbars are a blurred material** (`rgba(5,24,31,.8)` + `backdrop-filter: blur(28px) saturate(1.5)` + top hairline + a teal breath at the top). Blur is right on a layer above the screen and still wrong on cards.
- Implementation note: the canvas paints via `isolation: isolate` on the phone + `::before { z-index: -1 }`. Never reposition children to get above it — that broke every screen with an absolute footer.

Open: whether tinted becomes the coach default (then the athlete side needs its own light recipe), and whether the white CTA holds up on plain dark.

## 8. Not decided / not done

- Port back into canon files once confirmed: membership-on-tap (`client-groups.html`), name-in-title on nested screens, the self-paced and packages drafts (currently only in the drafts file; the canon copies there are snapshots — edit the source, re-copy with `~/.claude/scripts/proto-extract-screens.py`).
- The canon copies reached from J (Book ×3, Message, Edit info, Addresses, Note, Review, Setup) are still in the old flat style; if J wins they get the same pass.
- `Money` section title has no destination: a per-client ledger does not exist (the earnings ledger has no client filter).
- Money widget option **D — a swiper** (Debt → Pack → Payment history, like Coach Balance Cash/Card) stays parked, worth a later try.
- Event drawer copied into the flow shows the calendar demo's price/method; the sheet has no id on the price to override.
- Open from J's annotation: does a coach lose the actions on a long client now that nothing is pinned? *Book* is duplicated in the Next-session slot, which may be enough.
