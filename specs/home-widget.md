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
| **Small** | 158×158 | **the next session only**, Apple-Calendar shaped: `NEXT` caps label (accent), the hour in 36px *regular* with `today` beside it, then the session as the calendar's own tinted tile (tint + stripe = type) | the event |
| **Medium** | 338×158 | **the next one + the one after**, Apple-Mail shaped: two rows — name (15 medium) / sub (13) left, time (15 regular) / day (12) right-aligned, hairline between; the next one's time in the accent | row → the event; elsewhere → Calendar tab |
| **Large** | 338×354 | a lighter 7-day strip (today = filled circle, past dimmed, dots under a day = sessions) + the same Mail rows grouped by day labels, up to five; no footer | day → Calendar on that day; row → the event |

**iOS lock screen** (accessory families, same timeline): *inline* — one line above the clock (`● Boxing with Maris · 18:30`); *circular* (`Next 18:30`, `Week 3`); *rectangular* (label / name / time · place). Monochrome by definition.

Android: the same content in Material shape (28dp system radius); Glance cells resize (`SizeMode.Responsive`: 2×2 → small layout, 4×2 → medium, 4×4 → large); rows ≥ 40dp and the medium grows with its cell instead of clipping.

### Balance rules (Apple's own widgets as the reference)

- **One big thing per widget, regular weight** — the small's hour (36px, weight 400). Nothing else is large; the medium and large have no big numeral at all.
- **Three sizes + one label**: 15 (row name, weight 500) · 13 (sub, 400) · 12 (right-column day, 400) · one 11px caps label in the accent. Weight carries hierarchy, not size.
- 16px content margins, a 4px grid, rows separated by hairlines, time never clips, name ellipsises.
- No relative times (`in 45 min`) — the label says *Next*, the hour is absolute, `today` / `tomorrow` beside it.

## 3. Language

- **Type = shape and colour** — filled dot teal = personal, ring blue = group, diamond violet = self-paced. Colour is the calendar's language ([event-statuses.md](./event-statuses.md), legend); **shape is what survives iOS 18 tinted mode and the lock screen**, where the system renders everything in one hue. Confirmed sessions only; requests are the app's business.
- **Child training is not a colour.** The type stays the type; a small who-pill (`Mia`) says who is training. Colour is already spent on type and would collide the moment a child joins a group. Until [#45](https://github.com/321-fit/project-spec/issues/45) ships the pill does not appear.
- **Rows**: time · name · sub. The time column is fixed and never clips; the name ellipsises; the pill never clips.
- **Coach nouns**: rows lead with the athlete's name (the coach knows their sport); group rows show `7 of 10`.
- **No action count, no money, no footers.** A red request count in the header was tried and dropped (looks off, unbalances the widget). The widget is the schedule; requests and money live in the app. Large lists rows to the end of the week instead of a footer.
- The date is not repeated in the header — the phone shows it.

## 4. Skin (open)

Proposal: the skin is a **widget setting** (iOS `AppIntentConfiguration`, Android configuration activity) — brand by default on iOS, system by default on Android (Material You dynamic colour takes the wallpaper's tonal palette, which our teal fights). Two candidates in the prototype: **Brand canvas** — the rework's tinted teal recipe, recognisably ours among white/black system widgets; always dark (identity, not a theme). **System material** — the OS surface (dark `#1c1c1e` / light white), quieter, blends with Calendar/Weather.

## 5. States

| State | Small | Medium / Large |
|---|---|---|
| Nothing planned | `Nothing planned · this week` + one door (*Find a coach* / *Book*) | same, wider |
| Free day, something later | `Free day · next: Thu 09:00` | rows start at the next day |
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

2. Athlete side: show pending requests (`awaiting Maria`)? Proposal: no — the widget is a promise, not a maybe.
3. ~~Coach large footer~~ — dropped.

## Change log
- 2026-09-16 — first cut: prototype + this page.
- 2026-09-16 (later 5) — balance pass (owner: too many big bold sizes, everything glued): Apple Calendar-shaped small (label / 36px regular hour / tinted tile), Apple Mail-shaped medium + large rows (time right-aligned, hairlines), three-size scale, no relative times; layout switch folded.
- 2026-09-16 (later 4) — owner review: no badges on small/medium, no footers on large (rows to the end of the week instead), next block hour centred against name + where.
- 2026-09-16 (later 3) — cut pass (owner: still glued, hour not on the name's line): small = the next only, medium = next + then, action = a red count in the header, date and money removed from small/medium; hour/name share a baseline.
- 2026-09-16 (later 2) — layout pass: time-first / date-first candidates, 4px rhythm, top-anchored content, four-step type scale (owner: the first cut felt glued together with a huge gap on the small).
- 2026-09-16 (later) — platform rules pass: type = shape + colour, iOS 18 tinted state, lock-screen accessories, Android system font / 40dp rows / dynamic-colour skin, 16pt margins, smaller mark; §8.
