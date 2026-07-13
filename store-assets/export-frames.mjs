// Render final store screenshots → export/<NN>-<id>.png  (1290×2796, App Store 6.9")
// Also writes Google Play copies if PLAY=1 (downscaled to 1080 wide).
import puppeteer from "puppeteer-core";
import path from "node:path";
import { CHROME_PATH, HERE, startServer } from "./lib.mjs";
import { FRAMES, RENDER } from "./config.js";

const only = process.argv.slice(2);
const OUT = path.join(HERE, "export");

const { url, close } = await startServer(HERE);
const browser = await puppeteer.launch({
  executablePath: CHROME_PATH,
  headless: "new",
  args: ["--force-color-profile=srgb"],
});

let n = 0;
for (let i = 0; i < FRAMES.length; i++) {
  const frame = FRAMES[i];
  if (only.length && !only.includes(frame.id)) continue;
  const page = await browser.newPage();
  await page.setViewport({ width: RENDER.W, height: RENDER.H, deviceScaleFactor: 1 });
  await page.goto(`${url}/frame.html?i=${i}`, { waitUntil: "networkidle0" });
  await page.waitForFunction("window.__frameReady === true", { timeout: 15000 }).catch(() => {});
  const num = String(i + 1).padStart(2, "0");
  const out = path.join(OUT, `${num}-${frame.id}.png`);
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: RENDER.W, height: RENDER.H } });
  console.log(`✓ ${path.basename(out)}`);
  n++;
  await page.close();
}

await browser.close();
await close();
console.log(`\nExported ${n} frame(s) → export/`);
