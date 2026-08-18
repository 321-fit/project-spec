// =============================================================================
// 321Fit — prototype board configuration
// -----------------------------------------------------------------------------
// The board is a *view over* the prototypes, not a second source of truth:
// every card is a real screenshot of a real `.fit-phone`, and every arrow is a
// real `go(...)` call parsed out of the file. Nothing here is hand-placed.
//
//   node extract.mjs   → prototypes/board/board-data.js   (graph, no browser)
//   node shoot.mjs     → prototypes/board/shots/*.webp    (headless Chrome)
//   open prototypes/board.html
// =============================================================================

// Where the prototypes live, relative to tools/board/.
export const PROTO_ROOT = "../../prototypes";

// Output folder, relative to tools/board/.
export const OUT_ROOT = "../../prototypes/board";

// Capture size. The phone shell is 390×844; scale 2 keeps it crisp when you
// zoom into a card on the board.
export const SHOT = { width: 390, height: 844, scale: 2, quality: 82 };

// -----------------------------------------------------------------------------
// MODULES — which prototype files the board covers.
//   file  : path under PROTO_ROOT
//   label : lane title on the board
//   role  : coach | athlete | shared
// -----------------------------------------------------------------------------
export const MODULES = [
  { file: "flows/coach/client-groups.html", label: "Client groups", role: "coach" },
];

// -----------------------------------------------------------------------------
// STATES — a screen is not one picture. Everything a `.fit-phone` can look like
// (edit mode, empty, an open sheet, a skeleton) is declared here and captured as
// its own card, because those states are exactly what a developer comes for.
//   run  : JS evaluated in the page after the screen is made active
//   wait : extra ms before the shot (animations, transitions)
// -----------------------------------------------------------------------------
export const STATES = {
  "s-groups": [
    { id: "empty", label: "No groups yet", run: "cgState('empty')" },
  ],
  "s-group-detail": [
    { id: "editing", label: "Edit mode — tap a row to remove", run: "cgEditState(true)" },
    { id: "no-schedule", label: "Not on any session", run: "cgSched('none')" },
    { id: "drawer", label: "Schedule drawer — one-off or weekly", run: "cgPublish()", wait: 400 },
  ],
  "s-group-schedule": [
    { id: "recurring-only", label: "Filtered to recurring", run: "cgSchedFilter('rec', document.querySelector('#s-group-schedule .fit-filter-chip:nth-child(2)'))" },
  ],
};

// Screens whose only job is to host another screen's state (none yet).
export const HIDE = [];
