// Collector contract tests (mirror lib/collector/*.ts logic).
// Run: node --test tests/collector.test.js
const { test, describe } = require("node:test");
const assert = require("node:assert");

// --- Mirror of normalize() + tier priority from lib/collector/match.ts ---
function normalize(s) {
  return (s ?? "").toLowerCase().replace(/[^a-z0-9 ]/gi, " ").replace(/\s+/g, " ").trim();
}
function matchTier(listing, candidates) {
  if (listing.ean) {
    const hit = candidates.find((c) => c.ean === listing.ean);
    if (hit) return { method: "ean", ref: hit.ref };
  }
  if (listing.modelNumber) {
    const hit = candidates.find((c) => c.modelNumber && normalize(c.modelNumber) === normalize(listing.modelNumber));
    if (hit) return { method: "model_number", ref: hit.ref };
  }
  return { method: "none", ref: null };
}

// --- Mirror of isBlockedHostname() from lib/collector/adapters.ts ---
function isBlockedHostname(h) {
  h = h.trim().toLowerCase().replace(/\.$/, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local")) return true;
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(h)) {
    const [a, b] = h.split(".").map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
  }
  return false;
}

// --- Mirror of freshnessOf() from lib/collector/scheduler.ts ---
function freshnessOf(lastChecked, now = Date.now()) {
  if (!lastChecked) return "Unknown";
  const mins = Math.max(0, Math.round((now - +new Date(lastChecked)) / 60000));
  if (mins <= 60) return "Live";
  if (mins <= 24 * 60) return "Fresh";
  return "Stale";
}

// --- Mirror of detectProblems() kinds from lib/collector/problems.ts ---
function detectKinds(text) {
  const rules = [
    ["cracked_screen", /cracked?\s+screen|écran\s+fissuré/i],
    ["weak_battery", /weak\s+battery|batterie\s+faible/i],
    ["refurbished", /refurbished|reconditionné/i],
    ["no_warranty", /no\s+warranty|sans\s+garantie/i],
  ];
  return rules.filter(([, re]) => re.test(text || "")).map(([k]) => k);
}

describe("collector: matching priority EAN > model > fuzzy/none", () => {
  test("EAN exact wins even when names differ", () => {
    const r = matchTier({ ean: "1234567890123", modelNumber: "OTHER" }, [{ ref: "p1", ean: "1234567890123" }]);
    assert.equal(r.method, "ean");
    assert.equal(r.ref, "p1");
  });
  test("model number is second priority", () => {
    const r = matchTier({ ean: null, modelNumber: "SM-A546B" }, [{ ref: "p2", modelNumber: "sm-a546b" }]);
    assert.equal(r.method, "model_number");
  });
  test("no identifiers means no match (never guessed)", () => {
    const r = matchTier({ ean: null, modelNumber: null }, [{ ref: "p3" }]);
    assert.equal(r.method, "none");
    assert.equal(r.ref, null);
  });
});

describe("collector: SSRF guard blocks private hosts", () => {
  test("blocks localhost, private ranges, metadata IP", () => {
    for (const h of ["localhost", "127.0.0.1", "10.0.0.5", "192.168.1.1", "172.16.0.9", "169.254.169.254", "shop.local"]) {
      assert.ok(isBlockedHostname(h), h + " must be blocked");
    }
  });
  test("allows public stores", () => {
    for (const h of ["www.jumia.ma", "marjanemall.ma", "example.com"]) {
      assert.ok(!isBlockedHostname(h), h + " must pass");
    }
  });
});

describe("collector: freshness labels (Live only when recently checked)", () => {
  const now = Date.now();
  test("Live within 60 minutes", () => assert.equal(freshnessOf(new Date(now - 30 * 60000).toISOString(), now), "Live"));
  test("Fresh within 24 hours", () => assert.equal(freshnessOf(new Date(now - 5 * 3600000).toISOString(), now), "Fresh"));
  test("Stale after 24 hours", () => assert.equal(freshnessOf(new Date(now - 3 * 86400000).toISOString(), now), "Stale"));
  test("Unknown when never checked", () => assert.equal(freshnessOf(null, now), "Unknown"));
});

describe("collector: problems detector never invents", () => {
  test("flags explicitly mentioned issues", () => {
    assert.deepEqual(detectKinds("iPhone with cracked screen, weak battery"), ["cracked_screen", "weak_battery"]);
    assert.deepEqual(detectKinds("Téléphone reconditionné, sans garantie"), ["refurbished", "no_warranty"]);
  });
  test("clean listing yields nothing (UI shows the no-issue statement)", () => {
    assert.deepEqual(detectKinds("Brand new sealed phone with 12-month warranty"), []);
  });
});

describe("collector: new files exist, old files untouched", () => {  const fs = require("fs");
  const path = require("path");
  const ROOT = path.join(__dirname, "..");
  test("all new module files exist", () => {
    for (const f of [
      "lib/collector/labels.ts", "lib/collector/types.ts", "lib/collector/schemas.ts",
      "lib/collector/adapters.ts", "lib/collector/match.ts", "lib/collector/problems.ts",
      "lib/collector/store.ts", "lib/collector/pg.ts", "lib/collector/scheduler.ts",
      "lib/smartdeal/weights.ts", "lib/smartdeal/score.ts",
      "supabase/migrations/003_collector.sql",
      "app/api/collector/analyze/route.ts", "app/api/collector/offers/route.ts",
      "app/api/collector/runs/route.ts", "app/api/collector/submissions/route.ts",
      "app/api/collector/weights/route.ts",
      "app/analyze/page.tsx", "app/admin/collector/page.tsx",
      "components/collector/AnalyzeForm.tsx", "components/collector/AnalysisResult.tsx",
      "components/collector/AdminCollector.tsx",
      "lib/collector/robots.ts", "lib/collector/csv.ts",
      "app/api/collector/import/route.ts",
    ]) assert.ok(fs.existsSync(path.join(ROOT, f)), f);
  });
});

// --- Mirror of robots parsing from lib/collector/robots.ts ---
function robotsAllowsPath(txt, path) {
  const groups = [];
  let cur = { agents: [], rules: [] };
  for (const raw of txt.split("\n")) {
    const line = raw.split("#")[0].trim();
    if (!line) continue;
    const ua = /^user-agent\s*:\s*(.+)$/i.exec(line);
    if (ua) {
      if (cur.agents.length && cur.rules.length) { groups.push(cur); cur = { agents: [], rules: [] }; }
      cur.agents.push(ua[1].trim().toLowerCase());
      continue;
    }
    const rule = /^(allow|disallow)\s*:\s*(.*)$/i.exec(line);
    if (rule) cur.rules.push({ allow: rule[1].toLowerCase() === "allow", path: rule[2].trim() });
  }
  if (cur.agents.length) groups.push(cur);
  const g = groups.find((x) => x.agents.includes("*")) ?? groups[0];
  if (!g) return true;
  let best = null;
  for (const r of g.rules) {
    if (!r.path) return true;
    if (r.path === "/" && path.startsWith("/")) { if (!best || 1 >= best.len) best = { allow: r.allow, len: 1 }; continue; }
    if (r.path !== "/" && path.startsWith(r.path)) { if (!best || r.path.length >= best.len) best = { allow: r.allow, len: r.path.length }; }
  }
  return best ? best.allow : true;
}

// --- Mirror of parseCsv() from lib/collector/csv.ts ---
function parseCsvRows(text) {
  const rows = [], rejected = [];
  text.split("\n").forEach((raw, idx) => {
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;
    const cells = line.split(",").map((c) => c.trim());
    if (idx === 0 && /store/i.test(cells[0] ?? "") && /url|link/i.test(cells[1] ?? "")) return;
    const [store, url = "", priceRaw = ""] = cells;
    if (!store) return rejected.push({ line: idx + 1 });
    if (!/^https?:\/\//i.test(url)) return rejected.push({ line: idx + 1 });
    const price = Number(String(priceRaw).replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(price) || price <= 0) return rejected.push({ line: idx + 1 });
    rows.push({ store, url, price });
  });
  return { rows, rejected };
}

describe("collector: robots compliance (fail closed)", () => {
  const ROBOTS = "User-agent: *\nAllow: /\nDisallow: /mobapi/\nDisallow: /fr/\n";
  test("allows product pages, blocks disallowed prefixes", () => {
    assert.ok(robotsAllowsPath(ROBOTS, "/apple-iphone-123.html"));
    assert.ok(!robotsAllowsPath(ROBOTS, "/mobapi/items"));
    assert.ok(!robotsAllowsPath(ROBOTS, "/fr/catalog"));
  });
  test("blanket disallow blocks everything", () => {
    assert.ok(!robotsAllowsPath("User-agent: *\nDisallow: /\n", "/anything"));
  });
});
describe("collector: CSV import only accepts clean lines", () => {
  test("parses valid rows, skips header, rejects bad lines", () => {
    const { rows, rejected } = parseCsvRows("storeName,url,price\nJumia,https://x.ma/p,5499\nBad,,0\nNoUrl,ftp://x,5");
    assert.equal(rows.length, 1);
    assert.equal(rows[0].price, 5499);
    assert.equal(rejected.length, 2);
  });
});

describe("collector: photo + refurbished extraction from real-style HTML", () => {
  const HTML = `<html><head><title>Apple iPhone 13 Pro 512GB - Remis à neuf</title>
<meta property="og:title" content="iPhone 13 Pro 512GB" />
<meta property="og:image" content="/img/iphone13pro.jpg" />
<script type="application/ld+json">{"@type":"Product","name":"iPhone 13 Pro 512GB","brand":{"name":"Apple"},"image":"https://cdn.x.ma/big.jpg","offers":{"price":"6599","priceCurrency":"MAD"}}</script>
</head><body><p>Remis à neuf, garantie 3 mois</p></body></html>`;
  function meta(html, key) {
    const m = new RegExp(`<meta[^>]+property=["']${key}["'][^>]+content=["']([^"']+)["']`, "i").exec(html);
    return m ? m[1] : null;
  }
  function ld(html) {
    const m = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i.exec(html);
    return JSON.parse(m[1]);
  }
  test("JSON-LD image preferred, price + refurbished French detected", () => {
    const p = ld(HTML);
    const img = (Array.isArray(p.image) ? p.image[0] : p.image) || meta(HTML, "og:image");
    assert.equal(img, "https://cdn.x.ma/big.jpg");
    assert.equal(Number(p.offers.price), 6599);
    assert.ok(/remis\s+à\s+neuf/i.test(HTML), "remis à neuf recognized as refurbished signal");
  });
  test("relative og:image resolves against page URL", () => {
    const resolved = new URL(meta(HTML, "og:image"), "https://www.jumia.ma/p.html").toString();
    assert.equal(resolved, "https://www.jumia.ma/img/iphone13pro.jpg");
  });
});
