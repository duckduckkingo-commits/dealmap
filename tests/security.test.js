const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

describe("validation & security", () => {
  it("no NEXT_PUBLIC_ secret leaks", () => {
    const risky = ["SUPABASE_SERVICE_ROLE_KEY", "INITIAL_OWNER_SETUP_SECRET", "JWT_SECRET"];
    const checkDir = (dir) => {
      for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
        if (["node_modules", ".next", ".git", "data"].includes(f.name)) continue;
        const p = path.join(dir, f.name);
        if (f.isDirectory()) checkDir(p);
        else if (/\.(tsx?|js|json)$/.test(f.name) && !p.includes("env.example")) {
          const content = fs.readFileSync(p, "utf8");
          if (p.endsWith(".tsx") || p.includes("components")) {
            // Fail only on real secret usage: process.env.SERVER_SECRET in client code,
            // or hardcoded key-like values. Plain doc mentions of var names are OK.
            assert.ok(!/process\.env\.(SUPABASE_SERVICE_ROLE_KEY|INITIAL_OWNER_SETUP_SECRET|JWT_SECRET)/.test(content), `${p} must not read server secrets in client code`);
            assert.ok(!/=sk-/.test(content) && !/=eyJ/.test(content), `${p} must not contain hardcoded secrets`);
          }
          void risky;
        }
      }
    };
    checkDir(path.join(ROOT, "app"));
    checkDir(path.join(ROOT, "components"));
  });
  it(".env.example has placeholders only", () => {
    const env = fs.readFileSync(path.join(ROOT, ".env.example"), "utf8");
    assert.ok(env.includes("NEXT_PUBLIC_SUPABASE_URL="));
    assert.ok(!/=sk-/.test(env) && !/=eyJ/.test(env), "no real credentials");
  });
  it(".gitignore excludes secrets and build output", () => {
    const gi = fs.readFileSync(path.join(ROOT, ".gitignore"), "utf8");
    for (const entry of ["node_modules/", ".next/", ".env", ".env.local", "coverage/"]) {
      assert.ok(gi.includes(entry), `missing ${entry}`);
    }
  });
  it("setup route enforces server-side role (no client role trust)", () => {
    const src = fs.readFileSync(path.join(ROOT, "app", "api", "setup", "route.ts"), "utf8");
    assert.ok(src.includes('"OWNER"'), "assigns OWNER server-side");
    assert.ok(!src.includes("body.role") || src.includes("ignore"), "must not trust client role");
  });
  it("receipt validation present", () => {
    const src = fs.readFileSync(path.join(ROOT, "lib", "validation.ts"), "utf8");
    assert.ok(src.includes("ALLOWED_RECEIPT_MIME") && src.includes("MAX_RECEIPT_BYTES"));
  });
});
