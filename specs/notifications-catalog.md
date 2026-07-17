# Notification Catalog

> Status: Approved
> Companion to: [notifications.md](./notifications.md) (infrastructure — registration, delivery, inbox UI, routing internals)
> Last updated: 2026-07-17

The **single source of truth** for every notification the app sends — what triggers it, who receives it, what copy lands in the push body / inbox row, what template variables backend must pass, where tap routes to.

When changing copy, **update this file first**, then mirror in `notification_template` DB via Alembic migration, then verify call sites pass exact `template_data` keys listed in the row.

## 1. The catalog — 40 backend categories

> **Built count (2026-07-17 audit).** Backend `NotificationCategory` (poly-backend `enums.py`) ships **40** categories on `main`. This § 1 table documents the personal-training, reminder, money, and package notifications in full. The group-training, messaging, self-paced, invite/referral, and coach-moderation families are also shipped but **owned by their module specs** — they are registered in **§ 1.2** with pointers rather than duplicating their copy here, so this file still accounts for all 40 enum values. Rows still marked *spec-ahead* (Session Packages #21–29, reviews #11b/#18, `card_payment_cleared` #14, `payout_sent` #15, `crm_contact_joined` #20) are intentionally **not yet in the enum**.

Each notification has two visible parts on the user's device:

- **Title** — 2-4 word category descriptor, bold above the body. Backend column: `notification_template.subject`. Same field shown as the Inbox row title. Same string per category (never per-instance — the title doesn't carry actor/date variables).
- **Body** — single sentence with full context (actor + session + date/time), shown under the title. Backend column: `notification_template.push_text`. Per-instance via `template_data` substitution.

`Channels`: P = Push (FCM/APNS), I = Inbox (in-app feed). Inbox is implicit for every category that creates a `Notification` DB row. **WhatsApp channel is on hold for v1** — see § 4 below.

| # | Category (`backend enum`) | Kit type | Trigger | Channels | Push title | Push body | Routing target | Clearance | Template vars |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `athlete_created_training_request` | `request` | Athlete books a session with coach | P · I | **New session request** | `{athlete_name} requested {session_name} on {date} at {time}.` | Coach → Clients → Requests | tap + state | `athlete_name, session_name, date, time` |
| 2 | `coach_created_training_request` | `request` | Coach proposes a session to athlete | P · I | **Session invitation** | `{coach_name} invited you to {session_name} on {date} at {time}.` | Athlete → Coaches → Requests | tap + state | `coach_name, session_name, date, time` |
| 3 | `training_request_approved` | `approved` | Other side accepts the request | P · I | **Request accepted** | `{sender_name} accepted your {session_name} on {date} at {time}.` | Recipient → Schedule (event sheet on the date) | tap | `sender_name, session_name, date, time` |
| 4 | `training_request_declined` | `declined` | Other side declines | P · I | **Request declined** | `{sender_name} declined your {session_name} on {date} at {time}.` | Recipient → Schedule (sheet on the date) | tap | `sender_name, session_name, date, time` |
| 5 | `coach_rescheduled_training` | `reschedule` | Coach proposes a new time | P · I | **Session moved** | `{coach_name} moved {session_name} to {new_date} at {new_time}.` | Athlete → Schedule (sheet on new_date) | tap + state | `coach_name, session_name, new_date, new_time` (+ optional `old_date`, `old_time`) |
| 6 | `athlete_rescheduled_training` | `reschedule` | Athlete proposes a new time | P · I | **Session moved** | `{athlete_name} moved {session_name} to {new_date} at {new_time}.` | Coach → Schedule (sheet on new_date) | tap + state | `athlete_name, session_name, new_date, new_time` |
| 7 | `pending_request_auto_declined` | `expired` | 48h timeout on a pending request | P · I | **Request expired** | `Request for {session_name} with {other_name} on {date} expired — auto-declined after 48h.` | Recipient → Clients → athlete detail (or Coaches → coach detail) | tap | `session_name, other_name, date` |
| 8 | `athlete_onboarding_completed` | `onboardingDone` | Athlete finishes onboarding and is connected to coach (NOT referral path) | P · I | **Athlete joined** | `{athlete_name} just joined 321Fit and is ready to train with you.` | Coach → Clients → athlete detail | tap | `athlete_name` |
| 9 | `training_event_cancelled` | `cancelled` | Session cancelled by either side | P · I | **Session cancelled** | `{sender_name} cancelled {session_name} on {date} at {time}.` | Recipient → Schedule (sheet, cancelled state) | tap | `sender_name, session_name, date, time` |
| 10 | `training_session_successful_coach` | `payment` | Coach earns from completed session (money moves) | P · I | **Session complete** | `{session_name} with {athlete_name} on {date} completed. €{amount} added to your balance.` | Coach → Earnings → s-txn-earning (this earning) | tap | `session_name, athlete_name, date, amount` |
| 11 | `training_session_successful_athlete` | `approved` | Session completed for athlete | P · I | **Session complete** | `{session_name} with {coach_name} on {date} completed.` | Athlete → Schedule (sheet, finished state) | tap | `session_name, coach_name, date` |
| 11b | `review_prompt_athlete` *new 2026-06-05 — when reviews module ships* | `review` | ~24h (next day) after athlete's **first completed** session with a coach | P · I | **Leave a review** | `How was training with {coach_name}? Leave a review.` | Athlete → coach review composer (`s-coach-review`, full-screen modal). See [reviews.md](reviews.md) | tap | `coach_name` |
| 12 | `training_soon` ✅ **built** | `reminder` | Celery beat every 5 min (`app/tasks/training_soon.py`): an approved event starts within the next 10 min. Sent **once per event to both** athlete and coach. | P · I | **321Fit** *(shipped subject — copy-cleanup candidate)* | `Your training session starts in {minutes} minutes!` | Either side → Schedule (event sheet) | tap + time | `minutes` |
| 13 | ~~`session_reminder_1h`~~ / ~~`session_reminder_10min`~~ ⚠️ **PHANTOM — not built** | `reminder` | *The planned 1h + 10-min reminder split never shipped.* Both enum values exist and are wired into the clearance service + the `mark reminders for past events as read` query, but **no Celery beat task produces them** — the only reminder that actually fires is `training_soon` (#12). Treat 1h/10min as unbuilt; do not reference them as live. | — | — | — | Either side → Schedule (sheet) | tap + time | — |
| 14 | `card_payment_cleared` *new 2026-05-22* | `payment` | 24h Stripe hold released for an earning | P · I | **Payment cleared** | `€{amount} from {athlete_name} cleared and is now available.` | Coach → Earnings → s-txn-earning | tap | `amount, athlete_name` |
| 15 | `payout_sent` *new 2026-05-22* | `payment` | Stripe `transfer.created` webhook | P · I | **Payout sent** | `Payout of €{amount} sent to your bank — arrives in 1-2 days.` | Coach → Earnings → s-txn-payout | tap | `amount` |
| 16 | `cash_overdue` *new 2026-05-22* | `reminder` | Daily Celery beat: cash earning unpaid > 3 days | P · I | **Cash unpaid** | `{athlete_name}'s {session_name} on {date} is still unpaid — mark as paid?` | Coach → Earnings → s-txn-cash | **action** | `athlete_name, session_name, date` |
| 17 | `calendar_sync_needs_attention` *new 2026-05-22 — spec'd in notifications.md § Calendar sync issue, template was missing* | `calendarSync` | OAuth refresh fail / app-specific password revoked / 2FA disabled | P · I | **Calendar sync issue** | `Reconnect {provider} Calendar to keep events synced.` | Coach/Athlete → Settings → Calendar Sync | **action** | `provider` |
| 18 | `new_review` *new 2026-05-22 — when athlete-review module ships* | `review` | Athlete leaves a review on a finished session | P · I | **New review** | `{athlete_name} left you a {rating}★ review on {session_name}.` | Coach → Profile → Reviews carousel (anchor to new entry) | tap | `athlete_name, rating, session_name` |
| 19 | `referred_athlete_joined` *new 2026-05-22 — fills the referral gap; enum literal is `referred_athlete_joined`* | `onboardingDone` | Athlete signs up via coach's referral/invite link (incl. the `crm_import` OneLink) AND completes onboarding | P · I | **Athlete joined** | `{athlete_name} joined 321Fit via your invite — ready to train.` | Coach → Clients → athlete detail | tap | `athlete_name` |
| 20 | `crm_contact_joined` *new 2026-06-09 — contact import / phone-match path* | `onboardingDone` | A coach's existing **CRM contact** is auto-linked to a new app account via **phone-match** (the coach did not necessarily send a link) → relationship flips `crm → app` | P · I | **Contact joined** | `{athlete_name} from your contacts just joined 321Fit — now connected.` | Coach → Clients → athlete detail (upgraded) | tap | `athlete_name` |

| 21 | `package_purchased_card_coach` *new 2026-07-15 — session packages* | `payment` | Athlete buys a pack by card (credits active instantly) | P · I | **Package sold** | `{athlete_name} bought a {pack_size}-session {session_name} pack — €{amount}.` | Coach → Clients → athlete detail → pack detail | tap | `athlete_name, pack_size, session_name, amount` |
| 22 | `package_purchased_cash_coach` *new 2026-07-15 — session packages* | `payment` | Athlete buys a pack marked **cash** — coach must collect + confirm | P · I | **Cash package sold** | `{athlete_name} bought a {pack_size}-session {session_name} pack · Cash · €{amount} — collect in person, then mark received.` | Coach → Clients → athlete detail → pack detail | **action** | `athlete_name, pack_size, session_name, amount` |
| 23 | `package_payment_confirmed_athlete` *new 2026-07-15 — session packages* | `payment` | Coach taps **Mark received** on a cash pack | P · I | **Payment confirmed** | `{coach_name} confirmed your €{amount} payment for the {session_name} pack.` | Athlete → My Coaches → coach detail → pack detail | tap | `coach_name, amount, session_name` |
| 24 | `package_cash_overdue_coach` *new 2026-07-15 — session packages; mirrors #16* | `reminder` | Daily Celery beat: cash pack unpaid > 3 days | P · I | **Cash package unpaid** | `{athlete_name}'s {pack_size}-session pack (€{amount}) is still unpaid — mark as received?` | Coach → Clients → athlete detail → pack detail | **action** | `athlete_name, pack_size, amount` |
| 25 | `package_running_low_athlete` *new 2026-07-15 — session packages* | `reminder` | `sessions_left` first drops to the **low threshold** (see § 1.1) | P · I | **Pack running low** | `{sessions_left} sessions left in your {session_name} pack with {coach_name}.` | Athlete → coach profile → Book training (pack buy sheet) | tap | `sessions_left, session_name, coach_name` |
| 26 | `package_running_low_coach` *new 2026-07-15 — session packages; decision #8, the differentiator* | `reminder` | Same crossing as #25, coach side | P · I | **Client running low** | `{athlete_name} has {sessions_left} sessions left in their {session_name} pack.` | Coach → Clients → athlete detail → pack detail | tap | `athlete_name, sessions_left, session_name` |
| 27 | `package_used_up_athlete` *new 2026-07-15 — session packages* | `reminder` | `sessions_left` hits **0** | P · I | **Pack finished** | `Your {session_name} pack with {coach_name} is used up — buy another to keep training.` | Athlete → coach profile → Book training (pack buy sheet) | tap | `session_name, coach_name` |
| 28 | `package_used_up_coach` *new 2026-07-15 — session packages* | `reminder` | `sessions_left` hits **0**, coach side | P · I | **Client's pack finished** | `{athlete_name} used the last session of their {session_name} pack.` | Coach → Clients → athlete detail → pack detail | tap | `athlete_name, session_name` |
| 29 | `package_renewal_offered_athlete` *new 2026-07-15 — the coach's manual nudge* | `reminder` | Coach taps **Offer renewal** (per-buyer or bulk). Rate-limited: **once per 7 days per pack** | P · I | **Renew your pack?** | `{coach_name} suggests renewing your {session_name} pack.` | Athlete → coach profile → Book training (pack buy sheet) | tap | `coach_name, session_name` |

### 1.1 Package milestone rules *(new 2026-07-15)*

Packs fire **two** notifications per cycle, both to **each side** (athlete + coach), plus the coach's optional manual nudge (#29).

**Threshold = 20% of the active pack, floored at 1** — `low_at = max(1, ceil(active_pack_size × 0.2))`:

| Pack | `low_at` | Notice at ~1 session/week |
|---|---|---|
| 5 | 1 | 1 week |
| 10 | 2 | 2 weeks |
| 20 | 4 | 1 month |

A flat "1 left" doesn't scale: on a 20-pack it warns on the *last* session of twenty. The 5-pack — the common case — behaves exactly as before, so this is not a regression.

- **Fire once per crossing.** #25/#26 fire when `sessions_left` **first** reaches `low_at`; they do **not** re-fire as it counts 1 down to 0. #27/#28 fire once at 0.
- **Reset on top-up.** Buying another pack adds a lot and raises `sessions_left` → the cycle re-arms and can fire again later.
- **Stacking is handled by the counter, not a special case.** `sessions_left` is the sum across all of that session type's lots (credits burn FIFO), so an athlete holding 14 across two packs is not "low".
- **`active_pack_size`** = the size of the lot(s) still holding credits — the same denominator the UI bar uses. Exhausted lots don't drag the threshold.
- **Manual ≠ automatic.** #29 is coach-initiated and independent of the milestone; it exists so a coach can pitch at their own moment ("renew now while the discount holds"). Rate-limited to **once per 7 days per pack** so a coach tapping repeatedly can't hammer the athlete on top of the automatic nudges.
- **UI must use the same threshold.** The amber "running low" card state + inline **Offer renewal** key off `low_at`, not a hardcoded `1` — otherwise the coach gets "Anna is running low" and opens a green card. See `session-packages.md` § 4.4.

### 1.2 Shipped categories owned by other module specs *(added 2026-07-17)*

These enum categories ship on backend `main` but their copy / triggers / routing are owned by the module specs below — registered here so this file accounts for the full 40, not duplicated. Update copy in the owning spec first.

**Group training** → [group-training.md](group-training.md) · [group-event-detail.md](group-event-detail.md)
- `group_event_full`, `group_event_below_minimum`, `group_event_reminder_coach`, `group_event_reminder_athlete`, `group_event_ended_coach`, `group_event_ended_athlete`, `group_event_payment_processed_athlete`

**Messaging (DM)** → [messages.md](messages.md)
- `new_message`, `new_group_message`

**Self-paced training** → [self-paced.md](self-paced.md)
- `self_paced_booked`, `self_paced_workout_sent`, `self_paced_submitted`, `self_paced_reviewed`, `self_paced_cancelled`, `self_paced_rescheduled`

**Invites / referrals** → [clients-coaches.md](clients-coaches.md) · [deep-linking-referrals.md](deep-linking-referrals.md)
- `athlete_accepted_invite`, `coach_accepted_invite` (proxy-accept for cash invites), `referred_coach_joined`, `coach_bulk_invite`, `coach_rejected_athlete`, `coach_removed_you_from_session`

**Coach onboarding / moderation** → [coach-profile.md](coach-profile.md)
- `coach_profile_approved`, `coach_profile_rejected`

**Count check.** § 1 documents 15 shipped enum categories in full (#1–11 + `training_soon` #12 + `cash_overdue` #16 + `calendar_sync_needs_attention` #17 + `referred_athlete_joined` #19), plus the 2 phantom enum values (#13, unbuilt) = **17** enum values. § 1.2 registers the remaining **23**. 17 + 23 = **40**. (The other § 1 rows — #11b, #14, #15, #18, #20, #21–29 — are spec-ahead and not yet in the enum.)

### Clearance tag legend

| Tag | Meaning | Detail |
|---|---|---|
| `tap` | User tap → row marked read. No other clearance path. | Default for informational notifications. |
| `tap + state` | Tap marks read, AND server auto-marks-read when the underlying entity state changes. | Used for request / reschedule — when the related `training_event.status` flips to `planned` or `cancelled` (resolved another way), backend marks the unread notifications referencing that event as read so the coach doesn't get a stale unread badge. |
| `tap + time` | Tap marks read, AND server auto-marks-read when the time-based context expires. | Used for `training_soon` (#12) — a Celery beat pass marks unread reminders for events whose `datetime_start` is in the past. |
| `action` | Tap **does NOT** mark read (only opens the destination screen). Cleared only when the user performs the actual action (mark-paid / reconnect) — at which point server auto-marks-read. | Used for `cash_overdue` and `calendar_sync_needs_attention`. Reasoning: these are one-tap actions ("Mark as paid", "Reconnect"). Marking read on mere tap means coach opens screen, gets distracted, forgets — and the notification is gone from the badge with no action taken. The explicit-action-required pattern keeps the badge persistent until the work is done. |

## 2. Variables convention

Backend `template_data` dict keys must match these literals exactly — the template strings substitute literally with no key transformation.

| Placeholder | Means | Example value | Notes |
|---|---|---|---|
| `{session_name}` | Training template name (the coach's "Basketball Training" / "Yoga Private" / "HIIT Group Session") | "Basketball Training" | NOT sport taxonomy. Falls back to "session" if event has no template (custom personal events). |
| `{sender_name}` | The actor who triggered (athlete or coach name) | "Anna Müller" | Use when the action could come from either role. |
| `{coach_name}` / `{athlete_name}` | Role-specific where direction matters and the template only fires for one role | "Mark Stevens" | |
| `{other_name}` | The counterparty in summaries / reminders | "Anna" | First name only for reminders (shorter). |
| `{date}` | Localized formatted date "Tue, Apr 10" | "Tue, Apr 10" | Use coach's timezone for coach-side, athlete's TZ for athlete-side. Format: `%a, %b %-d`. |
| `{time}` | Time "10:00" | "10:00" | 24h (matches `feedback_copy_standards` `· 10:00` pattern). Format: `%H:%M`. |
| `{new_date}` / `{new_time}` / `{old_date}` / `{old_time}` | Reschedule context (proposed new + previous values) | | Only the `_rescheduled_` templates need these. |
| `{amount}` | Money with currency symbol | "€50" | Backend renames legacy `{sum}` → `{amount}` for consistency. |
| `{rating}` | Review stars | "5" | Used in `new_review` only. |
| `{pack_size}` | Sessions in the purchased pack (the lot), not the lifetime total | "5" | Session packages. Integer. |
| `{sessions_left}` | Credits remaining across **all** of that session type's lots (they burn FIFO) | "2" | Session packages. Integer; drives the milestone rules in § 1.1. |
| `{provider}` | "Google" or "Apple" calendar | "Google" | Used in `calendar_sync_needs_attention`. |

**Deprecated** (do not use in new templates; migrate in BE-NOTIF-1):
- `{person_name}` → use `{sender_name}` or role-specific `{coach_name}` / `{athlete_name}`
- `{trainer_name}` → use `{coach_name}`
- `{sum}` → use `{amount}`

## 3. Copy style guide

### Title (2-4 words)

- **Category-level, not actor-specific.** "Session moved" — not "Anna moved your session" (that's the body's job).
- **Sentence case**, ≤24 chars to avoid OS truncation on lock screen.
- **Reused across instances** of the same category. Same title for every "Request declined" push regardless of who declined.
- **Scannable** — when notifications stack on the lock screen, the user reads only titles. Make them differentiate categories at a glance.

### Body (one sentence)

1. **Active voice always.** "Anna accepted your request", not "Your request has been approved." Lead with the actor when there's one.
2. **Lead with the person**, not the action — humans first, app verbs second.
3. **Always include date + time** for any scheduled-event notification. A coach reading a 3am push must know whether this is about today or next week.
4. **Always include the session name** (`{session_name}` — the training template name like "Basketball Training", "Yoga Private", "HIIT Group Session") so the recipient knows which session out of N this is about.
5. **One sentence, ≤80 chars body.** Push char limits + scannability. Apple OS may cut at ~110 chars on lock screen, so design to fit comfortably.
6. **Sentence case**, no ALL CAPS, no exclamation marks (per `feedback_copy_standards` memory).
7. **No internal jargon** — "request" stays, "approval" stays; avoid "training session request approval" verbosity. If a phrase wouldn't pass a friend reading it, rewrite.
8. **Hide auto-mechanics where possible.** "expired" reads better than "automatically declined by the system after 48h." User doesn't care which subsystem did it.

## 4. Channel selection rules

Active channels in v1 — **Push** + **Inbox** only.

- **Inbox (`I`)** — every category creates a `Notification` DB row. Always on. Powers the bell badge + `s-notifications` screen. Title (`subject` field) and body (`push_text` field) shown as row title + subtitle.
- **Push (`P`)** — every category. Backend sends `Notification(title=subject, body=push_text)` to FCM/APNS. OS renders title bold above body.

### WhatsApp — on hold for v1

The backend has WhatsApp infrastructure (Twilio integration, opt-in table `whatsapp_notifications_allowed`, send code in `whatsapp_notification_sender.py`, opt-in toggle `GET /me/whatsapp-notifications-toogle`) — but **zero categories actually deliver via WhatsApp** because:

- `notification_template.whatsapp_template_sid` is NULL for all 11 existing templates.
- Twilio rejects WA sends without a registered template SID (Meta WA Business API compliance).
- Registering each template with Meta requires per-template review (24-48h) + Twilio Content Template registration.

**Decision (2026-05-22):** scope WhatsApp out for v1. The infra stays in code (dormant — `create_and_send_whatsapp` silently no-ops when SID is NULL) so re-enabling is a SID population + toggle, not a code rewrite. Will revisit when coach pain-point of "missed FCM push" becomes evidence-based. Until then, push + inbox is the contract.

When/if WA is enabled later:
1. Decide which categories warrant WA (likely a strict subset — time-sensitive coach-side only: requests, reschedule, cancel)
2. Register Twilio templates for those, fill `whatsapp_template_sid` per row
3. Re-enable opt-in UI in coach Settings (currently hidden)
4. Update this catalog with a `W` column

### Email — never in v1

None of these notifications go to email. Email is reserved for transactional flows (signup, password reset, receipts, support).

## 5. Clearance behavior — how notifications become "read"

The `Clearance` column in § 1 carries one of four tags. Detailed rules:

### `tap` — informational default

Used for confirmations, status updates, money news, social signals. User tap (in inbox row or push from background) fires `POST /notifications/mark-read { notificationId }` — optimistic on client, badge decrements immediately. No other clearance path. If user never opens, notification sits read=false forever (acceptable noise — backend has no retention TTL in v1).

These § 1 rows use it: requests-resolved (#3, #4, #7), informational (#8, #9, #10, #11, #14, #15, #18, #19). (The § 1.2 module-owned categories carry their own clearance tags in their owning specs.)

### `tap + state` — auto-clear when the underlying entity resolves

Used for **action-relevant** notifications where the action can be taken from places **outside** the inbox (e.g. coach accepts a request from the calendar event sheet instead of from the inbox tap). When server detects the entity has resolved, it bulk-marks-read any pending notification rows referencing it — so the badge clears even if user never tapped the notification.

Categories:
- `athlete_created_training_request`, `coach_created_training_request` (#1, #2) — server hook fires when `training_event.approval_status` transitions from `pending` to anything else (accepted, declined, cancelled). All unread notifications for that event_id of these two categories → marked read.
- `coach_rescheduled_training`, `athlete_rescheduled_training` (#5, #6) — same hook, when the new-time approval is resolved.

Backend implementation: in the handlers that mutate `EventApproval` status (Accept / Decline / Cancel paths), after the status update, run `notification_repo.mark_unread_for_event_as_read(event_id, categories=[...])`. Idempotent — if no unread rows exist, no-op.

### `tap + time` — auto-clear when time-based context expires

Used for reminders that lose relevance after their target moment passes. A daily Celery beat task scans unread notification rows of these categories whose linked `training_event.datetime_start` is now in the past, marks them read.

Category: `training_soon` (#12). (The phantom `session_reminder_1h` / `session_reminder_10min` at #13 would use the same rule if ever built.)

Implementation cost is minimal — single SQL update in the existing reminder beat task or a new tiny beat task at the same cadence.

### `action` — tap does NOT mark read; only the action does

Used for **action-required** notifications where the action is a single explicit tap on a destination button — and the action being completed is the only reasonable "I'm done" signal. Marking read on mere navigation tap would clear the badge while the work is still undone.

Categories:
- `cash_overdue` (#16) — read only when coach taps "Mark as paid" on the cash earning detail screen. POST `/coach/transactions/{id}/mark-paid` server-side: in addition to flipping the transaction state, it bulk-marks-read any unread `cash_overdue` notifications for that earning_id.
- `calendar_sync_needs_attention` (#17) — read only when the account successfully reconnects (Google OAuth refresh succeeds or Apple CalDAV credentials accepted). The webhook/handler that completes the reconnect calls `notification_repo.mark_unread_for_account_as_read(account_id, category=CALENDAR_SYNC_NEEDS_ATTENTION)`.

Client-side: tapping the row in the inbox opens the destination screen but skips the `POST /notifications/mark-read` call. The row stays unread (visual indicator dot stays) until the action endpoint runs server-side.

### Mark-all-read (⋯ menu)

Universal escape hatch — coach taps ⋯ → "Mark all as read" → server flips every unread row for the user, **including `action` category rows**. This is the user explicitly saying "I've seen everything, clear the badge." Backend bulk-marks-read regardless of category. Coach may forget the underlying actions; the cost of that tradeoff is the user's choice when they bulk-clear.

### State summary

| State | Visual | When |
|---|---|---|
| `unread` | Bold row + unread dot + bell badge counts it | Default after notification created |
| `read` | Default weight, no dot, badge ignores it | Per any clearance path above |

No third state ("read but actionable") in v1 — the `action` tag's behavior (don't mark-read on tap) achieves the same goal without new UI state.

## 6. Kit type → routing (decoupled from backend categories)

Backend has **40** `NotificationCategory` values; the iOS / Android Inbox kit collapses them to 13 visual variants. The mapping table + tap-routing rules live in [notifications.md § Type → icon / color mapping](./notifications.md#type--icon--color-mapping-kit-type-enum-decoupled-from-backend-targetroute) and [§ Tap routing](./notifications.md#tap-routing-sheet-vs-push). When adding a new category, pick an existing kit type if visual + route match; only invent a new kit type for genuinely new visual semantics.

Kit types currently in the catalog: `request`, `reschedule`, `approved`, `cancelled`, `declined`, `expired`, `onboardingDone`, `calendarSync`, `videoReady`, `videoFailed`, `reminder`, `payment`, `review`.

## 7. How to add a new notification

1. Append a row to the table in **§ 1**. Pick a `kit type` from the existing 13 if visual / route match; if not, propose a new kit type in [notifications.md § Type → icon / color mapping](./notifications.md#type--icon--color-mapping-kit-type-enum-decoupled-from-backend-targetroute) first.
2. Write the push body per **§ 3 Copy style guide**. Use only placeholders from **§ 2**.
3. List required `template_data` keys in the Template vars column.
4. Open backend issue: Alembic migration inserts the template + extends `NotificationCategory` enum; call site passes `template_data` per the row.
5. Open client issues (iOS + Android) only if a new kit type was introduced; otherwise existing client handling renders the new row automatically.

## 8. Localization

Templates currently English-only in DB. Live app supports 5 languages via iOS `Localizable.strings`. Two paths for parity, both deferred to a separate scope:

- **A.** Backend stores templates per-language (`notification_template` becomes `notification_template × locale`).
- **B.** Backend stores English templates + delivers via FCM `loc-key` / APNS `loc-key`, client formats locally using `Localizable.strings`.

Option B is the iOS-native pattern. v1.0 ships English-only push copy; backlog item to revisit when international rollout starts.

## 9. Open questions

- ~~Should `session_reminder_10min` be opt-in?~~ **Moot (2026-07-17):** the 1h/10min split was never built (see #13). Backend ships a single `training_soon` (10-min, both roles, always on). Revisit opt-in only if a configurable reminder is added later.
- ~~Group event reminders for athletes (1h before joined group session)~~ **Resolved (2026-07-17):** backend ships dedicated `group_event_reminder_coach` / `group_event_reminder_athlete` categories (see § 1.2, owned by group-training.md), not a reused personal-session reminder.
