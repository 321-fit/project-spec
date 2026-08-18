// Render every screen (and every declared state) → prototypes/board/shots/*.webp
// One fresh page load per shot, so a state toggle can never leak into the next.
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MODULES, STATES, PROTO_ROOT, OUT_ROOT, SHOT } from "./config.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const protoDir = path.resolve(HERE, PROTO_ROOT);
const shotsDir = path.resolve(HERE, OUT_ROOT, "shots");
const CHROME_PATH =
  process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const only = process.argv.slice(2); // optional: node shoot.mjs s-group-detail

fs.mkdirSync(shotsDir, { recursive: true });

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

let n = 0;
for (const mod of MODULES) {
  const file = path.join(protoDir, mod.file);
  if (!fs.existsSync(file)) { console.warn(`⚠︎  missing: ${mod.file}`); continue; }
  const html = fs.readFileSync(file, "utf8");
  const ids = [...html.matchAll(/<div\s+[^>]*class="([^"]*)"[^>]*id="([a-z0-9-]+)"/gi)]
    .filter((m) => m[1].split(/\s+/).includes("fit-phone"))
    .map((m) => m[2]);

  for (const id of ids) {
    if (only.length && !only.includes(id)) continue;
    const shots = [{ id: null, label: "", run: null }, ...(STATES[id] || [])];

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
      const out = path.join(shotsDir, shot.id ? `${id}__${shot.id}.webp` : `${id}.webp`);
      await el.screenshot({ path: out, type: "webp", quality: SHOT.quality });
      await page.close();
      n++;
      console.log(`✓ ${path.basename(out)}`);
    }
  }
}

await browser.close();
const kb = fs.readdirSync(shotsDir).reduce((a, f) => a + fs.statSync(path.join(shotsDir, f)).size, 0) / 1024;
console.log(`\n${n} shots · ${Math.round(kb)} KB total → prototypes/board/shots/`);
