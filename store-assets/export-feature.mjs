// Render the Google Play feature graphic → export/feature-graphic.{png,jpg} (1024×500).
// Copy lives in config.js → FEATURE. Run: node export-feature.mjs
//
// Two formats on purpose: Play requires "PNG or JPEG, no alpha channel". A headless
// screenshot always carries an alpha channel even when fully opaque, so the JPEG is
// the safe upload and the PNG is kept for further editing.
import puppeteer from "puppeteer-core";
import path from "node:path";
import { CHROME_PATH, HERE, startServer } from "./lib.mjs";
import { FEATURE } from "./config.js";

const OUT = path.join(HERE, "export");

const { url, close } = await startServer(HERE);
const browser = await puppeteer.launch({
  executablePath: CHROME_PATH,
  headless: "new",
  args: ["--force-color-profile=srgb"],
});

const page = await browser.newPage();
await page.setViewport({ width: FEATURE.W, height: FEATURE.H, deviceScaleFactor: 1 });
await page.goto(`${url}/feature-graphic.html`, { waitUntil: "networkidle0" });
await page.waitForFunction("window.__fgReady === true", { timeout: 15000 }).catch(() => {});

const clip = { x: 0, y: 0, width: FEATURE.W, height: FEATURE.H };
await page.screenshot({ path: path.join(OUT, "feature-graphic.png"), clip });
await page.screenshot({ path: path.join(OUT, "feature-graphic.jpg"), clip, type: "jpeg", quality: 95 });

console.log("✓ feature-graphic.png");
console.log("✓ feature-graphic.jpg  ← upload this one (no alpha channel)");

await page.close();
await browser.close();
await close();
