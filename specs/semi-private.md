# Semi-private sessions (personal training with a second person)

> Status: Approved — design agreed 2026-09-03/04, not yet built
> Prototype: no screen of its own — the feature is **states of existing screens**.
> Coach: [calendar.html#s-calendar](https://321-fit.github.io/project-spec/prototypes/flows/coach/calendar.html#s-calendar) drawer (`is-semi`) · [#s-event-edit](https://321-fit.github.io/project-spec/prototypes/flows/coach/calendar.html#s-event-edit) (`sp-seats`, `event-seat-sheet`, `event-extra-sheet`).
> Athlete: [calendar.html#s-schedule](https://321-fit.github.io/project-spec/prototypes/flows/athlete/calendar.html#s-schedule) — `openAthEvent('reconfirm')` and `openAthEvent('request', {seat:true})`.
> Board: the five states are cards under **Coach Calendar** and **Athlete Schedule**.
> Last updated: 2026-09-04

A coach has a booked **personal** session and wants a second (or third) person on it — a partner, a friend, a spouse — without turning it into a group session. The same lever also covers the smaller case: an athlete asks for something extra on the day (video analysis, thirty more minutes) and the coach needs to charge for it.

This spec defines both as one thing: **the seats of a personal event, and what each seat pays.**

## 1. Overview

### It is a kind, not a status

Status answers *what phase of life the event is in* — `request → planned → review → finished | missed | cancelled` ([event-statuses.md](./event-statuses.md)). How many people are on it is not a phase. A seventh status would have to be crossed with the six existing ones, and the status is already derived from two fields (§5a there).

```
kind (new axis)                  status (unchanged, all six)
├─ personal      1 seat
├─ semi-private  2–3 seats   ← this spec
└─ group         N seats     capacity, minimum, join link, chat
```

### Most of it already exists

`training_event` already carries `is_group_event`, `max_participants`, `min_participants`, and `group_event_participant` already stores **payment per seat** (`payment_type`, `payment_status`, `invite_status`, `cancelled_at`, one active row per athlete per event). Multiple people on one event, each paying their own way, is built — it is gated behind `is_group_event`.

A semi-private event is therefore: **`is_group_event = false`**, `max_participants = 2..3`, and rows in the existing seat table. No new status, no new table, no new event entity.

### What it deliberately does not inherit from group

| Group behaviour | Semi-private |
|---|---|
| capacity display `7 / 12`, minimum threshold, auto-cancel on shortfall | no |
| public discovery, join-by-link | no — **the coach is the only one who can add a seat** |
| group chat | no |
| group packs | no |
| batch roster operations | no |
| seven group notification categories | no — reuses the personal ones (§7) |
| roster list, per-seat payment state, add/remove seat, client picker | **yes** |

## 2. User Stories

### Coach
- As a coach, I want to add a second person to a session I already have booked, so a client can bring a partner without me rebuilding the booking as a group.
- As a coach, I want to set a different price per person, so I can charge two people less each than one person alone.
- As a coach, I want to add a paid extra to one person's seat (video analysis, extra 30 min), so what I actually delivered is what I actually charge.
- As a coach, I want to be warned before I save if the second person is busy, if the address is someone's home, or if a price change forces a re-confirmation.
- As a coach, when the second person falls through, I want to be asked whether to restore the original price rather than have it happen silently.

### Athlete
- As an athlete, I want to be asked before someone else joins my session, because I booked one-to-one and may not want to train with a stranger.
- As an athlete, I want to see who I am training with — name and photo.
- As an athlete, I do **not** want other people to see what I pay.
- As an athlete, if I decline the change, I want to keep my original session on the original terms.

## 3. System Stories

- When a seat is added to a confirmed event, the system requires a fresh confirmation from **every** athlete whose terms changed, and holds the time slot for the whole waiting period.
- When any seat is still unanswered, the system reports the event as `awaiting` and names how many answers are outstanding.
- When the anchor athlete declines, the system restores the event to the terms recorded before the change and removes the seats added by it.
- When an added seat declines or expires, the system removes that seat and asks the coach whether to restore the previous price — it never re-prices anyone automatically.
- When money has already been reserved and the seat total rises, the system requires a new authorisation before the change can be saved.

## 4. Flows

### Flow 1: Coach adds a second person

1. Calendar → tap event → **event drawer** (`cal-event-sheet`). From the second seat on it carries a **Participants** block (roster, §6); with one athlete the drawer's own name row already answers "who", so the list stays hidden and the solo name row and event-level price stay visible.
2. **Add participant** lives in the drawer's **⋯ menu** next to *Edit details* — not as a fourth action circle. Both it and *Edit details* open **`s-event-edit`** — the same instance-edit screen that already exists ([coach-calendar.md](./coach-calendar.md) Flow 12); the drawer entry opens it scrolled to the participants section. **No separate "extend" screen.**
3. Section **Participants & price** lists the seats: the **anchor** seat (the original athlete) and any added seats, each with its price, plus `+ Add participant` while `seats < 3`.
4. Tapping a seat opens the **seat editor** (sheet):
   - **Who** — client picker, reused from [`invite.html#s-invite-select`](https://321-fit.github.io/project-spec/prototypes/flows/coach/invite.html) (own clients / CRM contacts). **The by-link row is hidden**: a semi-private seat cannot be filled by a stranger with a link.
   - **Price for this seat** — defaults to the session price, editable per seat.
   - **No payment picker.** The coach sets *what* is owed, never *how* it is paid: the athlete chooses the method when they accept, out of what the session template accepts — exactly as on any other booking. (CRM seats are the exception the proxy-accept already covers.)
   - **Extras** — repeating `label + amount` rows, added to that seat's price. An extra is a **separate line, never an overwrite of the price**: otherwise the receipt and Earnings cannot explain why a €50 session cost €65.
5. **Save** → the **review drawer** (§5) lists everything the coach should know before committing. Confirm → the change is written and notifications go out (§7).

### Flow 2: Athlete answers

- The **anchor** athlete gets a re-confirmation showing *was → now* (price, and that someone is joining). Accept → the change stands. Decline → **Flow 3**.
- The **added** athlete gets an ordinary invitation with its own deadline.
- The event's time slot is held for both answers. Nothing is released while waiting — the coach's hour is already spent.

### Flow 3: The anchor declines — revert, never cancel

Declining a change is **not** cancelling the booking. The event returns to the terms recorded before the coach's edit (price, seats, extras) and the added seats are dropped. The athlete keeps her session at her original price.

> The alternative (decline = cancel, today's behaviour for `coach_updated_training`) punishes the athlete for the coach's initiative. Backend cost: the pre-change terms must be snapshotted while a change is pending — see §8.

### Flow 4: The added seat declines or expires

The seat is removed and the event is a plain personal session again. If the coach had lowered the anchor's price for the pair, the coach is prompted: *"Mark declined — Anna is training alone again. Restore €50?"* Restoring is a **price increase**, so it goes through the anchor's re-confirmation like any other.

Nothing re-prices automatically. An unannounced charge is worse than an awkward question.

### Flow 5: An extra, added on the day

Adding an extra before the session runs through Flow 1 (seat editor → review → the athlete re-confirms, because the price goes up). Adding one **after** the session belongs to the completion flow, not to editing — see §10.

## 5. The review drawer

Reuses the conflict-drawer grammar already in the prototypes (`coach/calendar.html#cal-overlap-sheet` and the group-drop participant conflict drawer): status header with a severity badge, hero line, a scrollable list, one line of consequence, and actions **named after what they do**.

| Condition | Message | Severity |
|---|---|---|
| The added athlete has their own event at this time | "Mark is busy: Tennis 10:00–11:00" + the clashing entries | coach decides — save is allowed |
| The event starts in under 2 hours | "Mark won't have time to answer — the window closes 2 h before the start" | warning |
| The anchor's price rises, or the composition changes | "Anna confirms again. Her spot is held while she answers" | mandatory notice |
| The seat is on **home visit** at another athlete's address | "**Mark will see Anna's home address**" | mandatory, own confirmation |
| The anchor pays with a **pack credit** and an extra was added | "A credit covers the session, not the €15 extra — a second payment method is needed" | blocking |
| The anchor pays by card and the total rises | "Hold €50 → a new authorisation for €65 is required" | warning |
| The added person is a CRM contact with no app account | "Mark can't confirm in the app — you confirm the seat" (existing proxy-accept) | informational |
| The added person is archived, blocked, or a deleted account | cannot be added | blocking |

## 6. What the screens show

### Coach — the roster replaces the solo row, it does not stack on it

Inside the drawer the roster drops the card's own margins: `.fit-participants-card` carries 16px of margin and its rows another 16px of padding, which stacks with the sheet's 16px into a 48px gutter. Rows align with the rest of the sheet instead. The footer's action circles use **`.fit-action-circles--sm`** (52px, new in `fit-ui.css`) — four at the shipped 64px own most of the first screen.

The roster is `.fit-participants-card` / `.fit-participant`, reused from the group drawer. It appears **from the second seat on**: at one seat the drawer's own athlete row is already the one-seat renderer, and showing both would print the same person twice. When the roster appears, the solo name row **and the event-level price** are hidden — money is per seat by then, so one number at the top of the sheet would be wrong.

The event **title stays personal**: "Tennis · 60 min", never "Group session". Kind changes what the block contains, not what the event is called.

### Calendar tile

Personal teal, unchanged — the two-colour type language (personal teal / group blue, `feedback_training_type_colors`) does not get a third colour. A second person shows as a **stacked-avatar pair** on the tile.

### Athlete — same roster, different money

- Sees who else is on the session: **name and photo**.
- Sees **only their own price and their own payment state** — and the roster is written from the reader's side: "You" is whoever is looking, and the other row carries no money at all. Per-seat money is private between the coach and that seat — the coach may have given one of them a discount, and that is not the other's business. Other rows render without the money column.
- Never sees the words "semi-private". For the athlete it is "Tennis · 60 min, with Mark".

## 7. Notifications — no new categories

| Event | Category | To |
|---|---|---|
| Seat added / price raised / extra added | `coach_updated_training` (#9b) | anchor athlete |
| Seat invitation | `coach_created_training_request` (#2) | added athlete |
| Added athlete accepts / declines | `training_request_approved` / `training_request_declined` (#3 / #4) | coach |
| Seat unanswered until the deadline | `pending_request_auto_declined` (#7) | both |

Copy in [notifications-catalog.md](./notifications-catalog.md) §1 already carries `{session_name}`, `{date}`, `{time}` — the *was → now* detail lives on the re-confirmation screen, not in the push.

## 8. Data model

| Field | Where | Notes |
|---|---|---|
| `max_participants = 2..3` | `training_event` | exists; `is_group_event` stays **false** |
| seat row | `group_event_participant` | exists — reused as-is for personal events |
| `price`, `currency` per seat | **new column on the seat** | today the price lives on the event; semi-private needs it per seat |
| `payment_type` per seat | already on `group_event_participant` | written when the athlete accepts, not when the coach adds the seat |
| `extras: [{label, amount}]` | **new, per seat** | separate lines, summed into the seat total |
| `expires_at` per seat | from [poly-backend#938](https://github.com/321-fit/poly-backend/issues/938) | each answer has its own deadline |
| `anchor` | derive from `training_event.athlete_profile_id` | the event cannot lose its anchor; removing them cancels the event |
| pending-change snapshot | **new** | required by Flow 3 — the terms to restore if the anchor declines |

## 9. Business rules

- **Cap: 3 seats.** More than that is a group session, honestly.
- **Only the coach adds seats.** No link, no self-join, no request-to-join.
- **Confirmation is required when composition changes or a price rises. A price cut alone needs nothing** — there is nothing to refuse about a discount.
- **The anchor's decline reverts; it never cancels.**
- **Money is per seat**, and one seat's terms are never visible to another.
- **The coach sets the amount; the athlete picks the method.** The seat editor has no payment selector — the method is chosen on acceptance, within what the session template accepts.
- **Counting** (against `event-statuses.md` §7): the coach's lifetime `sessions_count` counts **one** finished event — the same way a group session with six people counts once. Each athlete counts **one** session. Earnings records **one earning per seat** — two payments, one event, exactly as group events already do.
- **An extra cannot be paid with a pack credit.** The credit covers the session it was sold for.

## 10. Open questions

1. **Extras catalogue.** Free text + amount (fast, but Earnings fills with near-duplicate labels) or a list the coach maintains in settings (tidy, but a new entity and a new screen)? Proposal: free text in v1, autocompleting from what this coach has typed before.
2. **Extras after the fact.** An extra is often agreed *during* the session. Its natural home is then the completion screen (`review` → confirm what happened + who paid), not the editor. Build it there too, or force the coach to edit the event before completing it?
3. **Wording of the action** — "Add participant" (describes it exactly) vs "Extend session" (covers a price bump with no second person).

## Related specs / references

- [event-statuses.md](./event-statuses.md) — the six statuses this does not extend; §7 counting rules
- [coach-calendar.md](./coach-calendar.md) Flow 12 — instance edit + the re-confirm sheet reused here
- [group-event-detail.md](./group-event-detail.md) — where the roster component and the client picker come from
- [booking-flow.md](./booking-flow.md) — the 48 h window and `expires_at`
- [session-packages.md](./session-packages.md) — why a credit cannot pay for an extra
- [notifications-catalog.md](./notifications-catalog.md) §1 — the four categories reused
