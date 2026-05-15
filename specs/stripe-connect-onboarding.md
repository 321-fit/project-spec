# Stripe Connect Onboarding (Embedded SDK)

> Status: Draft
> Prototype: [flows/coach/balance.html#s-stripe](https://321-fit.github.io/project-spec/prototypes/flows/coach/balance.html#s-stripe)
> Parent spec: [payments.md](./payments.md) — ledger, payouts, balance, cancellation policy
> Component library: [design-tokens/docs/components.md](../../design-tokens/docs/components.md)
> Last updated: 2026-05-15
> Implementation:
> - iOS:     [321fit_ios/docs/stripe-connect-ios.md] (to be created)
> - Backend: [poly-backend/docs/stripe-connect-backend.md] (to be created)
> - Android: (future — same backend contract)

---

## 1. Overview

This spec covers the **Stripe Connect onboarding flow**: how a coach connects their bank account so the platform can pay them out. Everything that happens **after** onboarding (earnings accrual, weekly payouts, Instant payouts, ledger) lives in [payments.md](./payments.md).

**Migration from Express to embedded SDK.** The legacy implementation creates Stripe **Express** accounts and redirects the coach to Safari (`SFSafariViewController`) for the onboarding form. Safari redirects are a regression vs. native UX — coaches lose the app context and Express dashboard handoff feels foreign to a 321Fit user.

The new implementation uses the **`StripeConnect` iOS SDK** (module of `stripe-ios`, iOS 15+) to render the full onboarding flow inside the app via `AccountOnboardingController` — a Stripe-themable web view that never breaks out to Safari.

**Critical constraint:** the embedded SDK only delivers full in-app UX when the underlying Connect account is created with `controller.stripe_dashboard.type = none` (the new controller-properties equivalent of legacy "Custom"). Express (`stripe_dashboard.type = express`) and Standard accounts force Stripe-hosted Safari redirects mid-flow. Verified empirically — old `StripeConnectViewModel.swift` ships Safari mid-flow on the "Add information" step.

**Scope of this migration:**

- Backend creates Connect accounts with `type = none` instead of Express.
- Backend swaps `account_links.create` (redirect URL) for `account_sessions.create` (client secret for embedded SDK).
- Backend adds a consent capture endpoint to record `coach.legal_consent` before issuing the account session.
- iOS swaps `SFSafariViewController` for `StripeConnect.AccountOnboardingController`.
- iOS adds a consent checkbox gating the "Start setup" CTA on the Stripe Connect detail screen.
- Existing Express accounts in production (<5 coaches, pre-launch) are reset and re-onboarded under the new config.

What is **not** in scope here: any change to the earnings ledger, payouts, balance math, or cancellation policy. See [payments.md](./payments.md).

---

## 2. User Stories

### Coach

- As a coach, I want Stripe Connect onboarding **inside the app** — not a Safari redirect or WebView — so that setup feels native and continuous with the rest of 321Fit.
- As a coach, I want to **understand what I'm agreeing to** before Stripe collects my passport and banking info, so that I can make an informed consent.
- As a coach, when Stripe later asks for an updated document (compliance check, document expiry), I want to **resolve it in-app** without having to re-do the entire onboarding from scratch.
- As a coach, if I leave onboarding mid-flow, I want to **come back where I left off** without re-entering everything.

### Platform

- As the platform, we want to **record explicit consent** to 321Fit Terms, 321Fit Privacy, and the Stripe Connected Account Agreement before opening the Stripe SDK, so that we meet Stripe's "financial partner disclosure" compliance requirement and have an auditable consent record.
- As the platform, we want all Stripe Connect onboarding events (start, complete, abandon, fail) tracked in analytics, so that we can measure funnel conversion.

---

## 3. System Stories

- As the backend, before issuing an `account_session` client secret, we verify that `coach.legal_consent` is recorded with `acceptedAt`, `ip`, `user_agent`, and `consentVersion` matching the current required version. If missing or stale, reject with `409 consent_required`.
- As the backend, Stripe Connect accounts are created with `controller.stripe_dashboard.type = none`, `controller.requirement_collection = stripe`, and capabilities `card_payments` + `transfers` — so the embedded SDK renders the full KYC flow in-app without falling back to Stripe-hosted Safari pages.
- As the backend, on every `account.updated` webhook we recompute the coach's onboarding state (`not_set_up | verifying | connected | action_required`) from `charges_enabled`, `payouts_enabled`, and `requirements.currently_due`. The client reads this from `GET /coach/earnings`; state is never inferred client-side.
- As the iOS client, we use `StripeConnect.EmbeddedComponentManager.createAccountOnboardingController()` to present onboarding modally. We treat the `AccountOnboardingControllerDelegate` callbacks `onboardingDidComplete` / `onboardingDidExit` / `onLoadError` as the source of truth for sheet lifecycle — we do **not** poll the backend while the sheet is open.
- As the iOS client, after the sheet closes (regardless of outcome), we re-fetch `GET /coach/earnings` to read the authoritative state. We do not assume "sheet closed" = "connected" — Stripe verification is asynchronous and may put the account into `Verifying`.

---

## 4. Flow

### Entry points

The Stripe Connect detail screen has **two entry points** in the app:

1. **Primary: Settings → Payments → Stripe Connect** — where most coaches discover and initiate payout setup. The Settings card subtitle reflects the current state ("Not connected" / "Verifying" / "Connected" / "Action needed").
2. **Secondary: Earnings → Payout Methods → Stripe Connect** — for coaches already in the Earnings screen looking at their balance.

Both paths route to the same screen (prototype: `flows/coach/balance.html#s-stripe`). The back chevron returns to whichever entry the coach used.

### Flow A — First-time onboarding

State on entry: **Not set up** (`charges_enabled = false`, no Stripe account exists, or `stripeConnected = false` on the coach record).

1. Coach navigates to the Stripe Connect detail screen via either entry point above. State class `ss-none` in prototype.
2. Coach reviews the intro: Identity / Bank / Tax checklist + the legal consent block.
3. Coach taps the consent checkbox. Three agreements are bundled into a single checkbox: **321Fit Terms**, **321Fit Privacy Policy**, **Stripe Connected Account Agreement**. Tapping individual inline links opens the agreement texts (Settings → Legal section — separate spec).
4. The "Start setup" CTA enables. Coach taps.
5. Client posts `POST /coach/stripe/consent { consentVersion }`. Backend records the consent row. Returns `{ acceptedAt }`.
6. Client posts `POST /coach/stripe/connect/session`. Backend:
   - Creates the Connect account if none exists (with the controller config in §3 and the coach's country from profile).
   - Creates an `AccountSession` with `account_onboarding` enabled.
   - Returns `{ client_secret, publishableKey }`.
7. Client opens `StripeConnect.AccountOnboardingController` modally. Stripe renders the full KYC flow inside the app: business type → personal info → ID upload (camera) → bank account → Stripe Services Agreement acceptance on the final screen (Stripe handles this themselves — backend does not need to send `tos_acceptance`).
8. Coach completes the flow. SDK delegate fires `onboardingDidComplete`. Client dismisses the sheet, refreshes `GET /coach/earnings`.
9. State transitions to **Verifying** (`charges_enabled = false`, `currently_due = []`) while Stripe runs verification asynchronously. Coach sees "Stripe is reviewing your information" info banner. Typical latency: seconds to minutes; rarely up to a few hours for manual review.
10. Stripe webhook `account.updated` fires when verification completes. Backend transitions state to **Connected** (`charges_enabled = true`, `payouts_enabled = true`, `currently_due = []`) and sends push: "You're all set — payouts active". Weekly payouts (see [payments.md § Flow E](./payments.md)) become eligible.

### Flow B — Re-onboarding on Action required

State on entry: **Action required** (`requirements.currently_due` is non-empty — e.g., Stripe wants a Proof of Address upload, or a document expired).

1. Coach sees the Stripe Connect screen with a warn banner: "Action needed — Stripe needs additional documents". Missing items + deadline listed.
2. Coach taps "Resolve now".
3. If the coach's `consentVersion` has been bumped since their last consent (e.g., agreements were updated), client first shows the consent block again. Otherwise, skip to step 4.
4. Client posts `POST /coach/stripe/connect/session` to get a fresh `client_secret`.
5. Client opens `AccountOnboardingController`. Stripe internally renders **only the missing requirements** — not the full flow.
6. Coach uploads / updates the requested item. SDK closes. Client refreshes earnings.
7. State transitions back to **Verifying** → **Connected** (or stays in **Action required** if Stripe still has objections — coach gets another banner with the next item).

### Flow C — Abandoned mid-flow

1. Coach taps "Start setup", opens the SDK sheet, fills in some fields, then dismisses the sheet without finishing.
2. SDK delegate fires `onboardingDidExit`. Client dismisses the sheet, refreshes earnings.
3. Backend state remains **Not set up** if no fields were saved, or could be **Verifying** with `currently_due` partially populated if Stripe persisted partial progress (depends on internal Stripe behavior — treated as opaque).
4. Coach returning to the Stripe Connect screen sees either the original "Not set up" intro (re-consent + Start setup) or the **Action required** UI listing whatever's still due. Either way they continue without losing prior input — Stripe maintains the partial state on its side.

---

## 5. States

| State | `charges_enabled` | `requirements.currently_due` | Has Stripe account? | UI (prototype state class) |
|---|---|---|---|---|
| **Not set up** | n/a | n/a | No | Intro + checklist + **consent checkbox** + "Start setup" (disabled until consent checked) — `ss-none` |
| **Verifying** | `false` | empty | Yes | Info banner "Stripe is reviewing your information" + "Continue in Stripe" (reopens SDK if exit mid-flow) — `ss-pending` |
| **Connected** | `true` | empty | Yes | Account info (acct id last 4, bank ··4821, country, payout schedule) + "Manage on Stripe" + "Disconnect Stripe" — `ss-done` |
| **Action required** | `true` or `false` | non-empty | Yes | Warn banner + Missing items list + Deadline + "Resolve now" — `ss-action` |

Backend exposes state in `CoachEarningsSnapshot.defaultProvider.status` as enum: `"not_set_up" | "verifying" | "connected" | "action_required"`. Derived from Stripe webhook `account.updated`; the client never infers it from local data.

When the state is `action_required`, the snapshot also includes:

```json
"defaultProvider": {
  "kind": "stripe_connect",
  "status": "action_required",
  "currentlyDue": ["individual.verification.document"],
  "deadline": "2026-05-01T00:00:00Z"
}
```

`currentlyDue` mirrors `account.requirements.currently_due` (raw Stripe codes; client maps to localized copy). `deadline` mirrors `account.requirements.current_deadline` (or `null` if no deadline yet).

---

## 6. API

### `POST /coach/stripe/consent`

Records the coach's acceptance of 321Fit Terms + Privacy + Stripe Connected Account Agreement. **Required before** `POST /coach/stripe/connect/session` will succeed.

**Body:**
```json
{ "consentVersion": "2026-05-15" }
```

`consentVersion` is bumped whenever any of the three agreements is updated. Current value lives in backend config (not derivable from API yet — see Open questions).

**Response 200:**
```json
{ "acceptedAt": "2026-05-15T14:23:11Z" }
```

**Response 400:** unknown `consentVersion` or older than the current required version. Client must fetch the current version (from a config endpoint — see Open questions) and re-prompt.

Persisted as append-only `coach.legal_consent` rows: `(id, coach_id, accepted_at, ip, user_agent, consent_version)`. Never updated in place — every (re)acceptance writes a new row.

### `POST /coach/stripe/connect/session`

Returns the client secret for `StripeConnect.AccountOnboardingController`.

**Body:** empty (coach is identified by auth token).

**Behavior:**
1. Check `coach.legal_consent` has a row with `consent_version` matching the current required version. If not → `409 consent_required`.
2. Check coach has a Stripe Connect account. If not, create one:
   - `controller.stripe_dashboard.type = none`
   - `controller.requirement_collection = stripe`
   - `capabilities.card_payments.requested = true`
   - `capabilities.transfers.requested = true`
   - `country` from coach profile
   - `email` from coach profile
3. Create an `AccountSession`:
   - `account = coach.stripe_account_id`
   - `components.account_onboarding.enabled = true`
4. Return `{ accountSession: <client_secret>, publishableKey: <platform pk> }`.

**Response 200:**
```json
{
  "accountSession": "accs_secret_...",
  "publishableKey": "pk_live_..."
}
```

**Response 409 `consent_required`:** the coach has not yet POSTed `/coach/stripe/consent` for the current `consentVersion`. Client must show the consent UI again before retrying.

**Response 409 `country_unsupported`:** coach's country is not in Stripe's supported Connect country list. Surface an explanatory error sheet ("Stripe payouts are not yet available in your country"). Coach can still receive cash; no card payments.

### `DELETE /coach/payout-accounts/{id}`

Disconnect the Stripe account. Behavior detailed in [payments.md § API](./payments.md). Consent records remain on file (audit trail); reconnecting requires a fresh consent.

### Webhooks (Stripe → `POST /stripe-webhook`)

Subset relevant to onboarding:

- **`account.updated`** — drives the state transitions in §5. Backend recomputes `defaultProvider.status` from `charges_enabled`, `payouts_enabled`, `requirements.currently_due`, `requirements.disabled_reason`. Emits push notification on state change to `connected` ("You're all set") or `action_required` ("Action needed — open Earnings"). Idempotent on event id.
- **`account.application.deauthorized`** — coach revoked from Stripe side (rare). Backend sets `stripeConnected = false`, surfaces banner on Earnings.

Other webhooks (`payment_intent.succeeded`, `transfer.*`, etc.) are unrelated to onboarding — see [payments.md § Webhooks](./payments.md).

---

## 7. Business rules

### Legal consent capture

- **Required before** the first call to `POST /coach/stripe/connect/session`. Without a consent record at the current version, that endpoint returns `409 consent_required`.
- **Three agreements bundled** in a single checkbox: 321Fit Terms, 321Fit Privacy Policy, Stripe Connected Account Agreement. Coach cannot opt into one without the others (single checkbox per legal review).
- **Stripe Services Agreement** is **not** part of this checkbox — Stripe collects acceptance itself on the final screen of the embedded onboarding flow. Backend does not need to send `tos_acceptance` payloads.
- **Storage:** append-only `coach.legal_consent` rows `{ id, coach_id, accepted_at, ip, user_agent, consent_version }`. Never updated in place — every (re)acceptance writes a new row.
- **Version bump:** `consentVersion` is bumped whenever any of the three agreements is updated. Coaches on an older version must re-consent before the next Stripe onboarding event (e.g., before "Resolve now" in Action required state). Existing payouts continue uninterrupted between version bump and re-consent — only the next onboarding interaction is gated.
- **Stripe-as-financial-partner disclosure:** because we use `controller.stripe_dashboard.type = none`, the coach has no direct Stripe Dashboard. Stripe Connect Platform Agreement requires us to disclose Stripe as the payments processor in a clear and conspicuous manner. The Settings → Stripe Connect detail screen + the consent block in onboarding satisfy this requirement. Full agreement texts are hosted under Settings → Legal (separate spec).
- **On disconnect:** consent records stay on file (audit trail). Stripe account is detached; coach must re-consent if reconnecting later.

### Onboarding lifecycle

- **Cannot bypass consent:** the iOS client must not call `/coach/stripe/connect/session` without first calling `/coach/stripe/consent`. Backend enforces this with `409`; client should enforce it visually (disabled CTA).
- **Re-onboarding under Action required:** Stripe internally tracks which requirements are missing; the SDK shows only those. We do not implement our own selective re-onboarding flow.
- **Country immutability:** once the Connect account exists, the country is fixed. Coaches who move country must contact Support — out of scope for v1.

---

## 8. Edge cases

- **Coach exits the SDK sheet mid-flow:** see Flow C. Stripe persists partial progress; on return, coach lands in `Verifying` or `Action required` depending on what Stripe has internally. Client must not assume "exit = back to Not set up".
- **Coach's country is unsupported:** `/coach/stripe/connect/session` returns `409 country_unsupported`. Surface error sheet, do not retry. Cash-only mode remains available.
- **Stripe webhook delayed / lost:** reconciliation job (every 4h, already running for payouts — see [payments.md § Scheduled tasks](./payments.md)) also fetches `account.retrieve` for any coach in `Verifying > 24h` and resyncs the state.
- **`consentVersion` bumped while coach is mid-onboarding (sheet open):** rare race. Client refreshes earnings after sheet close; if new version is required for the next action (Resolve now), consent block re-appears. Mid-flow consent is **not** re-prompted — Stripe owns the sheet.
- **iOS user revokes camera permission mid-onboarding:** Stripe SDK handles internally (shows their own permission rationale). We do not intercept.
- **Network loss while opening the SDK:** Stripe SDK shows its own retry UI inside the sheet. If `account_session` fetch fails on our side (before opening the sheet), client shows toast "Couldn't connect. Try again." and does not open the sheet.
- **Coach already had an Express account before migration:** see §10 Migration plan. The legacy Stripe account is left dormant; a fresh `type = none` account is created on next onboarding.

---

## 9. Platform notes

**Cross-platform UI conventions:** see [architecture/design-system.md § Native theming contract](../architecture/design-system.md#native-theming-contract). This section only covers platform-specific deviations.

### iOS

- **Navigation mount:** the screen lives under `Settings` module (primary) with a secondary push from `Earnings → Payout Methods`. Same view controller in both cases; back chevron honours the push stack.
- **SDK module:** `StripeConnect` (part of `stripe-ios`, iOS 15+).
- **Required Info.plist key:** `NSCameraUsageDescription` (Stripe asks for camera during ID upload).
- **Wiring:**
  ```swift
  StripeAPI.shared.publishableKey = response.publishableKey
  let mgr = EmbeddedComponentManager(fetchClientSecret: { return response.accountSession })
  let controller = mgr.createAccountOnboardingController()
  controller.delegate = self
  controller.title = "Connect Stripe"
  controller.present(from: topViewController)
  ```
- **Delegate callbacks:**
  - `onboardingDidComplete` — coach finished the form; transition to Verifying.
  - `onboardingDidExit` — coach dismissed mid-flow; transition based on next `GET /coach/earnings`.
  - `onLoadError(error)` — SDK failed to initialize; show toast, do not block coach from retrying.
- **Theming:** match FitTheme via `EmbeddedComponentManager.Appearance` — colors, font, spacing, border radius (see [feedback memory: native theme tokens](../../../../.claude/projects/-Users-yurikavalenok-Documents-321fit/memory/feedback_native_theme_tokens.md)). Light and dark variants passed separately and switched on `traitCollection.userInterfaceStyle` change (Stripe SDK does not auto-track).
- **Replaces:** `StripeConnectViewModel.swift` (Safari redirect flow). The old file can be deleted after the new flow ships to all coaches.

### Android (future)

- `StripeConnect` Android SDK equivalent (in beta as of 2026-05). Same backend contract.
- Currently blocked on JDK setup — see project memory.

### Backend

- New Stripe SDK version required if the current one is too old to support `account_sessions` + `controller.stripe_dashboard.type` controller properties. Verify compatibility before starting.
- Controller config locked in code (not user-selectable): `type = none`, `requirement_collection = stripe`.
- `account_sessions.create` is a different call shape than the legacy `account_links.create` — wire format change, not a flag flip.

---

## 10. Migration plan

**Existing accounts in production:** fewer than 5 coaches, pre-launch. Stripe does not support converting a Connect account between controller configurations (Express ↔ `type = none`).

**Strategy: reset and re-onboard.**

1. **Migration script (one-time, run during deploy):**
   - For each coach with `stripe_connected = true` and an existing Express account (`stripe_account_id` starts with `acct_` created under the old controller):
     - Set `coach.stripe_connected = false`.
     - Set `coach.stripe_account_id = NULL` (or move to `coach.stripe_account_id_legacy` for audit if backend prefers).
     - Insert a `coach.legal_consent` row reset reason `"controller_migration"` (optional — depends on backend audit choice).
   - Old Stripe Express accounts are **not deleted programmatically** — they sit dormant on Stripe's side. Can be cleaned up manually via Stripe Dashboard once we confirm the migration completed without rollback.
2. **Coach experience:**
   - On next visit to Earnings, the coach sees the **Not set up** state (consent + Start setup).
   - They re-run the consent + onboarding under the new `type = none` config.
   - Payouts pause for the duration of re-onboarding (typical: 5-10 minutes including coach time + Stripe verification).
3. **Coach communication:** push notification or email before the migration: "We're upgrading Stripe Connect to a smoother in-app flow. You'll need to reconnect once — takes 2 minutes." (Copy owned by product; not in this spec.)

**Rollback plan:** the migration script keeps `stripe_account_id_legacy`. If a critical bug surfaces post-deploy, revert backend code and restore `stripe_account_id` from `_legacy` field; coaches go back to the Safari flow.

**No data migration on Stripe's side:** old accounts cannot be repurposed. Treat them as throw-aways.

---

## 11. Open questions

- [ ] **Where does the client fetch the current `consentVersion`?** Either bake into client (hardcoded; needs app update on bump) or expose `GET /config/legal-consent-version`. Recommend the endpoint approach so we can bump server-side without forcing a client release. **Owner:** backend.
- [ ] **Analytics events:** which exact events do we emit? Suggested: `stripe_onboarding_started`, `stripe_onboarding_completed`, `stripe_onboarding_exited`, `stripe_action_required`, `stripe_action_resolved`. **Owner:** product.
- [ ] **Push copy:** exact text for "You're all set" and "Action needed" notifications. **Owner:** product / copy.
- [ ] **Re-consent UX when version bumps:** does the coach see a banner before they reach Earnings, or only when they try to onboard / resolve? Recommend banner on Earnings home, not blocking other features. **Owner:** product.

---

## Related specs / references

- [payments.md](./payments.md) — earnings ledger, payouts, balance, cancellation policy, disputes
- [settings.md](./settings.md) — primary navigation entry point (Settings → Payments → Stripe Connect) + Legal section (will host full agreement texts)
- [authentication.md](./authentication.md) — coach identity verification prerequisites
- Prototype: `flows/coach/balance.html#s-stripe` — 4-state visualization
- Components: FitCard, FitButton, FitBadge (warn/success), checkbox (`.fit-checkbox`)
- Memory: `project_coach_balance_decisions`, `feedback_backward_compat_endpoints`, `feedback_native_theme_tokens`
- External: [Stripe — Fully embedded Connect integration](https://docs.stripe.com/connect/build-full-embedded-integration), [Stripe — Account onboarding embedded component](https://docs.stripe.com/connect/supported-embedded-components/account-onboarding?platform=ios)
