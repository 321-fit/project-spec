# Web invite — answer a session by link, no app required

> Status: **Draft** — screens built on mocks, contract written, backend not started.
> Epic: [project-spec#46](https://github.com/321-fit/project-spec/issues/46) · label `extension` · Backend: [poly-backend#983](https://github.com/321-fit/poly-backend/issues/983)
> Prototype: **not an HTML prototype** — the screens are React in the reference stand, `stand/book.html` (`npm run dev` → `http://localhost:5173/book.html#/e/open`), on a mock API shaped like § 6. Every state is a route; the switcher bottom-right walks them.
> Related: [group-event-detail.md](./group-event-detail.md) § 4 (share link, invite picker) · [clients-coaches.md](./clients-coaches.md) (CRM contacts, phone match) · [rework-index.md](./rework-index.md) (the look) · #44 roster statuses · #45 kids
> Last updated: 2026-09-17 (stories added)

## 1. What this is

A coach invites people to a session **by phone number** — SMS, WhatsApp, any messenger, Copy link — and they answer on a **mobile web page** without installing 321Fit: see the session, say yes or no, give a name and a phone, pay (card via Stripe, or cash in person), and appear in the coach's roster like any other participant. Installing the app is *offered* after, never required.

Covers **both** group events and **1:1** invitations: the backend already models a 1:1 invitation as an event in `ApprovalStatus.INVITATION` with a `training_invitation.token`; the web page is a public mirror of the athlete's `by-invitation` / `process-invitation` endpoints with phone + OTP instead of a JWT.

## 1a. User stories

**Coach**
- Invite someone to a group session or a 1:1 by phone number — from my CRM contacts or a typed number — through my own SMS / WhatsApp / share sheet, without them installing anything.
- See who I invited and what they answered, in the event's roster, the same way as for app athletes (Invited / Confirmed / Declined), with a `web` mark so I know they are not in the app.
- Get paid the same way: card money is held/paid through Stripe; cash is owed and I settle it at completion.
- When I cancel or move a session, be told which web participants I need to reach, and reach them with one tap.

**Invited person (no account)**
- Open the link and see everything I need to decide: what, when (in the coach's time, and told so), where, with whom, how much, how to pay, how to cancel.
- Say yes in the fewest steps: confirm the number the coach has for me, type the SMS code, my last name, pick how to pay.
- Say no in one tap, without giving anything.
- Book for my child, not only myself.
- Keep one link that always shows my current booking: the time as it is now, whether I am still in, where my money is; cancel from it; be asked again if the session moved.
- Put it in my calendar in one tap on whatever phone I have.
- Be offered the app, never forced into it — and if I install it and sign in with the same phone, find this booking there.

## 1b. System stories

- **Phone is the identity.** A web person is a CRM shadow user of *this* coach, found or created by E.164 phone; the same phone signing up in the app later is linked by `crm_auto_link` (phone match) with no manual merge. Nothing is created for a decline.
- **OTP gates every write that takes a seat.** `register` / `accept` require a `phoneProof` from `POST /public/otp/confirm`; proofs are single-use and short-lived (≤ 10 min). Decline and the `/a/` reads need no proof — the token is the credential.
- **Tokens are credentials, so they are unguessable** (≥ 128 bit, not the 5-char `short_id`) and scoped: an invite token is one event × one invitee and expires with the event; an answer token outlives it (the page still renders "past").
- **Rate limits are per phone AND per IP** on `otp/send` (e.g. 3/10 min per phone, 10/10 min per IP) and on `register`; `otp/confirm` allows 5 attempts per verification. Over the limit → `429 rate_limited`, never a Twilio error leaking through.
- **A seat is taken only once money is settled or not needed:** card → after `checkout.session.completed`; cash / free → on register. An abandoned Checkout leaves nothing behind (no participant row, or a row that expires). Concurrent registers on the last seat → exactly one wins, the other gets `409 full`.
- **The generic link only produces Confirmed.** Invited / Declined rows exist only for personal tokens minted by `POST /coach/training-events/{id}/invites`; an Invited row does not hold a seat (proposal — shared with #44).
- **1:1 reuses the existing model:** `training_invitation.token` + `ApprovalStatus.INVITATION → APPROVED/DECLINED`; the web accept sets the shadow user as the athlete and follows the existing payment path (`MONEY_ON_HOLD` for card, cash owed).
- **The public read is sanitized:** never other participants, never the coach's private fields, never the invitee's full phone unless the token is presented (then masked for display + full for prefill, or withheld).
- **Reschedule flips `reconfirmNeeded`** on every web participant of the moved event and clears it on `reconfirm`; the coach's reschedule/cancel responses list `webParticipants[]` so the app can offer "Notify". No server-side SMS in v1; email when the person left one.
- **Everything is additive** — new `/public/*` namespace, new fields on two coach responses, one config value for the link host. No existing endpoint changes shape (`feedback_backward_compat_endpoints`).
- **The link host is config**: `share_link_base_url` → `https://book.321.fit`; the app's resolver `GET /e/{short_id}` is unchanged.

## 2. Decisions (owner, 2026-09-17 — recorded on #46)

| # | Decision |
|---|---|
| 1 | **Host `book.321.fit`**, not the Next landing. One host serves the short link *and* the page (`book.321.fit/e/xK3aB` is the page). `apple-app-site-association` + `assetlinks.json` on this host → the same URL opens the app when installed. |
| 2 | **Built in `stand/` as a second Vite entry** (`book.html`, `src/book/`), same kit, `fit-ui.css` + `fit-ui-rework.css`. API through a same-host proxy (staging/dev1 send no CORS). |
| 3 | **Web person = a CRM shadow user of this coach**, found or created by phone (`register … is_crm_user`, `crm_auto_link` phone match). No login account. Installing the app and signing in by phone stitches to the same record. Roster shows `source = app \| crm \| web`. |
| 4 | **OTP by SMS is mandatory on "I'm in"** (Twilio Verify, already integrated). Not needed for "Can't make it" on a personal link — the link is the credential. |
| 5 | **Card = Stripe Checkout, hosted.** Cash = owed, settled like coach-added participants. Packs are not offered on the web (v1). |
| 6 | **The link is a living page.** Reopened, it shows the current answer and the current time/place; a reschedule asks "still coming?"; a cancellation says where the money is. |
| 7 | **No server-side SMS in v1.** Change notifications: the coach's app offers "Notify N web participants" → SMS/WhatsApp with prefilled text + the link. Email in addition when given. |
| 8 | **Personal tokens are minted at send time**; the roster row *Invited* is created when the coach sends, not when the link is opened. |
| 9 | **Full event info is shown** — name, coach, time, duration, full location, price, seats left. Never other participants' names. |
| 10 | **Child (#45)**: "Me / My child" with first name + age on the page; the child-profile model comes with #45. |

## 3. Links and routes

```
book.321.fit/e/{shortId}      group, generic link (Copy link / Share)  → anonymous; only produces Confirmed
book.321.fit/i/{token}        group, personal (sent to a contact)     → Invited → Confirmed / Declined  (#44)
book.321.fit/i/{token}        1:1, personal                            → INVITATION → approved / declined
book.321.fit/a/{answerToken}  "my answer" — the living page             → cancel my seat · reconfirm after a move
```

- `shortId` = today's `event_share_link.short_id`; the mint endpoint's returned URL changes host by config.
- `token` = `training_invitation.token`, extended with **who** (crm_client_id / phone). One token = one event = one invitee, for both types. *Proposal, backend's call* — the alternative is a new `event_invite` table.
- `answerToken` = an unguessable id on the participant row (group) / event approval (1:1), returned by register.
- In the draft the routes are hash-based (`book.html#/e/open`); on the real host they are paths. Only the parser changes.

## 4. User flows

### 4.1 The invited person

```
SMS/WhatsApp: "Anna, join me for HIIT Group Session, Sun 20 Sep 11:00 at TNT Studio — book.321.fit/i/8f3k…"
        │
        ▼
┌─ Event page ───────────────────────────┐   app installed? → universal link → the app
│ [plate]  Anna, John invites you        │
│ HIIT Group Session                     │   chips: Waiting for your answer · 3 seats left
│ John Miller · 4.8 ★ · 42 reviews       │
│ [20 Sun·Sep 11:00–12:00] [€25/person]  │   tiles (owner's pick) + place row → Maps
│ TNT Studio · Riga · Brivibas 12      › │
│ Going 7 of 10 ▓▓▓▓▓▓▓░░░               │   faces are anonymous plates
│ From John: bring a mat…                │
│ [ I'm in · €25 ]  [ Can't make it ]    │   second CTA only on a personal link
└────────────────────────────────────────┘
   │ I'm in                                  │ Can't make it (personal) → Declined in the roster,
   ▼                                         ▼ banner "You said you can't make it. John knows."
 1 Who is coming?      ◉ I will  ○ My child will (+ first name, age)
 2 Your phone number   personal link: "Is this still your number?" + masked number + Use another;
                       generic link: the input
 3 Enter the code      6 cells, SMS autofill, resend after 30 s; wrong code → inline error
 4 About you           first name (prefilled) · last name · email (optional)
 5 How to pay          Card (Stripe Checkout) | Cash, in person — only what the session allows;
                       step skipped when the session is free
   ▼
┌─ /a/{answerToken} — You're in, Anna ──┐
│ ✓  John sees you on the list.         │   + Add to calendar · Cancel my seat (sheet)
│ [event facts]  Your booking: who /    │   + Get the app (optional)
│ payment / "keep this link"            │
└───────────────────────────────────────┘
```

**Event page states** (all built): open · open cash-only · open free · full · cancelled · past · not found · personal link: invited / invited-but-full / already confirmed (→ `/a/`) / declined / expired.

**Living page states** (all built): confirmed card · confirmed cash (owed) · confirmed for a child · 1:1 confirmed · **rescheduled → reconfirm** (Yes, I'm in / Not this time) · cancelled by coach (refund on its way) · cancelled by me · past.

### 4.2 The coach — sending (step 2 of #46, not built yet)

Invite picker (`group-event-detail.md` § 4, `#s-invite`) gains **send channels**: pick CRM contacts and/or type numbers → `POST …/invites` returns, per contact, a personal link + a ready message → the app opens SMS / WhatsApp / share sheet (one per contact, or one group message for the generic link). Roster rows appear as *Invited* immediately (#44). The generic link keeps today's share sheet.

### 4.3 The coach — cancel / reschedule with web participants

The cancel and reschedule responses list `webParticipants[] {name, phone, answerLink}`; the app then offers **"Notify N web participants"** → prefilled SMS/WhatsApp with the link. The person opens the link and sees the reschedule banner (reconfirm) or the cancellation (refund state). Email goes out automatically when the person left one.

## 5. Screens (React, `stand/src/book/`)

| File | Owns |
|---|---|
| `BookApp.tsx` | routes `/e` `/i` `/a`, bare-host landing, dev state switcher |
| `ui/BookShell.tsx` | tinted canvas, chrome circles (back/close · wordmark · share), footer + note slot |
| `ui/EventPage.tsx` | the event in every state; hosts the answer flow; `Gone` (not found / expired / offline) |
| `ui/EventFacts.tsx` | identity · tiles (when/pay) · place row · going · coach note — reused by every screen |
| `ui/AnswerFlow.tsx` | who → phone → code → details → pay; OTP cells with `autocomplete=one-time-code` |
| `ui/AnswerPage.tsx` | the living page: headline per status, reconfirm panel, booking panel, cancel sheet, .ics |
| `ui/GetTheApp.tsx` | store plates, "sign in with this phone — your booking is already there" |
| `api/public.ts` | **the contract** (types + `PublicApi` interface) — the backend implements this |
| `api/mock.ts` | fixtures, one per state; OTP: any six digits succeed, `111111` fails |

Look: rework grammar (`cd-*`) now lives in `prototypes/lib/fit-ui-rework.css` (lifted from the drafts' heads; the stand syncs it with `npm run sync:ui`). Page-local classes are `bk-*` in `stand/src/styles/book.css` — shell, marks, code cells, store plates. Passes `npm run lint:ui` (no unknown classes, one budgeted inline style for the seat bar).

## 6. API — what the backend builds

All public, **no auth**, under a new namespace, **rate-limited per IP and per phone**. The exact request/response shapes are the TypeScript in `stand/src/book/api/public.ts` (the stand has no remote yet — read it locally); this table is the map. Money is `{amount: minor, currency}`; times ISO 8601 with offset + `timezone` (the coach's).

| Endpoint | Purpose | Notes |
|---|---|---|
| `GET /public/events/{shortId}` | sanitized event for the generic link | name, sport, coach (name, avatar, rating, reviews), start/end, tz, duration, location, price, `paymentMethods[]`, `cancellationPolicy` (resolved sentence), note, `status: open\|full\|cancelled\|past`, `spots {taken,total}`, recurrence. **Never participants.** |
| `GET /public/invites/{token}` | the same + `invite {firstName, phoneMasked, phone?, answer, answerToken?}` | 404 unknown, 410 expired |
| `POST /public/otp/send {phone}` → `{verificationId}` | guest OTP via Twilio Verify | today's `auth/otp/send` is email-only and requires a user — this is a new guest variant |
| `POST /public/otp/confirm {verificationId, code}` → `{phoneProof}` | single-use, short-lived proof | |
| `POST /public/events/{shortId}/register` · `POST /public/invites/{token}/accept` | `{phoneProof, firstName, lastName, email?, child?, paymentMethod}` → `{answerToken, checkoutUrl?}` | find/create the coach's CRM shadow user by phone → group: participant `source=web`, payment `held` after Checkout / `owed` for cash → 1:1: `INVITATION → approved`, athlete = shadow user. 409 when full. |
| `POST /public/invites/{token}/decline` | personal link only; no OTP | roster `declined` / 1:1 `declined` |
| `GET /public/answers/{token}` | the living page | event + participant + payment state + `status: confirmed\|cancelled_by_me\|cancelled_by_coach\|rescheduled\|past` + `reconfirmNeeded` + `previousStartsAt` |
| `POST /public/answers/{token}/cancel` | the person frees the seat | refund per policy on the existing path |
| `POST /public/answers/{token}/reconfirm {coming}` | after a reschedule | `reconfirmNeeded` is set by the reschedule handler for web participants |
| Stripe `checkout.session.completed` webhook | participant → `held`/paid; 1:1 → `money_on_hold` | success URL = `/a/{answerToken}?paid`; cancel URL = `/i/{token}` |
| **Coach** `POST /coach/training-events/{id}/invites {crmClientIds[], phones[]}` | mint personal tokens, create *Invited* rows, return `[{contact, link, message}]` | the server sends nothing |
| **Coach** cancel / reschedule responses | add `webParticipants[] {name, phone, answerLink}` | additive |
| Config | share-link base URL → `https://book.321.fit` | the app's resolver `GET /e/{short_id}` stays |

Backward compatibility: everything is **additive** — new namespace, new fields on two responses, one config value. No existing endpoint changes shape.

## 7. Business rules

- **Identity** — phone is the only key. A web person is a CRM contact of *this* coach; the same phone with another coach is another contact (as CRM works today). Signing up in the app later with that phone links every contact by `crm_auto_link`.
- **Seats** — a generic-link register takes a seat when payment is confirmed (card) or immediately (cash/free). A personal *Invited* row does **not** hold a seat (#44's open question — proposal: no hold; the page says "3 seats left" and 409s when they are gone).
- **Payment** — card: Checkout must succeed before the seat is taken; abandoned Checkout = nothing recorded. Cash: owed; settled by the coach in the existing completion flow. Refunds on cancellation follow the session's cancellation policy through the existing refund path; the page shows `refund_pending` → `refunded`.
- **Privacy** — the page shows the event and the coach's public profile facts; other participants are a count and anonymous plates. `phoneMasked` on a personal link; the full phone only to prefill the input, and the backend may withhold it.
- **Security** — tokens are unguessable (≥ 128 bit); a personal token expires with the event; `answerToken` outlives it (the page still shows "past"). OTP: 6 digits, 5 attempts, resend after 30 s, per-phone and per-IP rate limits on `send`. Decline by link is accepted without OTP (low impact, reversible on the page).
- **Whose clock** — the page renders in the coach's timezone and says "Riga time" when the viewer's differs (#836 lesson).
- **Platform-aware, never asked** — the page reads the device: **iOS / desktop** → "Add to calendar" opens a sheet (Apple Calendar via `.ics` · Google Calendar template link); **Android** → straight to Google Calendar. The entry's description carries the coach's note + the `/a/` link, so the calendar leads back to the living page. Store buttons the same way: App Store on iOS, Google Play on Android, both on desktop. `?platform=ios|android|desktop` overrides for review.
- **The app** — after registering, "Get the app" links to the stores (OneLink later); never a gate.

## 8. Open questions

1. Personal *Invited* row: hold a seat or not (shared with #44). Proposal above: no hold.
2. `training_invitation` extended with "who" vs a new table — backend's call, see § 3.
3. Email for change notifications — send from the backend when given (yes in v1?), or leave everything to the coach's "Notify" action.
4. The reference to "coach profile" from the page (tap the coach line) — a public web profile does not exist; v1 = no link.
5. Waitlist when full — not in v1 (backend has no waitlist).

## 9. Hand-off

- **Backend** (poly-backend): § 6 — implement `PublicApi` 1:1; the mock is the reference for shapes and error codes (`not_found · expired · bad_code · rate_limited · full`). Doc as `poly-backend/docs/web-invite-api.md`.
- **Web** (stand): replace `api/index.ts`'s mock with a `fetch` implementation over the same-host proxy; deploy `book.html` to `book.321.fit`; add AASA / assetlinks; real store links.
- **iOS / Android**: invite picker send channels (§ 4.2), roster `source` badge, "Notify web participants" on cancel/reschedule (§ 4.3).

## Change log
- 2026-09-17 — user + system stories (§ 1a/1b) added before cutting poly-backend issue.
- 2026-09-17 — first draft: decisions from #46, all invitee screens built on mocks in `stand/book.html`, contract in `public.ts`, `fit-ui-rework.css` lifted out of the drafts.
