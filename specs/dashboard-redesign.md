# Coach Home — redesign (draft, J's grammar)

> Status: **Draft — work in progress.** Nothing confirmed for development. Sister of [client-detail-redesign.md](./client-detail-redesign.md): same grammar, same look switch, same rules; this page only records what is specific to Home.
> Prototype: [flows/coach/dashboard-drafts.html#s-draft-dash](https://321-fit.github.io/project-spec/prototypes/flows/coach/dashboard-drafts.html#s-draft-dash) — the flow walks inside one file; every screen reached from Home is copied in.
> Supersedes (once approved): the screen layout in [dashboard.md](./dashboard.md) §4–5. **Data, states and endpoints are unchanged** — the snapshot the shipped screen loads already carries everything drawn here.
> Hub: [modules.html → Rework](https://321-fit.github.io/project-spec/prototypes/modules.html)
> Last updated: 2026-09-15

## 1. The screen

Order (2026-09-15): **the day → what is next → what you can do → what you owe an answer to → the money → the rest of the day → the signals.**

```
 (RB)                              [💬1] [🔔3]     ← no greeting: the widget is the first thing
 ┌ Wednesday                       23 Apr ┐
 │   €60        ◯ 1/3        €180         │      ← THE DAY WIDGET = the anchor (ring: sessions
 │  earned     sessions     planned       │         today; money around it). Equal air above/below.
 └────────────────────────────────────────┘
 Next session
 ┌ (SM) In 45 min · 10:30                 ┐  ← solid teal perimeter; tap → event drawer
 └      Sarah Mitchell · Tennis · Court A ┘
 [banner: hidden from search · Fix]          ← only when isBookable=false
 ( + )    ( ▶ )      ( ▢✕ )   ( ✦ )
 Book   Self-paced  Time off   Ask AI         ← fixed slots ⏳
 Needs you
 [● €40 cash · 2 clients] [● 3 requests] [● 3 to review] [● Self-paced · 3] [● 2 invites waiting]
 Money                            Mon–Sun
 ┌ €480 [↑ €80]                        › ┐  → Earnings
 │ This week · +€120 planned · 6 booked  │
 │ €320 Card · Stripe │ €80 Cash · 2     │
 Today                          3 sessions
 ┌ (AK) Alex Kim · Padel · 13:00    €60  ┐  → drawers
 │  ▓   Morning crew · 18:00 · 6/10 €72  │
 Activity
 [★ New review · 5★ · Sarah] [(AK)(MP) 2 new clients]
 [ 💡 tip · outlined · dismissable ✕ ]
 ⌂  👥  💬  📅  👤                            ← tab bar (unchanged)
```

## 2. What changed vs the shipped Home, and why

| Change | Why |
|---|---|
| **The anchor is the day widget** (default): ring = sessions today, *earned* / *planned* either side, the date in its corner; **no greeting at all** — the widget is the first thing under the chrome. Options kept on the prototype: *The next person* (Client Detail's identity grammar for the athlete you are about to meet), *The date*, *None* (greeting + card). | Client Detail is held by a person at the top; Home had nothing of that weight. A ring with a target reads as one object; a greeting is text. |
| **Next session card sits right under the widget**, before the circles, with a **solid teal perimeter**. | The two things a coach opens Home for — the day and the next person — are the first two objects. |
| **Four circles: Book · Self-paced · Time off · Ask AI** ⏳ | Things a coach does *from* Home rather than *in* a tab. *Invite* gave its slot to *Self-paced* (2026-09-15): inviting lives on Clients, self-paced work (requests to build, clips to review) arrives daily and had no home but a chip. Time off is a daily errand of weight; Ask AI = the assistant's proposed FAB-grade entry. The set is a bet. |
| **Needs you = chips, not five stacked cards** — cash (red), requests (blue), to review / self-paced (yellow), invites waiting (grey). Each opens its list. `All caught up` = one line. | Five identical cards took the first screen; the count is what Home must say, the "why" is on the destination. Cost: the cards' second lines (*1 awaiting your reply over 24h*, *Tom overdue*) move one tap away. |
| **Next session = the Client Detail card** (face instead of type tile), tap → the calendar's drawer. Quiet: tomorrow, grey when. Idle/Ready: the empty card takes the slot with **one** secondary button (*Book a session* / *Share profile*). | One card grammar for "next thing" across the coach side. |
| **Money = one widget**: this week + trend pill headline (24px), planned + booked, Card / Cash grid, 20px inset like the row panels. → Earnings. The fuller day widget (week bars + sentence + link) stays as the *Widget* option when the person is the anchor. | Was two stacked sections (This week + Payment split). |
| **Today never disappears**; empty = quiet row (*Nothing today* / *Nothing else today*). | Layout must not jump between days. |
| **Signals = tiles** (star plate / faces); **one tip at a time**, outlined + dismissable; **bookability banner** above the circles, non-dismissable. | Same rules as Client Detail: visual leads, a suggestion is not system messaging, a status banner decides what is legal. |
| Pre-approval states (New wizard · Under review · Rejected) **not redrawn**. | They are a different screen (the wizard); canon file stays. |

States on the prototype: Active day · All caught up · Quiet day · Idle · Ready (new coach) · Hidden from search · Loading. Mapping to [dashboard.md §5](./dashboard.md): `dst-default` · `dst-zero` · `dst-quiet` · `dst-idle` · `dst-ready` · bookability overlay · `dst-loading`.

## 3. Screens reached (copies in the flow file)

| From | Screen | Source |
|---|---|---|
| €40 cash chip | **Cash to collect** — global twin of Client Detail's *Owed*: every cash debt across clients, canon cash drawer per row | new (clone of `#s-draft-owed`) |
| requests / invites chips · bell | Inbox, opened on the right tab | `dashboard.html#s-notifications` |
| to review chip | Sessions to review | `dashboard.html#s-review-queue` |
| Self-paced circle · chip | **Self-paced hub** — the per-client self-paced screen widened to everyone (To set up · To review posters · Sent), footer *Assign self-paced* → pick athlete → builder | new (`#s-draft-spq`); canon `shared/self-paced.html#s-queue` |
| Money | Earnings | `balance-v2.html#s-earnings` |
| Book | athlete → session → time → review → back on Home | `invite.html` (schedule mode, athlete first) |
| Time off | Block time off | `calendar.html#s-block-time-off` |
| Next session · Today rows | event / group drawer over Home | `calendar.html` sheets |
| Invite · Ask AI · tab bar · activity tiles | other modules | links |

### User flows (for issues)

1. **Morning glance** — Home renders the widget (sessions today, earned / planned), Next session, Needs-you chips; loading = skeleton below the chrome.
2. **Act on the next session** — card → event drawer over Home → Cancel / Reschedule / Message / Edit.
3. **Collect cash** — €40 chip → Cash to collect → row → cash drawer → settled row drops to Settled; hero recounts.
4. **Answer requests / see invites** — chips → Inbox on *To reply* / *Waiting*; bell → Inbox on *Activity*.
5. **Review sessions** — chip → Sessions to review → Mark complete / Missed (batched undo).
6. **Book from Home** — Book → pick athlete → session → time → review → *Send request* → back on Home.
7. **Time off** — circle → Block time off → back.
8. **Money** — widget → Earnings.
9. **Bookability** — `isBookable=false` → banner above the circles → *Fix* → Availability.
10. **New coach** — Ready state: greeting, empty Next-session card with *Share profile*, CRM tip; no widget, no money.

### Change log

- 2026-09-14 — first cut (greeting as title, circles, chips, card, money widget, today, signals, tip); Inbox circles → compact; anchor options (person / date / none).
- 2026-09-15 (later) — Invite circle → Self-paced circle; Self-paced hub redrawn in the flow; booking-grid off-hours lose the hatch too (flat fill everywhere).
- 2026-09-15 — day widget (ring + bars + sentence + link) built; widget becomes the anchor; greeting removed; widget cut to ring + earned / planned with Next session directly under it, then the circles; equal air around the ring; money headline 24px + 20px inset; plain look has no wash on Home; hub *Rework* section.

## 4. Open

- The circle set (is *Time off* worth a slot; is *Ask AI* a circle or a FAB).
- Whether the chips lose too much — the shipped cards carried a second line each.
- Tinted canvas as the coach default (shared decision with Client Detail).
- Port back to `dashboard.html` once confirmed; the copies are snapshots (re-copy with `~/.claude/scripts/proto-extract-screens.py`).
- 2026-09-15 (later) — self-paced builder/review/thread copied into the flow; relinked. Index: [rework-index.md](./rework-index.md).
