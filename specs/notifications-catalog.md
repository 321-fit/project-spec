# Notification Catalog

> Status: Approved
> Companion to: [notifications.md](./notifications.md) (infrastructure — registration, delivery, inbox UI, routing internals)
> Last updated: 2026-05-22

The **single source of truth** for every notification the app sends — what triggers it, who receives it, what copy lands in the push body / inbox row, what template variables backend must pass, where tap routes to.

When changing copy, **update this file first**, then mirror in `notification_template` DB via Alembic migration, then verify call sites pass exact `template_data` keys listed in the row.

## 1. The catalog — 19 categories

`Channels`: P = Push (FCM/APNS), W = WhatsApp opt-in, I = Inbox (in-app feed). Inbox is implicit for every category that creates a `Notification` DB row.

| # | Category (`backend enum`) | Kit type | Trigger | Channels | Push body | Routing target | Template vars |
|---|---|---|---|---|---|---|---|
| 1 | `athlete_created_training_request` | `request` | Athlete books a session with coach | P · W · I | `{athlete_name} requested {session_name} on {date} at {time}.` | Coach → Clients → Requests | `athlete_name, session_name, date, time` |
| 2 | `coach_created_training_request` | `request` | Coach proposes a session to athlete | P · W · I | `{coach_name} invited you to {session_name} on {date} at {time}.` | Athlete → Coaches → Requests | `coach_name, session_name, date, time` |
| 3 | `training_request_approved` | `approved` | Other side accepts the request | P · W · I | `{sender_name} accepted your {session_name} on {date} at {time}.` | Recipient → Schedule (event sheet on the date) | `sender_name, session_name, date, time` |
| 4 | `training_request_declined` | `declined` | Other side declines | P · W · I | `{sender_name} declined your {session_name} on {date} at {time}.` | Recipient → Schedule (sheet on the date) | `sender_name, session_name, date, time` |
| 5 | `coach_rescheduled_training` | `reschedule` | Coach proposes a new time | P · W · I | `{coach_name} moved {session_name} to {new_date} at {new_time}.` | Athlete → Schedule (sheet on new_date) | `coach_name, session_name, new_date, new_time` (+ optional `old_date`, `old_time`) |
| 6 | `athlete_rescheduled_training` | `reschedule` | Athlete proposes a new time | P · W · I | `{athlete_name} moved {session_name} to {new_date} at {new_time}.` | Coach → Schedule (sheet on new_date) | `athlete_name, session_name, new_date, new_time` |
| 7 | `pending_request_auto_declined` | `expired` | 48h timeout on a pending request | P · W · I | `Request for {session_name} with {other_name} on {date} expired — auto-declined after 48h.` | Recipient → Clients → athlete detail (or Coaches → coach detail) | `session_name, other_name, date` |
| 8 | `athlete_onboarding_completed` | `onboardingDone` | Athlete finishes onboarding and is connected to coach (NOT referral path) | P · I | `{athlete_name} just joined 321Fit and is ready to train with you.` | Coach → Clients → athlete detail | `athlete_name` |
| 9 | `training_event_cancelled` | `cancelled` | Session cancelled by either side | P · W · I | `{sender_name} cancelled {session_name} on {date} at {time}.` | Recipient → Schedule (sheet, cancelled state) | `sender_name, session_name, date, time` |
| 10 | `training_session_successful_coach` | `payment` | Coach earns from completed session (money moves) | P · I | `{session_name} with {athlete_name} on {date} completed. €{amount} added to your balance.` | Coach → Earnings → s-txn-earning (this earning) | `session_name, athlete_name, date, amount` |
| 11 | `training_session_successful_athlete` | `approved` | Session completed for athlete | P · I | `{session_name} with {coach_name} on {date} completed. Leave a review?` | Athlete → Schedule (sheet, finished state) — surfaces Leave Review CTA | `session_name, coach_name, date` |
| 12 | `session_reminder_1h` *new 2026-05-22* | `reminder` | Celery beat: 60 min before a planned session start | P · I | `{session_name} with {other_name} starts in 1 hour at {time}.` | Either side → Schedule (sheet) | `session_name, other_name, time` |
| 13 | `session_reminder_10min` *new 2026-05-22 — off by default* | `reminder` | 10 min before a planned session start | P only (don't inbox-spam) | `{session_name} starts in 10 min.` | Either side → Schedule (sheet) | `session_name` |
| 14 | `card_payment_cleared` *new 2026-05-22* | `payment` | 24h Stripe hold released for an earning | P · I | `€{amount} from {athlete_name} cleared and is now available.` | Coach → Earnings → s-txn-earning | `amount, athlete_name` |
| 15 | `payout_sent` *new 2026-05-22* | `payment` | Stripe `transfer.created` webhook | P · I | `Payout of €{amount} sent to your bank — arrives in 1-2 days.` | Coach → Earnings → s-txn-payout | `amount` |
| 16 | `cash_overdue` *new 2026-05-22* | `reminder` | Daily Celery beat: cash earning unpaid > 3 days | P · I | `{athlete_name}'s {session_name} on {date} is still unpaid — mark as paid?` | Coach → Earnings → s-txn-cash | `athlete_name, session_name, date` |
| 17 | `calendar_sync_needs_attention` *new 2026-05-22 — spec'd in notifications.md § Calendar sync issue, template was missing* | `calendarSync` | OAuth refresh fail / app-specific password revoked / 2FA disabled | P · I | `Reconnect {provider} Calendar to keep events synced.` | Coach/Athlete → Settings → Calendar Sync | `provider` |
| 18 | `new_review` *new 2026-05-22 — when athlete-review module ships* | `review` | Athlete leaves a review on a finished session | P · I | `{athlete_name} left you a {rating}★ review on {session_name}.` | Coach → Profile → Reviews carousel (anchor to new entry) | `athlete_name, rating, session_name` |
| 19 | `referral_athlete_joined` *new 2026-05-22 — fills the referral gap* | `onboardingDone` | Athlete signs up via coach's referral link AND completes onboarding | P · I | `{athlete_name} joined 321Fit via your invite — ready to train.` | Coach → Clients → athlete detail | `athlete_name` |

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

1. **Active voice always.** "Anna accepted your request", not "Your request has been approved." Lead with the actor when there's one.
2. **Lead with the person**, not the action — humans first, app verbs second.
3. **Always include date + time** for any scheduled-event notification. A coach reading a 3am push must know whether this is about today or next week.
4. **Always include the session name** (`{session_name}` — the training template name like "Basketball Training", "Yoga Private", "HIIT Group Session") so the recipient knows which session out of N this is about.
5. **One sentence, ≤80 chars body.** Push char limits + scannability. Apple OS may cut at ~110 chars on lock screen, so design to fit comfortably.
6. **Sentence case**, no ALL CAPS, no exclamation marks (per `feedback_copy_standards` memory).
7. **No internal jargon** — "request" stays, "approval" stays; avoid "training session request approval" verbosity. If a phrase wouldn't pass a friend reading it, rewrite.
8. **Hide auto-mechanics where possible.** "expired" reads better than "automatically declined by the system after 48h." User doesn't care which subsystem did it.

## 4. Channel selection rules

- **Inbox (`I`)** — every category creates a `Notification` DB row. Always on. Powers the bell badge + `s-notifications` screen.
- **Push (`P`)** — every category. Actionable signal.
- **WhatsApp (`W`)** — opt-in via `whatsapp_notifications_allowed` table. Coach gets it for time-sensitive coach-side events (requests, reschedule, cancel). Athlete WA isn't enabled in v1. Skip the WA send if opt-out.
- **Email (`E`)** — none of these go to email in v1. Email is reserved for transactional (signup, password reset, receipts).

## 5. Kit type → routing (decoupled from backend categories)

Backend has 19 `NotificationCategory` values; the iOS / Android Inbox kit collapses them to 13 visual variants. The mapping table + tap-routing rules live in [notifications.md § Type → icon / color mapping](./notifications.md#type--icon--color-mapping-kit-type-enum-decoupled-from-backend-targetroute) and [§ Tap routing](./notifications.md#tap-routing-sheet-vs-push). When adding a new category, pick an existing kit type if visual + route match; only invent a new kit type for genuinely new visual semantics.

Kit types currently in the catalog: `request`, `reschedule`, `approved`, `cancelled`, `declined`, `expired`, `onboardingDone`, `calendarSync`, `videoReady`, `videoFailed`, `reminder`, `payment`, `review`.

## 6. How to add a new notification

1. Append a row to the table in **§ 1**. Pick a `kit type` from the existing 13 if visual / route match; if not, propose a new kit type in [notifications.md § Type → icon / color mapping](./notifications.md#type--icon--color-mapping-kit-type-enum-decoupled-from-backend-targetroute) first.
2. Write the push body per **§ 3 Copy style guide**. Use only placeholders from **§ 2**.
3. List required `template_data` keys in the Template vars column.
4. Open backend issue: Alembic migration inserts the template + extends `NotificationCategory` enum; call site passes `template_data` per the row.
5. Open client issues (iOS + Android) only if a new kit type was introduced; otherwise existing client handling renders the new row automatically.

## 7. Localization

Templates currently English-only in DB. Live app supports 5 languages via iOS `Localizable.strings`. Two paths for parity, both deferred to a separate scope:

- **A.** Backend stores templates per-language (`notification_template` becomes `notification_template × locale`).
- **B.** Backend stores English templates + delivers via FCM `loc-key` / APNS `loc-key`, client formats locally using `Localizable.strings`.

Option B is the iOS-native pattern. v1.0 ships English-only push copy; backlog item to revisit when international rollout starts.

## 8. Open questions

- Should `session_reminder_10min` be opt-in? Coaches running back-to-back sessions might find 10 prior pushes/day too noisy. **Default proposal:** off by default for v1, exposed as a Settings toggle ("Last-call reminder · 10 min before") in a future release.
- Group event reminders for athletes (1h before joined group session) — covered by `session_reminder_1h` if backend treats `group_event` same as `personal_event` in the reminder query. Verify during BE-NOTIF-2 impl.
