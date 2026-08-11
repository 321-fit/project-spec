# Direct Messages (DM)

> Status: Approved
> Prototype: [shared/messages.html](https://321-fit.github.io/project-spec/prototypes/flows/shared/messages.html)
> Backend: [poly-backend/docs/messaging-api.md](../../poly-backend/docs/messaging-api.md) — shipped; canonical endpoint + realtime reference.
> Last updated: 2026-07-17
> Supersedes the earlier `messenger.md` draft (session-cards-in-chat, voice, images/S3, broadcast channel, WebSocket backbone, bottom-nav tab — dropped or moved to the deferred list below).

## Overview

Lightweight **direct messaging** between users (athlete ↔ coach), Strava-style — **1:1 and group**. *(Who may start a chat with whom — any user vs. connected-only — is an **open product decision**; see [Messaging eligibility](#messaging-eligibility-open) below.)* **Separate from the notification Inbox** — the Inbox stays for system notifications ([one bell, one Inbox]); DMs are a parallel surface with their own header icon. **Group chat is created by multi-selecting people** in New message (no separate "create a group" flow — minimal effort).

> Reverses the earlier "no messenger yet" deferral (group-training cancellation etc.). Direct messaging is now in scope.

## User Stories

### Athlete
- As an athlete, I want to message a coach I train with, to ask a question or coordinate.
- As an athlete, I want to see my conversations and unread state at a glance.

### Coach
- As a coach, I want to message my athletes 1:1.
- As a coach, I want to mute or delete a conversation.

### System
- As the system, I deliver a message reliably even when the recipient's app is closed (push), and instantly when it's open.

## Screens & Flows

Prototype: `shared/messages.html` (role-aware — athlete light = chats with coaches; coach dark = chats with athletes).

1. **Messages list** (`s-messages`) — header: back · "Messages" · **compose ✎**. Rows: avatar + name + last-message preview + time. Unread = bold preview + brand dot; read = grey check + time. Empty state → "New message" CTA.
2. **New message** (`s-new-message`) — search + a people list (the prototype shows those **you're connected with**: athlete → your coaches, coach → your athletes — but the picker's source depends on the unresolved [eligibility decision](#messaging-eligibility-open), and the backing `/recipients` endpoint is not yet shipped), each with a **checkbox (multi-select)**. **Create** (top-right, enables on first pick): **1 selected → 1:1 thread**, **2+ selected → group chat**. `Close` → back to list.
3. **Thread (1:1)** (`s-thread`) — date separators + **UNREAD MESSAGES** divider; bubbles (mine = faint brand tint right; theirs = neutral surface left), read tick. Header = name + presence ("last seen…") → tap → settings. Composer = **text field + send**. *(Attach / share-a-session "+" is hidden for v1 — flow to be designed later.)*
4. **New thread (empty)** — person header + "Say hi to start the conversation."
5. **1:1 settings** (`s-thread-settings`) — paired avatars · "You and X" · **Mute** toggle · **Delete conversation** (destructive → confirm sheet).
6. **Group thread** (`s-group-thread`) — stacked-avatar header + name + "You, Marco, Julia +1 · N members" → tap → group settings. Bubbles are **sender-attributed** (name + avatar for others; mine plain right). Composer = text + send.
7. **Group settings** (`s-group-settings`) — Strava-style: hero (stacked avatars + name + "You started this conversation") then plain `.set-card` rows: **Change name** (→ Change-name screen) · **Participants** (count → list screen) · **Add participants** (→ multi-select picker) · **Mute conversation** (toggle) · **Participants can invite** (toggle — admin lets members add others) · footer **Delete conversation**. Admin sees Delete + Change name + member removal; a non-admin member sees **Leave** and no admin-only toggles.
8. **Participants** (`s-group-participants`) — reached from the Participants row: **Add participants** at top + member list (creator = Admin); each member has a red "−" **remove** (admin/creator only, confirm).
9. **Change name** (`s-group-rename`) — push screen from the Change name row: header Cancel / Save; single text field (pre-filled, autofocus) + 40-char counter + helper. Save → `PATCH /conversations/{id}` title. Admin only.

**Entry points:** the **Messages icon** in the Dashboard/Home header (left of the notification bell), on both athlete and coach. Individual threads also open from existing "Send Message" actions on coach/athlete profiles + participant sheets.

## Data Model (new)

**`conversation`** — `id`, `created_by` (profile id), `is_group` (bool), `title` (nullable — group name; 1:1 derives the title from the other party), `members_can_invite` (bool, default false — group only; if false only admin adds), `created_at`, `updated_at`, `last_message_at`. **2 participants = 1:1, 3+ = group.**
**`conversation_participant`** — `conversation_id`, `profile_id`, `role` (`admin` for the creator / `member`), `muted` (bool), `last_read_message_id` (read cursor), `deleted_at` (per-user soft delete / **leave**).
**`message`** — `id`, `conversation_id`, `sender_profile_id`, `body` (text), `created_at`, `deleted_at`. (Group bubbles are sender-attributed via `sender_profile_id`.)

Unread count per user = messages after their `last_read_message_id` (cross-conversation sum for the header badge).

## API (shipped — additive)

All bodies are **camelCase**; base path is `/api/v1.0.0/messages`. Full request/response shapes + error codes → [`poly-backend/docs/messaging-api.md`](../../poly-backend/docs/messaging-api.md).

| Method | Path | Description |
|---|---|---|
| GET | `/messages/conversations` | List conversations (`offset`/`limit`; `X-Has-More` header). Each row carries the other party/participants, `lastMessage`, `unreadCount`, `muted` |
| POST | `/messages/conversations` | Create with `participantUserIds[]` (caller auto-added, excluded from the list) + optional `clientRequestId`: **1** other id → return-or-create 1:1; **2+** → new **nameless** group (rename later via `PATCH`) |
| GET | `/messages/conversations/{id}` | **Conversation details** (single `ConversationResponse`) |
| GET | `/messages/conversations/{id}/messages?before=&limit=` | Paginated history (newest-first cursor; `X-Has-More` header) |
| POST | `/messages/conversations/{id}/messages` | Send a message (`text` + optional `clientMessageId`) |
| POST | `/messages/conversations/{id}/read` | Mark the conversation read (advances read cursor) |
| PATCH | `/messages/conversations/{id}` | **Settings** — `muted` (any member); `title` (rename) + `allowMemberInvite` (admin only). Returns the full updated conversation |
| POST | `/messages/conversations/{id}/participants` | **Add people to a group** (`participantUserIds[]`) |
| DELETE | `/messages/conversations/{id}/participants/{userId}` | **Remove a member** (admin/creator only) |
| DELETE | `/messages/conversations/{id}` | 1:1 → leave (row retained for the other side); group non-admin → leave; group admin → **delete for everyone** (soft delete) |

**Idempotency:** send accepts an optional `clientMessageId` and group-create an optional `clientRequestId` (both ≤ 64 chars) — a retry with the same key returns the original message/group instead of a duplicate, so a re-POST after a lost response or double-tap is safe. `clientMessageId` is echoed back only to the message's author.

**Rate limits:** `POST …/messages` is throttled per user (currently **30 / 10s**); group writes — group-create + add-participants — have a separate budget (**20 / 60s**). Over-limit → `429` with a `Retry-After` header; the limiter fails open. 1:1 open is idempotent and unthrottled.

**Re-checked 2026-08-11:** `GET /messages/recipients?q=` **has shipped** since the July audit — the
people-picker has its source. `GET /messages/unread-count` is still **not built**, so the header badge
stays a client-side sum of per-conversation `unreadCount`. Only the second one is still tied to the
eligibility decision below.

### Messaging eligibility (open) {#messaging-eligibility-open}

**Open product decision — WIP, do not treat as settled.** Two candidate rules:

- **Connected-only** (the earlier spec intent): you can only start/send to a user you're in a coach↔athlete relationship with.
- **Any-user** (what backend ships today): any authenticated user may message any other by id; self-messaging is rejected, and messaging is refused **both directions** with `403` if either party has **blocked** the other in the CRM. For groups the block is enforced only at create / add-member; sending into an existing shared group ignores blocks.

The backend currently implements **any-user, block-aware**. The **connected-only gate is undecided**; if product chooses it, it becomes a backend change (+ the `/recipients` and `/unread-count` endpoints above). Until resolved, keep the eligibility discussion here rather than asserting either rule in the flows.

## Delivery model (decided 2026-06-23; WS shipped in v1)

Mobile sockets die when the app is backgrounded/closed → the socket is a **live-sync channel, not the durable backbone**. Durability is REST + DB + push; the WebSocket makes the foreground experience realtime.

- **Source of truth = REST + DB.** Every message is `POST`ed and stored; REST is always the recovery path.
- **App closed / background → APNs / FCM alert push** (guaranteed channel). 1:1 uses the `new_message` template ("John: …"); groups use `new_group_message` (names the group — title or a members-derived name). Muted conversations suppress push. Push is best-effort — a failure never blocks the send. On open → `GET …/messages?before=cursor` to catch up.
- **App foreground → realtime over WebSocket** — `GET /messages/ws` **shipped in v1** (not Phase 2). The socket authenticates itself with the access token (`Sec-WebSocket-Protocol` preferred, `?token=` fallback; bad/expired token → close `4401`; ≤ 5 sockets/user/process). It carries, server→client only:
  - **`message.created`** — new message to all active participants incl. the sender's other devices (de-dupe by `id`; payload strips `isMine`/`clientMessageId`).
  - **`message.read`** — **read receipts** (conversation-level) — `{conversationId, userId}` to all participants so unread badges clear across devices.
  - **`conversation.created` / `.updated` / `.member_removed` / `.deleted`** — **group sync**; the client refetches the affected conversation.
- Do **not** reuse the LiveKit room/data-channel for DMs — it's session-scoped and has the same backgrounding limit.

**Read receipts are shipped** at **conversation level** (a "read up to now" cursor via `POST …/read`, broadcast as `message.read`), not per-message ticks. **Typing indicators and presence ("last seen") remain Phase 2.**

## Business rules
- **1:1 and group.** Group = a conversation with 3+ participants, created by multi-select in New message. No separate "create group" flow. **Group cap = 50 members** (including the creator).
- **Eligibility is an open decision** (see [Messaging eligibility](#messaging-eligibility-open)) — backend ships **any-user, block-aware** today (blocked either-direction → `403`); a **connected-only** gate is undecided. Blocks are enforced server-side at 1:1 send and at group create / add-member (existing groups ignore blocks on send).
- **Rate-limited server-side:** messages 30 / 10s, group writes 20 / 60s → `429` + `Retry-After` (fails open). Clients should honor `Retry-After` and reconcile optimistic sends via `clientMessageId`.
- Mute = stop push notifications, conversation stays in the list.
- **1:1 → Delete** (per-user soft delete; other party keeps their copy). **Group → Leave** (you exit; group continues for the rest).
- Group bubbles are **sender-attributed**; 1:1 are not. Creator = `admin`; **admin can rename, add/remove members, and toggle `members_can_invite`** (rename + remove + toggle = admin only). When `members_can_invite` is on, non-admins may also add. **Admin → Delete conversation; non-admin member → Leave.** Any member can Leave.
- Unread badge on the Messages icon is **DM-only**, separate from the notification bell count.

## Not in V1
- Group avatar/photo (v1 = stacked member initials only).
- Attachments / share-a-session in the composer (the "+" is hidden — flow TBD).
- **Typing indicators** and **presence ("last seen")** — Phase 2. *(Realtime WebSocket transport and conversation-level read receipts already **shipped in v1** — see [Delivery model](#delivery-model-decided-2026-06-23-ws-shipped-in-v1); per-message read ticks stay Phase 2.)*
- **In-chat session cards + book-from-chat** — structured `session_request` / `session_update` messages with inline Accept / Decline / Edit, reusing the canonical booking flow (no duplicate logic). Deferred (was core in the old Messenger draft).
- **Voice messages** (hold-to-record, playback-before-send). Deferred.
- **Coach broadcast channel** — 1→many announcements, athletes read-only, no composer. Deferred (was Messenger "V2").

## Platform notes
See [architecture/design-system.md](../architecture/design-system.md). Bubble grammar matches the voice assistant (mine = faint brand tint, theirs = neutral surface). a11y ids: `messages.*` in [accessibility-identifiers.md](../architecture/accessibility-identifiers.md).
