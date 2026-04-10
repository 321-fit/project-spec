# Messenger

> Status: Draft
> Created: 2026-04-02
> Last updated: 2026-04-02

## Problem
Athletes and coaches currently have no way to communicate within the app. All communication happens outside the platform (WhatsApp, SMS), which breaks the user experience and disconnects conversations from the booking context.

## User Stories
- As an athlete, I want to message my coach directly so that I can discuss training details without leaving the app
- As a coach, I want to send session proposals in chat so that the booking flow feels natural and conversational
- As a user, I want to see session cards inside the chat so that I have full context of our training history
- As a coach, I want to broadcast announcements to all my athletes so that I can share schedule changes and updates

## Requirements

### Functional

#### Conversation Types
- [ ] `direct_chat` — 1:1 athlete ↔ coach (V1)
- [ ] `ai_chat` — user ↔ AI assistant (V1)
- [ ] `broadcast_channel` — 1 → many, coach only writing (V2)

#### Message Types
- [ ] `text` — plain text messages
- [ ] `voice` — voice recordings (hold to record, cancel gesture, playback before send)
- [ ] `image` — photo from camera or gallery (single image per message V1, optional caption)
- [ ] `session_request` — structured session card (NOT plain text)
- [ ] `session_update` — session status change card
- [ ] `system_message` — system notifications (center aligned)

#### Chat List (Inbox)
- [ ] Accessible via bottom navigation bar (same for both roles)
- [ ] Each row: avatar, name, last message preview, timestamp, unread indicator
- [ ] AI Assistant pinned as first chat (cannot be unpinned, visually separated)
- [ ] Empty state with illustration + CTA "Start a conversation"
- [ ] Search by name (real-time, case insensitive)

#### Chat Screen
- [ ] Header: back button, avatar, name (tap → profile), schedule session icon
- [ ] Text input + send button + voice recording button
- [ ] Messages: right aligned (sent), left aligned (received), center aligned (system)
- [ ] Read receipts (double check mark when seen)
- [ ] Typing indicator ("{Name} is typing...")

#### Session Cards Inside Chat
- [ ] Card contains: date, time, duration, sport, location, price, payment method, status badge
- [ ] Statuses: request, scheduled, declined, canceled, completed
- [ ] Actions depend on role and status:
  - Coach receives request → Accept / Decline / Edit
  - Athlete receives edit → Accept / Decline
- [ ] Edit opens same booking flow used elsewhere (NO duplicate flow logic)

#### Roles & Visibility
- [ ] Chats are shared between roles (same conversation if user switches athlete ↔ coach)
- [ ] Role indicator in chat header ("Viewing as Coach" / "Viewing as Athlete")
- [ ] Profile navigation respects role (coach taps → client details, athlete taps → coach profile)

#### Creating Conversations
- [ ] Entry points: coach profile, athlete profile, client details, search results
- [ ] If conversation exists → open existing
- [ ] If not → create new direct_chat, no system message required

#### Booking Flow From Chat
- [ ] Schedule icon in header → opens session booking flow (select type → calendar → confirm → send request)
- [ ] Session request appears as session_request message in chat
- [ ] Both roles can initiate booking from chat

#### Image Messaging
- [ ] Sources: camera, gallery
- [ ] Single image per message (V1), optional caption field in same message object
- [ ] Image preview: rounded corners, max 70% screen width, tap → full screen (pinch to zoom)
- [ ] Upload states: uploading (progress), sent, failed (tap to retry)
- [ ] Client-side compression (max 2048px, JPEG 70-80%)
- [ ] Storage: S3 with signed URLs (time-limited, no public URLs)
- [ ] Three sizes: full resolution, compressed display, thumbnail

#### Notifications
- [ ] Push on: new message, new session request, session accepted/declined, voice message
- [ ] Push includes sender name + short preview
- [ ] In-app: unread badge in nav bar, unread indicator per chat

### Non-Functional
- [ ] Real-time messaging (WebSockets or Firebase)
- [ ] Message delivery states: sent, delivered, read
- [ ] Message pagination: load latest 20, infinite scroll upward
- [ ] Voice files stored in S3, linked via message ID
- [ ] Images private to conversation participants (signed URLs)
- [ ] Camera + photo library permissions with graceful fallback

## Affected Repos
- [ ] `321fit_ios` — full messenger UI, chat list, chat screen, session cards, voice/image messaging
- [ ] `poly-backend` — conversation API, message storage, WebSocket/Firebase, push notifications, media upload
- [ ] `voice_control` — potential integration (AI assistant as pinned chat)
- [ ] **Android** — same feature set as iOS (V1 parity)

## API Changes (Proposed)
- `GET /conversations` — list user's conversations (paginated)
- `POST /conversations` — create conversation
- `GET /conversations/{id}/messages` — message history (paginated)
- `POST /conversations/{id}/messages` — send message
- `PATCH /messages/{id}/read` — mark as read
- `POST /media/upload` — upload voice/image
- WebSocket endpoint for real-time messaging

## UI/UX
- Chat list tab in bottom navigation
- Chat screen with session cards inline
- Voice recording with hold-to-record, cancel gesture
- Image preview with pinch to zoom
- Typing indicator, read receipts

## Edge Cases
- User blocked (future): disable input, show system message
- Session deleted: replace card with "This session is no longer available"
- Payment failed: status badge "Payment Failed" + CTA "Retry Payment"
- User deletes app: messages remain in backend, sync on login
- Image deleted from storage: "This image is no longer available"
- Dual-role user sees same conversation history regardless of active role

## V2 — Coach Broadcast Channel
- Channel type: `broadcast_channel`, created by coach
- Coach can post messages and session info, add/remove athletes
- Athletes: read only, cannot write, can leave
- Use cases: group training updates, schedule changes, announcements
- UI: "Channel" label in header, no composer for athletes, participant list

## Future Enhancements (Don't Build Yet)
- Multiple images per message
- Video support
- Image annotations
- Search inside messages
- Auto-suggest booking times
- Payment reminders via AI
