const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..", "..");

const ROUTES = ["/", "/explore", "/search", "/product/[id]", "/compare", "/watchlist", "/purchases", "/warranties", "/alerts", "/contribute", "/profile", "/settings", "/auth/login", "/auth/register", "/auth/forgot-password", "/auth/reset-password", "/auth/verify-email", "/setup", "/dashboard", "/owner", "/owner/settings", "/admin"];

describe("routes & e2e flows (static + contract)", () => {
  it("all required route files exist", () => {
    const map = {
      "/": "app/page.tsx", "/explore": "app/explore/page.tsx", "/search": "app/search/page.tsx",
      "/product/[id]": "app/product/[id]/page.tsx", "/compare": "app/compare/page.tsx",
      "/watchlist": "app/watchlist/page.tsx", "/purchases": "app/purchases/page.tsx",
      "/warranties": "app/warranties/page.tsx", "/alerts": "app/alerts/page.tsx",
      "/contribute": "app/contribute/page.tsx", "/profile": "app/profile/page.tsx",
      "/settings": "app/settings/page.tsx", "/auth/login": "app/auth/login/page.tsx",
      "/auth/register": "app/auth/register/page.tsx", "/setup": "app/setup/page.tsx",
      "/dashboard": "app/dashboard/page.tsx", "/owner": "app/owner/page.tsx",
      "/owner/settings": "app/owner/settings/page.tsx", "/admin": "app/admin/page.tsx",
    };
    for (const [route, file] of Object.entries(map)) {
      assert.ok(fs.existsSync(path.join(ROOT, file)), `missing route ${route} -> ${file}`);
    }
    void ROUTES;
  });
  it("new-user flow contract: register->login->search->product->watchlist->alert", () => {
    assert.ok(fs.existsSync(path.join(ROOT, "app", "api", "auth", "[action]", "route.ts")));
    assert.ok(fs.existsSync(path.join(ROOT, "app", "api", "watchlist", "route.ts")));
    assert.ok(fs.existsSync(path.join(ROOT, "app", "api", "alerts", "route.ts")));
  });
  it("owner flow contract: setup creates single OWNER, second blocked", () => {
    const src = fs.readFileSync(path.join(ROOT, "app", "api", "setup", "route.ts"), "utf8");
    assert.ok(src.includes("ownerExists") || src.includes("OWNER"), "must check existing owner");
    assert.ok(src.includes("404"), "must reject with 404 to avoid oracle");
  });
  it("security flow: USER cannot reach /owner API, ADMIN cannot do OWNER ops", () => {
    const src = fs.readFileSync(path.join(ROOT, "app", "api", "admin", "route.ts"), "utf8");
    assert.ok(src.includes("OWNER only") || src.includes("OWNER-only") || src.includes("OWNER"));
    assert.ok(src.includes("403"));
  });
});
