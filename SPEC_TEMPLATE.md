# <Module Name>

> Status: Draft | Approved | In Progress | Implemented | Deprecated
> Prototype: [flows/coach/<file>.html](../prototypes/flows/coach/<file>.html)
> Component library: [design-tokens/docs/components.md](../../design-tokens/docs/components.md)
> Last updated: YYYY-MM-DD
> Implementation:
> - iOS:     [321fit_ios/docs/<module>-ios.md]
> - Backend: [poly-backend/docs/<module>-backend.md]
> - Voice:   [voice_control/docs/<module>-voice.md] (if applicable)
> - Android: [321fit_android/docs/<module>-android.md] (when available)

---

## 1. Overview

One paragraph: what this module does and why it exists. Target audience: someone
reading for the first time. Avoid jargon; state the user outcome.

---

## 2. User Stories

Group by role. One or two-sentence intent statements — no AC under each story.

### Coach

- As a coach, I want to **…** so that **…**
- …

### Athlete

- As an athlete, I want to **…** so that **…**
- …

### Voice (if applicable)

- As a user talking to the voice assistant, I want to **…** so that **…**

Skip entire subsection if role has no stories. Skip the whole section only for
pure infrastructure specs.

---

## 3. System Stories

Invariants and non-obvious behavior the implementation must guarantee. Especially
valuable for cross-team contracts. Skip if redundant with user stories + flows.

- As the iOS client, I must **…** so that **…**
- As the backend, I must **…** so that **…** (e.g., "POST must return <1s — fetch
  calendars async")
- As the voice layer, I must **…**

---

## 4. Flows

Step-by-step user journey with screens and state transitions. Reference prototype
screens by ID (e.g., `#s-dashboard`) and components by name (`FitButton`,
`FitSheet`) from `design-tokens/docs/components.md`.

### Flow A: <name>

1. User opens `#s-dashboard` → taps Next Session card (`FitButton` primary)
2. `FitSheet` opens with `data-event-state="planned"` — shows athlete + time +
   price
3. User taps **Message** (IconBtn) → pushes chat screen (out of scope, linked)
4. …

### Flow B: <name>

…

---

## 5. States

Every distinct visual or logical state the module can be in, with transitions.
Use a table.

| State | When shown | What the user sees | Transition out |
|---|---|---|---|
| `default` | User has sessions + pending actions | Full dashboard | → any tap |
| `new` | Week-1 coach, setup incomplete | Tier-1 wizard | `under-review` on wizard complete |
| `under-review` | Wizard done, awaiting approval | Banner + optional boosts | `ready` on approval |
| … | | | |

Reference a state-machine diagram if complex.

---

## 6. API

Endpoints, request/response models, auth requirements. **Contract-level only** —
no code snippets, no file paths. Those go in impl-docs.

### Endpoints

#### `GET /coach/dashboard`

Returns current coach's dashboard snapshot.

**Auth:** JWT required.

**Response 200:**
```json
{
  "nextEvent":         EventModel | null,
  "pendingRequests":   { "count": Int },
  "cashToCollect":     { "count": Int, "total": Decimal, "currency": "EUR" } | null,
  "sessionsToReview":  { "count": Int } | null,
  "todaySummary":      { "sessionCount": Int, "totalValue": Decimal } | null,
  "weekEarnings":      { "earned": Decimal, "plannedAdditional": Decimal, "bookedCount": Int,
                         "cardTotal": Decimal, "cashTotal": Decimal, "cashClientCount": Int,
                         "trendVsLastWeek": Decimal } | null,
  "signals":           [{ "type": "review" | "new_clients", "data": {…} }] | null
}
```

**Response 401:** auth expired.
**Response 500:** server error.

#### `POST /coach/events/{id}/review`

Marks session as complete or missed.

**Body:**
```json
{ "outcome": "complete" | "missed" }
```

**Response 200:** updated EventModel.

### Models

#### `EventModel`

| Field | Type | Description |
|---|---|---|
| `id` | UUID | |
| `status` | enum | planned / request / awaiting / review / missed / finished |
| `athleteId` | UUID | |
| … | | |

---

## 7. Business rules

Validation, permissions, side effects, retention policy — everything the
implementation must enforce but that's not visible in the flows.

- Rule 1: <what + why>
- Rule 2: …

---

## 8. Edge cases

Platform-agnostic edge cases. Network loss, concurrency, permission changes,
data-race, null handling.

- If coach is offline when tapping card → show cached snapshot + retry
- If two devices review the same session simultaneously → server resolves
  last-write-wins, both clients reconcile via push notification
- …

---

## 9. Platform notes

High-level differences only. One or two sentences per platform. Detailed
implementation lives in impl-docs.

- **iOS:** use native `.contextMenu` for ⋯ actions; haptic on action tap
- **Android:** use Material 3 `DropdownMenu`; ripple feedback on Material surfaces
- **Backend:** dashboard snapshot should be composed in ≤ 400ms P95
- **Voice:** `get_dashboard()` function tool returns same shape as REST response

---

## 10. Open questions

Unresolved design decisions. Flag each with owner + deadline if known.

- [ ] Should we cache weekEarnings server-side? → pending product input
- [ ] Push notification copy on signal events → TBD with marketing

Remove this section (or mark as empty) when all questions are resolved.

---

## Appendix: Template notes (delete before merging a real spec)

- Keep each section tight — a new dev reading this should be oriented in < 5 min
- Link aggressively — prototype screens, component docs, memory files, related specs
- No code (Swift/Kotlin/Python) in specs — goes in impl-docs
- Update `Last updated:` every time you touch this file
