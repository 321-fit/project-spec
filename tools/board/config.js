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
// COVERAGE — every `flows/<role>/*.html` is on the board automatically. Listing
// 44 files by hand only guarantees the 45th gets forgotten.
//   ROLES   : lane order, and the sections in the left panel
//   EXCLUDE : paths (under PROTO_ROOT) to keep off the board
//   LABELS  : override the name derived from the file's <title>
// -----------------------------------------------------------------------------
// Column order left→right. `shared` leads because the product does: you sign in
// and get onboarded before you are a coach or an athlete. Coach and athlete then
// sit side by side, which is the point of columns — the same question answered
// twice. journeys/ is absent: step maps, not screens.
export const ROLES = ["shared", "coach", "athlete"];

// Superseded by the v2 (Revolut-style) money screens — the files stay in the
// repo for rollback, but two near-identical ledgers on one board is noise.
export const EXCLUDE = [
  "flows/coach/balance.html",
  "flows/athlete/balance.html",
];

export const LABELS = {
  "flows/coach/sessions.html": "Training templates",
  "flows/coach/balance-v2.html": "Coach Earnings",
  "flows/athlete/balance-v2.html": "Athlete Balance",
  "flows/coach/availability.html": "Availability",
  "flows/shared/calendar-legend.html": "Calendar legend",
  "flows/shared/profile.html": "Coach Profile (public)",
  "flows/shared/assistant-entry.html": "Contextual AI quick starts (WIP)",
  "flows/shared/action-rows.html": "Action rows \u2014 inventory (WIP)",
};

// -----------------------------------------------------------------------------
// ORDER — lanes read in the order the product is used, not alphabetically:
// you sign in, you are onboarded, you land on a dashboard, and only then do you
// go deep. Anything not listed falls to the end of its column, alphabetically.
// -----------------------------------------------------------------------------
export const ORDER = [
  // shared — everything that happens before you have a role, and what both use
  "flows/shared/auth.html",
  "flows/shared/onboarding.html",
  "flows/shared/account-access.html",
  "flows/shared/connect.html",
  "flows/shared/messages.html",
  "flows/shared/voice-assistant.html",
  "flows/shared/assistant-entry.html",
  "flows/shared/action-rows.html",
  "flows/shared/self-paced.html",
  "flows/shared/profile.html",
  "flows/shared/calendar-legend.html",

  // coach — root tabs in nav order, then what they open, then settings
  "flows/coach/dashboard.html",
  "flows/coach/clients.html",
  "flows/coach/client-groups.html",
  "flows/coach/client-detail-drafts.html",
  "flows/coach/sessions.html",
  "flows/coach/calendar.html",
  "flows/coach/invite.html",
  "flows/coach/availability.html",
  "flows/coach/available-hours.html",
  "flows/coach/locations.html",
  "flows/coach/balance-v2.html",
  "flows/coach/stripe.html",
  "flows/coach/profile.html",
  "flows/coach/referral.html",
  "flows/coach/settings.html",
  "flows/coach/personal-data.html",
  "flows/coach/sport-types.html",
  "flows/coach/calendar-sync.html",

  // athlete — same shape
  "flows/athlete/dashboard.html",
  "flows/athlete/search.html",
  "flows/athlete/my-coaches.html",
  "flows/athlete/calendar.html",
  "flows/athlete/balance-v2.html",
  "flows/athlete/profile.html",
  "flows/athlete/settings.html",
  "flows/athlete/personal-data.html",
  "flows/athlete/sport-types.html",
  "flows/athlete/calendar-sync.html",
  "flows/athlete/integrations.html",
];

// -----------------------------------------------------------------------------
// STATES — a screen is not one picture. Everything a `.fit-phone` can look like
// (edit mode, empty, an open sheet, a skeleton) is declared here and captured as
// its own card, because those states are exactly what a developer comes for.
//   run  : JS evaluated in the page after the screen is made active
//   wait : extra ms before the shot (animations, transitions)
// Keyed by screen id — ids are unique per file, and a clash across files just
// means both screens get both states, so keep them distinctive.
// -----------------------------------------------------------------------------
export const STATES = {
  // Contextual AI entry — every mounted point gets an open quick-start shot and
  // a second shot after its first screen-specific prompt starts the chat.
  "flows/coach/client-detail-drafts.html#s-draft-full": [
    { id: "no-next-session", label: "No next session → CTA in the same slot", run: "document.getElementById('s-draft-full').classList.add('no-next')" },
  ],
  "flows/coach/clients.html#s-client-detail": [
    { id: "ai-quick-starts", label: "AI · 3 contextual quick actions", run: "document.querySelector('#s-client-detail .fit-guide-fab').click()", wait: 250 },
    { id: "ai-chat", label: "AI · full-screen chat from first action", run: "document.querySelector('#s-client-detail .fit-guide-fab').click();document.querySelector('#s-client-detail .fit-guide-prompt').click()", wait: 250 },
  ],
  "flows/coach/sessions.html#s-create": [
    { id: "ai-quick-starts", label: "AI · 3 contextual quick actions", run: "document.querySelector('#s-create .fit-guide-fab').click()", wait: 250 },
    { id: "ai-chat", label: "AI · full-screen chat from first action", run: "document.querySelector('#s-create .fit-guide-fab').click();document.querySelector('#s-create .fit-guide-prompt').click()", wait: 250 },
  ],
  "flows/coach/sessions.html#pkg-editor": [
    { id: "ai-quick-starts", label: "AI · 3 contextual quick actions", run: "document.querySelector('#pkg-editor .fit-guide-fab').click()", wait: 250 },
    { id: "ai-chat", label: "AI · full-screen chat from first action", run: "document.querySelector('#pkg-editor .fit-guide-fab').click();document.querySelector('#pkg-editor .fit-guide-prompt').click()", wait: 250 },
  ],
  "flows/coach/client-groups.html#s-group-schedule": [
    { id: "ai-quick-starts", label: "AI · 3 contextual quick actions", run: "document.querySelector('#s-group-schedule .fit-guide-fab').click()", wait: 250 },
    { id: "ai-chat", label: "AI · full-screen chat from first action", run: "document.querySelector('#s-group-schedule .fit-guide-fab').click();document.querySelector('#s-group-schedule .fit-guide-prompt').click()", wait: 250 },
    { id: "recurring-only", label: "Filtered to recurring", run: "cgSchedFilter('rec', document.querySelector('#s-group-schedule .fit-filter-chip:nth-child(2)'))" },
  ],
  "flows/coach/balance-v2.html#s-earnings": [
    { id: "ai-quick-starts", label: "AI · 3 contextual quick actions", run: "document.querySelector('#s-earnings .fit-guide-fab').click()", wait: 250 },
    { id: "ai-chat", label: "AI · full-screen chat from first action", run: "document.querySelector('#s-earnings .fit-guide-fab').click();document.querySelector('#s-earnings .fit-guide-prompt').click()", wait: 250 },
  ],
  "flows/coach/stripe.html#s-stripe": [
    { id: "ai-quick-starts", label: "AI · 3 contextual quick actions", run: "document.querySelector('#s-stripe .fit-guide-fab').click()", wait: 250 },
    { id: "ai-chat", label: "AI · full-screen chat from first action", run: "document.querySelector('#s-stripe .fit-guide-fab').click();document.querySelector('#s-stripe .fit-guide-prompt').click()", wait: 250 },
  ],
  "flows/shared/self-paced.html#s-setup": [
    { id: "ai-quick-starts", label: "AI · 3 contextual quick actions", run: "document.querySelector('#s-setup .fit-guide-fab').click()", wait: 250 },
    { id: "ai-chat", label: "AI · full-screen chat from first action", run: "document.querySelector('#s-setup .fit-guide-fab').click();document.querySelector('#s-setup .fit-guide-prompt').click()", wait: 250 },
  ],
  "flows/coach/calendar-sync.html#s-calsync": [
    { id: "ai-quick-starts", label: "AI · 3 contextual quick actions", run: "document.querySelector('#s-calsync .fit-guide-fab').click()", wait: 250 },
    { id: "ai-chat", label: "AI · full-screen chat from first action", run: "document.querySelector('#s-calsync .fit-guide-fab').click();document.querySelector('#s-calsync .fit-guide-prompt').click()", wait: 250 },
  ],
  "flows/athlete/search.html#s-search-landing": [
    { id: "ai-quick-starts", label: "AI · 3 contextual quick actions", run: "document.querySelector('#s-search-landing .fit-guide-fab').click()", wait: 250 },
    { id: "ai-chat", label: "AI · full-screen chat from first action", run: "document.querySelector('#s-search-landing .fit-guide-fab').click();document.querySelector('#s-search-landing .fit-guide-prompt').click()", wait: 250 },
  ],
  "flows/athlete/balance-v2.html#s-txn-spend": [
    { id: "ai-quick-starts", label: "AI · 3 contextual quick actions", run: "document.querySelector('#s-txn-spend .fit-guide-fab').click()", wait: 250 },
    { id: "ai-chat", label: "AI · full-screen chat from first action", run: "document.querySelector('#s-txn-spend .fit-guide-fab').click();document.querySelector('#s-txn-spend .fit-guide-prompt').click()", wait: 250 },
  ],
  "flows/shared/profile.html#s-book-sessions": [
    { id: "ai-quick-starts", label: "AI · 3 contextual quick actions", run: "document.querySelector('#s-book-sessions .fit-guide-fab').click()", wait: 250 },
    { id: "ai-chat", label: "AI · full-screen chat from first action", run: "document.querySelector('#s-book-sessions .fit-guide-fab').click();document.querySelector('#s-book-sessions .fit-guide-prompt').click()", wait: 250 },
  ],
  "flows/athlete/calendar-sync.html#s-calsync": [
    { id: "ai-quick-starts", label: "AI · 3 contextual quick actions", run: "document.querySelector('#s-calsync .fit-guide-fab').click()", wait: 250 },
    { id: "ai-chat", label: "AI · full-screen chat from first action", run: "document.querySelector('#s-calsync .fit-guide-fab').click();document.querySelector('#s-calsync .fit-guide-prompt').click()", wait: 250 },
  ],
  "flows/coach/settings.html#s-settings": [
    { id: "ai-quick-starts-hidden", label: "AI quick starts hidden · tap to restore", run: "var el=document.querySelector('#s-settings [data-fit-guide-setting]');el.classList.remove('active');el.setAttribute('aria-checked','false');el.querySelector('[data-fit-guide-setting-sub]').textContent='Hidden · tap to show again'" },
  ],
  "flows/athlete/settings.html#s-settings": [
    { id: "ai-quick-starts-hidden", label: "AI quick starts hidden · tap to restore", run: "var el=document.querySelector('#s-settings [data-fit-guide-setting]');el.classList.remove('active');el.setAttribute('aria-checked','false');el.querySelector('[data-fit-guide-setting-sub]').textContent='Hidden · tap to show again'" },
  ],

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
