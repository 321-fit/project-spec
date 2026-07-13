// Shared frame renderer — used by both frame.html (export) and storyboard.html (preview).
// Style: Strava-like — brand gradient background, eyebrow kicker, headline, and the
// app screen inside a clean phone mockup (contained, not edge-to-edge bleed).
import { RENDER, ACCENTS } from "./config.js";

// The small supporting line reads as clutter and is unreadable at store thumbnail
// size — hidden by default. Flip to true to bring subheads back.
const SHOW_SUBHEAD = false;
// Eyebrow kicker pill — hidden for a cleaner Strava-style (headline + big phone).
const SHOW_EYEBROW = false;

let stylesInjected = false;

export function injectStyles() {
  if (stylesInjected) return;
  stylesInjected = true;
  const css = `
  .sa-frame {
    width: ${RENDER.W}px; height: ${RENDER.H}px;
    position: relative; overflow: hidden;
    /* deep brand gradient (blue → teal), constant across the set for cohesion */
    background: linear-gradient(158deg, #103a5c 0%, #0c4a58 52%, #0c574c 100%);
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif;
    -webkit-font-smoothing: antialiased; color: #fff;
  }
  /* soft accent glow behind the phone for depth + slight per-frame variation */
  .sa-glow {
    position: absolute; left: 50%; top: 560px; transform: translateX(-50%);
    width: 1400px; height: 1400px; border-radius: 50%;
    filter: blur(150px); opacity: 0.28; pointer-events: none;
  }
  /* copy sits in the band above the phone (0 → device top) and is vertically
     centred in it, so 1- and 2-line headlines both look balanced.
     Height must match .sa-device top (560px). */
  .sa-copy {
    position: absolute; top: 0; left: 0; right: 0; height: 560px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 0 90px; text-align: center; z-index: 2;
  }
  .sa-eyebrow {
    display: inline-block; margin: 0 0 38px;
    padding: 19px 40px; border-radius: 100px;
    background: rgba(255,255,255,0.13);
    border: 1px solid rgba(255,255,255,0.18);
    font-size: 33px; font-weight: 600; letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  .sa-headline {
    font-size: 86px; line-height: 1.05; font-weight: 700;
    letter-spacing: -0.02em; margin: 0;
    /* reserve 2 lines' worth so the first line starts at the same Y whether the
       headline is 1 or 2 lines — consistent across the set (86 × 1.05 × 2 ≈ 181) */
    min-height: 181px;
  }
  .sa-headline .hl { -webkit-background-clip: text; background-clip: text; color: transparent; }
  .sa-sub {
    font-size: 37px; line-height: 1.32; font-weight: 400;
    color: rgba(255,255,255,0.72); margin: 32px auto 0; max-width: 960px;
    letter-spacing: -0.01em;
  }
  /* phone mockup */
  .sa-device {
    position: absolute; left: 50%; transform: translateX(-50%);
    top: 560px; width: 1000px;
    background: #0b0c0e;
    border-radius: 108px; padding: 24px;
    box-shadow: 0 2px 0 rgba(255,255,255,0.14) inset,
                0 40px 120px rgba(0,0,0,0.45);
  }
  .sa-device .screen {
    border-radius: 86px; overflow: hidden;
    box-shadow: 0 0 0 1px rgba(0,0,0,0.4) inset;
    background: #000;
  }
  .sa-device .screen img { display: block; width: 100%; height: auto; }
  `;
  const el = document.createElement("style");
  el.textContent = css;
  document.head.appendChild(el);
}

function headlineHTML(text, accent) {
  return text.replace(/\*(.+?)\*/g, (_, p) =>
    `<span class="hl" style="background-image:linear-gradient(120deg, ${accent}, #eafff9);">${p}</span>`
  );
}

export function buildFrame(frame) {
  injectStyles();
  const accent = ACCENTS[frame.accent] || ACCENTS.blue;
  const root = document.createElement("div");
  root.className = "sa-frame";
  root.dataset.frameId = frame.id;

  const glow = document.createElement("div");
  glow.className = "sa-glow";
  glow.style.background = `radial-gradient(circle, ${accent} 0%, rgba(0,0,0,0) 60%)`;
  root.appendChild(glow);

  const copy = document.createElement("div");
  copy.className = "sa-copy";
  const eyebrow = SHOW_EYEBROW && frame.eyebrow
    ? `<div class="sa-eyebrow" style="color:${accent};">${frame.eyebrow}</div>`
    : "";
  const sub = SHOW_SUBHEAD && frame.subhead
    ? `<p class="sa-sub">${frame.subhead}</p>` : "";
  copy.innerHTML =
    eyebrow +
    `<h1 class="sa-headline">${headlineHTML(frame.headline, accent)}</h1>` +
    sub;
  root.appendChild(copy);

  const device = document.createElement("div");
  device.className = "sa-device";
  const screen = document.createElement("div");
  screen.className = "screen";
  const img = document.createElement("img");
  img.src = `./screens/${frame.shot || frame.id + ".png"}`;
  img.alt = frame.id;
  screen.appendChild(img);
  device.appendChild(screen);
  root.appendChild(device);

  return root;
}
