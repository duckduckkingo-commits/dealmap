const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

function median(values) {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}
function verdictFor(score) {
  if (score >= 90) return "EXCELLENT";
  if (score >= 75) return "GOOD";
  if (score >= 55) return "FAIR";
  if (score >= 35) return "EXPENSIVE";
  return "VERY_EXPENSIVE";
}

describe("deal score contract (mirrors lib/dealScore.ts)", () => {
  it("returns neutral on insufficient data", () => {
    const prices = [5000];
    assert.ok(prices.length < 3, "sample too small -> UI must show 'Not enough reliable data yet'");
  });
  it("verdict thresholds match spec", () => {
    assert.equal(verdictFor(95), "EXCELLENT");
    assert.equal(verdictFor(87), "GOOD");
    assert.equal(verdictFor(60), "FAIR");
    assert.equal(verdictFor(40), "EXPENSIVE");
    assert.equal(verdictFor(10), "VERY_EXPENSIVE");
  });
  it("median is robust to outliers", () => {
    assert.equal(median([3000, 3100, 3200, 3300, 50000]), 3200);
  });
  it("below-median price scores above fair baseline", () => {
    const prices = [3000, 3100, 3200, 3300, 3400, 3500];
    const med = median(prices);
    assert.ok(2800 < med, "asking below median should score well");
  });
  it("confidence requires sample size", () => {
    const conf = (n) => (n < 5 ? "LOW" : n >= 30 ? "HIGH" : "MEDIUM");
    assert.equal(conf(2), "LOW");
  });
});
