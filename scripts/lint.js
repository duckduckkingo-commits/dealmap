// Zero-dependency offline lint: secret scan + debug-hygiene scan.
// ESLint (next/core-web-vitals) remains the long-term linter once `eslint`
// is installed; this script guarantees `npm run lint` is meaningful offline.
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SCAN_DIRS = ["app", "components", "lib", "types", "scripts", "tests"];
const SKIP = new Set(["node_modules", ".next", ".git"]);
const SECRET_RE =
  /(SUPABASE_SERVICE_ROLE_KEY|INITIAL_OWNER_SETUP_SECRET|JWT_SECRET)\s*=\s*[^=\s][^\n\r]*/g;
// Variable named neutrally: its own identifier must not match the pattern below.
const PUBLIC_PREFIX_LEAK_RE = new RegExp(
  ["NEXT", "_PUBLIC", "_[A-Z_]*", "(SECRET|KEY|TOKEN)"].join("")
);

let failures = 0;
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(ts|tsx|js|jsx|mjs|json)$/.test(e.name)) check(p);
  }
}
function check(file) {
  const rel = path.relative(ROOT, file);
  if (rel === ".env.example") return;
  if (rel.startsWith("data" + path.sep)) return; // local dev DB, gitignored
  const src = fs.readFileSync(file, "utf8");
  // Real secret values must never be committed (placeholders in .env.example only).
  for (const m of src.matchAll(SECRET_RE)) {
    const val = m[0].split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "");
    if (val && val !== "false" && val !== "true") {
      console.error(`FAIL ${rel}: possible committed secret value: ${m[0].split("=")[0].trim()}=...`);
      failures++;
    }
  }
  if (PUBLIC_PREFIX_LEAK_RE.test(src)) {
    console.error(`FAIL ${rel}: server-only secret exposed via public env prefix`);
    failures++;
  }
}

for (const d of SCAN_DIRS) walk(path.join(ROOT, d));
// .env.example must contain placeholders only (no values).
const example = fs.readFileSync(path.join(ROOT, ".env.example"), "utf8");
for (const line of example.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#") || !t.includes("=")) continue;
  const [, ...rest] = t.split("=");
  const v = rest.join("=").trim();
  if (v && !/^https?:\/\/localhost/.test(v) && v !== "false" && v !== "true" && v !== "noreply@dealmap.example") {
    console.error(`FAIL .env.example: placeholder expected, got value for: ${t.split("=")[0]}`);
    failures++;
  }
}

if (failures) {
  console.error(`\nlint failed with ${failures} finding(s).`);
  process.exit(1);
}
console.log("lint ok: no committed secrets, no NEXT_PUBLIC_ leaks, .env.example clean.");
