# Client groups — what shipped on Android + backend (iOS hand-off)

> Date: 2026-08-11 · Scope: client groups (project-spec#33)
> Android: `321fit_android_new` PR from `feat/33-client-groups-android` · Backend: `poly-backend` `dev2`
> Prototype: [`prototypes/flows/coach/client-groups.html`](https://321-fit.github.io/project-spec/prototypes/flows/coach/client-groups.html)
> API: [`poly-backend/docs/clients-coaches-api.md`](https://github.com/321-fit/poly-backend/blob/dev2/docs/clients-coaches-api.md) § Client groups
> Purpose: everything below exists on Android and on the backend and **does not exist on iOS**.

A **client group** is a named set of the coach's clients — app accounts and CRM
contacts side by side. Membership is keyed by `relationshipId`, the same key
`POST /coach/training-events/{id}/participants` already takes, so both kinds of
client go down one path.

Groups are **coach-private**. The athlete is never told they are in one; the only
thing they can notice is the group's chat, if it has one.

---

## 1. Why a group is not a filter

The pane is a **segment** on the Clients tab (`Clients | Groups`), not a row of
filter chips. Chips promise "narrow what's on screen"; a group has a name, a
chat, a schedule and its own actions — that is navigation, not filtering. There
is deliberately no "filter clients by group": opening a group *is* the filtered
view of those people.

**Smart groups live in the same pane** — same card, same detail screen, only the
membership is computed instead of hand-picked. That kills the second metaphor:
everything here is a group, some just fill themselves.

---

## 2. Endpoints

| Method | Path | What |
|---|---|---|
| `GET` | `/coach/client-groups` | list + `memberCount`, `members`, `avatars[]`, `chatConversationId`, `attachedPlacements[]` |
| `POST` | `/coach/client-groups` | `{ name, relationshipIds[] }` |
| `GET`·`PATCH`·`DELETE` | `/coach/client-groups/{id}` | detail (+ `upcomingDates`), rename, delete |
| `POST` | `/coach/client-groups/{id}/members` | `{ relationshipIds[] }` — re-adding a removed member **revives** their row |
| `DELETE` | `/coach/client-groups/{id}/members/{relationshipId}` | future dates only |
| `POST`·`DELETE` | `/coach/client-groups/{id}/placements[/{placementId}]` | attach / detach a schedule |
| `POST` | `/coach/client-groups/{id}/chat` | create-or-return the thread |
| `GET` | `/coach/client-groups/smart[/{key}]` | computed cohorts |

Plus, on the events side:

| `POST` | `/coach/training-events/{id}/participants/group` | `{ groupId }` — a whole group onto a date that already exists |

**Scheduling needs no new endpoint.** `POST /coach/training-sessions/{id}/placements`
accepts an optional **`groupId`**: publishing a schedule for a group attaches the
group to it, and the rolling generator seeds every occurrence with the group's
eligible members — CRM enrolled outright, app athletes invited and holding the
seat until they answer (project-spec#34).

**Membership rules, enforced server-side.** A blocked client, or one whose
account was deleted, is dropped from every group on the next read. An **archived**
client keeps their place — the coach put them there — but is skipped by anything
the group *does*.

---

## 3. Screens Android has and iOS does not

### 3.1 `Clients | Groups` pane

Your groups first, then smart groups under an `auto-updated` hint. A group card
answers **"when"** rather than **"how many"** whenever it is attached to a
schedule — that is the question a coach actually has — falling back to the member
count otherwise. Card also carries the avatar stack and an unread badge when the
group's chat has news.

The empty state sits **above** the smart groups rather than replacing the screen:
a coach who never builds a group still gets "who owes me" on day one.

An individual smart group with nobody in it does not render — a row saying `0` is
a line the coach reads only to learn there is nothing to do. **`not_in_app` was
dropped** from the computed set entirely: a CRM contact is not a cohort to act
on.

### 3.2 Group detail

- **Schedule block** — one contour around every schedule the group rides, plus a
  *"See all N dates"* row. A rule reads days · time with its next date; a one-off
  reads its date without a weekday. **No fill count here**: the whole group is
  assumed on these, and occupancy belongs to the date.
- Tapping a schedule opens **that rule's own series** — the template screen behind
  "14 dates". The rule belongs to the template; the group is only riding it.
  *"See all"* opens the group's own screen, which is the **aggregate**: every date
  from every schedule, one-offs included, which is what the chips there slice.
- **Members are client rows** — the same row as the clients list, with the CRM
  pill, cash-owed badge and "N sessions · €X", opening the client's own card. A
  member *is* a client; giving them a second appearance was the first mistake we
  made here.
- **Edit mode removes by tapping the whole row**, tinted red. The coach is
  pruning; a small target beside each name makes that a chore. Removal is
  optimistic with Undo and only reaches the server when the Undo window closes.
- Footer CTA is **"Schedule a session"** — the thing a group exists for.

### 3.3 Group schedule (the aggregate)

Rules first, each stating how long it runs and how many dates it contributes
(*"Ongoing · 14 dates"*), then the dates as **one card per month**. Each date
carries its own fill, amber at zero — that is the number a coach scans a list of
dates for. One chip axis: All / per schedule.

### 3.4 Create / Add clients

One list, not two sections: a CRM contact differs by a **badge**, not by a place
to look. Carries **Select all / N selected**, the person's own "12 sessions ·
€580" line, and **blocked clients shown disabled** — filtering them away silently
left the coach hunting for somebody who is right there in their client list.

### 3.5 Rename

Literally the DM group rename screen: Cancel/Save in the header above the
keyboard, opened focused, 40 characters with a live counter. Only the helper line
differs — a client group is coach-private *except* through its chat thread.

### 3.6 Smart group detail

Same shape as a manual group minus everything hand-picked membership implies: no
Add, no Edit, no attach-to-series. A note says where the membership comes from
and **how people leave it**, because a set that empties itself is otherwise
alarming. For `owes_money` the server sends `outstandingTotal` and `oldestDays`
— computed where the membership is decided, so the number and the list cannot
disagree. Deliberately **no group chat**: a thread called "Owes money" is a
debt-collection room.

### 3.7 From the client's side

Groups used to be visible only from the group side, so standing on a client you
could not see — let alone change — where they belong.

- **Pills** under the client's header: two names, a `+N` counter for the rest,
  then a dashed add pill. With pills present the add affordance is icon-only;
  with none it keeps its label, because then nothing else explains the section.
  Two names, not three: the counter and the add pill must fit the same line.
- Behind the counter and the dashed pill: **one screen that adds *and* removes**.
  Rows start **checked** for the groups the client is already in, so it shows
  membership rather than an empty add-only list, and unchecking leaves the group.
  **Nothing commits until Save** — that is what makes a checkbox that can remove
  somebody safe to offer. The CTA says which it is: *Add to 2 groups*, *Save
  changes*, or plain *Save*.
- **"Create a new group"** is the first row — same grammar as *Add clients*
  inside a group — and opens the create picker with this client already ticked.
- Smart groups are absent by design (you cannot hand-add anyone to "Owes money"),
  and the note says so along with the chat consequence, which is the one part the
  athlete sees.
- Membership is read off `GET /coach/client-groups`, which already carries
  members — no new endpoint for a question the data already answers.

### 3.8 "Save these N as a group"

The group-event ⋯ menu offers it: the picker opens with the roster ticked, so a
set of people the coach already gathered becomes a group in two taps.

---

## 4. Not built anywhere yet

- **System "joined / left" lines in the group thread.** The message model has no
  system-message kind; that belongs to messaging, not here.
- **"Put them in a group" at the end of contact import** — offered on Android's
  import-done screen, but the group is created through the ordinary picker.

---

## 5. Things iOS should not re-derive

- A group's **members are clients**: reuse the clients-list row rather than
  inventing a member cell.
- A **schedule** is the training-template schedule module, not a second one.
- **Loading states**: every one of these screens must draw *something* while
  fetching. Rendering nothing reads as a broken screen, especially on a tab
  switch, and a re-entry should re-read without dropping back to a skeleton over
  content the coach is already looking at.
- The bottom bar **floats over** tab content: a list that ends flush with the
  screen ends underneath it.
