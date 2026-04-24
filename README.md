# 321Fit — Project Spec

Central repository for product specifications, feature requests, and project documentation for the 321Fit platform.

---

## 🎨 Interactive prototypes

All prototypes are hosted on GitHub Pages — open these links to see the **rendered, interactive** prototype. Viewing the `.html` files inside this repo on GitHub shows source code only, not the rendered page.

**Hub:** https://321-fit.github.io/project-spec/prototypes/index.html

**Coach flows:**
- [Dashboard](https://321-fit.github.io/project-spec/prototypes/flows/coach/dashboard.html) · 9 states, Tier 1 wizard, Tier 2 tips
- [Calendar](https://321-fit.github.io/project-spec/prototypes/flows/coach/calendar.html) · 24h timeline, unified event sheet, 6 states
- [Clients](https://321-fit.github.io/project-spec/prototypes/flows/coach/clients.html) · active/archived/blocked/deleted/CRM
- [Settings](https://321-fit.github.io/project-spec/prototypes/flows/coach/settings.html) · sessions, locations, availability, calendar sync
- [Balance / Earnings](https://321-fit.github.io/project-spec/prototypes/flows/coach/balance.html) · payouts, Stripe, transactions ledger
- [Invite](https://321-fit.github.io/project-spec/prototypes/flows/coach/invite.html) · invite-to-training + Schedule flows

**Shared flows:**
- [Account Access](https://321-fit.github.io/project-spec/prototypes/flows/shared/account-access.html) · sign-in methods, re-auth, delete account, contact support
- [Profile (Coach v2)](https://321-fit.github.io/project-spec/prototypes/flows/shared/profile.html) · coach profile + booking calendar + reviews

---

## Structure

```
project-spec/
├── SPEC_TEMPLATE.md                # Canonical template every new spec follows
├── IMPL_DOC_TEMPLATE.md            # Template for per-repo <repo>/docs/<module>-<platform>.md
├── specs/                          # All specs (flat, status in header)
├── prototypes/                     # Interactive HTML prototypes (view via Pages URLs above)
│   ├── index.html                  # Hub
│   ├── flows/                      # Per-module flows
│   └── lib/                        # fit-ui.css + fit-ui-tokens.css + fit-ui.js
├── architecture/
│   ├── system-overview.md          # Full system diagram, deployment
│   ├── data-model.md               # ER diagram, all DB tables
│   ├── api-versioning.md           # API version rules
│   └── design-system.md            # DS architecture — scales, tiers, rules (canonical)
├── CLAUDE.md                       # AI assistant context
└── README.md
```

## Specs

Specs use a standard header with status + cross-references. See `SPEC_TEMPLATE.md` for the canonical structure.

### Status key
- **Draft** — being designed and prototyped
- **Approved** — contract finalized, ready for development
- **In Progress** — actively being developed (spec may iterate during implementation)
- **Implemented** — deployed, spec reflects reality
- **Deprecated** — replaced or removed

### Core modules

| Spec | Status | Notes |
|---|---|---|
| [authentication.md](specs/authentication.md) | Implemented | |
| [account-access.md](specs/account-access.md) | Draft | Sign-in methods, re-auth, delete, social OAuth |
| [onboarding.md](specs/onboarding.md) | Implemented | (legacy — general onboarding) |
| [onboarding-wizard.md](specs/onboarding-wizard.md) | Draft | Tier 1 wizard (6 steps coach, 4 athlete) |
| [dashboard.md](specs/dashboard.md) | Draft | Coach Home — 9 states, Tier 1/Tier 2 |
| [review-queue.md](specs/review-queue.md) | Draft | Mark complete / missed batch screen |
| [clients-coaches.md](specs/clients-coaches.md) | Approved / In Progress | Active/archived/blocked/deleted/CRM + Schedule flow |
| [coach-calendar.md](specs/coach-calendar.md) | Approved / In Progress | 6-state events, unified sheet, custom event |
| [athlete-schedule.md](specs/athlete-schedule.md) | Implemented | |
| [event-statuses.md](specs/event-statuses.md) | Approved / In Progress | 6-state canonical system, legacy migration |
| [payments.md](specs/payments.md) | Approved (athlete) / Draft (coach earnings) | Balance + Earnings ledger |
| [profile-settings.md](specs/profile-settings.md) | Implemented | |
| [coach-maturity-model.md](specs/coach-maturity-model.md) | Draft | New vs established coach rules |
| [vacation-mode.md](specs/vacation-mode.md) | Draft (v1 narrow) | Coach time off |

### Calendar & integrations

| Spec | Status |
|---|---|
| [calendar-sync.md](specs/calendar-sync.md) | Implemented |
| [google-apple-calendar.md](specs/google-apple-calendar.md) | Implemented |

### Cross-cutting

| Spec | Status |
|---|---|
| [settings.md](specs/settings.md) | Implemented |
| [notifications.md](specs/notifications.md) | Implemented |
| [voice-assistant.md](specs/voice-assistant.md) | Implemented |
| [deep-linking-referrals.md](specs/deep-linking-referrals.md) | Implemented |
| [group-training.md](specs/group-training.md) | Draft |
| [messenger.md](specs/messenger.md) | Draft |

---

## Design system

- **Architecture overview:** [architecture/design-system.md](architecture/design-system.md) — scales, tiers, meta-rules
- **Component inventory:** [design-tokens/docs/components.md](../design-tokens/docs/components.md) — per-component API
- **Tokens source:** [design-tokens/tokens/](../design-tokens/tokens/) — canonical JSON

---

## Repositories

| Repo | Description |
|---|---|
| [321fit_ios](https://github.com/321-fit/321fit_ios) | iOS app (Swift, SwiftUI) |
| [poly-backend](https://github.com/321-fit/poly-backend) | Backend API (Python, Litestar) |
| [voice_control](https://github.com/321-fit/voice_control) | Voice AI assistant (Python, LiveKit, GPT-4) |
| [design-tokens](https://github.com/321-fit/design-tokens) | Design tokens + SwiftUI + Compose component libs |

## Task management

- [Task Board (Kanban)](https://github.com/orgs/321-fit/projects/2)
- [Roadmap](https://github.com/orgs/321-fit/projects/3)

## AI Skills

- `/product` — generate, update, or modify product specs (with approval flow)
- `/spec` — create GitHub Issues from approved specs (with approval flow)
- `/architect`, `/develop` — per-repo implementation agent skills
