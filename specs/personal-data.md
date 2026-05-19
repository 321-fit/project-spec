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
- Intro video upload (Mux direct-upload — see [architecture/mux-integration.md](../architecture/mux-integration.md))
- Cover image (single 16:9 upload)
- All 6 state flows (default / loading / saving / save-error / network-error / saved)
- Save gate (client-side validation must pass before sending to server)
- Field-level inline errors (DOB <13, video upload errored)

---

## 2. User Stories

### Coach

- As a coach, I want to update my profile media (avatar, intro video, cover image) without ever leaving this screen.
- As a coach, I want to record or pick a video from my phone and have it appear on my public profile after it finishes processing — no copy-paste of links, no external accounts.
- As a coach, I want to see real-time upload progress and know when my video is "processing" vs "live" so I'm never confused about state.
- As a coach, I want a clear inline error if my video fails to upload or process (with a Retry button) — not a silent failure.
- As a coach, I want the Save button to tell me when my form has errors instead of letting me hit save and only finding out from a server reject.
- As a coach, if my network drops while loading, I want a retry button instead of a permanent skeleton.
- As a new coach onboarding, I want my time zone, country, city, and languages pre-filled from my device — I shouldn't have to set them manually.

---

## 3. System Stories

- As the system, on screen entry I fetch `GET /coach/me` and render the form. On fetch failure, I show `fs-network-error` with Retry — not a stuck skeleton.
- As the system, on every field change I run the relevant validator and update the Save-button gate. If any field has an inline error, Save is visually disabled.
- As the system, when the coach taps Save while gated, I scroll-into-view + flash the first invalid field + show "Fix the highlighted fields" snackbar. I do not send a server request.
- As the system, when the coach picks a video file, I request a Mux direct-upload URL from the backend (`POST /me/intro-video/upload-url`), upload the file directly to Mux from the device (PUT with resumable chunks), and notify the backend (`POST /me/intro-video/uploaded`) on completion. Backend stores `{ provider: 'mux', mux_upload_id, mux_status: 'pending_upload' → 'processing' → 'ready' }` and updates state via webhooks. See [architecture/mux-integration.md](../architecture/mux-integration.md).
- As the system, when Mux signals `asset.ready` for a coach's video, I store the `mux_playback_id` and fire a `videoReady` push + inbox notification routing the coach back to Personal Data.
- As the system, when Mux signals `asset.errored`, I store the failure code and fire a `videoFailed` notification with a Retry CTA.
- As the system, after save success, I fire a "Personal data updated" snackbar (1400ms) and return to Settings root.
- As the system, on 401 during Save, I push to account-access re-auth flow with context "return-to: personal-data, restore-form-state". After re-auth succeeds, I restore the unsaved form values + auto-retry Save once.

---

## 4. Flows

### Field list (top to bottom)

1. **Avatar** — round 80pt, brand-gradient fallback. Tap → `pd-avatar-sheet` (Take photo / Choose from library / Remove)
2. **Intro video** — 16:9 upload card with state-aware content (states in § 5). Tap → native video picker (`PHPickerViewController` iOS / `PickVisualMedia.VideoOnly` Android). Direct-uploads to Mux. Shows thumbnail + Replace/Remove menu once ready.
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

The camera button on the Coach Profile hero (`flows/coach/profile.html#s-coach-profile`) navigates here with anchor `#pd-video-group` — browser scrolls directly to the Intro video upload card. Both intro video upload and cover image editing happen on this screen.

### Save gate

Client-side validation gate runs on every field change + on Save tap:

```
pdInvalidFields() returns:
  - 'pd-dob-group' if #pd-dob-error display !== 'none'
  - 'pd-video-group' if .pd-video-wrap has .errored state (mux_status === "errored")
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

The intro video is a Mux direct-upload. The field is a 16:9 card that adapts to one of 6 visible states. State is driven by `coach.intro_video.mux_status` (see [architecture/mux-integration.md § 5.5](../architecture/mux-integration.md) for the state machine).

| State | Card body | Footer help text | Tap target |
|---|---|---|---|
| **Idle** (no video uploaded) | Dashed border + camera icon + "Upload intro video" + sub "Up to 200 MB · 2 min · mp4/mov" | "Show what makes your coaching unique. Plays as a 16:9 hero on your public profile." | Opens native video picker |
| **Uploading** (PUT in progress) | Filename + linear progress bar (0–100%) + Cancel × top-right | "Uploading… don't close the app." | Cancel ×: abort upload, return to Idle |
| **Processing** (PUT done, Mux transcoding) | Yellow-tinted card + spinner + "Processing your video…" | "This usually takes 30–60 seconds. You can keep editing other fields — we'll notify you when it's ready." | Card disabled (no tap) |
| **Ready** (`mux_status: "ready"`) | Mux auto-thumbnail (16:9) + play-overlay button + ⋯ menu top-right | "✓ Live on your public profile." | Play → inline preview sheet · ⋯ → Replace / Remove |
| **Errored** (`mux_status: "errored"`) | Red-tinted card + alert-triangle + "Couldn't process this video" + small `mux_error_code` muted line | "We couldn't process the file you uploaded. Try a different file." | Tap → Retry (clears + reopens picker) |
| **Pending refresh** (`mux_status: "pending_upload"` — coach reopened screen but never finished PUT) | Same as Idle + small "Last upload didn't finish" muted line | "Pick a video to start over." | Tap → cancel stale upload + reopen picker |

State transitions are server-driven: client polls `GET /me` every 10s while in `processing` state OR receives the `videoReady` / `videoFailed` push notification — whichever fires first.

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
| `GET /coach/me` | Initial load — all editable fields + computed metadata including `intro_video` object |
| `PUT /coach/me` | Save form (one round-trip with all changed fields). Does NOT carry video bytes. |
| `PUT /me/upload-avatar` | Existing — avatar binary upload (multipart). Add 401 re-auth flow handler. |
| `PUT /me/upload-cover` | NEW — cover image binary upload (multipart), same shape as avatar |
| `POST /me/intro-video/upload-url` | NEW — request a Mux direct-upload. Returns `{upload_id, upload_url}`. See [mux-integration.md § 5.3](../architecture/mux-integration.md). |
| `POST /me/intro-video/uploaded` | NEW — client signals PUT completed. Backend marks `mux_status: "uploading_done"` (transient pre-webhook). |
| `DELETE /me/intro-video` | NEW — remove the asset on Mux + clear coach record. |
| `POST /webhooks/mux` | NEW — backend webhook receiver (not a client endpoint). Drives the state machine. |
| `PUT /me/update-timezone` | Existing — separate endpoint kept |

### Intro video fields

Backend stores (on the coach/user table, JSON column):

```jsonc
{
  "provider": "mux",
  "mux_upload_id":   "<id>",
  "mux_asset_id":    "<id>" | null,
  "mux_playback_id": "<id>" | null,
  "mux_status":      "pending_upload" | "uploading_done" | "processing" | "ready" | "errored",
  "mux_error_code":  "<code>" | null,
  "uploaded_at":     "<iso8601>" | null
}
```

`mux_playback_id` is the only field the client needs for playback (HLS URL = `https://stream.mux.com/{playback_id}.m3u8`). `mux_upload_id` is internal — never exposed to athletes. Full lifecycle + transitions documented in [mux-integration.md](../architecture/mux-integration.md).

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
- **Intro video uploaded via Mux direct-upload** — coach picks file from device, client uploads directly to Mux (signed URL minted by backend), Mux transcodes to HLS, webhook signals readiness. See [architecture/mux-integration.md](../architecture/mux-integration.md) for end-to-end flow.
- **Client-side limits before upload:** max 200 MB, max 2 min duration, mp4 / mov / m4v only. Backend trusts client + lets Mux enforce as final authority (Mux rejects > 12h or invalid codec).
- **Replace flow:** uploading a new video deletes the previous Mux asset server-side (`DELETE /video/assets/{id}`). No version history.
- **Cover image fallback chain** — Profile hero renders Mux video (when `mux_status: "ready"`) → cover_image → Mux auto-thumbnail at time=2s → brand-gradient + initials. Cover acts as a fallback for coaches who haven't uploaded a video yet or whose video is still processing.
- **Avatar pravatar.cc placeholder** in prototype only — never ship that URL to prod.

---

## 8. Edge cases

- **401 mid-save** — token expired. Client pushes to `account-access` re-auth with context (return-to: personal-data, restore-form-state). After re-auth succeeds, restore form values + auto-retry Save once. If second attempt fails, show generic banner.
- **429 rate limit** — falls into `.pd-save-error` banner with server's message. No dedicated UI.
- **Bio exceeds server cap server-side** — error echo into inline field error on `s-notes-editor` (handled separately on the bio editor screen).
- **Intro video upload aborted mid-PUT** (coach taps Cancel or app killed) — client posts no `uploaded` event. Mux upload object expires after 1h; backend cron `mux_asset_reconcile` clears stale `pending_upload` rows older than 2h. Coach sees Idle state on re-entry.
- **Intro video processing failed on Mux side** (unsupported codec, corrupt file, > 12h duration) — webhook `video.asset.errored` fires. Backend sets `mux_status: "errored"` + `mux_error_code`. Coach sees Errored state on the field + receives `videoFailed` push notification (`TargetRoute=videoFailed`). Tap → land here → Retry opens picker.
- **Webhook delivery lost during incident** — backend reconcile cron runs hourly, lists `processing` rows older than 30 min, calls `GET /video/assets/{id}` directly to update state. No client action required.
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
- **2026-05-19** — **Intro video moved to Mux direct-upload** (replaces the prototype-only YouTube URL paste design — never shipped). Public playback policy, native AVPlayer/ExoPlayer for HLS, no Mux Player SDK at launch. Asset lifecycle driven by webhooks (`asset.ready` / `asset.errored`); user notified via `videoReady` / `videoFailed` push. Full architecture: [architecture/mux-integration.md](../architecture/mux-integration.md).
- **Public profile media goes at TOP of form** — Avatar / Intro video / Cover image grouped near top. Public-facing data deserves prominence; private operational fields (TZ, country, city) sit below.
- **Camera-overlay on Profile hero → personal-data#pd-video-group anchor scroll** — instead of a dedicated intro-video.html screen. Decision: simpler, no extra file, anchor scroll is well-supported on iOS Safari + Android Chrome WebView.
- **Server-side video lifecycle via Mux webhooks.** Backend listens to `video.asset.ready` (stores `mux_playback_id`, fires `videoReady` push) and `video.asset.errored` (stores error code, fires `videoFailed` push). Coach lands on Personal Data, sees state, retries if errored.
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
