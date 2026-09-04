# Prototype & Component Index

> **Read this BEFORE building or editing any screen.** This is the "grep one place" map so we
> reuse what exists instead of reinventing it. Pair with `feedback_reuse_canon_first`,
> `feedback_clone_dont_author_prototype`, and `design-tokens/docs/components.md` (native spec).
>
> **Hard rule:** a new screen = `cp` the closest file below, then replace ONLY the in-phone content.
> A new visual = grep `lib/fit-ui.css` for an existing class family before writing page-local CSS.
> Page-local CSS is only for genuinely novel visuals (and must use a `fit-*` / `pf-*` prefix that
> isn't already a global — see `feedback_design_token_namespace`).

> **Start at `prototypes/index.html`** — a chooser: Prototype (the module grid, now
> `modules.html`) · Board · Components · Light-theme lab.
>
> **Looking for a screen, not a class?** Open `prototypes/board.html` (also on
> [Pages](https://321-fit.github.io/project-spec/prototypes/board.html)) — a Figma-like canvas of
> **all 241 screens across 39 modules** as real screenshots, wired by the `go(...)` transitions
> parsed out of the files, with `data-status` (shipped / canon / proposal / legacy) as the dot
> colour. Search, filter by status, jump from the left panel. Journeys are not on it: they are step
> maps, not screens. Rebuild after editing a prototype — the pre-commit hook does it for you, or
> `cd tools/board && npm run build` (see its README).

---

## 1. Screen catalog

Default theme per role: **athlete = light, coach = dark** (`feedback_prototype_theme_role_default`).
Path root: `project-spec/prototypes/flows/`

### Coach (`coach/`)
| File | What it is | Clone for… |
|---|---|---|
| `dashboard.html` | Coach home / dashboard | any coach root tab |
| `calendar.html` | Coach calendar (state-aware event drawer, 96px grid) | any calendar/schedule surface |
| `clients.html` | Clients CRM (state matrix, Mark Paid, notes) | list-with-detail + context menus |
| `client-groups.html` | **Client groups** — `Clients \| Groups` pane · group detail (schedule block + members, edit w/ undo) · group schedule (rules + dates by month) · smart groups · create / add-members / rename · **client → groups membership** (opened from the client card) · group chat · group publish drawer | bulk-select + set-of-people surfaces |
| `client-detail-drafts.html` | **Client Detail explorations (proposal, not shipped)** — A Focus / B Timeline / C Segments answer *what belongs on the screen*; **D Accent budget / E Media grammar / F Both (light)** answer *how it is painted*: one brand-filled surface per screen, and imagery for the objects we control (person → avatar · thing → picture · concept → icon plate). Reference for the palette + media direction, never a clone source for a feature. | accent-colour discipline, media cards, de-tabling a list |
| `semi-private.html` | **Semi-private sessions (proposal)** — a second/third person on a *personal* event without turning it into a group: event drawer with the roster, Participants & price in the existing instance editor, client picker without the by-link row, per-seat editor with extras, the pre-save warning drawer, and the athlete's re-confirmation (decline = keep the original terms). | per-seat money, add-a-person-to-a-booking, pre-save warning drawers |
| `sessions.html` | Training Sessions — create · list · **template detail per type** · series detail · edit (type read-only) · packages | template + object-detail-then-edit flows |
| `availability.html` | Availability hub (TZ, Time off, conflict drawer) | settings-hub-style screens |
| `available-hours.html` | Weekly available-hours editor | day/time editors |
| `locations.html` | Training locations (in-person/online/home-visit) | multi-item + default + maps |
| `balance.html` / `balance-v2.html` | Coach Earnings (v2 = Revolut-style swiper + Pending) | money/ledger screens |
| `stripe.html` | Stripe Connect onboarding + control center | multi-step onboarding |
| `profile.html` | Coach Profile (video header, stats, reviews) | public profile surfaces |
| `settings.html` | Settings menu | any settings list |
| `personal-data.html` | Personal data form | profile/data forms |
| `sport-types.html` | Sport selection (+ custom for coach) | taxonomy pickers |
| `calendar-sync.html` | Calendar sync (Google/Apple) | account-connect lists |
| `invite.html` | Coach → athlete booking/schedule (NOT the global invite) | booking/schedule-from-client |
| `referral.html` | **Refer a coach** (referral program: offer + link + funnel + invites + See-all) | coach referral/reward surfaces |

### Athlete (`athlete/`)
| File | What it is | Clone for… |
|---|---|---|
| `dashboard.html` | Athlete home (+ setup widget states) | any athlete root tab |
| `calendar.html` | Athlete schedule (coach-parity drawer, accept/decline, reschedule) | athlete calendar surfaces |
| `my-coaches.html` | My Coaches (+ loupe-push to Search) | coach-list cards |
| `search.html` | Coach search + filters | results + filter chips |
| `balance.html` / `balance-v2.html` | Athlete balance (v2 = Revolut) | money screens |
| `profile.html` | Athlete private hub (stats, training history, reviews) | athlete profile |
| `settings.html` | Athlete settings | settings list |
| `personal-data.html` | Personal data (no video/cover; +H/W kg/cm) | data forms |
| `sport-types.html` | Sport selection (no custom for athlete) | taxonomy pickers |
| `calendar-sync.html` | Calendar sync | account-connect lists |
| `integrations.html` | Integrations | toggle lists |

### Shared (`shared/`)
| File | What it is | Clone for… |
|---|---|---|
| `auth.html` | Authentication (sign in/up) | auth surfaces |
| `account-access.html` | Account access (email+password, re-auth, social) | security settings |
| `onboarding.html` | Fullscreen post-signup flow (athlete 5 / coach 7 steps) | mandatory wizards |
| `connect.html` | **Connect (QR)** — in-person nametag: My code / Scan + share (role-agnostic) | any connect/QR surface |
| `messages.html` | DM messages | chat/thread surfaces |
| `voice-assistant.html` | Voice assistant (canvas, athlete+coach views) | assistant surfaces |
| `self-paced.html` | Self-paced training builder (WIP) | step-builder flows |
| `profile.html` | Coach profile (shared variant) | — |
| `assistant-entry.html` | **Contextual AI quick starts (WIP, proposal)** — audited map of **8 coach + 4 athlete** high-friction screens, each linking to the real prototype. Every point has two board states: **“AI · 3 contextual quick actions”** and **“AI · full-screen chat from first action”**. Generic feature questions were removed; each action now performs a task or diagnoses hidden state on the current screen. The header **×** hides only this screen's bubble until the app session restarts; **“Hide quick starts”** disables all bubbles and is reversible from **Settings → Assistance → AI quick starts**. Schedule Calendar and Available Hours intentionally have no AI FAB; Calendar Sync keeps one because account direction and sync failures are high-friction. | complex screens where users need a contextual way to start a dialogue about using the app |
| `calendar-legend.html` | **Calendar legend** — every tile state, zone type + colour rules, both themes (`?` sheet from the calendar header) | any legend / key surface |

### Journeys (`journeys/`)
End-to-end annotated walkthroughs, not screens to clone. Each step links a **live** screen in flow order (no copies).
- `home-visit.html` — booking-with-address journey.
- `packages.html` — session packages end-to-end · `packages-birdseye.html` — state × surface matrix.
- `self-paced.html` — self-paced training end-to-end (Requested → Ready → Submitted → Finished).
- `action-rows.html` — **the twelve places that adopt `FitActionCircle` (WIP).** Two screens:
  what changes today, and what it becomes. Found by scanning all 446 rows in the prototype that
  hold two or more buttons; the annotation lists the four families that deliberately do NOT
  change ("are you sure?" alone is ~40 rows). Component lives in the kit as
  `.fit-action-circle` and in design-tokens as `FitActionCircle`.
- `group-training.html` — group training end-to-end (create → discover/join → manage roster + **invite existing/CRM/by-link** → settle/complete → feedback).

### Lab (`lab/`)
Token experiments, not product screens — never clone these for a feature.
**Linking to a screen:** the board takes a deep link — `board.html#<module-slug>/<screen-id>`,
e.g. [`board.html#shared-auth/s-signin-email`](https://321-fit.github.io/project-spec/prototypes/board.html#shared-auth/s-signin-email).
It opens the module, centres the screen and highlights it. The hash rewrites itself as you
focus screens, so the address bar is always a link to what you are looking at. **Prefer
this over linking to a prototype file** in issues and specs: from a screen on the board you
can still reach the live prototype, the annotation and the neighbouring screens — a link
straight to the file gives you only the file.

- `list-grammars.html` — **the three list grammars on live screens.** A row can be separated from
  its neighbour three ways: its own card, a shared inset container, or full bleed where the list *is*
  the screen. Each is shown on a real screen (Settings / Messages / Personal data) — left is exactly
  what ships, right is the same markup wearing the other grammar. **Generated:** edit
  `tools/lab/build-grammars.mjs` and re-run it, never this file; it lifts each screen out of its
  prototype by tag depth so the comparison cannot drift. Reasoning and the decision table live in
  [`specs/theme-contrast.md`](../specs/theme-contrast.md) §6.
- `components.html` — **component fitting room.** One specimen list rendered into a dark and a light
  pane side by side, so the two cannot drift. A **live contrast audit** measures the *rendered*
  colours (walking up for the first opaque background) and badges anything under WCAG AA, with a
  count in the bar and an "only failures" filter. Opens with the audit on: that number is the page.
  `Palette: ours ⇄ iOS` swaps in the **real iOS 26 values** — type scale, neutrals and metrics
  read out of Apple's kit (see [`specs/ios26-reference.md`](../specs/ios26-reference.md));
  brand colours stay ours. First section is editable vs display vs disabled. Every number it reports is written down in
  [`specs/theme-contrast.md`](../specs/theme-contrast.md) — that doc is what you read, the room is
  what you look at.
- `light-theme.html` — **light-theme fitting room.** Live screens (`athlete/my-coaches.html#s-coach-detail`
  and `athlete/calendar.html#s-schedule`) cloned into one column per candidate light palette, with synced
  scroll, per-column WCAG readouts and an accent-colour toggle. Two sets: *all palettes* (current + 5
  strategies) and *A · what draws the edge* (one palette, three edge mechanisms — canvas only / hairline /
  soft shadow), so the dense calendar grid gets tested too. Palettes live in the `VARIANTS` object at the
  bottom of the file — edit there, everything (CSS, swatches, metrics) regenerates.

---

## 2. Reusable CSS class families (`lib/fit-ui.css`, ~2900 lines)

Grep `fit-ui.css` for the prefix before inventing anything. Native equivalents are documented per
component in `design-tokens/docs/components.md` (and live in `design-tokens/Sources/FitUI/Components/Fit*.swift`).

| Prefix | Purpose | Native (FitUI) |
|---|---|---|
| `.fit-phone-*` | Phone shell / footer (prototype-only) | — |
| **type roles** `.fit-headline` `.fit-heading1-3` `.fit-button1-2` `.fit-nav-title` `.fit-body1-2` `.fit-footnote` `.fit-caption` `.fit-pill` `.fit-caption-micro` (+ `.fit-t-primary/secondary/tertiary`) | **The twelve sizes there are.** Each carries size + weight + line-height + letter-spacing from the tokens. Never hand-type a `font-size` — if the size you want is not here, it is not in the system. | `FitTypography` |
| `.fit-list-row` (+ `-icon` `-body` `-title` `-sub` `-value` `-chevron`, in `.fit-list-group` / `.fit-list-group--bleed` / `.fit-list-row--card` / `--unread` / `--read`) | **The tappable row that leads somewhere** — the most common shape in the app. Added 2026-08-31 after finding 30 hand-rolled versions across 29 files. | `FitListRow` |
| `.fit-row` (+ `.gap-1–4`) | Bare flex row on the spacing scale | — |
| `.fit-note` (+ `-icon` `-label` `-text` `-edit`, `--empty`) | **Content a person attached to a card** — an event note, a quote. Outlined, never filled or tinted: a tint is the language of info/warning/error and this is not system messaging. Dashed only for the empty add-zone (`feedback_note_block`). | `FitNote` |
| `.fit-scope-option` (+ `-title` `-sub`, `.selected`) | **A two-outcome scope question** — "Just this date" vs "Every Saturday". Two full-width cards stacked, never radios; the narrower option is the default (`feedback_scope_choice_cards`). | `ScopeOptionCard` |
| `.fit-progress` (+ `-fill`) | Plain progress bar, 3px gradient. Not `.fit-vuc-progress` (video upload card) or `.fit-maturity-progress` (a checklist). | `FitProgress` |
| `.fit-header` | Screen header (back + title + right actions) | `FitHeader` |
| `.fit-navbar` | Bottom tab bar (root screens only) | `FitNavbar` |
| `.fit-btn-*` | Buttons, 4-tier severity | `FitButton` |
| `.fit-icon-*` | Circular icon buttons / icon plates | `FitIconBtn`, `FitIconPlate` |
| `.fit-card` | Generic card (light=shadow, dark=clean) | `FitCard` |
| `.fit-sheet` | Bottom sheet (handle + backdrop dismiss) | `FitSheet` |
| `.fit-input` | Text fields / form inputs | `FitInput` |
| `.fit-selection` | Selection rows / groups | `FitSelectRow`, `FitSelectionGroup` |
| `.fit-chip` / chips | Selection & filter chips (`.selected` only) | `FitChip` |
| `.fit-badge` | Status badges | `FitBadge` |
| `.fit-toggle` | Switches | `FitToggle` |
| `.fit-stepper` | Steppers | `FitStepper` |
| `.fit-cal-*` | Calendar grid + event pills | `FitCalEvent`, `FitCalEventPill` |
| `.fit-cal-offhours` | Outside-availability wash on the 24h grid (+ `.fit-hour.offhours` fades rules/labels) | `FitTimeline` → OffHoursBand |
| `.fit-cal-blocked` | Hatched "busy" zone inside working hours (external / time off) | `FitTimeline` → BlockedBand |
| `.fit-day-*` | Day strips / circles | `FitDayStrip` |
| `.fit-availability-*` | Availability day cells | `FitAvailabilityDay` |
| `.fit-avatar` | Avatars | `FitAvatar` |
| `.fit-profile-*` | Profile hero / header | `FitProfileHero`, `FitProfileHeader` |
| `.fit-stat-*` | Stat strips / tiles | `FitStatStrip`, `FitStatTile` |
| `.fit-review` | Review cards | `FitReviewCard` |
| `.fit-rating` | Star ratings | `FitRating` |
| `.fit-txn` / `.fit-transaction` | Transaction rows | `FitTransactionRow` |
| `.fit-earnings-*` | Earnings hero | `FitEarningsHero` |
| `.fit-payment-*` | Payment method cards | `FitPaymentMethodCard` |
| `.fit-vuc-*` | Video upload card | `FitVideoUploadCard` |
| `.fit-maturity-*` | Coach maturity progress | `FitMaturityProgress` |
| `.fit-participant` / `.fit-spot(s)` | Group participants / spot counters | `FitParticipant`, `FitSpotCounter` |
| `.fit-toast` / `.fit-snackbar` | Transient feedback | `FitToast`, `FitSnackbar` |
| `.fit-context` | Context (⋯) menu | `FitContextMenu` |
| `.fit-empty-state` (+ `-title` `-sub`, `svg.fes-illus`) | Empty states | `FitEmptyState` |
| `.sk-*` — `sk-card` `sk-row` `sk-circle` `sk-lines` `sk-line` `sk-block` `sk-btn` + `sk-shimmer` | Loading skeletons. **Note the odd prefix** — a third namespace in a library that is otherwise `fit-*`; see the block comment above the family for the markup. | `FitSkeleton` |
| `.fit-banner` (+ `--info` `--warn` `--error`, `-body` `-title` `-link` `-retry`) | Inline error / warning / info banner | `FitBanner` |
| `.fit-ticket` | Ticket / booking cards | `FitTicket` |
| `.fit-invite` | Invite rows | `FitInviteRow` |
| `.fit-settings-*` | Settings cards | `FitSettingsCard` |
| `.fit-wheel` | Wheel picker (native on device) | — (platform-native) |
| `.fit-light` / `.fit-dark` | Theme scopes | `FitTheme` |

Pickers (wheel/time/date/map) are **platform-native** on device — prototype CSS is approximation only
(`feedback_native_pickers`).

---

## 3. The pre-flight (every time)

1. **Screen exists?** Find the closest file in §1 → `cp` it, edit in-phone content only.
2. **Visual exists?** Grep `fit-ui.css` for the §2 family → reuse the class.
3. **Genuinely new?** Page-local CSS with a non-colliding `fit-*`/`pf-*` prefix (grep first).
4. **Render in-place + eyeball** before calling it done (`feedback_headless_render_gotcha`).
