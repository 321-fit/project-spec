# 321Fit — Project Spec

Central repository for product specifications, feature requests, and project documentation for the 321Fit platform.

## Structure

```
project-spec/
├── specs/
│   ├── modules/                    # Existing module specs
│   │   ├── authentication.md       # Auth methods, JWT, Login & Security
│   │   ├── onboarding.md           # Post-registration wizard
│   │   ├── dashboard.md            # Home screen, revenue charts
│   │   ├── clients-coaches.md      # Search, filters, connections
│   │   ├── coach-calendar.md       # Coach calendar, event CRUD, drag & drop
│   │   ├── athlete-schedule.md     # Athlete booking flow, availability
│   │   ├── event-statuses.md       # Status lifecycle, push notifications
│   │   ├── payments.md             # Balance, Stripe, Apple Pay, cash
│   │   ├── google-apple-calendar.md # External calendar sync
│   │   ├── voice-assistant.md      # LiveKit, GPT-4, 40 tools
│   │   ├── profile-settings.md     # All settings, role-based
│   │   ├── deep-linking-referrals.md # AppsFlyer, referral system
│   │   └── notifications.md        # FCM, SMS, email, WhatsApp
│   └── features/                   # New feature specs
│       └── messenger.md            # Chat system (not yet implemented)
├── architecture/
│   ├── system-overview.md          # Full system diagram, deployment, infra
│   ├── data-model.md               # ER diagram, all DB tables
│   └── api-versioning.md           # API version rules
├── .claude/commands/
│   ├── product.md                  # /product — spec generator skill
│   └── spec.md                     # /spec — task generator skill
├── CLAUDE.md                       # AI assistant context
└── README.md
```

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
