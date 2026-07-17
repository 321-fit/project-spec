# Spec ↔ Implementation Audit — Backend + iOS

> Date: 2026-07-17 · Auditor: automated multi-agent pass (10 backend clusters + 5 iOS clusters)
> Backend tree: **poly-backend `origin/main` @ `fd39b3bb`** (2026-07-16) · iOS: **321fit_ios `main` @ `64b30095`** (2026-07-16, current) · Specs: project-spec `main`
> Scope: reconcile what's SHIPPED (code + backend docs + iOS code) against product INTENT (project-spec specs). Session Packages excluded (intentionally unbuilt everywhere).

## ⚠️ Method note — a first pass was invalidated
An initial backend audit ran against the checked-out branch `feature/phase4-coach-rework` (2026-07-02), which is **1241 commits / 2 weeks behind main**. It reported ~15 CRITICAL "not built" findings (CRM, reviews, maturity, Mux, earnings, Stripe Custom, self-paced, hold machine) that **all exist on main**. This report is the re-run against `origin/main` and supersedes it. Lesson: audit `origin/main`, never a stale feature branch.

---

## 1. Headline

**On `main`, the backend is largely correct and ahead; the drift is concentrated in (a) our specs lagging shipped reality, (b) backend impl-docs lagging their own code, and (c) iOS lagging the backend.** Very few findings are "backend is wrong." The dominant failure mode is **documentation rot**, not broken code.

Tag totals (deduped): **~48 SPEC-FIX** (we edit project-spec) · **~22 BACKEND issues** · **~30 iOS issues** · **~24 backend DOC-FIX** (impl-docs).

### Cross-cutting themes
1. **WebSockets WERE built — for messaging (DM) in v1.** `messages/ws.py` + `websockets>=16.0` + `messaging-api.md §Realtime`. Our `messages.md` still says "no sockets, v1 = poll, WS = Phase 2." → SPEC-FIX. (Dashboard correctly uses NO websocket — poll only.)
2. **iOS has ZERO DM client** — the entire shipped messaging backend (WS, groups, push, idempotency) is unconsumed. Largest single iOS gap.
3. **"phone is contact-only, not a login method" (decided 2026-05-11) is unimplemented on BOTH backend and iOS.** Specs assert it's done. → product decision: implement (BE+iOS) or reverse (spec).
4. **`phone_verified` mandatory-gate (decided 2026-05-19) has no backend flag and is skippable on iOS.** → product decision: build gate or downgrade spec.
5. **Spec pointers rot:** 5 specs still say `(to be created)` / wrong filename for backend docs that now exist (athlete-search, reviews, coach-profile→coach-profile-2.0, personal-data→me-api, payments→4 docs). Backend API docs systematically lack `Spec:` back-refs.
6. **Money model is more shipped than specs admit:** multi-currency (display 4 / pricing 27) live; 24h hold exists but is a *ledger* window (transfer to Stripe is immediate at session end); Stripe **Custom** is primary. But core balance/transaction endpoints still emit **float**, not MoneyDTO int-minor.
7. **Notification catalog is stale:** backend enum = **40** categories (spec says 19, catalog says 29/19 and self-contradicts); reminder is a single `training_soon`, not `session_reminder_1h/10min`.
8. **Several specs describe models that were never built the way written:** locations `type`-discriminator (backend uses booleans), event-statuses unified 6-state enum (backend = `EventStatus`+`ApprovalStatus` dual field), group-training "decoupled scheduling" (backend keeps schedule on the template).

---

## 2. PRODUCT DECISIONS NEEDED (forks — can't resolve without you)
| # | Question | If A | If B |
|---|---|---|---|
| P1 | **Who can DM whom?** Backend allows any-user→any-user (block-aware); spec `messages.md` requires "connected athlete↔coach only." | Gate on backend (BACKEND issue) + ship `/recipients` | Open messaging → SPEC-FIX messages.md, drop the gate ask |
| P2 | **Phone as login method?** Neither side implemented the 2026-05-11 "contact-only" decision. | Implement: BE drops phone from login-methods + iOS removes phone segments | Reverse decision → SPEC-FIX authentication.md/account-access.md |
| P3 | **Mandatory phone verification?** No `phone_verified` flag; iOS lets you Skip. | Build gate: BE column + entry-block, iOS removes Skip | Downgrade spec to client-side/optional |
| P4 | **DISPLAY currencies 4 or 27?** Backend ships 4 (EUR/USD/GBP/AED); memory wanted 27. | Ask BE to widen 4→27 | Keep 4 → SPEC-FIX multi-currency note |
| P5 | **Per-category review ratings + histogram** (Technique/Communication/…) — unbuilt. | BACKEND issue: add columns + `/reviews/summary` | Descope to v2 → SPEC-FIX coach-profile.md |
| P6 | **Self-paced calendar event** — spec says "1h athlete calendar event"; backend is list-only (no training_event). | BACKEND issue: generate calendar event | SPEC-FIX self-paced.md to list-based |

---

## 3. Master list A — SPEC-FIX (we edit project-spec; backend/iOS is the correct side)
Grouped by file. These are stale specs to bring in line with shipped reality.

**Cross-ref pointers (cross-cutting agent):**
- `athlete-search.md:10` — drop "(to be created)", link real `athlete-search-api.md`.
- `reviews.md:10` — link real `reviews-api.md`.
- `coach-profile.md:9,132` — repoint to `coach-profile-2.0.md`.
- `personal-data.md:10,188` — repoint to `me-api.md`.
- `payments.md:10` — replace `payments-backend.md (to be created)` with the 4 real docs (coach-earnings-api, athlete-balance-flow, balance-v2-api, coach-transactions-api).
- `athlete-dashboard.md:10,144` — repoint to real `athlete-dashboard.md` doc.
- `clients-coaches.md:9` — delink "(to be created)".
- `location-picker.md:9` — repoint to `coach-locations-api.md`.
- `messages.md` header — add a Backend pointer to `messaging-api.md`.

**messages.md** — delivery-model rewrite: WS delivers in v1 (message.created + read-receipts + group-sync); only typing/presence remain Phase 2. Fix field names (`participantUserIds`), add clientMessageId/clientRequestId idempotency, group cap 50, rate limits, PATCH-based mute/rename, add conversation-details + missing endpoints. (P1 resolves eligibility + `/recipients`/`/unread-count`.)

**payments.md** — currency stance → "display 4, pricing 27, EUR-stored + on-the-fly conversion, shipped"; §6 endpoint names `/coach/earnings*` → `/coach/transactions/*`; 24h-hold description → transfer immediate at session end, 24h = ledger pending→available; close §10 payment-type open Q (`both` shipped).

**notifications.md / notifications-catalog.md** — category count → 40; add ~18 shipped categories (group/messaging/self-paced) or scope-defer with pointers; fix catalog's own 29-vs-19 contradiction; reminder = `training_soon` (not 1h/10min split); fix `referral_`→`referred_` naming.

**dashboard.md / athlete-dashboard.md** — athlete dashboard is per-block, not single-bundle (fix §3/§6/§9); document `warnings[]` field + reclassify `stripe_required` as non-blocking warning (§11); fix athlete notification/rate paths; purge removed Recommended-carousel leftovers; athlete wizard 2 steps not 4; close §10 refresh (poll, no WS).

**self-paced.md** — self-paced = standalone `self_paced_booking` table, no `training_event`/`delivery` discriminator; note cash payment allowed; (P6 resolves calendar-event).

**group-training.md** — rewrite scheduling to shipped template-carries-schedule + `confirm-conflicts` model; drop the decoupled `/schedule/preview` model (session-creation.md already correct).

**group-event-detail.md** — paths `/coach/events/{id}` → `/coach/training-events/{id}`; participant id uuid → int.

**event-statuses.md** — reconcile 6-state to shipped `EventStatus`(4) + `ApprovalStatus` dual-field (or track enum migration as BE work; spec self-flagged in-progress).

**location-picker.md** — model → boolean flags (`is_online`/`is_home_visit`) not `type` enum; provider values `zoom/google_meet/teams/custom`, fields `platform`/`meeting_link`; DELETE returns 200 not 204.

**session-creation.md** — PATCH shape flat (not nested `{fields,scope}`); payment default = card (not cash); add `recurringEndDate` + `confirm-conflicts` flow; close §10 (multi-payment `both` shipped).

**booking-flow.md** — §7 endpoint names → shipped (`/athlete/training-events`, `/available-booking-slots`, `/group-trainings`, coach `/training-events` + `/share-link`).

**authentication.md / account-access.md** — remove stale "fully implemented / not implemented yet" claims (both wrong); (P2/P3 resolve phone-as-login + verification-gate); child-session tokens are full-credential (or BE hardening); mark JWT role-agnostic → **close role-switch §7**; drop role-switch `has_*_profile` ADDITIVE ask (iOS derives from settings presence).

**coach-profile.md / coach-maturity-model.md** — repoint self-profile to `/user/me`, drop `/coach/me/stats`; (P5 resolves category ratings); maturityProgress countdown unbuilt (descope or BE); align sport section/label strings to seed; note maturity caching/boost/carousel unbuilt.

**clients-coaches.md** — §337 note now stale (geo done, email-input removed; only lastName-required remains); document `booking` origin value; note sport optional for CRM; resolve §5-vs-Flow7 Mark-Paid-in-blocked contradiction.

**sport-picker.md** — align section/sport label strings to the shipped seed (33 sports, moderation columns exist).

---

## 4. Master list B — BACKEND issues (code must change)
1. **[P1] Messaging eligibility** — decide + (if gated) enforce connected-only + ship `/messages/recipients?q=` + `/messages/unread-count`. (med)
2. **[P2] Phone as login method** — remove phone from `/me/login-methods` methods[] + retire `/me/login-methods/phone/*` as a login credential (or reverse). (high)
3. **[P3] `phone_verified` gate** — add column + entry-block (or drop). (high)
4. **Clients: deleted-in-blocked** — filter `athlete_account_status=deleted` out of Active, union into Blocked-tab query without setting relationship_state=blocked. (high)
5. **Clients: bulk CRM import** — `POST /coach/crm-clients/bulk` → `{created,linked,skipped}`, origin `import`, server dedup. (high)
6. **Clients: CRM contract** — `last_name` nullable; add `IMPORT` origin enum; (email already dropped, geo already added). (med)
7. **Money: MoneyDTO migration** — core balance/transactions/auto-topup endpoints emit float; migrate to `{amount:int minor,currency}` per standard (or formally exempt). (med)
8. **Money: `/coach/earnings/pending`** — per-session pending breakdown has no endpoint (s-pending). Build or repoint to filtered transactions. (high)
9. **[P4] Multi-currency DISPLAY 4→27** — widen `DISPLAY_CURRENCIES` if product wants 27. (med)
10. **Stripe control-center contract** — iOS calls `account-status/`, `payout*/`, `consent/`, `external-account/{id}` PATCH/DELETE, `identity-session/`, `DELETE account/` — not in shipped docs. Confirm/ship + document. (high)
11. **`/coach/transactions/summary` shape** — verify it returns the rich fields iOS decodes as non-optional (cashOwed, payoutSchedule, defaultProvider…) or iOS decode throws. (high)
12. **Notifications: `cash_overdue` producer** — clearance+routing exist, no beat task creates it; also routing role bug (athlete→should be coach). (med)
13. **Reminder/payment/review categories** — `card_payment_cleared`/`payout_sent`/`new_review`/`crm_contact_joined` in catalog, no enum/producer. Confirm unshipped-vs-undocumented. (med)
14. **Locations: delete-guard** — 409 `TEMPLATE_DEPENDENCY` when a location is used by a template (currently orphans sessions). (high)
15. **Locations: default-promotion on delete** + **meeting-URL validation** (HTTPS/domain) + **rule enforcement** (online/home-visit can't be default; in-person immutable). (med)
16. **[P6] Self-paced calendar event** — generate a training_event, or confirm list-only. (med)
17. **Group: athlete post-training rating submit endpoint** — `group_event_ended_athlete` push has no submission target. (med)
18. **role-switch: `PATCH /user/active-role`** — instant role switch has no persistence endpoint; existing-profile switches never reach server. (med)
19. **[P5] Coach review categories + `/coach/me/reviews/summary` + histogram** — unbuilt. (med)
20. **maturityProgress `{reviewsNeeded,sessionsNeeded}`** + caching + `newCoachBoost` + "New on 321Fit" carousel — unbuilt. (low)
21. **Legacy Stripe Express** — root `create_express_account` still live alongside Custom; remove/mark legacy. (low)
22. **Calendar backend doc** — calendars router live but no `docs/` doc exists. (low)

## 5. Master list C — iOS issues (code must change)
**Large epics:**
1. **DM messaging module — build from scratch** (CRITICAL). Backend fully shipped, iOS has nothing: conversations model + service, messages-list, thread (1:1+group), participants/rename/settings, new-message + recipients picker, DM unread badge + Dashboard header icon. v1 = REST poll-on-open per spec (WS Phase 2). Handle `new_message`/`new_group_message` push + tap-route.
2. **Notifications inbox fixes** (CRITICAL cluster): rows not tappable (wire tap→route via decoded trainingEventId/athleteId + mark-read); stop using deprecated `mark-informational-read`; **stop mark-all-read on every app-open** (breaks clearance/unread); add read/unread visual state; calendar-sync push routing + payload decode; device registration add `deviceId`/`name`; **DELETE /devices on logout**; pagination; map `referred_athlete_joined`; drop dead `calendar_sync_issue`.

**Clients/Coaches:**
3. Bulk contact import + mass invite flow (stubbed today). (high)
4. Archive/Block: add confirm sheet + "€X owed" warning + Undo snackbar (currently fires immediately from menu). (high)
5. Wire CRM create/edit to `POST/PATCH /coach/crm-clients` (built but dead; currently reuses legacy PersonalData screen). (high)
6. Menu-scope fixes (CRM canBlock=true always-409s; app-client canEditInfo=false blocks sport-of-coaching edit); deleted rows show Unblock (should be terminal); cashOwed badge missing on archived/blocked rows; sport-of-coaching editor. (med)

**Money:**
7. [P4] Multi-currency display-currency selector + `/exchange-rates` consumption (entirely unbuilt). (high)
8. Coach cash Mark-paid/Waive → wire `POST /coach/transactions/{id}/mark-paid` (local-only today). (high)
9. Auto-topup failure decode: make amount/currency optional (real failure throws today). (med)
10. AED currency symbol; coach pending-breakdown screen; lifetime per-method split (hardcoded 0); top-up send currency; delete dead StripeOnboarding stack. (med/low)

**Dashboard:**
11. Wire athlete `recently-viewed-coaches` + `activity-stats` (UI exists, endpoints not called). (med)
12. Reconcile `warnings[]` (real backend field — keep + document, not dead). (low)

**Auth/identity:**
13. [P2] Remove phone segments from sign-in/sign-up/forgot-password (or reverse decision). (high)
14. [P3] Remove Skip on signup phone step (or downgrade spec). (high)
15. Role switch: seed `activeRoleStore` from `get_me.active_role` on login + persist instant switch (needs BE #18). (med)
16. Athlete custom sports: pass `isCustomSportsAvailable:false` for athlete pickers. (med)
17. Phone under "Sign-in methods" in Account Access → Contact section (ties P2). (med)
18. `emailOrProne` typo. (trivial)

## 6. Master list D — backend impl-doc DOC-FIX (poly-backend docs)
- `coach-profile-2.0.md` — legacy `/api/v1/athletes/` → `/api/v1.0.0/athlete/` (5 paths). (high)
- `notifications-api.md` — Enums table lists 13/40 + typo `referral_`→`referred_`; fix `count_unread_push` semantics line (`status==SENT`); clearance table targets phantom reminder categories. 
- `dashboard-api.md` (spec-canonical, stalest coach doc) — paymentReport "real not null"; add sessions-chart, `warnings[]`, `tier2Tip.subtitle`.
- `coach-dashboard-api.md` vs `dashboard-api.md` — two coach docs disagree; merge/redirect to one canonical.
- `athlete-balance-flow.md` — `thisMonth` → `monthlySummary`+`analytics`.
- `coach-earnings-api.md` — phantom `/coach/earnings*` paths → `/coach/transactions/*`; "24h Stripe hold" wording (funds already transferred).
- `clients-coaches-api.md` (dated 05-22) — drop email, mark sportId optional, add geo fields, add `booking` origin, deleted-in-blocked.
- `self_paced_booking.py` docstring — steps are a `workout_step` table, not JSONB.
- Add `Spec:` back-refs to: self-paced-api, reviews-api, coach-profile-2.0, messaging-api, coach-transactions-api, balance-v2-api, athlete-balance-flow, coach-detail-api, my-coaches-api, coach-dashboard-api, phone-otp-api.
- `DOCUMENTATION.md` — refresh date / add per-module docs index.
- `coach-locations-api.md` — wrong search path (`/athlete/search?format=` → `/athlete/coaches`).
- iOS impl-docs (in 321fit_ios/docs) are separately stale: `dashboard-ios.md`, `clients-coaches-ios.md`, `coach-earnings-ios.md`, `sport-types-ios.md` all describe V2/mock code that was never written — rewrite to shipped reality.

---

## 7. Per-module detail
See the tag counts per cluster below; full finding text is in the session transcript. All findings cite file:line on both sides.

| Module | SPEC-FIX | BACKEND | DOC-FIX | iOS |
|---|---|---|---|---|
| Messaging | 8 | 3 (1=P1 fork) | 0 | epic (DM unbuilt) |
| Clients/CRM | 4 | 4 | 1 | 7 |
| Dashboard | 5 | 2 | 5 | 4 |
| Money | 3 | 2 | 3 | 7 |
| Notifications | 4 | 1 | 3 | 13 (inbox) |
| Auth/identity | 4 | 2 | 0 | 6 |
| Coach profile/reviews | 4 | 2 | 1 | — |
| Self-paced/Group | 6 | 2 | 1 | — |
| Search/Locations/Sched | 6 | 4 | 1 | — |
| Cross-cutting hygiene | 8 | 1 | 6 | — |
