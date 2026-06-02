# Stripe Connect — Onboarding + In-App Control

> Status: Approved
> Prototype: [flows/coach/stripe.html](https://321-fit.github.io/project-spec/prototypes/flows/coach/stripe.html)
> Parent spec: [payments.md](./payments.md) — ledger, balance, cancellation policy
> Component library: [design-tokens/docs/components.md](../../design-tokens/docs/components.md)
> API reference: [poly-backend/docs/stripe-onboarding-frontend-guide.md](https://github.com/321-fit/poly-backend/blob/main/docs/stripe-onboarding-frontend-guide.md)
> Last updated: 2026-06-02
> Implementation:
> - iOS:     [321fit_ios/docs/stripe-ios.md] (to be created)
> - Backend: [poly-backend/docs/stripe-connect-backend.md] (to be created)
> - Android: (future — same backend contract)

---

## 1. Overview

This spec covers **everything Stripe-Connect-related** for the coach: connecting the account (3-step native onboarding), managing it inside the app (control center), and paying out (auto schedule + manual Withdraw).

**Three-way migration from previous state:**

| Was | Now |
|---|---|
| Stripe Express accounts | Stripe Connect **Custom** accounts |
| Safari `SFSafariViewController` mid-flow | 100% native screens, no WebView |
| 5 onboarding screens (Country / Personal / Business / ID / Bank) | **3** onboarding screens (Confirm / Verification / Payout) |
| "Manage on Stripe" → Stripe Dashboard redirect | Native in-app control center |
| Bank account only | Bank account **or** Debit card (Instant Payouts) |
| 4 lifecycle states (none / pending / done / action) | **2** lifecycle states (none / connected) + sub-modes inside connected |

**Why Custom accounts:** Stripe Custom (`controller.stripe_dashboard.type = none`) is the only Connect account type where every onboarding step can be rendered in-app without forced Safari redirects. Express forces redirects mid-flow for verification; Standard is even more hosted. Custom = full control + full responsibility.

**Why drop Country + Business screens:** the previous flow asked the coach for country (which we already know from their profile) and business details (MCC, URL, product description — which we hardcode `7997` for everyone and auto-derive URL/description from `coach_profile.social_link` + `bio`). Both screens were 0-decision screens — pure friction. Backend now sets these silently via `POST /account` + `PATCH /business-profile` during the first call of the flow.

**Why fold Verifying + Action into Connected sub-modes:** Stripe lets the account exist (and accept card payments) even while payouts are paused. Modeling them as separate lifecycle states was misleading — coach thought a "verifying" account was different from a connected one. The correct mental model: the account is either set up or not; verification status is a flag on top.

---

## 2. User Stories

### Coach

- **As a coach signing up**, I want to connect Stripe in 3 minutes without leaving the app so I can start receiving payments today.
- **As a coach**, I want all my profile data (name, email, phone, country, DOB, address) pre-filled from what I already gave 321Fit so I'm not retyping anything.
- **As a coach who took a few photos**, I want to upload my passport once and have Stripe verify me — I don't want to learn what an "MCC" is or what "1099" means.
- **As a coach who wants money fast**, I want the option to send payouts to a debit card (under 30 min) instead of waiting 1–2 days for a bank transfer.
- **As a coach**, I want to see when my next payout arrives and how much is available — directly inside the app, not by logging into Stripe Dashboard.
- **As a coach with a balance**, I want to push a Withdraw button and get my money now (manual mode), bypassing the weekly schedule.
- **As a coach disconnecting Stripe**, I want a warning if I have a pending balance or upcoming card-paid sessions so I don't accidentally lose money or trigger refunds.

### System

- **As the platform**, I never want a coach to land on a Stripe-hosted Safari page mid-flow.
- **As the platform**, I want one source of truth for coach personal data (`coach_profile`) — edits inside Stripe flow sync back so I don't end up with divergent records.
- **As the platform**, I want to be the only UI surface for payout management — coaches should never need to know that Stripe Dashboard exists.
- **As the platform**, I want to be able to extend payout methods in the future (Revolut Business, crypto, regional providers) without rebuilding the UI.

---

## 3. Architecture

### 3.1 Account model

Stripe Connect Custom account per coach, identified by `coach_profile.stripe_account_id`. Controller config (set once on creation):

```python
controller = {
    "stripe_dashboard": {"type": "none"},      # No dashboard hosted by Stripe
    "fees": {"payer": "application"},          # We collect application fees
    "losses": {"payments": "application"},     # We take payment loss liability
    "requirement_collection": "stripe",        # Stripe still owns the verification UI semantics
}
capabilities = {
    "card_payments": {"requested": True},
    "transfers": {"requested": True},
}
business_type = "individual"                    # Hardcoded — every coach is an individual sole prop
```

Migration of existing Express coaches: `stripe_account_id` is cleared, coaches re-onboard under the new Custom flow. <5 affected coaches in prod — manual outreach.

### 3.2 Account lifecycle

Two states only:

| State | Condition | Coach UI |
|---|---|---|
| `not_set_up` | `coach.stripe_account_id` is null | Intro + consent + "Start setup" |
| `connected` | `stripe_account_id` exists | Control center (banks + payouts + manual + activity + disconnect) |

Inside `connected`, three sub-modes derived from Stripe account flags:

| Sub-mode | Condition (from Stripe `retrieve_account`) | UI cue |
|---|---|---|
| `clean` | `payouts_enabled = true` AND `requirements.currently_due` is empty | Green pill "Payouts active" |
| `verifying` | `details_submitted = true` AND `payouts_enabled = false` AND `requirements.currently_due` is empty (waiting on Stripe review) | Blue info banner "Verifying your details" |
| `action` | `requirements.currently_due` is non-empty | Yellow warn banner naming the missing fields + CTA deep-linking to the relevant onboarding step |

Webhooks (`account.updated`, `capability.updated`) drive sub-mode transitions; client refetches `/account-status` on screen open as fallback.

### 3.3 Native-only UI contract

The iOS / Android app renders **every screen in this spec natively**. Stripe Identity SDK is the **only** Stripe-provided UI used — and only for ID document capture (camera access + framing overlay). All other steps (forms, lists, sheets) are FitUI components consuming the JSON API directly.

No `SFSafariViewController`, no embedded WebView, no Stripe Dashboard link.

---

## 4. Onboarding Flow (3 native steps)

Entry: coach taps "Start setup" on `s-stripe` not-set-up state (after checking the consent checkbox).

Backend prerequisite: `POST /coach/stripe-onboarding/consent` records `{ accepted_at, ip, consent_version }`. Account creation refuses without it.

### Step 1 — Confirm info (`s-stripe-onb-confirm`)

Single review screen with 6 rows. All editable. Mobile-first 2-line layout per row (label uppercase ~12px on top, value ~16px below, ~68px row height for tap target).

| Row | Source | Edit mechanism | Notes |
|---|---|---|---|
| **Name** | `coach.first_name + last_name` | Push `s-stripe-onb-edit-name` (iOS Cancel-Save header pattern, two inputs) | Must match government ID. Edits sync back to `coach_profile`. |
| **Email** | `user.email` | Push `s-stripe-onb-edit-email` | Stripe-only contact — doesn't change sign-in email. |
| **Phone** | `user.phone_number` | Push `s-stripe-onb-edit-phone` (country code dropdown + tel input) | Stripe may SMS-verify during onboarding. |
| **Country** | `coach_profile.country` | Push `s-stripe-onb-edit-country` (searchable list + warn banner "Changing country resets verification — you'll re-upload ID") | Cannot be changed once Stripe verifies the account (locked at first PATCH that includes country). |
| **Date of birth** | `coach_profile.birth_date` | Canonical 3-wheel **`dob-picker-sheet`** (copied verbatim from `personal-data.html`) | 13+ enforced — same validation as personal data. |
| **HQ address** | `coach_profile.address` (training-area hint) | Push `s-stripe-onb-edit-address` (line1 + line2 + city + postal code; country from confirm screen) | **Mandatory.** Yellow "Required" label. Continue disabled until filled. Tax-form address — not training location. |

**Hidden fields (backend sets silently, no UI):**

- `business_type: "individual"` — hardcoded
- `mcc: "7997"` — Membership Clubs / Health & Fitness Services
- `url` — from `coach_profile.social_link` if present, else null
- `product_description` — from `coach_profile.bio` if present, else null

Continue → backend `PATCH /coach/stripe-onboarding/individual` with merged payload → `s-stripe-onb-id`.

### Step 2 — Verification (`s-stripe-onb-id`)

Document type segmented control at top:

| Option | Tiles visible | Stripe document key |
|---|---|---|
| **Passport** (default) | 1 (front only) | `document.front` |
| **ID / driver's license** | 2 (front + back) | `document.front` + `document.back` |

**Always-visible info banner** above tiles: *"Required to receive payouts. Card payments work either way. Until verified, earnings stay safe in Stripe but can't be paid out. You can finish this later from the Stripe screen."*

**Camera-only capture.** Tap on a tile launches Stripe Identity SDK → system camera (UIImagePickerController in `.camera` mode on iOS; Android equivalent). Not a gallery picker — Stripe enforces fresh captures to prevent edited / stale documents. SDK handles framing overlay + auto-detects edges + compression before upload. **File never hits 321Fit backend** — Stripe Verification API consumes it directly. Backend just receives the `verification.document.front/back` token and saves it.

**One Continue button** — no Skip. Continue proceeds regardless of upload state (the banner already explained the consequence):

- Both tiles uploaded → on return `s-stripe` lands in `connected · verifying`
- Empty → on return `s-stripe` lands in `connected · action`

### Step 3 — Payout destination (`s-stripe-onb-bank`)

Same Bank ↔ Debit card segmented control as the post-onboarding Add method screen (consistency). Default = **Bank**.

| Type | Recommended hint | Fields | Stripe `external_account.type` |
|---|---|---|---|
| **Bank** (default) | "Recommended. SEPA · 1–2 business days · free" | IBAN + SWIFT/BIC (optional) | `bank_account` |
| **Debit card** | "Instant Payouts · under 30 minutes · 1% Stripe fee · debit cards only" | Card number + Expiry + CVC | `card` |

Holder + Country always shown above the form (from Confirm step, read-only here — change in Confirm if wrong).

T&C consent **required** (checkbox enables Submit). Consent copy adapts noun ("account" vs "card") based on selected type.

Submit → backend `POST /coach/stripe-onboarding/external-account` (with type-specific body) → `POST /coach/stripe-onboarding/accept-tos` → `s-stripe`. Both must succeed; rollback on partial fail.

**Country gating for card:** Stripe enables `card` external accounts only in countries with Instant Payouts capability (US, UK, EU incl. Spain, FR, DE, IT). If coach's country is unsupported, backend returns `400 card_external_account_unsupported_country` → frontend hides the Card tab + shows toast. **v1 ships without the gate** — Spain is the test market, gate gets added when we expand.

---

## 5. Control Center (`s-stripe` connected state)

After onboarding completes successfully, `s-stripe` becomes the persistent home for everything payout-related.

### 5.1 Hero

- Stripe logo plate (56×56, brand color `#635BFF`)
- Status line: "Stripe connected"
- Status pill (color + dot + text) per sub-mode:
  - `clean` — teal "● Payouts active"
  - `verifying` — blue "● Payouts pending verification"
  - `action` — yellow "● Payouts paused"

**Account ID + Country are NOT shown** — low-value chrome that confuses more than informs.

### 5.2 Sub-mode banner

Rendered just above the hero for `verifying` and `action`:

- `verifying` — `FitInfoBanner` info variant: "Verifying your details — usually within a few hours." Stripe is reviewing what was submitted.
- `action` — `FitInfoBanner` warn variant: "Identity document needed. Card payments work, but payouts are paused until you upload an ID." Inline CTA "Upload ID now" deep-links to `s-stripe-onb-id`.

Banner is hidden in `clean` sub-mode.

### 5.3 Payout methods section

Mixed list of bank + card external accounts. Each row uses `FitPaymentMethodCard` with:

- **Icon** — building (bank) or card (debit card)
- **Title** — `{name} · ···· {last4}` (e.g. "BBVA · ···· 4821", "Visa debit · ···· 7732")
- **Subtitle** — composite:
  - `Default` badge if `default_for_currency = true`
  - Type tag: "Bank · 1–2 days" / "Card · Instant · 1% fee"
- **Chevron** → push `s-stripe-bank-detail` (same screen handles both types via `data-method-type`)

Below the list: canonical dashed "+ Add payout method" card → push `s-stripe-bank-add` (unified Bank ↔ Card screen).

### 5.4 Payouts block

Always visible (both auto + manual modes):

| Row | Auto | Manual |
|---|---|---|
| Available | €240 | €240 |
| Next payout | Mon, Apr 27 | "Manual · on demand" (dim) |

Plus a Schedule KV row "Weekly · Monday" (auto only).

### 5.5 Manual mode toggle

`FitToggle` row. Off = auto (default), on = manual.

When ON:
- Schedule row hides
- Yellow sub-text: "Money stays in Stripe until you tap Withdraw"
- "Withdraw €240" primary CTA appears below → push `s-stripe-withdraw`

Backend: `PATCH /coach/stripe-onboarding/payouts-schedule` body `{ schedule: "manual" | "weekly_monday" }` → Stripe `account.update.settings.payouts.schedule`.

### 5.6 Activity preview

3-row preview, "View all" → push `s-stripe-payouts` (full history).

Status palette matches Stripe's `payouts.list` enum:

| Status | Color | Sub-text |
|---|---|---|
| `paid` (completed) | teal | "Mon, Apr 27 · Completed" |
| `in_transit` | blue | "Today · In transit · arrives Tue, May 6" |
| `pending` | blue | "Today · Pending" |
| `failed` (retried) | red | "Mon, Mar 30 · Failed · retried" |

### 5.7 Disconnect

Destructive button at bottom → opens disconnect sheet with 3 variants:

| Variant | Trigger | UX |
|---|---|---|
| `clean` | No pending balance, no future card events | Simple "Disconnect Stripe?" + Disconnect / Cancel |
| `pending-balance` | Available balance > 0 | Yellow warn + "You have €240 in Stripe. Withdraw first?" → CTA "Withdraw first" OR text "Disconnect anyway" |
| `active-events` | Future card-paid sessions exist | Yellow warn + "3 card-paid sessions ahead — disconnecting will refund those payments. Athletes will need to re-pay in cash." + "Keep Stripe" / "Disconnect anyway" |

Confirm → `DELETE /coach/stripe-onboarding/account` → clears `stripe_account_id` → `s-stripe` returns to `not_set_up`.

---

## 6. Withdraw (Manual mode only)

Screen `s-stripe-withdraw`. Reachable only when manual toggle is ON.

- Large amount input (€ + numeric)
- 3 quick chips: €50 / €100 / All
- Destination row: current default external account (Bank or Card)
- ETA copy: "1–2 business days" (bank) / "Under 30 minutes · 1% fee" (card)
- Confirm → `POST /coach/stripe-onboarding/payout` body `{ amount, currency }` → toast "Withdrawal requested" → back to `s-stripe` with refreshed Available

**Minimum €20** enforced both client + server side. Below-min input shows warn banner + disables Confirm.

---

## 7. Payouts History (`s-stripe-payouts`)

Lifetime list grouped by month. Lifetime summary card on top: "Total paid out €1,840 · 12 payouts since Mar 2026."

Each row: destination + date + status + amount. Status colors as in §5.6. Tap row → reuses `#s-txn-payout` in `balance.html`.

Pagination: 20 per page via cursor.

---

## 8. API Reference

All endpoints live under `/api/v1.0.0/coach/stripe-onboarding/` and require coach JWT.

See **[poly-backend/docs/stripe-onboarding-frontend-guide.md](https://github.com/321-fit/poly-backend/blob/main/docs/stripe-onboarding-frontend-guide.md)** for full request/response shapes and the `auto` / `hints` semantics of `/prefill`.

| Endpoint | Purpose | Notes |
|---|---|---|
| `GET /prefill` | Pull pre-filled data | Splits into `auto` (silent fill) + `hints` (editable fill) |
| `POST /account` | Create Custom account | Country auto from profile, business_type + MCC hardcoded |
| `PATCH /individual` | Personal details | Body merges name/email/phone/dob/address; **address fields validated (line1+city+postal_code required)** |
| `PATCH /business-profile` | URL + product_description | Backend calls this silently with profile data; not a user-facing screen |
| `POST /id-document` | Upload front/back | Multipart; backend forwards to Stripe Verification |
| `POST /external-account` | Add bank or card | Body type-discriminated: `{type: "bank_account", iban, …}` or `{type: "card", number, exp_month, exp_year, cvc}` |
| `POST /accept-tos` | Record T&C consent | Required after `/external-account` |
| `GET /account-status` | Refresh sub-mode | Returns `{ payouts_enabled, charges_enabled, requirements_currently_due, details_submitted }` |
| `POST /consent` | Record legal consent | Records `{accepted_at, ip, consent_version}`. Required before `/account` |
| `PATCH /external-account/{id}` | Set as default | Body `{default_for_currency: true}` |
| `DELETE /external-account/{id}` | Remove | Backend blocks when last + returns `409 last_external_account` |
| `PATCH /payouts-schedule` | Toggle manual mode | Body `{schedule: "manual"\|"weekly_monday"}` |
| `POST /payout` | Manual Withdraw | Body `{amount, currency}`; min €20 enforced server side |
| `GET /payouts` | History list | Query `?limit=20&before=<cursor>`; returns `{items, next_cursor, lifetime_total}` |
| `DELETE /account` | Disconnect | Clears `stripe_account_id`; cancels future card events with refund (if disconnect-anyway from `active-events` variant) |

---

## 9. Stripe Identity SDK (iOS)

For ID document capture, iOS integrates `StripeIdentity` (peer of `StripeConnect`, also `stripe-ios` SPM).

```swift
let identityVC = IdentityVerificationSheet(
    verificationSessionClientSecret: clientSecretFromBackend
)
identityVC.present(from: hostController) { result in
    switch result {
    case .flowCompleted: // proceed to bank step
    case .flowCanceled:  // stay on verification screen
    case .flowFailed(let error): // toast + retry
    }
}
```

Backend creates the `VerificationSession` on screen mount and returns `client_secret`. The SDK opens system camera, captures front/back, posts to Stripe directly. Our backend webhook (`identity.verification_session.verified`) updates `coach.identity_verified = true`.

iOS dev note: `IdentityVerificationSheet` ships with framing overlay + edge detection + retry — do **not** wrap it or replace it with a custom camera. Stripe rejects documents shot through generic camera APIs because Stripe Radar can't validate them.

---

## 10. Data Model

### `coach_profile` additions / changes

```python
stripe_account_id: str | None              # acct_… (Custom account ID)
stripe_account_type: Literal["custom"]     # "express" deprecated; migration sets to "custom"
stripe_consent: {
    accepted_at: datetime,
    ip: str,
    consent_version: str
} | None
payouts_schedule: Literal["weekly_monday", "manual"] = "weekly_monday"
```

### Existing fields read

- `first_name`, `last_name`, `email`, `phone_number`, `birth_date`, `country`, `address`, `social_link`, `bio` — sources for `/prefill` `auto` and `hints`

---

## 11. Design tokens (FitUI components used)

Reuse from existing FitUI:

- `FitSegmented` — Bank ↔ Card, Passport ↔ ID switchers
- `FitToggle` — Manual mode switch
- `FitPaymentMethodCard` — bank + card rows (subtitle composite extension needed)
- `FitSettingsCard` — Confirm screen rows (2-line label/value variant needed)
- `FitSheet` — DOB picker, Disconnect 3-variant sheet, Remove method sheet
- `FitBadge` — Default badge on payout method rows
- `FitInput` — text inputs (name / email / phone / address / IBAN / card number)
- `FitCheckbox` — T&C consent
- `FitButton` — primary / secondary / destructive CTAs
- `FitTransactionRow` — Activity preview + Payouts history rows
- `FitToast` — success notifications

**New components needed (block iOS impl):**

- `FitInfoBanner` — info / warn / error variants with title + body + optional inline CTA. Used in: Verification info banner, Manual mode warn, Card debit-only notice, Connected · verifying, Connected · action.
- `FitUploadTile` — dashed border tap-to-camera tile (icon + title + sub). Used in Verification ID upload.
- `FitProgressBar` — 3-segment horizontal stepper indicator. Used in onboarding header.

**Extensions to existing components:**

- `FitSettingsCard` — add `valuePosition: .below` variant (label uppercase on top, value 16px below). Used in all 6 Confirm rows.
- `FitPaymentMethodCard` — add composite subtitle support (Default badge + type/timing meta inline). Used in payout methods list.

These are documented as dependencies in the iOS issue body (iOS dev opens design-tokens PR + lands them before consuming).

---

## 12. Backward Compatibility

Per `feedback_backward_compat_endpoints`:

**Safe (this spec ships):**
- New endpoints under `/coach/stripe-onboarding/*` — additive
- New optional fields on existing snapshot responses

**Migration (separate cleanup):**
- Legacy `/coach/stripe-onboarding` (Express GET/POST) returns `410 Gone` after iOS V2 prod adoption. Until then it stays returning the legacy account_link redirect URL — clients on V1.x continue working.
- Legacy `stripe_account_type = "express"` rows reset to `null` on next coach login; coach is shown a one-time banner explaining re-onboarding. **Manual outreach** to <5 affected coaches.

---

## 13. Edge Cases

- **OAuth/SDK cancel mid-flow** — `s-stripe-onb-confirm` data is preserved client-side (form state); back from cancel reopens at the same step.
- **Coach edits country in Confirm after verification started** — backend treats as new account creation; old `stripe_account_id` closed, new one created, ID re-upload required (warn banner on Country edit screen makes this explicit).
- **`POST /payout` fails with `insufficient_funds`** — toast "Not enough available" + leave on withdraw screen.
- **`POST /payout` fails with `external_account_required`** — bank/card was deleted between Withdraw screen mount and Confirm; route back to `s-stripe` + show error.
- **Last external account removal** — `DELETE` returns `409 last_external_account`; UI sheet's `last` variant blocks with "Add another bank" CTA before allowing removal.
- **Disconnect with active card sessions** — backend cancels future card-paid `training_event`s + issues refunds via `payment_intent.cancel`; athletes get notification "Coach changed payout method, please re-book in cash."
- **Identity SDK rejects document** — Stripe Radar flags forged/edited/low-quality ID; SDK shows its own retry UI; on persistent failure, coach is shown a help link to Stripe's verification troubleshooting page.

---

## 14. Open Questions

- **Manual payouts threshold UX** — currently we enforce €20 min (same as auto). Should the chips show min on the disabled state when input < €20, or just the banner?
- **Switching destination per withdraw** — v1 always uses the default external account. Should the Withdraw screen let coach tap the Destination row to pick a different one? Defer to v2.
- **Card-as-default + Manual mode interaction** — if card is default and manual mode is on, each Withdraw incurs 1% fee. Should the Withdraw screen show the fee inline? ("You'll receive €237.60 after 1% fee" subtitle.) Defer to v2.
- **Identity verification webhook delay** — Stripe sometimes takes hours to fire `identity.verification_session.verified` even on instant-approve documents. UI shows `verifying` sub-mode until webhook fires. Is the "usually within a few hours" copy honest enough, or should we show a 24-hour ceiling?
