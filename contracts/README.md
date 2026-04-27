# API Contracts

OpenAPI 3.1 fragments describing the contract between **poly-backend** (provider) and the API clients (**321fit_ios**, **321fit_android_new**, **voice_control**).

## Why this folder exists

During Phase 4 we are building backend and mobile in parallel. Without a written contract:
- iOS/Android architects guess at request/response shapes → mocks diverge from reality → integration breaks
- Backend ships an endpoint, mobile finds out it does not match expectations after `/develop`
- Voice tools regress when backend renames fields

A fragment here is the **single source of truth** for one module. All architects (backend, iOS, Android, voice) read the same file.

## Folder layout

```
contracts/
├── README.md                       # this file
├── _template.openapi.yaml          # shape to copy for a new module
├── _baseline.openapi.yaml          # full snapshot of poly-backend at the start of Phase 4
└── <module>.openapi.yaml           # one fragment per spec module (dashboard, payments, ...)
```

`<module>` matches the spec filename in `project-spec/specs/<module>.md` (e.g. `dashboard`, `event-statuses`, `payments`).

## Who writes what

| File | Author | When |
|---|---|---|
| `_baseline.openapi.yaml` | Human (one-time) | Phase 4 setup — extracted from `poly-backend` live `/schema/openapi.json` |
| `<module>.openapi.yaml` | poly-backend `/architect` skill | When generating `docs/<module>-backend.md` impl-doc |
| Updates to `<module>.openapi.yaml` | poly-backend `/architect` (re-run) or `/develop` (when adding a forgotten field) | As implementation reveals corrections |

**iOS / Android / voice architects do not write contracts.** They read them as input.

## How clients consume contracts

1. iOS/Android `/architect` reads `contracts/<module>.openapi.yaml` while generating its impl-doc.
2. Mock providers in iOS/Android are typed by these contracts — see each repo's `MOCK_POLICY.md`.
3. When a real backend endpoint ships, mobile flips the mock toggle. If contract was honored, integration is a smoke test.

## Format

- OpenAPI 3.1.0
- YAML (not JSON) for diff readability
- One file per spec module — keep fragments focused; do not concatenate unrelated modules
- Common types (errors, pagination, auth) live in `_baseline.openapi.yaml` under `components.schemas` and are referenced from fragments via `$ref` to a relative path: `_baseline.openapi.yaml#/components/schemas/Error`

## Naming conventions (must match poly-backend)

- Field names: `camelCase` in JSON (poly-backend has snake-to-camel middleware — contract reflects what clients see on the wire)
- Path: `/api/v1.0.0/...` prefix
- Auth: JWT Bearer; mark routes that require auth with `security: [bearerAuth: []]`
- Datetimes: ISO-8601 UTC (`2026-04-27T10:00:00Z`)
- Money: integer minor units (cents) + currency string (e.g. `{ "amount": 2500, "currency": "EUR" }` = €25.00)
- Errors: shape defined in `_baseline.openapi.yaml#/components/schemas/Error`

## Versioning

- Contracts describe the **current** API version (v1.0.0)
- Breaking changes to a module: edit the file directly + bump the path version when poly-backend bumps its API version
- We do not keep historical fragments — git history is enough

## Future: CI validation

Not wired yet. Planned for Phase 5:

- `poly-backend` CI step compares `app.openapi_schema` (live) against fragments in this folder. Mismatch → fail.
- Forces backend devs to update the contract file when they change an endpoint shape.

Until then, **discipline**: backend `/architect` and `/develop` skills explicitly remind to update `contracts/<module>.openapi.yaml` whenever changing endpoint shapes.
