// Coverage + naming, shared by extract.mjs and shoot.mjs so the two can never
// disagree about which files are on the board or what a shot is called.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROLES, EXCLUDE, LABELS, ORDER, STATES, PROTO_ROOT } from "./config.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const protoDir = path.resolve(HERE, PROTO_ROOT);

// Every flows/<role>/*.html, in ROLES order.
export function discover() {
  const out = [];
  for (const role of ROLES) {
    const dir = path.join(protoDir, "flows", role);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir).sort()) {
      if (!name.endsWith(".html")) continue;
      const rel = `flows/${role}/${name}`;
      if (EXCLUDE.includes(rel)) continue;
      const html = fs.readFileSync(path.join(dir, name), "utf8");
      const title = ((html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "")
        .replace(/&amp;/g, "&").replace(/&rsquo;/g, "’").replace(/\s+/g, " ").trim();
      const label = LABELS[rel] || title.replace(/^321Fit\s*[—–-]\s*/, "") || name.replace(/\.html$/, "");
      out.push({ file: rel, label, role, slug: `${role}-${name.replace(/\.html$/, "")}` });
    }
  }
  // Flow order first (sign in → onboard → dashboard → deep), unlisted last.
  const rank = (m) => (ORDER.indexOf(m.file) + 1) || Number.MAX_SAFE_INTEGER;
  out.sort((a, b) =>
    ROLES.indexOf(a.role) - ROLES.indexOf(b.role) ||
    rank(a) - rank(b) ||
    a.file.localeCompare(b.file));

  const unlisted = out.filter((m) => rank(m) === Number.MAX_SAFE_INTEGER);
  if (unlisted.length) {
    console.log(`· not in ORDER, appended to their column: ${unlisted.map((m) => m.file).join(", ")}`);
  }
  return out;
}

// Screen ids are NOT unique across files — s-tz-select lives in three of them —
// so a shot is named after the module too, or one file silently overwrites
// another's screenshots.
export const shotName = (mod, id, stateId) =>
  `${mod.slug}__${id}${stateId ? "__" + stateId : ""}.webp`;

// States may be keyed by bare screen id, or by "file#id" when an id is shared.
export const statesFor = (mod, id) => STATES[`${mod.file}#${id}`] || STATES[id] || [];
