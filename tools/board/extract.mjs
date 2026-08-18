// Parse the prototypes into a graph → prototypes/board/board-data.js
// No browser needed. The point: the board's structure is derived from the files,
// so it cannot drift from them — if a transition is not in the HTML, it is not
// on the board.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { PROTO_ROOT, OUT_ROOT } from "./config.js";
import { discover, protoDir, shotName, statesFor } from "./modules.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(HERE, OUT_ROOT);

const ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  middot: "·", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”",
  hellip: "…", mdash: "—", ndash: "–", times: "×", euro: "€", check: "✓",
};
const decode = (s) =>
  s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
   .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
   .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n] ?? m);
const text = (html) => decode(html.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();

// --- one screen = one top-level .fit-phone ----------------------------------
function screensOf(html) {
  // NB: `\bfit-phone\b` also matches `fit-phone-header` — compare class tokens.
  const open = /<div\s+([^>]*class="([^"]*)"[^>]*)>/g;
  const marks = [];
  let m;
  while ((m = open.exec(html))) {
    if (!m[2].split(/\s+/).includes("fit-phone")) continue;
    marks.push({ attrs: m[1], start: m.index, after: open.lastIndex });
  }
  const annAt = html.indexOf('class="ann-container"');
  const end = annAt === -1 ? html.length : html.lastIndexOf("<div", annAt);

  // Everything that is not a screen — head, styles, sidebar, annotations, the
  // scripts at the bottom. It goes into every screen's fingerprint, so editing
  // shared CSS re-shoots the whole module while editing one screen does not.
  const shell = marks.length ? html.slice(0, marks[0].start) + html.slice(end) : html;

  return marks.map((mark, i) => {
    const stop = i + 1 < marks.length ? marks[i + 1].start : end;
    const body = html.slice(mark.after, stop);
    const attr = (name) => (mark.attrs.match(new RegExp(`${name}="([^"]*)"`)) || [])[1] || "";
    const cls = attr("class");
    const title = (body.match(/<(?:span|div)[^>]*class="[^"]*\bfit-header-title\b[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div)>/) || [])[1];
    return {
      id: attr("id"),
      status: attr("data-status") || "unmarked",
      title: title ? text(title) : "",
      theme: /\bfit-light\b/.test(cls) ? "light" : "dark",
      entry: /\bactive\b/.test(cls),
      body,
      shell,
    };
  }).filter((s) => s.id);
}

// --- human name: the sidebar label is what we actually call the screen -------
// `.fit-header-title` is the in-app title, so three different screens of one
// group are all called "Morning". The sidebar has the design name.
function sidebarLabels(html) {
  const nav = html.slice(html.indexOf('<nav class="sidebar"'), html.indexOf("</nav>"));
  const map = {};
  for (const m of nav.matchAll(/onclick="go\(\s*'([a-z0-9-]+)'[^"]*"[^>]*>([\s\S]*?)<\/button>/gi)) {
    map[m[1]] = text(m[2]);
  }
  return map;
}

// --- annotation next to the screen ------------------------------------------
function annotationOf(html, id) {
  const at = html.indexOf(`id="ann-${id}"`);
  if (at === -1) return { head: "", note: "" };
  const slice = html.slice(at, at + 4000);
  const h3 = slice.match(/<h3[^>]*>([\s\S]*?)<\/h3>/);
  const p = slice.match(/<p[^>]*>([\s\S]*?)<\/p>/);
  return { head: h3 ? text(h3[1]) : "", note: p ? text(p[1]).slice(0, 220) : "" };
}

// --- transitions -------------------------------------------------------------
// Internal: go('s-x'). External: location.href / href to another prototype file.
function edgesOf(screen) {
  const internal = new Set();
  const external = new Set();
  for (const m of screen.body.matchAll(/go\(\s*['"]([a-z0-9-]+)['"]/gi)) internal.add(m[1]);
  for (const m of screen.body.matchAll(/(?:location\.href\s*=\s*|href=)['"](\.{1,2}\/[^'"]+\.html[^'"]*)['"]/gi)) {
    external.add(decode(m[1]));
  }
  return { internal: [...internal].filter((t) => t !== screen.id), external: [...external] };
}

// --- BFS levels: entry screen first, then how deep you have to tap -----------
function levelize(nodes, edges) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out = new Map(nodes.map((n) => [n.id, []]));
  for (const e of edges) out.get(e.from)?.push(e.to);

  const roots = nodes.filter((n) => n.entry).map((n) => n.id);
  if (!roots.length && nodes.length) roots.push(nodes[0].id);

  const level = new Map(roots.map((id) => [id, 0]));
  let frontier = roots;
  while (frontier.length) {
    const next = [];
    for (const id of frontier) {
      for (const to of out.get(id) || []) {
        if (level.has(to)) continue;
        level.set(to, level.get(id) + 1);
        next.push(to);
      }
    }
    frontier = next;
  }
  // Unreachable screens (orphans) get their own lane at the far right.
  const maxLevel = Math.max(0, ...level.values());
  for (const n of nodes) if (!level.has(n.id)) { level.set(n.id, maxLevel + 1); n.orphan = true; }

  const seen = new Map();
  for (const n of nodes) {
    n.level = level.get(n.id);
    n.order = seen.get(n.level) || 0;
    seen.set(n.level, n.order + 1);
  }
  for (const e of edges) e.back = byId.get(e.to).level <= byId.get(e.from).level;
}

// --- run ---------------------------------------------------------------------
const modules = discover().map((mod) => {
  const file = path.join(protoDir, mod.file);
  const html = fs.readFileSync(file, "utf8");
  const found = screensOf(html);
  const labels = sidebarLabels(html);

  const nodes = found.map((s) => {
    const { internal, external } = edgesOf(s);
    const states = statesFor(mod, s.id);
    const ann = annotationOf(html, s.id);
    // Fingerprint: shoot.mjs re-renders a screen only when this changes, so a
    // rebuild after one edit costs seconds instead of re-rendering everything.
    const hash = crypto.createHash("sha1")
      .update(s.shell).update(s.body).update(JSON.stringify(states))
      .digest("hex").slice(0, 12);
    return {
      id: s.id,
      hash,
      title: labels[s.id] || ann.head || s.title || s.id,
      inApp: s.title,
      status: s.status,
      theme: s.theme,
      entry: s.entry,
      note: ann.note,
      external,
      shots: [
        { file: shotName(mod, s.id), label: "" },
        ...states.map((st) => ({ file: shotName(mod, s.id, st.id), label: st.label })),
      ],
      _internal: internal,
    };
  });

  const ids = new Set(nodes.map((n) => n.id));
  const edges = [];
  for (const n of nodes) for (const to of n._internal) if (ids.has(to)) edges.push({ from: n.id, to });
  for (const n of nodes) delete n._internal;

  levelize(nodes, edges);

  const counts = nodes.reduce((a, n) => ((a[n.status] = (a[n.status] || 0) + 1), a), {});
  console.log(
    `✓ ${mod.label.padEnd(16)} ${nodes.length} screens · ${nodes.reduce((a, n) => a + n.shots.length, 0)} shots · ` +
    `${edges.length} edges (${edges.filter((e) => e.back).length} back) · ` +
    `${nodes.filter((n) => n.orphan).length} orphans · ` +
    Object.entries(counts).map(([k, v]) => `${k}:${v}`).join(" ")
  );

  return { ...mod, screens: nodes, edges };
});

// --- who links here, across files -------------------------------------------
// A screen unreachable inside its own module is usually not an orphan at all —
// it is entered from somewhere else (Client → groups is opened from the clients
// card). Resolve every cross-file href to a real screen so "no entry" means what
// it says, and so a card can show the door you actually come through.
{
  const byFile = new Map(modules.map((m) => [m.file, m]));
  for (const m of modules) {
    const dir = path.posix.dirname(m.file);
    for (const s of m.screens) {
      for (const href of s.external) {
        const [rawPath, rawHash] = href.split("#");
        const target = path.posix.normalize(path.posix.join(dir, rawPath.split("?")[0]));
        const tm = byFile.get(target);
        if (!tm) continue;                                  // hub, or a file off the board
        const id = (rawHash || "").split("?")[0];
        const ts = id ? tm.screens.find((x) => x.id === id) : tm.screens.find((x) => x.entry);
        if (!ts || (tm === m && ts === s)) continue;
        (ts.inFrom = ts.inFrom || []).push({ file: m.file, label: m.label, id: s.id });
      }
    }
  }
  for (const m of modules) for (const s of m.screens) {
    if (s.inFrom) s.inFrom = [...new Map(s.inFrom.map((l) => [l.file, l])).values()];
    // orphan = nothing anywhere leads here, not merely "not reachable in-file"
    if (s.orphan && s.inFrom) delete s.orphan;
  }
}

const covered = modules.filter((m) => m.screens.length);
const empty = modules.filter((m) => !m.screens.length);
if (empty.length) console.log(`\n· not screen files, skipped: ${empty.map((m) => m.file).join(", ")}`);

const allScreens = covered.flatMap((m) => m.screens);
console.log(
  `\n${covered.length} modules · ${allScreens.length} screens · ` +
  `${allScreens.reduce((a, s) => a + s.shots.length, 0)} shots · ` +
  `${allScreens.filter((s) => s.inFrom).length} entered from another file · ` +
  `${allScreens.filter((s) => s.orphan).length} with no way in at all`
);

fs.mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().slice(0, 10);
fs.writeFileSync(
  path.join(outDir, "board-data.js"),
  `// GENERATED by tools/board/extract.mjs — do not edit.\n` +
  `window.FIT_BOARD = ${JSON.stringify({ generated: stamp, modules: covered }, null, 2)};\n`
);
console.log(`\n→ ${path.relative(process.cwd(), path.join(outDir, "board-data.js"))}`);
