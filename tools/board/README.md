# Prototype board

A Figma-like canvas over the HTML prototypes: every card is a **real screenshot**
of a real `.fit-phone`, and every arrow is a **real `go(...)` call** parsed out of
the file. Nothing is hand-placed, so the board cannot drift from the prototypes —
if a transition is not in the HTML, it is not on the board.

Open: `prototypes/board.html` (linked from the hub).

Getting around: `\` toggles the left screen list (modules → screens grouped by tap depth,
with the status dot, a `+N` states count and an orphan flag); clicking an item flies the
camera to that screen and rings it. `/` focuses search — it dims both the list and the
canvas, and `Enter` jumps to the first match. Scroll pans, ⌘/Ctrl+scroll zooms, a click on
a card opens the live prototype at its anchor.

## Run

```bash
cd tools/board
npm install          # puppeteer-core only; Chrome itself is the one on your Mac
npm run build        # extract.mjs (graph) + shoot.mjs (screenshots)
```

Separately: `npm run graph` (fast, no browser) · `npm run shots` ·
`node shoot.mjs s-group-detail` (re-shoot one screen).

Override Chrome with `CHROME_PATH=/path/to/Chrome`.

## What you edit

Only `config.js`:

- **`MODULES`** — which prototype files the board covers.
- **`STATES`** — a screen is not one picture. Edit mode, empty, an open sheet, a
  skeleton: declare each one with the JS that produces it and it becomes its own
  card next to the screen. This is the only part that needs hand work, and it is
  exactly the part a developer comes to the board for.

Everything else — titles, levels, arrows, statuses, orphans — is derived.

## What is derived, and from where

| On the board | Comes from |
|---|---|
| card image | headless Chrome shot of `#<id>` with sidebar/annotations/bezel stripped |
| card title | the **sidebar** button label (`.fit-header-title` is the in-app title — three screens of one group are all called "Morning") |
| status dot | `data-status="shipped\|canon\|proposal\|legacy"` on the `.fit-phone`; missing → red **unmarked** |
| column | BFS depth from the entry screen — "how many taps in" |
| arrows | `go('s-x')` inside that screen's markup; an arrow back to a shallower screen is drawn dashed and hidden by default |
| `⇢ file.html` chips | `location.href` / `href` to another prototype |
| **no entry** badge | nothing in this module links to it — either it is entered from another file (add that file to `MODULES` and the arrow appears) or nothing reaches it at all |
| tooltip | the first `<p>` of the screen's annotation |

## Rules

- **Screenshots are not committed.** `prototypes/board/shots/` is gitignored;
  regenerate locally (~40 KB per shot, seconds per module). Only the graph
  (`board-data.js`) is committed.
- **Never touch the phone's `position` when injecting capture CSS** — sheets,
  drawers and context menus are absolutely positioned inside it, and making it
  static throws them onto the page: the shot comes out double-exposed.
- **New screens need `data-status`.** An unmarked screen shows a red dot on the
  board, which is the point: it should nag.
