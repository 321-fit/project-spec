# Home-screen calendar widget

> Status: **Draft — work in progress.** Issue: [project-spec#43](https://github.com/321-fit/project-spec/issues/43) (batch `extension`). Nothing here is confirmed for development.
> Prototype: [flows/shared/widget.html](https://321-fit.github.io/project-spec/prototypes/flows/shared/widget.html) — both roles, three sizes on a mock home screen, skin switch, Android, states.
> Hub: [modules.html → Extension](https://321-fit.github.io/project-spec/prototypes/modules.html)
> Last updated: 2026-09-16

## 1. What it is

A home-screen widget (iOS WidgetKit, Android Glance) that shows the user's schedule without opening the app. It answers three questions in a glance — *what do I have today, what is next, when is my child's training* — and nothing else: no greeting, no stats, no marketing. Everything after the glance is the app's job.

## 2. Sizes

| Size | iOS points | Shows | Tap |
|---|---|---|---|
| **Small** | 158×158 | the next session: name, who with, *when* in the type colour (`Today · 18:30`, `Tomorrow · 10:00`, `Thu · 09:00`; inside 60 min `in 45 min`) | the event |
| **Medium** | 338×158 | the next 2–3 sessions in one column with day labels (Today / Tomorrow / weekday); footer = one quiet line | row → the event; elsewhere → Calendar tab |
| **Large** | 338×354 | a 7-day strip (today highlighted, past dimmed, dots under a day = sessions in type colour) + 4–5 rows by day; footer | day → Calendar on that day; row → the event |

Android: the same content in Material shape (28px radius); Glance cells resize — the medium layout is the base and collapses to small at 2×2.

## 3. Language

- **Type = the dot** — teal personal, blue group, violet self-paced. The calendar's own language ([event-statuses.md](./event-statuses.md), legend). Confirmed sessions only; requests are the app's business.
- **Child training is not a colour.** The type stays the type; a small who-pill (`Mia`) says who is training. Colour is already spent on type and would collide the moment a child joins a group. Until [#45](https://github.com/321-fit/project-spec/issues/45) ships the pill does not appear.
- **Rows**: time · name · sub. The time column is fixed and never clips; the name ellipsises; the pill never clips.
- **Coach nouns**: rows lead with the athlete's name (the coach knows their sport); group rows show `7 of 10`.
- **Footers**: athlete — `3 sessions this week` (medium) / `€240 balance · 1 pack session left` (large); coach — `2 requests waiting · €180 planned this week` (the Home day widget's line; the red count taps into the Inbox).

## 4. Skin (open)

Two candidates in the prototype: **Brand canvas** — the rework's tinted teal recipe, recognisably ours among white/black system widgets; always dark (identity, not a theme). **System material** — the OS surface (dark `#1c1c1e` / light white), quieter, blends with Calendar/Weather.

## 5. States

| State | Small | Medium / Large |
|---|---|---|
| Nothing planned | `Nothing planned · this week` + one door (*Find a coach* / *Book*) | same, wider |
| Free day, something later | `Free day · next: Thu 09:00` | rows start at the next day |
| Requests waiting (coach) | red count line in the footer → Inbox | footer line |
| Signed out | `Sign in to see your schedule` → sign in | same |
| Long names | row clips with an ellipsis; time / dot / pill never | same |
| Loading | skeleton bars at first placement; afterwards the OS shows the last snapshot, never a spinner | same |

## 6. Data & refresh

- Reads what the Calendar tab reads: the role's upcoming events (coach `training-events`, athlete schedule). **No new endpoint.**
- Timeline refresh every 30 min + reload on push (confirmed / cancelled / rescheduled). WidgetKit budget ≈ 40–70 reloads/day; Android via WorkManager + push.
- Deep links: the existing event routes ([deep-linking-referrals.md](./deep-linking-referrals.md)).

## 7. Open

1. Skin: brand canvas or system material (or both, user-chosen in the widget's configuration).
2. Athlete side: show pending requests (`awaiting Maria`)? Proposal: no — the widget is a promise, not a maybe.
3. Coach large footer: three numbers (requests · earned · planned) or two.

## Change log
- 2026-09-16 — first cut: prototype + this page.
