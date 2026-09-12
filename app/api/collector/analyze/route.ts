// POST /api/collector/analyze — "Analyze a Product Link".
// New route. Reuses: zod validation, rate limiting, audit, existing market
// engine (read-only), collector store. Modifies nothing existing.
import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { rateLimit, clientKey } from "@/lib/rateLimit";
import { allProducts, observationsFor } from "@/lib/products";
import { marketStats } from "@/lib/market";
import { dealScoreEngine } from "@/lib/dealScore";
import { extractListing, isBlockedHostname } from "@/lib/collector/adapters";
import { matchListing } from "@/lib/collector/match";
import { analyzeSchema } from "@/lib/collector/schemas";
import { historyFor, historyStats, readCollector, saveCollector, toRow, mirror } from "@/lib/collector/store";
import { issueLabels } from "@/lib/collector/problems";
import { getWeights } from "@/lib/smartdeal/weights";
import { buildInputs, computeSmartScore } from "@/lib/smartdeal/score";
import type { MatchCandidate } from "@/lib/collector/types";

export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, "collector-analyze"), 10, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many analyses — wait a minute." }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const parsed = analyzeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Paste a valid http(s) product link." }, { status: 400 });

  let host = "";
  try {
    const u = new URL(parsed.data.url);
    host = u.hostname;
    if (isBlockedHostname(host)) return NextResponse.json({ error: "Links to private/local addresses are not accepted." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Paste a valid http(s) product link." }, { status: 400 });
  }

  // 1. Extract (missing data stays Unknown — never invented).
  const listing = await extractListing(parsed.data.url);

  // 2. Match against catalog + known offers.
  const db = await readCollector();
  const catalog = await allProducts();
  const candidates: MatchCandidate[] = catalog.map((p) => ({
    ref: p.id, name: p.name, brand: p.brand, model: p.model,
  }));
  for (const o of db.offers) {
    if (o.productRef && !candidates.some((c) => c.ref === o.productRef)) {
      candidates.push({
        ref: o.productRef, name: o.productName ?? o.productRef,
        brand: o.specs.brand, model: o.specs.model,
        ramGB: o.specs.ramGB, storageGB: o.specs.storageGB,
        ean: o.specs.ean, modelNumber: o.specs.modelNumber,
      });
    }
  }
  const match = matchListing(listing, candidates);

  // 3. Market evidence (existing engine, read-only).
  let market: { avg: number | null; low: number | null; high: number | null; count: number } = { avg: null, low: null, high: null, count: 0 };
  let classicScore: { score: number; verdict: string } | null = null;
  if (match.productRef) {
    const obs = await observationsFor(match.productRef);
    const stats = marketStats(obs);
    market = { avg: stats.median, low: stats.min, high: stats.max, count: stats.count };
    if (stats.median !== null && listing.price.value !== null) {
      try {
        const d = dealScoreEngine({ askingPrice: listing.price.value, observations: obs });
        classicScore = { score: d.score, verdict: d.verdict };
      } catch { /* classic engine abstains on thin data — smart score continues */ }
    }
  }

  // 4. History evidence (collector ledger).
  const histKey = match.productRef ?? listing.url;
  const hist = historyStats(historyFor(db, histKey));

  // 5. Smart score (multi-factor, transparent).
  const storeRel = db.stores.find((s) => host.includes(s.homepage.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]))?.reliability ?? null;
  const weights = await getWeights();
  const smart = computeSmartScore(buildInputs({
    price: listing.price.value,
    marketAvg: market.avg, marketLow: market.low,
    histLow: hist?.low ?? null, histAvg: hist?.avg ?? null, histHigh: hist?.high ?? null,
    condition: listing.condition.value ?? "unknown",
    warrantyMonths: listing.warrantyMonths.value,
    inStock: listing.availability.value ? listing.availability.value === "in_stock" : null,
    storeReliability: storeRel,
    hasReturnPolicy: null,
    regionFit: null,
  }), weights);

  // 6. Persist the observed offer (pending verification) + price point.
  const now = new Date().toISOString();
  const offerId = `off_${Date.now().toString(36)}`;
  db.offers.unshift({
    id: offerId,
    productRef: match.productRef,
    productName: match.productName ?? listing.name.value,
    storeId: null,
    storeName: listing.storeName.value ?? host,
    source: "link-analysis",
    sourceUrl: listing.url,
    price: listing.price.value,
    currency: listing.currency,
    availability: listing.availability.value ?? "unknown",
    availabilityLabel: listing.availability.label,
    condition: listing.condition.value ?? "unknown",
    conditionLabel: listing.condition.label,
    warrantyMonths: listing.warrantyMonths.value,
    warrantyLabel: listing.warrantyMonths.label,
    returnPolicy: null,
    specs: {
      brand: listing.brand.value ?? undefined, model: listing.model.value ?? undefined,
      ramGB: listing.ramGB.value ?? undefined, storageGB: listing.storageGB.value ?? undefined,
      ean: listing.ean.value ?? undefined, modelNumber: listing.modelNumber.value ?? undefined,
    },
    verificationStatus: "pending",
    lastChecked: now,
    createdAt: now,
  });
  if (listing.price.value !== null) db.history.push({ productRef: histKey, offerId, price: listing.price.value, at: now });
  await saveCollector(db);
  await mirror("offers", db.offers.slice(0, 1).map(toRow));
  await audit("COLLECTOR_ANALYZE", { result: "ok", metadata: { host, matched: !!match.productRef } }).catch(() => undefined);

  // 7. Alternatives: other known offers for the same product.
  const alternatives = match.productRef
    ? db.offers.filter((o) => o.productRef === match.productRef && o.id !== offerId && o.price !== null).slice(0, 5)
    : [];

  return NextResponse.json({
    listing: { ...listing, problemLabels: issueLabels(listing.issues) },
    match, market, history: hist, classicScore, smart, alternatives,
  });
}
