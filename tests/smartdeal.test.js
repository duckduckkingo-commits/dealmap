// Smart Deal Engine contract tests (mirror lib/smartdeal/*.ts logic).
// Run: node --test tests/smartdeal.test.js
const { test, describe } = require("node:test");
const assert = require("node:assert");

const FACTOR_KEYS = ["priceVsMarket", "savings", "history", "condition", "warranty", "age", "specs", "ramStorage", "availability", "store", "returns", "region", "costs", "ratings"];
const DEFAULTS = { priceVsMarket: 25, savings: 10, history: 10, condition: 10, warranty: 8, age: 7, specs: 8, ramStorage: 5, availability: 4, store: 6, returns: 3, region: 2, costs: 1, ratings: 1 };

function verdictFor(score) {
  if (score >= 90) return "Excellent Deal";
  if (score >= 75) return "Good Deal";
  if (score >= 55) return "Fair Price";
  if (score >= 35) return "Expensive";
  return "Very Expensive";
}

// Mirror of computeSmartScore() core math.
function scoreOf(factors, weights = DEFAULTS) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let weighted = 0, known = 0;
  const unknown = [];
  for (const k of FACTOR_KEYS) {
    const w = (weights[k] ?? 0) / total;
    const v = factors[k];
    if (v === null || v === undefined) { weighted += 0.5 * w; unknown.push(k); }
    else { weighted += v * w; known += w; }
  }
  let score = Math.round(weighted * 100);
  const coverage = known;
  let capped = false;
  // Thin evidence can never look good OR bad: capped, Fair, CONSIDER.
  if (coverage < 0.4 && score > 60) { score = 60; capped = true; }
  const verdict = coverage < 0.4 ? "Fair Price" : verdictFor(score);
  const recommendation = coverage < 0.4 ? "CONSIDER" : verdict;
  return { score, coverage, capped, unknown, verdict, recommendation };
}

describe("smartdeal: weights sum to 100", () => {
  test("14 default factors total 100", () => {
    assert.equal(FACTOR_KEYS.length, 14);
    assert.equal(Object.values(DEFAULTS).reduce((a, b) => a + b, 0), 100);
  });
});

describe("smartdeal: verdict thresholds (same scale as classic engine)", () => {
  test("90+ excellent, 75+ good, 55+ fair, 35+ expensive, below very expensive", () => {
    assert.equal(verdictFor(95), "Excellent Deal");
    assert.equal(verdictFor(80), "Good Deal");
    assert.equal(verdictFor(60), "Fair Price");
    assert.equal(verdictFor(40), "Expensive");
    assert.equal(verdictFor(20), "Very Expensive");
  });
});

describe("smartdeal: unknown evidence stays neutral and disclosed", () => {
  test("all-unknown scores 50 with full unknown list", () => {
    const r = scoreOf(Object.fromEntries(FACTOR_KEYS.map((k) => [k, null])));
    assert.equal(r.score, 50);
    assert.equal(r.unknown.length, 14);
  });
  test("thin evidence reads Fair/CONSIDER, never good or bad", () => {
    const factors = Object.fromEntries(FACTOR_KEYS.map((k) => [k, null]));
    factors.priceVsMarket = 1; // weight 25 only -> coverage 0.25
    const r = scoreOf(factors);
    assert.ok(r.coverage < 0.4);
    assert.ok(r.score <= 60);
    assert.equal(r.verdict, "Fair Price");
    assert.equal(r.recommendation, "CONSIDER");
    assert.ok(r.capped);
  });
  test("strong full evidence reaches Excellent", () => {
    const r = scoreOf(Object.fromEntries(FACTOR_KEYS.map((k) => [k, 0.95])));
    assert.ok(r.score >= 90, "got " + r.score);
  });
  test("price alone cannot decide: terrible non-price factors drag a cheap price down", () => {
    const factors = Object.fromEntries(FACTOR_KEYS.map((k) => [k, 0.8]));
    factors.priceVsMarket = 1; factors.savings = 1;
    factors.condition = 0.1; factors.warranty = 0.1; factors.store = 0.1;
    const r = scoreOf(factors);
    assert.ok(r.score < 75, "cheap but risky must not be Good+, got " + r.score);
  });
});
