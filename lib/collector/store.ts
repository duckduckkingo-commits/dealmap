// DEALMAP Collector — persistence.
// Local dev: separate `data/collector.json` (never touches data/db.json).
// Production: same shapes in Postgres (migration 003) via PostgREST when configured.
// New module: no existing file is modified.
import { promises as fs } from "fs";
import path from "path";
import { STORE_DIRECTORY } from "./adapters";
import { isPg, pgSelect, pgUpsert } from "./pg";
import type { CollectionRun, Offer, PricePoint, Store, UserSubmission } from "./types";

export interface CollectorDB {
  stores: Store[];
  offers: Offer[];
  history: PricePoint[];
  runs: CollectionRun[];
  submissions: UserSubmission[];
  weights: Record<string, number>;
}

const FILE = path.join(process.cwd(), "data", "collector.json");

function seedStores(): Store[] {
  return STORE_DIRECTORY.map((s) => ({ ...s, reliability: null, allowRecheck: false }));
}

const EMPTY: CollectorDB = { stores: [], offers: [], history: [], runs: [], submissions: [], weights: {} };

async function readJson(): Promise<CollectorDB> {
  try {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    const raw = await fs.readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<CollectorDB>;
    const db = { ...EMPTY, ...parsed };
    if (db.stores.length === 0) db.stores = seedStores();
    return db;
  } catch {
    return { ...EMPTY, stores: seedStores() };
  }
}

async function writeJson(db: CollectorDB): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  const tmp = FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmp, FILE);
}

export async function readCollector(): Promise<CollectorDB> {
  if (!isPg()) return readJson();
  // Postgres-first, JSON fallback: never fail the request on DB trouble.
  const [stores, offers, history, runs, submissions] = await Promise.all([
    pgSelect<Store>("stores"),
    pgSelect<Offer>("offers", "select=*&order=created_at.desc&limit=500"),
    pgSelect<PricePoint>("price_history", "select=*&order=at.desc&limit=2000"),
    pgSelect<CollectionRun>("data_collection_runs", "select=*&order=started_at.desc&limit=50"),
    pgSelect<UserSubmission>("user_submissions", "select=*&order=created_at.desc&limit=200"),
  ]);
  if (!stores) return readJson();
  const json = await readJson();
  return {
    stores: stores.length ? stores : json.stores,
    offers: offers ?? json.offers,
    history: history ?? json.history,
    runs: runs ?? json.runs,
    submissions: submissions ?? json.submissions,
    weights: json.weights,
  };
}

/** Best-effort mirror to Postgres; failures are returned (never thrown). */
export async function mirror(kind: "offers" | "price_history" | "data_collection_runs" | "user_submissions" | "stores", rows: Record<string, unknown>[]): Promise<string | null> {
  if (!isPg() || rows.length === 0) return null;
  const conflict = { offers: "id", price_history: "id", data_collection_runs: "id", user_submissions: "id", stores: "id" }[kind];
  const ok = await pgUpsert(kind, rows, conflict);
  return ok ? null : `Postgres mirror failed for ${kind}`;
}

export function toRow(o: Offer): Record<string, unknown> {
  return {
    id: o.id, product_ref: o.productRef, product_name: o.productName, store_id: o.storeId,
    store_name: o.storeName, source: o.source, source_url: o.sourceUrl, price: o.price,
    currency: o.currency, availability: o.availability, condition: o.condition,
    warranty_months: o.warrantyMonths, return_policy: o.returnPolicy,
    specs: o.specs, verification_status: o.verificationStatus,
    last_checked: o.lastChecked, created_at: o.createdAt,
  };
}

export async function saveCollector(db: CollectorDB): Promise<void> {
  await writeJson(db);
  const problems: string[] = [];
  const m1 = await mirror("offers", db.offers.map(toRow));
  if (m1) problems.push(m1);
  const m2 = await mirror("price_history", db.history.map((h) => ({ product_ref: h.productRef, offer_id: h.offerId ?? null, price: h.price, at: h.at })));
  if (m2) problems.push(m2);
  if (problems.length) {
    db.runs.unshift({
      id: `run_${Date.now()}`, startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(),
      status: "partial", checked: 0, updated: 0, skipped: 0, failedSources: [], errors: problems, notes: [],
    });
    await writeJson(db);
  }
}

export function historyFor(db: CollectorDB, productRef: string): PricePoint[] {
  return db.history.filter((h) => h.productRef === productRef).sort((a, b) => +new Date(a.at) - +new Date(b.at));
}

export function historyStats(points: PricePoint[]): { low: number; avg: number; high: number; count: number } | null {
  if (points.length === 0) return null;
  const prices = points.map((p) => p.price).sort((a, b) => a - b);
  return {
    low: prices[0],
    avg: Math.round(prices.reduce((s, p) => s + p, 0) / prices.length),
    high: prices[prices.length - 1],
    count: prices.length,
  };
}
