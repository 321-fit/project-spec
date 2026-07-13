// Standalone preview server. Run:  node serve.mjs
// Then open the printed URL + /storyboard.html to preview all frames live.
import { startServer, HERE } from "./lib.mjs";

const { url } = await startServer(HERE);
console.log(`\n  321Fit store preview running:`);
console.log(`  → ${url}/storyboard.html   (all frames)`);
console.log(`  → ${url}/frame.html?i=0    (single frame, full size)\n`);
console.log(`  Ctrl+C to stop.`);
