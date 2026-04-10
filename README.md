# 321Fit — Project Spec

Central repository for product specifications, feature requests, and project documentation for the 321Fit platform.

## Structure

```
project-spec/
├── specs/                          # All specs (flat, status in header)
│   ├── authentication.md           # Status: Implemented
│   ├── onboarding.md               # Status: Implemented
│   ├── dashboard.md                # Status: Implemented
│   ├── clients-coaches.md          # Status: Implemented
│   ├── coach-calendar.md           # Status: Implemented
│   ├── athlete-schedule.md         # Status: Implemented
│   ├── event-statuses.md           # Status: Implemented
│   ├── payments.md                 # Status: Implemented
│   ├── google-apple-calendar.md    # Status: Implemented
│   ├── voice-assistant.md          # Status: Implemented
│   ├── profile-settings.md         # Status: Implemented
│   ├── deep-linking-referrals.md   # Status: Implemented
│   ├── notifications.md            # Status: Implemented
│   ├── group-training.md           # Status: Draft (NEW)
│   └── messenger.md                # Status: Draft
├── prototypes/                     # Interactive HTML prototypes
│   ├── index.html                  # Hub — browse all flows
│   └── flows/
│       └── group-training.html     # 15 screens with annotations
├── architecture/
│   ├── system-overview.md          # Full system diagram, deployment
│   ├── data-model.md               # ER diagram, all DB tables
│   ├── api-versioning.md           # API version rules
│   └── design-system.md            # Design tokens reference
├── CLAUDE.md                       # AI assistant context
└── README.md
```

### Spec Statuses
- **Draft** — being designed and prototyped
- **Approved** — ready for development
- **In Progress** — being developed
- **Implemented** — deployed, spec reflects reality
- **Deprecated** — replaced or removed

## Repositories

| Repo | Description |
|---|---|
| [321fit_ios](https://github.com/321-fit/321fit_ios) | iOS app (Swift, SwiftUI) |
| [poly-backend](https://github.com/321-fit/poly-backend) | Backend API (Python, Litestar) |
| [voice_control](https://github.com/321-fit/voice_control) | Voice AI assistant (Python, LiveKit, GPT-4) |

## Task Management

- [Task Board (Kanban)](https://github.com/orgs/321-fit/projects/2)
- [Roadmap](https://github.com/orgs/321-fit/projects/3)

## AI Skills

- `/product` — generate, update, or modify product specs (with approval flow)
- `/spec` — create GitHub Issues from approved specs (with approval flow)
