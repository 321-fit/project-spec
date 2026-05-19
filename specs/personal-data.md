# Personal Data (Coach)

> Status: Draft
> Prototype: [flows/coach/personal-data.html](https://321-fit.github.io/project-spec/prototypes/flows/coach/personal-data.html)
> Component library: [design-tokens/docs/components.md](../../design-tokens/docs/components.md)
> Last updated: 2026-05-12
> Implementation:
> - iOS:     [321fit_ios/docs/personal-data-ios.md] (to be created)
> - Backend: [poly-backend/docs/profile-api.md] (to be created)
> - Android: [321fit_android/docs/personal-data-android.md] (to be created)

**Scope note:** this spec covers the **coach-side** Personal Data screen reached from Settings root → Edit personal info. Same screen is used for the data points surfaced on the public coach profile (`coach-profile.md`) plus private operational fields (TZ, country, city, languages, DOB, gender).

Athlete-side personal data uses the same component patterns but **adds** body metrics (weight + height) — covered in athlete-side spec when built. Coach side intentionally omits body metrics (not needed for marketplace function — see § 10).

---

## 1. Overview

Single-screen form (`s-personal-data`) containing all profile fields a coach can edit. Reached from Settings → Edit personal info. Saves back to Settings on success.

Fields are organized top-down: **public profile media** first (avatar, intro video, cover image), **public profile text** next (name, bio), **private operational** at the bottom (TZ, country, city, languages, gender, DOB).

The screen is the canonical owner of:
- Intro video URL (YouTube embed only on MVP)
- Cover image (single 16:9 upload)
- All 6 state flows (default / loading / saving / save-error / network-error / saved)
- Save gate (client-side validation must pass before sending to server)
- Field-level inline errors (DOB <13, invalid video URL)

---

## 2. User Stories

### Coach

- As a coach, I want to update my profile media (avatar, intro video URL, cover image) without ever leaving this screen.
- As a coach, I want clear inline errors when I enter something invalid (under-13 DOB, non-YouTube video URL).
- As a coach, I want the Save button to tell me when my form has errors instead of letting me hit save and only finding out from a server reject.
- As a coach, if my network drops while loading, I want a retry button instead of a permanent skeleton.
- As a coach, when an upload fails (file too large, wrong format), I want a clear toast — not a silent failure.
- As a new coach onboarding, I want my time zone, country, city, and languages pre-filled from my device — I shouldn't have to set them manually.

---

## 3. System Stories

- As the system, on screen entry I fetch `GET /coach/me` and render the form. On fetch failure, I show `fs-network-error` with Retry — not a stuck skeleton.
- As the system, on every field change I run the relevant validator and update the Save-button gate. If any field has an inline error, Save is visually disabled.
- As the system, when the coach taps Save while gated, I scroll-into-view + flash the first invalid field + show "Fix the highlighted fields" snackbar. I do not send a server request.
- As the system, when the coach pastes a YouTube URL, I parse out the video ID using the canonical regex set and store `{ provider: 'youtube', video_id }` server-side — not the raw URL.
- As the system, after save success, I fire a "Personal data updated" snackbar (1400ms) and return to Settings root.
- As the system, on 401 during Save, I push to account-access re-auth flow with context "return-to: personal-data, restore-form-state". After re-auth succeeds, I restore the unsaved form values + auto-retry Save once.

---

## 4. Flows

### Field list (top to bottom)

1. **Avatar** — round 80pt, brand-gradient fallback. Tap → `pd-avatar-sheet` (Take photo / Choose from library / Remove)
2. **Intro video** — text input, YouTube URL paste. Inline icon (camera+arrow). Clear (×) button when value present. Inline help text below (states in § 5).
3. **Cover image** — single 16:9 image card with 80pt thumb + "Tap to upload" / "Cover image set" + chevron. Tap → `pd-cover-sheet` (same actions as avatar)
4. **First name** — text, required, max 50, trimmed
5. **Last name** — text, required, max 50, trimmed
6. **About me** — 3-line clamped preview. Tap → full-screen editor `s-notes-editor`. Server cap 500 chars.
7. **Time zone** — push to `s-tz-select` (single-select with search). Device-detected at onboarding pre-fill.
8. **Home country** — push to `s-country-select`. Device-detected pre-fill.
9. **Home city** — push to `s-city-select` (single-select with search, list scoped to selected country). Reverse-geocoded from device location at onboarding pre-fill; if geocode unavailable, field stays empty and user picks manually. Changing **Country** resets City to empty (since previous city is no longer valid in the new country).
10. **Languages** — push to `s-lang-select` (multi-select). Device locale pre-fill.
11. **Gender** — Woman / Man chips, single-select
12. **Date of birth** — 3-wheel sheet (Day/Month/Year). 13+ enforced.

Footer: brand-gradient **Save** pill button with inline spinner when saving.

### Hero camera-overlay routing

The camera button on the Coach Profile hero (`flows/coach/profile.html#s-coach-profile`) navigates here with anchor `#pd-video-group` — browser scrolls directly to the Intro video field. Both video URL editing and cover image editing happen on this screen.

### Save gate

Client-side validation gate runs on every field change + on Save tap:

```
pdInvalidFields() returns:
  - 'pd-dob-group' if #pd-dob-error display !== 'none'
  - 'pd-video-group' if .pd-video-wrap has .error class
```

If any field returns invalid: `#pd-save-btn` gets `.is-disabled` (opacity 0.5, cursor not-allowed, pointer-events stay ON so tap still fires the scroll-to-error path).

Save tap when gated:
1. Smooth-scroll first invalid field into center of viewport
2. Apply `.pd-field-flash` keyframe animation (600ms × 2 = 1200ms total of red highlight)
3. Show `pd-validation-snack` snackbar "Fix the highlighted fields" (2200ms)
4. NO network call fired

---

## 5. States

### Screen flow states (`#s-personal-data` class toggle)

| Class | Skeleton | Content | Footer | Banner |
|---|---|---|---|---|
| `fs-default` | hidden | shown | shown | none |
| `fs-loading` | shown | hidden | hidden | none |
| `fs-network-error` | hidden | hidden | hidden | centered illustration + Retry |
| `fs-saving` | hidden | shown | shown (spinner in Save) | none |
| `fs-error` | hidden | shown | shown | red `.pd-save-error` above footer + Retry |
| `fs-saved` (not a class — fires snackbar) | — | shown | shown | `pd-saved-snack` 1400ms |

### Intro video field states

| State | `.pd-video-wrap` | Help text |
|---|---|---|
| Empty (neutral) | no class | "Accepts youtube.com, youtu.be and youtube.com/shorts. Embedded as 16:9 hero on your public profile." |
| Valid YouTube URL | `.ok` (teal border) | "✓ Video will appear on your public profile." |
| Invalid URL | `.error` (red border) | "Doesn't look like a YouTube URL." |
| URL parsed but server pending verify | `.pending` (yellow border) | "URL accepted — we'll verify the video is public and embeddable after you save. If not, you'll get a notification." |

### DOB field state

- Default: `#pd-dob-error` display: none
- Invalid (<13 on save attempt or via DOB picker rejection): display: block, copy "Must be 13 or older"

### Avatar / Cover upload states

Sheet actions show "Take photo / Choose from library / Remove" — Remove hidden when no media set.

On upload failure (file too large / wrong format / network) — `pd-upload-error-snack` snackbar 3000ms, copy varies by error type:
- File too large: `"Couldn't upload cover — file too large (max 10 MB)"`
- Network fail: `"Couldn't upload photo — try again"`

Sheet stays open so user can retry pick without navigation.

---

## 6. API

Canonical reference: [`poly-backend/docs/profile-api.md`](../../poly-backend/docs/profile-api.md) (to be created).

Endpoints (extending existing per `feedback_backward_compat_endpoints`):

| Endpoint | Purpose |
|---|---|
| `GET /coach/me` | Initial load — all editable fields + computed metadata |
| `PUT /coach/me` | Save form (one round-trip with all changed fields) |
| `PUT /me/upload-avatar` | Existing — avatar binary upload (multipart). Add 401 re-auth flow handler. |
| `PUT /me/upload-cover` | NEW — cover image binary upload (multipart), same shape as avatar |
| `PUT /me/update-timezone` | Existing — separate endpoint kept |

### Intro video fields

Backend stores:
- `intro_video_provider: enum { youtube, native }` — `youtube` on MVP, `native` Phase 2
- `intro_video_id: String` — extracted video ID (e.g. `dQw4w9WgXcQ`)
- `intro_video_status: enum { pending, ready, rejected }` — server sets via oEmbed lookup post-save

Client sends raw URL on PUT; server parses out video_id. Or client parses + sends `{provider, video_id}` directly. Decision: **client parses** (already implemented in `pdExtractYouTubeId`) → simpler server, less responsibility on backend.

### Cover image

- Upload via `PUT /me/upload-cover` (multipart)
- Returns `{ cover_image_url, cover_image_status }`
- Max 10 MB, image formats only (JPEG / PNG / WebP / HEIC). Server may transcode HEIC → JPEG.
- Single size (no transcoding pipeline like video). Stored on S3, served via CloudFront.

### Validation gate echo

Server may echo per-field validation errors as `{field: "bio", message: "..."}`. Client maps each error to the corresponding inline `.fit-input-error-text` element. Unmapped field keys fall back to generic `.pd-save-error` banner with server's `message`.

---

## 7. Business rules

- **Weight + Height NOT on coach side** — 2026-05-12 product decision. Coaches are service providers; their own body metrics aren't required for the marketplace function. Athlete side keeps weight/height in their personal-data (for self-tracking + future health/calorie features).
- **Gender stays on coach side** — drives athlete-side discovery filter ("Female coach for personal training"), so it's a public-facing data point.
- **DOB 13+ enforced** — strict client gate, server double-check. Under-13 sign-ups blocked. Year picker capped at `currentYear − 13`.
- **First/Last name required + max 50** — empty on Save → inline error same pattern as DOB.
- **About me max 500 chars** — server cap. Client warns at 450 per `feedback_character_counter`.
- **Languages multi-select** — saved as array of BCP-47 codes. Display joins first 2 or `first + "+N more"`.
- **Intro video YouTube only on MVP** — see `coach-profile.md` § 9 Platform notes. Native upload deferred to Phase 2.
- **YouTube nocookie domain for embed** — `https://www.youtube-nocookie.com/embed/<id>` — same player, no tracking cookies, GDPR-clean.
- **Cover image fallback chain** — Profile hero renders video → cover → brand-gradient + initials. Cover acts as a fallback for coaches who aren't ready to record a video.
- **Avatar pravatar.cc placeholder** in prototype only — never ship that URL to prod.

---

## 8. Edge cases

- **401 mid-save** — token expired. Client pushes to `account-access` re-auth with context (return-to: personal-data, restore-form-state). After re-auth succeeds, restore form values + auto-retry Save once. If second attempt fails, show generic banner.
- **429 rate limit** — falls into `.pd-save-error` banner with server's message. No dedicated UI.
- **Bio exceeds server cap server-side** — error echo into inline field error on `s-notes-editor` (handled separately on the bio editor screen).
- **YouTube URL parses but video is private / age-restricted / deleted** — client accepts (pending-verify state, yellow border). Server confirms via oEmbed post-save; if rejected, sets `intro_video_status: rejected`, sends push notification (`TargetRoute=PROFILE_VIDEO`). Coach can return here and replace the URL.
- **Coach pastes Vimeo / other URL** — fails client validation (red border, "Doesn't look like a YouTube URL"). Per `invite-coach.md` lineage decision, MVP is YouTube-only.
- **Cover image upload failure mid-save** — Save itself succeeds for non-media fields; cover field stays empty/old value. Upload error snackbar fires independently.
- **All optional fields empty** — accepted. Coach can have just name + avatar and proceed. Save unblocks once required fields (first name, last name) have values.
- **Form back with unsaved changes** — opens `pd-discard-sheet` modal (Discard / Keep editing). In production: only opens if form is dirty; prototype always shows for demo.
- **Concurrent save** — Save button gets `pointer-events: none` while `fs-saving`. Double-tap is prevented. If user navigates away during save, results land but UI moved on (acceptable).

---

## 9. Platform notes

### iOS / Android

- Avatar / cover picker — native `PHPickerViewController` (iOS) / `ActivityResultContracts.PickVisualMedia` (Android). Type filter applied at OS level.
- DOB picker — `UIDatePicker .compact` (iOS) / `MaterialDatePicker` (Android). Year capped to `currentYear − 13`.
- TZ / Country / City / Language pushes — full-screen modals with search + filter.
- City list scoped to selected country: backend returns paginated cities for `country_code`; list re-fetches when country changes.
- 401 handler — system-wide interceptor in HTTP client, not per-screen.
- Snackbars — same `FitSnackbar` component.

### Kit components used

- `FitAvatar(.xl)` + `FitAvatar(.brand)` — avatar
- `FitInput` + `FitInputLabel` — text fields
- `FitInputChevron` — push-row trailing
- `FitSelectionGroup` + `FitSelectionChip` — Gender chips
- `FitSnackbar` — saved / validation / upload-error toasts
- `FitEmptyState` (push-screen "No matches" empty)
- `sk-shimmer` — loading skeleton blocks

---

## 10. Decisions

- **No Weight + Height on coach side.** Removed from prototype 2026-05-12. Backend may keep the fields nullable for legacy / cross-role users, but coach UI doesn't surface them.
- **Intro video MVP = YouTube only.** Vimeo intentionally not supported — fitness coaches predominantly on YouTube, narrower validation = cleaner UX. Add Vimeo / native upload in Phase 2 if analytics shows demand.
- **Public profile media goes at TOP of form** — Avatar / Intro video / Cover image grouped near top. Public-facing data deserves prominence; private operational fields (TZ, country, city) sit below.
- **Camera-overlay on Profile hero → personal-data#pd-video-group anchor scroll** — instead of a dedicated intro-video.html screen. Decision: simpler, no extra file, anchor scroll is well-supported on iOS Safari + Android Chrome WebView.
- **Server-side video verification via oEmbed.** If video is private / age-restricted / deleted, server flips `intro_video_status: rejected` and notifies coach via push. Coach replaces URL, retries.
- **401 auto-retry once after re-auth.** Don't make user re-enter the form. Restore from local state, re-attempt Save once. If that also fails, show generic error banner without further auto-retry (avoid infinite loops).
- **Native pickers, not custom** — per `feedback_native_pickers`. Date/time/photo pickers are OS-native, never recreated in design-tokens.

---

## Related specs

- `coach-profile.md` — hero camera-overlay pushes here; preview lives there
- `authentication.md` / `account-access.md` — 401 re-auth flow
- `sport-picker.md` — separate push screen (My Sports)
- `notifications.md` — `TargetRoute=PROFILE_VIDEO` (post-save verification rejected)
- `onboarding-wizard.md` — TZ / country / city / languages first-time pre-fill source
- `athlete-search.md` — consumes City + Country as Location filter (Search → Filters → Location section)
- `profile-settings.md` — historical combined doc; superseded for personal-data by this spec
