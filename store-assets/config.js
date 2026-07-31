// =============================================================================
// 321Fit — Store screenshot configuration
// -----------------------------------------------------------------------------
// This is the ONLY file you edit to tweak copy, screen selection, order, theme
// or background accent. Then re-run the two scripts (see README.md):
//   node capture-screens.mjs   → refresh app PNGs in screens/
//   node export-frames.mjs     → render store PNGs in export/
// Preview live (no export) by opening storyboard.html in a browser.
// =============================================================================

// Output canvas. 1290×2796 = App Store 6.9" (also downscales cleanly for Google
// Play 1080×2340 / 9:19.5). One master size → both stores.
export const RENDER = { W: 1290, H: 2796 };

// Where the prototypes live, relative to this folder (store-assets/).
export const PROTO_ROOT = "../prototypes/flows";

// Background accents (radial brand glow behind the device). Base is always the
// dark brand charcoal so the set reads as one cohesive family.
export const ACCENTS = {
  teal:   "#05e0a6",
  blue:   "#03b2e2",
  violet: "#8b5cf6",
};

// -----------------------------------------------------------------------------
// FRAMES — order = store display order. Up to 10 (App Store) / 8 (Google Play).
//   file      : prototype html, relative to PROTO_ROOT
//   screenId  : optional #id of the .fit-phone to capture (omit → first .active)
//   theme     : "light" | "dark" — forces the app screen theme
//   accent    : key in ACCENTS — eyebrow + headline-accent color
//   eyebrow   : small uppercase kicker pill above the headline
//   headline  : big title. Wrap the punch word in *stars* → rendered in accent.
//   subhead   : one supporting line
//   injectJS  : optional JS string run in the prototype before capture
//               (real photos, trimming content, etc). window.__facesDir points at assets/faces.
//   shot      : output PNG name in screens/ (auto: <id>.png if omitted)
// -----------------------------------------------------------------------------
export const FRAMES = [
  {
    id: "search",
    file: "athlete/search.html",
    theme: "light",
    accent: "blue",
    eyebrow: "Find your coach",
    headline: "Find a coach who *gets you*",
    subhead: "Filter by sport, budget, language and location — match with the right pro in minutes.",
    // Swap the initials avatars for real (free) coach photos.
    injectJS: `(() => {
      // order matches the visible coach list (Maria F, Tomas M, Lukas M, Rasa F, …)
      const faces = ['x-female-1.jpg','x-male-1.jpg','x-male-2.jpg','x-female-2.jpg','x-female-3.jpg','x-male-3.jpg'];
      document.querySelectorAll('.coach-photo').forEach((el, i) => {
        el.textContent = '';
        el.style.backgroundImage = "url('" + window.__facesDir + "/" + faces[i % faces.length] + "')";
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
      });
    })()`,
  },
  {
    id: "profile",
    file: "shared/profile.html",      // public athlete-facing coach profile (Book Training, no edit chrome)
    screenId: "s-coach-v2",
    theme: "light",
    accent: "blue",
    eyebrow: "Verified coaches",
    headline: "Know exactly *who you're booking*",
    subhead: "Watch video intros, read real reviews and see every credential up front.",
    // Real coach avatar + a photo poster with a play button in the intro-video hero.
    injectJS: `(() => {
      const dir = window.__facesDir;
      const av = [...document.querySelectorAll('#s-coach-v2 div')].find(d =>
        d.textContent.trim() === 'JM' && /width:72px/.test(d.getAttribute('style') || ''));
      if (av) {
        av.textContent = '';
        av.style.setProperty('background', "url('" + dir + "/x-male-3.jpg') center/cover", 'important');
      }
      const v = document.querySelector('#s-coach-v2 .cv-media-video');
      if (v) {
        v.style.setProperty('background', "linear-gradient(180deg, rgba(0,0,0,0.12), rgba(0,0,0,0.4)), url('" + dir + "/hero-fitness.jpg') center/cover", 'important');
        v.innerHTML = '<div style="width:112px;height:112px;border-radius:50%;background:rgba(0,0,0,0.40);display:flex;align-items:center;justify-content:center;border:2.5px solid rgba(255,255,255,0.92);box-shadow:0 8px 30px rgba(0,0,0,0.35);"><svg width="44" height="44" viewBox="0 0 24 24" fill="white" style="margin-left:6px;"><polygon points="6 4 20 12 6 20 6 4"/></svg></div>';
      }
    })()`,
  },
  {
    id: "booking",
    file: "athlete/calendar.html",
    theme: "light",
    accent: "teal",
    eyebrow: "Smart scheduling",
    headline: "Book a session in *two taps*",
    subhead: "Pick a time, confirm, and it syncs straight to your calendar.",
  },
  {
    id: "dashboard",
    file: "athlete/dashboard.html",
    theme: "light",
    accent: "blue",
    eyebrow: "Your dashboard",
    headline: "Your training life, *all in one view*",
    subhead: "Next sessions, progress and payments — always a glance away.",
    // Trim "Needs your attention" to two items, drop the message badge, add real photos.
    injectJS: `(() => {
      const dir = window.__facesDir;
      const map = { MR: 'x-female-1.jpg', SK: 'x-male-2.jpg', JM: 'x-male-3.jpg', AK: 'x-female-3.jpg' };
      [...document.querySelectorAll('[data-a11y-id^="athlete.dashboard.attention"]')].slice(2).forEach(r => r.remove());
      const badge = document.getElementById('dash-msg-badge'); if (badge) badge.remove();
      document.querySelectorAll('.dash-next-avatar, .recent-avatar').forEach(el => {
        const k = (el.textContent || '').trim();
        if (map[k]) {
          el.textContent = '';
          el.style.setProperty('background', "url('" + dir + "/" + map[k] + "') center/cover", 'important');
          el.style.setProperty('color', 'transparent', 'important');
        }
      });
    })()`,
  },
  {
    id: "balance",
    file: "athlete/balance-v2.html",
    theme: "light",
    accent: "teal",
    eyebrow: "Secure payments",
    headline: "Pay once, *book anytime*",
    subhead: "Secure top-ups, automatic refunds, every euro accounted for.",
  },
  {
    id: "messages",
    file: "shared/messages.html",
    theme: "light",
    accent: "violet",
    eyebrow: "Stay connected",
    headline: "Stay in sync *with your coach*",
    subhead: "Message, share plans and never miss an update.",
    // Real photos on the conversation avatars (group rows keep their icon).
    injectJS: `(() => {
      const dir = window.__facesDir;
      const map = { JM: 'x-male-3.jpg', AK: 'x-female-3.jpg', MR: 'x-female-1.jpg' };
      document.querySelectorAll('.dm-av').forEach(el => {
        const k = (el.textContent || '').trim();
        if (/^[A-Z]{1,2}$/.test(k) && map[k]) {
          el.textContent = '';
          el.style.setProperty('background', "url('" + dir + "/" + map[k] + "') center/cover", 'important');
          el.style.setProperty('color', 'transparent', 'important');
        }
      });
    })()`,
  },
];

// -----------------------------------------------------------------------------
// FEATURE GRAPHIC — Google Play only, 1024×500, required to publish.
// Rendered by feature-graphic.html, exported by `node export-feature.mjs`.
// Shown at the top of the Play listing and in editorial placements; it gets
// cropped hard on some surfaces, so everything lives inside a centred safe area
// and the copy is deliberately short (it's read at ~2cm wide on a phone).
//   tagline : one line under the wordmark. Keep it under ~40 chars.
//   accent  : key in ACCENTS — colour of the glow behind the wordmark.
// -----------------------------------------------------------------------------
export const FEATURE = {
  W: 1024,
  H: 500,
  tagline: "Find a coach. Book. Train.",
  accent: "teal",
};
