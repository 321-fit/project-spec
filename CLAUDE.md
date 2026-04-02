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

## Slash Commands

### `/product` — Product Spec Generator
Generates, updates, or modifies product specs in `specs/`.
- Takes a high-level feature/module description
- Researches relevant code and docs across repos for technical context
- Generates a structured spec draft
- **Shows draft → waits for approval → only then saves file**
- Never writes specs without explicit confirmation

### `/spec` — Task Generator from Specs
Breaks down approved specs into GitHub Issues on the Project Board.
- Reads a spec from `specs/`
- Generates actionable tasks with acceptance criteria
- Assigns to correct repos, adds labels
- **Shows task list → waits for approval → only then creates issues**
- Never creates issues without explicit confirmation

Both commands are defined in `.claude/commands/`.

## Don'ts
- Don't create tasks/issues without explicit user confirmation
- Don't write/save specs without showing draft and getting approval first
- Don't modify specs in other repos — this repo is the source of truth for product specs
- Don't assume a discussed feature is approved — always ask before creating tasks
