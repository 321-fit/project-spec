# 321Fit — Store screenshots

Config-driven generator for **App Store** and **Google Play** screenshots. It captures
real screens from our prototypes and composes them into edge-to-edge marketing frames.
Nothing is baked into the prototypes — this folder is standalone and reusable for every release.

```
config.js            ← ✏️ edit here: copy, screen selection, order, theme, accent
render.js            ← frame layout (headline + glow + edge-to-edge device)
frame.html           ← renders ONE frame at exactly 1290×2796 (used by export)
storyboard.html      ← live preview of ALL frames side by side
capture-screens.mjs  ← prototypes → screens/*.png   (the raw app shots)
export-frames.mjs    ← frame.html  → export/*.png    (the final store assets)
lib.mjs / serve.mjs  ← Chrome path + tiny local server (CORS-free modules)
screens/             ← captured app screens (source, regenerated)
export/              ← FINAL store PNGs — upload these
```

## Quick start

```bash
cd project-spec/store-assets
npm install                 # once — installs puppeteer-core
node capture-screens.mjs    # prototypes → screens/
node export-frames.mjs      # screens/  → export/  (1290×2796 PNGs)
```

Preview without exporting (live, reflects config.js instantly):

```bash
node serve.mjs              # then open the printed http://127.0.0.1:PORT/storyboard.html
```

Regenerate a single frame only (fast iteration):

```bash
node capture-screens.mjs voice && node export-frames.mjs voice
```

## Editing

Everything you tune lives in **`config.js`**:

- **Copy** — `headline` + `subhead`. Wrap the punch phrase in `*stars*` → it renders in the accent gradient.
- **Screen** — `file` (prototype path) + optional `screenId` (which `.fit-phone` to grab).
- **Theme** — `"light"` / `"dark"` forces the app screen's theme (athlete = light, coach = dark by default).
- **Accent** — `teal` / `blue` / `violet` — the brand glow behind the phone (add more in `ACCENTS`).
- **Order** — array order = store display order.

Change text/accent only → just re-run `export-frames.mjs` (no recapture needed).
Change `file`/`screenId`/`theme` → re-run `capture-screens.mjs` first.

## Output sizes

- **Master:** 1290 × 2796 (App Store 6.9" iPhone). Apple accepts this single size and scales down.
- **Google Play:** the same PNGs are accepted (9:19.5, ≥1080px). Downscale to 1080-wide if you want smaller files.
- **Still to add when needed:** Google Play *Feature graphic* (1024 × 500) and App Store 13" iPad (2064 × 2752) — not generated yet.

## Layout & style

Strava-style: deep brand gradient (blue → teal) behind a large phone mockup, with the
headline centred in the band above it. Two toggles at the top of `render.js`:

- `SHOW_EYEBROW` (default `false`) — the small uppercase kicker pill above the headline.
- `SHOW_SUBHEAD` (default `false`) — the supporting line under the headline (unreadable at
  thumbnail size, so off).

The headline reserves two lines of height so 1- and 2-line headlines start at the same Y
across the set. Real (free) photos are injected into avatars/video posters via each frame's
`injectJS` (see `config.js`); source faces live in `assets/faces/`.

## Notes

- Current set = **6 athlete-facing frames** (search, profile, booking, dashboard, balance, messages).
- Requires Google Chrome installed. Override its path with `CHROME_PATH=... node ...` if needed.
- Prototype dev-annotation tags (`.tag`) are auto-hidden in captures.
- `node_modules/` is git-ignored; `screens/` + `export/` PNGs are committed so `storyboard.html`
  renders on GitHub Pages without a build step.
