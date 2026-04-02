# 321Fit — Project Spec Repository

## Purpose
This is the central product knowledge base for 321Fit. Contains specs, feature requests, and architecture docs that provide context for all other repositories.

## Product
321Fit — маркетплейс персональных тренировок, связывающий тренеров (coaches) и спортсменов (athletes). Две роли определяют весь UX, API и бизнес-логику.

## GitHub
- **Account:** `whywolfy` — before any `gh` or `git push/pull`, ensure this account is active: `gh auth switch -u whywolfy`
- **Org:** `321-fit`

## Task Management
- **Project #2** — Task Board (Kanban, custom time field): https://github.com/orgs/321-fit/projects/2
- **Project #3** — Roadmap: https://github.com/orgs/321-fit/projects/3
- Add issue to project: `gh project item-add 2 --owner 321-fit --url <issue-url>`

## Repositories

| Repo | Path (relative to workspace) | Stack |
|---|---|---|
| `321fit_ios` | `../321fit_ios/` | Swift, SwiftUI, LiveKit, Stripe |
| `poly-backend` | `../poly-backend/` | Python, Litestar, PostgreSQL, Celery |
| `voice_control` | `../voice_control/` | Python, FastAPI, LiveKit, GPT-4 |

Each repo has `CLAUDE.md` (operational instructions) and `docs/DOCUMENTATION.md` (full technical docs).

## System Architecture
```
iOS App (SwiftUI) ←→ Backend API (Litestar + PostgreSQL)
       ↕
Voice Assistant (LiveKit + GPT-4) ←→ Backend API
```

## Key Domain Concepts
- **Training Session** — coach's template (name, duration, price)
- **Training Event** — scheduled appointment (coach + athlete + datetime)
- **Event Approval** — confirmation workflow (pending → approved/declined/cancelled)
- **Two Roles** — `Athlete` and `Coach` — different UI, endpoints, permissions everywhere
- **Balance** — athlete prepays, coach receives after session completion via Stripe

## Spec Structure
- `specs/modules/` — specs for existing modules (what is built)
- `specs/features/` — specs for new features (what needs to be built)
- `architecture/` — system-level architecture decisions

## Working with Specs

### Reading specs
Before any product work, read relevant specs from `specs/` to understand current state.

### Creating feature specs
Feature specs should include:
- **Problem** — what user problem this solves
- **User stories** — who does what and why
- **Requirements** — functional and non-functional
- **Affected repos** — which repos need changes (iOS, backend, voice, or all)
- **API changes** — new/modified endpoints if applicable
- **UI/UX** — screens, flows, wireframes if applicable

### Creating tasks from specs
Tasks are created as GitHub Issues in the appropriate repo and added to Project #2 (Task Board).
**IMPORTANT:** Only create tasks when explicitly asked. Never auto-generate tasks from discussions or spec drafts.

### Task format
```
Title: [Module] Short description
Body:
- Context: link to spec
- Acceptance criteria
- Affected files/modules
Labels: feature/bug/enhancement
```

## Don'ts
- Don't create tasks/issues without explicit user confirmation
- Don't modify specs in other repos — this repo is the source of truth for product specs
- Don't assume a discussed feature is approved — always ask before creating tasks
