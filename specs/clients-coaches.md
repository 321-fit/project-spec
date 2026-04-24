# Clients & Coaches

> Status: Approved (contract) / In Progress (Archive/Block + CRM + Deleted migration)
> Prototype: [flows/coach/clients.html](../prototypes/flows/coach/clients.html)
> Component library: [design-tokens/docs/components.md](../../design-tokens/docs/components.md)
> Last updated: 2026-04-24
> Implementation:
> - iOS:     [321fit_ios/docs/clients-coaches-ios.md] (to be created)
> - Backend: [poly-backend/docs/clients-coaches-backend.md] (to be created — includes relationship model migration)
> - Voice:   [voice_control/docs/clients-coaches-voice.md] (to be created)
> - Android: (future)

---

## 1. Overview

The **Clients tab** is the coach's CRM — active clients, pending requests, CRM-only contacts, archived, blocked, and deleted-account histories. The **athlete-side coaches list** (coach discovery / my coaches) is a separate but related feature.

This spec focuses on the **coach-side Clients tab** (the more complex half) and establishes the **relationship model** (active / archived / blocked / deleted / crm) that both sides use. Athlete-side coach discovery is referenced here but fully specified in `athlete-schedule.md` (future follow-up) — inherits the same relationship states.

---

## 2. User Stories

### Coach

- As a coach, I want to see my active clients in one list so that CRM is obvious.
- As a coach, I want to **add a client manually** (someone I coach offline who doesn't use the app yet) so that I can track their sessions and cash payments in one place until they join.
- As a coach, when that offline client joins 321Fit via my invite, I want the system to automatically link their app account to my existing CRM record so that no data is lost.
- As a coach, I want to **archive** a client who stopped training (quietly, reversibly) without affecting them so that my active list stays clean.
- As a coach, I want to **block** a problematic client (harassment, repeated no-shows) so that they silently can't book me anymore, without the drama of notification.
- As a coach, when a client **deletes their app account**, I want their history to remain in my records (muted visually) so that my reports don't lose data.
- As a coach, I want to **initiate a booking request** for an existing client directly (not via their "book me" action) so that I can schedule training for them.
- As a coach, I want to **view the Requests inbox** and accept/decline pending bookings so that I manage incoming demand in one place.

### Athlete

- As an athlete, I want to find coaches via search + filter (sport, price, availability) so that I can book someone who fits.
- As an athlete, I want to see my connected coaches (whom I've booked with) so that rebooking is one tap.
- As an athlete, I don't want to be notified when a coach archives or blocks me — I just see the coach's schedule gets unavailable or the coach disappears from search.

---

## 3. System Stories

- As the backend, every **coach ↔ athlete relationship** has an explicit state (`active | archived | blocked | crm`) and a separate `athlete_account_status` field (`app | crm | deleted`) representing whether the athlete side has an app account at all.
- As the backend, **relationship state** is mutable (coach actions); **athlete_account_status** is driven by athlete's account lifecycle.
- As the backend, the `crm → app` transition happens automatically when an invited athlete (with matching phone/email or invite-token) signs up; no manual link required.
- As the backend, `blocked` athletes must be filtered out of that coach's search visibility for the athlete (shadow ban).
- As the backend, `deleted` athlete's existing events + history remain visible to the coach; no push / message functionality works toward them.
- As the client, menu scope and state banners must reflect combined states (active + deleted = "muted active"; crm + archived = "archived CRM contact"; etc.).

---

## 4. Flows

### Flow 1: Browse active clients

1. Coach opens Clients tab (`#s-clients` root).
2. Shows bell icon (pending requests count badge) + Add button (`+`).
3. List of connected clients, each row: avatar + name + last-session date + "€X owed" badge if outstanding cash.
4. Special visual markers:
   - **CRM:** teal-tinted pill next to name
   - **Deleted:** muted avatar (0.5 opacity) + gray `Deleted` badge + text-tertiary name
   - **CRM + Deleted:** both markers
5. Tap row → Client Detail screen.

### Flow 2: Pending requests inbox

1. Tap bell → `#s-requests` push screen.
2. Cards for each pending `request` (see [event-statuses.md](./event-statuses.md)).
3. Each card: athlete avatar + name + training name + date/time + price + Decline (destructive medium) + Accept (primary).
4. Accept → `POST /events/{id}/accept` → event becomes `planned`; card fades out; snackbar confirmation.
5. Decline → destructive confirmation (optional) → `POST /events/{id}/decline` → card fades; snackbar.
6. Empty state: illustration + "All caught up" + "New training requests from athletes will appear here."

### Flow 3: Add client — 3 paths

Tap `+` in Clients tab header → action sheet with 3 options:

#### Flow 3a: Create athlete profile (CRM)

1. Opens `s-create-client` form:
   - Avatar placeholder + initials
   - First name (required)
   - Last name (required)
   - Phone (optional)
   - Email (optional)
   - Sport (required — from closed 33-sport taxonomy)
   - Notes (optional, 0–500 chars)
2. Submit → `POST /coach/crm-clients` → new relationship created with `athlete_account_status: crm`, `relationship_state: active`.
3. Client appears in list with teal `CRM` pill.
4. Coach can now log sessions + mark paid for this client manually. No push / no message works (no app account).

#### Flow 3b: Invite to app

1. Opens native iOS share sheet directly — no intermediate screen.
2. Prefilled: "Join me on 321Fit: https://321.fit/invite/{coach_id}".
3. User taps through to SMS / Messenger / WhatsApp / etc. and sends.
4. When the recipient signs up via that link + matches phone/email, their account **auto-links** to this coach's CRM records (if any) — flow covered in deep-linking-referrals.md.

#### Flow 3c: Invite to training

1. Intermediate screen: select training template (from coach's existing sessions).
2. Select date/time (uses time picker).
3. Review + optional comment (300 char).
4. Submit → deep link generated with event pre-attached; athlete opens → signs up or logs in → event auto-created in `request` state; coach gets notification.

### Flow 4: Schedule training for existing client (coach-initiated)

1. On Client Detail → ⋯ menu → **Schedule training** (only shown for `active app-account` clients; hidden for CRM and Blocked).
2. Opens Invite-style flow in `schedule` mode (see `flows/coach/invite.html` — shared with Invite to training):
   - Select training template
   - Select date/time
   - Review with comment (300 char max; shown as note-block on athlete's Request sheet)
3. Send → `POST /coach/events` with `type: personal, status: awaiting` (coach-side) — athlete sees it as `request`.
4. Athlete accepts → event becomes `planned`.
5. After Send → return to Client Detail with snackbar "Request sent".

### Flow 5: Archive a client

1. Client Detail → ⋯ menu → **Archive client** (medium destructive — tinted red CTA in confirmation sheet).
2. Confirmation sheet:
   - Title: "Archive {athlete_name}?"
   - Body: "They'll move to your archived list. History stays intact. You can restore anytime."
   - Actions: Cancel (minimal) + Archive (medium destructive)
3. Confirm → `PATCH /coach/clients/{athlete_id}/relationship` with `{ state: "archived" }`.
4. Client disappears from active list; snackbar "{name} archived · Undo" (30s).
5. Athlete is **NOT notified** — archive is coach-side only.
6. Athlete can still book the coach; next booking request auto-transitions relationship back to `active`.

### Flow 6: Block an athlete

1. Client Detail → ⋯ menu → **Block athlete** (high destructive — filled red in confirmation).
2. Confirmation sheet:
   - Title: "Block {athlete_name}?"
   - Body: "They won't be able to find you in search or send booking requests. Upcoming sessions remain — cancel them manually if needed. They won't be notified."
   - Actions: Cancel (minimal) + Block (high destructive)
3. Confirm → `PATCH /coach/clients/{athlete_id}/relationship` with `{ state: "blocked" }`.
4. Relationship hidden from Active list; appears in Archived & Blocked screen (Blocked segment).
5. Athlete-side effect: coach disappears from their search results; direct booking attempts return `403 COACH_BLOCKED_USER` (without revealing blocking — generic "unable to book").
6. Existing `planned` events remain — coach expected to handle manually if unwilling to honor.

### Flow 7: Unblock

1. Navigate to Archived & Blocked screen (via row link at bottom of Clients list, only visible when ≥1 archived/blocked item exists).
2. Blocked segment → row with "Unblock" inline button → `PATCH` relationship → `{ state: "active" }`.
3. Athlete can book again immediately.

### Flow 8: Deleted athlete account

1. Athlete deletes their 321Fit account (see [authentication.md](./authentication.md)).
2. Backend sets `athlete.deleted_at = now`, emits event.
3. Coach-side consequences:
   - Client row: muted avatar + `Deleted` badge + text-tertiary name.
   - Client Detail: gray banner at top: "This account was deleted · {date}" — NO action button (unlike archived/blocked banners).
   - ⋯ menu: only `Archive client` available (other items hidden — no point messaging / scheduling / blocking a deleted account).
   - Stats and history preserved.
   - Mark Paid (on outstanding cash) still works for retroactive bookkeeping.

### Flow 9: CRM client upgrades to app

1. Coach created CRM client earlier (Flow 3a).
2. Coach invited them via Flow 3b.
3. Athlete signs up via the invite link. Backend matches phone/email (or token) → upgrades relationship's `athlete_account_status` from `crm` to `app`.
4. CRM pill disappears from client card; all previously hidden actions (Schedule training, Block, message) unlock.
5. Historical CRM-logged sessions and payments remain attributed to this client.

### Flow 10: Mark Paid (cash) from Client Detail

1. On Client Detail, in Outstanding Cash carousel: cards for each unpaid session, each with `€X owed`.
2. Tap `Mark paid` on a card → `POST /coach/payments/cash-paid` with event_id.
3. Optimistic fade; snackbar "Marked paid · Undo" (10s).

---

## 5. States

### Coach relationship state (per athlete)

| State | Semantics | Coach sees in... | Athlete sees... |
|---|---|---|---|
| `active` | Normal active client (has bookings or CRM contact) | Clients list (active) | Coach normally in search + can book |
| `archived` | Coach-side hidden; reversible; athlete unaware | Archived & Blocked → Archived tab | Coach remains findable, can still book (auto re-activates on new booking) |
| `blocked` | Silent shadow ban; cannot send requests | Archived & Blocked → Blocked tab | Coach disappears from search; booking attempts silently fail |
| `crm` | Coach-managed contact, no app account on athlete side (yet) | Clients list (with `CRM` pill) | (athlete doesn't exist in app) |

**Key:** `crm` is a relationship state set on coach-created contacts. When the underlying athlete account comes online, `athlete_account_status` flips `crm → app` but the relationship state stays `active` (unless coach archived/blocked).

### Athlete account status (separate dimension)

| Status | Trigger | Effect |
|---|---|---|
| `app` | Athlete has an active app account | Normal state |
| `crm` | No app account; coach created contact manually | Coach can log sessions + cash; no push/chat possible |
| `deleted` | Athlete deleted their account | Soft-delete; coach retains record; limited action menu |

Stackable: a relationship can be `(active, crm)`, `(active, deleted)`, `(archived, deleted)`, etc.

### UI menu scoping per combined state

Client Detail `⋯` menu visibility, per (relationship_state × account_status):

| | active · app | active · crm | active · deleted | archived · any | blocked · any |
|---|---|---|---|---|---|
| Schedule training | ✓ | — (no push target) | — | — | — |
| Edit info | ✓ | ✓ (coach owns card) | ✓ (coach owns notes) | ✓ | ✓ |
| Notes (private) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Training history | ✓ | ✓ | ✓ | ✓ | ✓ |
| Mark Paid (cash) | ✓ | ✓ | ✓ | ✓ | — |
| Invite to app | — | ✓ (primary CTA to upgrade) | — | — | — |
| Invite to training | ✓ | ✓ (deep-link signup path) | — | — | — |
| Archive client | ✓ | ✓ | ✓ | — (already archived) | — |
| Block athlete | ✓ | — (no app to block) | — | ✓ (already archived → can still block) | — (already blocked) |
| Unblock | — | — | — | — | ✓ |
| Restore (unarchive) | — | — | — | ✓ | — |

---

## 6. API

### New / changed endpoints

#### `POST /coach/crm-clients`

Create a coach-managed CRM contact.

**Body:**
```json
{
  "firstName":      "string",
  "lastName":       "string",
  "phone":          "+E164 string" | null,
  "email":          "string" | null,
  "sport":          "sport_id",
  "notes":          "string" | null
}
```

**Response 200:** new `CoachClientRelationship` with `athlete_account_status: crm`, `relationship_state: active`.

#### `PATCH /coach/clients/{athlete_id}/relationship`

Change relationship state.

**Body:**
```json
{ "state": "active" | "archived" | "blocked" }
```

**Validation:**
- `active → archived | blocked` allowed
- `archived → active | blocked` allowed
- `blocked → active` allowed (unblock)
- `crm` relationships cannot go to `blocked` directly (no app account) — PATCH returns 409.
- `deleted` athlete relationships can archive but NOT unblock/block.

**Response 200:** updated relationship record.

#### `POST /coach/events` (with schedule mode)

Extended for coach-initiated scheduling — see [coach-calendar.md](./coach-calendar.md) and [event-statuses.md](./event-statuses.md).

When coach initiates for an existing active-app client: `status: awaiting` (coach side) / `request` (athlete side).

**Body adds:**
```json
{
  ...,
  "coachComment": "string, 0-300 chars" | null   // shown to athlete as note-block on Request sheet
}
```

### Modified existing

- `GET /coach/clients` — returns relationship_state + athlete_account_status per row. Client filters based on user selection (active tab vs archived/blocked).
- `GET /athlete/coaches/search` — filters out coaches where current user is `blocked` by that coach.

---

## 7. Business rules

- **Archive is coach-side only.** Athlete never sees or hears about it.
- **Block is coach-side + athlete-side discovery filter.** Athlete-facing: coach disappears from search. Booking attempts return generic error (no reveal).
- **Block does NOT cancel existing events.** Coach handles manually.
- **CRM → app upgrade:** automatic on matched signup (phone / email / invite-token). Pre-existing CRM sessions and cash records attach to new app account; no data loss.
- **Deleted athlete:** coach retains historical records. Deletion cascades via GDPR right-to-be-forgotten path separately (see authentication.md) — not automated from deletion event alone.
- **CRM sessions are CASH only.** Since no app account → no Stripe. `POST /coach/events` enforces `paymentType: cash` for CRM relationships.
- **Single blocking relationship at a time** is fine (one coach blocks one athlete). Multiple coaches can independently block the same athlete.
- **Notes (private, coach-only)** persist across all state changes including deletion.
- **Relationship ownership:** only the coach side can modify relationship state. Athletes disconnect by deleting their coach from "My Coaches" on their side, which creates a separate record change (see athlete-schedule.md).

---

## 8. Edge cases

- **Coach deletes CRM client, then re-creates with same email:** new record, fresh relationship. Previous one soft-deleted.
- **Athlete signs up via coach A's invite but was already in coach B's CRM:** primary linkage is to coach A (the inviter). Coach B's CRM record is unlinked — stays as `crm` with no matched account. B gets no update.
- **Coach blocks an athlete who later deletes their account:** relationship becomes `(blocked, deleted)` — shown in Blocked tab with Deleted badge + muted avatar. Unblock still works but has no practical effect (athlete is gone).
- **Athlete-initiated disconnect (removes coach from My Coaches):** coach-side relationship state: stays `active`, but athlete-side flag `isDisconnected: true` flips. Coach's Client row shows no longer — but note: not yet specified. **Open question.**
- **Coach archives a CRM-only contact:** valid. Archived → Archived tab with both CRM + Archived markers.
- **CRM client has outstanding cash, coach blocks them:** not possible (block not allowed for CRM state).
- **Two coaches invite the same athlete simultaneously:** first match wins. Second invite becomes orphaned — leaves a stale CRM record for coach 2 that will never auto-link.

---

## 9. Platform notes

- **iOS:** relationship state drives conditional rendering of Client Detail menu items (SwiftUI `if` expressions). Uses `FitContextMenu` for ⋯ menu.
- **Android:** Compose conditional composition + Material 3 DropdownMenu.
- **Backend:** new DB table `coach_athlete_relationship` with columns `coach_id`, `athlete_id`, `relationship_state`, `athlete_account_status`, `created_at`, `updated_at`, plus audit log table for state changes. Migration from existing `user_exclusion` table + `coach.clients` linkage.
- **Voice:** `get_connected_athletes()` should filter by `relationship_state = active`. Adding arg `includeArchived: bool`.

---

## 10. Open questions

- [ ] **Athlete-initiated disconnect visibility:** if athlete removes coach from My Coaches, should coach be notified? Prototype silent; maybe a soft "{athlete} disconnected" notice? **Owner:** product.
- [ ] **Block notification to athlete:** currently silent. Ethically, blocking without explanation feels opaque. Some platforms (Slack, Instagram) keep silent, others (Gmail) notify. **Owner:** product + safety.
- [ ] **Bulk actions on archived list:** unarchive 10 clients at once. Defer until user feedback. **Owner:** product.
- [ ] **CRM → app match logic:** phone-primary, email-secondary, invite-token-exact? Conflict resolution (two CRM records with same phone)? **Owner:** product.
- [ ] **Deleted → hard-deleted (GDPR):** separate path, not automatic. Admin tool + retention policy spec. **Owner:** legal + ops.
- [ ] **Message feature for CRM clients:** currently hidden (no inbox exists). If/when Messenger launches, should CRM clients have an "invited via" or limited chat? **Owner:** product.

---

## Related specs / references

- [event-statuses.md](./event-statuses.md) — Schedule flow creates `awaiting` events per the 6-state system
- [coach-calendar.md](./coach-calendar.md) — Schedule flow reaches Review step through same Create Event flow
- [review-queue.md](./review-queue.md) — outstanding cash / reviews linked from Client Detail
- [payments.md](./payments.md) — Mark Paid on cash sessions; Stripe payouts gate on `relationship_state = active`
- [authentication.md](./authentication.md) — athlete account deletion flow (source of `deleted` status)
- [deep-linking-referrals.md](./deep-linking-referrals.md) — invite-to-app + invite-to-training deep links + CRM auto-link
- [athlete-schedule.md](./athlete-schedule.md) — athlete-side My Coaches (disconnect)
- Memory: `project_clients_crm` (full state matrix), `project_pending_spec_updates` items 4–7
- Prototype: `flows/coach/clients.html` with state-toggle annotations demonstrating active / archived / blocked / crm / deleted variants
- Components: FitBadge (CRM / Deleted / Archived), FitAvatar (muted for deleted/paid), FitButton, FitContextMenu, FitParticipant, FitSheet. See [design-tokens/docs/components.md](../../design-tokens/docs/components.md).
