# Notification Catalog

> Status: Approved
> Companion to: [notifications.md](./notifications.md) (infrastructure — registration, delivery, inbox UI, routing internals)
> Last updated: 2026-05-22

The **single source of truth** for every notification the app sends — what triggers it, who receives it, what copy lands in the push body / inbox row, what template variables backend must pass, where tap routes to.

When changing copy, **update this file first**, then mirror in `notification_template` DB via Alembic migration, then verify call sites pass exact `template_data` keys listed in the row.

## 1. The catalog — 19 categories

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
| 12 | `session_reminder_1h` *new 2026-05-22* | `reminder` | Celery beat: 60 min before a planned session start | P · I | **Session in 1 hour** | `{session_name} with {other_name} starts in 1 hour at {time}.` | Either side → Schedule (sheet) | tap + time | `session_name, other_name, time` |
| 13 | `session_reminder_10min` *new 2026-05-22 — off by default* | `reminder` | 10 min before a planned session start | P only (don't inbox-spam) | **Starting in 10 min** | `{session_name} starts in 10 min.` | Either side → Schedule (sheet) | tap + time | `session_name` |
| 14 | `card_payment_cleared` *new 2026-05-22* | `payment` | 24h Stripe hold released for an earning | P · I | **Payment cleared** | `€{amount} from {athlete_name} cleared and is now available.` | Coach → Earnings → s-txn-earning | tap | `amount, athlete_name` |
| 15 | `payout_sent` *new 2026-05-22* | `payment` | Stripe `transfer.created` webhook | P · I | **Payout sent** | `Payout of €{amount} sent to your bank — arrives in 1-2 days.` | Coach → Earnings → s-txn-payout | tap | `amount` |
| 16 | `cash_overdue` *new 2026-05-22* | `reminder` | Daily Celery beat: cash earning unpaid > 3 days | P · I | **Cash unpaid** | `{athlete_name}'s {session_name} on {date} is still unpaid — mark as paid?` | Coach → Earnings → s-txn-cash | **action** | `athlete_name, session_name, date` |
| 17 | `calendar_sync_needs_attention` *new 2026-05-22 — spec'd in notifications.md § Calendar sync issue, template was missing* | `calendarSync` | OAuth refresh fail / app-specific password revoked / 2FA disabled | P · I | **Calendar sync issue** | `Reconnect {provider} Calendar to keep events synced.` | Coach/Athlete → Settings → Calendar Sync | **action** | `provider` |
| 18 | `new_review` *new 2026-05-22 — when athlete-review module ships* | `review` | Athlete leaves a review on a finished session | P · I | **New review** | `{athlete_name} left you a {rating}★ review on {session_name}.` | Coach → Profile → Reviews carousel (anchor to new entry) | tap | `athlete_name, rating, session_name` |
| 19 | `referral_athlete_joined` *new 2026-05-22 — fills the referral gap* | `onboardingDone` | Athlete signs up via coach's referral link AND completes onboarding | P · I | **Athlete joined** | `{athlete_name} joined 321Fit via your invite — ready to train.` | Coach → Clients → athlete detail | tap | `athlete_name` |

### Clearance tag legend

| Tag | Meaning | Detail |
|---|---|---|
| `tap` | User tap → row marked read. No other clearance path. | Default for informational notifications. |
| `tap + state` | Tap marks read, AND server auto-marks-read when the underlying entity state changes. | Used for request / reschedule — when the related `training_event.status` flips to `planned` or `cancelled` (resolved another way), backend marks the unread notifications referencing that event as read so the coach doesn't get a stale unread badge. |
| `tap + time` | Tap marks read, AND server auto-marks-read when the time-based context expires. | Used for `session_reminder_*` — a Celery beat pass marks unread reminders for events whose `datetime_start` is in the past. |
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

11 of 19 categories use this: requests-resolved (#3, #4, #7), informational (#8, #9, #10, #11, #14, #15, #18, #19).

### `tap + state` — auto-clear when the underlying entity resolves

Used for **action-relevant** notifications where the action can be taken from places **outside** the inbox (e.g. coach accepts a request from the calendar event sheet instead of from the inbox tap). When server detects the entity has resolved, it bulk-marks-read any pending notification rows referencing it — so the badge clears even if user never tapped the notification.

Categories:
- `athlete_created_training_request`, `coach_created_training_request` (#1, #2) — server hook fires when `training_event.approval_status` transitions from `pending` to anything else (accepted, declined, cancelled). All unread notifications for that event_id of these two categories → marked read.
- `coach_rescheduled_training`, `athlete_rescheduled_training` (#5, #6) — same hook, when the new-time approval is resolved.

Backend implementation: in the handlers that mutate `EventApproval` status (Accept / Decline / Cancel paths), after the status update, run `notification_repo.mark_unread_for_event_as_read(event_id, categories=[...])`. Idempotent — if no unread rows exist, no-op.

### `tap + time` — auto-clear when time-based context expires

Used for reminders that lose relevance after their target moment passes. A daily Celery beat task scans unread notification rows of these categories whose linked `training_event.datetime_start` is now in the past, marks them read.

Categories: `session_reminder_1h` (#12), `session_reminder_10min` (#13).

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

Backend has 19 `NotificationCategory` values; the iOS / Android Inbox kit collapses them to 13 visual variants. The mapping table + tap-routing rules live in [notifications.md § Type → icon / color mapping](./notifications.md#type--icon--color-mapping-kit-type-enum-decoupled-from-backend-targetroute) and [§ Tap routing](./notifications.md#tap-routing-sheet-vs-push). When adding a new category, pick an existing kit type if visual + route match; only invent a new kit type for genuinely new visual semantics.

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

- Should `session_reminder_10min` be opt-in? Coaches running back-to-back sessions might find 10 prior pushes/day too noisy. **Default proposal:** off by default for v1, exposed as a Settings toggle ("Last-call reminder · 10 min before") in a future release.
- Group event reminders for athletes (1h before joined group session) — covered by `session_reminder_1h` if backend treats `group_event` same as `personal_event` in the reminder query. Verify during BE-NOTIF-2 impl.
