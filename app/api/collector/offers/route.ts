// GET /api/collector/offers — list stored offers with freshness states.
// New route. Read-only. Modifies nothing existing.
import { NextResponse } from "next/server";
import { readCollector } from "@/lib/collector/store";
import { freshnessOf } from "@/lib/collector/scheduler";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await readCollector();
  return NextResponse.json({
    offers: db.offers.slice(0, 200).map((o) => ({ ...o, freshness: freshnessOf(o.lastChecked) })),
    count: db.offers.length,
  });
}
