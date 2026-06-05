# Settings

> Status: Draft
> Prototype (coach): [flows/coach/settings.html](https://321-fit.github.io/project-spec/prototypes/flows/coach/settings.html)
> Prototype (athlete): [flows/athlete/settings.html](https://321-fit.github.io/project-spec/prototypes/flows/athlete/settings.html)
> Last updated: 2026-06-05 (athlete Settings landed — trimmed analog of coach; Balance → athlete spending screen)

## Overview

Settings is reached via the **⚙️ gear icon in the top-right of the Profile tab** (coach side; athlete-side analog when athlete profile lands). Settings is **NOT a tab root** anymore — it lives behind the gear, as secondary entry. Primary editing of profile data happens in-place on the Profile tab itself (per [coach-profile.md](./coach-profile.md)).

Settings hosts:
- Personal Data editor (advanced fields not on public profile: TZ, country, languages, DOB, gender)
- Account Access (login & security)
- Calendar Sync
- Invite a Coach (referral)
- Balance / Stripe Connect (payment account)
- Help / Support (TBD)
- Log out / Delete account

Notes / Coaching subsection (Sport Types, Training Sessions, Available Hours, GYM Locations) **moved out of Settings** to inline edit affordances on the Profile tab. Each one is still its own push-screen file but reached via the management tile on Profile, not via Settings.

## Screens

### Coach Settings (post-2026-05-12 restructure)

| Section | Items | Destination |
|---|---|---|
| Profile | Edit personal info | [personal-data.md](./personal-data.md) |
| Profile | Invite a Coach | [invite-coach.md](./invite-coach.md) |
| Calendar | Calendar Sync | [calendar-sync.md](./calendar-sync.md) |
| Payments | Balance | (existing) |
| Payments | Stripe Connect | (existing) |
| Account | Account Access (Login & Security) | [account-access.md](./account-access.md) |
| Account | Help / Support | (TBD) |
| Account | Log out | inline action |
| Account | Delete account | (re-auth flow) |

**Removed from this menu** (now lives inline on Profile tab):
- Sport types → tap "My Sports" header on Profile → [sport-picker.md](./sport-picker.md)
- Training sessions → tap "Training Sessions" tile on Profile → session-creation.md
- Available hours → tap "Available Hours" tile on Profile → available-hours screen
- GYM locations → tap "Locations" tile on Profile → [location-picker.md](./location-picker.md)

### Athlete Settings (landed 2026-06-05)

Reached via the **gear** on the athlete Profile tab → `settings.html`. Same `.set-card` grammar and section grouping as coach, trimmed to athlete scope. Ends with a **version footer** (`v1.45 (build 4) · STAGING`).

| Section | Item | Subtitle | Destination |
|---|---|---|---|
| Profile | Edit personal info | Avatar, name, gender, height, weight | Personal Data (athlete variant — **TBD**, stubbed) |
| Profile | Invite a friend | Recommend the app to a friend | placeholder (referral on hold — [invite-coach.md](./invite-coach.md), memory `project_invite_a_coach`) |
| Training | Choose a sport | Basketball, Tennis | [sport-picker.md](./sport-picker.md) (shared `sport-types.html`) |
| Training | Calendar Sync | Google connected | [calendar-sync.md](./calendar-sync.md) |
| Payments | Balance | €240.00 | [payments.md](./payments.md) — athlete Balance screen (`balance.html`) |
| Account | Account Access | Login and security | [account-access.md](./account-access.md) (shared) |
| (footer) | Log out | — | inline action → "Signed out" toast |

**Diff vs coach Settings:**
- ❌ no Stripe Connect / payout rows (athlete pays, never receives)
- Earnings → **Balance** (spending screen)
- Invite a Coach → **Invite a friend**
- ➕ **Choose a sport** surfaced here (coach edits sports inline on Profile; athlete has no public profile storefront, so the sport edit lives in Settings + the Profile "My sports" pencil)

Athlete-side Personal Data **does include** body metrics (weight + height in kg/cm). Coach-side intentionally omits them — see [personal-data.md § 10](./personal-data.md).

## UI Components

- **set-card** — leading icon + title + subtitle + chevron. Kit-aligned per `FitSettingsCard` (extended with `--location` / `--space` variants for location list use).
- **Section titles** — 16px medium normal-case, not uppercase (`FitSectionTitle--md` kit-candidate). Differs from kit's existing `.fit-section-title` which is 12px UPPERCASE.
- **Log out** — standalone destructive text + icon, not in a card.
- **Delete account** — same row pattern, Medium destructive tier (red tinted), gated behind re-auth.

## Navigation

- Tap **set-card** → push to dedicated screen (Personal Data, Calendar Sync, Account Access, etc.).
- Tap **Invite a Coach** → push to `invite-coach.html` (referral).
- Back chevron at top → returns to Profile tab (caller).

## Theme

Theme is a **user preference, not role-based** — per [architecture/design-system.md § Native theming contract](../architecture/design-system.md#native-theming-contract). Both roles must support both themes. No hardcoded hex; use `theme.surfaceDefault` / `theme.screenBg` tokens.

## Platform notes

- Native UI conventions per `architecture/design-system.md`.
- Settings is reached via gear → push (not tab nav), so the navbar at the bottom is NOT rendered on settings or any of its sub-screens (per `feedback_navbar_visibility`).

## Related specs

- [coach-profile.md](./coach-profile.md) — primary editing entry point; gear here pushes to Settings
- [personal-data.md](./personal-data.md) — Edit personal info destination
- [invite-coach.md](./invite-coach.md) — Invite a Coach destination
- [calendar-sync.md](./calendar-sync.md), [account-access.md](./account-access.md), [sport-picker.md](./sport-picker.md), [location-picker.md](./location-picker.md), [coach-maturity-model.md](./coach-maturity-model.md)
- [profile-settings.md](./profile-settings.md) — historical combined doc, superseded by this + coach-profile + personal-data
