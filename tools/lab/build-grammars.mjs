// Build prototypes/lab/list-grammars.html — the three list grammars on REAL
// screens, not on demo rows.
//
// The screens are lifted out of the live prototype files rather than re-typed,
// for the reason that bit us before: markup copied by eye drifts from the thing
// it claims to show, and then a comparison proves nothing. Each screen is taken
// by TAG DEPTH (not by line range — that was the earlier bug) together with the
// page-local <style> it depends on.
//
// The proposed grammar is applied as CSS over the SAME markup. That is the point
// of the exercise: if a port needs new markup, this file cannot express it, and
// we would know the port is bigger than it looks.
//
// Re-run:  node tools/lab/build-grammars.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROTO = path.resolve(HERE, "../../prototypes");

// --- lift one screen out of a prototype, by depth ----------------------------
function screenOf(html, pick) {
  const open = /<div\s+([^>]*class="([^"]*)"[^>]*)>/g;
  let m;
  while ((m = open.exec(html))) {
    const cls = m[2].split(/\s+/);
    if (!cls.includes("fit-phone")) continue;
    const id = (m[1].match(/id="([^"]*)"/) || [])[1] || "";
    if (!pick(id, cls)) continue;
    // walk forward counting div depth until this one closes
    let depth = 1, i = open.lastIndex;
    const tag = /<(\/?)div\b[^>]*?(\/?)>/g;
    tag.lastIndex = i;
    let t;
    while ((t = tag.exec(html))) {
      if (t[2] === "/") continue;                  // self-closing, ignore
      depth += t[1] === "/" ? -1 : 1;
      if (depth === 0) return { id, html: html.slice(m.index, tag.lastIndex) };
    }
    throw new Error(`unbalanced markup around ${id}`);
  }
  throw new Error("no screen matched");
}

const styleOf = (html) =>
  [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n");

// --- what we are comparing ---------------------------------------------------
const CASES = [
  {
    key: "settings",
    file: "flows/coach/settings.html",
    pick: (id, cls) => cls.includes("active"),
    title: "Settings — a fixed handful of identical menu rows",
    today: "A · cards",
    proposed: "B · inset container",
    verdict:
      "Seven rows that are all the same shape, and the screen is nothing else. " +
      "Today each one separates itself from the page — seven edges to get right in " +
      "light. As a container it separates once and the hairlines do the rest.",
  },
  {
    key: "messages",
    file: "flows/shared/messages.html",
    pick: (id, cls) => cls.includes("active"),
    title: "Messages — hundreds of identical records",
    today: "C · full bleed (already)",
    proposed: "C + the missing separator",
    verdict:
      "This screen ALREADY uses the third grammar — nobody wrote it down, it was " +
      "simply drawn that way. Which is the finding: we own all three and choose " +
      "between them by accident. The only thing missing is the hairline, so rows " +
      "currently run together.",
  },
  {
    key: "personal-data",
    file: "flows/coach/personal-data.html",
    pick: (id, cls) => cls.includes("active"),
    title: "Personal data — a form",
    today: "fields on the page",
    proposed: "E · fields are rows in a container",
    verdict:
      "The case that started the whole thread. Today: nine separate fields, each " +
      "needing its own fill and edge on a near-white page. As a container the " +
      "fields need neither — which is exactly why iOS has no outlined text field.",
  },
];

// --- the proposed grammar, as CSS over the real markup -----------------------
const PROPOSED = `
/* ============================================================================
   The proposals. Everything here is scoped to .gr-proposed, so the left phone
   in each pair is the live screen, untouched, and the right one is the same
   markup wearing the other grammar.
   ============================================================================ */

/* The container is a real element (see groupRuns below) — CSS alone could not
   make one, because the section title lives inside the same flex wrapper as the
   cards. That is the honest cost of grammar B: the port adds a wrapper. */
.gr-group { display: flex; flex-direction: column; border-radius: 16px; overflow: hidden; }

/* --- B: settings cards become one container ------------------------------- */
.gr-proposed .set-card {
  border-radius: 0; margin: 0; box-shadow: none; position: relative;
}
.gr-proposed .set-card + .set-card::before {
  content: ''; position: absolute; left: 60px; right: 0; top: 0;
  height: 1px; background: var(--fit-divider);
}

/* --- C: the chat list gets the separator it never had --------------------- */
.gr-proposed .dm-row { position: relative; }
.gr-proposed .dm-row + .dm-row::before {
  content: ''; position: absolute; left: 78px; right: 0; top: 0;
  height: 1px; background: var(--fit-divider);
}

/* --- E: form fields become rows of one container -------------------------- */
.gr-proposed .gr-group:has(.fit-input-group) { margin: 0 16px; }
.gr-proposed .gr-group .fit-input-group {
  margin-top: 0; margin-bottom: 0; padding: 9px 16px; position: relative;
  background: var(--fit-surface-high);
}
.gr-proposed .fit-light .gr-group .fit-input-group { background: var(--fit-white); }
/* No leading icon in a form: the text starts at the container edge, so the
   separator starts there too — inset equally on both sides. (With an icon, as
   in Settings, it starts past the icon instead and runs to the edge.) */
.gr-proposed .gr-group .fit-input-group + .fit-input-group::before {
  content: ''; position: absolute; left: 16px; right: 16px; top: 0;
  height: 1px; background: var(--fit-divider);
}
.gr-proposed .gr-group .fit-input-label { font-size: 11.5px; font-weight: 400; color: var(--fit-text-tertiary); margin-bottom: 0; letter-spacing: .1px; }
.gr-proposed .gr-group .fit-input,
.gr-proposed .gr-group .fit-input-ta {
  background: transparent; border: 0; border-radius: 0;
  height: auto; min-height: 0; padding: 1px 0 0; font-size: 15px;
}
`;

// --- compose -----------------------------------------------------------------
const parts = CASES.map((c) => {
  const src = fs.readFileSync(path.join(PROTO, c.file), "utf8");
  const scr = screenOf(src, c.pick);
  return { ...c, style: styleOf(src), screen: scr.html, screenId: scr.id };
});

const pane = (c, side) => `
      <div class="gr-side">
        <div class="gr-label">${side === "today" ? c.today : c.proposed}</div>
        <div class="gr-frame${side === "proposed" ? " gr-proposed" : ""}">${c.screen}</div>
      </div>`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>321Fit — List grammars on real screens</title>
<link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../lib/fit-ui.css">
<style>
  /* GENERATED by tools/lab/build-grammars.mjs — edit the generator, not this file. */
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Rubik, -apple-system, sans-serif; background: #08080a; color: #ececf0; }
  .bar {
    position: sticky; top: 0; z-index: 40; display: flex; align-items: center; gap: 14px;
    padding: 12px 20px; background: rgba(8,8,10,.92); backdrop-filter: blur(12px);
    border-bottom: 1px solid #26262b;
  }
  .bar h1 { font-size: 15px; font-weight: 600; }
  .bar .sp { flex: 1; }
  .bar a, .bar button {
    font: inherit; font-size: 12px; padding: 6px 11px; border-radius: 8px;
    border: 1px solid #2b2b32; background: transparent; color: #8a8a94;
    cursor: pointer; text-decoration: none;
  }
  .bar button.on, .bar a:hover, .bar button:hover { color: #ececf0; border-color: #46464f; }

  .intro { max-width: 760px; padding: 26px 20px 6px; font-size: 13.5px; line-height: 1.6; color: #9a9aa4; }
  .intro b { color: #ececf0; font-weight: 600; }

  .case { padding: 26px 20px 8px; }
  .case h2 { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
  .case p { max-width: 760px; font-size: 13px; line-height: 1.6; color: #8a8a94; margin-bottom: 16px; }
  .case p .src { font-family: ui-monospace, monospace; font-size: 11.5px; color: #6a6a74; }

  .pair { display: flex; gap: 26px; align-items: flex-start; flex-wrap: wrap; }
  .gr-side { display: flex; flex-direction: column; gap: 8px; }
  .gr-label { font-size: 11.5px; font-family: ui-monospace, monospace; color: #8a8a94; }
  /* The screens are lifted whole, so they keep their own 390x844 shell. */
  .gr-frame .fit-phone { position: relative; display: block; }
  .gr-frame .sidebar, .gr-frame .ann-container, .gr-frame .fit-toast, .gr-frame .snack { display: none !important; }

/* ---- page-local styles from the source prototypes, verbatim -------------- */
${parts.map((p) => `/* ===== ${p.file} ===== */\n${p.style}`).join("\n")}
${PROPOSED}
</style>
</head>
<body>

<div class="bar">
  <a href="../index.html">← Start</a>
  <a href="components.html">Fitting room</a>
  <h1>List grammars — on real screens</h1>
  <span class="sp"></span>
  <button id="themeBtn">Theme: light</button>
</div>

<div class="intro">
  The fitting room shows the three grammars on three demo rows, which is enough to
  understand them and not enough to choose. These are the <b>live screens</b>, lifted
  out of the prototypes by the generator — left is exactly what ships today, right is
  the same markup with the other grammar applied as CSS. Nothing here is decided.
</div>

${parts.map((c) => `
<div class="case">
  <h2>${c.title}</h2>
  <p>${c.verdict} <span class="src">${c.file} #${c.screenId}</span></p>
  <div class="pair">${pane(c, "today")}${pane(c, "proposed")}</div>
</div>`).join("\n")}

<div style="height:60px"></div>

<script>
// Grammar B and E need a real container element: in the live screens the section
// title sits inside the same flex wrapper as the rows, so no selector can group
// the rows without swallowing the title. Wrapping runs of siblings here is not a
// trick to make the demo work — it IS the port. If we adopt these grammars, the
// screens gain exactly this element, and that is the whole markup cost.
function groupRuns(root, sel, keep) {
  root.querySelectorAll(sel).forEach(el => {
    // A run is only a run of the SAME thing. On the personal-data form
    // .fit-input-group also wraps the video uploader and the cover-image row —
    // grouping those with the text fields glues a media block to a name field.
    // Which is itself a finding: grammar E fits a homogeneous run of fields,
    // and a mixed form keeps its media blocks as cards between the groups.
    if (keep && !keep(el)) return;
    const prev = el.previousElementSibling;
    if (prev && prev.classList.contains('gr-group')) { prev.appendChild(el); return; }
    const g = document.createElement('div');
    g.className = 'gr-group';
    el.parentNode.insertBefore(g, el);
    g.appendChild(el);
  });
}
document.querySelectorAll('.gr-proposed').forEach(f => {
  groupRuns(f, '.set-card');
  groupRuns(f, '.fit-input-group', el => el.querySelector('.fit-input, .fit-input-ta, input, textarea, select'));
});

// The screens carry their own theme class; flip both phones together.
const btn = document.getElementById('themeBtn');
btn.onclick = () => {
  const toLight = btn.textContent.endsWith('dark');
  document.querySelectorAll('.gr-frame .fit-phone').forEach(p => {
    p.classList.toggle('fit-light', toLight);
    p.classList.toggle('fit-dark', !toLight);
  });
  btn.textContent = 'Theme: ' + (toLight ? 'light' : 'dark');
};
// start light — that is where the grammars actually differ
btn.textContent = 'Theme: dark';
btn.onclick();
</script>
</body>
</html>
`;

fs.writeFileSync(path.join(PROTO, "lab/list-grammars.html"), html);
console.log(
  `→ prototypes/lab/list-grammars.html · ` +
  parts.map((p) => `${p.key}#${p.screenId}`).join(" · ")
);
