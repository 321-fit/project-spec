# Mux Video Integration

> Status: Approved
> Last updated: 2026-05-19
> Owner module: `coach.intro_video` (consumed by Personal Data + Coach Profile)
> Vendor docs: https://www.mux.com/docs

## 1. Purpose

Coaches upload an intro video on their profile. Mux handles: file ingestion (direct-upload from device), transcoding to HLS, thumbnail generation, and CDN delivery. Our backend orchestrates the upload, listens to webhooks, and stores the resulting `playback_id` on the coach record. Clients (iOS / Android / Web) play the video via native HLS using the `playback_id`.

Replaces the earlier YouTube URL paste design (which only existed in the prototype, never shipped).

## 2. Topology

```
┌──────────────────┐     1. POST /me/intro-video/upload-url    ┌─────────────────┐
│   iOS / Android  │ ─────────────────────────────────────────►│  poly-backend   │
│    client app    │                                            │                 │
│                  │ ◄───────────────────────────────────────── │ Mux REST client │
│                  │     { upload_id, upload_url }              │  + webhook recv │
│                  │                                            └────────┬────────┘
│  2. PUT file ──► │                                                     │
│  (direct upload  │                                                     │ A. POST /uploads
│   to Mux)        │                                                     ▼
│                  │     ◄──────────────────────────────────────  ┌──────────────┐
│                  │           upload_url                         │   Mux Video  │
│                  │                                              │   API + CDN  │
│  6. Playback ──► │     ◄──────────────────────────────────────  │              │
│  GET .m3u8 + HLS │           https://stream.mux.com/{id}.m3u8   │              │
│  (AVPlayer /     │                                              └──────┬───────┘
│   ExoPlayer)     │                                                     │
└──────────────────┘                                                     │ B. webhook
                                                                          ▼
                            poly-backend POST /webhooks/mux ◄────────────┘
                              video.upload.asset_created    →  store mux_asset_id
                              video.asset.ready             →  store playback_id, fire push
                              video.asset.errored           →  status=errored,  fire push
```

## 3. Decisions

| Decision | Choice | Why |
|---|---|---|
| Playback policy | **`public`** | Coach intro videos are marketing content, surfaced on athlete-side without auth. No paywall, no DRM. Saves a JWT-mint round-trip per playback. |
| Upload pattern | **Direct upload** (client → Mux) | Backend never touches video bytes — saves bandwidth costs + faster perceived upload speed. Standard Mux pattern. |
| Client player | **Native HLS** (AVPlayer iOS / ExoPlayer Android) | Zero extra dependency, both natively support HLS since iOS 12 / Android API 17. Mux Player SDK can be added later if we want Mux Data analytics. |
| Video quality preset | **`basic`** | Smaller files + faster transcode + lower costs. Intro videos are 30-90s — `basic` (up to 720p) is enough for hero playback. Upgrade to `plus` later if quality complaints. |
| Webhook auth | **HMAC SHA-256** on `Mux-Signature` header | Mux signs every webhook with a shared secret. Backend rejects unsigned/invalid requests. |
| Asset deletion | Hard delete on Mux + DB clear | When coach removes their video — call `DELETE /video/assets/{id}` and clear `coach.intro_video`. No soft-delete; storage costs accrue per minute stored. |

## 4. Environment variables

```env
# Backend only — never exposed to client
MUX_TOKEN_ID=<from Mux dashboard → Settings → Access Tokens>
MUX_TOKEN_SECRET=<same>
MUX_WEBHOOK_SECRET=<from Mux dashboard → Settings → Webhooks>
MUX_ENV=production | development
```

Two Mux environments: **development** (used by `polybackend-dev-test`) + **production** (when we cut prod). Assets are isolated per environment.

## 5. Backend integration

### 5.1 Mux REST client

Use the [official Mux Python SDK](https://github.com/muxinc/mux-python) (`mux_python`) — wraps the REST API + handles auth. Lives in `infra/services/mux.py`. Single configured client instance.

### 5.2 New endpoints on poly-backend

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1.0.0/me/intro-video/upload-url` | Create a Mux direct-upload. Returns `{upload_id, upload_url}`. Server passes `passthrough: "coach:<coach_id>"` so webhooks correlate back to user. |
| `POST` | `/api/v1.0.0/me/intro-video/uploaded` | Client notifies backend the PUT completed. Backend sets `coach.intro_video.mux_status = "uploading_done"` (transient pre-webhook state). No-op for backend correctness — webhook is authoritative — but useful for UX (client shows "Processing…" pill immediately instead of waiting for first webhook). |
| `DELETE` | `/api/v1.0.0/me/intro-video` | Delete the asset on Mux (via `DELETE /video/assets/{id}`) and clear the coach record. Idempotent. |
| `POST` | `/webhooks/mux` | Receive Mux webhook events. HMAC verification on `Mux-Signature` header. Dispatches by event type (see § 5.4). |

### 5.3 Mux direct-upload request

When client calls `POST /me/intro-video/upload-url`, backend issues to Mux:

```http
POST https://api.mux.com/video/v1/uploads
Authorization: Basic base64(MUX_TOKEN_ID:MUX_TOKEN_SECRET)
Content-Type: application/json

{
  "new_asset_settings": {
    "playback_policies": ["public"],
    "video_quality": "basic",
    "passthrough": "coach:<coach_id>"
  },
  "cors_origin": "*",
  "timeout": 3600
}
```

Mux responds with `{ data: { id, url, status: "waiting", ... } }`. Backend returns `{upload_id, upload_url}` to the client. The signed `url` is valid for 1h.

Backend persists `coach.intro_video.mux_upload_id = id`, `mux_status = "pending_upload"`.

### 5.4 Webhook events handled

Mux fires these to `POST /webhooks/mux` (configured in Mux dashboard → Settings → Webhooks):

| Event | Backend action |
|---|---|
| `video.upload.asset_created` | Extract `asset_id` from event. Look up coach by `passthrough` (`coach:<id>`). Persist `mux_asset_id`, set `mux_status = "processing"`. |
| `video.asset.ready` | Extract `playback_ids[0].id`. Persist `mux_playback_id`, `mux_status = "ready"`. Fire `videoReady` notification (push + inbox). |
| `video.asset.errored` | Extract `errors[0]`. Persist `mux_status = "errored"`, `mux_error_code`. Fire `videoFailed` notification with retry CTA. |
| `video.upload.cancelled` | Coach aborted before completion (or 1h timeout). Clear `mux_upload_id`, reset `mux_status = null`. No notification. |

Webhooks are HMAC-signed with `MUX_WEBHOOK_SECRET`; verify on every request, reject with 400 if mismatch. Mux retries failed deliveries up to 24h with exponential backoff — backend handlers must be idempotent (deduplicate by event `id`).

### 5.5 Data model — `coach.intro_video`

New JSON column on the coach (or user) table, nullable:

```jsonc
{
  "provider": "mux",
  "mux_upload_id":   "<id>",        // set on /upload-url
  "mux_asset_id":    "<id>" | null, // set on asset_created webhook
  "mux_playback_id": "<id>" | null, // set on asset.ready webhook
  "mux_status":      "pending_upload" | "uploading_done" | "processing" | "ready" | "errored",
  "mux_error_code":  "<code>" | null,
  "uploaded_at":     "<iso8601>"   | null
}
```

State transitions:

```
null
  │  client → POST /upload-url
  ▼
pending_upload
  │  client → PUT file → POST /uploaded
  ▼
uploading_done            (transient, client-driven)
  │  webhook → asset_created
  ▼
processing
  │  webhook → asset.ready
  ▼
ready ◄─── happy path
  │
  │  webhook → asset.errored (from any earlier state)
  ▼
errored
  │  coach taps Retry → DELETE + POST /upload-url
  ▼
(back to pending_upload)
```

## 6. Client integration

### 6.1 Upload (iOS)

1. `PHPickerViewController` (videos only, max 1) → `URL` to picked file.
2. Read file size, enforce client-side limits (max 200 MB, max 2 min duration).
3. `POST /me/intro-video/upload-url` → `{upload_id, upload_url}`.
4. `URLSession.shared.uploadTask(with: PUT request, fromFile: url)` — uses background config so upload survives app backgrounding. Progress observed via `URLSessionTaskDelegate.urlSession(_:task:didSendBodyData:...)`.
5. On `200 OK` from PUT: `POST /me/intro-video/uploaded { upload_id }`.
6. UI shows "Processing…" yellow pill. Client polls `GET /me` every 10s OR waits for `videoReady` push notification — whichever fires first.

### 6.2 Upload (Android)

Same flow with `ActivityResultContracts.PickVisualMedia(PickVisualMedia.VideoOnly)` + `WorkManager` background worker (OkHttp `PUT` with `Content-Range` chunks for resumability).

### 6.3 Playback (iOS — SwiftUI)

```swift
import AVKit

struct CoachIntroVideoView: View {
    let playbackId: String
    var body: some View {
        let url = URL(string: "https://stream.mux.com/\(playbackId).m3u8")!
        VideoPlayer(player: AVPlayer(url: url))
            .aspectRatio(16/9, contentMode: .fit)
    }
}
```

### 6.4 Playback (Android — Jetpack Compose)

```kotlin
@Composable
fun CoachIntroVideoView(playbackId: String) {
    val context = LocalContext.current
    val exoPlayer = remember {
        ExoPlayer.Builder(context).build().apply {
            setMediaItem(MediaItem.fromUri("https://stream.mux.com/$playbackId.m3u8"))
            prepare()
        }
    }
    AndroidView(factory = { PlayerView(it).apply { player = exoPlayer } })
}
```

### 6.5 Poster / thumbnail

Mux auto-generates thumbnails at any timestamp:

```
https://image.mux.com/{playback_id}/thumbnail.jpg?time=2&width=720
```

Poster fallback chain on the Coach Profile hero:
1. `coach.cover_image` (if uploaded by coach — overrides auto)
2. Mux auto-thumbnail at `time=2` (skips initial black frames)
3. Brand-gradient + initials (when no video at all)

## 7. Costs

Mux pricing (2026 rates):

| Item | Cost |
|---|---|
| Storage (encoded) | $0.005 / minute / month |
| Delivery (streaming) | $0.003 / minute / viewer |
| Encoding (`basic` quality) | $0.018 / minute (one-time) |

Rough estimate at 1 000 coaches × 60s intro = 1 000 min stored = **$5/mo storage**. Delivery scales with athlete browsing — at 10 000 views × 30s avg = 5 000 min = **$15/mo delivery**. Encoding one-shot ~$18 for first 1 000 uploads. Total realistic v1 spend: **< $50/mo**.

## 8. Failure & edge cases

- **Upload PUT fails mid-transfer** — client retries the chunked upload from last `Content-Range` (Mux supports resumable PUT, 256KB chunk multiples).
- **Upload signed URL expires before client finishes (>1h)** — backend exposes a `POST /me/intro-video/upload-url/refresh` endpoint that issues a new signed URL for the same `upload_id` (Mux's upload object lives for 60s after URL expiry).
- **`asset.errored` (codec issue, corrupt file, unsupported format)** — backend stores `mux_error_code`; client shows error banner with Retry. Retry = DELETE current state + start fresh from `/upload-url`.
- **Webhook lost** (Mux retried 24h, never reached us during outage) — backend cron `mux_asset_reconcile` job runs every 1h: lists all `processing` rows older than 30min, calls `GET /video/assets/{id}` directly, updates state. Belt-and-suspenders.
- **Coach replaces video** — backend issues `DELETE /video/assets/{old_id}` before storing new `mux_upload_id`. Old asset is garbage-collected by Mux within minutes.
- **Coach deletes account** — purge step iterates `coach.intro_video` and calls `DELETE /video/assets/{id}` for each.

## 9. Security & privacy

- **Public playback** = anyone with the `playback_id` can stream. Acceptable: coach profile is publicly browsable.
- **Direct upload URLs** are single-asset, time-limited (1h). Cannot be reused to upload to a different asset.
- **Webhooks** are HMAC-verified. Reject unsigned + log invalid signatures (potential abuse signal).
- **GDPR / right-to-erasure** — on coach account deletion, hard-delete the Mux asset. Mux stores no PII beyond what's in `passthrough` (we put `coach:<id>` only, no email/name).

## 10. References

- Mux direct upload guide: https://www.mux.com/docs/guides/upload-files-directly
- Mux playback guide: https://www.mux.com/docs/guides/play-your-videos
- Mux API reference: https://www.mux.com/docs/api-reference
- Mux webhook signing: https://www.mux.com/docs/core/listen-for-webhooks
- Internal: [`specs/personal-data.md`](../specs/personal-data.md) § Intro video — upload UX
- Internal: [`specs/coach-profile.md`](../specs/coach-profile.md) § Hero — playback UX
- Internal: [`specs/notifications.md`](../specs/notifications.md) § `videoReady` / `videoFailed` kit types
