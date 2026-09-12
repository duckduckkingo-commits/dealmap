// POST /api/collector/import — admin CSV import of real price lists.
// The admin confirms they have the right to use the data. Invalid lines are
// reported, never silently stored. New route. Modifies nothing existing.
import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/rateLimit";
import { parseCsv } from "@/lib/collector/csv";
import { readCollector, saveCollector } from "@/lib/collector/store";
import { z } from "zod";

export async function POST(req: Request) {
  try {
    await requireRole(["ADMIN", "OWNER"]);
  } catch (e) {
    const status = (e as Error & { status?: number }).status ?? 403;
    return NextResponse.json({ error: "Forbidden — ADMIN or OWNER only." }, { status });
  }
  const rl = rateLimit(clientKey(req, "collector-import"), 10, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many imports — wait a minute." }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const parsed = z.object({ csv: z.string().min(1).max(200_000), rightsConfirmed: z.literal(true) }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Send {csv} plus rightsConfirmed:true (confirm you may use this data)." }, { status: 400 });
  }
  const { rows, rejected } = parseCsv(parsed.data.csv);
  const db = await readCollector();
  const now = new Date().toISOString();
  for (const row of rows.slice(0, 200)) {
    const inStock = row.availability === "in_stock";
    db.offers.unshift({
      id: `off_csv_${Date.now().toString(36)}_${row.line}`,
      productRef: null,
      productName: null,
      storeId: null,
      storeName: row.storeName,
      source: "csv-import",
      sourceUrl: row.url,
      price: row.price,
      currency: row.currency,
      availability: inStock ? "in_stock" : row.availability === "out_of_stock" ? "out_of_stock" : "unknown",
      availabilityLabel: row.availability ? "Reported" : "Unknown",
      condition: row.condition ? (row.condition as "new" | "used" | "refurbished") : "unknown",
      conditionLabel: row.condition ? "Reported" : "Unknown",
      warrantyMonths: null,
      warrantyLabel: "Unknown",
      returnPolicy: null,
      specs: {},
      verificationStatus: "pending",
      lastChecked: now,
      createdAt: now,
    });
  }
  await saveCollector(db);
  await audit("COLLECTOR_IMPORT", { result: "ok", metadata: { imported: Math.min(rows.length, 200), rejected: rejected.length } }).catch(() => undefined);
  return NextResponse.json({ ok: true, imported: Math.min(rows.length, 200), rejected });
}
