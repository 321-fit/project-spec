# Invite a Coach (Coach Referral)

> Status: Draft
> Prototype: [flows/coach/referral.html](https://321-fit.github.io/project-spec/prototypes/flows/coach/referral.html) · connect: [flows/shared/connect.html](https://321-fit.github.io/project-spec/prototypes/flows/shared/connect.html)
> Component library: [design-tokens/docs/components.md](../../design-tokens/docs/components.md)
> Last updated: 2026-07-20
> Implementation:
> - iOS:     [321fit_ios/docs/invite-coach-ios.md] (to be created)
> - Backend: [poly-backend/docs/referrals-api.md] (to be created)
> - Android: [321fit_android/docs/invite-coach-android.md] (to be created)

**Scope note:** this spec covers **coach-to-coach referral** — when a coach invites a coach-friend to join 321Fit. Distinct from athlete-side share-coach-to-friend (covered in `deep-linking-referrals.md`). The data model is shared (single `referrals` table), but the entry point, copy, and audience are coach-specific.

---

## RE-SPLIT into Connect (QR) + Coach Referral — 2026-07-20 (supersedes the 2026-06-23 unification below)

The single global `invite.html` (3 tabs QR/Contacts/Invited) mixed two unrelated jobs. Re-split along a **utility vs reward-program** axis (a new meaningful axis — not undoing the earlier dedup):

- **`flows/shared/connect.html`** — lightweight in-person "nametag" (Instagram pattern), **role-agnostic** (athlete light / coach dark). Segmented **My code** (avatar + name + OneLink QR + Copy/Share drawer) / **Scan** (native camera viewport). NO contacts import, NO referral/reward content. Purely "we met in person, let's connect". Canonically documented in `deep-linking-referrals.md`; a11y `connect.*`.
- **`flows/coach/referral.html`** — this spec's screen. **Coach-only referral PROGRAM**, dark default, **one scrolling screen, sections not tabs**:
  1. **Offer hero** — gift badge + "Invite a coach — get **1 free month** when they subscribe".
  2. **Your referral link** — OneLink `321.fit/i/{coach}` + Copy + **Share** (native drawer = mass send; **NO contacts multi-select** — that's the Clients-tab import in `deep-linking-referrals.md`, not triplicated here).
  3. **Funnel** — `Joined N · Subscribed M · +M free months`. This is the coach's **OWN reward** at a glance — never the referred coach's private business numbers.
  4. **Recent invites** (last 3) — avatar + name + role/when + trailing status badge (`Subscribed ✓` teal = reward earned / `Joined` neutral). Coach-vs-athlete shown in the meta line.
  5. **See all invites (N)** → push `s-referral-list` (flat, most-recent-first, no filter chips).
  6. **Zero state** — "No one's joined yet" → Share your link.

**Reward = "1 free month when an invited coach SUBSCRIBES" is a fixed PLACEHOLDER.** Reward tiers / final copy / how earned months are displayed & credited are a LATER product decision — the prototype proves the flow + funnel only. Athletes are free (`project_business_model`), so an **athlete joiner never triggers a reward** (shows `Joined`, no badge).

**Athlete referral = OUT OF SCOPE** — no reward-funding model yet (session-credit deferred). Athletes only get **Connect**.

**Entry points (repointed 2026-07-20):** Coach Settings "Invite to 321Fit" → **"Refer a coach"** → `referral.html` (a11y `coach.settings.refer`). Own coach Profile Share icon → **Connect** (old inline `profile-share-sheet` removed). Visited coach profile (`shared/profile.html`) Share → KEPT as plain forward-this-coach (guest ≠ connect). Athlete My Coaches + Settings → Connect. Second referral entry (Dashboard widget) added on `coach/dashboard.html`.

**Additive backend delta vs § 6 below:** `GET /coach/me/invites` items gain **`role`** (coach|athlete) + **`reward_status`** (joined|subscribed) + funnel counts. Coach-subscription hook flips `reward_status → subscribed`, credits inviter `+1 month`, fires push `REFERRAL_SUBSCRIBED`. Reward-crediting logic (apply months / tiers / caps / fraud guards) deferred. All additive per `feedback_backward_compat_endpoints` — the flat MVP list still works without them. a11y scope `referral.*` (superseding the global `invite.*`).

**Orphaned prototypes (kept, marked in INDEX):** `flows/shared/invite.html`, `flows/coach/invite-coach.html`. The `referrals` data model + endpoints in § 6 below still apply; the § 4 screen layout is superseded by the funnel screen above.

---

## UNIFIED into one global Invite screen — 2026-06-23

All invite surfaces (coach "Invite a Coach", athlete "Invite a friend" placeholder, athlete My-Coaches "Invite a coach", and contact-import-as-invite) are now **one canonical screen**: **`flows/shared/invite.html`** ("Invite to 321Fit"), role-adaptive (athlete light / coach dark), reached from every entry point (Settings + My Coaches). Three tabs:

- **QR** — avatar + name + OneLink QR + Copy link / Share (native sheet).
- **Contacts** — same primitive as the coach Clients import (search · Select all · `On 321Fit` tags · multi-select); footer "Invite N" opens the **native share drawer** (WhatsApp / Messages / Copy / More) with your OneLink — nothing sent automatically.
- **Invited** — people who joined through your link (generalises the "joined coaches" list of the old `s-invite-coach` below). Each row: "Joined as coach/athlete · when" + a **Message** action → chat. Has a zero state. Joined-only; pills/rewards still deferred to Phase 2.

The old `s-invite-coach` / `s-invite-coach-list` screens below are **superseded** by the Invited tab; `coach/invite-coach.html` is orphaned (kept for now). The `referrals` data model + endpoints below are **unchanged** and still apply. a11y scope is now global `invite.*`.

---

## 1. Overview

A coach shares a referral link via the OS-native share sheet. Backend tracks who joined through whom by token. The MVP intentionally **does not capture invitee contact** (no email/phone form) — coach just shares the link, anyone who signs up with that token becomes a tracked referral.

The screen has two surfaces:
- **Main** (`s-invite-coach`) — hero, invite link card + Copy/Share, inline list of 3 most-recent joined coaches, "See all invites" link
- **All invites push** (`s-invite-coach-list`) — flat scrollable list of every joined coach

Status pills (Pending / Joined / Active) and filter chips are **NOT in MVP** — share-link path can't know who's pending (we never captured their contact). See § 10 Decisions.

---

## 2. User Stories

### Coach

- As a coach, I want to invite other coaches I trust so they can join 321Fit.
- As a coach, I want to share my invite link via my usual channels (Messages, WhatsApp, email) without having to type anyone's email into the app.
- As a coach, I want to see which coaches actually joined through my link, so I have visibility (and future eligibility for rewards).
- As a coach, I expect that "we'll track who joined for future rewards" is honest — the system records the linkage now, rewards mechanic lands later.

### Invitee (recipient)

- As a recipient who isn't yet a 321Fit member, I want the invite link to take me somewhere I can sign up easily.
- As a recipient who's already a member, I want a benign "Welcome back" landing — no awkward "you can't accept this invite" message.

---

## 3. System Stories

- As the system, when a coach taps Share, I open the OS-native share sheet pre-filled with the invite text + link.
- As the system, when a coach taps Copy, I write the link to the clipboard + show a transient "Link copied" snackbar.
- As the system, when someone signs up using a referral token, I create a `referrals` row linking the invitee to the inviter.
- As the system, I do NOT create a `referrals` row at link-share time — there's no invitee to link yet.
- As the system, I log `track-open` events for funnel analytics without creating any DB rows.

---

## 4. Flows

### Main screen (`s-invite-coach`)

1. **Header** — back chevron → `settings.html` + title "Invite a coach"
2. **Hero** — brand-gradient round badge (96×96) with handshake icon + "Grow the community" title + subtitle "Know a coach who'd thrive on 321Fit? Share your invite link — we'll track who joined through you for future rewards."
3. **Your invite link** section:
   - Link card: link icon + URL (`321fit.app/i/jm-r3F7q9`) + brand-pill **Copy** button
   - Secondary CTA below: **Share invite link** (surface-high pill, 50pt height) → opens native share sheet
4. **Your invites (N joined)** section:
   - Inline list of 3 most-recent joined coaches (avatar + name + "Joined N ago")
   - "See all invites ›" link below → push to `s-invite-coach-list`
   - States: default / empty / loading / error (see § 5)

### All invites push (`s-invite-coach-list`)

Reached from "See all invites" link on main screen.

1. **Header** — back chevron + "Your invites"
2. **Flat list** — every joined coach (avatar + name + "Joined N ago"), most-recent-first, cursor pagination 20 per page
3. No filter chips, no status pills (MVP scope cut)

Empty-state UI lives on main screen, not here — if list is empty, "See all invites" link is hidden so the push isn't reachable.

### Share flow

- **Copy**: `navigator.clipboard.writeText()` (web) / `UIPasteboard.general.string` (iOS) / `ClipboardManager.setPrimaryClip` (Android) → snackbar "Link copied" 1400ms
- **Share invite link**: opens system share sheet
  - iOS: `UIActivityViewController(activityItems: [shareText])`
  - Android: `Intent.ACTION_SEND` with `type = "text/plain"` + `Intent.EXTRA_TEXT`
  - Web: `navigator.share({ title, text })` on supported mobile browsers, fallback hidden on desktop
- Pre-filled share text: `"Join me on 321Fit — the marketplace for coaches and athletes. {link}"`

---

## 5. States

Main-screen list state machinery (`#s-invite-coach` class toggle):

| Class | List render |
|---|---|
| `ls-default` | 3 invite rows + "See all invites" link |
| `ls-empty` | `FitEmptyState` "No invites yet — Share your link with a coach you trust" |
| `ls-loading` | 3 skeleton-shimmer rows (~64pt height each) |
| `ls-error` | Inline red banner "Couldn't load your invites" + Retry |

Snackbars:
- `ic-copied-snack` — "Link copied" 1400ms
- `ic-shared-snack` — "Invite shared" 1400ms (fires after native share sheet returns; optional, OS-dependent)

---

## 6. API

Canonical reference: [`poly-backend/docs/referrals-api.md`](../../poly-backend/docs/referrals-api.md) (to be created).

### Data model

`referrals` table (new):

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `inviter_user_id` | UUID | FK → users.id (coach who shared link) |
| `referral_token` | String | Unique slug used in URL. Format `{first_initial}{last_initial}-{6char base62}`, e.g. `jm-r3F7q9`. **Stable per coach** — same token reused across all their invites (attribution simplicity) |
| `invited_contact` | String? | NULL in MVP (share-link path captures nothing). Populated only when Phase 2 invite-by-email path lands. |
| `invitee_user_id` | UUID? | FK → users.id, NULL until invitee signs up |
| `status` | Enum | Single value in MVP: `joined`. Phase 2 adds `pending`, `active` |
| `created_at` | timestamp | Row insertion time |
| `joined_at` | timestamp? | When invitee signed up using this token |
| `activated_at` | timestamp? | Phase 2: when invitee completed first qualifying session |

**MVP write path:** rows are created ONLY when someone signs up with a token. No row at share time. No row for "opened the link but didn't sign up".

### Endpoints

All additive per `feedback_backward_compat_endpoints`.

| Endpoint | Purpose |
|---|---|
| `GET /coach/me/referral-link` | Returns `{ url: "https://321fit.app/i/jm-r3F7q9", token: "jm-r3F7q9" }`. Same value across all calls per coach (stable token). |
| `GET /coach/me/invites?limit=20&cursor=...` | Paginated list of joined coaches: `[{invitee_id, invitee_initials, invitee_name, joined_at}]`, most-recent-first. **Status field NOT included in response on MVP** — adds it in Phase 2. |
| `POST /referrals/track-open` | Fired from public landing page at `321fit.app/i/<token>`. Funnel analytics only — does not create a referral row. Body: `{ token, referrer, ts }`. |
| Signup endpoint (existing) | Accepts new optional param `referral_token: String`. When present, server resolves token → inviter, creates `referrals` row with `invitee_user_id = newUser.id`, `status = joined`. |

### Phase 2 endpoints (NOT in MVP)

- `POST /coach/me/invites` — coach enters invitee email/phone, backend creates a `pending` row, sends transactional email/SMS with the link.
- Activation hook: when invitee completes first session as a coach, status → `active`, fires push `TargetRoute=REFERRAL_ACTIVATED` to inviter.

---

## 7. Business rules

- **Token is stable per coach** — same `referral_token` value across all invites this coach sends. Tradeoff: can't differentiate "which exact share landed this signup" but vastly simpler to manage. Acceptable for MVP — rewards are bucket-based ("you brought in N coaches"), not per-invite.
- **No row at share-time** — the act of sharing a link is invisible to the backend. We can't track "you sent 50 links, 3 joined" — only "3 joined through your link". This is intentional: simpler data model, no spam invites, no privacy concerns about tracking who got the link.
- **Token format is non-secret** — `jm-r3F7q9` is meant to be shareable + memorable. Anyone with the token can sign up under that referrer. We're not protecting against fraud here — referral abuse becomes an issue only when rewards are real (Phase 2).
- **Invitee can be any new account type** — though copy says "coach", system accepts athlete signups too (still credited to inviter). Phase 2 may filter rewards to coach-only attribution.
- **No expiry on tokens** — referrals stay valid indefinitely.
- **Self-referral blocked** — backend rejects signup if `referral_token` resolves to the same user (e.g., someone trying to claim their own link from another device).

---

## 8. Edge cases

- **Invitee was already a member when they opened the link** — public landing detects logged-in member, shows benign "Welcome back" without any referral linking. No row created.
- **Invitee signs up with different email than expected** — irrelevant; matching is by `referral_token`, not contact info.
- **Coach deletes account** — referrals stay in the DB; `inviter_user_id` soft-nulled with anonymous label "A former coach" in invitee's own UI if ever surfaced.
- **Invitee deletes account post-signup** — referrals row is preserved (audit trail), but `invitee_user_id` soft-nulled; row drops from `GET /coach/me/invites` response.
- **Multiple devices, same person** — first device that signs up wins. Other devices opening the link land on "Welcome back" if already authenticated, or on signup screen if not (where the token still applies).
- **Network failure during Copy** — `navigator.clipboard` rejects: catch error silently, don't show snackbar. User can long-press to copy via system menu.
- **Native share dismissed** — no error UI. Snackbar fires only if `navigator.share()` resolves (some platforms reject on dismiss; that's fine — silent).
- **Web prototype on desktop** — `navigator.share` undefined; snackbar still fires for demo purposes. Production native apps always have share API.

---

## 9. Platform notes

### iOS

- Native share: `UIActivityViewController(activityItems: [shareText, shareURL])`
- Copy: `UIPasteboard.general.string = link`
- Snackbar: standard `FitSnackbar` component, bottom 100pt offset
- Deep link landing: `321fit.app/i/<token>` routes through `Core/Deeplink/DeeplinkType.swift` → `RefererralLandingViewController`
- AppsFlyer integration per `deep-linking-referrals.md` — existing infra, this spec extends with coach-specific entry point

### Android

- Native share: `Intent.ACTION_SEND` with `Intent.createChooser(...)`
- Copy: `ClipboardManager.setPrimaryClip(ClipData.newPlainText("referral", link))`
- Deep link: App Links registered for `321fit.app/i/*` → routes to landing activity

### Web (prototype only)

- `navigator.share()` works on mobile Safari + Chrome on HTTPS. Desktop has no share API — snackbar fires for demo continuity.
- `navigator.clipboard.writeText()` requires HTTPS + user-activation (button click satisfies this).

### Kit components used

- `FitAvatar(.md, .brand)` — invitee row leading
- `FitEmptyState` — empty list state
- `FitSnackbar` — Copy / Share confirmation
- `sk-shimmer` — loading state skeleton rows

### Kit candidates (propose in follow-up)

- **`FitInviteRow`** — avatar + name + when (no trailing pill since pills are out-of-scope on MVP). Used 2× in this prototype (main inline list + push). Worth extracting to kit if athlete-side referral lands with the same row pattern.

---

## 10. Decisions

Locked product/UX decisions — NOT open questions:

- **No status pills (Pending / Joined / Active) in MVP.** Share-link path doesn't capture invitee contact, so "pending" is unknowable. Adding pills suggests capability we don't have. CSS + JS for pills was REMOVED from prototype, not just hidden.
- **No filter chips on All Invites push in MVP.** Same reasoning — without statuses, nothing to filter by. Sticky filter row will land in Phase 2 alongside pill UI.
- **MVP entry point is share-link only.** No invite-by-email form. Coach pastes / shares the link with people they already know how to contact.
- **Rewards intentionally out-of-scope.** Hero subtitle "we'll track who joined through you for future rewards" sets expectation without committing to a specific reward.
- **Token format is stable per coach, not per-invite.** Decision: attribution simplicity beats per-invite analytics granularity at this scale.
- **Phase 2 unlocks** — pill UI lands when EITHER (a) invite-by-email path ships (gives us pending state), OR (b) rewards mechanic ships (gives "active" meaning). Both are additive on the same `referrals` table.
- **YouTube `nocookie` domain for embedded video links** — not relevant here (this is text + link share, not embedded media).
- **Settings menu entry stays "Invite a Coach"** — same copy used in Coach Settings list. Athlete-side analog called "Invite a Friend" lives in `deep-linking-referrals.md` scope.

---

## Related specs

- `deep-linking-referrals.md` — existing AppsFlyer infra + athlete-side referral; shared backend pieces
- `settings.md` — Settings list entry point
- `notifications.md` — `TargetRoute=REFERRAL_ACTIVATED` push (Phase 2 only)
