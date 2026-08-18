// Render every screen (and every declared state) → prototypes/board/shots/*.webp
// One fresh page load per shot, so a state toggle can never leak into the next.
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PROTO_ROOT, OUT_ROOT, SHOT } from "./config.js";
import { discover, protoDir, shotName, statesFor } from "./modules.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const shotsDir = path.resolve(HERE, OUT_ROOT, "shots");
const CHROME_PATH =
  process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const argv = process.argv.slice(2);
const force = argv.includes("--force");
const only = argv.filter((a) => !a.startsWith("--")); // optional: node shoot.mjs s-group-detail

fs.mkdirSync(shotsDir, { recursive: true });

// Incremental build. extract.mjs fingerprints every screen (its own markup +
// the file's shared shell + its state config), so editing one screen re-renders
// that screen, editing shared CSS re-renders the module, and everything else is
// left alone. `--force` ignores the manifest.
const manifestPath = path.join(shotsDir, ".manifest.json");
let manifest = {};
if (!force) {
  try { manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")); } catch (e) {}
}
const saveManifest = () => fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

let board = { modules: [] };
try {
  const src = fs.readFileSync(path.resolve(HERE, OUT_ROOT, "board-data.js"), "utf8");
  board = JSON.parse(src.slice(src.indexOf("{"), src.lastIndexOf("}") + 1));
} catch (e) {
  console.warn("⚠︎  no board-data.js — run `node extract.mjs` first for incremental builds");
}
const screenOf = (file, id) =>
  (board.modules.find((m) => m.file === file) || { screens: [] }).screens.find((s) => s.id === id);

const browser = await puppeteer.launch({
  executablePath: CHROME_PATH,
  headless: "new",
  args: ["--allow-file-access-from-files", "--force-color-profile=srgb", "--hide-scrollbars"],
});

// Make one `.fit-phone` the only visible screen and strip the bezel — the board
// draws its own rounding, so the shot must be edge-to-edge.
const activate = (screenId) => {
  const phones = Array.from(document.querySelectorAll(".fit-phone"));
  const target = document.getElementById(screenId);
  if (!target) throw new Error("no such screen: " + screenId);
  phones.forEach((p) => p.classList.remove("active"));
  target.classList.add("active");
  const style = document.createElement("style");
  // NB: never touch the phone's `position` — sheets, drawers and context menus
  // are absolutely positioned *inside* it; making it static throws them onto the
  // page and the shot comes out double-exposed.
  style.textContent =
    ".sidebar,.ann-container{display:none!important}" +
    "body{padding:0!important;min-width:0!important;display:block!important}" +
    ".fit-phone.active{border:none!important;border-radius:0!important;box-shadow:none!important;margin:0!important}";
  document.head.appendChild(style);
  target.scrollTop = 0;
  const c = target.querySelector(".fit-phone-content");
  if (c) c.scrollTop = 0;
};

let n = 0, skipped = 0;
for (const mod of discover()) {
  const file = path.join(protoDir, mod.file);
  if (!fs.existsSync(file)) { console.warn(`⚠︎  missing: ${mod.file}`); continue; }

  const html = fs.readFileSync(file, "utf8");
  const ids = [...html.matchAll(/<div\s+[^>]*class="([^"]*)"[^>]*id="([a-z0-9-]+)"/gi)]
    .filter((m) => m[1].split(/\s+/).includes("fit-phone"))
    .map((m) => m[2]);

  for (const id of ids) {
    if (only.length && !only.includes(id)) continue;
    const shots = [{ id: null, label: "", run: null }, ...statesFor(mod, id)];
    const outName = (shot) => shotName(mod, id, shot.id);

    const known = screenOf(mod.file, id);
    const key = mod.file + '#' + id;
    if (!only.length && known && manifest[key] === known.hash &&
        shots.every((shot) => fs.existsSync(path.join(shotsDir, outName(shot))))) {
      skipped++;
      continue;
    }

    for (const shot of shots) {
      const page = await browser.newPage();
      await page.setViewport({
        width: SHOT.width, height: SHOT.height, deviceScaleFactor: SHOT.scale,
      });
      await page.goto("file://" + file, { waitUntil: "networkidle0" });
      await page.evaluate(activate, id);
      if (shot.run) {
        await page.evaluate(shot.run);
        // a state change may re-activate another screen (e.g. cgPublish) — pin it back
        await page.evaluate(activate, id);
        await new Promise((r) => setTimeout(r, shot.wait || 250));
      }
      await new Promise((r) => setTimeout(r, 250)); // fonts / layout settle
      const el = await page.$(".fit-phone.active");
      const out = path.join(shotsDir, outName(shot));
      await el.screenshot({ path: out, type: "webp", quality: SHOT.quality });
      await page.close();
      n++;
      console.log(`✓ ${path.basename(out)}`);
    }
    // Claim "up to date" only after every shot of this screen landed.
    if (!only.length && known) { manifest[key] = known.hash; saveManifest(); }
  }
}

await browser.close();
const kb = fs.readdirSync(shotsDir)
  .filter((f) => f.endsWith(".webp"))
  .reduce((a, f) => a + fs.statSync(path.join(shotsDir, f)).size, 0) / 1024;
console.log(
  `\n${n} shot${n === 1 ? "" : "s"} rendered` +
  (skipped ? `, ${skipped} screen${skipped === 1 ? "" : "s"} unchanged` : "") +
  ` · ${Math.round(kb)} KB on disk → prototypes/board/shots/`
);
