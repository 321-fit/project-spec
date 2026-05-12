# Coach Profile

> Status: Draft
> Prototype: [flows/coach/profile.html](https://321-fit.github.io/project-spec/prototypes/flows/coach/profile.html)
> Component library: [design-tokens/docs/components.md](../../design-tokens/docs/components.md)
> Last updated: 2026-05-12
> Implementation:
> - iOS:     [321fit_ios/docs/coach-profile-ios.md] (to be created)
> - Backend: [poly-backend/docs/coach-profile-api.md] (to be created)
> - Android: [321fit_android/docs/coach-profile-android.md] (to be created)

**Scope note:** this spec covers the **coach-side** profile module — the 5th tab in the coach bottom nav, served as a preview-as-athlete with in-place edit affordances. Athlete-side coach profile (when an athlete is viewing a coach) is the same visual layout — covered separately under discovery / booking flows.

---

## 1. Overview

Profile is **tab 5 of 5** in coach navigation (slot order: Dashboard, Clients, Messenger placeholder, Calendar, Profile). The screen renders the coach's **public profile as athletes will see it**, with **tap-to-edit affordances on every editable section**. The header carries a right-slot **⚙️ gear** that pushes to Settings (secondary entry; primary editing is in-place here).

The page intentionally mirrors the athlete-side `s-coach-v2` layout (hero media → identity → stats → my sports → about → reviews) so coaches see exactly the visual surface athletes will judge them by, with management tiles (Languages / Training Sessions / Locations / Available Hours) added below as a quick jump-off into the corresponding Settings sub-modules.

A `cv-new` family of state classes drives the **new-coach** variant — see § 4 Flows for state matrix and `coach-maturity-model.md` for the graduation rules.

---

## 2. User Stories

### Coach

- As a coach, I want to see my profile exactly as athletes see it so I can spot weak sections (no avatar, no video, sparse bio) and fix them in-place.
- As a coach, I want every editable section to be tappable so I can update content without diving into a separate Settings menu.
- As a new coach, I want to see my progress toward Established status (sessions + reviews) so I know what to focus on.
- As a coach, I want a quick link to Settings (gear icon) for things that aren't on my public profile (account access, calendar sync, log out).
- As a coach, I want to see all my reviews in full (not just card previews) when I tap the reviews carousel.

### Athlete

(Out of scope for this spec — same visual layout is rendered on `flows/shared/profile.html#s-coach-v2` for athlete-facing view. Differences: athlete sees Share + Heart in safe-area instead of gear, "Book Training" sticky footer instead of management tiles, no Maturity progress block.)

---

## 3. System Stories

- As the system, when a coach opens the Profile tab, I render the public profile from `GET /coach/me` plus computed stats (rating / reviews / sessions / price-from), so the coach sees up-to-date numbers.
- As the system, when stats are 0 (new coach), I render the zero-state stat strip (`—` / `0` / `0` / `from €25`) instead of hiding the row, so the layout stays consistent.
- As the system, when `reviews_count < 1 OR sessions_count < 3`, I render the Maturity progress block; once both thresholds are met, the block auto-hides.
- As the system, when the coach has no intro video AND no cover image, I render the brand-gradient + initials fallback on the hero so the screen is never visually empty.
- As the system, when a coach taps a review card or the "Show all N reviews" terminal card, I push to `s-coach-reviews` with rating histogram + per-category averages + full review bodies.

---

## 4. Flows

### Layout (top to bottom)

1. **Header** — title-only "Profile" + right-slot gear → `settings.html`. No back chevron (tab root). No status bar tweaks beyond standard.
2. **Hero media** — 16:9 aspect, edge-to-edge. Camera-overlay button top-right → `personal-data.html#pd-video-group` (anchor scroll to intro video field).
3. **Identity row** — 80×80 brand-gradient avatar (with small camera pip) + name (24pt 600) + location (with map-pin icon). Whole row tappable → `personal-data.html`. New-coach badge appears next to the location line when `cv-new-*` state is active.
4. **Stats strip** — `FitStatStrip` 4-column readout: Rating / Reviews / Sessions / Price from. Read-only, system-computed.
5. **Maturity progress block** — `FitMaturityProgress`, rendered only in `cv-new-*` states. Auto-hides when graduation thresholds met.
6. **My Sports** — section title with edit pencil, sport chips below. Whole header tap → `sport-types.html`.
7. **About Me** — section title with edit pencil, bio text with `fit-see-more` link. Whole header tap → `personal-data.html`.
8. **Management tiles** (4× `fit-stat-tile`):
   - Languages → `personal-data.html`
   - Training Sessions → `sessions.html`
   - Locations → `locations.html`
   - Available Hours → `available-hours.html`
9. **Reviews** — section title with rating summary (4.8 · 42 reviews) for established. `FitReviewCarousel` with `FitReviewCard` instances + terminal "Show all N reviews" card. For new coach: `FitEmptyState` "No reviews yet" instead of carousel.
10. **Footer** — 5-tab navbar with Profile slot 5 active.

### Push: All Reviews (`s-coach-reviews`)

Reached from any review card or the "Show all N reviews" terminal card. Layout:

1. Header — back chevron + "Reviews" title
2. **Rating summary** — 36pt score + 5-star row + 42 reviews count + horizontal 5-bar histogram (5/4/3/2/1) showing distribution
3. **Category ratings** — horizontal-scroll tiles: Technique / Communication / Punctuality / Motivation
4. Divider + "42 reviews" title
5. **Full reviews list** — vertical scroll, no clamp on body text. Each entry: avatar + name + relative time + 5-star row + full body.

No footer CTA (coach is viewing their own reviews, not booking).

### Edit affordance routing

| Section | Tap target | Destination |
|---|---|---|
| Hero camera overlay | top-right pip in 16:9 area | `personal-data.html#pd-video-group` |
| Avatar | small pip on bottom-right of avatar | `personal-data.html` |
| Identity row (name + location) | whole row | `personal-data.html` |
| Stats strip | — (read-only) | — |
| Maturity block "Learn more" | text link | `s-maturity-info` push screen (explainer) |
| My Sports header | pencil icon + whole header | `sport-types.html` |
| About Me header | pencil icon + whole header | `personal-data.html` |
| Languages tile | whole tile | `personal-data.html` |
| Training Sessions tile | whole tile | `sessions.html` |
| Locations tile | whole tile | `locations.html` |
| Available Hours tile | whole tile | `available-hours.html` |
| Reviews | individual cards + "Show all N" | `s-coach-reviews` push |

Read-only / system-computed (no edit affordance): Stats strip, Reviews carousel, Maturity progress.

---

## 5. States

State variants on `#s-coach-profile` via class toggle:

| Class | Hero media | New-coach badge | Stats values | Maturity block | Reviews |
|---|---|---|---|---|---|
| `cv-established` (default) | Video player | hidden | real values | hidden | carousel |
| `cv-new-video` | Video player | shown | zero-state (`—` / `0` / `0` / from €25) | shown | empty-state |
| `cv-new-image` | Cover image with overlay | shown | zero-state | shown | empty-state |
| `cv-new-default` | Brand gradient + initials | shown | zero-state | shown | empty-state |

Visibility helpers (CSS-driven):
- `.cv-established-only` — hidden unless `.cv-established`
- `.cv-new-only` / `.cv-new-only-flex` / `.cv-new-only-inline` — shown only in `cv-new-*` variants
- Same atom-set is reused on athlete-side `s-coach-v2` for cross-side consistency.

---

## 6. API

Profile data is served by the existing coach profile endpoint (extended additively per `feedback_backward_compat_endpoints`). Canonical reference: [`poly-backend/docs/coach-profile-api.md`](../../poly-backend/docs/coach-profile-api.md) (to be created).

Endpoints used by this screen:

| Endpoint | Purpose |
|---|---|
| `GET /coach/me` | Hero media, identity, sports, bio, languages, gender |
| `GET /coach/me/stats` | Rating / Reviews / Sessions / Price-from (system-computed; may be merged into `GET /coach/me` response) |
| `GET /coach/me/reviews?limit=10&cursor=...` | Reviews list for All Reviews push; first page reused for carousel preview |
| `GET /coach/me/reviews/summary` | Per-category averages + 5-bar histogram counts |

Existing fields used on this screen (no new endpoints created here):
- `avatar_url`, `intro_video_provider` + `intro_video_id`, `cover_image_url`
- `first_name`, `last_name`, `location` (city, country)
- `sports` (array of sport IDs — resolved client-side via canonical taxonomy)
- `about_me` (bio, max 500 chars server-side)
- `languages` (array of BCP-47 codes)
- Computed stats: `rating_avg`, `reviews_count`, `sessions_count`, `price_from`

For schema details and request/response samples, see `coach-profile-api.md`.

---

## 7. Business rules

- **Hero media fallback** — render in order: intro_video → cover_image → brand_gradient + initials. Never empty (consistency requirement: inconsistent profiles rank lower subconsciously per `project_coach_profile_v2`).
- **Stats are read-only** — coach can't manually edit Rating/Reviews/Sessions. Price-from is derived from minimum across session templates.
- **Maturity threshold** — `reviews_count >= 1 AND sessions_count >= 3` (see `coach-maturity-model.md`). Block auto-hides on graduation.
- **Section titles use warm style** — 16px medium normal-case, not the 12px UPPERCASE `.fit-section-title`. Kit candidate `FitSectionTitle--md` (see § 9).
- **Edit affordances must be obvious** — pencil icons on visual sections (My Sports, About Me) plus full-row clickability. Chevron at end of tile-style rows (`fit-stat-tile-chevron`).
- **Reviews carousel** capped at 3 cards + terminal "Show all" — full list lives on push screen.
- **Reviews are read-only on coach side** — coach can't delete reviews. Future: reply-to-review affordance (post-MVP).
- **Pencil icons appear only for editable sections** — Stats, Reviews, Maturity have no pencil.

---

## 8. Edge cases

- **All stats are 0 (zero-state new coach)** — show `—` for rating, `0` for reviews & sessions, `from €25` for price (still meaningful — minimum from session templates if at least one exists, otherwise `—`). Don't hide the row.
- **Coach has 0 sport templates** — "Training Sessions" tile subtitle reads "Not set yet · tap to add". Same fallback copy for Locations and Available Hours when empty.
- **Coach has 0 sports selected** — My Sports section shows zero-state chip "No sports yet" with edit pencil still active.
- **About me is empty** — preview area shows placeholder "Add a short intro about yourself" with pencil affordance.
- **Intro video URL stored but server-side verification failed** — `intro_video_status: rejected`. Hero falls back to cover_image → gradient. A notification was sent to coach (`TargetRoute=PROFILE_VIDEO`) when verification failed.
- **Long names / locations** — truncate with ellipsis (single line); full value shown on tap into personal-data.
- **Review count = 1** — singular "review" in stats label (handled via locale plural rules, see `feedback_copy_standards`).
- **All-reviews list pagination** — cursor-based, `limit=20`. Infinite scroll on the All Reviews push screen.
- **Coach opens profile offline** — show `fs-network-error` overlay (handled at fetch layer; see `personal-data.md` for the same network-error atom).

---

## 9. Platform notes

### iOS / Android

- 5-tab bottom nav: Dashboard / Clients / Messenger / Calendar / Profile. Profile slot index = 4 (zero-based).
- Header: title-only + `FitIconBtn` (gear). iOS: matches `UINavigationBar` standard; Android: `TopAppBar` from Material 3.
- Hero media: `AVPlayer` (iOS) / `ExoPlayer` (Android) for video; `Image` for cover; `Text` for initials fallback. Layout layer enforces 16:9 aspect.
- Sticky/scrolling: header sticky, content scrolls; navbar sticky.

### Kit components used

- `FitIconBtn` — gear in header
- `FitAvatar(.lg, .brand)` — main avatar with camera pip overlay
- `FitAvatar(.sm)` — reviewer avatars
- `FitProfileBio` (CSS class `.fit-profile-bio`) + `.fit-see-more`
- `FitSportChip` — My Sports chips; Languages chips
- `FitStatTile` — 4 management tiles (Languages / Sessions / Locations / Hours)
- `FitIconPlate(.success, .md)` — maturity star; `FitIconPlate(.neutral, .md)` — leading icons in tiles
- `FitEmptyState` — reviews empty for new coach
- `FitNavbar` + items
- **`FitStatStrip`** — new (2026-05-11)
- **`FitMaturityProgress`** — new (2026-05-11)
- **`FitReviewCard` + `FitReviewCarousel`** — new (2026-05-11)

### Kit candidates (still page-local — propose in follow-up)

- **`FitProfileHero`** — 16:9 hero with 3-variant media fallback (video / cover / gradient + initials) + camera-overlay edit affordance. Reused on athlete-side `s-coach-v2`.
- **`FitSectionTitle--md`** — 16px medium normal-case section header. Profile sections use this warm style; existing `.fit-section-title` is 12px UPPERCASE which doesn't fit profile tone.

---

## 10. Decisions

Open product/UX questions intentionally left out — these are explicit directives, not opens:

- **Sections are not user-reorderable on public profile.** Layout order is brand-canonical. If reorder ever needed, comes via a Phase 2 product decision, not as runtime customization.
- **Coach cannot hide sections** (e.g., hide reviews from public). Reviews are part of trust signal; if a coach has reviews, athletes see them. If 0 reviews, the empty-state itself is honest signaling.
- **Reply-to-review** — deferred to post-MVP. Coach reads-only on MVP.
- **Maturity "Learn more"** push screen — separate small explainer with the 2 thresholds + benefits-not-burden framing per `coach-maturity-model.md`. Not yet wired in prototype (stub `alert()`). Build alongside this spec going to production.
- **AI Assistant tab** — when it lands (planned), nav becomes Dashboard / Clients / AI Assistant / Calendar / Profile. Messenger placeholder is dropped or moved to Tools.
- **Slot-5 onclick consistency** — all coach tab-root screens now route slot 5 to `profile.html` (done 2026-05-12, see prototype). No longer goes to `settings.html`.

---

## Related specs

- `personal-data.md` — most edit affordances push here
- `sport-picker.md` — My Sports edit
- `sessions.html` / session-creation.md — Training Sessions tile
- `location-picker.md` — Locations tile
- `available-hours.md` — Available Hours tile (spec TBD if not present)
- `coach-maturity-model.md` — visualised by Maturity progress block
- `review-queue.md` — coach-side handling of incoming session reviews (different surface)
- `notifications.md` — `TargetRoute=PROFILE_VIDEO` (post-save video verification failure)
