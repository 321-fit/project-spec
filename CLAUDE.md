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

### Specs (`specs/`)
All specs live in a flat `specs/` directory — no subdirectories. Each spec has a status in its header:

```markdown
# Module Name

> Status: Draft | Approved | In Progress | Implemented | Deprecated
> Prototype: [flow-name.html](../prototypes/flows/flow-name.html)
> Last updated: YYYY-MM-DD
```

**Statuses:**
- **Draft** — being designed, prototyped, discussed. Not ready for development.
- **Approved** — spec finalized, prototype reviewed, ready for development tasks.
- **In Progress** — actively being developed. Spec may update based on implementation decisions.
- **Implemented** — deployed (at least to DEV). Spec reflects actual implementation, not plans.
- **Deprecated** — replaced by another module or removed.

**Rules:**
- Every spec should link to its prototype (if exists)
- Specs are the source of truth for what the app does and why
- When creating GitHub Issues from specs, reference the spec file + specific sections
- After implementation, update spec to reflect what was actually built (not what was planned)

### Prototypes (`prototypes/`)
Interactive HTML prototypes organized as Hub + individual flows:

```
prototypes/
├── index.html          ← Hub page — click to browse all flows
└── flows/
    ├── group-training.html
    ├── calendar-booking.html  (planned)
    └── ...
```

- Each flow: self-contained HTML with sidebar nav + right-side annotations
- All flows use shared `fit-ui.css` (component library) + `fit-ui.js` (interaction library) from `design-tokens` repo
- Hub page (`index.html`) shows all flows with status badges
- In specs, link to specific flow: `[prototype](../prototypes/flows/flow-name.html)`
- Annotations in prototypes explain UX decisions and behavior — useful for founder review and developer handoff

### Architecture (`architecture/`)
- System-level decisions, data model, API versioning, design system reference

### API documentation (lives in `poly-backend`)

For each backend module, the canonical client-facing endpoint reference is **`poly-backend/docs/<module>-api.md`** — a human-readable per-endpoint doc maintained alongside backend code. Specs link to it; they don't duplicate request/response shapes.

- **Live API (dev-test):** `https://polybackend-dev-test.up.railway.app` — Swagger path TBD pending instance bootstrap (verify with `/docs`, `/schema/swagger`, `/schema/openapi.json` on first access). This is the wire format source of truth for shipped endpoints.
- **Pattern memory:** `feedback_endpoint_doc_pattern` — full template + responsibilities.
- **Spec section 6 should be short:** overview table of endpoints + link to `<module>-api.md` + link to live URL. Don't paste large JSON samples — those go in the API doc.
- **Deprecated for new modules:** `contracts/<module>.openapi.yaml` files. Existing 3 files are archival only — do not update them. `_baseline.openapi.yaml` stays as legacy reference for pre-Phase-4 endpoints.

### Backward compatibility (universal rule for backend specs)

Specs and impl-docs must respect that existing endpoints are running in prod with installed iOS/Android clients on multiple versions. Spec section 6 must call out when an endpoint is being **extended** (additive — safe) vs when a new endpoint is being **added**. Never propose renames, type changes, or field removals without an explicit migration plan documented in §7 Business rules + a deprecation entry in `<module>-api.md`. See memory `feedback_backward_compat_endpoints`.

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
