# Coach Clients — redesign (draft, J's grammar)

> Status: **Draft — work in progress.** Nothing confirmed for development. Third of the rework set with [client-detail-redesign.md](./client-detail-redesign.md) and [dashboard-redesign.md](./dashboard-redesign.md): same grammar, same look switch.
> Prototype: [flows/coach/clients-drafts.html#s-draft-clients](https://321-fit.github.io/project-spec/prototypes/flows/coach/clients-drafts.html#s-draft-clients) — every screen reached is copied in; client rows open the Client Detail rework.
> Supersedes (once approved): the list layout in [clients-coaches.md](./clients-coaches.md) (`#s-clients`) and the Groups pane's *Smart groups* section in [client-groups](../prototypes/flows/coach/client-groups.html). **Endpoints:** the list needs one added field — `nextSessionAt` (+ name/type) per client — for the *This week* section and the *Next ·* sub-line; everything else is already loaded.
> Hub: [modules.html → Rework](https://321-fit.github.io/project-spec/prototypes/modules.html)
> Last updated: 2026-09-15

## 1. The screen

Order: **what you owe an answer to → who you see this week → everyone.**

```
 Clients                                    (+)
 [ Clients | Groups ]                            ← pane decision stands
 [🔍 Search clients]
 Needs you
 [● €90 owed · 3] [● 7 inactive 30d] [● 2 packs low] [● 14 not in app] [● 5 new]   ← the smart groups
 This week                                    2
 ┌ (AK) Anna Kowalski  [€50 owed]              ┐
 │      Next · Thu 10:00 · Tennis   (teal)     │
 │ (MS) Mark Schmidt                           │
 │      Next · Sat 08:00 · Morning crew        │
 Everyone                                    23
 ┌ (JD) Julia Dent · Last · Apr 2 · 5 sessions ┐  ← A–Z, plain rows
 │ (AK) Alex Kim · Last · Apr 21 · 2 sessions  │
 [ 🗄 Archived & Blocked                  5  › ]
 ⌂  👥  💬  📅  👤
```

## 2. What changed vs the shipped list, and why

| Change | Why |
|---|---|
| **Needs you = the five smart groups as chips**; **tap opens the smart group's list** (as the Groups pane did). They are doors, not filters ✅ (owner, 2026-09-15). The Groups pane keeps manual groups only. | The things a coach opens the tab for sat on the other pane. |
| **Rows speak of time, not lifetime money**: `Next · Thu 10:00 · Tennis` (teal) or `Last · Apr 2 · 5 sessions`; badges stay for owed / CRM / new. | `12 sessions · €580` is a stat; it lives on the client's screen. |
| **This week** = people you see, ordered by when; **Everyone** = A–Z, plain rows. Letter dividers + an index rail were tried and dropped 2026-09-15 (noise at this size; native can show the platform index past ~50). | The shipped list had no order a coach could name. |
| **Search** under the segmented control; while searching, chips / This week / rail hide and the A–Z list filters; "No one matches" when empty. | Mandatory from ~15 clients. |
| **Groups pane lives inside the same screen** (the segmented control swaps panes): manual groups only, faces lead the row, unread count on the row, *Create a group* as a dashed row. | The copied canon pane looked like a different app next to the reworked list. |
| **+ stays the one action** (canon sheet: create · import · invite to app · invite to training). No circles — a list is not an object. | |
| **Archived & Blocked** stays a row at the bottom. **Fresh coach** = one card, two doors (Import contacts / Invite by link). | |
| No wash in the plain look (no identity block). | |

States: 23 clients · Fresh coach · Loading (title + segmented + search instant; skeleton below).

## 3. Screens reached (copies)

| From | Screen | Source |
|---|---|---|
| a chip | Smart group list (titled after the chip) — money-widget hero, rows → the client's Owed; no per-row *Mark paid* | new (`#s-draft-smart`); canon `client-groups.html#s-group-smart` |
| segmented → Groups | Groups pane (built in the draft) → **Group** (redrawn: faces identity → Schedule · Message · Add circles → Needs you → Next session → Schedule → Members never truncated; ⋯ Edit members / Rename / Delete) → **all dates** (series first, upcoming by month, date tile + occupancy, chips as facets) · **add clients** (picker) · **rename** (Cancel/Save form) · **edit members** in place (whole row removes, tinted while armed, Undo snackbar) · **create group** (name + picker) | new (`#s-draft-group*`); canon `client-groups.html` |
| + | canon add sheet → **Create client** (form grammar for tinted: sentence-case label, *optional* suffix, alpha input, hint, selector rows) / **Import contacts** (picker grammar: check on the row, badges say what happens, already-clients muted) / Invite share sheet | new (`#s-draft-create-client`, `#s-draft-import`); canon `clients.html` |
| a row | Client Detail rework | `client-detail-drafts.html#s-draft-client` |
| bottom row | Archived & Blocked — redrawn in the row-panel grammar (same content and rules) | new (`#s-draft-archived`); canon `clients.html#s-archived` |

## 4. User flows (for issues)

1. **Open the tab** — chips, This week, Everyone render; loading = skeleton under the search.
2. **Chase money** — €90 chip → Owes money list → a client → Client Detail → Owed.
3. **Find someone** — search → filtered A–Z → row → Client Detail.
4. **Add** — + → Create profile / Import contacts / Invite to app / Invite to training.
5. **Groups** — segmented → Groups pane → group / create.
6. **Fresh coach** — one card → Import contacts or Invite by link.

## 5. Open

- A person can appear in both This week and Everyone — accepted for now; alternative is a "next" line on the A–Z row only and no This week section.
- `nextSessionAt` on the clients list endpoint (additive).
- Smart-group counts on the chips = the same counts the Groups pane computed.

## Change log

- 2026-09-15 — first cut, built after the Clients discussion (chips as doors, rows by time, A–Z + rail, search, fresh card); review: segmented inset fixed, letters + rail dropped, Groups pane rebuilt inside the draft, Archived & Blocked redrawn, fresh card fixed, Group detail redrawn (people first); later the same day: group all-dates / add / rename / create, smart group, import, create client redrawn — nothing in the flow leads to a canon copy any more except the group chat and the booking flow; **form grammar** (`cd-f-*`) and **picker grammar** (`cd-pick-*`) defined here.
