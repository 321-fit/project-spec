# Home-screen calendar widget

> Status: **Draft — work in progress.** Issue: [project-spec#43](https://github.com/321-fit/project-spec/issues/43) (batch `extension`). Parked 2026-09-16 after seven review rounds with the owner at the *wheel* version (§0); not confirmed for development.
> Prototype: [flows/shared/widget.html](https://321-fit.github.io/project-spec/prototypes/flows/shared/widget.html) — both roles, three sizes on a mock home screen, skin switch, Android, states.
> Hub: [modules.html → Extension](https://321-fit.github.io/project-spec/prototypes/modules.html)
> Last updated: 2026-09-17

## 0. Where it stands (2026-09-17)

**Settled with the owner** — the shape of all three sizes:
- Every session is a **wheel row** (shape-dot · name / where — hour / day right-aligned); the next one full-size, the ones after smaller and dimmer. No tinted tile, no badges, no money, no footers, no relative times.
- **Small** = date word (`TODAY` / `TOMORROW` / `THU 24`) · hour 36px regular · one row, spaced evenly. **Medium** = the wheel, two rows. **Large** = week strip as *load only* (no selected day) + upcoming rows by day.
- Type = shape + colour (filled / ring / diamond) so tinted iOS 18 and the lock screen still read it.
- Platform rules in §8 (WidgetKit timeline, Glance system font, 40dp rows, App Group data).

**Decided 2026-09-17 (owner)** — skin = **brand canvas** (the rework look; a later change is one background); **one widget**, the **role is a widget setting**; **no self-paced**; **approved sessions only**; a session that is **running stays** in the widget until it ends; names may show on the lock screen (nothing in the guidelines forbids it).

**Still open** — the lock-screen inline copy (§2); nothing else blocks the hand-off.

**Next step** — iOS (WidgetKit) and Android (Glance) issues cut from §2, §5, §6, §8, §9, §10.

## 1. What it is

A home-screen widget (iOS WidgetKit, Android Glance) that shows the user's schedule without opening the app. It answers three questions in a glance — *what do I have today, what is next, when is my child's training* — and nothing else: no greeting, no stats, no marketing. Everything after the glance is the app's job.

## 2. Sizes

| Size | iOS points | Shows | Tap |
|---|---|---|---|
| **Small** | 158×158 | **the next session only**: a caps *date word* (`TODAY` / `TOMORROW` / `THU 24`, accent), the hour in 36px regular, one row (shape-dot · name / where) — the three blocks spaced evenly down the frame | the event |
| **Medium** | 338×158 | **the wheel**: the next one as a full row (17px), the one after smaller and dimmer (13px, 70%) — centre full, neighbour receding, like the iOS time picker | row → that event; elsewhere → Calendar tab |
| **Large** | 338×354 | **option C**: a week strip that carries *load only* (dots under days, **no selected day** — a widget cannot hold a selection), then the upcoming rows grouped by day labels, up to five; no footer | day → Calendar on that day; row → the event |

**iOS lock screen** (accessory families, same timeline): *inline* — one line above the clock (`● Boxing with Maris · 18:30`); *circular* (`Next 18:30`, `Week 3`); *rectangular* (label / name / time · place). Monochrome by definition.

Android: the same content in Material shape (28dp system radius); Glance cells resize (`SizeMode.Responsive`: 2×2 → small layout, 4×2 → medium, 4×4 → large); rows ≥ 40dp and the medium grows with its cell instead of clipping.

### One rule across sizes

**Every session is a wheel row — the next one full-size, the ones after smaller and dimmer. The week strip = load.** The same thing means the same thing in every size. (The tinted tile was tried in the small and dropped.)

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

## 4. Skin — decided: brand canvas

The widget wears the rework's tinted teal canvas on both platforms (a later change is one background). The system-material candidate stays in the prototype for comparison only.

~~Proposal: the skin is a **widget setting** (iOS `AppIntentConfiguration`, Android configuration activity) — brand by default on iOS, system by default on Android (Material You dynamic colour takes the wallpaper's tonal palette, which our teal fights). Two candidates in the prototype: **Brand canvas** — the rework's tinted teal recipe, recognisably ours among white/black system widgets; always dark (identity, not a theme). **System material** — the OS surface (dark `#1c1c1e` / light white), quieter, blends with Calendar/Weather.~~

## 5. States

| State | Small | Medium / Large |
|---|---|---|
| Nothing planned | `Nothing planned · this week` + one door (*Find a coach* / *Book*) | same, wider |
| Free day, something later | `Free day · next: Thu 09:00` | rows start at the next day |
| Signed out | `Sign in to see your schedule` → sign in | same |
| Long names | row clips with an ellipsis; time / dot / pill never | same |
| Loading | skeleton bars at first placement; afterwards the OS shows the last snapshot, never a spinner | same |

## 6. Data contract

**No new endpoint.** The app already loads what the widget shows; the widget never calls the network itself.

| Role | Call (existing) | Notes |
|---|---|---|
| Coach | `GET /api/v1.0.0/coach/training-events?startDate=<now>&endDate=<now+7d>` | returns `{ "<date>": [TrainingEventResponse…] }` grouped by day ([group-training-api.md](https://github.com/321-fit/poly-backend/blob/main/docs/group-training-api.md) "TrainingEventResponse") |
| Athlete | `GET /api/v1.0.0/athlete/training-events` (+ the same date range) | same shape ([trainings-frontend-guide.md](https://github.com/321-fit/poly-backend/blob/main/docs/trainings-frontend-guide.md) §6) |

**Fields used** (camelCase on the wire): `id`, `name`, `datetimeStart`, `datetimeEnd` (UTC), `status` (approval), `eventStatus` (`planned` / `request` / `awaiting` / `review` / `finished` / `missed` / `cancelled`), `eventSource`, `selfPacedBookingId`, `isGoogleCalendarEvent`, `trainingSession.type` (personal / group) + `trainingSession.maxParticipants`, `spotsTaken`, `coach` / `athlete` (`firstName`, `lastName`), `address` (name, city).

**Filter — what is a widget session:**
- `status = approved` **and** `eventStatus ∈ {planned}` — plus an event whose `datetimeStart ≤ now < datetimeEnd` (running: stays until it ends).
- **Excluded**: `request` / `awaiting` (not confirmed), `selfPacedBookingId ≠ null` or `eventSource = self_paced`, `isGoogleCalendarEvent = true` (external busy blocks), cancelled / finished / missed.
- **Sort**: `datetimeStart` ascending; the first one is *the next*.

**Snapshot the app writes** (App Group on iOS, DataStore on Android) — the widget reads only this:

```json
{
  "role": "coach",                       // the widget's configured role
  "writtenAt": "2026-04-23T07:30:00Z",
  "timezone": "Europe/Vilnius",          // the user's calendar zone — see §7 below
  "sessions": [
    { "id": 148711, "kind": "personal",  // personal | group
      "title": "Sarah Mitchell",         // coach: the athlete's full name · athlete: "<session name> with <coach first name>"
      "sub":   "Tennis · Court A",       // coach: sport · place · athlete: place; group: "7 of 10 · TNT Studio"
      "start": "2026-04-23T07:30:00Z", "end": "2026-04-23T08:30:00Z",
      "deepLink": "threetwooneapp://event/148711?src=widget" }
  ]
}
```
The app rewrites the snapshot whenever it has fresh events (foreground load, background fetch, push) and asks the OS to reload the widget. Empty `sessions` = the *nothing planned* state; no snapshot = *signed out*.

## 7. Timeline rules

- **Zone**: render in the user's calendar zone (the one the Calendar tab uses — the same rule as [#42](https://github.com/321-fit/project-spec/issues/42) settles); 12/24-hour format follows the device locale.
- **Date word** (small label; medium/large right column): `Today` / `Tomorrow` / `Thu 24` (weekday + day) within 7 days; beyond that the widget shows nothing further (the list is the coming week).
- **Entries**: one timeline entry per boundary — at each session's `start` (it becomes *running*; the next one moves up only when it *ends*), at each `end`, and at local midnight (date words shift). WidgetKit: `.atEnd` policy; Glance: the same boundaries scheduled with WorkManager.
- **Running session**: shown as the next one until `end`; its right column reads `now` instead of the day word.
- **Reload triggers** (app side): app foreground; background fetch (≈ every 30 min); these pushes, whose `trainingEventId` names the event — `training_request_approved`, `training_event_cancelled`, `athlete_rescheduled_training`, `coach_rescheduled_training`, `pending_request_auto_declined`, `training_session_successful_*`, `training_event_ended_coach` (catalog: [notifications-api.md](https://github.com/321-fit/poly-backend/blob/main/docs/notifications-api.md)). Budget: WidgetKit ≈ 40–70 reloads/day per widget — pushes are rare enough; do not reload on every notification type.
- **Stale**: if `writtenAt` is older than 24 h the widget still shows the snapshot (never a spinner) but the small's label reads the date word in the secondary colour; the app refreshes on next open.
- **Taps**: a session row → `threetwooneapp://event/{id}?src=widget_<size>` (existing event route — opens the event sheet over Home, same as a push tap, [notifications.md](./notifications.md) "Background push tap"); the header / empty space → the Calendar tab (`threetwooneapp://calendar?src=widget_<size>`); a day in the large's strip → the Calendar on that day (`…/calendar?date=2026-04-24` — **new route**, to add to [deep-linking-referrals.md](./deep-linking-referrals.md)). `src` is for analytics (`widget_small` / `widget_medium` / `widget_large` / `widget_lock`).
- **Role**: a widget setting (iOS `AppIntentConfiguration` with a `role` parameter; Android configuration activity). Default = the role active in the app when the widget is placed. An account with one role hides the setting.

## 8. Platform rules the design obeys

| | iOS — WidgetKit | Android — Glance |
|---|---|---|
| Model | timeline of snapshots (`TimelineProvider`); one entry per upcoming session (`in 45 min`, `now`), reload on push | `GlanceAppWidget`; `updatePeriodMillis` ≥ 30 min, WorkManager + FCM → `update()` |
| Interaction | tap only — `widgetURL` (whole widget), `Link` (row); no scroll, no animation; `Button`/`Toggle` via App Intents possible later (e.g. confirm) | `actionStartActivity` with the deep link; `actionRunCallback` for buttons |
| Chrome | radius + content margins (16pt) are the system's; background via `containerBackground` (gradient allowed); redacted placeholder at first placement | 28dp system radius, 16dp padding, cells not points, preview + description for the picker (mandatory) |
| Appearance | light / dark **and iOS 18 tinted** (one hue: shape + weight carry the type; `widgetAccentable` on the parts that stay full-white) | light / dark + **dynamic colour** (Material You) for the system skin |
| Type | Rubik ships in the extension bundle | **system font** — RemoteViews cannot load custom fonts |
| Touch | rows may be 22pt on iOS (the whole row is a `Link`) | rows ≥ 40dp (48dp target with the gap) |
| Data | App Group snapshot (§6) written by the app (+ token in a shared Keychain group if the extension must fetch); never the app's session from the extension | same idea: DataStore in the app, read by the widget |
| Budget | ~40–70 reloads/day per widget | WorkManager minimum 15 min; 30 min is plenty |
| HIG / M3 | one idea per size; small identification mark only, no branding; both appearances; no empty-looking states | follow the launcher radius, dynamic colour, resizable, min 2×2 |

## 9. Copy rules

| | Coach | Athlete |
|---|---|---|
| Row title | athlete's full name (`Sarah Mitchell`); group: session name (`HIIT Group`) | `<session> with <coach first name>` (`Boxing with Maris`); group: session name |
| Row sub | `<sport> · <place>`; group: `<taken> of <max> · <place>` | `<place>`; group: `<taken> of <max> · <place>` |
| Small label | `Today` / `Tomorrow` / `Thu 24` | same |
| Right column | hour (`10:30`), under it the day word; running → `now` | same |
| Empty | `Nothing planned · this week` + `Book` | `Nothing planned · this week` + `Find a coach` |
| Signed out | `Sign in to see your schedule` | same |
| Truncation | title ellipsises; sub ellipsises; hour and dot never | same |
| Child pill | — | after #45 only: `Mia` after the title |

## 10. Acceptance (both platforms)

1. Small / medium / large render the snapshot exactly as §2 with the brand canvas; light and dark wallpapers; iOS 18 tinted mode keeps the type readable (filled / ring).
2. Only approved, non-self-paced, non-external sessions appear; a running session stays until its end; the list covers the coming 7 days.
3. Entries switch at start / end / midnight without a reload from the app; the day word is correct across a midnight boundary and across a DST change.
4. A push from the §7 list updates the widget within a minute; app foreground rewrites the snapshot.
5. Tapping a row opens that event over Home; header → Calendar; large strip day → Calendar on that day; `src` is attached.
6. Empty, signed-out, loading (redacted placeholder), stale states as §5.
7. Role setting: switching it in the widget configuration changes the content without reinstalling; single-role accounts don't see it.
8. Accessibility: each row is one element with label `"<title>, <sub>, <day> <hour>"`; identifiers `widget.<size>.row.<n>`, `widget.<size>.header`.
9. Lock-screen families (iOS) render from the same snapshot; Android preview + description present in the picker.
10. No network call from the extension; no crash when the snapshot is missing or malformed (treat as signed out).

## 11. Open

1. Lock-screen inline copy — `● Boxing with Maris · 18:30` vs `Boxing · 18:30` (one line, ~30 characters).
2. The `calendar?date=` deep link — new route, small; confirm with iOS/Android that nothing equivalent exists.

Decided: skin = brand canvas · approved sessions only, no self-paced · one widget with a role setting · running session stays · names on the lock screen · no footers / badges / money.

## Change log
- 2026-09-16 — first cut: prototype + this page.
- 2026-09-17 — hand-off pass: decisions (brand skin, one widget + role setting, no self-paced, approved only, running stays, names on lock screen); §6 data contract + snapshot, §7 timeline rules + reload triggers + deep links, §9 copy, §10 acceptance.
- 2026-09-16 (later 7) — owner: no tile anywhere — wheel rows in small and medium; small spaced evenly.
- 2026-09-16 (later 6) — agreed with the owner: large = option C (strip = load, no selected day), small label = the date word (no “Next”), medium = tile + dimmer row (wheel candidate as a switch); one rule across sizes.
- 2026-09-16 (later 5) — balance pass (owner: too many big bold sizes, everything glued): Apple Calendar-shaped small (label / 36px regular hour / tinted tile), Apple Mail-shaped medium + large rows (time right-aligned, hairlines), three-size scale, no relative times; layout switch folded.
- 2026-09-16 (later 4) — owner review: no badges on small/medium, no footers on large (rows to the end of the week instead), next block hour centred against name + where.
- 2026-09-16 (later 3) — cut pass (owner: still glued, hour not on the name's line): small = the next only, medium = next + then, action = a red count in the header, date and money removed from small/medium; hour/name share a baseline.
- 2026-09-16 (later 2) — layout pass: time-first / date-first candidates, 4px rhythm, top-anchored content, four-step type scale (owner: the first cut felt glued together with a huge gap on the small).
- 2026-09-16 (later) — platform rules pass: type = shape + colour, iOS 18 tinted state, lock-screen accessories, Android system font / 40dp rows / dynamic-colour skin, 16pt margins, smaller mark; §8.
