# Clients & Coaches

> Status: Approved (contract) / In Progress (Archive/Block + CRM + Deleted migration)
> Prototype: [flows/coach/clients.html](https://321-fit.github.io/project-spec/prototypes/flows/coach/clients.html)
> Component library: [design-tokens/docs/components.md](../../design-tokens/docs/components.md)
> Last updated: 2026-04-30
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
7. **Avatar / row tap** → push Client Detail (`#s-client-detail`) for that athlete. **No separate "athlete profile" screen exists** — from the coach's perspective, athlete profile IS Client Detail. The same screen the Clients-list tap reaches; this inbox is just an additional entry point. The avatar in the Client Detail header itself is decorative (no tap — already on this athlete's profile).

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

### Flow 9: CRM client upgrades to app (Tier 1 Q6 — phone-primary auto-link + invite-token)

**Matching priority (deterministic):**
1. **Invite token** (exact match) — strongest signal: athlete arrived via `/invite/{coach_id}/{token}` link → directly attaches to that coach's CRM record (the one carrying the token, if any) plus the inviting coach's relationship.
2. **Phone E.164** (normalized exact match) — silent auto-link: backend scans all CRM records with `phone_e164 = athlete.phone_e164` after phone verification at signup → links to all matching coaches simultaneously. Each becomes an `active app-account` relationship.
3. **Email** (lowercase exact match) — fallback when no phone present in CRM record.

**Origin tagging:** every linked relationship records `origin: "invite" | "auto_phone_match" | "auto_email_match" | "manual"` for analytics and audit. Manual = coach added the relationship after the athlete already had an app account (rare path).

**Multi-coach same phone (intentional, not a conflict):** an athlete may be a real client of several coaches simultaneously. Phone-match links the athlete's app account to each coach's CRM record independently. Each coach sees their own notes/history attached; no cross-coach data leak.

**Steps (typical happy path):**
1. Coach created CRM client earlier (Flow 3a) with `phone: +491701234567`.
2. Coach invited them via Flow 3b (uses `/invite/{coach_id}` link — token included).
3. Athlete signs up via the invite link or directly. Phone is OTP-verified during signup.
4. Backend job runs on signup AND on phone-verification-change:
   - Token match (if any) → link to inviting coach's CRM record, mark `origin: invite`.
   - Phone match → link to all other coaches' CRM records with same phone, mark `origin: auto_phone_match`.
5. Each linked relationship's `athlete_account_status` flips `crm → app`. CRM pill disappears; previously hidden actions (Schedule training, Block, message) unlock for each coach.
6. Historical CRM-logged sessions and cash payments remain attributed to this client per coach.

**Edge case — phone changes after signup:** athlete updates their phone in profile → re-link is **not retroactive**. Existing relationships keep their origin tags. New CRM records with the new phone match only future signups.

**Edge case — coach edits CRM phone after match:** the link doesn't break. Phone is just a search/match field at that point; relationship is keyed on athlete_id once linked.

### Flow 10: Mark Paid (cash) from Client Detail

1. On Client Detail, in Outstanding Cash carousel: cards for each unpaid session, each with `€X owed`.
2. Tap `Mark paid` on a card → `POST /coach/payments/cash-paid` with event_id.
3. Optimistic fade; snackbar "Marked paid · Undo" (10s).

### Flow 11: Athlete-initiated disconnect (Tier 1 Q7 — silent for ALL athlete-side actions)

Athletes can pause or block a coach from their side. Per Q7 decision: **all athlete-side actions are silent to the coach** — no push, no inbox entry, no reason-picker. Goal: minimize signal noise for coaches with many athletes; align with industry consumer-pattern (Bumble/LinkedIn/Mindbody silent unmatch).

**Athlete-side actions:**
- **Pause** (soft archive) — athlete taps "Stop training with {coach}" on coach detail → relationship sets `paused_by_athlete: true`. Coach can still appear in athlete search; future bookings reactivate the relationship implicitly. No reason required.
- **Block** — athlete taps "Block {coach}" on coach detail → relationship sets `blocked_by_athlete: true`. Coach disappears from athlete's discovery permanently; un-block via Settings only. **Same silent treatment as pause** — no notification to coach, no reason picker. Hard archive; future events auto-cancel with athlete-issued cancellation per [payments.md](./payments.md) refund policy.

**Coach-side surfacing (silent):**
- Athletes who paused appear in `Inactive Clients` mini-section / filter inside Clients tab, with subtle "No activity since {date}" tag. NO mention of "athlete archived/disconnected you" — avoid creating a public rejection signal for the coach.
- Blocked-by-athlete athletes vanish from coach's active list; they appear in a separate `Disconnected` row at the bottom of Archived & Blocked screen (NOT mixed with coach-blocked athletes — different semantics). This row is purely for record retention; no actions other than viewing history.

**V1 MVP scope (decided 2026-04-30):** the **data model lands** in V1 (`paused_by_athlete` and `blocked_by_athlete` booleans on the relationship — needed for athlete-side discovery filter), but the **coach-side surfaces are deferred to V2**:
- iOS / Android V1 receive the boolean fields in the API response but render NO surface.
- `blocked_by_athlete: true` clients are filtered server-side from the active list (athlete fully invisible to coach).
- `paused_by_athlete: true` clients show in the active list with no visual difference (no "Inactive Clients" mini-section in V1, no "No activity since X" tag).
- The dedicated "Disconnected" row at the bottom of Archived & Blocked is **not rendered in V1**.

V2 follow-up tracks both surfaces as a separate ticket once the prototype gains the section design.

**Re-engagement:** If athlete pauses then later books again → relationship reactivates implicitly (no friction, no coach prompt). Block is harder reversal — only via athlete's Settings unblock action.

**Why no notification at all (even on block):** A coach with 50 athletes doesn't benefit from "Tom blocked you" — it's noise + unclear actionability. If actual safety concern (harassment by coach), athlete reports via Support, which routes to admin (separate, intentional path).

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
| Edit info | ✓ (App mode) | ✓ (CRM mode) | ✓ (App mode) | ✓ | ✓ |
| Notes (private) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Training history | ✓ | ✓ | ✓ | ✓ | ✓ |
| Mark Paid (cash) | ✓ | ✓ | ✓ | ✓ | — |
| Invite to app | — | ✓ (primary CTA to upgrade) | — | — | — |
| Invite to training | ✓ | ✓ (deep-link signup path) | — | — | — |
| Archive client | ✓ | ✓ | ✓ | — (already archived) | — |
| Block athlete | ✓ | — (no app to block) | — | ✓ (already archived → can still block) | — (already blocked) |
| Unblock | — | — | — | — | ✓ |
| Restore (unarchive) | — | — | — | ✓ | — |

### Edit info — two modes (single screen, mode auto-derived from `athlete_account_status`)

Edit info opens one screen with two modes — **same form scaffolding** (avatar + input rows + push-screen sub-selectors), but field set differs by `athlete_account_status` because the coach owns CRM contacts entirely while app-account athletes own their own identity.

| Mode trigger | Editable fields | Endpoint |
|---|---|---|
| `athlete_account_status = crm` (**CRM mode**) — coach owns the contact card | First name · Last name · Phone · Email · Sport · Notes · optional Avatar (full Create-Client form) | `PATCH /coach/crm-clients/{id}` |
| `athlete_account_status ∈ {app, deleted}` (**App mode**) — coach does NOT edit athlete identity | Read-only identity card on top (avatar + name + sport chips, footnote "Managed by athlete · contact athlete to update"). Editable: **Sport-of-coaching** (which sport coach trains them in — different from athlete's own sport list) + **Notes** (coach-private). | `PATCH /coach/clients/{id}/update-profile` (narrowed payload — no identity fields) |

**Why two modes, not two separate screens:** dirty-tracking + validation + save state machinery is identical; only the visible field set differs. Same code path, different `Mode` enum case.

**Why not reuse the dedicated Personal Data screen:** Personal Data is the user's own identity edit; Edit Client is coach-side metadata about ANOTHER user. Different endpoints, different field semantics, different visibility. Reuses the same FitInput / FitSelectionGroup / push-screen text editor components, but stays scoped to coach's editing rights.

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

**Response 200:** new `CoachClientRelationship` with `athlete_account_status: crm`, `relationship_state: active`, `origin: "manual"`.

**Relationship model fields (Q6 + Q7 additions):**
```typescript
type CoachAthleteRelationship = {
  coachId:               UUID,
  athleteId:             UUID | null,        // null while athlete is CRM-only
  relationshipState:     "active" | "archived" | "blocked",  // coach-driven
  athleteAccountStatus:  "app" | "crm" | "deleted",
  origin:                "invite" | "auto_phone_match" | "auto_email_match" | "manual",
  pausedByAthlete:       boolean,            // Q7 silent pause
  blockedByAthlete:      boolean,            // Q7 silent block
  pausedAt:              ISO8601 | null,
  blockedByAthleteAt:    ISO8601 | null,
  // ... existing fields (notes, createdAt, updatedAt)
}
```

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
- **CRM → app upgrade (Tier 1 Q6):** automatic on matched signup. Match priority: invite-token (exact) > phone E.164 (exact) > email (lowercase exact). Multi-coach same-phone → links to all coaches simultaneously (not a conflict — each coach gets their own relationship with the same athlete). Origin tagged on relationship: `invite | auto_phone_match | auto_email_match | manual`. Pre-existing CRM sessions + cash records attach to new app account; no data loss.
- **Athlete-initiated disconnect (Tier 1 Q7):** all silent. Coach receives NO push, NO inbox entry, NO reason. Pause shows as "Inactive Clients" with last-activity tag; Block shows as separate "Disconnected" row in Archived & Blocked screen (record-only, no actions). Future booking reactivates pause; block requires athlete-side unblock from Settings.
- **Deleted athlete:** coach retains historical records. Deletion cascades via GDPR right-to-be-forgotten path separately (see authentication.md) — not automated from deletion event alone.
- **CRM sessions are CASH only.** Since no app account → no Stripe. `POST /coach/events` enforces `paymentType: cash` for CRM relationships.
- **Single blocking relationship at a time** is fine (one coach blocks one athlete). Multiple coaches can independently block the same athlete.
- **Notes (private, coach-only)** persist across all state changes including deletion.
- **Relationship ownership:** only the coach side can modify relationship state. Athletes disconnect by deleting their coach from "My Coaches" on their side, which creates a separate record change (see athlete-schedule.md).

---

## 8. Edge cases

- **Coach deletes CRM client, then re-creates with same email:** new record, fresh relationship. Previous one soft-deleted.
- **Athlete signs up via coach A's invite but was already in coach B's CRM (per Q6 multi-coach phone match):** athlete links to BOTH coaches simultaneously. Coach A gets `origin: invite`; Coach B gets `origin: auto_phone_match` (assuming phone match found). Both relationships are valid — athlete is a real client of both. Coach B sees their CRM card upgrade silently to active app account. This replaces the prior "first match wins" rule.
- **Coach blocks an athlete who later deletes their account:** relationship becomes `(blocked, deleted)` — shown in Blocked tab with Deleted badge + muted avatar. Unblock still works but has no practical effect (athlete is gone).
- **Athlete-initiated disconnect (Q7 RESOLVED):** silent for coach. `paused_by_athlete` (soft) → athlete in coach's "Inactive Clients" mini-section. `blocked_by_athlete` (hard) → athlete in "Disconnected" row of Archived & Blocked screen (read-only). No coach notification at any tier.
- **Coach archives a CRM-only contact:** valid. Archived → Archived tab with both CRM + Archived markers.
- **CRM client has outstanding cash, coach blocks them:** not possible (block not allowed for CRM state).
- **Two coaches invite the same athlete simultaneously (revised per Q6):** athlete signs up → both invite tokens may match if delivered through different channels. Whichever invite link the athlete actually opens captures `origin: invite`; the other coach's CRM record links via phone-match with `origin: auto_phone_match` (or stays orphan-CRM if no phone overlap).

---

## 9. Platform notes

**Native UI conventions:** see [architecture/design-system.md § Native theming contract](../architecture/design-system.md#native-theming-contract). Don't duplicate cross-platform UI rules here — only platform-specific deviations below.

- **iOS:** relationship state drives conditional rendering of Client Detail menu items (SwiftUI `if` expressions). Uses `FitContextMenu` for ⋯ menu.
- **Android:** Compose conditional composition + Material 3 DropdownMenu.
- **Backend:** new DB table `coach_athlete_relationship` with columns `coach_id`, `athlete_id`, `relationship_state`, `athlete_account_status`, `created_at`, `updated_at`, plus audit log table for state changes. Migration from existing `user_exclusion` table + `coach.clients` linkage.
- **Voice:** `get_connected_athletes()` should filter by `relationship_state = active`. Adding arg `includeArchived: bool`.

### Component contract (cross-platform)

Both iOS and Android consume the same FitUI component set from [`design-tokens`](../../design-tokens/docs/components.md). Notable choices for this module:

- **`FitSegmented`** — the Archived / Blocked tabs on `#s-archived` use `FitSegmented` (iOS-style segmented control, slid-pill in a well, `count:` callback for the `(N)` suffix). Distinct from `FitSelectionGroup` (form-input chip group with selection border). Component landed in design-tokens 2026-04-30; spec at [components.md § FitSegmented](../../design-tokens/docs/components.md#fitsegmented).
- **`FitContextMenu`** (iOS) / Material 3 `DropdownMenu` (Android) — for the ⋯ menu on Client Detail.
- **`FitBadge`** — `CRM` (teal/`.success`), `Deleted` (gray/`.neutral`), `€X owed` (red/`.danger`), `Archived {date}` (subtitle on archived list rows).
- **Edit Client form** — reuses `FitInput`, `FitSelectionGroup`, push-screen text editor + sport selector. Two modes per the table in §5 above; **single screen, single ViewModel** (mode parameter), not a fork into two separate screens.
- **Avatar tap target** — Requests inbox cards' avatar/row tap pushes Client Detail. Coach-side "athlete profile" IS Client Detail; no separate athlete-profile screen exists. Avatar in Client Detail header is decorative.

---

## 10. Open questions

- [x] ~~**Athlete-initiated disconnect visibility:**~~ RESOLVED in Tier 1 Q7: silent for ALL athlete-side actions (pause + block). No coach notification. Surfaces in coach UI as quiet "Inactive Clients" / "Disconnected" record rows.
- [x] ~~**Block notification to athlete (coach blocks):**~~ RESOLVED — coach-side block also stays silent on athlete side per existing spec (matches Q7 symmetry).
- [x] ~~**CRM → app match logic:**~~ RESOLVED in Tier 1 Q6: invite-token > phone E.164 > email (priority order). Multi-coach same-phone links to all coaches simultaneously (intended, not a conflict). Origin enum tagged on every link.
- [x] ~~**Avatar tap target on Requests / Client Detail header:**~~ RESOLVED 2026-04-30: avatar/row tap on Requests inbox card pushes Client Detail (same screen as Clients-list tap). Coach-side "athlete profile" IS Client Detail — no separate screen. Client Detail header avatar is decorative (no tap). Documented in Flow 2 + §9 component contract.
- [x] ~~**Edit info form scope:**~~ RESOLVED 2026-04-30: single screen with two modes auto-derived from `athlete_account_status` — CRM mode = full Create-Client field set (`PATCH /coach/crm-clients/{id}`); App mode (covers `app` + `deleted`) = read-only identity card + editable Sport-of-coaching + Notes (`PATCH /coach/clients/{id}/update-profile`). Reuses Personal Data form components but stays scoped to coach-editable fields. Documented in §5 menu scoping subsection.
- [x] ~~**Q7 silent-disconnect surfaces ("Inactive Clients" + "Disconnected" rows):**~~ RESOLVED 2026-04-30: deferred to V2 of Clients module. Data fields (`paused_by_athlete`, `blocked_by_athlete`) land in V1 backend (needed for athlete-side filter), but iOS / Android V1 render no surface. Documented in Flow 11 V1 MVP scope note.
- [x] ~~**Segmented control component:**~~ RESOLVED 2026-04-30: `FitSegmented` landed in design-tokens (commit `895aa16`) as a distinct component from `FitSelectionGroup`. Use for tab switcher / view filter UX (Archived / Blocked tabs). Documented in §9 component contract.
- [ ] **Bulk actions on archived list:** unarchive 10 clients at once. Defer until user feedback. **Owner:** product.
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
