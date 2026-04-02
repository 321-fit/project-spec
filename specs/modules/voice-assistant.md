# Voice Assistant

> Last updated: 2026-04-02

## Overview
AI-powered voice interface integrated into the iOS app via LiveKit WebRTC. Users can manage training sessions, schedules, and bookings by voice. The assistant understands context (user role, history, connections) and has 40 function tools to interact with the backend.

## Current State
Fully implemented across iOS (client) and voice_control service (server). Backend provides API that the voice assistant calls.

## Components

### Voice Control Service (Server)
- Entry point: `src/__main__.py` — runs API (port 8000) + Worker (port 8001)
- Agent: `src/adapters/agents/lk_agent.py` — system prompt, tools, context
- Tools: `src/adapters/agents/tools/` — 40 function tools
- Backend client: `src/adapters/agents/tools/client/client.py`
- Entity resolution: `src/adapters/agents/mapping/`

### iOS (Client)
- Voice assistant tab: `TabBar/Tabs/VoiceAssistantTab/`
- ViewModel: `VoiceAssistantTab/VoiceAssistantViewModel.swift`
- Chat: `VoiceAssistantTab/Chat/`
- Control bar: `VoiceAssistantTab/ControlBar/`
- Network: `VoiceAssistantTab/Network/LiveKitNetworkService.swift`

### Backend
- Child session tokens: `POST /api/v1.0.0/token/create-child-session/`
- All standard API endpoints called by voice tools

### Android (Planned)
- Same LiveKit SDK integration
- Same connection flow (POST /sessions/connect)
- Same chat + voice UI components
- Same interaction modes (voice, text)

## Connection Flow

```
iOS App → POST /sessions/connect (JWT + role)
    ↓
Voice Service validates JWT → fetches user context (profile, history, schedule, connections)
    ↓
Creates LiveKit room → returns token + server URL
    ↓
iOS joins LiveKit room (WebRTC)
    ↓
Worker picks up job → creates AI agent with full user context + 40 tools
    ↓
User speaks ↔ Agent responds (voice + transcription)
```

## Connection States (iOS)

| State | Description |
|---|---|
| `.disconnected` | Initial state, not connected |
| `.connecting` | Connection in progress |
| `.connected` | Successfully connected to agent |
| `.reconnecting` | Attempting to reconnect after drop |

- **Agent connection timeout:** 10 seconds
- **Max reconnection attempts:** 3
- **Reconnection delays:** configurable (1.0s base, 3.0s backend)

## Interaction Modes

```swift
enum InteractionMode {
    case voice  // Audio input/output
    case text   // Text chat input
}
```

User can toggle between voice and text modes at any time via control bar.

## UI Components (iOS)

### Chat View (`Chat/View/ChatView.swift`)
- Message feed with scrollable history
- Topic overlay (training event preview cards)
- Empty state banner when no messages

### Chat Text Input (`Chat/View/ChatTextInputView.swift`)
- Multiline text field (up to 3 lines)
- Send button (arrow icon when text entered)
- Microphone icon for voice toggle
- "End" button visible in voice mode
- Disabled when `connectionState != .connected`

### Control Bar (`ControlBar/ControlBar.swift`)
- Text input button (if `.text` feature enabled)
- Audio controls (if `.voice` feature enabled)
- Mic toggle with audio visualizer
- Mode toggle: voice ↔ text

### Interaction Views
- `TextInteractionView` — chat + text input layout
- `VoiceInteractionView` — agent participant display + media preview

### Error View (`Error/ErrorView.swift`)
- Snackbar-style error display
- Dismiss button
- Shows `error.localizedDescription`

## Agent Features

```swift
enum AgentFeatures {
    case voice
    case text
    case video  // Not active in V1
}
// Current: [.voice, .text]
```

## Voice Tools (40 total)

### By Role

| Role | Tool Count | Categories |
|---|---|---|
| Common (both) | ~9 | Balance, user info, events, entity resolution |
| Coach only | 22 | Event CRUD, clients, schedule, availability, pending requests |
| Athlete only | 9 | Booking, rescheduling, coach availability |

### Key Tool Categories
- **Event Management** — create, update, cancel events (with confirmation flow)
- **Availability** — check free slots for coaches/athletes
- **Info** — balance, profile, sports, addresses, work hours
- **Entity Resolution** — fuzzy match voice input names to database IDs
- **System** — send display messages to iOS app

See [voice_control documentation](../../voice_control/docs/DOCUMENTATION.md) for complete tool reference.

## Entity Resolution

When user says a name ("Book with John"), the agent resolves it to a database ID:
- 4 mappers: Users, Sport, TrainingEvent, Address
- LLM-based confidence scoring (0-100)
- High confidence (>80): use directly
- Medium (50-80): ask user to clarify
- Low (<50): report not found

## Real-time Transcription

Agent sends speech-to-text for both user and agent to the iOS app:
- Topic: `lk.transcription` via LiveKit data messages
- Displayed in chat UI as message bubbles
- Enables text transcript of voice conversation

## Agent Context

On connection, the agent receives:
- User profile (name, role, email, timezone)
- Training history (compressed to fit context window)
- Weekly schedule
- Connected users (coaches/athletes)
- App UI navigation map (for "where do I find..." questions)
- System prompt (~550 lines of domain knowledge and rules)

## Known Issues / Tech Debt
- Video feature flag exists but not active
- Agent connection timeout (10s) may be too short on slow networks
- Transcription quality depends on OpenAI Realtime API
- Entity resolution can fail with very common names
