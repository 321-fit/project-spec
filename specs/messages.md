# Direct Messages (DM)

> Status: Draft
> Prototype: [shared/messages.html](https://321-fit.github.io/project-spec/prototypes/flows/shared/messages.html)
> Last updated: 2026-06-23

## Overview

Lightweight **1:1 direct messaging** between connected users (athlete ↔ coach), Strava-style. **Separate from the notification Inbox** — the Inbox stays for system notifications ([one bell, one Inbox]); DMs are a parallel surface with their own header icon. Group chat is out of v1.

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
2. **New message** (`s-new-message`) — search + people **you're connected with** (athlete → your coaches; coach → your athletes). Tap a person → opens the thread (single 1:1). `Close` → back to list.
3. **Thread** (`s-thread`) — date separators + **UNREAD MESSAGES** divider; bubbles (mine = faint brand tint right; theirs = neutral surface left), read tick. Header = name + presence ("last seen…") → tap → settings. Composer = **text field + send**. *(Attach / share-a-session "+" is hidden for v1 — flow to be designed later.)*
4. **New thread (empty)** — person header + "Say hi to start the conversation."
5. **Conversation settings** (`s-thread-settings`) — paired avatars · "You and X" · **Mute** toggle (keeps the chat, stops notifications) · **Delete conversation** (destructive → confirm sheet).

**Entry points:** the **Messages icon** in the Dashboard/Home header (left of the notification bell), on both athlete and coach. Individual threads also open from existing "Send Message" actions on coach/athlete profiles + participant sheets.

## Data Model (new)

**`conversation`** — `id`, `created_by` (profile id), participants (exactly 2 in v1), `created_at`, `updated_at`, `last_message_at`.
**`conversation_participant`** — `conversation_id`, `profile_id`, `muted` (bool), `last_read_message_id` (read cursor), `deleted_at` (per-user soft delete / leave).
**`message`** — `id`, `conversation_id`, `sender_profile_id`, `body` (text), `created_at`, `deleted_at`.

Unread count per user = messages after their `last_read_message_id` (cross-conversation sum for the header badge).

## API (new — additive)

| Method | Path | Description |
|---|---|---|
| GET | `/messages/conversations` | List conversations (other party, last message, unread count) |
| POST | `/messages/conversations` | Start (or return existing) a 1:1 with a connected user |
| GET | `/messages/conversations/{id}/messages?before=&limit=` | Paginated history (cursor) |
| POST | `/messages/conversations/{id}/messages` | Send a message |
| POST | `/messages/conversations/{id}/read` | Advance read cursor (`last_read_message_id`) |
| PUT | `/messages/conversations/{id}/mute` | Mute / unmute |
| DELETE | `/messages/conversations/{id}` | Delete (per-user soft delete) |
| GET | `/messages/unread-count` | Header badge (DM unread total — separate from notifications) |
| GET | `/messages/recipients?q=` | Connected users you can message (coaches / athletes) |

Eligibility: you can only start/send to a user you're **connected with** (athlete↔coach relationship). Enforce server-side.

## Delivery model (decided 2026-06-23)

Mobile sockets die when the app is backgrounded/closed → **never the delivery backbone**.

- **Source of truth = REST + DB.** Every message is `POST`ed and stored.
- **App closed / background → APNs / FCM alert push** (guaranteed channel: "John: …"). New notification category (DM message). On open → `GET messages?before=cursor` to sync.
- **Silent push** (`content-available`) = opportunistic pre-sync / badge only — iOS throttles it, **not** relied upon for delivery.
- **App foreground (thread open) → realtime** for instant delivery + typing/read/presence. **v1 = poll-on-open + pull-to-refresh** (no socket needed). **WS/SSE is Phase 2** (typing, read receipts, presence "last seen"). Do **not** reuse the LiveKit room/data-channel for DMs — it's session-scoped and has the same backgrounding limit.

## Business rules
- 1:1 only (no group) in v1.
- Only between connected users; eligibility enforced server-side.
- Mute = stop push notifications, conversation stays in the list.
- Delete = per-user soft delete (the other party keeps their copy).
- Unread badge on the Messages icon is **DM-only**, separate from the notification bell count.

## Not in V1
- Group conversations.
- Attachments / share-a-session in the composer (the "+" is hidden — flow TBD).
- Typing indicators, read receipts, presence ("last seen") — Phase 2 (needs the realtime WS/SSE layer).
- Realtime websocket transport (poll-on-open is enough for launch).

## Platform notes
See [architecture/design-system.md](../architecture/design-system.md). Bubble grammar matches the voice assistant (mine = faint brand tint, theirs = neutral surface). a11y ids: `messages.*` in [accessibility-identifiers.md](../architecture/accessibility-identifiers.md).
