# UI rework — index (WIP)

> Status: **Draft — work in progress.** The rework of the coach and athlete apps in one grammar (draft J's), one file per flow. Nothing here is confirmed for development; this page is the map for cutting issues once it is.
> Hub: [modules.html → Rework](https://321-fit.github.io/project-spec/prototypes/modules.html) · Board: every screen has a shot.
> Per-flow specs: [client-detail-redesign.md](./client-detail-redesign.md) · [dashboard-redesign.md](./dashboard-redesign.md) · [clients-redesign.md](./clients-redesign.md) (calendar / profile & settings / sessions / athlete are documented below only).
> Last updated: 2026-09-15

## 1. The grammar (what every reworked screen obeys)

| Rule | Where it came from |
|---|---|
| **Order by the person's job, not the spec's table of contents:** who/what this is → what you owe an answer to → what is next → the money → the period → the assets. | Client Detail J |
| **Identity block** at the top of any *object* screen (client, coach, group = faces, your own profile). Nested screens carry the name in the title, no person row. | J · Profile · Group |
| **Circles carry weight, not errands** (52px, fixed slots, no item also in ⋯). ⋯ administers the relationship. | J |
| **Needs you = chips** (red money · blue question · yellow review · grey waiting), each a door to its list. Gone when empty. Chips filter only where they are facets of one list (group schedule). | J · Home · Clients |
| **Next session = a card, no buttons**, solid teal perimeter when planned, yellow request / dashed awaiting; tap → the calendar's own drawer over the screen. | J · Home · Group · Coach detail |
| **Money = one widget**: 24px headline as a row that leads to the list (Owed / Cash to collect / Balance), context underneath, 20px inset. No "Mark paid" button — settle is per entity. | J · Home · athlete |
| **Rows speak of time** (`Next · Thu 10:00` / `Last · Apr 2`), not lifetime money; lifetime lives on the object's screen. Row panels, section title outside. | Clients · My coaches · Members |
| **Tiles lead with a visual** (faces / map / poster / plate); archives are one tile. | J · Self-paced · Profile |
| **Forms** (`cd-f-*`): sentence-case label, *optional* suffix, alpha input panel, hint below, selector rows with plate + chevron. **Pickers** (`cd-pick-*`): check circle on the row, unpickable rows muted with the reason, count in the footer. | Clients flow |
| **Destructive list editing**: whole row removes, tints while armed, Undo snackbar (5 s). Membership applies on the tap. | Group · Groups |
| **Look**: tinted canvas (brand gradient owns the screen, surfaces = `rgba(0,0,0,.28)` alpha; dark-only) + **white CTA with depth**; sheets/menus = blurred material. Plain look = no wash outside identity screens. | K → switch |
| **Calendar fills**: no hatch anywhere — off-hours full-bleed recessed; blocked / travel / external / other-party = flat darker inset fill; cross-role = quiet lift, no stripe. Already in `fit-ui.css` (canon). | calendar |

## 2. Flows and their state

| Flow | File | Redrawn | Copied under the look | Open |
|---|---|---|---|---|
| Client Detail | `coach/client-detail-drafts.html` | J · Owed · Self-paced per client · Packages per client · Groups (on tap) · History | Book ×3, thread, review/setup, addresses, note, edit info | forms pass; money title → per-client ledger |
| Coach Home | `coach/dashboard-drafts.html` | Home (anchor = day widget + next inside) · Cash to collect · Self-paced hub | Inbox, review queue, earnings, book ×4, time off, self-paced builder/review/thread | circle set; light? |
| Clients | `coach/clients-drafts.html` | Clients (chips = smart groups as doors) · Groups pane · Group · all dates · add · rename · create · edit members · Archived & Blocked · smart group · import · create client | — (nothing left) | `nextSessionAt` on the list endpoint |
| Calendar | `coach/calendar-drafts.html` | — (fills in canon css) | calendar + drawers, event, edit, time off, cash, invite | — |
| Profile & Settings | `coach/profile-drafts.html` | Profile · Settings · Availability hub (week chart = proposal toggle) | personal info ×7, sports, hours ×5, locations ×6, calendar sync ×5, Stripe ×13, referral ×2, account access ×17 | Booking rules dropped (not in prod); icon assets path |
| Sessions & Packages | `coach/sessions-drafts.html` | — (cards as one surface) | list, create, detail ×3, series, edit, package editor ×3 | forms pass |
| Athlete side | `athlete/athlete-drafts.html` | Home (anchor = 3 options: Next up · Activity ring · Balance) · My coaches · Coach detail (no Packages circle) · Profile (stats folded into the identity line; the ring stays on Home) · Settings · Training history · History with a coach · My addresses · Home-visit address picker · Group session join (states open / full / conflict / joined; ⋯ share · coach · leave) — built from the athlete's own canon screens | schedule, search (under the look; coach card → public profile), public coach profile (Trains at as a panel, footer = chat circle + CTA) + booking (template cards one surface), rate queue (equal actions, CTA of the look), transactions (search + chips), package activity, balance ×12, personal info ×7, calendar sync ×5 (provider plates drawn in CSS), integrations, sports | which anchor; **canvas** switch (Teal / Indigo / Ember / Graphite / Fog / Ash; remembered separately per role); light recipe; review pass |

Every exit from a rework file lands on its rework equivalent (`~/.claude/scripts/relink.py`); the walk script reports 0 dead refs / 0 JS errors across all seven files.

## 4. Issue candidates (when confirmed)

Cut per flow, per platform, from the per-flow specs' *User flows* sections. Endpoint work identified so far (all additive):
- Clients list: `nextSessionAt` (+ name / type) per client.
- Home: none (snapshot already carries everything); Self-paced hub = the existing queue endpoints.
- Client Detail: none; Owed = the four per-entity settle endpoints already shipped.
- Design tokens: `.fit-action-circles--sm` landed; tinted look tokens, form/picker grammar, day widget, chips → `design-tokens` once the look is approved.

## 4. Decisions still open (owner)

1. Tinted canvas as the coach default; what the athlete (light by default) gets.
2. Home circle set (Book · Self-paced · Time off · Ask AI) and the athlete's (Find · Self-paced · Top up · Invite); the athlete Home anchor (Next up / ring / balance).
3. Canvas hue per role (switch on every rework file, remembered per role): Teal is the brand; Indigo was softened to the teal's saturation (owner: the first cut was acid-bright); Fog / Ash are the two grey "light-ish" bets (Fog = white haze on top, Ash = the same without the haze, lighter and crisper — owner found Fog soapy in places); Indigo (evening / after-work, teal CTA + chips still pop, status pills keep contrast) is the proposed athlete variant; Ember (warm, but red/yellow pills lose contrast) and Graphite (neutral) are there to compare.
4. Availability hub week chart — keep or drop.
5. Forms pass on canon forms (create session, package editor, personal info, Stripe onboarding).
6. Port-back order: which canon files get the rework first.

## Change log
- 2026-09-14 — Client Detail J finished as a flow; Home first cut; Clients discussion.
- 2026-09-15 — Home anchor = day widget; Clients, Calendar, Profile & Settings, Sessions, Athlete flows; relink + walk; calendar hatch retired in canon; this index.
- 2026-09-16 — Athlete pass 2: training history / history with coach / addresses / home-visit picker / group join redrawn as roots; booking cards, rate queue, transactions header, calendar-sync plates, coach profile (Trains at + footer) under the look; search coach card → public profile; package activity renders on entry; every exit stays in the file (schedule / balance / booking); canvas switch (Teal · Indigo · Ember · Graphite · Fog) on every rework file, per role; look-switch tidied into one labelled row; search filters rows fused into panels; calendar-sync fused cards.
- 2026-09-16 (later) — Group join facts block: three candidates (headline / tiles / labelled rows), **tiles** chosen by the owner (centred, chips inset 16px); indigo softened; Fog + Ash canvases; search filters fused; calendar-sync gap; profile line fixed.

## 6. Next batch — `extension` label (2026-09-16)

Five issues in project-spec, label `extension`, in the order we take them (**#43 in progress** — prototype `flows/shared/widget.html` + `specs/home-widget.md`, parked at the wheel version 2026-09-16): **#43 widget** (everything it needs exists — draw + a widget extension per platform) → **#44 roster statuses** (extends #34) → **#45 kids** (the model decision first: child = a profile under the parent's account) → **#46 web invite** (first public web surface; needs #44 and the child step from #45) → **#47 pricing block** (a UX pass through `sessions-drafts.html` + the validity-vs-no-expiry decision, #13/#17).
