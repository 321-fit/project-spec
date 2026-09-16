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
| **Small** | 158×158 | **the next session only** — *time-first*: hour (34px) + when at the top, name + where at the bottom; *date-first*: weekday + day number + one row | the event |
| **Medium** | 338×158 | **the next one + the one after** — *time-first*: a two-tier list (20px hour and name on one baseline, sub-line indented, a rule, the “Then” row in 15px); *date-first*: date block left, two rows right | row → the event; elsewhere → Calendar tab |
| **Large** | 338×354 | a 7-day strip (today highlighted, past dimmed, dots under a day = sessions in type colour) + 4–5 rows by day; footer | day → Calendar on that day; row → the event |

**iOS lock screen** (accessory families, same timeline): *inline* — one line above the clock (`● Boxing with Maris · 18:30`); *circular* (`Next 18:30`, `Week 3`); *rectangular* (label / name / time · place). Monochrome by definition.

Android: the same content in Material shape (28dp system radius); Glance cells resize (`SizeMode.Responsive`: 2×2 → small layout, 4×2 → medium, 4×4 → large); rows ≥ 40dp and the medium grows with its cell instead of clipping.

### Layout candidates and rhythm

Two layouts in the prototype (switch in the annotation column): **time-first** (Apple Clock / Fantastical "up next" — the hour is the biggest thing) and **date-first** (Apple Calendar — weekday + big day number, then rows). Both obey one rhythm: 16px content margins, a 4px grid, content **top-anchored** with the only stretch between the rows and the single 11px bottom line; a four-step type scale — 28–34 (hour / day number) · 15–16 (name) · 13–14 (rows) · 10–12 (labels, secondary); fixed tabular time column (34–40px) that never clips; small = one session, medium = two, large = the week strip + up to four rows.

## 3. Language

- **Type = shape and colour** — filled dot teal = personal, ring blue = group, diamond violet = self-paced. Colour is the calendar's language ([event-statuses.md](./event-statuses.md), legend); **shape is what survives iOS 18 tinted mode and the lock screen**, where the system renders everything in one hue. Confirmed sessions only; requests are the app's business.
- **Child training is not a colour.** The type stays the type; a small who-pill (`Mia`) says who is training. Colour is already spent on type and would collide the moment a child joins a group. Until [#45](https://github.com/321-fit/project-spec/issues/45) ships the pill does not appear.
- **Rows**: time · name · sub. The time column is fixed and never clips; the name ellipsises; the pill never clips.
- **Coach nouns**: rows lead with the athlete's name (the coach knows their sport); group rows show `7 of 10`.
- **Action = a count, not a sentence.** Anything that needs the user (coach: requests; athlete: a session to rate / pay) is a red count in the header; tap → Inbox. No money on the widget; no footer sentences on small/medium. The large keeps one quiet line (athlete `€240 balance · 1 pack session left`; coach `② requests · €60 earned · €180 planned`) — open whether it stays.
- The date is not repeated in the header — the phone shows it.

## 4. Skin (open)

Proposal: the skin is a **widget setting** (iOS `AppIntentConfiguration`, Android configuration activity) — brand by default on iOS, system by default on Android (Material You dynamic colour takes the wallpaper's tonal palette, which our teal fights). Two candidates in the prototype: **Brand canvas** — the rework's tinted teal recipe, recognisably ours among white/black system widgets; always dark (identity, not a theme). **System material** — the OS surface (dark `#1c1c1e` / light white), quieter, blends with Calendar/Weather.

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

## 8. Platform rules the design obeys

| | iOS — WidgetKit | Android — Glance |
|---|---|---|
| Model | timeline of snapshots (`TimelineProvider`); one entry per upcoming session (`in 45 min`, `now`), reload on push | `GlanceAppWidget`; `updatePeriodMillis` ≥ 30 min, WorkManager + FCM → `update()` |
| Interaction | tap only — `widgetURL` (whole widget), `Link` (row); no scroll, no animation; `Button`/`Toggle` via App Intents possible later (e.g. confirm) | `actionStartActivity` with the deep link; `actionRunCallback` for buttons |
| Chrome | radius + content margins (16pt) are the system's; background via `containerBackground` (gradient allowed); redacted placeholder at first placement | 28dp system radius, 16dp padding, cells not points, preview + description for the picker (mandatory) |
| Appearance | light / dark **and iOS 18 tinted** (one hue: shape + weight carry the type; `widgetAccentable` on the parts that stay full-white) | light / dark + **dynamic colour** (Material You) for the system skin |
| Type | Rubik ships in the extension bundle | **system font** — RemoteViews cannot load custom fonts |
| Touch | rows may be 22pt on iOS (the whole row is a `Link`) | rows ≥ 40dp (48dp target with the gap) |
| Data | App Group snapshot written by the app (+ token in a shared Keychain group if the extension must fetch); never the app's session from the extension | same idea: DataStore in the app, read by the widget |
| Budget | ~40–70 reloads/day per widget | WorkManager minimum 15 min; 30 min is plenty |
| HIG / M3 | one idea per size; small identification mark only, no branding; both appearances; no empty-looking states | follow the launcher radius, dynamic colour, resizable, min 2×2 |

## 7. Open

1. Skin: brand canvas or system material (or both, user-chosen in the widget's configuration).
1a. Layout: time-first or date-first (owner review pending).
2. Athlete side: show pending requests (`awaiting Maria`)? Proposal: no — the widget is a promise, not a maybe.
3. Coach large footer: three numbers (requests · earned · planned) or two.

## Change log
- 2026-09-16 — first cut: prototype + this page.
- 2026-09-16 (later 3) — cut pass (owner: still glued, hour not on the name's line): small = the next only, medium = next + then, action = a red count in the header, date and money removed from small/medium; hour/name share a baseline.
- 2026-09-16 (later 2) — layout pass: time-first / date-first candidates, 4px rhythm, top-anchored content, four-step type scale (owner: the first cut felt glued together with a huge gap on the small).
- 2026-09-16 (later) — platform rules pass: type = shape + colour, iOS 18 tinted state, lock-screen accessories, Android system font / 40dp rows / dynamic-colour skin, 16pt margins, smaller mark; §8.
