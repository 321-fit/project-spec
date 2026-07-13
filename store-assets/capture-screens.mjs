// Capture clean app screens from the prototypes → screens/<id>.png
// Strips the phone bezel (border + radius) so the shot sits edge-to-edge in a frame.
import puppeteer from "puppeteer-core";
import path from "node:path";
import fs from "node:fs";
import { CHROME_PATH, HERE } from "./lib.mjs";
import { FRAMES, PROTO_ROOT } from "./config.js";

const OUT = path.join(HERE, "screens");
const SCALE = 3; // 390×844 → 1170×2532 source, downscaled crisp into the frame

const only = process.argv.slice(2); // optional: node capture-screens.mjs search voice

const browser = await puppeteer.launch({
  executablePath: CHROME_PATH,
  headless: "new",
  args: ["--allow-file-access-from-files", "--force-color-profile=srgb"],
});

for (const frame of FRAMES) {
  if (only.length && !only.includes(frame.id)) continue;
  const file = path.resolve(HERE, PROTO_ROOT, frame.file);
  if (!fs.existsSync(file)) { console.warn(`⚠︎  missing prototype: ${frame.file}`); continue; }

  const page = await browser.newPage();
  await page.setViewport({ width: 430, height: 932, deviceScaleFactor: SCALE });
  await page.goto("file://" + file, { waitUntil: "networkidle0" });

  // Force the right screen active + theme, and strip the bezel.
  await page.evaluate((screenId, theme) => {
    const phones = Array.from(document.querySelectorAll(".fit-phone"));
    let target = screenId ? document.getElementById(screenId) : null;
    if (!target) target = phones.find(p => p.classList.contains("active")) || phones[0];
    phones.forEach(p => p.classList.remove("active"));
    target.classList.add("active");
    target.classList.remove("fit-light", "fit-dark");
    target.classList.add(theme === "dark" ? "fit-dark" : "fit-light");
    const style = document.createElement("style");
    style.textContent =
      ".fit-phone.active{border:none!important;border-radius:0!important;box-shadow:none!important;}" +
      // hide prototype-only dev annotations (message-type tags) from marketing shots
      ".fit-phone.active .tag{display:none!important;}";
    document.head.appendChild(style);
    target.scrollTop = 0;
    const c = target.querySelector(".fit-phone-content");
    if (c) c.scrollTop = 0;
  }, frame.screenId || null, frame.theme);

  // Per-frame content tweaks (inject real photos, trim sections, etc).
  if (frame.injectJS) {
    const facesDir = "file://" + path.join(HERE, "assets", "faces");
    await page.evaluate((dir) => { window.__facesDir = dir; }, facesDir);
    await page.evaluate(frame.injectJS);
  }

  await new Promise(r => setTimeout(r, 300)); // let fonts / images / layout settle
  const el = await page.$(".fit-phone.active");
  const out = path.join(OUT, (frame.shot || frame.id) + ".png");
  await el.screenshot({ path: out });
  console.log(`✓ ${frame.id.padEnd(16)} ← ${frame.file}`);
  await page.close();
}

await browser.close();
console.log("\nDone. Screens in screens/. Now: node export-frames.mjs");
