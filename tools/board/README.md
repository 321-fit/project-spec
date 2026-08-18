# Prototype board

A Figma-like canvas over the HTML prototypes: every card is a **real screenshot**
of a real `.fit-phone`, and every arrow is a **real `go(...)` call** parsed out of
the file. Nothing is hand-placed, so the board cannot drift from the prototypes —
if a transition is not in the HTML, it is not on the board.

Open: `prototypes/board.html` (linked from the hub).

Getting around: the left panel lists **module → screens**, in flow order (entry first, then
each level of depth), each with its status dot, a `+N` states count and an orphan flag. Depth
is not repeated as headers here — it is already the canvas's own axis. A module folds and
remembers it between sessions; `\` shrinks the whole panel to a **46px rail** of module chips
rather than hiding it, and a chip expands the panel and flies to that module. Clicking a
screen flies the camera to it and rings it; the crosshair on a module header fits that lane.
`/` focuses search — it dims list and canvas together, temporarily unfolds so a match can't
hide inside a folded module, and `Enter` jumps to the first hit. Scroll pans, ⌘/Ctrl+scroll zooms, a click
on a card opens the live prototype at its anchor.

## Run

```bash
cd tools/board
npm install          # puppeteer-core only; Chrome itself is the one on your Mac
npm run build        # extract.mjs (graph) + shoot.mjs (screenshots)
```

Separately: `npm run graph` (fast, no browser) · `npm run shots` ·
`node shoot.mjs s-group-detail` (re-shoot one screen) · `node shoot.mjs --force`
(ignore the manifest and re-render everything).

**The board is built, not live** — an edit to a prototype shows up only after a rebuild.
That rebuild is incremental: every screen is fingerprinted by its own markup plus the file's
shared shell, so editing one screen re-renders one screen (~2 s), editing shared CSS
re-renders that module, and untouched screens are skipped. Run `npm run build` after
touching a prototype; it is cheap enough to be a habit.

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

- **Rebuild after editing a prototype.** Nothing watches the files; a stale board is a board
  that lies. `npm run build` skips everything that did not change.
- **Screenshots are not committed.** `prototypes/board/shots/` is gitignored;
  regenerate locally (~40 KB per shot, seconds per module). Only the graph
  (`board-data.js`) is committed.
- **Never touch the phone's `position` when injecting capture CSS** — sheets,
  drawers and context menus are absolutely positioned inside it, and making it
  static throws them onto the page: the shot comes out double-exposed.
- **New screens need `data-status`.** An unmarked screen shows a red dot on the
  board, which is the point: it should nag.
