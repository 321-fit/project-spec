# System Architecture Overview

> Last updated: 2026-04-02

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                     │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │   iOS App    │  │ Android App  │  │    Voice Assistant UI     │  │
│  │  (SwiftUI)   │  │  (Planned)   │  │   (LiveKit in iOS/And)   │  │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬─────────────┘  │
│         │                  │                       │                │
└─────────┼──────────────────┼───────────────────────┼────────────────┘
          │ REST API         │ REST API              │ WebRTC (LiveKit)
          │ (HTTPS)          │ (HTTPS)               │ (WSS)
          ▼                  ▼                       ▼
┌─────────────────────────────────┐    ┌──────────────────────────────┐
│        BACKEND API              │    │     VOICE CONTROL SERVICE    │
│     (poly-backend)              │    │      (voice_control)         │
│                                 │    │                              │
│  ┌───────────────────────────┐  │    │  ┌────────────────────────┐  │
│  │   Litestar (ASGI)        │  │    │  │  FastAPI (port 8000)   │  │
│  │   /api/v1.0.0/           │  │◄───│  │  Session management    │  │
│  └───────────────────────────┘  │    │  └────────────────────────┘  │
│  ┌───────────────────────────┐  │    │  ┌────────────────────────┐  │
│  │   Celery Workers         │  │    │  │  LiveKit Agent (8001)  │  │
│  │   (notifications,        │  │    │  │  GPT-4 Realtime        │  │
│  │    calendar sync)        │  │    │  │  40 function tools     │  │
│  └───────────────────────────┘  │    │  └────────────────────────┘  │
│  ┌───────────────────────────┐  │    │                              │
│  │   Celery Beat            │  │    └──────────────────────────────┘
│  │   (periodic tasks)       │  │
│  └───────────────────────────┘  │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      DATA & INFRASTRUCTURE                          │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  PostgreSQL   │  │    Redis     │  │      AWS S3              │  │
│  │  (primary DB) │  │  (Celery     │  │  (avatars, files)        │  │
│  │              │  │   broker)    │  │  + CloudFront CDN        │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                     THIRD-PARTY SERVICES                            │
│                                                                     │
│  ┌──────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐ ┌───────────┐  │
│  │  Stripe  │ │ Firebase │ │ Twilio │ │ SendGrid │ │  Sentry   │  │
│  │ Payments │ │   FCM    │ │  SMS   │ │  Email   │ │  Errors   │  │
│  │ Connect  │ │  Push    │ │  OTP   │ │          │ │           │  │
│  └──────────┘ └──────────┘ └────────┘ └──────────┘ └───────────┘  │
│                                                                     │
│  ┌──────────────┐ ┌────────────────┐ ┌──────────────────────────┐  │
│  │ Google OAuth  │ │ Google Calendar│ │    Apple Sign-In         │  │
│  │ Google Maps   │ │ (webhooks)     │ │    Apple Calendar        │  │
│  │ Google Places │ │                │ │    (CalDAV)              │  │
│  └──────────────┘ └────────────────┘ └──────────────────────────┘  │
│                                                                     │
│  ┌──────────────┐ ┌────────────────┐                               │
│  │  AppsFlyer   │ │  LiveKit Cloud │                               │
│  │  Deep Links  │ │  WebRTC Infra  │                               │
│  └──────────────┘ └────────────────┘                               │
└─────────────────────────────────────────────────────────────────────┘
```

## Deployment

### Hosting: Railway

All backend services are deployed on Railway.

| Service | Environment | URL |
|---|---|---|
| Backend API | PROD | `321f-v2-backend-service-production.up.railway.app` |
| Backend API | DEV | `321fit-backend-new-v2-test.up.railway.app` |
| Voice Control | PROD | `pleasant-rebirth-production-f0cb.up.railway.app` |
| Voice Control | DEV | `voicecontrol-test.up.railway.app` |

### Backend Services (per environment)

| Service | Container | Command |
|---|---|---|
| API | Dockerfile | `uv run backend alembic upgrade head && uv run backend api` |
| Celery Worker | Dockerfile | `uv run backend celery worker --loglevel=info --concurrency=3` |
| Celery Beat | Dockerfile | `uv run backend celery beat --loglevel=info` |
| PostgreSQL | postgres:latest | Managed by Railway |
| Redis | redis:latest | Managed by Railway |

### Voice Control (per environment)

| Service | Container | Command |
|---|---|---|
| API + Worker | Dockerfile | `uv run -m src` (runs both on ports 8000 + 8001) |

### iOS App

| Config | Backend | Voice | Bundle ID |
|---|---|---|---|
| PROD | production railway | production railway | `com.threetwoonefit.app` |
| BETA | production railway | production railway | `com.threetwoonefit.app` |
| DEV | test railway | test railway | `com.threetwoonefit.app` |

- **Distribution:** TestFlight → App Store
- **Apple App ID:** `6471964595`
- **Current version:** 1.36 (build 5)
- **App icons:** `AppIconPROD` (production), `AppIconDEV` (development)

### Android (Planned)
- Same backend and voice URLs as iOS
- Google Play distribution

## Communication Patterns

### iOS/Android ↔ Backend
- **Protocol:** HTTPS REST API
- **Base path:** `/api/v1.0.0/`
- **Auth:** JWT (`JWT {token}` header)
- **Serialization:** JSON (camelCase on wire, snake_case in backend)
- **Token refresh:** automatic on 401

### iOS/Android ↔ Voice Assistant
1. App calls `POST /sessions/connect` on voice service (HTTPS)
2. Voice service validates JWT with backend, fetches user context
3. Returns LiveKit token + server URL
4. App connects to LiveKit Cloud (WebRTC/WSS)
5. Real-time bidirectional audio + data messages

### Voice Assistant ↔ Backend
- **Protocol:** HTTPS REST API (same `/api/v1.0.0/`)
- **Auth:** Child JWT session tokens
- **Auto-refresh:** on 401
- **40 function tools** call backend endpoints on behalf of user

### Backend ↔ External Services
- **Stripe:** REST API (payments, webhooks)
- **Firebase:** Admin SDK (FCM push)
- **Twilio:** REST API (SMS/OTP)
- **SendGrid:** REST API (email)
- **Google Calendar:** REST API + Webhooks (bidirectional sync)
- **Apple Calendar:** CalDAV protocol
- **AWS S3:** SDK (file upload/download)
- **Sentry:** SDK (error reporting)

## Environment Isolation

### Backend
- Separate Railway deployments per environment
- Separate databases and Redis instances
- Environment variable configuration

### Voice Control
- Room names prefixed with environment: `{env}-{user_uuid}_{random}`
- Worker rejects jobs from wrong environment
- Agent naming: `voice-assistant-{environment}`

### iOS
- xcconfig files per environment (PROD, BETA, DEV)
- Different base URLs per config
- Same bundle ID across environments (different app icons)

## Scaling Considerations

| Component | Current | Scale Path |
|---|---|---|
| Backend API | Single Railway instance | Horizontal (multiple instances) |
| Celery Workers | Single worker (concurrency=3) | Add workers, separate queues |
| PostgreSQL | Single instance | Read replicas, connection pooling |
| Redis | Single instance | Redis Cluster |
| Voice Control | Single container (2 threads) | Separate API and Worker containers |
| LiveKit | Cloud-hosted | Managed by LiveKit |
