# Coach Home — redesign (draft, J's grammar)

> Status: **Draft — work in progress.** Nothing confirmed for development. Sister of [client-detail-redesign.md](./client-detail-redesign.md): same grammar, same look switch, same rules; this page only records what is specific to Home.
> Prototype: [flows/coach/dashboard-drafts.html#s-draft-dash](https://321-fit.github.io/project-spec/prototypes/flows/coach/dashboard-drafts.html#s-draft-dash) — the flow walks inside one file; every screen reached from Home is copied in.
> Supersedes (once approved): the screen layout in [dashboard.md](./dashboard.md) §4–5. **Data, states and endpoints are unchanged** — the snapshot the shipped screen loads already carries everything drawn here.
> Last updated: 2026-09-14

## 1. The screen

Order: **who you are today → what you owe an answer to → what is next → the money → the day → the signals.**

```
 (RB)                              [💬1] [🔔3]
 Good morning, Robert
 Wed 23 Apr · 3 sessions · €180 today
 [banner: hidden from search · Fix]          ← only when isBookable=false
 ( + )    ( 👤+ )   ( ▢✕ )   ( ✦ )
 Book     Invite   Time off   Ask AI          ← fixed slots ⏳
 Needs you
 [● €40 cash · 2 clients] [● 3 requests] [● 3 to review] [● Self-paced · 3] [● 2 invites waiting]
 Next session
 ┌ (SM) In 45 min · 10:30                 ┐  ← card, no buttons → event drawer
 └      Sarah Mitchell · Tennis · Court A ┘
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
| **Greeting is the title**; no `Home` nav title; sub-line = the day in one breath. Messages + bell stay as chrome circles. | Two titles said where you are; one is the greeting. |
| **Four circles: Book · Invite · Time off · Ask AI** ⏳ | Things a coach does *from* Home rather than *in* a tab. Book/Invite were buried in the Ready state's empty card; Time off is a daily errand of weight; Ask AI = the assistant's proposed FAB-grade entry. The set is a bet. |
| **Needs you = chips, not five stacked cards** — cash (red), requests (blue), to review / self-paced (yellow), invites waiting (grey). Each opens its list. `All caught up` = one line. | Five identical cards took the first screen; the count is what Home must say, the "why" is on the destination. Cost: the cards' second lines (*1 awaiting your reply over 24h*, *Tom overdue*) move one tap away. |
| **Next session = the Client Detail card** (face instead of type tile), tap → the calendar's drawer. Quiet: tomorrow, grey when. Idle/Ready: the empty card takes the slot with **one** secondary button (*Book a session* / *Share profile*). | One card grammar for "next thing" across the coach side. |
| **Money = one widget**: this week + trend pill headline, planned + booked, Card / Cash grid. → Earnings. | Was two stacked sections (This week + Payment split). |
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
| Money | Earnings | `balance-v2.html#s-earnings` |
| Book | athlete → session → time → review → back on Home | `invite.html` (schedule mode, athlete first) |
| Time off | Block time off | `calendar.html#s-block-time-off` |
| Next session · Today rows | event / group drawer over Home | `calendar.html` sheets |
| Invite · Ask AI · tab bar · activity tiles | other modules | links |

## 4. Open

- The circle set (is *Time off* worth a slot; is *Ask AI* a circle or a FAB).
- Whether the chips lose too much — the shipped cards carried a second line each.
- Tinted canvas as the coach default (shared decision with Client Detail).
- Port back to `dashboard.html` once confirmed; the copies are snapshots (re-copy with `~/.claude/scripts/proto-extract-screens.py`).
