# API Versioning

> Last updated: 2026-04-02

## Current Version

**`/api/v1.0.0/`** — the only active API version.

## Versioning Scheme

Format: `/api/v{major}.{minor}.{patch}/`

| Component | When to bump | Impact |
|---|---|---|
| **Major** (v2.0.0) | Breaking changes that require client updates | Old clients stop working |
| **Minor** (v1.1.0) | New endpoints or optional fields | Old clients unaffected |
| **Patch** (v1.0.1) | Bug fixes, performance improvements | Transparent to clients |

## Current Consumers

| Consumer | Base URL Config | Notes |
|---|---|---|
| iOS App | `EnvironmentConfig.shared.baseURL` (Info.plist) | Hardcoded version in URL |
| Voice Assistant | `Settings.BACKEND_URL` + `/api/v1.0.0/` | Hardcoded in BackendClient |
| Android (Planned) | TBD | Will use same API version |

## When to Create a New Version

**DO create a new version when:**
- Removing an existing endpoint
- Changing required request fields
- Changing response structure in breaking way
- Renaming endpoints

**DON'T create a new version when:**
- Adding new endpoints
- Adding optional request fields
- Adding new response fields (additive)
- Fixing bugs in existing behavior

## Breaking Change Process

1. Create new version (`/api/v2.0.0/`)
2. Keep old version running in parallel
3. Update all clients (iOS, Android, Voice)
4. Monitor old version usage
5. Deprecate old version after all clients updated
6. Remove old version after deprecation period

## Environment URLs

| Environment | Backend | Voice Assistant |
|---|---|---|
| DEV | `https://backend-api-321-fit-test.up.railway.app/api/v1.0.0/` | `https://voicecontrol-test.up.railway.app/v1/` |
| PROD | Production URL | Production URL |

## API Documentation

- Litestar auto-generates OpenAPI schema
- Accessible at configured `OPENAPI_PATH`
- Scalar UI for interactive API docs

## Known Issues
- Version `v1.0.0` is hardcoded across all consumers — no dynamic version negotiation
- Voice assistant uses a separate versioning (`/v1/`) from the main backend (`/v1.0.0/`)
- CamelCase middleware converts all request/response keys — undocumented behavior for API consumers
