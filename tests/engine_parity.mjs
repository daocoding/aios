// Prints the Cloudflare (JS, no-eval) engine's results for every tool's sample rows + an empty row.
import { computeRow } from "../cloudflare/lib/engine.js";
import spec from "../cloudflare/lib/spec.js";
const out = {}; for (const t of spec.tools) out[t.id] = [...(t.sample || []), {}].map(r => computeRow(t, r));
console.log(JSON.stringify(out));
